(() => {
  'use strict';

  window.PatxGameRegistry.register('higher-lower', ({ container, config = {}, seed = 1, onFinish }) => {
    const rounds = Number(config.rounds || 10);
    const min = Number(config.min_value || 1);
    const max = Number(config.max_value || 99);
    const timeoutMs = Number(config.round_timeout_ms || 3500);
    let state = Number(seed) || 1;
    let round = 0, correct = 0, current = 0, next = 0, startedAt = 0, finished = false, timer = 0;

    function rnd(){ state=(state*1664525+1013904223)>>>0; return state/4294967296; }
    function number(){ return min + Math.floor(rnd()*(max-min+1)); }
    function makeNext(){ let n=number(); while(n===current) n=number(); return n; }

    container.innerHTML = `
      <div class="game-surface hl-surface">
        <div class="game-kicker">HIGHER OR LOWER</div>
        <div class="round-counter" data-round>Ronda 1 / ${rounds}</div>
        <div class="hl-number" data-number>—</div>
        <div class="game-help" data-help>¿El siguiente número será mayor o menor?</div>
        <div class="hl-actions">
          <button type="button" data-choice="lower">↓ MENOR</button>
          <button type="button" data-choice="higher">↑ MAYOR</button>
        </div>
        <div class="hl-score" data-score>0 aciertos</div>
      </div>`;

    const roundEl=container.querySelector('[data-round]');
    const numberEl=container.querySelector('[data-number]');
    const helpEl=container.querySelector('[data-help]');
    const scoreEl=container.querySelector('[data-score]');
    const buttons=[...container.querySelectorAll('[data-choice]')];

    function finish(){
      if(finished) return;
      finished=true; clearTimeout(timer);
      buttons.forEach(b=>b.disabled=true);
      onFinish({ score:correct, duration:performance.now()-startedAt, metadata:{correct,rounds} });
    }

    function nextRound(){
      if(finished) return;
      if(round>=rounds) return finish();
      if(!current) current=number();
      next=makeNext();
      roundEl.textContent=`Ronda ${round+1} / ${rounds}`;
      numberEl.textContent=current;
      helpEl.textContent='¿El siguiente número será mayor o menor?';
      buttons.forEach(b=>b.disabled=false);
      clearTimeout(timer);
      timer=setTimeout(()=>resolve(null),timeoutMs);
    }

    function resolve(choice){
      if(finished || buttons.every(b=>b.disabled)) return;
      clearTimeout(timer); buttons.forEach(b=>b.disabled=true);
      const actual=next>current?'higher':'lower';
      if(choice===actual) correct++;
      numberEl.textContent=next;
      helpEl.textContent=choice===actual?'¡Correcto!':choice===null?'Tiempo agotado':`Era ${actual==='higher'?'MAYOR':'MENOR'}`;
      scoreEl.textContent=`${correct} acierto${correct===1?'':'s'}`;
      current=next; round++;
      setTimeout(nextRound,520);
    }

    function press(e){ const b=e.target.closest('[data-choice]'); if(b) resolve(b.dataset.choice); }
    container.addEventListener('pointerdown',press);

    return {
      start(){ startedAt=performance.now(); nextRound(); },
      destroy(){ finished=true; clearTimeout(timer); container.removeEventListener('pointerdown',press); }
    };
  });
})();