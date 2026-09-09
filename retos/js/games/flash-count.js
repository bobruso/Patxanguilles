(() => {
  'use strict';
  window.PatxGameRegistry.register('flash-count', ({container,config={},seed=1,onFinish}) => {
    const rounds=Number(config.rounds||8),min=Number(config.min_count||2),max=Number(config.max_count||8);
    let state=Number(seed)||1,round=0,correct=0,reactionSum=0,target=0,startedAt=0,answerAt=0,finished=false,timers=[];
    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}
    function later(fn,ms){const t=setTimeout(fn,ms);timers.push(t);return t;}
    container.innerHTML=`<div class="game-surface flash-surface"><div class="game-kicker">FLASH COUNT</div><div class="round-counter" data-round></div><div class="flash-orb" data-orb></div><div class="flash-answers" data-answers></div><div class="game-help" data-help>Cuenta los destellos.</div><div class="hl-score" data-score>0 aciertos</div></div>`;
    const orb=container.querySelector('[data-orb]'),answers=container.querySelector('[data-answers]'),roundEl=container.querySelector('[data-round]'),help=container.querySelector('[data-help]'),scoreEl=container.querySelector('[data-score]');
    for(let n=min;n<=max;n++){const b=document.createElement('button');b.type='button';b.dataset.answer=n;b.textContent=n;answers.appendChild(b);}answers.hidden=true;
    function clearTimers(){timers.forEach(clearTimeout);timers=[];}
    function finish(){if(finished)return;finished=true;clearTimers();const score=Math.max(correct*1000-Math.round(reactionSum),0);onFinish({score,duration:performance.now()-startedAt,metadata:{correct,reaction_sum_ms:Math.round(reactionSum),rounds}});}
    function next(){if(finished)return;if(round>=rounds)return finish();target=min+Math.floor(rnd()*(max-min+1));roundEl.textContent=`Ronda ${round+1} / ${rounds}`;answers.hidden=true;help.textContent='Cuenta los destellos';let i=0;const flash=()=>{if(i>=target){later(showAnswers,420);return;}orb.classList.add('on');later(()=>orb.classList.remove('on'),120);i++;later(flash,260);};later(flash,300);}
    function showAnswers(){answers.hidden=false;[...answers.children].forEach(b=>b.disabled=false);answerAt=performance.now();help.textContent='¿Cuántos has visto?';}
    function resolve(v){if(finished||answers.hidden)return;[...answers.children].forEach(b=>b.disabled=true);if(v===target){correct++;reactionSum+=Math.min(performance.now()-answerAt,999);help.textContent='¡Correcto!';}else help.textContent=`Eran ${target}`;scoreEl.textContent=`${correct} acierto${correct===1?'':'s'}`;round++;later(next,350);}
    function press(e){const b=e.target.closest('[data-answer]');if(b)resolve(Number(b.dataset.answer));}
    answers.addEventListener('pointerdown',press);
    return{start(){startedAt=performance.now();next();},destroy(){finished=true;clearTimers();answers.removeEventListener('pointerdown',press);}};
  });
})();