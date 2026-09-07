import{drawHeatmap}from'./pitch-maps.js';
import{fromSupabaseRow}from'./fit-analysis.js';

const esc=v=>String(v??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
const km=m=>(Number(m)/1000).toFixed(2)+' km';
const kmh=v=>Number(v).toFixed(1)+' km/h';

export function gpsIconSvg(){return`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"></path></svg>`}

export function gpsCompactHtml(row,{playerName='',playerId=null,matchId=null}={}){
  if(!row)return'';
  return `<span class="patx-gps-compact" data-gps-player="${esc(playerId)}" data-gps-match="${esc(matchId)}">
    <span class="patx-gps-name-wrap" data-gps-preview-anchor tabindex="0"><span class="patx-gps-player-name">${esc(playerName)}</span><span class="patx-gps-hover-card" data-gps-hover-card><canvas data-gps-hover-map aria-label="Mapa de calor de ${esc(playerName)}"></canvas><small>Mapa de calor · previsualización</small></span></span>
    <button type="button" class="patx-gps-icon-btn" data-gps-open title="Abrir análisis GPS" aria-label="Abrir análisis GPS de ${esc(playerName)}">${gpsIconSvg()}</button>
    <span class="patx-gps-mini-stats"><b>${km(row.distance_m)}</b><span>${kmh(row.top_speed_kmh)} máx.</span><span>${kmh(row.avg_speed_kmh)} media</span></span>
  </span>`;
}

export function mountGpsCompact(root,row,options={}){
  if(!root||!row)return null;root.insertAdjacentHTML('beforeend',gpsCompactHtml(row,options));const el=root.querySelector('.patx-gps-compact:last-child'),canvas=el?.querySelector('[data-gps-hover-map]');if(canvas)requestAnimationFrame(()=>drawHeatmap(canvas,fromSupabaseRow(row)));return el;
}

export async function loadMatchGpsRows(sb,matchId){const{data,error}=await sb.from('match_player_gps').select('*').eq('match_id',matchId);if(error)throw error;return data||[]}

export function indexGpsRows(rows){return Object.fromEntries((rows||[]).map(r=>[String(r.player_id),r]))}
