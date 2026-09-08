(() => {
  'use strict';

  window.PatxGameRegistry.register('top-bins', ({ container, config = {}, seed = 1, onFinish }) => {
    const shots = Number(config.shots || 5);
    const maxScore = Number(config.max_score || 5000);
    let state = Number(seed) || 1;
    let shot = 0, total = 0, startedAt = 0, finished = false;
    let target = { x: .2, y: .2 };

    function rnd(){ state=(state*1664525+1013904223)>>>0; return state/4294967296; }
    function nextTarget(){
      const spots = [
        [.12,.16],[.88,.16],[.18,.28],[.82,.28],[.28,.14],[.72,.14]
      ];
      const p = spots[Math.floor(rnd()*spots.length)];
      target = { x:p[0], y:p[1] };
    }

    container.innerHTML = `
      <div class="football-surface shooting-surface">
        <div class="football-topline"><span data-shot>Tiro 1 / ${shots}</span><strong><span data-score>0</span> pts</strong></div>
        <div class="goal-frame" data-goal>
          <div class="goal-net"></div>
          <div class="shoot-target" data-target></div>
          <div class="shot-mark" data-mark hidden></div>
        </div>
        <div class="football-hint" data-help>Apunta al centro de la diana</div>
      </div>`;

    const goal = container.querySelector('[data-goal]');
    const targetEl = container.querySelector('[data-target]');
    const mark = container.querySelector('[data-mark]');
    const shotEl = container.querySelector('[data-shot]');
    const scoreEl = container.querySelector('[data-score]');
    const help = container.querySelector('[data-help]');

    function drawTarget(){
      nextTarget();
      targetEl.style.left = `${target.x*100}%`;
      targetEl.style.top = `${target.y*100}%`;
      mark.hidden = true;
    }

    function finish(){
      if(finished) return;
      finished = true;
      help.textContent = 'Resultado registrando…';
      onFinish({ score: Math.min(maxScore, Math.round(total)), duration: performance.now()-startedAt, metadata:{shots,total:Math.round(total)} });
    }

    function press(event){
      if(finished || shot >= shots) return;
      event.preventDefault();
      const r = goal.getBoundingClientRect();
      const x = Math.max(0,Math.min(1,(event.clientX-r.left)/r.width));
      const y = Math.max(0,Math.min(1,(event.clientY-r.top)/r.height));
      const dx = (x-target.x)*r.width;
      const dy = (y-target.y)*r.height;
      const dist = Math.hypot(dx,dy);
      const scale = Math.max(70, Math.min(r.width,r.height)*.42);
      const points = Math.max(0, Math.round(1000*(1-Math.min(1,dist/scale))));
      total += points;
      shot += 1;
      mark.hidden = false;
      mark.style.left = `${x*100}%`;
      mark.style.top = `${y*100}%`;
      scoreEl.textContent = Math.round(total);
      help.textContent = points > 850 ? '¡A la escuadra!' : points > 550 ? 'Buen tiro' : points > 200 ? 'Rozando' : 'Muy lejos';
      if(shot >= shots){
        shotEl.textContent = `Tiro ${shots} / ${shots}`;
        return setTimeout(finish,450);
      }
      shotEl.textContent = `Tiro ${shot+1} / ${shots}`;
      setTimeout(drawTarget,420);
    }

    goal.addEventListener('pointerdown',press,{passive:false});

    return {
      start(){ startedAt=performance.now(); drawTarget(); },
      destroy(){ finished=true; goal.removeEventListener('pointerdown',press); }
    };
  });
})();