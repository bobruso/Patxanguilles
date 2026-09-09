(() => {
  'use strict';

  window.PatxGameRegistry.register('target-lock', ({container,config={},seed=1,onFinish}) => {
    const rounds=Number(config.rounds||12),maxScore=Number(config.max_score||12000);
    let round=0,points=0,currentScale=1,startedAt=0,roundAt=0,finished=false,raf=0,timer=0,locked=false;

    container.innerHTML=`
      <div class="game-surface lock-surface progressive-lock-surface">
        <div class="game-kicker">TARGET LOCK</div>
        <div class="lock-head"><div class="round-counter" data-round></div><div class="round-counter" data-score>0 pts</div></div>
        <div class="lock-caption" data-caption>HAZ COINCIDIR LOS ANILLOS</div>
        <button type="button" class="lock-target" data-target aria-label="Bloquear objetivo">
          <span class="lock-zone" data-zone></span><span class="lock-core"></span><span class="lock-core-dot"></span><span class="lock-ring" data-ring></span>
        </button>
        <div class="lock-grade" data-grade>TOCA EN EL MOMENTO EXACTO</div>
        <div class="game-help" data-help>Cada ronda va más rápido y el margen válido se hace más estrecho.</div>
      </div>`;

    const target=container.querySelector('[data-target]'),ring=container.querySelector('[data-ring]'),zone=container.querySelector('[data-zone]'),roundEl=container.querySelector('[data-round]'),help=container.querySelector('[data-help]'),scoreEl=container.querySelector('[data-score]'),gradeEl=container.querySelector('[data-grade]'),caption=container.querySelector('[data-caption]');
    function tolerance(){return Math.max(.035,.14-round*.0095);}
    function angularSpeed(){return 4.4+round*.72;}
    function finish(){if(finished)return;finished=true;locked=true;cancelAnimationFrame(raf);clearTimeout(timer);target.disabled=true;onFinish({score:points,duration:performance.now()-startedAt,metadata:{points,rounds}});}
    function animate(now){
      if(finished||locked)return;
      const t=(now-roundAt)/1000;const phase=(Math.sin(t*angularSpeed())+1)/2;currentScale=.52+phase*1.22;ring.style.transform=`translate(-50%,-50%) scale(${currentScale})`;raf=requestAnimationFrame(animate);
    }
    function next(){
      if(finished)return;if(round>=rounds)return finish();locked=false;
      const tol=tolerance();roundEl.textContent=`Ronda ${round+1} / ${rounds}`;scoreEl.textContent=`${points} pts`;gradeEl.textContent='TOCA EN EL MOMENTO EXACTO';gradeEl.className='lock-grade';help.textContent='Haz coincidir el anillo móvil con la zona iluminada.';caption.textContent=`VELOCIDAD ×${(angularSpeed()/4.4).toFixed(2)} · MARGEN ${Math.round(tol*100)}%`;target.disabled=false;target.classList.remove('is-perfect','is-good','is-miss');zone.style.setProperty('--lock-zone',`${Math.max(4,Math.round(tol*90))}px`);
      roundAt=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(animate);clearTimeout(timer);timer=setTimeout(()=>resolve(true),2400);
    }
    function resolve(timeout=false){
      if(finished||locked||target.disabled)return;locked=true;target.disabled=true;clearTimeout(timer);cancelAnimationFrame(raf);
      const err=Math.abs(currentScale-1),tol=tolerance();let gained=0;if(!timeout&&err<=tol){const quality=1-Math.min(1,err/tol);gained=Math.round(600+400*quality);}points=Math.min(maxScore,points+gained);
      const perfect=gained>=900,good=gained>=600;
      target.classList.add(perfect?'is-perfect':good?'is-good':'is-miss');gradeEl.className=`lock-grade ${perfect?'perfect':good?'good':'miss'}`;gradeEl.textContent=timeout?'TIEMPO':perfect?'PERFECTO':good?'DENTRO':'FALLO';help.textContent=timeout?'No has pulsado a tiempo.':gained?`+${gained} puntos`:'Fuera del margen válido.';scoreEl.textContent=`${points} pts`;round++;setTimeout(next,620);
    }
    target.addEventListener('pointerdown',()=>resolve(false));
    return{start(){startedAt=performance.now();next();},destroy(){finished=true;cancelAnimationFrame(raf);clearTimeout(timer);}};
  });
})();