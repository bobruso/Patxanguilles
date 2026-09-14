(()=>{
  'use strict';
  const MATCH_PHOTO_ID='matchPhoto';
  const LINEUP_IMAGE_ID='resultCallupImage';

  function clearWrongOcrStatus(){
    const el=document.getElementById('resultImageCallupStatus');
    if(!el)return;
    if(/formato F7 generado por Patxanguilles/i.test(String(el.textContent||''))){
      el.textContent='';
      el.style.display='none';
      el.dataset.state='';
    }
  }

  function wrapLineupImporter(){
    const current=window.importResultLineupImage;
    if(typeof current!=='function'||current.__patxStrictLineupInputGuard)return;
    const guarded=async function(input){
      const expected=document.getElementById(LINEUP_IMAGE_ID);
      if(!input||input.id!==LINEUP_IMAGE_ID||!expected||input!==expected)return;
      return current.apply(this,arguments);
    };
    Object.defineProperty(guarded,'__patxStrictLineupInputGuard',{value:true});
    Object.defineProperty(guarded,'__patxOriginalLineupImporter',{value:current});
    window.importResultLineupImage=guarded;
  }

  function isolateMatchPhotoInput(){
    const input=document.getElementById(MATCH_PHOTO_ID);
    if(!input||input.dataset.patxPhotoRoutingV7==='1')return;
    input.dataset.patxPhotoRoutingV7='1';
    input.dataset.patxUploadPurpose='match-photo';
    input.removeAttribute('onchange');
    input.onchange=null;
    input.addEventListener('change',ev=>{
      ev.stopImmediatePropagation();
      ev.stopPropagation();
      clearWrongOcrStatus();
      const fn=window.previewMatchPhoto;
      if(typeof fn==='function')fn(input);
    });
  }

  function markLineupInput(){
    const input=document.getElementById(LINEUP_IMAGE_ID);
    if(input)input.dataset.patxUploadPurpose='lineup-ocr';
  }

  function applyRouting(){
    wrapLineupImporter();
    isolateMatchPhotoInput();
    markLineupInput();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyRouting,{once:true});
  else applyRouting();

  const observer=new MutationObserver(()=>applyRouting());
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
