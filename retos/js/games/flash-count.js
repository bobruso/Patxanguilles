(() => {
  'use strict';

  window.PatxGameRegistry.register('flash-count', ({container,config={},seed=1,onFinish}) => {
    const rounds=Number(config.rounds||8),min=Number(config.min_count||2),max=Number(config.max_count||8);
    let state=Number(seed)||1,round=0,correct=0,reactionSum=0,target=0,startedAt=0,answerAt=0,finished=false,locked=false,timers=[];
    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}
    function later(fn,ms){const t=setTimeout(fn,ms);timers.push(t);return t;}
    function clearTimers(){timers.forEach(clearTimeout);timers=[];}

    container.innerHTML=`
      <div class="game-surface flash-surface">
        <div class="game-kicker">FLASH COUNT</div>
        <div class="flash-head"><div class="round-counter" data-round></div><div class="round-counter" data-score>0 aciertos</div></div>
        <div class="flash-stage">
          <div class="flash-orb" data-orb><span></span></div>
          <div class="flash-caption" data-caption>CUENTA</div>
        </div>
        <div class="flash-answers" data-answers></div>
        <div class="game-help" data-help>Cuenta cada destello. Después elige cuántos viste.</div>
      </div>`;

    const orb=container.querySelector('[data-orb]'),caption=container.querySelector('[data-caption]'),answers=container.querySelector('[data-answers]'),roundEl=container.querySelector('[data-round]'),help=container.querySelector('[data-help]'),scoreEl=container.querySelector('[data-score]');
    for(let n=min;n<=max;n++){const b=document.createElement('button');b.type='button';b.dataset.answer=n;b.textContent=n;answers.appendChild(b);}answers.hidden=true;

    function finish(){if(finished)return;finished=true;locked=true;clearTimers();const score=Math.max(correct*1000-Math.round(reactionSum),0);onFinish({score,duration:performance.now()-startedAt,metadata:{correct,reaction_sum_ms:Math.round(reactionSum),rounds}});}

    function next(){
      if(finished)return;if(round>=rounds)return finish();locked=true;target=min+Math.floor(rnd()*(max-min+1));
      roundEl.textContent=`Ronda ${round+1} / ${rounds}`;scoreEl.textContent=`${correct} acierto${correct===1?'':'s'}`;answers.hidden=true;[...answers.children].forEach(b=>{b.disabled=true;b.classList.remove('is-correct','is-wrong');});
      help.textContent='Cuenta los destellos.';caption.textContent='MIRA';
      let i=0;
      const flash=()=>{
        if(i>=target){later(showAnswers,420);return;}
        orb.classList.add('on');caption.textContent=String(i+1);later(()=>orb.classList.remove('on'),130);i++;later(flash,280);
      };
      later(flash,320);
    }

    function showAnswers(){locked=false;answers.hidden=false;[...answers.children].forEach(b=>b.disabled=false);answerAt=performance.now();caption.textContent='¿CUÁNTOS?';help.textContent='Elige la cantidad que viste.';}

    function resolve(v){
      if(finished||locked||answers.hidden)return;locked=true;[...answers.children].forEach(b=>b.disabled=true);
      const ok=v===target;
      if(ok){correct++;reactionSum+=Math.min(performance.now()-answerAt,999);help.textContent='¡Correcto!';}
      else help.textContent=`Eran ${target}.`;
      [...answers.children].forEach(b=>{const n=Number(b.dataset.answer);if(n===target)b.classList.add('is-correct');if(n===v&&v!==target)b.classList.add('is-wrong');});
      scoreEl.textContent=`${correct} acierto${correct===1?'':'s'}`;round++;later(next,580);
    }

    function press(e){const b=e.target.closest('[data-answer]');if(b)resolve(Number(b.dataset.answer));}
    answers.addEventListener('pointerdown',press);
    return{start(){startedAt=performance.now();next();},destroy(){finished=true;clearTimers();answers.removeEventListener('pointerdown',press);}};
  });
})();