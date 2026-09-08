import{drawMovementTrailAtMinute,drawHeatmapAtMinute}from'./pitch-maps.js';

const SUPABASE_URL='https://cnnhstlguewrxjihhlqc.supabase.co';
const SUPABASE_KEY='sb_publishable_uWEwYEMkAe3YkeAzX7ACAg_0aEYHmM6';

const state={
  minute:60,
  playing:false,
  raf:0,
  lastTs:0,
  durationSec:18,
  slider:null,
  play:null,
  label:null,
  trailCanvas:null,
  heatCanvas:null,
  terrainMap:null,
  terrainLine:null,
  terrainDot:null,
  terrainRoute:[],
  pitchId:null
};

function analysis(){return window.__patxGpsAnalysis||null}
function panel(){return document.querySelector('.patx-gps-panel')}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function finite(v){return Number.isFinite(Number(v))}

function mapCardByTitle(label){
  return [...document.querySelectorAll('.patx-gps-map-card')].find(card=>{
    const t=(card.querySelector('.patx-gps-map-title')?.textContent||'').toLowerCase();
    return t.includes(label.toLowerCase());
  })||null;
}

function routeCard(){return mapCardByTitle('recorrido')}
function heatCard(){return mapCardByTitle('mapa de calor')}

function trailPoints(){
  const a=analysis();
  return Array.isArray(a?.trail)?a.trail:[];
}

function drawCurrentFrames(){
  const a=analysis();
  if(!a)return;
  if(state.trailCanvas)drawMovementTrailAtMinute(state.trailCanvas,a,state.minute);
  if(state.heatCanvas)drawHeatmapAtMinute(state.heatCanvas,a,state.minute);
}

function setMinute(value){
  state.minute=clamp(Number(value)||0,0,60);
  if(state.slider)state.slider.value=String(state.minute);
  if(state.label)state.label.textContent=`${Math.round(state.minute)}′`;
  drawCurrentFrames();
  updateTerrain();
}

function stop(){
  state.playing=false;
  state.lastTs=0;
  if(state.raf)cancelAnimationFrame(state.raf);
  state.raf=0;
  if(state.play)state.play.textContent='▶';
}

function tick(ts){
  if(!state.playing)return;
  if(!state.lastTs)state.lastTs=ts;
  const dt=(ts-state.lastTs)/1000;
  state.lastTs=ts;

  const next=state.minute+(60/state.durationSec)*dt;
  if(next>=60){
    setMinute(60);
    stop();
    return;
  }

  setMinute(next);
  state.raf=requestAnimationFrame(tick);
}

function play(){
  if(state.playing){
    stop();
    return;
  }
  if(state.minute>=60)setMinute(0);
  state.playing=true;
  state.lastTs=0;
  if(state.play)state.play.textContent='❚❚';
  state.raf=requestAnimationFrame(tick);
}

function mountControls(){
  const card=routeCard();
  if(!card)return;

  state.trailCanvas=card.querySelector('canvas[data-gps-map="trail"]');
  state.heatCanvas=heatCard()?.querySelector('canvas[data-gps-map="heatmap"]')||null;
  if(!state.trailCanvas)return;

  let box=card.querySelector('.patx-v198-timeline');
  if(!box){
    box=document.createElement('div');
    box.className='patx-v198-timeline';
    box.innerHTML=`
      <button type="button" class="patx-v198-play" aria-label="Reproducir o pausar recorrido">▶</button>
      <input class="patx-v198-slider" type="range" min="0" max="60" step="0.25" value="60" aria-label="Minuto del partido">
      <strong class="patx-v198-minute">60′</strong>
    `;
    card.appendChild(box);
  }

  state.play=box.querySelector('.patx-v198-play');
  state.slider=box.querySelector('.patx-v198-slider');
  state.label=box.querySelector('.patx-v198-minute');

  if(!box.dataset.bound){
    box.dataset.bound='1';
    state.play.addEventListener('click',play);
    state.slider.addEventListener('input',e=>{
      stop();
      setMinute(e.target.value);
    });
  }

  setMinute(state.minute);
}

function ensureLeaflet(){
  if(window.L)return Promise.resolve(window.L);
  if(window.__patxLeafletPromise)return window.__patxLeafletPromise;

  window.__patxLeafletPromise=new Promise((resolve,reject)=>{
    if(!document.querySelector('link[data-patx-leaflet]')){
      const l=document.createElement('link');
      l.rel='stylesheet';
      l.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      l.dataset.patxLeaflet='1';
      document.head.appendChild(l);
    }

    const s=document.createElement('script');
    s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload=()=>resolve(window.L);
    s.onerror=reject;
    document.head.appendChild(s);
  });

  return window.__patxLeafletPromise;
}

function getSb(){
  if(window.__patxGpsSupabase)return window.__patxGpsSupabase;
  if(!window.supabase?.createClient)return null;
  return window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false}});
}

function cornerPoint(p){
  if(!p)return null;
  const lat=Number(p.lat??p.latitude);
  const lng=Number(p.lon??p.lng??p.longitude);
  return finite(lat)&&finite(lng)?{lat,lng}:null;
}

function routeOnEarth(corners){
  const pts=trailPoints();
  if(!pts.length||!Array.isArray(corners)||corners.length<4)return [];

  const c=corners.map(cornerPoint).filter(Boolean);
  if(c.length<4)return [];

  const [tl,tr,br,bl]=c;

  return pts.map(p=>{
    const u=clamp(Number(p.u)||0,0,1);
    const v=clamp(Number(p.v)||0,0,1);

    const topLat=tl.lat+(tr.lat-tl.lat)*u;
    const topLng=tl.lng+(tr.lng-tl.lng)*u;
    const botLat=bl.lat+(br.lat-bl.lat)*u;
    const botLng=bl.lng+(br.lng-bl.lng)*u;

    return {
      lat:topLat+(botLat-topLat)*v,
      lng:topLng+(botLng-topLng)*v,
      tSec:finite(p.tSec)?Number(p.tSec):null
    };
  });
}

function terrainSection(){
  const p=panel();
  if(!p)return null;

  let section=p.querySelector('.patx-v198-terrain');
  if(section)return section;

  section=document.createElement('section');
  section.className='patx-v198-terrain';
  section.innerHTML=`
    <div class="patx-v198-terrain-title">Sobre el terreno real</div>
    <div class="patx-v198-terrain-map" data-patx-terrain-map></div>
  `;

  const admin=p.querySelector('.patx-gps-admin-zone');
  if(admin)p.insertBefore(section,admin);
  else p.appendChild(section);

  return section;
}

async function mountTerrain(){
  const a=analysis();
  const p=panel();
  if(!a||!p)return;

  const section=terrainSection();
  const host=section?.querySelector('[data-patx-terrain-map]');
  if(!host)return;

  const pitchId=Number(a?.analysisDetail?.positional?.pitchId||a?.pitchId||1);

  if(state.terrainMap && state.pitchId===pitchId){
    setTimeout(()=>state.terrainMap.invalidateSize(),50);
    updateTerrain();
    return;
  }

  const sb=getSb();
  if(!sb)return;

  const {data:pitch,error}=await sb
    .from('gps_pitches')
    .select('id,name,corners')
    .eq('id',pitchId)
    .maybeSingle();

  if(error||!pitch?.corners){
    console.warn('[GPS] No se pudo cargar el campo para el mapa real',error);
    return;
  }

  const route=routeOnEarth(pitch.corners);
  if(route.length<2)return;

  const L=await ensureLeaflet().catch(err=>{
    console.warn('[GPS] No se pudo cargar Leaflet',err);
    return null;
  });
  if(!L)return;

  if(state.terrainMap){
    try{state.terrainMap.remove()}catch(e){}
    state.terrainMap=null;
  }

  host.innerHTML='';

  const map=L.map(host,{
    zoomControl:false,
    attributionControl:true,
    scrollWheelZoom:false,
    doubleClickZoom:false,
    boxZoom:false,
    keyboard:false,
    dragging:true,
    touchZoom:true
  });

  L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {maxZoom:20,attribution:'© Esri, Maxar, Earthstar Geographics'}
  ).addTo(map);

  state.pitchId=pitchId;
  state.terrainMap=map;
  state.terrainRoute=route;

  const latlngs=route.map(p=>[p.lat,p.lng]);

  state.terrainLine=L.polyline(latlngs,{
    color:'#ffd24a',
    weight:3,
    opacity:.92,
    lineCap:'round',
    lineJoin:'round'
  }).addTo(map);

  state.terrainDot=L.circleMarker(latlngs.at(-1),{
    radius:4.5,
    color:'#111',
    weight:1.5,
    fillColor:'#ffd24a',
    fillOpacity:1
  }).addTo(map);

  const cornerLatLngs=(pitch.corners||[])
    .map(cornerPoint)
    .filter(Boolean)
    .map(c=>[c.lat,c.lng]);

  const bounds=L.latLngBounds(cornerLatLngs.length?cornerLatLngs:latlngs);
  map.fitBounds(bounds.pad(.18),{animate:false});

  setTimeout(()=>map.invalidateSize(),100);
  updateTerrain();
}

function updateTerrain(){
  if(!state.terrainLine||!state.terrainDot||!state.terrainRoute.length)return;

  const cap=clamp(Number(state.minute)||0,0,60)*60;
  let route=state.terrainRoute.filter(p=>p.tSec==null||p.tSec<=cap);
  if(!route.length)route=[state.terrainRoute[0]];

  const latlngs=route.map(p=>[p.lat,p.lng]);
  state.terrainLine.setLatLngs(latlngs);
  state.terrainDot.setLatLng(latlngs.at(-1));
}

function mount(){
  if(!analysis()||!panel())return;
  mountControls();
  mountTerrain();
}

window.addEventListener('patx-gps-analysis-updated',()=>{
  stop();
  setTimeout(mount,0);
});

window.addEventListener('resize',()=>{
  if(state.terrainMap)setTimeout(()=>state.terrainMap.invalidateSize(),60);
});

const observer=new MutationObserver(()=>requestAnimationFrame(mount));
observer.observe(document.documentElement,{childList:true,subtree:true});

setTimeout(mount,0);
setTimeout(mount,300);
setTimeout(mount,900);
