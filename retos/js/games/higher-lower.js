(() => {
  'use strict';

  window.PatxGameRegistry.register('higher-lower', ({ container, config = {}, seed = 1, onFinish }) => {
    const rounds=Number(config.rounds||10);
    const min=Number(config.min_value||1);
    const max=Number(config.max_value||99);
    const timeoutMs=Number(config.round_timeout_ms||3500);
    let state=Number(seed)||1,round=0,correct=0,current=0,next=0,startedAt=0,finished=false,timer=0,locked=false;

    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}
    function number(){return min+Math.floor(rnd()*(max-min+1));}
    function makeNext(){let n=number();while(n===current)n=number();return n;}

    container.innerHTML=`
      <div class="game-surface hl-surface">
        <div class="game-kicker">HIGHER OR LOWER</div>
        <div class="hl-head">
          <div class="round-counter" data-round>Ronda 1 / ${rounds}</div>
          <div class="round-counter" data-score>0 aciertos</div>
        </div>
        <div class="hl-card" data-card>
          <div class="hl-card-label">NÚMERO ACTUAL</div>
          <div class="hl-number" data-number>—</div>
        </div>
        <div class="game-help" data-help>¿El siguiente número será mayor o menor?</div>
        <div class="hl-actions">
          <button type="button" data-choice="lower"><span class="hl-arrow">↓</span><span>MENOR</span></button>
          <button type="button" data-choice="higher"><span class="hl-arrow">↑</span><span>MAYOR</span></button>
        </div>
      </div>`;

    const roundEl=container.querySelector('[data-round]');
    const scoreEl=container.querySelector('[data-score]');
    const numberEl=container.querySelector('[data-number]');
    const helpEl=container.querySelector('[data-help]');
    const cardEl=container.querySelector('[data-card]');
    const buttons=[...container.querySelectorAll('[data-choice]')];

    function finish(){
      if(finished)return;
      finished=true;locked=true;clearTimeout(timer);buttons.forEach(b=>b.disabled=true);
      onFinish({score:correct,duration:performance.now()-startedAt,metadata:{correct,rounds}});
    }

    function nextRound(){
      if(finished)return;
      if(round>=rounds)return finish();
      if(!current)current=number();
      next=makeNext();locked=false;
      cardEl.className='hl-card';
      roundEl.textContent=`Ronda ${round+1} / ${rounds}`;
      scoreEl.textContent=`${correct} acierto${correct===1?'':'s'}`;
      numberEl.textContent=current;
      helpEl.textContent='¿El siguiente número será mayor o menor?';
      buttons.forEach(b=>{b.disabled=false;b.classList.remove('is-correct','is-wrong');});
      clearTimeout(timer);timer=setTimeout(()=>resolve(null),timeoutMs);
    }

    function resolve(choice){
      if(finished||locked)return;
      locked=true;clearTimeout(timer);buttons.forEach(b=>b.disabled=true);
      const actual=next>current?'higher':'lower';
      const ok=choice===actual;
      if(ok)correct++;
      numberEl.textContent=next;
      cardEl.classList.add(ok?'is-correct':'is-wrong');
      buttons.forEach(button=>{
        if(button.dataset.choice===actual)button.classList.add('is-correct');
        if(choice&&button.dataset.choice===choice&&choice!==actual)button.classList.add('is-wrong');
      });
      helpEl.textContent=ok?'¡Correcto!':choice===null?`Tiempo. Era ${actual==='higher'?'MAYOR':'MENOR'}.`:`Era ${actual==='higher'?'MAYOR':'MENOR'}.`;
      scoreEl.textContent=`${correct} acierto${correct===1?'':'s'}`;
      current=next;round++;
      setTimeout(nextRound,650);
    }

    function press(e){const b=e.target.closest('[data-choice]');if(b)resolve(b.dataset.choice);}
    container.addEventListener('pointerdown',press);

    return{
      start(){startedAt=performance.now();nextRound();},
      destroy(){finished=true;clearTimeout(timer);container.removeEventListener('pointerdown',press);}
    };
  });
})();