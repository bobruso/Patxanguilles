(() => {
  'use strict';

  window.PatxGameRegistry.register('odd-one', ({container,config={},seed=1,onFinish}) => {
    const rounds=Number(config.rounds||15),baseTimeout=Number(config.round_timeout_ms||3000);
    const pairs=[['●','◉'],['■','▣'],['▲','△'],['◆','◇'],['✦','✧'],['✚','✜'],['⬢','⬡'],['☻','☺'],['◼','◾'],['✪','★']];
    let state=Number(seed)||1,round=0,correct=0,reactionSum=0,oddIndex=0,startedAt=0,roundAt=0,timer=0,raf=0,finished=false,locked=false,currentTimeout=baseTimeout;
    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}
    function clearTimers(){clearTimeout(timer);cancelAnimationFrame(raf);}
    function gridSize(){if(round<3)return 3;if(round<7)return 4;if(round<11)return 5;return 6;}
    function timeoutForRound(){return Math.max(1700,baseTimeout-round*90);}

    container.innerHTML=`
      <div class="game-surface odd-surface progressive-odd-surface">
        <div class="game-kicker">ODD ONE</div>
        <div class="odd-head"><div class="round-counter" data-round></div><div class="round-counter" data-score>0 aciertos</div></div>
        <div class="odd-timer"><div data-timer></div></div>
        <div class="odd-title">ENCUENTRA EL DIFERENTE</div>
        <div class="odd-grid" data-grid></div>
        <div class="game-help" data-help>Solo uno cambia ligeramente.</div>
      </div>`;

    const grid=container.querySelector('[data-grid]'),timerEl=container.querySelector('[data-timer]'),roundEl=container.querySelector('[data-round]'),help=container.querySelector('[data-help]'),scoreEl=container.querySelector('[data-score]');
    function tick(now){if(finished||locked)return;const ratio=Math.max(0,1-(now-roundAt)/currentTimeout);timerEl.style.transform=`scaleX(${ratio})`;if(ratio>0)raf=requestAnimationFrame(tick);}
    function finish(){if(finished)return;finished=true;locked=true;clearTimers();const score=Math.max(correct*1000-Math.round(reactionSum),0);onFinish({score,duration:performance.now()-startedAt,metadata:{correct,reaction_sum_ms:Math.round(reactionSum),rounds}});}

    function next(){
      clearTimers();if(finished)return;if(round>=rounds)return finish();locked=false;
      const size=gridSize(),cells=size*size,pair=pairs[Math.floor(rnd()*pairs.length)],swap=rnd()>.5,base=pair[swap?1:0],odd=pair[swap?0:1];oddIndex=Math.floor(rnd()*cells);currentTimeout=timeoutForRound();
      grid.style.gridTemplateColumns=`repeat(${size},1fr)`;grid.dataset.size=size;grid.innerHTML='';
      const font=Math.max(22,46-size*4);
      for(let i=0;i<cells;i++){
        const b=document.createElement('button');b.type='button';b.dataset.i=i;b.textContent=i===oddIndex?odd:base;b.style.fontSize=`${font}px`;b.setAttribute('aria-label',`Símbolo ${i+1}`);grid.appendChild(b);
      }
      roundEl.textContent=`Ronda ${round+1} / ${rounds}`;scoreEl.textContent=`${correct} acierto${correct===1?'':'s'}`;help.textContent=`Cuadrícula ${size}×${size} · busca la diferencia mínima.`;timerEl.style.transform='scaleX(1)';roundAt=performance.now();raf=requestAnimationFrame(tick);timer=setTimeout(()=>resolve(-1),currentTimeout);
    }
    function resolve(i){
      if(finished||locked||!grid.children.length)return;locked=true;clearTimers();const buttons=[...grid.children];buttons.forEach(b=>b.disabled=true);const ok=i===oddIndex;
      if(ok){correct++;reactionSum+=Math.min(performance.now()-roundAt,1200);help.textContent='¡Correcto! La siguiente será más difícil.';buttons[i]?.classList.add('is-correct');}
      else{help.textContent=i<0?'Tiempo agotado':'Ese no era.';if(i>=0)buttons[i]?.classList.add('is-wrong');buttons[oddIndex]?.classList.add('is-correct');}
      scoreEl.textContent=`${correct} acierto${correct===1?'':'s'}`;round++;setTimeout(next,560);
    }
    function press(e){const b=e.target.closest('[data-i]');if(b)resolve(Number(b.dataset.i));}
    grid.addEventListener('pointerdown',press);
    return{start(){startedAt=performance.now();next();},destroy(){finished=true;clearTimers();grid.removeEventListener('pointerdown',press);}};
  });
})();