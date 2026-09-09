(() => {
  'use strict';
  window.PatxGameRegistry.register('swipe-sort', ({container,config={},seed=1,onFinish}) => {
    const rounds=Number(config.rounds||16),timeoutMs=Number(config.round_timeout_ms||1800);
    let state=Number(seed)||1,round=0,correct=0,reactionSum=0,value=0,startedAt=0,roundAt=0,timer=0,finished=false,startX=null;
    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}
    container.innerHTML=`<div class="game-surface swipe-surface"><div class="game-kicker">SWIPE SORT</div><div class="round-counter" data-round></div><div class="swipe-rule">IMPAR ← &nbsp;&nbsp; PAR →</div><div class="swipe-card" data-card>—</div><div class="swipe-actions"><button type="button" data-choice="left">← IMPAR</button><button type="button" data-choice="right">PAR →</button></div><div class="game-help" data-help>Desliza o usa los botones.</div><div class="hl-score" data-score>0 aciertos</div></div>`;
    const card=container.querySelector('[data-card]'),roundEl=container.querySelector('[data-round]'),help=container.querySelector('[data-help]'),scoreEl=container.querySelector('[data-score]'),buttons=[...container.querySelectorAll('[data-choice]')];
    function finish(){if(finished)return;finished=true;clearTimeout(timer);const score=Math.max(correct*1000-Math.round(reactionSum),0);onFinish({score,duration:performance.now()-startedAt,metadata:{correct,reaction_sum_ms:Math.round(reactionSum),rounds}});}
    function next(){if(finished)return;if(round>=rounds)return finish();value=1+Math.floor(rnd()*99);card.textContent=value;card.style.transform='translateX(0) rotate(0)';roundEl.textContent=`Ronda ${round+1} / ${rounds}`;help.textContent='IMPAR izquierda · PAR derecha';buttons.forEach(b=>b.disabled=false);roundAt=performance.now();clearTimeout(timer);timer=setTimeout(()=>resolve(null),timeoutMs);}
    function resolve(choice){if(finished||buttons.every(b=>b.disabled))return;clearTimeout(timer);buttons.forEach(b=>b.disabled=true);const right=value%2===0?'right':'left';if(choice===right){correct++;reactionSum+=Math.min(performance.now()-roundAt,999);help.textContent='¡Correcto!';}else help.textContent=choice===null?'Tiempo agotado':'Lado incorrecto';if(choice)card.style.transform=`translateX(${choice==='left'?-120:120}px) rotate(${choice==='left'?-8:8}deg)`;scoreEl.textContent=`${correct} acierto${correct===1?'':'s'}`;round++;setTimeout(next,260);}
    function down(e){const b=e.target.closest('[data-choice]');if(b)return resolve(b.dataset.choice);startX=e.clientX;}
    function up(e){if(startX==null)return;const dx=e.clientX-startX;startX=null;if(Math.abs(dx)>35)resolve(dx<0?'left':'right');}
    container.addEventListener('pointerdown',down);container.addEventListener('pointerup',up);
    return{start(){startedAt=performance.now();next();},destroy(){finished=true;clearTimeout(timer);container.removeEventListener('pointerdown',down);container.removeEventListener('pointerup',up);}};
  });
})();