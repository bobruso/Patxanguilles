import{buildFieldTransform}from'./field-transform.js';

const MARK='PATX_GPS_REPORT_V225';
const finite=v=>Number.isFinite(Number(v));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtClock=s=>{const n=Math.max(0,Math.round(Number(s)||0)),m=Math.floor(n/60),sec=n%60;return `${m}:${String(sec).padStart(2,'0')}`};
let leafletPromise=null,mapInstance=null,renderToken=0;

function fallbackRecoveryEvents(a){
  const hr=(a?.analysisDetail?.heartRate?.series||[]).filter(x=>finite(x?.tSec)&&finite(x?.value));
  const sp=(a?.analysisDetail?.speed?.speedSeries||[]).filter(x=>finite(x?.tSec)&&finite(x?.value));
  if(hr.length<4)return[];
  const speedAt=t=>{if(!sp.length)return null;let best=sp[0],d=Math.abs(Number(best.tSec)-t);for(const x of sp){const q=Math.abs(Number(x.tSec)-t);if(q<d){best=x;d=q}}return Number(best.value)};
  const ref=Number(a?.analysisDetail?.heartRate?.referenceMaxBpm)||Number(a?.maxHr)||0,events=[];let lastEnd=-9999;
  for(let i=1;i<hr.length-2;i++){
    const start=hr[i],prev=hr[i-1],next=hr[i+1];
    if(Number(start.tSec)<lastEnd+20)continue;
    if(Number(start.value)<Math.max(115,ref?ref*.68:115))continue;
    if(Number(start.value)<Number(prev.value)||Number(start.value)<Number(next.value))continue;
    let best=null;
    for(let j=i+1;j<hr.length;j++){
      const dt=Number(hr[j].tSec)-Number(start.tSec);if(dt>75)break;if(dt<10)continue;
      const sv=speedAt(Number(hr[j].tSec));
      if(sv!=null&&sv>8.5)continue;
      if(!best||Number(hr[j].value)<Number(best.value))best=hr[j];
    }
    if(!best)continue;
    const drop=Number(start.value)-Number(best.value),duration=Number(best.tSec)-Number(start.tSec);
    if(drop<12||duration<10)continue;
    events.push({startSec:+Number(start.tSec).toFixed(1),endSec:+Number(best.tSec).toFixed(1),durationS:+duration.toFixed(1),startHr:Math.round(Number(start.value)),endHr:Math.round(Number(best.value)),dropBpm:Math.round(drop),source:'downsampled_fallback'});
    lastEnd=Number(best.tSec);
  }
  return events.slice(0,40);
}

function recoveryEvents(a){
  const stored=a?.analysisDetail?.heartRate?.recoveryEvents;
  return Array.isArray(stored)&&stored.length?stored:fallbackRecoveryEvents(a);
}

function enhanceIntensity(a){
  const table=document.querySelector('.patx-gps-zone-table');if(!table||table.dataset.v225)return;
  table.dataset.v225='1';table.classList.add('v225-intensity-table');
  const zones=a?.analysisDetail?.speed?.zones||a?.speedZones||[];
  const heading=document.createElement('div');heading.className='v225-intensity-heading';heading.innerHTML='<strong>DISTANCIA POR INTENSIDAD</strong><span>Bandas absolutas comunes para que la lectura sea comparable entre jugadores.</span>';
  table.before(heading);
  [...table.querySelectorAll('.patx-gps-zone-row')].forEach((row,i)=>{
    const z=zones[i],d=Number(z?.distanceM);const b=row.querySelector('b');
    if(b&&Number.isFinite(d))b.textContent=d<1000?`${Math.round(d)} m`:`${(d/1000).toFixed(2)} km`;
    row.title=i===0?'0–2 km/h':i===1?'2–7 km/h':i===2?'7–13 km/h':i===3?'13–18 km/h':'≥18 km/h';
  });
}

function enhanceHeartRate(a){
  if(!a?.hasHr)return;
  const hrSection=[...document.querySelectorAll('.patx-gps-section')].find(s=>/FRECUENCIA CARDÍACA/i.test(s.textContent||''));
  if(!hrSection||hrSection.querySelector('.v225-hr-recovery'))return;
  const events=recoveryEvents(a),storedSummary=a?.analysisDetail?.heartRate?.recoverySummary||{};
  const avgDrop=events.length?events.reduce((n,e)=>n+Number(e.dropBpm||0),0)/events.length:null;
  const best=events.length?Math.max(...events.map(e=>Number(e.dropBpm)||0)):null;
  const box=document.createElement('div');box.className='v225-hr-recovery';
  if(!events.length){box.innerHTML='<div class="patx-gps-section-head"><span>RECUPERACIÓN FC</span><h4>Ventanas de recuperación</h4></div><p class="patx-gps-note">No se detectaron descensos de pulso suficientemente claros en este registro.</p>';hrSection.appendChild(box);return;}
  box.innerHTML=`<div class="patx-gps-section-head"><span>RECUPERACIÓN FC</span><h4>Ventanas de recuperación</h4></div><div class="v225-recovery-summary"><div class="v225-recovery-pill"><span>Ventanas</span><strong>${events.length}</strong></div><div class="v225-recovery-pill"><span>Caída media</span><strong>↓${Math.round(finite(storedSummary.avgDropBpm)?storedSummary.avgDropBpm:avgDrop)} ppm</strong></div><div class="v225-recovery-pill"><span>Mejor caída</span><strong>↓${Math.round(finite(storedSummary.bestDropBpm)?storedSummary.bestDropBpm:best)} ppm</strong></div></div><div class="v225-recovery-list">${events.slice(0,30).map(e=>{const start=Number(e.startHr??e.fromHr??e.peakHr),end=Number(e.endHr??e.toHr??e.lowHr),drop=Number(e.dropBpm??e.drop??(start-end)),dur=Number(e.durationS??(Number(e.endSec)-Number(e.startSec)));return `<div class="v225-recovery-row"><strong>${fmtClock(e.startSec??e.tSec)}</strong><span class="v225-drop">↓${Math.round(drop)} ppm</span><span class="v225-hr-pair">${finite(start)&&finite(end)?`${Math.round(start)} → ${Math.round(end)} ppm`:'descenso de pulso'}</span><span class="v225-duration">${finite(dur)?`${Math.round(dur)} s`:''}</span></div>`}).join('')}</div><p class="patx-gps-note">Detecta descensos claros de frecuencia cardíaca después de un esfuerzo al entrar en una fase de menor intensidad. No sustituye una prueba clínica de recuperación.</p>`;
  hrSection.appendChild(box);
}

function loadLeaflet(){
  if(window.L?.map)return Promise.resolve(window.L);
  if(leafletPromise)return leafletPromise;
  leafletPromise=new Promise((resolve,reject)=>{
    if(!document.querySelector('link[data-v225-leaflet]')){const l=document.createElement('link');l.rel='stylesheet';l.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';l.dataset.v225Leaflet='1';document.head.appendChild(l)}
    const old=[...document.scripts].find(s=>/leaflet(?:\.min)?\.js/.test(s.src));
    if(old){if(window.L?.map)return resolve(window.L);old.addEventListener('load',()=>resolve(window.L),{once:true});old.addEventListener('error',reject,{once:true});return}
    const s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.async=true;s.onload=()=>resolve(window.L);s.onerror=reject;document.head.appendChild(s);
  });
  return leafletPromise;
}

async function resolvePitch(a){
  const sb=window.__patxGpsSupabase,pos=a?.analysisDetail?.positional||{};if(!sb||!pos.fieldCalibrated)return null;
  if(pos.pitchId){const{data}=await sb.from('gps_pitches').select('*').eq('id',pos.pitchId).maybeSingle();if(data?.corners?.length===4)return data}
  if(pos.pitchName){const{data}=await sb.from('gps_pitches').select('*').eq('name',pos.pitchName).limit(2);const hit=(data||[]).find(p=>Array.isArray(p.corners)&&p.corners.length===4);if(hit)return hit}
  const match=window.__patxGpsMatch,mode=match?.competition==='football7'?'f7':'fs';
  const{data}=await sb.from('gps_pitches').select('*').eq('is_active',true);
  const all=(data||[]).filter(p=>Array.isArray(p.corners)&&p.corners.length===4),same=all.filter(p=>String(p.mode||'').toLowerCase()===mode);
  return same.length===1?same[0]:all.length===1?all[0]:null;
}

async function enhanceRealPitch(a){
  const old=document.querySelector('.v225-real-pitch');if(old)old.remove();if(mapInstance){try{mapInstance.remove()}catch{}mapInstance=null}
  const token=++renderToken,pos=a?.analysisDetail?.positional||{},trail=(a?.trail||[]).filter(p=>finite(p?.u)&&finite(p?.v));
  if(!pos.fieldCalibrated||trail.length<2)return;
  const anchor=document.querySelector('.patx-gps-map-grid');if(!anchor)return;
  const section=document.createElement('section');section.className='patx-gps-section patx-gps-wide v225-real-pitch';section.innerHTML='<div class="v225-real-pitch-head"><div><div class="patx-gps-section-head"><span>CAMPO REAL</span><h4>Recorrido sobre imagen satélite</h4></div><span>Ruta reconstruida a partir de las coordenadas normalizadas guardadas y la calibración del campo.</span></div></div><div class="v225-real-pitch-status">Preparando vista del campo real…</div>';
  anchor.after(section);
  try{
    const pitch=await resolvePitch(a);if(token!==renderToken)return;if(!pitch)throw new Error('No se ha podido resolver la calibración usada por este informe.');
    const tf=buildFieldTransform(pitch.corners);if(!tf?.unproject)throw new Error('La transformación inversa del campo no está disponible.');
    const route=trail.map(p=>tf.unproject(Number(p.u),Number(p.v))).filter(p=>finite(p?.lat)&&finite(p?.lon));if(route.length<2)throw new Error('El recorrido normalizado no se puede reconstruir.');
    const L=await loadLeaflet();if(token!==renderToken)return;
    section.querySelector('.v225-real-pitch-status').outerHTML='<div class="v225-real-pitch-map" data-v225-real-pitch-map></div><p class="v225-real-pitch-note">Privacidad: esta vista se calcula en memoria. No añade ni guarda nuevas coordenadas GPS crudas en Supabase.</p>';
    const el=section.querySelector('[data-v225-real-pitch-map]');
    const sat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:20,attribution:'Tiles © Esri'}),osm=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:21,attribution:'© OpenStreetMap contributors'});
    mapInstance=L.map(el,{layers:[sat],zoomControl:true});L.control.layers({'Satélite':sat,'Mapa':osm},null,{collapsed:false}).addTo(mapInstance);
    const field=pitch.corners.map(c=>[Number(c.lat),Number(c.lon)]),line=route.map(p=>[p.lat,p.lon]);
    L.polygon(field,{color:'#f1e75b',weight:2,fillColor:'#f1e75b',fillOpacity:.06}).addTo(mapInstance);L.polyline(line,{color:'#ffdf56',weight:3,opacity:.9}).addTo(mapInstance);
    L.circleMarker(line[0],{radius:6,color:'#fff',weight:2,fillColor:'#5a63ff',fillOpacity:1}).bindTooltip('Inicio').addTo(mapInstance);L.circleMarker(line.at(-1),{radius:6,color:'#fff',weight:2,fillColor:'#ff8a2a',fillOpacity:1}).bindTooltip('Final').addTo(mapInstance);
    mapInstance.fitBounds(L.latLngBounds(field),{padding:[24,24],maxZoom:20});setTimeout(()=>mapInstance?.invalidateSize(),80);
  }catch(err){console.warn('[GPS v225 campo real]',err);const status=section.querySelector('.v225-real-pitch-status');if(status)status.textContent='Campo real no disponible: '+(err?.message||err)}
}

function enhance(a){if(!a)return;enhanceIntensity(a);enhanceHeartRate(a);enhanceRealPitch(a)}
window.addEventListener('patx-gps-analysis-updated',()=>requestAnimationFrame(()=>enhance(window.__patxGpsAnalysis)));
if(window.__patxGpsAnalysis)requestAnimationFrame(()=>enhance(window.__patxGpsAnalysis));
window.__PATX_GPS_REPORT_V225=MARK;
