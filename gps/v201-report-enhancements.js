import{drawMovementTrailAtMinute}from'./pitch-maps.js';

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
  label:null
};

const terrainState={
  map:null,
  line:null,
  pitchId:null
};

function analysis(){return window.__patxGpsAnalysis||null}
function panel(){return document.querySelector('.patx-gps-panel')}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function finite(v){return Number.isFinite(Number(v))}

function mapCard(label){
  return [...document.querySelectorAll('.patx-gps-map-card')].find(card=>{
    const t=(card.querySelector('.patx-gps-map-title')?.textContent||'').toLowerCase();
    return t.includes(label.toLowerCase());
  })||null;
}

function routeCard(){return mapCard('recorrido')}

function stop(){
  state.playing=false;
  state.lastTs=0;
  if(state.raf)cancelAnimationFrame(state.raf);
  state.raf=0;
  if(state.play)state.play.textContent='▶';
}

function drawRoute(){
  const a=analysis();
  const canvas=routeCard()?.querySelector('canvas[data-gps-map="trail"]');
  if(a&&canvas)drawMovementTrailAtMinute(canvas,a,state.minute);
}

function setMinute(value){
  state.minute=clamp(Number(value)||0,0,60);
  if(state.slider)state.slider.value=String(state.minute);
  if(state.label)state.label.textContent=`${Math.round(state.minute)}′`;
  drawRoute();
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

function togglePlay(){
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

function mountRouteControl(){
  const card=routeCard();
  if(!card)return;

  // Elimina controles de versiones anteriores si quedaran en DOM.
  card.querySelectorAll('.patx-v198-timeline,.patx-v199-timeline,.patx-v200-timeline,.patx-v201-timeline')
    .forEach(el=>el.remove());

  const box=document.createElement('div');
  box.className='patx-v201-timeline';
  box.innerHTML=`
    <button type="button" class="patx-v201-play" aria-label="Reproducir o pausar recorrido">▶</button>
    <input class="patx-v201-slider" type="range" min="0" max="60" step="0.25" value="${state.minute}" aria-label="Minuto del recorrido">
    <strong class="patx-v201-minute">${Math.round(state.minute)}′</strong>
  `;

  card.appendChild(box);

  state.play=box.querySelector('.patx-v201-play');
  state.slider=box.querySelector('.patx-v201-slider');
  state.label=box.querySelector('.patx-v201-minute');

  state.play.addEventListener('click',togglePlay);
  state.slider.addEventListener('input',e=>{
    stop();
    setMinute(e.target.value);
  });

  drawRoute();
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
  const pts=Array.isArray(analysis()?.trail)?analysis().trail:[];
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

    return [
      topLat+(botLat-topLat)*v,
      topLng+(botLng-topLng)*v
    ];
  });
}

function terrainSection(){
  const p=panel();
  if(!p)return null;

  let section=p.querySelector('.patx-v198-terrain');

  if(!section){
    section=document.createElement('section');
    section.className='patx-v198-terrain';
    section.innerHTML=`
      <div class="patx-v198-terrain-title">Sobre el terreno real</div>
      <div class="patx-v198-terrain-map" data-patx-terrain-map></div>
    `;

    const admin=p.querySelector('.patx-gps-admin-zone');
    if(admin)p.insertBefore(section,admin);
    else p.appendChild(section);
  }else{
    // Limpia controles temporales del terreno real de v200.
    section.querySelectorAll('.patx-v200-terrain-timeline,.patx-v200-timeline').forEach(el=>el.remove());

    const head=section.querySelector('.patx-v200-terrain-head');
    if(head){
      const title=head.querySelector('.patx-v198-terrain-title');
      if(title)section.insertBefore(title,head);
      head.remove();
    }
  }

  return section;
}

async function mountTerrainStatic(){
  const a=analysis();
  if(!a||!panel())return;

  const section=terrainSection();
  const host=section?.querySelector('[data-patx-terrain-map]');
  if(!host)return;

  const pitchId=Number(a?.analysisDetail?.positional?.pitchId||a?.pitchId||1);

  if(terrainState.map&&terrainState.pitchId===pitchId){
    setTimeout(()=>terrainState.map.invalidateSize(),60);
    return;
  }

  const sb=getSb();
  if(!sb)return;

  const {data:pitch,error}=await sb
    .from('gps_pitches')
    .select('id,name,corners')
    .eq('id',pitchId)
    .maybeSingle();

  if(error||!pitch?.corners)return;

  const route=routeOnEarth(pitch.corners);
  if(route.length<2)return;

  const L=await ensureLeaflet().catch(()=>null);
  if(!L)return;

  if(terrainState.map){
    try{terrainState.map.remove()}catch(e){}
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

  terrainState.pitchId=pitchId;
  terrainState.map=map;

  terrainState.line=L.polyline(route,{
    color:'#ffd24a',
    weight:3,
    opacity:.92,
    lineCap:'round',
    lineJoin:'round'
  }).addTo(map);

  const cornerLatLngs=(pitch.corners||[])
    .map(cornerPoint)
    .filter(Boolean)
    .map(c=>[c.lat,c.lng]);

  const bounds=L.latLngBounds(cornerLatLngs.length?cornerLatLngs:route);
  map.fitBounds(bounds.pad(.18),{animate:false});

  setTimeout(()=>map.invalidateSize(),100);
}

function mount(){
  if(!analysis()||!panel())return;

  // El heatmap vuelve al renderer estático original:
  // no se toca ni se vuelve a dibujar desde este módulo.
  mountRouteControl();
  mountTerrainStatic();
}

let scheduled=false;
const observer=new MutationObserver(()=>{
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{
    scheduled=false;

    // Solo volver a montar si el control de recorrido no existe.
    if(!routeCard()?.querySelector('.patx-v201-timeline'))mount();
  });
});
observer.observe(document.documentElement,{childList:true,subtree:true});

window.addEventListener('patx-gps-analysis-updated',()=>{
  stop();
  state.minute=60;
  setTimeout(mount,0);
});

window.addEventListener('resize',()=>{
  drawRoute();
  if(terrainState.map)setTimeout(()=>terrainState.map.invalidateSize(),60);
});

setTimeout(mount,0);
setTimeout(mount,300);
setTimeout(mount,900);
