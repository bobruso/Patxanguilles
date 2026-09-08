const finite=v=>Number.isFinite(Number(v));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function nearestIndex(series,tSec){
  if(!series.length)return -1;
  let best=0,delta=Math.abs(Number(series[0].tSec)-Number(tSec));
  for(let i=1;i<series.length;i++){
    const d=Math.abs(Number(series[i].tSec)-Number(tSec));
    if(d<delta){best=i;delta=d}
  }
  return best;
}

function integrateDistance(series,a,b){
  let metres=0;
  for(let i=Math.max(1,a+1);i<=b;i++){
    const p=series[i-1],q=series[i],dt=Math.max(0,Number(q.tSec)-Number(p.tSec));
    if(!(dt>0&&dt<20))continue;
    const avgKmh=(Number(p.value||0)+Number(q.value||0))/2;
    metres+=avgKmh/3.6*dt;
  }
  return metres;
}

export function buildSprintEvents(speed={},durationS=0){
  const peaks=Array.isArray(speed.sprints)?speed.sprints:[],series=(Array.isArray(speed.speedSeries)?speed.speedSeries:[]).filter(p=>finite(p.tSec)&&finite(p.value)).slice().sort((a,b)=>a.tSec-b.tSec);
  if(!peaks.length)return{...speed,eventSummary:{count:0,totalSprintDistanceM:0,avgRecoveryS:null,densityPer10Min:0,longest:null,fastest:null,mostExplosive:null},sprints:[]};
  if(!series.length)return{...speed,eventSummary:summarize(peaks,durationS),sprints:peaks};
  const cutoff=finite(speed.relativeSprintCutoffKmh)?Number(speed.relativeSprintCutoffKmh):Math.min(...peaks.map(p=>Number(p.peakSpeedKmh)||Infinity));
  const runningFloor=finite(speed.runningFloorKmh)?Number(speed.runningFloorKmh):Math.max(5,cutoff*.65),eventFloor=Math.max(runningFloor,cutoff*.78);
  const enriched=peaks.map(peak=>{
    if(finite(peak.startSec)&&finite(peak.endSec)&&finite(peak.durationS)&&finite(peak.distanceM))return{...peak};
    const idx=nearestIndex(series,peak.tSec);if(idx<0)return{...peak};
    let a=idx,b=idx;
    while(a>0&&Number(series[a-1].value)>=eventFloor&&Number(series[idx].tSec)-Number(series[a-1].tSec)<=12)a--;
    while(b<series.length-1&&Number(series[b+1].value)>=eventFloor&&Number(series[b+1].tSec)-Number(series[idx].tSec)<=12)b++;
    const startSec=Number(series[a].tSec),endSec=Number(series[b].tSec),duration=Math.max(0,endSec-startSec),distance=integrateDistance(series,a,b),robust=Number(speed.robustTopKmh)||Number(peak.peakSpeedKmh)||1;
    return{...peak,startSec:+startSec.toFixed(1),endSec:+endSec.toFixed(1),durationS:+duration.toFixed(1),distanceM:+distance.toFixed(1),relativeIntensityPct:Math.round(clamp(Number(peak.peakSpeedKmh||0)/robust*100,0,150))};
  }).sort((a,b)=>Number(a.tSec)-Number(b.tSec));
  for(let i=0;i<enriched.length;i++)enriched[i].recoveryToNextS=i<enriched.length-1&&finite(enriched[i].endSec)&&finite(enriched[i+1].startSec)?+Math.max(0,Number(enriched[i+1].startSec)-Number(enriched[i].endSec)).toFixed(1):null;
  return{...speed,eventFloorKmh:+eventFloor.toFixed(2),eventSummary:summarize(enriched,durationS||series.at(-1)?.tSec||0),sprints:enriched};
}

function summarize(events,durationS){
  const distanceEvents=events.filter(e=>finite(e.distanceM)),durationEvents=events.filter(e=>finite(e.durationS)),recoveries=events.map(e=>Number(e.recoveryToNextS)).filter(Number.isFinite),total=distanceEvents.reduce((n,e)=>n+Number(e.distanceM),0),longest=distanceEvents.slice().sort((a,b)=>Number(b.distanceM)-Number(a.distanceM))[0]||durationEvents.slice().sort((a,b)=>Number(b.durationS)-Number(a.durationS))[0]||null,fastest=events.slice().sort((a,b)=>Number(b.peakSpeedKmh||0)-Number(a.peakSpeedKmh||0))[0]||null,explosive=events.slice().sort((a,b)=>(Number(b.prominenceKmh||0)/Math.max(.5,Number(b.durationS)||1))-(Number(a.prominenceKmh||0)/Math.max(.5,Number(a.durationS)||1)))[0]||null;
  return{count:events.length,totalSprintDistanceM:+total.toFixed(1),avgRecoveryS:recoveries.length?+(recoveries.reduce((a,b)=>a+b,0)/recoveries.length).toFixed(1):null,densityPer10Min:Number(durationS)>0?+(events.length/(Number(durationS)/600)).toFixed(2):0,longest:longest?{tSec:longest.tSec,distanceM:finite(longest.distanceM)?Number(longest.distanceM):null,durationS:finite(longest.durationS)?Number(longest.durationS):null}:null,fastest:fastest?{tSec:fastest.tSec,peakSpeedKmh:Number(fastest.peakSpeedKmh)||0}:null,mostExplosive:explosive?{tSec:explosive.tSec,prominenceKmh:Number(explosive.prominenceKmh)||0,durationS:finite(explosive.durationS)?Number(explosive.durationS):null}:null};
}
