import{fromSupabaseRow}from'./fit-analysis.js';
import{buildSprintEvents}from'./sprint-events.js';
import{buildFatigueProfile}from'./fatigue-profile.js';
import{drawHeatmap,drawMovementTrail,drawZoneOccupancy}from'./pitch-maps.js';

const SUPABASE_URL='https://cnnhstlguewrxjihhlqc.supabase.co';
const SUPABASE_KEY='sb_publishable_uWEwYEMkAe3YkeAzX7ACAg_0aEYHmM6';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false}});
const root=document.getElementById('compareRoot');
const q=new URLSearchParams(location.search);
const currentMatchId=q.get('match'),currentPlayerId=q.get('player'),mode=q.get('mode'),otherMatchId=q.get('otherMatch'),otherPlayerId=q.get('otherPlayer');

const esc=v=>String(v??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
const finite=v=>Number.isFinite(Number(v));
const pct=v=>Math.round((Number(v)||0)*100);
const fmtKm=m=>finite(m)?(Number(m)/1000).toFixed(2)+' km':'—';
const fmtM=m=>finite(m)?Math.round(Number(m))+' m':'—';
const fmtKmh=v=>finite(v)?Number(v).toFixed(1)+' km/h':'—';
const formatDate=iso=>{const m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${Number(m[3])}-${Number(m[2])}-${m[1]}`:String(iso||'')};
const compLabel=m=>m?.competition==='football7'?'Fútbol 7':'Fútbol sala';
const scoreLabel=m=>finite(m?.red_score)&&finite(m?.black_score)?`${m.red_score}-${m.black_score}`:'';

function photoHtml(p){
  return p?.photo_url?`<img src="${esc(p.photo_url)}" alt="Foto de ${esc(p.nickname||'jugador')}" crossorigin="anonymous">`:`<span class="compare-player-fallback">${esc((p?.nickname||'?').charAt(0).toUpperCase())}</span>`;
}
function metrics(a){
  const d=a?.analysisDetail||{},speed=buildSprintEvents(d.speed||{},a?.durationS),fatigue=buildFatigueProfile(speed,a?.durationS),pos=d.positional||{},work=d.workload||{},role=pos.role||{},busy=speed.busiestBlock||null;
  const peaks=(speed.sprints||[]).map(x=>Number(x.peakSpeedKmh)).filter(Number.isFinite);
  return {
    a,speed,fatigue,pos,work,role,
    distanceM:Number(a?.distanceM)||0,topSpeed:Number(a?.topSpeedKmh)||0,avgSpeed:Number(a?.avgSpeedKmh)||0,
    sprints:Number(a?.sprintCount)||speed.sprints?.length||0,highRuns:Number(speed.highIntensityRunCount??speed.highIntensityRuns?.length)||0,
    highDistance:Number(a?.highIntensityDistanceM)||0,avgHr:finite(a?.avgHr)?Number(a.avgHr):null,maxHr:finite(a?.maxHr)?Number(a.maxHr):null,
    distancePerMin:finite(work.distancePerMin)?Number(work.distancePerMin):null,sprintDistance:finite(speed.eventSummary?.totalSprintDistanceM)?Number(speed.eventSummary.totalSprintDistanceM):null,
    avgRecovery:finite(speed.eventSummary?.avgRecoveryS)?Number(speed.eventSummary.avgRecoveryS):null,accelerations:Number(speed.accelerations?.length)||0,efforts18:Number(speed.absoluteSprintCount18)||0,
    avgSprintPeak:peaks.length?peaks.reduce((s,v)=>s+v,0)/peaks.length:null,busyDistance:finite(busy?.distanceM)?Number(busy.distanceM):null,
    roleName:role.top||'Sin estimar',roleConfidence:finite(role.confidence)?Number(role.confidence):null,thirds:pos.thirds||[],sides:pos.sides||[]
  };
}
function fatigueLevel(M){const level=M?.fatigue?.summary?.level;return level==='clear'?2:level==='mild'?1:0}
function winner(a,b,higher=true){if(!finite(a)||!finite(b)||Number(a)===Number(b))return'equal';return higher?(Number(a)>Number(b)?'a':'b'):(Number(a)<Number(b)?'a':'b')}
function diffPct(a,b){if(!finite(a)||!finite(b)||Number(b)===0)return null;return((Number(a)-Number(b))/Math.abs(Number(b)))*100}
function metricRow(label,a,b,fmt,higher=true){
  const w=winner(a,b,higher),da=diffPct(a,b),db=diffPct(b,a);
  return `<tr><td>${esc(label)}</td><td class="${w==='a'?'compare-better':''}">${esc(fmt(a))}${da!=null?` <span class="compare-delta">(${da>=0?'+':''}${da.toFixed(0)}%)</span>`:''}</td><td class="${w==='b'?'compare-better':''}">${esc(fmt(b))}${db!=null?` <span class="compare-delta">(${db>=0?'+':''}${db.toFixed(0)}%)</span>`:''}</td></tr>`;
}
function workloadWinner(A,B){
  const pairs=[winner(A.distanceM,B.distanceM),winner(A.highDistance,B.highDistance),winner(A.sprints,B.sprints),winner(A.highRuns,B.highRuns),winner(A.accelerations,B.accelerations)];
  const ca=pairs.filter(x=>x==='a').length,cb=pairs.filter(x=>x==='b').length;
  return ca>=3?'a':cb>=3?'b':'mixed';
}
function comparisonSummary(A,B,labelA,labelB){
  const lines=[],vol=winner(A.distanceM,B.distanceM);
  if(vol!=='equal'){const hi=vol==='a'?A:B,lo=vol==='a'?B:A,name=vol==='a'?labelA:labelB,d=diffPct(hi.distanceM,lo.distanceM);lines.push(`${name} acumuló más volumen total${d!=null?` (${Math.abs(d).toFixed(0)}% más distancia)`:''}.`)}
  else lines.push('El volumen total de carrera fue prácticamente idéntico.');
  const work=workloadWinner(A,B);
  if(work==='a')lines.push(`${labelA} reunió más indicadores de carga intensa.`);
  else if(work==='b')lines.push(`${labelB} reunió más indicadores de carga intensa.`);
  else lines.push('La carga intensa quedó repartida: ninguno dominó claramente todos los indicadores.');
  const fA=fatigueLevel(A),fB=fatigueLevel(B);
  if(fA>fB)lines.push(`${labelA} mostró una caída de intensidad más marcada en el tramo final.`);
  else if(fB>fA)lines.push(`${labelB} mostró una caída de intensidad más marcada en el tramo final.`);
  else lines.push('El patrón de fatiga estimado fue parecido.');
  if(A.roleName!==B.roleName)lines.push(`La ocupación sugiere roles distintos: ${labelA} como ${A.roleName} y ${labelB} como ${B.roleName}.`);
  else lines.push(`Ambos registros encajan principalmente con un perfil de ${A.roleName}.`);
  return lines.join(' ');
}
function headlines(A,B,labelA,labelB){
  const vol=winner(A.distanceM,B.distanceM),spd=winner(A.topSpeed,B.topSpeed),int=winner(A.highDistance||A.highRuns,B.highDistance||B.highRuns),fA=fatigueLevel(A),fB=fatigueLevel(B);
  const nm=(w)=>w==='a'?labelA:w==='b'?labelB:'Empate';
  return `<div class="compare-headline"><span>Más volumen</span><strong>${esc(nm(vol))}</strong><small>${fmtKm(Math.max(A.distanceM,B.distanceM))}</small></div>
  <div class="compare-headline"><span>Mayor velocidad</span><strong>${esc(nm(spd))}</strong><small>${fmtKmh(Math.max(A.topSpeed,B.topSpeed))}</small></div>
  <div class="compare-headline"><span>Más carga intensa</span><strong>${esc(nm(int))}</strong><small>${Math.max(A.highRuns,B.highRuns)} carreras intensas</small></div>
  <div class="compare-headline"><span>Fatiga final</span><strong>${esc(fA===fB?'Patrón similar':fA>fB?`${labelA} cayó más`:`${labelB} cayó más`)}</strong><small>estimación por evolución de intensidad y recuperación</small></div>`;
}
function headerHtml(player,match){
  return `<header class="compare-head"><div class="compare-head-left"><button type="button" class="compare-back" data-back>← Informe</button><div><div class="compare-kicker">COMPARAR</div><h1>Análisis comparativo</h1></div></div><div class="compare-current">${photoHtml(player)}<div><strong>${esc(player?.nickname||'Jugador')}</strong><br>${formatDate(match?.match_date)}</div></div></header>`;
}
function playerCard(player,match,side,label){
  return `<div class="compare-player-card side-${side}">${photoHtml(player)}<div><h3>${esc(label)}</h3><p>${esc(player?.nickname||'Jugador')} · ${formatDate(match?.match_date)} · ${esc(compLabel(match))}${scoreLabel(match)?` · ${scoreLabel(match)}`:''}</p></div></div>`;
}
function metricTable(A,B,labelA,labelB){
  return `<section class="compare-section"><div class="compare-section-head"><span>CIFRAS</span><h3>Esfuerzo y rendimiento</h3></div><div style="overflow-x:auto"><table class="compare-table"><thead><tr><th>Métrica</th><th>${esc(labelA)}</th><th>${esc(labelB)}</th></tr></thead><tbody>
  ${metricRow('Distancia total',A.distanceM,B.distanceM,fmtKm)}${metricRow('Velocidad máxima',A.topSpeed,B.topSpeed,fmtKmh)}${metricRow('Velocidad media',A.avgSpeed,B.avgSpeed,fmtKmh)}
  ${metricRow('Sprints',A.sprints,B.sprints,v=>String(Math.round(v)))}${metricRow('Carreras de alta intensidad',A.highRuns,B.highRuns,v=>String(Math.round(v)))}${metricRow('Distancia de alta intensidad',A.highDistance,B.highDistance,fmtM)}
  ${metricRow('Esfuerzos >18 km/h',A.efforts18,B.efforts18,v=>String(Math.round(v)))}${metricRow('Aceleraciones fuertes',A.accelerations,B.accelerations,v=>String(Math.round(v)))}
  ${metricRow('Velocidad media de sprint alto',A.avgSprintPeak,B.avgSprintPeak,fmtKmh)}${metricRow('Distancia / min',A.distancePerMin,B.distancePerMin,v=>finite(v)?Math.round(v)+' m/min':'—')}
  ${metricRow('Distancia en sprint',A.sprintDistance,B.sprintDistance,fmtM)}${metricRow('Recuperación media',A.avgRecovery,B.avgRecovery,v=>finite(v)?Math.round(v)+' s':'—',false)}
  ${A.avgHr!=null&&B.avgHr!=null?metricRow('FC media',A.avgHr,B.avgHr,v=>Math.round(v)+' ppm'):''}${A.maxHr!=null&&B.maxHr!=null?metricRow('FC máxima',A.maxHr,B.maxHr,v=>Math.round(v)+' ppm'):''}
  </tbody></table></div></section>`;
}
function mapPair(title,key,nameA,nameB){
  return `<section class="compare-section"><div class="compare-section-head"><span>MAPAS</span><h3>${esc(title)}</h3></div><div class="compare-map-pair">
  <article class="compare-map-card"><header>${esc(nameA)}</header><canvas data-compare-map="${key}-a"></canvas></article><article class="compare-map-card"><header>${esc(nameB)}</header><canvas data-compare-map="${key}-b"></canvas></article></div></section>`;
}
function positionalSection(A,B,labelA,labelB){
  const thirds=M=>`${pct(M.thirds[0])}% / ${pct(M.thirds[1])}% / ${pct(M.thirds[2])}%`,sides=M=>`${pct(M.sides[0])}% / ${pct(M.sides[1])}% / ${pct(M.sides[2])}%`;
  return `<section class="compare-section"><div class="compare-section-head"><span>POSICIÓN</span><h3>Rol y ocupación</h3></div><div class="compare-two-cols">
  <div><div class="compare-role">${esc(A.roleName)} ${A.roleConfidence!=null?`<small>${A.roleConfidence}% confianza</small>`:''}</div><ul class="compare-list"><li>${esc(labelA)}</li><li>Tercios def/medio/ataque: ${thirds(A)}</li><li>Izq/centro/der: ${sides(A)}</li></ul></div>
  <div><div class="compare-role">${esc(B.roleName)} ${B.roleConfidence!=null?`<small>${B.roleConfidence}% confianza</small>`:''}</div><ul class="compare-list"><li>${esc(labelB)}</li><li>Tercios def/medio/ataque: ${thirds(B)}</li><li>Izq/centro/der: ${sides(B)}</li></ul></div></div></section>`;
}
function sprintSection(A,B,labelA,labelB){
  const bullets=(M,label)=>{const l=M.speed?.eventSummary?.longest,f=M.speed?.eventSummary?.fastest;return `<div><h4>${esc(label)}</h4><ul class="compare-list"><li>${M.sprints} sprints relativos.</li><li>${M.efforts18} esfuerzos por encima de 18 km/h.</li><li>${l&&finite(l.distanceM)?`Sprint más largo: ${Math.round(l.distanceM)} m.`:'Sin sprint largo calculable.'}</li><li>${f&&finite(f.peakSpeedKmh)?`Mayor punta de velocidad en sprint: ${Number(f.peakSpeedKmh).toFixed(1)} km/h.`:'Sin punta de sprint calculable.'}</li><li>${M.avgRecovery!=null?`Recuperación media entre sprints: ${Math.round(M.avgRecovery)} s.`:'Recuperación media no disponible.'}</li></ul></div>`};
  return `<section class="compare-section"><div class="compare-section-head"><span>SPRINTS</span><h3>Perfil de esfuerzos máximos</h3></div><div class="compare-two-cols">${bullets(A,labelA)}${bullets(B,labelB)}</div></section>`;
}
function fatigueSection(A,B,labelA,labelB){
  const txt=M=>!M.fatigue?.available?'No hay datos suficientes para estimar fatiga.':M.fatigue.summary?.level==='clear'?'Caída clara de la capacidad de intensidad en el tramo final.':M.fatigue.summary?.level==='mild'?'Ligera bajada de intensidad al final.':'Capacidad de intensidad bastante estable durante el partido.';
  return `<section class="compare-section"><div class="compare-section-head"><span>FATIGA</span><h3>Evolución del esfuerzo</h3></div><div class="compare-two-cols"><div><h4>${esc(labelA)}</h4><p>${esc(txt(A))}</p></div><div><h4>${esc(labelB)}</h4><p>${esc(txt(B))}</p></div></div></section>`;
}
function drawSeries(canvas,A,B,labelA,labelB,key){
  const dpr=Math.max(1,window.devicePixelRatio||1),w=Math.max(700,canvas.parentElement?.clientWidth||900),h=280;
  canvas.width=w*dpr;canvas.height=h*dpr;canvas.style.height=h+'px';const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#09110d';ctx.fillRect(0,0,w,h);
  const sa=(key==='hr'?A.a?.analysisDetail?.heartRate?.series:A.speed?.speedSeries)||[],sb2=(key==='hr'?B.a?.analysisDetail?.heartRate?.series:B.speed?.speedSeries)||[],all=[...sa,...sb2].filter(x=>finite(x.tSec)&&finite(x.value));
  if(all.length<2){ctx.fillStyle='#8e9a93';ctx.textAlign='center';ctx.font='600 14px system-ui';ctx.fillText('Sin datos suficientes',w/2,h/2);return}
  const left=45,right=16,top=20,bottom=28,xMax=Math.max(3600,...all.map(x=>Number(x.tSec))),yMin=key==='hr'?Math.max(60,Math.floor(Math.min(...all.map(x=>Number(x.value)))/10)*10):0,yMax=Math.ceil(Math.max(...all.map(x=>Number(x.value)))/10)*10||10;
  ctx.strokeStyle='rgba(255,255,255,.10)';ctx.lineWidth=1;
  for(let i=0;i<=4;i++){const y=top+(h-top-bottom)*i/4;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w-right,y);ctx.stroke()}
  for(let i=0;i<=6;i++){const x=left+(w-left-right)*i/6;ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,h-bottom);ctx.stroke();ctx.fillStyle='#7e8c84';ctx.font='10px system-ui';ctx.textAlign='center';ctx.fillText(Math.round(xMax*i/6/60)+'′',x,h-9)}
  function draw(series,color){const pts=series.filter(x=>finite(x.tSec)&&finite(x.value));if(pts.length<2)return;ctx.beginPath();pts.forEach((p,i)=>{const x=left+Number(p.tSec)/xMax*(w-left-right),y=top+(1-(Number(p.value)-yMin)/Math.max(1,yMax-yMin))*(h-top-bottom);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke()}
  draw(sa,'#61d77b');draw(sb2,'#4b8fe8');ctx.fillStyle='#61d77b';ctx.fillRect(left,5,10,3);ctx.fillStyle='#b7c2bc';ctx.font='11px system-ui';ctx.textAlign='left';ctx.fillText(labelA,left+15,10);ctx.fillStyle='#4b8fe8';ctx.fillRect(left+130,5,10,3);ctx.fillStyle='#b7c2bc';ctx.fillText(labelB,left+145,10);
}
function renderComparison(dataA,dataB){
  const A=metrics(dataA.analysis),B=metrics(dataB.analysis),labelA=dataA.label,labelB=dataB.label,modeTitle=mode==='previous'?'Comparación entre partidos':'Comparación entre jugadores';
  root.innerHTML=`<div class="compare-shell">${headerHtml(dataA.player,dataA.match)}<main class="compare-report"><div class="compare-titlebar"><div><h2>${esc(modeTitle)}</h2><p>${esc(labelA)} frente a ${esc(labelB)}</p></div><button type="button" class="compare-change" data-change>← Cambiar comparación</button></div>
  <div class="compare-players">${playerCard(dataA.player,dataA.match,'a',labelA)}${playerCard(dataB.player,dataB.match,'b',labelB)}</div><div class="compare-headlines">${headlines(A,B,labelA,labelB)}</div>
  <div class="compare-summary"><h3>Lectura rápida</h3><p>${esc(comparisonSummary(A,B,labelA,labelB))}</p></div>${metricTable(A,B,labelA,labelB)}${positionalSection(A,B,labelA,labelB)}
  ${mapPair('Mapa de calor','heat',labelA,labelB)}${mapPair('Recorrido','trail',labelA,labelB)}${mapPair('Ocupación por zonas','zones',labelA,labelB)}
  <section class="compare-section"><div class="compare-section-head"><span>VELOCIDAD</span><h3>Evolución durante el partido</h3></div><div class="compare-chart-wrap"><canvas data-compare-chart="speed"></canvas></div></section>
  ${(A.avgHr!=null&&B.avgHr!=null)?`<section class="compare-section"><div class="compare-section-head"><span>PULSO</span><h3>Frecuencia cardíaca</h3></div><div class="compare-chart-wrap"><canvas data-compare-chart="hr"></canvas></div></section>`:''}
  ${sprintSection(A,B,labelA,labelB)}${fatigueSection(A,B,labelA,labelB)}</main></div>`;
  root.querySelector('[data-change]').onclick=()=>location.href=`gps-compare.html?match=${encodeURIComponent(currentMatchId)}&player=${encodeURIComponent(currentPlayerId)}`;
  root.querySelector('[data-back]').onclick=()=>history.back();
  requestAnimationFrame(()=>{
    [['heat',drawHeatmap],['trail',drawMovementTrail],['zones',drawZoneOccupancy]].forEach(([key,fn])=>{const ca=root.querySelector(`[data-compare-map="${key}-a"]`),cb=root.querySelector(`[data-compare-map="${key}-b"]`);if(ca)fn(ca,dataA.analysis);if(cb)fn(cb,dataB.analysis)});
    const s=root.querySelector('[data-compare-chart="speed"]');if(s)drawSeries(s,A,B,labelA,labelB,'speed');
    const h=root.querySelector('[data-compare-chart="hr"]');if(h)drawSeries(h,A,B,labelA,labelB,'hr');
  });
}
async function loadBase(){
  if(!currentMatchId||!currentPlayerId)throw new Error('Falta el partido o el jugador.');
  const [{data:player},{data:match},{data:gps,error}]=await Promise.all([
    sb.from('players').select('id,nickname,photo_url').eq('id',currentPlayerId).maybeSingle(),
    sb.from('matches').select('*').eq('id',currentMatchId).maybeSingle(),
    sb.from('match_player_gps').select('*').eq('match_id',currentMatchId).eq('player_id',currentPlayerId).maybeSingle()
  ]);
  if(error||!gps)throw new Error('No se pudo cargar el informe GPS actual.');
  return{player,match,gps,analysis:fromSupabaseRow(gps)};
}
async function selectionScreen(base){
  const [{data:prevGps},{data:sameGps}]=await Promise.all([
    sb.from('match_player_gps').select('match_id').eq('player_id',currentPlayerId).neq('match_id',currentMatchId),
    sb.from('match_player_gps').select('player_id').eq('match_id',currentMatchId).neq('player_id',currentPlayerId)
  ]);
  const prevIds=[...new Set((prevGps||[]).map(x=>String(x.match_id)))],playerIds=[...new Set((sameGps||[]).map(x=>String(x.player_id)))];
  let prevMatches=[],otherPlayers=[];
  if(prevIds.length){const{data}=await sb.from('matches').select('id,match_date,competition,red_score,black_score').in('id',prevIds).order('match_date',{ascending:false});prevMatches=data||[]}
  if(playerIds.length){const{data}=await sb.from('players').select('id,nickname,photo_url').in('id',playerIds).order('nickname');otherPlayers=data||[]}
  root.innerHTML=`<div class="compare-shell">${headerHtml(base.player,base.match)}<main class="compare-select-screen"><div class="compare-intro">Elige qué quieres comparar con el informe actual de <strong>${esc(base.player?.nickname||'Jugador')}</strong> del ${formatDate(base.match?.match_date)}.</div><div class="compare-options">
  <section class="compare-option"><h2>Comparar con un partido anterior</h2><p>Contrasta el mismo jugador entre dos partidos: carga, velocidad, sprints, mapas, posición, pulso y fatiga.</p>${prevMatches.length?`<div class="compare-select-row"><select data-prev><option value="">Selecciona un partido…</option>${prevMatches.map(m=>`<option value="${m.id}">${formatDate(m.match_date)} · ${esc(compLabel(m))}${scoreLabel(m)?` · ${scoreLabel(m)}`:''}</option>`).join('')}</select><button type="button" data-prev-go>Comparar</button></div>`:`<div class="compare-empty">Todavía no hay otro partido con datos GPS guardados para este jugador.</div>`}</section>
  <section class="compare-option"><h2>Comparar con otro jugador</h2><p>Compara dos jugadores del mismo partido para ver diferencias de carga, velocidad, posición, sprints, mapas y fatiga.</p>${otherPlayers.length?`<div class="compare-select-row"><select data-player><option value="">Selecciona un jugador…</option>${otherPlayers.map(p=>`<option value="${p.id}">${esc(p.nickname)}</option>`).join('')}</select><button type="button" data-player-go>Comparar</button></div>`:`<div class="compare-empty">No hay otro jugador con GPS guardado en este partido.</div>`}</section>
  </div></main></div>`;
  root.querySelector('[data-back]').onclick=()=>history.back();
  const prevSel=root.querySelector('[data-prev]'),prevGo=root.querySelector('[data-prev-go]');
  if(prevSel&&prevGo){const go=()=>{if(prevSel.value)location.href=`gps-compare.html?match=${encodeURIComponent(currentMatchId)}&player=${encodeURIComponent(currentPlayerId)}&mode=previous&otherMatch=${encodeURIComponent(prevSel.value)}`};prevGo.onclick=go;prevSel.onchange=go}
  const pSel=root.querySelector('[data-player]'),pGo=root.querySelector('[data-player-go]');
  if(pSel&&pGo){const go=()=>{if(pSel.value)location.href=`gps-compare.html?match=${encodeURIComponent(currentMatchId)}&player=${encodeURIComponent(currentPlayerId)}&mode=player&otherPlayer=${encodeURIComponent(pSel.value)}`};pGo.onclick=go;pSel.onchange=go}
}
async function loadComparison(base){
  if(mode==='previous'&&otherMatchId){
    const [{data:gps,error},{data:match}]=await Promise.all([sb.from('match_player_gps').select('*').eq('match_id',otherMatchId).eq('player_id',currentPlayerId).maybeSingle(),sb.from('matches').select('*').eq('id',otherMatchId).maybeSingle()]);
    if(error||!gps||!match)throw new Error('No se pudo cargar el partido anterior.');
    renderComparison({...base,label:`${base.player.nickname} · ${formatDate(base.match.match_date)}`},{player:base.player,match,gps,analysis:fromSupabaseRow(gps),label:`${base.player.nickname} · ${formatDate(match.match_date)}`});return;
  }
  if(mode==='player'&&otherPlayerId){
    const [{data:gps,error},{data:player}]=await Promise.all([sb.from('match_player_gps').select('*').eq('match_id',currentMatchId).eq('player_id',otherPlayerId).maybeSingle(),sb.from('players').select('id,nickname,photo_url').eq('id',otherPlayerId).maybeSingle()]);
    if(error||!gps||!player)throw new Error('No se pudo cargar el otro jugador.');
    renderComparison({...base,label:base.player.nickname},{player,match:base.match,gps,analysis:fromSupabaseRow(gps),label:player.nickname});return;
  }
  await selectionScreen(base);
}
(async()=>{try{const base=await loadBase();await loadComparison(base)}catch(err){root.innerHTML=`<div class="compare-status">${esc(err.message||'No se pudo cargar la comparación.')}</div>`}})();
