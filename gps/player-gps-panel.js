import{drawAllPitchMaps}from'./pitch-maps.js';

function fmtKm(m){return Number.isFinite(Number(m))?(Number(m)/1000).toFixed(2)+' km':'—'}
function fmtKmh(v){return Number.isFinite(Number(v))?Number(v).toFixed(1)+' km/h':'—'}
function fmtTime(s){if(!Number.isFinite(Number(s)))return'—';const n=Math.max(0,Math.round(Number(s))),m=Math.floor(n/60),sec=n%60;return m+'m '+String(sec).padStart(2,'0')+'s'}

export function playerGpsPanelHtml(analysis,{playerName='',showSave=false}={}){
  const hasHr=analysis?.hasHr;
  return `<section class="patx-gps-panel" data-patx-gps-panel>
    <div class="patx-gps-head">
      <div><div class="patx-gps-kicker">DATOS GPS DEL PARTIDO</div><h3>${escapeHtml(playerName||'Jugador')}</h3></div>
      <div class="patx-gps-head-actions">${showSave?'<button type="button" class="patx-gps-save" data-gps-save>Guardar datos</button>':''}</div>
    </div>
    <div class="patx-gps-stats">
      ${stat('Distancia',fmtKm(analysis?.distanceM),'distancia total')}
      ${stat('Velocidad máxima',fmtKmh(analysis?.topSpeedKmh),'pico suavizado')}
      ${stat('Velocidad media',fmtKmh(analysis?.avgSpeedKmh),'en movimiento')}
      ${stat('Sprints',String(analysis?.sprintCount??'—'),'más de 18 km/h')}
      ${stat('Alta intensidad',fmtKm(analysis?.highIntensityDistanceM),'más de 13 km/h')}
      ${stat('Tiempo en movimiento',fmtTime(analysis?.movingTimeS),'actividad')}
      ${hasHr?stat('FC media',(analysis.avgHr??'—')+' ppm','frecuencia cardíaca'):''}
      ${hasHr?stat('FC máxima',(analysis.maxHr??'—')+' ppm','frecuencia cardíaca'):''}
    </div>
    <div class="patx-gps-map-grid">
      ${mapCard('Mapa de calor','Tiempo acumulado en cada zona','heatmap')}
      ${mapCard('Recorrido','Movement trail durante el partido','trail')}
      ${mapCard('Ocupación por zonas','Porcentaje de tiempo en cada sector','zones')}
    </div>
  </section>`;
}

function stat(label,value,caption){return `<div class="patx-gps-stat"><span>${label}</span><strong>${value}</strong><small>${caption}</small></div>`}
function mapCard(title,caption,key){return `<article class="patx-gps-map-card"><div class="patx-gps-map-title"><strong>${title}</strong><span>${caption}</span></div><div class="patx-gps-canvas-wrap"><canvas data-gps-map="${key}" aria-label="${title}"></canvas></div></article>`}
function escapeHtml(value){return String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]))}

export function mountPlayerGpsPanel(container,analysis,options={}){
  if(!container)return null;
  container.innerHTML=playerGpsPanelHtml(analysis,options);
  const panel=container.querySelector('[data-patx-gps-panel]');
  if(panel)requestAnimationFrame(()=>drawAllPitchMaps(panel,analysis));
  return panel;
}

export function redrawPlayerGpsPanel(panel,analysis){if(panel)drawAllPitchMaps(panel,analysis)}
