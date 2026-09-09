(() => {
  'use strict';

  window.PatxGameRegistry.register('color-reflex', ({ container, config = {}, seed = 1, onFinish }) => {
    const rounds=Number(config.rounds||8);
    const timeoutMs=Number(config.round_timeout_ms||2200);
    const names=['ROJO','AZUL','VERDE','AMARILLO'];
    let state=Number(seed)||1,round=0,correct=0,reactionSum=0,roundStart=0,startedAt=0,timer=0,raf=0,finished=false,target=0,locked=false;

    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}
    function clearTimers(){clearTimeout(timer);cancelAnimationFrame(raf);}

    container.innerHTML=`
      <div class="game-surface color-reflex-surface">
        <div class="game-kicker">COLOR REFLEX</div>
        <div class="color-head">
          <div class="round-counter" data-round>Ronda 1 / ${rounds}</div>
          <div class="round-counter" data-score>0 aciertos</div>
        </div>
        <div class="color-timer"><div data-timer></div></div>
        <div class="color-prompt">
          <div class="color-prompt-label">TOCA</div>
          <div class="color-target" data-target>PREPÁRATE</div>
        </div>
        <div class="color-grid">
          ${names.map((name,i)=>`<button type="button" class="color-option color-${i}" data-color="${i}"><span class="color-dot"></span><span>${name}</span></button>`).join('')}
        </div>
        <div class="game-help" data-help>Acertar rápido da más puntos.</div>
      </div>`;

    const roundEl=container.querySelector('[data-round]');
    const scoreEl=container.querySelector('[data-score]');
    const timerEl=container.querySelector('[data-timer]');
    const targetEl=container.querySelector('[data-target]');
    const helpEl=container.querySelector('[data-help]');
    const buttons=[...container.querySelectorAll('[data-color]')];

    function tick(now){
      if(finished||locked)return;
      const elapsed=now-roundStart;
      const ratio=Math.max(0,1-elapsed/timeoutMs);
      timerEl.style.transform=`scaleX(${ratio})`;
      if(ratio>0)raf=requestAnimationFrame(tick);
    }

    function end(){
      if(finished)return;
      finished=true;locked=true;clearTimers();
      const duration=performance.now()-startedAt;
      const score=Math.max(correct*1000-Math.round(reactionSum),0);
      targetEl.textContent=`${correct} / ${rounds}`;
      helpEl.textContent='Resultado registrando…';
      onFinish({score,duration,metadata:{correct,reaction_sum_ms:Math.round(reactionSum),rounds}});
    }

    function nextRound(){
      clearTimers();
      if(round>=rounds)return end();
      target=Math.floor(rnd()*names.length);locked=false;
      roundEl.textContent=`Ronda ${round+1} / ${rounds}`;
      scoreEl.textContent=`${correct} acierto${correct===1?'':'s'}`;
      targetEl.textContent=names[target];
      targetEl.className=`color-target target-${target}`;
      buttons.forEach(b=>{b.disabled=false;b.classList.remove('is-correct','is-wrong');});
      helpEl.textContent='Toca el color indicado.';
      timerEl.style.transform='scaleX(1)';
      roundStart=performance.now();
      raf=requestAnimationFrame(tick);
      timer=setTimeout(()=>resolve(null),timeoutMs);
    }

    function resolve(chosen){
      if(finished||locked)return;
      locked=true;clearTimers();buttons.forEach(b=>b.disabled=true);
      const elapsed=performance.now()-roundStart;
      const ok=chosen===target;
      if(ok){correct+=1;reactionSum+=elapsed;helpEl.textContent='¡Bien!';}
      else if(chosen===null){helpEl.textContent='Tiempo agotado.';}
      else{helpEl.textContent=`Era ${names[target]}.`;}
      buttons.forEach(button=>{
        const value=Number(button.dataset.color);
        if(value===target)button.classList.add('is-correct');
        if(chosen!==null&&value===chosen&&chosen!==target)button.classList.add('is-wrong');
      });
      scoreEl.textContent=`${correct} acierto${correct===1?'':'s'}`;
      round+=1;
      setTimeout(nextRound,500);
    }

    function press(event){
      const button=event.target.closest('[data-color]');
      if(!button||finished||locked)return;
      event.preventDefault();resolve(Number(button.dataset.color));
    }

    container.addEventListener('pointerdown',press,{passive:false});

    return{
      start(){startedAt=performance.now();setTimeout(nextRound,180);},
      destroy(){finished=true;locked=true;clearTimers();container.removeEventListener('pointerdown',press);}
    };
  });
})();