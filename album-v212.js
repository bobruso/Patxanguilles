
(()=>{
  const phrases=[
    'Esperando a que el fotógrafo deje de pedir una última toma.',
    'Revelando cromos como si 1994 no hubiera terminado.',
    'Ordenando cartas, egos y dorsales.',
    'Buscando el lado bueno de los veteranos. Seguimos buscando.',
    'Comprobando que nadie haya salido con los ojos cerrados.',
    'Aplicando barniz de leyenda a rodillas de segunda mano.',
    'Preparando un álbum que cotizará fuerte en Wallapop.',
    'Retocando la sesión de fotos sin borrar las ojeras históricas.',
    'Convenciendo a la imprenta de que esto sigue siendo alta competición.'
  ];

  let loaderTimer=null;
  let phraseIndex=Math.floor(Math.random()*phrases.length);
  let mobileZoom=1,panX=0,panY=0;
  let oneStart=null,pinchStart=null,lastMovedAt=0;

  function ensureLoader(){
    let el=document.getElementById('albumV212Loader');
    if(el)return el;
    el=document.createElement('div');
    el.id='albumV212Loader';
    el.className='album-v212-loader show';
    el.innerHTML=`
      <div class="album-v212-loader-inner">
        <div class="album-v212-spinner"></div>
        <h3>PREPARANDO EL ÁLBUM...</h3>
        <p id="albumV212Phrase"></p>
      </div>
    `;
    document.body.appendChild(el);
    return el;
  }

  function setPhrase(){
    const p=document.getElementById('albumV212Phrase');
    if(p)p.textContent=phrases[phraseIndex++%phrases.length];
  }

  function showLoader(){
    const el=ensureLoader();
    setPhrase();
    el.classList.add('show');
    clearInterval(loaderTimer);
    loaderTimer=setInterval(setPhrase,1700);
  }

  function hideLoader(){
    const el=ensureLoader();
    clearInterval(loaderTimer);loaderTimer=null;
    requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.remove('show')));
  }

  function parseBgUrl(value){
    const m=String(value||'').match(/url\(["']?(.*?)["']?\)/i);
    return m?m[1]:'';
  }

  function preload(src){
    return new Promise(resolve=>{
      if(!src)return resolve();
      const img=new Image();
      img.onload=img.onerror=()=>resolve();
      img.src=src;
    });
  }

  async function waitCurrentPage(){
    const deadline=Date.now()+12000;
    let page=null;
    while(Date.now()<deadline){
      page=document.getElementById('page');
      if(page&&!page.querySelector('.loading')&&page.style.backgroundImage)break;
      await new Promise(r=>setTimeout(r,80));
    }
    if(!page)return;

    const bg=parseBgUrl(page.style.backgroundImage);
    const imgs=[...page.querySelectorAll('img')];
    await Promise.allSettled([
      preload(bg),
      ...imgs.map(img=>{
        if(img.complete&&img.naturalWidth)return Promise.resolve();
        return new Promise(resolve=>{
          img.addEventListener('load',resolve,{once:true});
          img.addEventListener('error',resolve,{once:true});
          setTimeout(resolve,9000);
        });
      })
    ]);
  }

  function isMobile(){return matchMedia('(max-width:700px)').matches}
  function stage(){return document.getElementById('stage')}
  function viewport(){return document.getElementById('pageViewport')}

  function clampPan(){
    if(!isMobile())return;
    const st=stage(),vp=viewport();
    if(!st||!vp)return;
    const baseW=vp.offsetWidth||1,baseH=vp.offsetHeight||1;
    const sw=st.clientWidth||1,sh=st.clientHeight||1;
    const scaledW=baseW*mobileZoom,scaledH=baseH*mobileZoom;
    const maxX=Math.max(0,(scaledW-sw)/2+18);
    const maxUp=Math.max(0,scaledH-sh+24);
    panX=Math.max(-maxX,Math.min(maxX,panX));
    panY=Math.max(-maxUp,Math.min(20,panY));
  }

  function applyTransform(){
    const vp=viewport();
    if(!vp)return;
    if(isMobile()){
      clampPan();
      vp.style.transform=`translate3d(${panX}px,${panY}px,0) scale(${mobileZoom})`;
    }
  }

  function resetMobileView(){
    mobileZoom=1;panX=0;panY=0;applyTransform();
  }

  function setMobileZoom(value){
    mobileZoom=Math.max(.7,Math.min(3,Math.round(Number(value)*100)/100));
    applyTransform();
  }

  function cloneStageWithoutOldTouchListeners(){
    const old=stage();
    if(!old||old.dataset.v212Stage==='1')return old;
    const fresh=old.cloneNode(true);
    fresh.dataset.v212Stage='1';
    old.replaceWith(fresh);
    return fresh;
  }

  function bindMobileViewer(){
    const st=cloneStageWithoutOldTouchListeners();
    if(!st)return;

    st.addEventListener('touchstart',e=>{
      if(!isMobile())return;
      if(e.touches.length===1){
        oneStart={
          x:e.touches[0].clientX,
          y:e.touches[0].clientY,
          panX,panY,moved:false
        };
        pinchStart=null;
      }else if(e.touches.length===2){
        const a=e.touches[0],b=e.touches[1];
        const mid={x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2};
        pinchStart={
          distance:Math.hypot(b.clientX-a.clientX,b.clientY-a.clientY),
          zoom:mobileZoom,
          mid,
          panX,panY
        };
        oneStart=null;
        e.preventDefault();
      }
    },{passive:false});

    st.addEventListener('touchmove',e=>{
      if(!isMobile())return;

      if(e.touches.length===1&&oneStart){
        const x=e.touches[0].clientX,y=e.touches[0].clientY;
        const dx=x-oneStart.x,dy=y-oneStart.y;
        if(Math.hypot(dx,dy)>4)oneStart.moved=true;
        panX=oneStart.panX+dx;
        panY=oneStart.panY+dy;
        applyTransform();
        if(oneStart.moved){
          lastMovedAt=Date.now();
          e.preventDefault();
        }
        return;
      }

      if(e.touches.length===2&&pinchStart){
        const a=e.touches[0],b=e.touches[1];
        const dist=Math.hypot(b.clientX-a.clientX,b.clientY-a.clientY);
        const mid={x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2};
        const next=pinchStart.zoom*(dist/Math.max(1,pinchStart.distance));
        mobileZoom=Math.max(.7,Math.min(3,next));
        panX=pinchStart.panX+(mid.x-pinchStart.mid.x);
        panY=pinchStart.panY+(mid.y-pinchStart.mid.y);
        lastMovedAt=Date.now();
        applyTransform();
        e.preventDefault();
      }
    },{passive:false});

    st.addEventListener('touchend',e=>{
      if(e.touches.length===0){oneStart=null;pinchStart=null}
      else if(e.touches.length===1&&pinchStart){
        oneStart={x:e.touches[0].clientX,y:e.touches[0].clientY,panX,panY,moved:false};
        pinchStart=null;
      }
    },{passive:true});

    // Evita abrir una carta si el gesto fue un arrastre.
    st.addEventListener('click',e=>{
      if(Date.now()-lastMovedAt<260&&e.target.closest('.slot')){
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },true);

    // Arrastre con ratón se conserva también en escritorio.
    let dragging=false,sx=0,sy=0,sl=0,stp=0;
    st.addEventListener('mousedown',e=>{
      if(isMobile()||e.button!==0||e.target.closest('button,a,.slot'))return;
      dragging=true;sx=e.clientX;sy=e.clientY;sl=st.scrollLeft;stp=st.scrollTop;
      st.classList.add('is-dragging');e.preventDefault();
    });
    document.addEventListener('mousemove',e=>{
      if(!dragging)return;
      st.scrollLeft=sl-(e.clientX-sx);
      st.scrollTop=stp-(e.clientY-sy);
    });
    document.addEventListener('mouseup',()=>{
      if(!dragging)return;
      dragging=false;st.classList.remove('is-dragging');
    });
  }

  const oldZoomBy=window.zoomBy;
  window.zoomBy=function(delta){
    if(isMobile())setMobileZoom(mobileZoom+Number(delta||0));
    else if(typeof oldZoomBy==='function')oldZoomBy(delta);
  };

  const oldToggleFit=window.toggleFitMode;
  window.toggleFitMode=function(){
    if(!isMobile()){
      if(typeof oldToggleFit==='function')return oldToggleFit();
      return;
    }
    const widthMode=document.body.classList.contains('fit-width');
    document.body.classList.toggle('fit-width',!widthMode);
    document.body.classList.toggle('fit-height',widthMode);
    resetMobileView();
    const btn=document.getElementById('fitToggle');
    if(btn)btn.textContent=`Ajustar vista · ${!widthMode?'Ancho':'Alto'}`;
  };

  if(typeof window.changePage==='function'){
    const oldChangePage=window.changePage;
    window.changePage=function(delta){
      showLoader();
      const r=oldChangePage.apply(this,arguments);
      resetMobileView();
      waitCurrentPage().finally(hideLoader);
      return r;
    };
  }

  showLoader();
  bindMobileViewer();
  waitCurrentPage().finally(hideLoader);

  window.addEventListener('resize',()=>{clampPan();applyTransform()});
  window.addEventListener('orientationchange',()=>setTimeout(()=>{clampPan();applyTransform()},120));
})();
