const finite=v=>Number.isFinite(Number(v));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function nearestTrackPoint(track,tSec){
  if(!track?.length)return null;
  let best=track[0],delta=Math.abs(Number(best.tSec)-Number(tSec));
  for(let i=1;i<track.length;i++){
    const d=Math.abs(Number(track[i].tSec)-Number(tSec));
    if(d<delta){best=track[i];delta=d}
  }
  return finite(best.u)&&finite(best.v)?best:null;
}

export function buildSprintSpatial(analysis,speedOverride=null){
  const pos=analysis?.analysisDetail?.positional||{},speed=speedOverride||analysis?.analysisDetail?.speed||{},sprints=Array.isArray(speed.sprints)?speed.sprints:[];
  let points=Array.isArray(pos.sprintPoints)?pos.sprintPoints.filter(p=>finite(p.u)&&finite(p.v)):[];
  if(!points.length&&sprints.length){
    const track=Array.isArray(analysis?.trail)?analysis.trail:[];
    points=sprints.map(sp=>{const p=nearestTrackPoint(track,sp.tSec);return p?{u:Number(p.u),v:Number(p.v),tSec:Number(sp.tSec),peakSpeedKmh:Number(sp.peakSpeedKmh)||null}:null}).filter(Boolean);
  }
  const thirds=[0,0,0],sides=[0,0,0];
  for(const p of points){thirds[Math.min(2,Math.floor(clamp(Number(p.u),0,.9999)*3))]++;sides[Math.min(2,Math.floor(clamp(Number(p.v),0,.9999)*3))]++}
  const n=points.length||1;
  return{points,count:points.length,thirdCounts:thirds,sideCounts:sides,thirds:thirds.map(v=>v/n),sides:sides.map(v=>v/n),widePct:n?((sides[0]+sides[2])/n):0,centerPct:n?(sides[1]/n):0,attackingPct:n?(thirds[2]/n):0,defensivePct:n?(thirds[0]/n):0};
}
