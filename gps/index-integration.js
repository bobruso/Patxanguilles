const SUPABASE_URL='https://cnnhstlguewrxjihhlqc.supabase.co';
const SUPABASE_KEY='sb_publishable_uWEwYEMkAe3YkeAzX7ACAg_0aEYHmM6';
let sb=null;
let playerNameToId=null;
let currentMatchId=null;
let refreshSeq=0;

function ensureCss(){
  if(!document.querySelector('link[data-patx-gps-css]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='./gps/gps-panel.css';
    link.dataset.patxGpsCss='1';
    document.head.appendChild(link);
  }
  if(!document.querySelector('link[data-patx-v196-css]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='./gps/v196-overrides.css';
    link.dataset.patxV196Css='1';
    document.head.appendChild(link);
  }
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
  const{data,error}=await client().from('match_player_gps').select('player_id').eq('match_id',matchId);
  if(error)throw error;
  return new Set((data||[]).map(row=>String(row.player_id)));
}

function clearGpsUi(content){
  if(!content)return;
  content.querySelectorAll('.patx-match-gps-table-wrap,.patx-gps-match-legend').forEach(el=>el.remove());
  content.querySelectorAll('.big-shirt').forEach(shirt=>{
    shirt.classList.remove('patx-match-player-has-gps');
    shirt.querySelectorAll('.patx-match-gps-icon,.patx-match-gps-mini-stats,[data-gps-hover]').forEach(el=>el.remove());
    const name=shirt.querySelector('.player-name');
    if(name){
      name.classList.remove('patx-match-gps-name','patx-gps-preview-open');
      name.removeAttribute('tabindex');
      name.removeAttribute('aria-label');
    }
  });
}

function openGpsReport(matchId,playerId){
  const url=`gps-report.html?match=${encodeURIComponent(matchId)}&player=${encodeURIComponent(playerId)}`;
  window.open(url,'_blank','noopener');
}

function addGpsIcon(shirt,{matchId,playerId,playerName}){
  if(!shirt||shirt.querySelector('.patx-match-gps-icon'))return;
  shirt.classList.add('patx-match-player-has-gps');
  const icon=document.createElement('button');
  icon.type='button';
  icon.className='patx-match-gps-icon';
  icon.innerHTML='<span aria-hidden="true">⌚</span>';
  icon.title=`Ver datos GPS de ${playerName}`;
  icon.setAttribute('aria-label',`Ver datos GPS de ${playerName}`);
  icon.addEventListener('click',e=>{
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    openGpsReport(matchId,playerId);
  });
  shirt.appendChild(icon);
}

function addLegend(content){
  const side=content.querySelector('.match-detail-side');
  if(!side)return;
  const legend=document.createElement('div');
  legend.className='patx-gps-match-legend';
  legend.innerHTML='<strong>DATOS GPS</strong><span>=</span><span class="patx-gps-legend-watch" aria-hidden="true">⌚</span>';
  const events=side.querySelector('.match-events-grid');
  if(events)events.insertAdjacentElement('afterend',legend);
  else side.prepend(legend);
}

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
    e.preventDefault();
    e.stopPropagation();
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
  clearGpsUi(content);
  addUploadButton(matchId);
  try{
    const[nameMap,gpsIds]=await Promise.all([loadPlayerMap(),loadMatchGps(matchId)]);
    if(seq!==refreshSeq||String(content.dataset.gpsMatchId)!==String(matchId))return;

    for(const shirt of content.querySelectorAll('.big-shirt')){
      const name=String(shirt.querySelector('.player-name')?.textContent||'').trim();
      const playerId=nameMap.get(name);
      if(playerId&&gpsIds.has(String(playerId))){
        addGpsIcon(shirt,{matchId,playerId,playerName:name});
      }
    }
    addLegend(content);
  }catch(err){
    console.warn('[Patx GPS] No se pudo cargar la integración GPS del partido',err);
  }
}

function refreshCurrentMatchGps(){
  const modal=document.getElementById('matchModal');
  const content=document.getElementById('matchContent');
  if(!modal?.classList.contains('open')||!content||currentMatchId==null)return;
  setTimeout(()=>enhanceOpenMatchGps(currentMatchId),0);
}

function install(){
  ensureCss();
  const original=window.openMatch;
  if(typeof original!=='function'||original.__patxGpsCleanWrapped)return false;
  const base=original.__patxGpsOriginal||original;
  function wrappedOpenMatch(id){
    currentMatchId=id;
    const result=base.apply(this,arguments);
    Promise.resolve(result).finally(()=>setTimeout(()=>enhanceOpenMatchGps(id),0));
    return result;
  }
  wrappedOpenMatch.__patxGpsCleanWrapped=true;
  wrappedOpenMatch.__patxGpsOriginal=base;
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
