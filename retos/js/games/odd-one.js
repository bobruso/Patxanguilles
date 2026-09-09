(() => {
  'use strict';

  window.PatxGameRegistry.register('odd-one', ({container,config={},seed=1,onFinish}) => {
    const rounds=Number(config.rounds||12),timeoutMs=Number(config.round_timeout_ms||1800);
    const symbols=['●','■','▲','◆','★','✚'];
    let state=Number(seed)||1,round=0,correct=0,reactionSum=0,oddIndex=0,startedAt=0,roundAt=0,timer=0,raf=0,finished=false,locked=false;
    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}
    function clearTimers(){clearTimeout(timer);cancelAnimationFrame(raf);}

    container.innerHTML=`
      <div class="game-surface odd-surface">
        <div class="game-kicker">ODD ONE</div>
        <div class="odd-head"><div class="round-counter" data-round></div><div class="round-counter" data-score>0 aciertos</div></div>
        <div class="odd-timer"><div data-timer></div></div>
        <div class="odd-title">ENCUENTRA EL DIFERENTE</div>
        <div class="odd-grid" data-grid></div>
        <div class="game-help" data-help>Solo uno no coincide.</div>
      </div>`;

    const grid=container.querySelector('[data-grid]'),timerEl=container.querySelector('[data-timer]'),roundEl=container.querySelector('[data-round]'),help=container.querySelector('[data-help]'),scoreEl=container.querySelector('[data-score]');

    function tick(now){if(finished||locked)return;const ratio=Math.max(0,1-(now-roundAt)/timeoutMs);timerEl.style.transform=`scaleX(${ratio})`;if(ratio>0)raf=requestAnimationFrame(tick);}
    function finish(){if(finished)return;finished=true;locked=true;clearTimers();const score=Math.max(correct*1000-Math.round(reactionSum),0);onFinish({score,duration:performance.now()-startedAt,metadata:{correct,reaction_sum_ms:Math.round(reactionSum),rounds}});}

    function next(){
      clearTimers();if(finished)return;if(round>=rounds)return finish();locked=false;
      const base=Math.floor(rnd()*symbols.length);let odd=Math.floor(rnd()*symbols.length);while(odd===base)odd=Math.floor(rnd()*symbols.length);oddIndex=Math.floor(rnd()*9);
      grid.innerHTML='';
      for(let i=0;i<9;i++){
        const b=document.createElement('button');b.type='button';b.dataset.i=i;b.textContent=symbols[i===oddIndex?odd:base];b.setAttribute('aria-label',`Símbolo ${i+1}`);grid.appendChild(b);
      }
      roundEl.textContent=`Ronda ${round+1} / ${rounds}`;scoreEl.textContent=`${correct} acierto${correct===1?'':'s'}`;help.textContent='Encuentra el diferente.';timerEl.style.transform='scaleX(1)';roundAt=performance.now();raf=requestAnimationFrame(tick);timer=setTimeout(()=>resolve(-1),timeoutMs);
    }

    function resolve(i){
      if(finished||locked||!grid.children.length)return;locked=true;clearTimers();const buttons=[...grid.children];buttons.forEach(b=>b.disabled=true);
      const ok=i===oddIndex;
      if(ok){correct++;reactionSum+=Math.min(performance.now()-roundAt,999);help.textContent='¡Correcto!';buttons[i]?.classList.add('is-correct');}
      else{
        help.textContent=i<0?'Tiempo agotado':'Ese no era.';
        if(i>=0)buttons[i]?.classList.add('is-wrong');
        buttons[oddIndex]?.classList.add('is-correct');
      }
      scoreEl.textContent=`${correct} acierto${correct===1?'':'s'}`;round++;setTimeout(next,520);
    }

    function press(e){const b=e.target.closest('[data-i]');if(b)resolve(Number(b.dataset.i));}
    grid.addEventListener('pointerdown',press);
    return{start(){startedAt=performance.now();next();},destroy(){finished=true;clearTimers();grid.removeEventListener('pointerdown',press);}};
  });
})();