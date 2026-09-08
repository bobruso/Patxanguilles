import{drawMovementTrailAtMinute,drawHeatmapAtMinute}from'./pitch-maps.js';

const SUPABASE_URL='https://cnnhstlguewrxjihhlqc.supabase.co';
const SUPABASE_KEY='sb_publishable_uWEwYEMkAe3YkeAzX7ACAg_0aEYHmM6';

function makeTimelineState(kind){
  return {
    kind,
    minute:60,
    playing:false,
    raf:0,
    lastTs:0,
    durationSec:18,
    slider:null,
    play:null,
    label:null
  };
}

const heat=makeTimelineState('heat');
const trail=makeTimelineState('trail');
const terrain=makeTimelineState('terrain');

const terrainMapState={
  map:null,
  line:null,
  dot:null,
  route:[],
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

function stop(state){
  state.playing=false;
  state.lastTs=0;
  if(state.raf)cancelAnimationFrame(state.raf);
  state.raf=0;
  if(state.play)state.play.textContent='▶';
}

function renderState(state){
  const a=analysis();
  if(!a)return;

  if(state.kind==='heat'){
    const canvas=mapCard('mapa de calor')?.querySelector('canvas[data-gps-map="heatmap"]');
    if(canvas)drawHeatmapAtMinute(canvas,a,state.minute);
  }

  if(state.kind==='trail'){
    const canvas=mapCard('recorrido')?.querySelector('canvas[data-gps-map="trail"]');
    if(canvas)drawMovementTrailAtMinute(canvas,a,state.minute);
  }

  if(state.kind==='terrain'){
    updateTerrain();
  }
}

function setMinute(state,value){
  state.minute=clamp(Number(value)||0,0,60);
  if(state.slider)state.slider.value=String(state.minute);
  if(state.label)state.label.textContent=`${Math.round(state.minute)}′`;
  renderState(state);
}

function tick(state,ts){
  if(!state.playing)return;
  if(!state.lastTs)state.lastTs=ts;

  const dt=(ts-state.lastTs)/1000;
  state.lastTs=ts;
  const next=state.minute+(60/state.durationSec)*dt;

  if(next>=60){
    setMinute(state,60);
    stop(state);
    return;
  }

  setMinute(state,next);
  state.raf=requestAnimationFrame(t=>tick(state,t));
}

function togglePlay(state){
  if(state.playing){
    stop(state);
    return;
  }

  if(state.minute>=60)setMinute(state,0);

  state.playing=true;
  state.lastTs=0;
  if(state.play)state.play.textContent='❚❚';
  state.raf=requestAnimationFrame(t=>tick(state,t));
}

function bindTimeline(host,state){
  state.play=host.querySelector('[data-v200-play]');
  state.slider=host.querySelector('[data-v200-slider]');
  state.label=host.querySelector('[data-v200-minute]');

  if(!host.dataset.bound){
    host.dataset.bound='1';

    state.play.addEventListener('click',()=>{
      togglePlay(state);
    });

    state.slider.addEventListener('input',e=>{
      stop(state);
      setMinute(state,e.target.value);
    });
  }

  setMinute(state,state.minute);
}

function timelineHtml(label){
  return `
    <button type="button" class="patx-v200-play" data-v200-play aria-label="Reproducir o pausar ${label}">▶</button>
    <input class="patx-v200-slider" data-v200-slider type="range" min="0" max="60" step="0.25" value="60" aria-label="Minuto de ${label}">
    <strong class="patx-v200-minute" data-v200-minute>60′</strong>
  `;
}

function mountCardTimeline(card,state,label){
  if(!card)return;

  let box=card.querySelector(`.patx-v200-timeline[data-v200-kind="${state.kind}"]`);

  if(!box){
    // limpia controles antiguos de versiones previas
    card.querySelectorAll('.patx-v198-timeline,.patx-v199-timeline').forEach(el=>el.remove());

    box=document.createElement('div');
    box.className='patx-v200-timeline';
    box.dataset.v200Kind=state.kind;
    box.innerHTML=timelineHtml(label);
    card.appendChild(box);
  }

  bindTimeline(box,state);
}

function mountIndependentMapControls(){
  mountCardTimeline(mapCard('mapa de calor'),heat,'mapa de calor');
  mountCardTimeline(mapCard('recorrido'),trail,'recorrido');
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

function trailPoints(){
  const a=analysis();
  return Array.isArray(a?.trail)?a.trail:[];
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
  if(!section){
    section=document.createElement('section');
    section.className='patx-v198-terrain';
    section.innerHTML=`
      <div class="patx-v200-terrain-head">
        <div class="patx-v198-terrain-title">Sobre el terreno real</div>
        <div class="patx-v200-terrain-timeline patx-v200-timeline" data-v200-kind="terrain">
          ${timelineHtml('terreno real')}
        </div>
      </div>
      <div class="patx-v198-terrain-map" data-patx-terrain-map></div>
    `;

    const admin=p.querySelector('.patx-gps-admin-zone');
    if(admin)p.insertBefore(section,admin);
    else p.appendChild(section);
  }else{
    let head=section.querySelector('.patx-v200-terrain-head');

    if(!head){
      const title=section.querySelector('.patx-v198-terrain-title');
      head=document.createElement('div');
      head.className='patx-v200-terrain-head';

      if(title){
        title.parentNode.insertBefore(head,title);
        head.appendChild(title);
      }else{
        section.prepend(head);
      }
    }

    let box=head.querySelector('.patx-v200-terrain-timeline');
    if(!box){
      box=document.createElement('div');
      box.className='patx-v200-terrain-timeline patx-v200-timeline';
      box.dataset.v200Kind='terrain';
      box.innerHTML=timelineHtml('terreno real');
      head.appendChild(box);
    }
  }

  const terrainBox=section.querySelector('.patx-v200-terrain-timeline');
  if(terrainBox)bindTimeline(terrainBox,terrain);

  return section;
}

async function mountTerrain(){
  const a=analysis();
  if(!a||!panel())return;

  const section=terrainSection();
  const host=section?.querySelector('[data-patx-terrain-map]');
  if(!host)return;

  const pitchId=Number(a?.analysisDetail?.positional?.pitchId||a?.pitchId||1);

  if(terrainMapState.map&&terrainMapState.pitchId===pitchId){
    setTimeout(()=>terrainMapState.map.invalidateSize(),50);
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

  if(terrainMapState.map){
    try{terrainMapState.map.remove()}catch(e){}
    terrainMapState.map=null;
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

  terrainMapState.pitchId=pitchId;
  terrainMapState.map=map;
  terrainMapState.route=route;

  const latlngs=route.map(p=>[p.lat,p.lng]);

  terrainMapState.line=L.polyline(latlngs,{
    color:'#ffd24a',
    weight:3,
    opacity:.92,
    lineCap:'round',
    lineJoin:'round'
  }).addTo(map);

  terrainMapState.dot=L.circleMarker(latlngs.at(-1),{
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
  if(!terrainMapState.line||!terrainMapState.dot||!terrainMapState.route.length)return;

  const cap=clamp(Number(terrain.minute)||0,0,60)*60;
  let route=terrainMapState.route.filter(p=>p.tSec==null||p.tSec<=cap);

  if(!route.length)route=[terrainMapState.route[0]];

  const latlngs=route.map(p=>[p.lat,p.lng]);
  terrainMapState.line.setLatLngs(latlngs);
  terrainMapState.dot.setLatLng(latlngs.at(-1));
}

function mount(){
  if(!analysis()||!panel())return;
  mountIndependentMapControls();
  mountTerrain();
}

window.addEventListener('patx-gps-analysis-updated',()=>{
  stop(heat);
  stop(trail);
  stop(terrain);

  heat.minute=60;
  trail.minute=60;
  terrain.minute=60;

  setTimeout(mount,0);
});

window.addEventListener('resize',()=>{
  if(terrainMapState.map)setTimeout(()=>terrainMapState.map.invalidateSize(),60);
});

const observer=new MutationObserver(()=>requestAnimationFrame(mount));
observer.observe(document.documentElement,{childList:true,subtree:true});

setTimeout(mount,0);
setTimeout(mount,300);
setTimeout(mount,900);
