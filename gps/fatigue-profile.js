const finite=v=>Number.isFinite(Number(v));
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const percentile=(values,q)=>{const a=values.map(Number).filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return null;const p=clamp(q,0,1)*(a.length-1),lo=Math.floor(p),hi=Math.ceil(p),f=p-lo;return a[lo]*(1-f)+a[hi]*f};

function windowMetrics(speed,startSec,endSec){
  const series=(speed.speedSeries||[]).filter(p=>finite(p.tSec)&&finite(p.value)&&Number(p.tSec)>=startSec&&Number(p.tSec)<=endSec),events=(speed.sprints||[]).filter(e=>finite(e.tSec)&&Number(e.tSec)>=startSec&&Number(e.tSec)<=endSec),spanMin=Math.max(.1,(endSec-startSec)/60),peaks=events.map(e=>Number(e.peakSpeedKmh)).filter(Number.isFinite),recoveries=events.map(e=>Number(e.recoveryToNextS)).filter(Number.isFinite),distances=events.map(e=>Number(e.distanceM)).filter(Number.isFinite);
  return{startSec,endSec,centerSec:(startSec+endSec)/2,speedP95:percentile(series.map(p=>p.value),.95),speedP99:percentile(series.map(p=>p.value),.99),sprintPeakAvg:mean(peaks),sprintCount:events.length,sprintDensityPer10Min:events.length/spanMin*10,avgRecoveryS:mean(recoveries),avgSprintDistanceM:mean(distances)};
}

function avgKey(windows,key){const a=windows.map(w=>Number(w[key])).filter(Number.isFinite);return mean(a)}
function ratio(value,base){return finite(value)&&finite(base)&&Number(base)>0?Number(value)/Number(base):null}

export function buildFatigueProfile(speed={},durationS=0){
  const duration=Number(durationS)||Number(speed.speedSeries?.at(-1)?.tSec)||0;
  if(duration<900)return{available:false,reason:'Duración insuficiente',windows:[]};
  const windowS=Math.min(720,Math.max(600,duration*.2)),stepS=300,windows=[];
  for(let start=0;start<duration;start+=stepS){const end=Math.min(duration,start+windowS);if(end-start<windowS*.7)break;windows.push(windowMetrics(speed,start,end))}
  if(windows.length<4)return{available:false,reason:'Pocas ventanas comparables',windows};
  const earlyCut=Math.min(duration*.38,1500),early=windows.filter(w=>w.centerSec<=earlyCut).slice(0,3),late=windows.slice(-3),baseline={speedP95:avgKey(early,'speedP95'),speedP99:avgKey(early,'speedP99'),sprintPeakAvg:avgKey(early,'sprintPeakAvg'),sprintDensityPer10Min:avgKey(early,'sprintDensityPer10Min'),avgRecoveryS:avgKey(early,'avgRecoveryS'),avgSprintDistanceM:avgKey(early,'avgSprintDistanceM')},final={speedP95:avgKey(late,'speedP95'),speedP99:avgKey(late,'speedP99'),sprintPeakAvg:avgKey(late,'sprintPeakAvg'),sprintDensityPer10Min:avgKey(late,'sprintDensityPer10Min'),avgRecoveryS:avgKey(late,'avgRecoveryS'),avgSprintDistanceM:avgKey(late,'avgSprintDistanceM')};
  const speedRetention=ratio(final.speedP95,baseline.speedP95),peakRetention=ratio(final.sprintPeakAvg,baseline.sprintPeakAvg),densityRetention=ratio(final.sprintDensityPer10Min,baseline.sprintDensityPer10Min),recoveryRatio=ratio(final.avgRecoveryS,baseline.avgRecoveryS);
  const components=[];
  if(finite(speedRetention))components.push({key:'speed',label:'Velocidad alta',retention:speedRetention,weight:.35});
  if(finite(peakRetention))components.push({key:'peaks',label:'Punta de sprint',retention:peakRetention,weight:.3});
  if(finite(densityRetention))components.push({key:'density',label:'Frecuencia de sprints',retention:densityRetention,weight:.2});
  if(finite(recoveryRatio))components.push({key:'recovery',label:'Recuperación',retention:1/Math.max(.25,recoveryRatio),weight:.15});
  const weight=components.reduce((s,c)=>s+c.weight,0),retention=weight?components.reduce((s,c)=>s+c.retention*c.weight,0)/weight:null,dropPct=finite(retention)?Math.round((1-retention)*100):null;
  let label='Sin lectura suficiente',level='unknown';
  if(finite(retention)){if(retention>=.94){label='Intensidad bastante estable';level='stable'}else if(retention>=.84){label='Descenso leve de intensidad';level='mild'}else{label='Descenso claro de intensidad';level='clear'}}
  const notes=[];
  if(finite(speedRetention)){const p=Math.round((speedRetention-1)*100);notes.push(`La velocidad alta ${p>=0?'se mantiene/sube':'baja'} ${Math.abs(p)}% respecto al tramo inicial.`)}
  if(finite(densityRetention)){const p=Math.round((densityRetention-1)*100);notes.push(`La frecuencia de sprints ${p>=0?'se mantiene/sube':'baja'} ${Math.abs(p)}%.`)}
  if(finite(recoveryRatio)){const p=Math.round((recoveryRatio-1)*100);notes.push(`La recuperación entre esfuerzos ${p>0?'se alarga':'se acorta'} ${Math.abs(p)}%.`)}
  return{available:true,windowS,stepS,windows,baseline,final,summary:{label,level,retention:finite(retention)?+retention.toFixed(3):null,dropPct,components,notes}};
}
