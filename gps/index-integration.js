import{drawHeatmap}from'./pitch-maps.js';
import{fromSupabaseRow}from'./fit-analysis.js';

const SUPABASE_URL='https://cnnhstlguewrxjihhlqc.supabase.co';
const SUPABASE_KEY='sb_publishable_uWEwYEMkAe3YkeAzX7ACAg_0aEYHmM6';
let sb=null;
let playerNameToId=null;
let currentMatchId=null;
let refreshSeq=0;

function ensureCss(){
  if(document.querySelector('link[data-patx-gps-css]'))return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href='./gps/gps-panel.css';
  link.dataset.patxGpsCss='1';
  document.head.appendChild(link);
}

function client(){
  if(sb)return sb;
  if(!window.supabase?.createClient)throw new Error('Supabase no está disponible');
  sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false}});
  return sb;
}

async function loadPlayerMap(){
  if(playerNameToId)return playerNameToId;
  const{data,error}=await client().from('players').select('id,nickname');
  if(error)throw error;
  playerNameToId=new Map((data||[]).map(p=>[String(p.nickname||'').trim(),String(p.id)]));
  return playerNameToId;
}

async function loadMatchGps(matchId){
  const{data,error}=await client().from('match_player_gps').select('*').eq('match_id',matchId);
  if(error)throw error;
  return new Map((data||[]).map(row=>[String(row.player_id),row]));
}

const fmtKm=m=>Number.isFinite(Number(m))?(Number(m)/1000).toFixed(2)+' km':'—';
const fmtKmh=v=>Number.isFinite(Number(v))?Number(v).toFixed(1)+' km/h':'—';

function gpsIconSvg(){return '<span aria-hidden="true">⌚</span>';}


function clearGpsDecorations(content){
  if(!content)return;
  content.querySelectorAll('.big-shirt').forEach(shirt=>{
    shirt.classList.remove('patx-match-player-has-gps');
    delete shirt.dataset.gpsDecorated;
    shirt.querySelectorAll('.patx-match-gps-icon,.patx-match-gps-mini-stats').forEach(el=>el.remove());
    const name=shirt.querySelector('.player-name');
    if(!name)return;
    name.classList.remove('patx-match-gps-name','patx-gps-preview-open');
    name.removeAttribute('tabindex');
    name.removeAttribute('aria-label');
    name.querySelectorAll('[data-gps-hover]').forEach(el=>el.remove());
  });
}

function decorateShirt(shirt,row,{matchId,playerId,playerName}){
  if(!shirt||shirt.dataset.gpsDecorated==='1')return;
  shirt.dataset.gpsDecorated='1';
  shirt.classList.add('patx-match-player-has-gps');
  const name=shirt.querySelector('.player-name');
  if(!name)return;
  name.classList.add('patx-match-gps-name');
  name.setAttribute('tabindex','0');
  name.setAttribute('aria-label',playerName+' · previsualizar mapa de calor');
  name.insertAdjacentHTML('beforeend',`<span class="patx-match-gps-hover" data-gps-hover><canvas aria-label="Mapa de calor de ${playerName.replace(/[&<>\"]/g,'')}"></canvas><small>Mapa de calor · previsualización</small></span>`);

  const icon=document.createElement('button');
  icon.type='button';
  icon.className='patx-gps-icon-btn patx-match-gps-icon';
  icon.title='Abrir análisis GPS';
  icon.setAttribute('aria-label','Abrir análisis GPS de '+playerName);
  icon.innerHTML=gpsIconSvg();
  name.insertAdjacentElement('afterend',icon);

  const stats=document.createElement('span');
  stats.className='patx-gps-mini-stats patx-match-gps-mini-stats';
  stats.innerHTML=`<b>${fmtKm(row.distance_m)}</b><span>${fmtKmh(row.top_speed_kmh)} máx.</span><span>${fmtKmh(row.avg_speed_kmh)} media</span>`;
  icon.insertAdjacentElement('afterend',stats);

  const canvas=name.querySelector('[data-gps-hover] canvas');
  if(canvas)requestAnimationFrame(()=>drawHeatmap(canvas,fromSupabaseRow(row)));

  icon.addEventListener('click',e=>{
    e.preventDefault();e.stopPropagation();
    location.href=`gps-report.html?match=${encodeURIComponent(matchId)}&player=${encodeURIComponent(playerId)}`;
  });

  name.addEventListener('click',e=>{
    if(!window.matchMedia('(hover:none)').matches)return;
    e.preventDefault();e.stopPropagation();
    const open=name.classList.toggle('patx-gps-preview-open');
    document.querySelectorAll('.patx-match-gps-name.patx-gps-preview-open').forEach(el=>{if(el!==name)el.classList.remove('patx-gps-preview-open')});
    if(open)requestAnimationFrame(()=>canvas&&drawHeatmap(canvas,fromSupabaseRow(row)));
  });
  name.addEventListener('keydown',e=>{
    if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();name.classList.toggle('patx-gps-preview-open')}
  });
}

function renderGpsTable(content,gpsMap,{matchId,nameMap}){content.querySelectorAll('.patx-match-gps-table-wrap').forEach(x=>x.remove());if(!gpsMap?.size)return;const byId=new Map([...nameMap.entries()].map(([name,id])=>[String(id),name]));const rows=[...gpsMap.entries()].map(([playerId,row])=>{const detail=row.analysis_detail||{},speed=detail.speed||{},top=Number(speed.rawTopSpeedKmh)||Number(row.top_speed_kmh)||0,hi=speed.highIntensityRunCount??speed.highIntensityRuns?.length??'—',name=byId.get(String(playerId))||'Jugador';return `<div class="patx-match-gps-row"><div class="patx-match-gps-player"><strong>${name}</strong><small>Distancia recorrida: ${fmtKm(row.distance_m)}</small><small>Velocidad máxima: ${fmtKmh(top)}</small><small>Carreras de alta intensidad: ${hi}</small></div><span class="patx-match-watch" aria-hidden="true">⌚</span><button type="button" data-gps-table-open="${playerId}">Ver datos</button></div>`}).join('');const section=document.createElement('section');section.className='patx-match-gps-table-wrap';section.innerHTML=`<h4>Datos GPS</h4><div class="patx-match-gps-table">${rows}</div>`;const actions=content.querySelector('.share-result-actions');if(actions)actions.parentNode.insertBefore(section,actions);else content.appendChild(section);section.querySelectorAll('[data-gps-table-open]').forEach(btn=>btn.onclick=e=>{e.preventDefault();e.stopPropagation();location.href=`gps-report.html?match=${encodeURIComponent(matchId)}&player=${encodeURIComponent(btn.dataset.gpsTableOpen)}`})}

function addUploadButton(matchId){
  const actions=document.querySelector('#matchContent .share-result-actions');
  if(!actions)return;
  let btn=actions.querySelector('[data-gps-upload-match]');
  if(!btn){
    btn=document.createElement('button');
    btn.type='button';
    btn.className='secondary patx-match-gps-upload';
    btn.dataset.gpsUploadMatch='1';
    btn.textContent='⌚ Añadir datos GPS';
    actions.insertBefore(btn,actions.lastElementChild||null);
  }
  btn.dataset.matchId=String(matchId);
  btn.onclick=e=>{
    e.preventDefault();e.stopPropagation();
    location.href=`gps-upload.html?match=${encodeURIComponent(matchId)}`;
  };
}

export async function enhanceOpenMatchGps(matchId){
  ensureCss();
  currentMatchId=matchId;
  const content=document.getElementById('matchContent');
  if(!content)return;
  content.dataset.gpsMatchId=String(matchId);
  const seq=++refreshSeq;
  clearGpsDecorations(content);
  addUploadButton(matchId);
  try{
    const[nameMap,gpsMap]=await Promise.all([loadPlayerMap(),loadMatchGps(matchId)]);
    if(seq!==refreshSeq||String(content.dataset.gpsMatchId)!==String(matchId))return;
    renderGpsTable(content,gpsMap,{matchId,nameMap});
  }catch(err){
    console.warn('[Patx GPS] No se pudo cargar la previsualización GPS',err);
  }
}

function refreshCurrentMatchGps(){
  let requested=null;try{requested=sessionStorage.getItem('patx:gps:refresh-match')}catch{}
  if(requested!=null&&currentMatchId!=null&&String(requested)===String(currentMatchId)){try{sessionStorage.removeItem('patx:gps:refresh-match')}catch{}}
  const target=currentMatchId??requested;
  if(target==null)return;
  const modal=document.getElementById('matchModal');
  const content=document.getElementById('matchContent');
  if(!modal?.classList.contains('open')||!content)return;
  currentMatchId=target;
  setTimeout(()=>enhanceOpenMatchGps(target),0);
}

function install(){
  ensureCss();
  const original=window.openMatch;
  if(typeof original!=='function'||original.__patxGpsWrapped)return false;
  function wrappedOpenMatch(id){
    currentMatchId=id;
    const result=original.apply(this,arguments);
    Promise.resolve(result).finally(()=>setTimeout(()=>enhanceOpenMatchGps(id),0));
    return result;
  }
  wrappedOpenMatch.__patxGpsWrapped=true;
  wrappedOpenMatch.__patxGpsOriginal=original;
  window.openMatch=wrappedOpenMatch;
  return true;
}

if(!install()){
  let attempts=0;
  const timer=setInterval(()=>{attempts++;if(install()||attempts>80)clearInterval(timer)},50);
}

window.addEventListener('pageshow',refreshCurrentMatchGps);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshCurrentMatchGps()});
window.PatxGpsIndexIntegration={enhanceOpenMatchGps,refreshCurrentMatchGps};
