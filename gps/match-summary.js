import{buildSprintSpatial}from'./sprint-spatial.js';
import{buildFatigueProfile}from'./fatigue-profile.js';
const finite=v=>Number.isFinite(Number(v));
const pct=v=>Math.round((Number(v)||0)*100);
const km=m=>finite(m)?(Number(m)/1000).toFixed(1):null;
const kmh=v=>finite(v)?Number(v).toFixed(1):null;

export function buildMatchSummary(analysis,speed={}){
  const d=analysis?.analysisDetail||{},pos=d.positional||{},role=pos.role||{},spatial=buildSprintSpatial(analysis,speed),fatigue=buildFatigueProfile(speed,analysis?.durationS),distance=km(analysis?.distanceM),top=kmh(analysis?.topSpeedKmh),sprints=Number(analysis?.sprintCount)||speed?.sprints?.length||0;
  const headline=[];
  if(role?.top)headline.push(role.top);
  if(distance)headline.push(`${distance} km distancia total recorrida`);
  if(top)headline.push(`punta de ${top} km/h`);
  const title=headline.length?headline.join(' · '):'Resumen del partido';

  const sentences=[];
  if(spatial.count){
    const att=pct(spatial.attackingPct),def=pct(spatial.defensivePct),wide=pct(spatial.widePct),center=pct(spatial.centerPct);
    if(spatial.attackingPct>=.5)sentences.push(`${att}% de sus esfuerzos máximos aparecieron en campo rival.`);
    else if(spatial.defensivePct>=.5)sentences.push(`${def}% de sus esfuerzos máximos aparecieron en campo propio.`);
    else sentences.push('Los esfuerzos máximos estuvieron bastante repartidos entre los tres tercios.');
    if(spatial.widePct>=.62)sentences.push(`Perfil intenso muy abierto: ${wide}% de los sprints se produjeron por banda.`);
    else if(spatial.centerPct>=.55)sentences.push(`La mayor parte de los esfuerzos intensos se concentró en el carril central (${center}%).`);
  }
  if(sprints)sentences.push(`Registró ${sprints} picos de sprint relativos a su propia curva de velocidad.`);
  if(fatigue?.available&&fatigue.summary?.label){
    if(fatigue.summary.level==='stable')sentences.push('La capacidad de intensidad se mantuvo bastante estable a lo largo de los 60 minutos.');
    else if(fatigue.summary.level==='mild')sentences.push('El tramo final muestra una ligera bajada de intensidad, sin una caída brusca.');
    else if(fatigue.summary.level==='clear')sentences.push('El tramo final muestra una bajada clara de la capacidad de intensidad respecto al inicio.');
  }
  if(!sentences.length&&distance)sentences.push(`Completó ${distance} km durante el partido.`);
  return{title,text:sentences.slice(0,3).join(' ')};
}

export function matchSummaryHtml(analysis,speed={}){
  const s=buildMatchSummary(analysis,speed);if(!s.title&&!s.text)return'';
  return `<section class="patx-gps-summary"><div class="patx-gps-summary-kicker">RESUMEN</div><h4>${s.title}</h4>${s.text?`<p>${s.text}</p>`:''}</section>`;
}
