import{fromSupabaseRow}from'./fit-analysis.js';
import{buildSprintEvents}from'./sprint-events.js';

const SUPABASE_URL='https://cnnhstlguewrxjihhlqc.supabase.co';
const SUPABASE_KEY='sb_publishable_uWEwYEMkAe3YkeAzX7ACAg_0aEYHmM6';
const q=new URLSearchParams(location.search),matchId=q.get('match'),playerId=q.get('player'),mode=q.get('mode'),otherMatch=q.get('otherMatch'),otherPlayer=q.get('otherPlayer');
const sb=window.supabase?.createClient?.(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false}});
const finite=v=>Number.isFinite(Number(v));
const pctDiff=(a,b)=>finite(a)&&finite(b)&&Number(b)!==0?((Number(a)-Number(b))/Math.abs(Number(b)))*100:null;
const fmtDiff=(a,b)=>{const d=pctDiff(a,b);return d==null?'':` (${Math.abs(d).toFixed(0)}% ${d>=0?'más':'menos'})`};

function metrics(a){
  const speed=buildSprintEvents(a?.analysisDetail?.speed||{},a?.durationS);
  return{distance:Number(a?.distanceM)||0,top:Number(a?.topSpeedKmh)||0,highRuns:Number(speed.highIntensityRunCount??speed.highIntensityRuns?.length)||0,highDistance:Number(a?.highIntensityDistanceM)||0,eff18:Number(speed.absoluteSprintCount18)||0,relSprints:Number(a?.sprintCount)||speed.sprints?.length||0,cutoff:finite(speed.relativeSprintCutoffKmh)?Number(speed.relativeSprintCutoffKmh):null,relSprintDistance:finite(speed.eventSummary?.totalSprintDistanceM)?Number(speed.eventSummary.totalSprintDistanceM):null,relRecovery:finite(speed.eventSummary?.avgRecoveryS)?Number(speed.eventSummary.avgRecoveryS):null};
}

async function loadPair(){
  if(!sb||!matchId||!playerId||!mode)return null;
  const{data:aRow}=await sb.from('match_player_gps').select('*').eq('match_id',matchId).eq('player_id',playerId).maybeSingle();if(!aRow)return null;
  let bRow=null;
  if(mode==='previous'&&otherMatch){const r=await sb.from('match_player_gps').select('*').eq('match_id',otherMatch).eq('player_id',playerId).maybeSingle();bRow=r.data}
  if(mode==='player'&&otherPlayer){const r=await sb.from('match_player_gps').select('*').eq('match_id',matchId).eq('player_id',otherPlayer).maybeSingle();bRow=r.data}
  if(!bRow)return null;return{A:metrics(fromSupabaseRow(aRow)),B:metrics(fromSupabaseRow(bRow))};
}

function rows(){return [...document.querySelectorAll('.compare-table tbody tr')]}
function rowByLabel(label){return rows().find(r=>r.cells?.[0]?.textContent?.trim()===label)}
function neutralize(r){if(!r)return;r.classList.add('v225-relative-row');r.querySelectorAll('.compare-better').forEach(x=>x.classList.remove('compare-better'));r.querySelectorAll('.compare-delta').forEach(x=>x.remove())}
function rename(oldLabel,newLabel,relative=false){const r=rowByLabel(oldLabel);if(!r)return null;r.cells[0].textContent=newLabel;if(relative)neutralize(r);return r}

function absoluteWinner(A,B){
  const cmp=(x,y)=>Number(x)>Number(y)?'a':Number(y)>Number(x)?'b':'e',votes=[cmp(A.highRuns,B.highRuns),cmp(A.highDistance,B.highDistance),cmp(A.eff18,B.eff18)],ca=votes.filter(x=>x==='a').length,cb=votes.filter(x=>x==='b').length;return ca>cb?'a':cb>ca?'b':'mixed';
}
function labels(){const cards=[...document.querySelectorAll('.compare-player-card h3')].map(x=>x.textContent.trim());return{a:cards[0]||'A',b:cards[1]||'B'}}
function summary(A,B){
  const L=labels(),parts=[];
  if(Math.abs(A.distance-B.distance)<1)parts.push('El volumen total fue prácticamente idéntico.');
  else if(A.distance>B.distance)parts.push(`${L.a} acumuló más volumen total${fmtDiff(A.distance,B.distance)}.`);
  else parts.push(`${L.b} acumuló más volumen total${fmtDiff(B.distance,A.distance)}.`);
  const w=absoluteWinner(A,B);if(w==='a')parts.push(`${L.a} reunió más indicadores absolutos de alta intensidad (>13 km/h y >18 km/h).`);else if(w==='b')parts.push(`${L.b} reunió más indicadores absolutos de alta intensidad (>13 km/h y >18 km/h).`);else parts.push('La carga absoluta de alta intensidad quedó repartida entre ambos registros.');
  if(A.top!==B.top)parts.push(`${A.top>B.top?L.a:L.b} alcanzó la mayor velocidad máxima validada.`);
  parts.push('Los sprints relativos no se usan para decidir un ganador: cada jugador tiene su propio umbral individual.');
  return parts.join(' ');
}

function injectThresholdRow(A,B){
  const sprint=rowByLabel('Sprints relativos');if(!sprint||rowByLabel('Umbral individual de sprint'))return;
  const tr=document.createElement('tr');tr.className='v225-threshold-row v225-relative-row';tr.innerHTML=`<td>Umbral individual de sprint</td><td>${finite(A.cutoff)?A.cutoff.toFixed(1)+' km/h':'—'}</td><td>${finite(B.cutoff)?B.cutoff.toFixed(1)+' km/h':'—'}</td>`;sprint.after(tr);
}
function injectLegend(){
  const table=document.querySelector('.compare-section .compare-table');if(!table||document.querySelector('.v225-compare-legend'))return;
  const wrap=table.closest('.compare-section'),head=wrap?.querySelector('.compare-section-head');if(!head)return;
  const el=document.createElement('div');el.className='v225-compare-legend';el.innerHTML='<div><strong>ABSOLUTAS · comparables directamente</strong><span>Distancia, velocidad, carreras y distancia >13 km/h, esfuerzos >18 km/h y distancia/min usan referencias comunes.</span></div><div><strong>INDIVIDUALIZADAS · contexto personal</strong><span>Sprints relativos, su distancia/recuperación y aceleraciones fuertes dependen del umbral calculado para cada actividad. No se marca un “ganador”.</span></div>';head.after(el);
}
function decorate(A,B){
  if(document.documentElement.dataset.patxCompareV225==='1')return;const table=document.querySelector('.compare-table');if(!table)return;document.documentElement.dataset.patxCompareV225='1';
  rename('Sprints','Sprints relativos',true);rename('Carreras de alta intensidad','Carreras >13 km/h');rename('Distancia de alta intensidad','Distancia >13 km/h');rename('Velocidad media de sprint alto','Punta media en sprints relativos',true);rename('Distancia en sprint','Distancia en sprints relativos',true);rename('Recuperación media','Recuperación entre sprints relativos',true);rename('Aceleraciones fuertes','Aceleraciones fuertes · umbral individual',true);injectThresholdRow(A,B);injectLegend();
  const p=document.querySelector('.compare-summary p');if(p){p.textContent=summary(A,B);const n=document.createElement('span');n.className='v225-summary-note';n.textContent='La lectura rápida separa volumen, intensidad absoluta y métricas individualizadas para no favorecer perfiles con umbrales personales más bajos.';p.appendChild(n)}
  [...document.querySelectorAll('.compare-headline')].forEach(h=>{const s=h.querySelector('span');if(s?.textContent?.trim()==='Más carga intensa')s.textContent='Más carga >13 km/h'});
}

(async()=>{try{const pair=await loadPair();if(!pair)return;let tries=0;const tick=()=>{if(document.querySelector('.compare-table'))return decorate(pair.A,pair.B);if(++tries<80)setTimeout(tick,75)};tick()}catch(err){console.warn('[GPS compare v225]',err)}})();
