(() => {
  'use strict';

  window.PatxGameRegistry.register('target-lock', ({container,config={},seed=1,onFinish}) => {
    const rounds=Number(config.rounds||10),maxScore=Number(config.max_score||10000);
    let round=0,points=0,phase=0,currentScale=1,startedAt=0,roundAt=0,finished=false,raf=0,timer=0,locked=false;

    container.innerHTML=`
      <div class="game-surface lock-surface">
        <div class="game-kicker">TARGET LOCK</div>
        <div class="lock-head"><div class="round-counter" data-round></div><div class="round-counter" data-score>0 pts</div></div>
        <div class="lock-caption">HAZ COINCIDIR LOS ANILLOS</div>
        <button type="button" class="lock-target" data-target aria-label="Bloquear objetivo">
          <span class="lock-core"></span><span class="lock-core-dot"></span><span class="lock-ring" data-ring></span>
        </button>
        <div class="lock-grade" data-grade>TOCA EN EL MOMENTO EXACTO</div>
        <div class="game-help" data-help>Cuando el anillo móvil tenga el mismo tamaño que el objetivo, toca.</div>
      </div>`;

    const target=container.querySelector('[data-target]'),ring=container.querySelector('[data-ring]'),roundEl=container.querySelector('[data-round]'),help=container.querySelector('[data-help]'),scoreEl=container.querySelector('[data-score]'),gradeEl=container.querySelector('[data-grade]');

    function finish(){if(finished)return;finished=true;locked=true;cancelAnimationFrame(raf);clearTimeout(timer);target.disabled=true;onFinish({score:points,duration:performance.now()-startedAt,metadata:{points,rounds}});}

    function animate(now){
      if(finished||locked)return;
      const t=(now-roundAt)/1000;
      phase=(Math.sin(t*5)+1)/2;
      currentScale=.55+phase*1.15;
      ring.style.transform=`translate(-50%,-50%) scale(${currentScale})`;
      raf=requestAnimationFrame(animate);
    }

    function next(){
      if(finished)return;if(round>=rounds)return finish();locked=false;
      roundEl.textContent=`Ronda ${round+1} / ${rounds}`;scoreEl.textContent=`${points} pts`;gradeEl.textContent='TOCA EN EL MOMENTO EXACTO';gradeEl.className='lock-grade';help.textContent='Haz coincidir el anillo móvil con el objetivo.';target.disabled=false;target.classList.remove('is-perfect','is-good','is-miss');
      roundAt=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(animate);clearTimeout(timer);timer=setTimeout(()=>resolve(true),2200);
    }

    function resolve(timeout=false){
      if(finished||locked||target.disabled)return;locked=true;target.disabled=true;clearTimeout(timer);cancelAnimationFrame(raf);
      const sizeError=Math.abs(currentScale-1);
      const gained=timeout?0:Math.max(0,Math.round(1000-Math.min(1,sizeError)*1800));
      points=Math.min(maxScore,points+gained);
      const perfect=gained>=900,good=gained>=600;
      target.classList.add(perfect?'is-perfect':good?'is-good':'is-miss');
      gradeEl.className=`lock-grade ${perfect?'perfect':good?'good':'miss'}`;
      gradeEl.textContent=timeout?'TIEMPO':perfect?'PERFECTO':good?'BIEN':gained>250?'CERCA':'FALLO';
      help.textContent=timeout?'No has pulsado a tiempo.':`+${gained} puntos`;
      scoreEl.textContent=`${points} pts`;round++;setTimeout(next,600);
    }

    target.addEventListener('pointerdown',()=>resolve(false));
    return{start(){startedAt=performance.now();next();},destroy(){finished=true;cancelAnimationFrame(raf);clearTimeout(timer);}};
  });
})();