(()=>{
  const SB_URL='https://cnnhstlguewrxjihhlqc.supabase.co';
  const SB_KEY='sb_publishable_uWEwYEMkAe3YkeAzX7ACAg_0aEYHmM6';
  const W=1680,H=720;
  let busy=false;
  let mountedKey='';

  const finite=v=>Number.isFinite(Number(v));
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  function getSb(){
    if(window.__patxGpsSupabase)return window.__patxGpsSupabase;
    if(window.supabase?.createClient){
      window.__patxGpsSupabase=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
      return window.__patxGpsSupabase;
    }
    return null;
  }

  function getAnalysis(){return window.__patxGpsAnalysis||null}

  function parseCorners(raw){
    let arr=raw;
    if(typeof arr==='string'){
      try{arr=JSON.parse(arr)}catch(e){return []}
    }
    if(!Array.isArray(arr))return [];
    return arr.map(p=>{
      const lat=Number(p?.lat??p?.latitude);
      const lng=Number(p?.lng??p?.lon??p?.longitude);
      return finite(lat)&&finite(lng)?{lat,lng}:null;
    }).filter(Boolean).slice(0,4);
  }

  function paddedBbox(corners){
    const lats=corners.map(p=>p.lat),lngs=corners.map(p=>p.lng);
    let minLat=Math.min(...lats),maxLat=Math.max(...lats);
    let minLng=Math.min(...lngs),maxLng=Math.max(...lngs);
    const midLat=(minLat+maxLat)/2;
    const cos=Math.max(.2,Math.cos(midLat*Math.PI/180));
    let latSpan=Math.max(1e-6,maxLat-minLat);
    let lngSpan=Math.max(1e-6,maxLng-minLng);
    const desired=21/9;
    const current=(lngSpan*cos)/latSpan;

    if(current<desired){
      const targetLng=latSpan*desired/cos;
      const extra=(targetLng-lngSpan)/2;
      minLng-=extra;maxLng+=extra;
    }else{
      const targetLat=lngSpan*cos/desired;
      const extra=(targetLat-latSpan)/2;
      minLat-=extra;maxLat+=extra;
    }

    latSpan=maxLat-minLat;lngSpan=maxLng-minLng;
    minLat-=latSpan*.14;maxLat+=latSpan*.14;
    minLng-=lngSpan*.14;maxLng+=lngSpan*.14;
    return {minLat,maxLat,minLng,maxLng};
  }

  function satelliteUrls(b){
    const bbox=`${b.minLng},${b.minLat},${b.maxLng},${b.maxLat}`;
    const qs=`bbox=${encodeURIComponent(bbox)}&bboxSR=4326&imageSR=4326&size=${W},${H}&format=png32&transparent=false&f=image`;
    return [
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?${qs}`,
      `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?${qs}`
    ];
  }

  function bilerp(c,u,v){
    const [tl,tr,br,bl]=c;
    const topLat=tl.lat+(tr.lat-tl.lat)*u;
    const topLng=tl.lng+(tr.lng-tl.lng)*u;
    const botLat=bl.lat+(br.lat-bl.lat)*u;
    const botLng=bl.lng+(br.lng-bl.lng)*u;
    return {lat:topLat+(botLat-topLat)*v,lng:topLng+(botLng-topLng)*v};
  }

  function routeGeo(corners,analysis){
    const trail=Array.isArray(analysis?.trail)?analysis.trail:[];
    return trail.map(p=>{
      const u=clamp(Number(p?.u)||0,0,1);
      const v=clamp(Number(p?.v)||0,0,1);
      return bilerp(corners,u,v);
    });
  }

  function project(p,b){
    return {
      x:(p.lng-b.minLng)/(b.maxLng-b.minLng)*W,
      y:(b.maxLat-p.lat)/(b.maxLat-b.minLat)*H
    };
  }

  function section(){
    const panel=document.querySelector('.patx-gps-panel');
    if(!panel)return null;
    let s=panel.querySelector('.patx-v198-terrain');
    if(!s){
      s=document.createElement('section');
      s.className='patx-v198-terrain';
      const admin=panel.querySelector('.patx-gps-admin-zone');
      if(admin)panel.insertBefore(s,admin);else panel.appendChild(s);
    }
    return s;
  }

  function routeSvg(route,bbox){
    if(route.length<2)return '';
    const pts=route.map(p=>project(p,bbox));
    const d=pts.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const start=pts[0],end=pts[pts.length-1];
    return `
      <svg class="patx-v217-terrain-overlay" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <filter id="patxRouteShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000" flood-opacity=".8"/>
          </filter>
        </defs>
        <path class="patx-v217-route-shadow" d="${d}"/>
        <path class="patx-v217-route" d="${d}" filter="url(#patxRouteShadow)"/>
        <circle class="patx-v217-route-start" cx="${start.x.toFixed(1)}" cy="${start.y.toFixed(1)}" r="8"/>
        <circle class="patx-v217-route-end" cx="${end.x.toFixed(1)}" cy="${end.y.toFixed(1)}" r="8"/>
      </svg>`;
  }

  function dispatchReady(ok,error=''){
    window.dispatchEvent(new CustomEvent('patx-gps-terrain-ready',{detail:{ok,error}}));
  }

  function loadSatellite(img,urls,index=0){
    return new Promise((resolve,reject)=>{
      if(index>=urls.length){reject(new Error('No se pudo cargar la vista satélite'));return}
      img.onload=()=>resolve(urls[index]);
      img.onerror=()=>loadSatellite(img,urls,index+1).then(resolve,reject);
      img.referrerPolicy='no-referrer';
      img.src=urls[index];
    });
  }

  async function mount(){
    const analysis=getAnalysis();
    const s=section();
    if(!analysis||!s||busy)return;

    const pitchId=Number(analysis?.analysisDetail?.positional?.pitchId||analysis?.pitchId||1);
    const key=`${pitchId}:${analysis?.trail?.length||0}:${analysis?.analysisDetail?.positional?.attackDirection||1}`;
    if(mountedKey===key&&s.dataset.v217Terrain==='ready')return;

    busy=true;
    s.dataset.v217Terrain='loading';
    s.innerHTML=`
      <div class="patx-v217-terrain-head">
        <div>
          <div class="patx-v198-terrain-title">Sobre el terreno real</div>
          <div class="patx-v217-terrain-subtitle">Vista satélite del campo calibrado + recorrido GPS</div>
        </div>
        <span class="patx-v217-terrain-status">Preparando mapa…</span>
      </div>
      <div class="patx-v217-terrain-frame">
        <div class="patx-v217-terrain-placeholder">Cargando vista satélite…</div>
      </div>`;

    try{
      const sb=getSb();
      if(!sb)throw new Error('Supabase no disponible');
      const {data:pitch,error}=await sb.from('gps_pitches').select('id,name,corners').eq('id',pitchId).maybeSingle();
      if(error||!pitch)throw error||new Error('Campo no encontrado');

      const corners=parseCorners(pitch.corners);
      if(corners.length!==4)throw new Error('El campo calibrado no tiene cuatro esquinas válidas');

      const bbox=paddedBbox(corners);
      const route=routeGeo(corners,analysis);
      const frame=s.querySelector('.patx-v217-terrain-frame');
      frame.innerHTML=`<img class="patx-v217-terrain-image" alt="Vista satélite del campo calibrado">${routeSvg(route,bbox)}`;
      const img=frame.querySelector('.patx-v217-terrain-image');

      await loadSatellite(img,satelliteUrls(bbox));
      s.dataset.v217Terrain='ready';
      mountedKey=key;
      const status=s.querySelector('.patx-v217-terrain-status');
      if(status)status.textContent=pitch.name||'Campo calibrado';
      dispatchReady(true);
    }catch(err){
      console.error('[terreno real v217]',err);
      s.dataset.v217Terrain='error';
      const status=s.querySelector('.patx-v217-terrain-status');
      if(status)status.textContent='Mapa no disponible';
      const frame=s.querySelector('.patx-v217-terrain-frame');
      if(frame)frame.innerHTML=`<div class="patx-v217-terrain-error"><strong>No se pudo cargar la vista satélite.</strong><span>${String(err?.message||'Error desconocido')}</span></div>`;
      dispatchReady(false,String(err?.message||err));
    }finally{
      busy=false;
    }
  }

  window.addEventListener('patx-gps-analysis-updated',()=>setTimeout(mount,0));
  const obs=new MutationObserver(()=>requestAnimationFrame(mount));
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(mount,0);
  setTimeout(mount,250);
  setTimeout(mount,900);
})();
