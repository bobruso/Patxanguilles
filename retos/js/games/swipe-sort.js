(() => {
  'use strict';

  window.PatxGameRegistry.register('swipe-sort', ({container,config={},seed=1,onFinish}) => {
    const rounds=Number(config.rounds||16),timeoutMs=Number(config.round_timeout_ms||1800);
    let state=Number(seed)||1,round=0,correct=0,reactionSum=0,value=0,startedAt=0,roundAt=0,timer=0,raf=0,finished=false,locked=false,startX=null,currentX=0;
    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}
    function clearTimers(){clearTimeout(timer);cancelAnimationFrame(raf);}

    container.innerHTML=`
      <div class="game-surface swipe-surface">
        <div class="game-kicker">SWIPE SORT</div>
        <div class="swipe-head"><div class="round-counter" data-round></div><div class="round-counter" data-score>0 aciertos</div></div>
        <div class="swipe-timer"><div data-timer></div></div>
        <div class="swipe-rule-card"><span class="odd">← IMPAR</span><span class="even">PAR →</span></div>
        <div class="swipe-card-wrap"><div class="swipe-card" data-card>—</div></div>
        <div class="swipe-actions"><button type="button" data-choice="left">← IMPAR</button><button type="button" data-choice="right">PAR →</button></div>
        <div class="game-help" data-help>Desliza la tarjeta o usa los botones.</div>
      </div>`;

    const card=container.querySelector('[data-card]'),timerEl=container.querySelector('[data-timer]'),roundEl=container.querySelector('[data-round]'),help=container.querySelector('[data-help]'),scoreEl=container.querySelector('[data-score]'),buttons=[...container.querySelectorAll('[data-choice]')];

    function tick(now){if(finished||locked)return;const ratio=Math.max(0,1-(now-roundAt)/timeoutMs);timerEl.style.transform=`scaleX(${ratio})`;if(ratio>0)raf=requestAnimationFrame(tick);}
    function finish(){if(finished)return;finished=true;locked=true;clearTimers();const score=Math.max(correct*1000-Math.round(reactionSum),0);onFinish({score,duration:performance.now()-startedAt,metadata:{correct,reaction_sum_ms:Math.round(reactionSum),rounds}});}

    function resetCard(){currentX=0;card.className='swipe-card';card.style.transform='translateX(0) rotate(0deg)';}
    function next(){
      clearTimers();if(finished)return;if(round>=rounds)return finish();locked=false;value=1+Math.floor(rnd()*99);resetCard();card.textContent=value;
      roundEl.textContent=`Ronda ${round+1} / ${rounds}`;scoreEl.textContent=`${correct} acierto${correct===1?'':'s'}`;help.textContent='IMPAR a la izquierda · PAR a la derecha';buttons.forEach(b=>{b.disabled=false;b.classList.remove('is-correct','is-wrong');});timerEl.style.transform='scaleX(1)';roundAt=performance.now();raf=requestAnimationFrame(tick);timer=setTimeout(()=>resolve(null),timeoutMs);
    }

    function resolve(choice){
      if(finished||locked)return;locked=true;clearTimers();buttons.forEach(b=>b.disabled=true);const right=value%2===0?'right':'left',ok=choice===right;
      if(ok){correct++;reactionSum+=Math.min(performance.now()-roundAt,999);help.textContent='¡Correcto!';card.classList.add('is-correct');}
      else{help.textContent=choice===null?'Tiempo agotado':`Era ${right==='left'?'IMPAR ←':'PAR →'}`;card.classList.add('is-wrong');}
      buttons.forEach(b=>{if(b.dataset.choice===right)b.classList.add('is-correct');if(choice&&b.dataset.choice===choice&&choice!==right)b.classList.add('is-wrong');});
      if(choice){const sign=choice==='left'?-1:1;card.style.transform=`translateX(${sign*155}px) rotate(${sign*10}deg)`;}
      else card.style.transform=`scale(.94)`;
      scoreEl.textContent=`${correct} acierto${correct===1?'':'s'}`;round++;setTimeout(next,560);
    }

    function down(e){
      const b=e.target.closest('[data-choice]');if(b){e.preventDefault();return resolve(b.dataset.choice);}
      if(locked||finished||!e.target.closest('[data-card]'))return;
      startX=e.clientX;currentX=0;card.setPointerCapture?.(e.pointerId);card.classList.add('is-dragging');
    }
    function move(e){
      if(startX==null||locked||finished)return;currentX=Math.max(-115,Math.min(115,e.clientX-startX));card.style.transform=`translateX(${currentX}px) rotate(${currentX*.045}deg)`;
    }
    function up(e){
      if(startX==null)return;const dx=e.clientX-startX;startX=null;card.classList.remove('is-dragging');if(Math.abs(dx)>42)resolve(dx<0?'left':'right');else card.style.transform='translateX(0) rotate(0deg)';
    }

    container.addEventListener('pointerdown',down,{passive:false});container.addEventListener('pointermove',move,{passive:false});container.addEventListener('pointerup',up,{passive:false});container.addEventListener('pointercancel',up,{passive:false});
    return{start(){startedAt=performance.now();next();},destroy(){finished=true;clearTimers();container.removeEventListener('pointerdown',down);container.removeEventListener('pointermove',move);container.removeEventListener('pointerup',up);container.removeEventListener('pointercancel',up);}};
  });
})();