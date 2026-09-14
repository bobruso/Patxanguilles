(()=>{
  'use strict';

  const MATCH_PHOTO_ID='matchPhoto';
  const LINEUP_IMAGE_ID='resultCallupImage';

  function clearWrongOcrStatus(){
    const el=document.getElementById('resultImageCallupStatus');
    if(!el)return;
    if(/formato F7 generado por Patxanguilles|No se pudo completar el reconocimiento/i.test(String(el.textContent||''))){
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
      if(input.disabled)return;
      return current.apply(this,arguments);
    };

    Object.defineProperty(guarded,'__patxStrictLineupInputGuard',{value:true});
    Object.defineProperty(guarded,'__patxOriginalLineupImporter',{value:current});
    window.importResultLineupImage=guarded;
  }

  function isolateMatchPhotoInput(){
    const input=document.getElementById(MATCH_PHOTO_ID);
    if(!input||input.dataset.patxPhotoRoutingV228==='1')return;

    input.dataset.patxPhotoRoutingV228='1';
    input.dataset.patxUploadPurpose='match-photo';

    // Este input NO puede disparar jamás el OCR de convocatorias.
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

  function syncLineupOcrVisibility(){
    const textImport=document.querySelector('#resultForm .result-callup-import');
    const imageImport=document.querySelector('#resultForm .result-image-import');
    const lineupInput=document.getElementById(LINEUP_IMAGE_ID);
    if(!imageImport||!lineupInput)return;

    const saveBtn=document.querySelector('#resultForm .controls .primary');
    const photoOnly=/^\s*Subir fotos\s*$/i.test(String(saveBtn?.textContent||''));

    let textImportHidden=false;
    if(textImport){
      textImportHidden=
        textImport.hidden===true ||
        textImport.style.display==='none' ||
        getComputedStyle(textImport).display==='none';
    }

    // En un partido ya cerrado, la edición pública oculta la importación
    // de convocatoria. El importador de imagen debe quedar oculto también.
    const hideOcr=textImportHidden||photoOnly;

    imageImport.style.display=hideOcr?'none':'';
    imageImport.setAttribute('aria-hidden',hideOcr?'true':'false');
    lineupInput.disabled=hideOcr;

    if(hideOcr){
      lineupInput.value='';
      clearWrongOcrStatus();
    }
  }

  function markLineupInput(){
    const input=document.getElementById(LINEUP_IMAGE_ID);
    if(input)input.dataset.patxUploadPurpose='lineup-ocr';
  }

  function wrapOpenResultForm(){
    const current=window.openResultForm;
    if(typeof current!=='function'||current.__patxPhotoRoutingV228)return;

    const wrapped=function(){
      const result=current.apply(this,arguments);

      // openResultForm decide qué secciones están bloqueadas/visibles.
      // Sincronizamos el OCR justo después de esa decisión.
      queueMicrotask(applyRouting);
      requestAnimationFrame(applyRouting);
      setTimeout(applyRouting,0);

      return result;
    };

    Object.defineProperty(wrapped,'__patxPhotoRoutingV228',{value:true});
    Object.defineProperty(wrapped,'__patxOriginalOpenResultForm',{value:current});
    window.openResultForm=wrapped;
  }

  function applyRouting(){
    wrapLineupImporter();
    wrapOpenResultForm();
    isolateMatchPhotoInput();
    markLineupInput();
    syncLineupOcrVisibility();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',applyRouting,{once:true});
  }else{
    applyRouting();
  }

  const observer=new MutationObserver(()=>applyRouting());
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
