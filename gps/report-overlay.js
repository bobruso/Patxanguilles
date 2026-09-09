const SUPABASE_URL='https://cnnhstlguewrxjihhlqc.supabase.co';
const SUPABASE_KEY='sb_publishable_uWEwYEMkAe3YkeAzX7ACAg_0aEYHmM6';
let sb=null,nameMap=null,gpsHistoryActive=false;
function client(){if(sb)return sb;if(!window.supabase?.createClient)return null;sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false}});return sb}
async function players(){if(nameMap)return nameMap;const c=client();if(!c)return new Map();const{data}=await c.from('players').select('id,nickname');nameMap=new Map((data||[]).map(p=>[String(p.nickname||'').trim().toLowerCase(),String(p.id)]));return nameMap}
function currentMatchId(){return document.getElementById('matchContent')?.dataset?.gpsMatchId||null}
function playerNameFromIcon(icon){
  const aria=icon.getAttribute('aria-label')||'',m=aria.match(/Abrir análisis GPS de\s+(.+)$/i);
  if(m)return m[1].trim();
  const name=icon.closest('.big-shirt')?.querySelector('.player-name');
  if(!name)return '';
  const clone=name.cloneNode(true);clone.querySelectorAll('[data-gps-hover],button,.patx-match-gps-hover').forEach(el=>el.remove());
  return(clone.textContent||'').trim();
}
function ensureOverlay(){
  let overlay=document.querySelector('[data-patx-gps-report-overlay]');if(overlay)return overlay;
  overlay=document.createElement('div');overlay.className='patx-v204-report-overlay';overlay.dataset.patxGpsReportOverlay='1';
  overlay.innerHTML='<iframe class="patx-v204-report-frame" title="Informe GPS"></iframe>';
  document.body.appendChild(overlay);document.body.classList.add('patx-v204-report-open');return overlay;
}
function removeOverlay(){document.querySelector('[data-patx-gps-report-overlay]')?.remove();document.body.classList.remove('patx-v204-report-open')}
function closeOverlay(fromPopState=false){
  const isOpen=!!document.querySelector('[data-patx-gps-report-overlay]');
  if(!isOpen){gpsHistoryActive=false;return}
  if(gpsHistoryActive&&!fromPopState){
    history.back();
    return;
  }
  removeOverlay();
  gpsHistoryActive=false;
}
function openReport(matchId,playerId){
  if(!matchId||!playerId)return;
  if(!document.querySelector('[data-patx-gps-report-overlay]')){
    history.pushState({...history.state,patxGpsReport:true},'',location.href);
    gpsHistoryActive=true;
  }
  ensureOverlay().querySelector('iframe').src=`gps-report.html?match=${encodeURIComponent(matchId)}&player=${encodeURIComponent(playerId)}`;
}
document.addEventListener('click',async e=>{
  const icon=e.target.closest('.patx-match-gps-icon');if(!icon)return;
  e.preventDefault();e.stopImmediatePropagation();
  const matchId=currentMatchId();let playerId=icon.dataset.gpsPlayerId||null;
  if(!playerId){const map=await players();playerId=map.get(playerNameFromIcon(icon).toLowerCase())||null}
  if(playerId&&matchId)openReport(matchId,playerId);
},true);
window.addEventListener('popstate',()=>{
  if(document.querySelector('[data-patx-gps-report-overlay]'))closeOverlay(true);
});
window.addEventListener('message',e=>{if(e.origin===location.origin&&e.data?.type==='patx-gps-close-report')closeOverlay()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.querySelector('[data-patx-gps-report-overlay]'))closeOverlay()});
window.PatxGpsReportOverlay={openReport,closeOverlay};