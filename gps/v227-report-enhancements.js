import{buildFieldTransform}from'./field-transform.js';
import{buildFatigueProfile}from'./fatigue-profile.js';

const MARK='PATX_GPS_REPORT_V228';
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

function recoveryDrop(e){
  const start=Number(e?.startHr??e?.fromHr??e?.peakHr),end=Number(e?.endHr??e?.toHr??e?.lowHr);
  const drop=Number(e?.dropBpm??e?.drop??(start-end));
  return Number.isFinite(drop)?drop:0;
}

function enhanceIntensity(a){
  const table=document.querySelector('.patx-gps-zone-table');if(!table||table.dataset.v228)return;
  table.dataset.v228='1';table.classList.add('v225-intensity-table','v228-colored-bars');
  const zones=a?.analysisDetail?.speed?.zones||a?.speedZones||[];
  const heading=document.createElement('div');heading.className='v225-intensity-heading';heading.innerHTML='<strong>DISTANCIA POR INTENSIDAD</strong><span>Cada color representa una banda de velocidad distinta. Las bandas son absolutas y comunes para poder comparar jugadores.</span>';
  table.before(heading);
  [...table.querySelectorAll('.patx-gps-zone-row')].forEach((row,i)=>{
    const z=zones[i],d=Number(z?.distanceM);const b=row.querySelector('b');
    if(b&&Number.isFinite(d))b.textContent=d<1000?`${Math.round(d)} m`:`${(d/1000).toFixed(2)} km`;
    const min=Number(z?.min),max=Number(z?.max);
    if(Number.isFinite(min)){
      row.title=Number.isFinite(max)?`${min.toFixed(min%1?1:0)}–${max.toFixed(max%1?1:0)} km/h`:`≥${min.toFixed(min%1?1:0)} km/h`;
    }
  });
}

function enhanceHeartRate(a){
  if(!a?.hasHr)return;
  const hrSection=[...document.querySelectorAll('.patx-gps-section')].find(s=>/FRECUENCIA CARDÍACA/i.test(s.textContent||''));
  if(!hrSection||hrSection.querySelector('.v225-hr-recovery'))return;
  const events=recoveryEvents(a),storedSummary=a?.analysisDetail?.heartRate?.recoverySummary||{};
  const avgDrop=events.length?events.reduce((n,e)=>n+recoveryDrop(e),0)/events.length:null;
  const best=events.length?Math.max(...events.map(recoveryDrop)):null;
  const box=document.createElement('div');box.className='v225-hr-recovery';
  if(!events.length){
    box.innerHTML='<div class="patx-gps-section-head"><span>RECUPERACIÓN FC</span><h4>Ventanas de recuperación</h4></div><p class="patx-gps-note">No se detectaron descensos de pulso suficientemente claros en este registro.</p>';
    hrSection.appendChild(box);return;
  }

  const topEvents=events.slice().sort((a,b)=>{
    const dropDiff=recoveryDrop(b)-recoveryDrop(a);
    if(dropDiff)return dropDiff;
    const ad=Number(a?.durationS??(Number(a?.endSec)-Number(a?.startSec)))||999;
    const bd=Number(b?.durationS??(Number(b?.endSec)-Number(b?.startSec)))||999;
    return ad-bd;
  }).slice(0,10);

  box.innerHTML=`<div class="patx-gps-section-head"><span>RECUPERACIÓN FC</span><h4>Ventanas de recuperación</h4></div>
    <div class="v225-recovery-summary">
      <div class="v225-recovery-pill"><span>Detectadas</span><strong>${events.length}</strong></div>
      <div class="v225-recovery-pill"><span>Caída media</span><strong>↓${Math.round(finite(storedSummary.avgDropBpm)?storedSummary.avgDropBpm:avgDrop)} ppm</strong></div>
      <div class="v225-recovery-pill"><span>Mejor caída</span><strong>↓${Math.round(finite(storedSummary.bestDropBpm)?storedSummary.bestDropBpm:best)} ppm</strong></div>
    </div>
    <div class="v228-recovery-caption">Las ${topEvents.length} recuperaciones más llamativas, ordenadas por caída de pulsaciones.</div>
    <div class="v225-recovery-list">${topEvents.map((e,i)=>{
      const start=Number(e.startHr??e.fromHr??e.peakHr),end=Number(e.endHr??e.toHr??e.lowHr),drop=recoveryDrop(e),dur=Number(e.durationS??(Number(e.endSec)-Number(e.startSec)));
      return `<div class="v225-recovery-row"><strong>#${i+1} · ${fmtClock(e.startSec??e.tSec)}</strong><span class="v225-drop">↓${Math.round(drop)} ppm</span><span class="v225-hr-pair">${finite(start)&&finite(end)?`${Math.round(start)} → ${Math.round(end)} ppm`:'descenso de pulso'}</span><span class="v225-duration">${finite(dur)?`${Math.round(dur)} s`:''}</span></div>`;
    }).join('')}</div>
    <p class="patx-gps-note">Se muestran solo las 10 mayores caídas de FC para evitar una lista interminable. Detecta descensos claros después de un esfuerzo al entrar en una fase de menor intensidad. No sustituye una prueba clínica de recuperación.</p>`;
  hrSection.appendChild(box);
}

function fatigueMetricChoice(f){
  const windows=f?.windows||[],base=f?.baseline||{};
  const usable=(key)=>finite(base[key])&&Number(base[key])>0&&windows.filter(w=>finite(w?.[key])).length>=Math.max(3,Math.ceil(windows.length*.5));
  if(usable('sprintDensityPer10Min'))return{key:'sprintDensityPer10Min',label:'Frecuencia de sprints',short:'SPRINTS',unit:'/10 min',format:v=>`${Number(v).toFixed(1)} /10 min`};
  if(usable('sprintPeakAvg'))return{key:'sprintPeakAvg',label:'Punta media de sprint',short:'PUNTA',unit:'km/h',format:v=>`${Number(v).toFixed(1)} km/h`};
  return{key:'speedP99',label:'Punta de velocidad P99',short:'P99',unit:'km/h',format:v=>`${Number(v).toFixed(1)} km/h`};
}

function enhanceFatigue(a){
  const speed=a?.analysisDetail?.speed||{},profile=buildFatigueProfile(speed,a?.durationS);
  if(!profile?.available)return;
  const section=[...document.querySelectorAll('.patx-gps-section')].find(s=>/Intensidad durante los 60 minutos/i.test(s.textContent||''));
  if(!section||section.dataset.v228Fatigue==='1')return;
  section.dataset.v228Fatigue='1';

  const windows=profile.windows||[],base=profile.baseline||{},summary=profile.summary||{};
  if(!windows.length||!finite(base.speedP95)||Number(base.speedP95)<=0)return;

  const second=fatigueMetricChoice(profile);
  const ratios=windows.flatMap(w=>{
    const a1=finite(w.speedP95)?Number(w.speedP95)/Number(base.speedP95):null;
    const a2=finite(w[second.key])&&finite(base[second.key])&&Number(base[second.key])>0?Number(w[second.key])/Number(base[second.key]):null;
    return [a1,a2].filter(Number.isFinite);
  });
  const maxRatio=Math.max(1.2,Math.min(1.8,Math.ceil((Math.max(1,...ratios)*100)/10)*.1));
  const baselineHeight=100/maxRatio;
  const retention=finite(summary.retention)?Math.round(Number(summary.retention)*100):null;

  const groups=windows.map(w=>{
    const r1=finite(w.speedP95)?Number(w.speedP95)/Number(base.speedP95):null;
    const r2=finite(w[second.key])&&finite(base[second.key])&&Number(base[second.key])>0?Number(w[second.key])/Number(base[second.key]):null;
    const h1=finite(r1)?Math.max(2,Math.min(100,Number(r1)/maxRatio*100)):0;
    const h2=finite(r2)?Math.max(2,Math.min(100,Number(r2)/maxRatio*100)):0;
    const p1=finite(r1)?Math.round(Number(r1)*100):null,p2=finite(r2)?Math.round(Number(r2)*100):null;
    return `<div class="v228-fatigue-group">
      <div class="v228-fatigue-bars">
        <div class="v228-fatigue-bar speed" style="height:${h1}%" title="Velocidad alta P95: ${finite(w.speedP95)?Number(w.speedP95).toFixed(1)+' km/h':'—'} · ${p1==null?'—':p1+'% del inicio'}"><span>${p1==null?'—':p1+'%'}</span></div>
        <div class="v228-fatigue-bar effort" style="height:${h2}%" title="${second.label}: ${finite(w[second.key])?second.format(w[second.key]):'—'} · ${p2==null?'—':p2+'% del inicio'}"><span>${p2==null?'—':p2+'%'}</span></div>
      </div>
      <strong>${fmtClock(w.startSec)}<br>–${fmtClock(w.endSec)}</strong>
    </div>`;
  }).join('');

  const notes=(summary.notes||[]).slice(0,4).map(n=>`<li>${esc(n)}</li>`).join('');
  section.innerHTML=`<div class="patx-gps-section-head"><span>RESPUESTA FÍSICA</span><h4>Intensidad durante los 60 minutos</h4></div>
    <div class="v228-fatigue-top">
      <strong>${esc(summary.label||'Evolución de intensidad')}</strong>
      ${retention!=null?`<span>retención global ${retention}%</span>`:''}
    </div>
    <p class="v228-fatigue-explainer"><b>Cómo leerlo:</b> cada pareja de barras es una ventana del partido. <b>100%</b> es el nivel de referencia del tramo inicial. Por debajo de 100% significa que ese indicador baja respecto al inicio; por encima, que aumenta.</p>
    <div class="v228-fatigue-legend">
      <span><i class="speed"></i>Velocidad alta (P95)</span>
      <span><i class="effort"></i>${esc(second.label)}</span>
    </div>
    <div class="v228-fatigue-chart-scroll">
      <div class="v228-fatigue-chart" style="--baseline:${baselineHeight}%">
        <div class="v228-fatigue-groups"><div class="v228-fatigue-baseline"><span>100% nivel inicial</span></div>${groups}</div>
      </div>
    </div>
    ${notes?`<ul class="patx-gps-notes">${notes}</ul>`:''}
    <p class="patx-gps-note">Las ventanas duran aproximadamente ${Math.round(Number(profile.windowS||0)/60)} minutos y avanzan cada ${Math.round(Number(profile.stepS||0)/60)} minutos, por eso se solapan. El objetivo es ver la tendencia del propio jugador a lo largo del partido, no comparar jugadores entre sí.</p>`;
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

function lockLeafletMap(map){
  try{map.dragging?.disable()}catch{}
  try{map.touchZoom?.disable()}catch{}
  try{map.doubleClickZoom?.disable()}catch{}
  try{map.scrollWheelZoom?.disable()}catch{}
  try{map.boxZoom?.disable()}catch{}
  try{map.keyboard?.disable()}catch{}
  if(map.tap)try{map.tap.disable()}catch{}
}

async function enhanceRealPitch(a){
  const old=document.querySelector('.v225-real-pitch');if(old)old.remove();if(mapInstance){try{mapInstance.remove()}catch{}mapInstance=null}
  const token=++renderToken,pos=a?.analysisDetail?.positional||{},trail=(a?.trail||[]).filter(p=>finite(p?.u)&&finite(p?.v));
  if(!pos.fieldCalibrated||trail.length<2)return;
  const anchor=document.querySelector('.patx-gps-map-grid');if(!anchor)return;
  const section=document.createElement('section');section.className='patx-gps-section patx-gps-wide v225-real-pitch';section.innerHTML='<div class="v225-real-pitch-head"><div><div class="patx-gps-section-head"><span>CAMPO REAL</span><h4>Recorrido sobre imagen satélite</h4></div><span>Vista fija: el mapa no hace zoom ni se desplaza, así el scroll de la página funciona con normalidad.</span></div></div><div class="v225-real-pitch-status">Preparando vista del campo real…</div>';
  anchor.after(section);
  try{
    const pitch=await resolvePitch(a);if(token!==renderToken)return;if(!pitch)throw new Error('No se ha podido resolver la calibración usada por este informe.');
    const tf=buildFieldTransform(pitch.corners);if(!tf?.unproject)throw new Error('La transformación inversa del campo no está disponible.');
    const route=trail.map(p=>tf.unproject(Number(p.u),Number(p.v))).filter(p=>finite(p?.lat)&&finite(p?.lon));if(route.length<2)throw new Error('El recorrido normalizado no se puede reconstruir.');
    const L=await loadLeaflet();if(token!==renderToken)return;
    section.querySelector('.v225-real-pitch-status').outerHTML='<div class="v225-real-pitch-map" data-v225-real-pitch-map></div><p class="v225-real-pitch-note">🔒 Vista bloqueada · puedes hacer scroll sobre el mapa sin activar zoom. Privacidad: esta vista se calcula en memoria y no guarda nuevas coordenadas GPS crudas en Supabase.</p>';
    const el=section.querySelector('[data-v225-real-pitch-map]');
    const sat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:20,attribution:'Tiles © Esri'}),osm=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:21,attribution:'© OpenStreetMap contributors'});
    mapInstance=L.map(el,{layers:[sat],zoomControl:false,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,boxZoom:false,keyboard:false,touchZoom:false});
    L.control.layers({'Satélite':sat,'Mapa':osm},null,{collapsed:false}).addTo(mapInstance);
    const field=pitch.corners.map(c=>[Number(c.lat),Number(c.lon)]),line=route.map(p=>[p.lat,p.lon]);
    L.polygon(field,{color:'#f1e75b',weight:2,fillColor:'#f1e75b',fillOpacity:.06,interactive:false}).addTo(mapInstance);
    L.polyline(line,{color:'#ffdf56',weight:3,opacity:.9,interactive:false}).addTo(mapInstance);
    L.circleMarker(line[0],{radius:6,color:'#fff',weight:2,fillColor:'#5a63ff',fillOpacity:1,interactive:false}).addTo(mapInstance);
    L.circleMarker(line.at(-1),{radius:6,color:'#fff',weight:2,fillColor:'#ff8a2a',fillOpacity:1,interactive:false}).addTo(mapInstance);
    mapInstance.fitBounds(L.latLngBounds(field),{padding:[24,24],maxZoom:20});
    lockLeafletMap(mapInstance);
    setTimeout(()=>{mapInstance?.invalidateSize();if(mapInstance)lockLeafletMap(mapInstance)},80);
  }catch(err){console.warn('[GPS v228 campo real]',err);const status=section.querySelector('.v225-real-pitch-status');if(status)status.textContent='Campo real no disponible: '+(err?.message||err)}
}

function enhance(a){
  if(!a)return;
  enhanceIntensity(a);
  enhanceHeartRate(a);
  enhanceFatigue(a);
  enhanceRealPitch(a);
}
window.addEventListener('patx-gps-analysis-updated',()=>requestAnimationFrame(()=>enhance(window.__patxGpsAnalysis)));
if(window.__patxGpsAnalysis)requestAnimationFrame(()=>enhance(window.__patxGpsAnalysis));
window.__PATX_GPS_REPORT_V228=MARK;
