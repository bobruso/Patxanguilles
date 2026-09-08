
(()=>{
  const SB_URL='https://cnnhstlguewrxjihhlqc.supabase.co';
  const SB_KEY='sb_publishable_uWEwYEMkAe3YkeAzX7ACAg_0aEYHmM6';
  let mountedFor=null;
  let busy=false;

  function getSb(){
    if(window.__patxGpsSupabase)return window.__patxGpsSupabase;
    if(window.supabase?.createClient)return window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:false}});
    return null;
  }

  function analysis(){return window.__patxGpsAnalysis||null}
  function finite(v){return Number.isFinite(Number(v))}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v))}

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
    const cos=Math.cos(midLat*Math.PI/180);
    let latSpan=Math.max(1e-6,maxLat-minLat);
    let lngSpan=Math.max(1e-6,maxLng-minLng);
    let meterRatio=(lngSpan*cos)/latSpan;
    const desired=21/9;

    if(meterRatio<desired){
      const targetLng=latSpan*desired/Math.max(.2,cos);
      const extra=(targetLng-lngSpan)/2;
      minLng-=extra;maxLng+=extra;
    }else{
      const targetLat=lngSpan*cos/desired;
      const extra=(targetLat-latSpan)/2;
      minLat-=extra;maxLat+=extra;
    }

    latSpan=maxLat-minLat;lngSpan=maxLng-minLng;
    minLat-=latSpan*.15;maxLat+=latSpan*.15;
    minLng-=lngSpan*.15;maxLng+=lngSpan*.15;
    return {minLat,maxLat,minLng,maxLng};
  }

  function bilerp(c,u,v){
    const [tl,tr,br,bl]=c;
    const topLat=tl.lat+(tr.lat-tl.lat)*u;
    const topLng=tl.lng+(tr.lng-tl.lng)*u;
    const botLat=bl.lat+(br.lat-bl.lat)*u;
    const botLng=bl.lng+(br.lng-bl.lng)*u;
    return {lat:topLat+(botLat-topLat)*v,lng:topLng+(botLng-topLng)*v};
  }

  function routeGeo(corners){
    const a=analysis();
    const trail=Array.isArray(a?.trail)?a.trail:[];
    return trail.map(p=>{
      const u=clamp(Number(p?.u)||0,0,1),v=clamp(Number(p?.v)||0,0,1);
      return bilerp(corners,u,v);
    });
  }

  function satelliteUrls(b){
    const bbox=`${b.minLng},${b.minLat},${b.maxLng},${b.maxLat}`;
    const qs=`bbox=${encodeURIComponent(bbox)}&bboxSR=4326&imageSR=4326&size=1680,720&format=png&transparent=false&f=image`;
    return [
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?${qs}`,
      `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?${qs}`
    ];
  }

  function loadImageAny(urls){
    return new Promise((resolve,reject)=>{
      let i=0;
      const next=()=>{
        if(i>=urls.length)return reject(new Error('No se pudo cargar la vista satélite'));
        const img=new Image();
        img.crossOrigin='anonymous';
        img.onload=()=>resolve(img);
        img.onerror=()=>{i++;next()};
        img.src=urls[i];
      };
      next();
    });
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

  function project(p,b,w,h){
    return {
      x:(p.lng-b.minLng)/(b.maxLng-b.minLng)*w,
      y:(b.maxLat-p.lat)/(b.maxLat-b.minLat)*h
    };
  }

  async function mount(){
    const a=analysis(),s=section();
    if(!a||!s||busy)return;

    const pitchId=Number(a?.analysisDetail?.positional?.pitchId||a?.pitchId||1);
    const key=`${pitchId}:${a?.trail?.length||0}`;
    if(mountedFor===key&&s.dataset.v212Terrain==='1')return;

    busy=true;
    s.dataset.v212Terrain='1';
    s.innerHTML=`
      <div class="patx-v212-terrain-head">
        <div class="patx-v198-terrain-title">Sobre el terreno real</div>
        <span class="patx-v212-terrain-status">Cargando satélite…</span>
      </div>
      <div class="patx-v212-terrain-frame">
        <canvas class="patx-v212-terrain-canvas" width="1680" height="720"></canvas>
      </div>
    `;

    try{
      const sb=getSb();
      if(!sb)throw new Error('Supabase no disponible');
      const {data:pitch,error}=await sb.from('gps_pitches').select('id,name,corners').eq('id',pitchId).maybeSingle();
      if(error||!pitch)throw error||new Error('Campo no encontrado');

      const corners=parseCorners(pitch.corners);
      if(corners.length<4)throw new Error('El campo no tiene cuatro esquinas');
      const bbox=paddedBbox(corners);
      const img=await loadImageAny(satelliteUrls(bbox));

      const canvas=s.querySelector('.patx-v212-terrain-canvas');
      const ctx=canvas.getContext('2d');
      const w=canvas.width,h=canvas.height;
      ctx.clearRect(0,0,w,h);
      ctx.drawImage(img,0,0,w,h);

      // Velo muy suave para que el trazado se lea sin tapar el satélite.
      ctx.fillStyle='rgba(0,0,0,.10)';
      ctx.fillRect(0,0,w,h);

      const route=routeGeo(corners);
      if(route.length>1){
        ctx.lineCap='round';ctx.lineJoin='round';
        ctx.strokeStyle='rgba(255,210,74,.97)';
        ctx.lineWidth=5;
        ctx.shadowColor='rgba(0,0,0,.65)';
        ctx.shadowBlur=5;
        ctx.beginPath();
        route.forEach((p,i)=>{
          const q=project(p,bbox,w,h);
          if(i===0)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);
        });
        ctx.stroke();
        ctx.shadowBlur=0;

        const start=project(route[0],bbox,w,h);
        const end=project(route[route.length-1],bbox,w,h);
        for(const [p,fill] of [[start,'#fff'],[end,'#ffd24a']]){
          ctx.beginPath();ctx.fillStyle=fill;ctx.strokeStyle='#10110f';ctx.lineWidth=2;
          ctx.arc(p.x,p.y,7,0,Math.PI*2);ctx.fill();ctx.stroke();
        }
      }

      const status=s.querySelector('.patx-v212-terrain-status');
      if(status)status.textContent=pitch.name||'Campo calibrado';
      mountedFor=key;
    }catch(err){
      console.error('[terreno real v212]',err);
      const status=s.querySelector('.patx-v212-terrain-status');
      if(status)status.textContent='No se pudo cargar la vista satélite';
      const canvas=s.querySelector('.patx-v212-terrain-canvas');
      if(canvas){
        const ctx=canvas.getContext('2d');
        ctx.fillStyle='#0b120e';ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle='#aeb8b2';ctx.font='600 28px system-ui';ctx.textAlign='center';
        ctx.fillText('No se pudo cargar el mapa satélite',canvas.width/2,canvas.height/2);
      }
    }finally{
      busy=false;
    }
  }

  window.addEventListener('patx-gps-analysis-updated',()=>setTimeout(mount,0));
  const obs=new MutationObserver(()=>requestAnimationFrame(mount));
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(mount,0);setTimeout(mount,350);setTimeout(mount,1100);
})();
