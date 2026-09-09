(() => {
  'use strict';

  window.PatxGameRegistry.register('shape-gate', ({container,config={},seed=1,onFinish}) => {
    const rounds=Number(config.rounds||12),timeoutMs=Number(config.round_timeout_ms||1800);
    const shapes=[['circle','●'],['square','■'],['triangle','▲'],['diamond','◆']];
    let state=Number(seed)||1,round=0,correct=0,reactionSum=0,target=null,roundAt=0,startedAt=0,timer=0,raf=0,finished=false,locked=false;
    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}
    function clearTimers(){clearTimeout(timer);cancelAnimationFrame(raf);}

    container.innerHTML=`
      <div class="game-surface shape-surface">
        <div class="game-kicker">SHAPE GATE</div>
        <div class="shape-head"><div class="round-counter" data-round></div><div class="round-counter" data-score>0 aciertos</div></div>
        <div class="shape-timer"><div data-timer></div></div>
        <div class="shape-card" data-card><div class="shape-card-label">¿QUÉ ENCAJA?</div><div class="shape-target" data-target>●</div></div>
        <div class="shape-actions">${shapes.map(([k,s])=>`<button type="button" data-shape="${k}" aria-label="${k}">${s}</button>`).join('')}</div>
        <div class="game-help" data-help>Elige la misma figura que ves arriba.</div>
      </div>`;

    const targetEl=container.querySelector('[data-target]'),card=container.querySelector('[data-card]'),timerEl=container.querySelector('[data-timer]'),roundEl=container.querySelector('[data-round]'),help=container.querySelector('[data-help]'),scoreEl=container.querySelector('[data-score]');
    const buttons=[...container.querySelectorAll('[data-shape]')];

    function tick(now){if(finished||locked)return;const ratio=Math.max(0,1-(now-roundAt)/timeoutMs);timerEl.style.transform=`scaleX(${ratio})`;if(ratio>0)raf=requestAnimationFrame(tick);}
    function finish(){if(finished)return;finished=true;locked=true;clearTimers();buttons.forEach(b=>b.disabled=true);const score=Math.max(correct*1000-Math.round(reactionSum),0);onFinish({score,duration:performance.now()-startedAt,metadata:{correct,reaction_sum_ms:Math.round(reactionSum),rounds}});}
    function next(){
      clearTimers();if(finished)return;if(round>=rounds)return finish();locked=false;target=shapes[Math.floor(rnd()*shapes.length)];
      targetEl.textContent=target[1];card.className='shape-card';roundEl.textContent=`Ronda ${round+1} / ${rounds}`;scoreEl.textContent=`${correct} acierto${correct===1?'':'s'}`;help.textContent='Elige la figura correcta.';
      buttons.forEach(b=>{b.disabled=false;b.classList.remove('is-correct','is-wrong');});timerEl.style.transform='scaleX(1)';roundAt=performance.now();raf=requestAnimationFrame(tick);timer=setTimeout(()=>resolve(null),timeoutMs);
    }
    function resolve(choice){
      if(finished||locked)return;locked=true;clearTimers();buttons.forEach(b=>b.disabled=true);const rt=performance.now()-roundAt;const ok=choice===target[0];
      if(ok){correct++;reactionSum+=Math.min(rt,999);help.textContent='¡Encaja!';card.classList.add('is-correct');}else{help.textContent=choice===null?'Tiempo agotado':'No encaja';card.classList.add('is-wrong');}
      buttons.forEach(b=>{if(b.dataset.shape===target[0])b.classList.add('is-correct');if(choice&&b.dataset.shape===choice&&choice!==target[0])b.classList.add('is-wrong');});
      scoreEl.textContent=`${correct} acierto${correct===1?'':'s'}`;round++;setTimeout(next,500);
    }
    function press(e){const b=e.target.closest('[data-shape]');if(b)resolve(b.dataset.shape);}
    container.addEventListener('pointerdown',press);
    return{start(){startedAt=performance.now();next();},destroy(){finished=true;clearTimers();container.removeEventListener('pointerdown',press);}};
  });
})();