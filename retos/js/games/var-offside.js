(() => {
  'use strict';

  window.PatxGameRegistry.register('var-offside', ({ container, config = {}, seed = 1, onFinish }) => {
    const rounds = Number(config.rounds || 8);
    const timeoutMs = Number(config.round_timeout_ms || 4500);
    let state = Number(seed) || 1;
    let round = 0, correct = 0, startedAt = 0, finished = false, timer = 0;
    let current = null;

    function rnd(){ state=(state*1664525+1013904223)>>>0; return state/4294967296; }
    function makeCase(){
      const defender = .54 + rnd()*.24;
      const offside = rnd()>.5;
      const gap = .035 + rnd()*.10;
      const attacker = Math.max(.50, Math.min(.92, defender + (offside ? gap : -gap)));
      const ball = .30 + rnd()*.12;
      return { defender, attacker, ball, offside };
    }

    container.innerHTML = `
      <div class="football-surface var-surface">
        <div class="football-topline"><span data-round>Jugada 1 / ${rounds}</span><strong><span data-score>0</span> aciertos</strong></div>
        <div class="var-pitch" data-pitch>
          <div class="halfway-line"></div>
          <div class="var-line" data-line></div>
          <div class="var-player defender" data-defender>D</div>
          <div class="var-player attacker" data-attacker>A</div>
          <div class="var-ball" data-ball>⚽</div>
        </div>
        <div class="var-question" data-help>¿Fuera de juego?</div>
        <div class="var-actions">
          <button type="button" data-answer="yes">FUERA DE JUEGO</button>
          <button type="button" data-answer="no">POSICIÓN LEGAL</button>
        </div>
        <div class="var-note">Versión simplificada: solo importa la posición del atacante respecto al último defensor.</div>
      </div>`;

    const roundEl=container.querySelector('[data-round]');
    const scoreEl=container.querySelector('[data-score]');
    const help=container.querySelector('[data-help]');
    const line=container.querySelector('[data-line]');
    const defender=container.querySelector('[data-defender]');
    const attacker=container.querySelector('[data-attacker]');
    const ball=container.querySelector('[data-ball]');
    const buttons=[...container.querySelectorAll('[data-answer]')];

    function drawCase(){
      current=makeCase();
      line.style.left=`${current.defender*100}%`;
      defender.style.left=`${current.defender*100}%`;
      defender.style.top=`${28+rnd()*44}%`;
      attacker.style.left=`${current.attacker*100}%`;
      attacker.style.top=`${24+rnd()*50}%`;
      ball.style.left=`${current.ball*100}%`;
      ball.style.top=`${35+rnd()*30}%`;
      help.textContent='¿Fuera de juego?';
      buttons.forEach(b=>{b.disabled=false;b.classList.remove('right','wrong');});
      clearTimeout(timer);
      timer=setTimeout(()=>answer(null),timeoutMs);
    }

    function finish(){
      if(finished) return;
      finished=true;
      clearTimeout(timer);
      buttons.forEach(b=>b.disabled=true);
      help.textContent='Resultado registrando…';
      onFinish({score:correct,duration:performance.now()-startedAt,metadata:{rounds,correct}});
    }

    function next(){
      round+=1;
      if(round>=rounds) return setTimeout(finish,450);
      roundEl.textContent=`Jugada ${round+1} / ${rounds}`;
      setTimeout(drawCase,420);
    }

    function answer(value){
      if(finished||!current) return;
      clearTimeout(timer);
      buttons.forEach(b=>b.disabled=true);
      const expected=current.offside?'yes':'no';
      const ok=value===expected;
      if(ok){correct+=1;scoreEl.textContent=correct;help.textContent='Correcto';}
      else help.textContent=value===null?'Tiempo agotado':expected==='yes'?'Era fuera de juego':'Era posición legal';
      buttons.forEach(b=>{
        if(b.dataset.answer===expected) b.classList.add('right');
        else if(b.dataset.answer===value) b.classList.add('wrong');
      });
      current=null;
      next();
    }

    buttons.forEach(b=>b.addEventListener('click',()=>answer(b.dataset.answer)));

    return {
      start(){ startedAt=performance.now(); drawCase(); },
      destroy(){ finished=true; clearTimeout(timer); }
    };
  });
})();