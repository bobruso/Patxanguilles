(()=>{
  const MOBILE_MAX=700;

  function panel(){
    return document.querySelector('.patx-gps-panel');
  }

  function getParts(){
    const p=panel();
    if(!p)return {};
    return {
      p,
      orientation:p.querySelector('.patx-gps-orientation'),
      highlights:p.querySelector('.patx-gps-highlights'),
      headActions:p.querySelector('.patx-gps-head-actions')
    };
  }

  function ensureNote(orientation){
    if(!orientation)return null;

    let note=orientation.querySelector('.patx-v203-rico-note');
    const smalls=[...orientation.querySelectorAll('small')];

    if(!note){
      note=smalls.find(el =>
        /orientaci[oó]n ataque-defensa/i.test(el.textContent||'') ||
        /al cambiarla se recalculan/i.test(el.textContent||'')
      )||null;
    }

    if(note){
      note.classList.add('patx-v203-rico-note');
      note.textContent='*Orientación ataque-defensa. Al cambiarla se recalculan ocupación, posición media, ubicación de sprints y rol estimado.';
    }
    return note;
  }

  function moveMobile(){
    const {p,orientation,highlights}=getParts();
    if(!p||!orientation||!highlights)return;

    let block=p.querySelector('.patx-v203-rico-mobile-block');
    if(!block){
      block=document.createElement('div');
      block.className='patx-v203-rico-mobile-block';
    }

    if(block.previousElementSibling!==highlights || block.parentElement!==highlights.parentElement){
      highlights.insertAdjacentElement('afterend',block);
    }

    if(orientation.parentElement!==block){
      block.appendChild(orientation);
    }

    ensureNote(orientation);
  }

  function moveDesktop(){
    const {p,orientation,headActions}=getParts();
    if(!p||!orientation||!headActions)return;

    if(orientation.parentElement!==headActions){
      headActions.prepend(orientation);
    }

    const block=p.querySelector('.patx-v203-rico-mobile-block');
    if(block && !block.children.length)block.remove();

    ensureNote(orientation);
  }

  function apply(){
    if(window.innerWidth<=MOBILE_MAX)moveMobile();
    else moveDesktop();
  }

  let scheduled=false;
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{
      scheduled=false;
      apply();
    });
  }

  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{childList:true,subtree:true});

  window.addEventListener('resize',schedule);
  window.addEventListener('orientationchange',schedule);
  window.addEventListener('patx-gps-analysis-updated',schedule);

  setTimeout(apply,0);
  setTimeout(apply,150);
  setTimeout(apply,500);
})();