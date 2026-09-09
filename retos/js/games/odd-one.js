(() => {
  'use strict';
  window.PatxGameRegistry.register('odd-one', ({container,config={},seed=1,onFinish}) => {
    const rounds=Number(config.rounds||12), timeoutMs=Number(config.round_timeout_ms||1800);
    const symbols=['●','■','▲','◆','★','✚'];
    let state=Number(seed)||1,round=0,correct=0,reactionSum=0,oddIndex=0,startedAt=0,roundAt=0,timer=0,finished=false;
    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}
    container.innerHTML=`<div class="game-surface odd-surface"><div class="game-kicker">ODD ONE</div><div class="round-counter" data-round></div><div class="odd-grid" data-grid></div><div class="game-help" data-help>Encuentra el símbolo diferente.</div><div class="hl-score" data-score>0 aciertos</div></div>`;
    const grid=container.querySelector('[data-grid]'),roundEl=container.querySelector('[data-round]'),help=container.querySelector('[data-help]'),scoreEl=container.querySelector('[data-score]');
    function finish(){if(finished)return;finished=true;clearTimeout(timer);const score=Math.max(correct*1000-Math.round(reactionSum),0);onFinish({score,duration:performance.now()-startedAt,metadata:{correct,reaction_sum_ms:Math.round(reactionSum),rounds}});}
    function next(){if(finished)return;if(round>=rounds)return finish();const base=Math.floor(rnd()*symbols.length);let odd=Math.floor(rnd()*symbols.length);while(odd===base)odd=Math.floor(rnd()*symbols.length);oddIndex=Math.floor(rnd()*9);grid.innerHTML='';for(let i=0;i<9;i++){const b=document.createElement('button');b.type='button';b.dataset.i=i;b.textContent=symbols[i===oddIndex?odd:base];grid.appendChild(b);}roundEl.textContent=`Ronda ${round+1} / ${rounds}`;help.textContent='Encuentra el diferente';roundAt=performance.now();clearTimeout(timer);timer=setTimeout(()=>resolve(-1),timeoutMs);}
    function resolve(i){if(finished||!grid.children.length)return;clearTimeout(timer);[...grid.children].forEach(b=>b.disabled=true);if(i===oddIndex){correct++;reactionSum+=Math.min(performance.now()-roundAt,999);help.textContent='¡Correcto!';}else help.textContent=i<0?'Tiempo agotado':'No era ese';scoreEl.textContent=`${correct} acierto${correct===1?'':'s'}`;round++;setTimeout(next,260);}
    function press(e){const b=e.target.closest('[data-i]');if(b)resolve(Number(b.dataset.i));}
    grid.addEventListener('pointerdown',press);
    return{start(){startedAt=performance.now();next();},destroy(){finished=true;clearTimeout(timer);grid.removeEventListener('pointerdown',press);}};
  });
})();