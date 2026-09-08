(()=>{
  function panel(){return document.querySelector('.patx-gps-panel')}

  function removeOrigin(){
    const p=panel();
    if(!p)return;
    p.querySelectorAll('.patx-gps-context-badge').forEach(el=>{
      if(/^ORIGEN\s+/i.test((el.textContent||'').trim()))el.remove();
    });
  }

  function arrangeNamePhoto(){
    const p=panel();
    if(!p)return;

    const titleRow=p.querySelector('.patx-gps-title-row');
    if(!titleRow)return;

    const content=[...titleRow.children].find(el=>
      el.tagName!=='BUTTON' &&
      !el.classList.contains('patx-v204-player-photo-wrap') &&
      !el.classList.contains('patx-v205-name-photo-row')
    );
    const h3=content?.querySelector('h3');
    const photo=titleRow.querySelector(':scope > .patx-v204-player-photo-wrap')
      || content?.querySelector('.patx-v204-player-photo-wrap')
      || p.querySelector('.patx-v204-player-photo-wrap');

    if(!content||!h3)return;

    let row=content.querySelector('.patx-v205-name-photo-row');
    if(!row){
      row=document.createElement('div');
      row.className='patx-v205-name-photo-row';
      h3.parentNode.insertBefore(row,h3);
      row.appendChild(h3);
    }else if(h3.parentElement!==row){
      row.prepend(h3);
    }

    if(photo&&photo.parentElement!==row){
      row.appendChild(photo);
    }
  }

  function markRicoLabel(){
    const p=panel();
    if(!p)return;
    const orientation=p.querySelector('.patx-gps-orientation');
    if(!orientation)return;

    [...orientation.children].forEach(el=>{
      if(el.tagName==='SPAN' && /^LEY RICO$/i.test((el.textContent||'').trim())){
        el.classList.add('patx-v205-rico-label');
      }
    });
  }

  function fixMobileHeader(){
    const p=panel();
    if(!p)return;
    const titleRow=p.querySelector('.patx-gps-title-row');
    const back=titleRow?.querySelector('[data-gps-back]');
    if(!titleRow||!back)return;

    if(window.matchMedia('(max-width:700px)').matches){
      titleRow.classList.add('patx-v205-mobile-title-row');
      back.classList.add('patx-v205-back-right');
    }else{
      titleRow.classList.remove('patx-v205-mobile-title-row');
      back.classList.remove('patx-v205-back-right');
    }
  }

  function apply(){
    removeOrigin();
    arrangeNamePhoto();
    markRicoLabel();
    fixMobileHeader();
  }

  let queued=false;
  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      apply();
    });
  }

  const obs=new MutationObserver(schedule);
  obs.observe(document.documentElement,{childList:true,subtree:true});

  window.addEventListener('resize',schedule);
  window.addEventListener('orientationchange',schedule);
  window.addEventListener('patx-gps-analysis-updated',schedule);

  setTimeout(apply,0);
  setTimeout(apply,180);
  setTimeout(apply,600);
})();