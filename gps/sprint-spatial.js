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

function inferPatterns({count,thirds,sides,widePct,centerPct,attackingPct,defensivePct}){
  if(count<3)return{headline:'Muestra todavía pequeña',notes:['Hay pocos sprints localizados para extraer un patrón espacial estable.']};
  const mid=thirds[1]||0,left=sides[0]||0,right=sides[2]||0,notes=[];
  let headline='Esfuerzos intensos repartidos';
  if(attackingPct>=.55)headline='Predominio de esfuerzos en campo rival';
  else if(defensivePct>=.55)headline='Predominio de esfuerzos en campo propio';
  else if(mid>=.5)headline='Esfuerzos concentrados en zona media';
  if(widePct>=.65)notes.push('La mayoría de los esfuerzos máximos aparecen en zonas de banda.');
  else if(centerPct>=.55)notes.push('Los esfuerzos máximos se concentran especialmente por el carril central.');
  else notes.push('La distribución lateral de los esfuerzos es bastante equilibrada.');
  if(attackingPct>=.55)notes.push('La intensidad alta aparece con más frecuencia en el tercio atacante.');
  else if(defensivePct>=.55)notes.push('La intensidad alta aparece con más frecuencia en el tercio defensivo, compatible con esfuerzos de repliegue o recuperación.');
  else if(mid>=.5)notes.push('Una parte importante de la intensidad se produce alrededor de la zona media.');
  else notes.push('No hay un tercio longitudinal claramente dominante.');
  if(left>=.55)notes.push('Existe una clara preferencia espacial por el lado izquierdo.');
  else if(right>=.55)notes.push('Existe una clara preferencia espacial por el lado derecho.');
  return{headline,notes};
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
  const n=points.length||1,thirdShares=thirds.map(v=>v/n),sideShares=sides.map(v=>v/n),widePct=n?((sides[0]+sides[2])/n):0,centerPct=n?(sides[1]/n):0,attackingPct=n?(thirds[2]/n):0,defensivePct=n?(thirds[0]/n):0;
  const base={points,count:points.length,thirdCounts:thirds,sideCounts:sides,thirds:thirdShares,sides:sideShares,widePct,centerPct,attackingPct,defensivePct};
  return{...base,pattern:inferPatterns(base)};
}
