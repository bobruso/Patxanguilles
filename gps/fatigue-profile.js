const finite=v=>Number.isFinite(Number(v));
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
const median=a=>{const x=a.map(Number).filter(Number.isFinite).sort((m,n)=>m-n);if(!x.length)return null;const i=Math.floor(x.length/2);return x.length%2?x[i]:(x[i-1]+x[i])/2};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const percentile=(values,q)=>{const a=values.map(Number).filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return null;const p=clamp(q,0,1)*(a.length-1),lo=Math.floor(p),hi=Math.ceil(p),f=p-lo;return a[lo]*(1-f)+a[hi]*f};

function windowMetrics(speed,startSec,endSec){
  const series=(speed.speedSeries||[]).filter(p=>finite(p.tSec)&&finite(p.value)&&Number(p.tSec)>=startSec&&Number(p.tSec)<=endSec),events=(speed.sprints||[]).filter(e=>finite(e.tSec)&&Number(e.tSec)>=startSec&&Number(e.tSec)<=endSec),spanMin=Math.max(.1,(endSec-startSec)/60),peaks=events.map(e=>Number(e.peakSpeedKmh)).filter(Number.isFinite),recoveries=events.map(e=>Number(e.recoveryToNextS)).filter(Number.isFinite),distances=events.map(e=>Number(e.distanceM)).filter(Number.isFinite);
  return{startSec,endSec,centerSec:(startSec+endSec)/2,sampleCount:series.length,eventCount:events.length,speedP95:percentile(series.map(p=>p.value),.95),speedP99:percentile(series.map(p=>p.value),.99),sprintPeakAvg:mean(peaks),sprintCount:events.length,sprintDensityPer10Min:events.length/spanMin*10,avgRecoveryS:recoveries.length>=2?mean(recoveries):null,recoverySamples:recoveries.length,avgSprintDistanceM:mean(distances)};
}

function robustKey(windows,key){const a=windows.map(w=>Number(w[key])).filter(Number.isFinite);return median(a)}
function ratio(value,base){return finite(value)&&finite(base)&&Number(base)>0?Number(value)/Number(base):null}

export function buildFatigueProfile(speed={},durationS=0){
  const duration=Number(durationS)||Number(speed.speedSeries?.at(-1)?.tSec)||0;
  if(duration<900)return{available:false,reason:'Duración insuficiente',windows:[]};
  const windowS=Math.min(720,Math.max(600,duration*.2)),stepS=300,windows=[];
  for(let start=0;start<duration;start+=stepS){const end=Math.min(duration,start+windowS);if(end-start<windowS*.7)break;windows.push(windowMetrics(speed,start,end))}
  if(windows.length<4)return{available:false,reason:'Pocas ventanas comparables',windows};
  const early=windows.slice(0,Math.min(3,windows.length)),late=windows.slice(-Math.min(3,windows.length));
  const baseline={speedP95:robustKey(early,'speedP95'),speedP99:robustKey(early,'speedP99'),sprintPeakAvg:robustKey(early,'sprintPeakAvg'),sprintDensityPer10Min:robustKey(early,'sprintDensityPer10Min'),avgRecoveryS:robustKey(early.filter(w=>w.recoverySamples>=2),'avgRecoveryS'),avgSprintDistanceM:robustKey(early,'avgSprintDistanceM')};
  const final={speedP95:robustKey(late,'speedP95'),speedP99:robustKey(late,'speedP99'),sprintPeakAvg:robustKey(late,'sprintPeakAvg'),sprintDensityPer10Min:robustKey(late,'sprintDensityPer10Min'),avgRecoveryS:robustKey(late.filter(w=>w.recoverySamples>=2),'avgRecoveryS'),avgSprintDistanceM:robustKey(late,'avgSprintDistanceM')};
  const speedRetention=ratio(final.speedP95,baseline.speedP95),peakRetention=ratio(final.sprintPeakAvg,baseline.sprintPeakAvg),densityRetention=ratio(final.sprintDensityPer10Min,baseline.sprintDensityPer10Min),recoveryRatio=ratio(final.avgRecoveryS,baseline.avgRecoveryS);
  const components=[];
  if(finite(speedRetention))components.push({key:'speed',label:'Velocidad alta',retention:speedRetention,weight:.45});
  if(finite(peakRetention))components.push({key:'peaks',label:'Punta de sprint',retention:peakRetention,weight:.3});
  if(finite(densityRetention))components.push({key:'density',label:'Frecuencia de sprints',retention:densityRetention,weight:.15});
  if(finite(recoveryRatio))components.push({key:'recovery',label:'Recuperación',retention:1/Math.max(.25,recoveryRatio),weight:.1});
  const weight=components.reduce((s,c)=>s+c.weight,0),retention=weight?components.reduce((s,c)=>s+c.retention*c.weight,0)/weight:null,dropPct=finite(retention)?Math.round((1-retention)*100):null;
  const capacitySignals=[speedRetention,peakRetention].filter(Number.isFinite),capacityDrop=capacitySignals.filter(v=>v<.90).length,capacityMild=capacitySignals.filter(v=>v<.95).length,recoveryWorse=finite(recoveryRatio)&&recoveryRatio>1.18,densityWorse=finite(densityRetention)&&densityRetention<.72;
  let label='Sin lectura suficiente',level='unknown';
  if(finite(retention)){
    if(capacityDrop>=1&&(capacityMild>=2||recoveryWorse)){label='Descenso claro de intensidad';level='clear'}
    else if(capacityMild>=1||recoveryWorse||(densityWorse&&capacitySignals.some(v=>v<.98))){label='Descenso leve de intensidad';level='mild'}
    else{label='Intensidad bastante estable';level='stable'}
  }
  const notes=[];
  if(finite(speedRetention)){const p=Math.round((speedRetention-1)*100);notes.push(`La velocidad alta ${p>=0?'se mantiene/sube':'baja'} ${Math.abs(p)}% respecto al tramo inicial.`)}
  if(finite(peakRetention)){const p=Math.round((peakRetention-1)*100);notes.push(`La punta media de los sprints ${p>=0?'se mantiene/sube':'baja'} ${Math.abs(p)}%.`)}
  if(finite(densityRetention)){const p=Math.round((densityRetention-1)*100);notes.push(`La frecuencia de sprints ${p>=0?'se mantiene/sube':'baja'} ${Math.abs(p)}%.`)}
  if(finite(recoveryRatio)){const p=Math.round((recoveryRatio-1)*100);notes.push(`La recuperación entre esfuerzos ${p>0?'se alarga':'se acorta'} ${Math.abs(p)}%.`)}
  if(level==='stable'&&densityWorse)notes.push('Hay menos sprints al final, pero la capacidad de velocidad se conserva; puede responder al desarrollo táctico del partido y no a fatiga física.');
  const evidence={capacitySignals:capacitySignals.length,recoveryUsable:finite(recoveryRatio),sprintEvents:Number(speed.sprints?.length)||0};
  return{available:true,windowS,stepS,windows,baseline,final,summary:{label,level,retention:finite(retention)?+retention.toFixed(3):null,dropPct,components,notes,evidence}};
}
