(() => {
  'use strict';

  window.PatxGameRegistry.register('penalties', ({ container, config = {}, seed = 1, onFinish }) => {
    const shots = Number(config.shots || 5);
    const maxScore = Number(config.max_score || 5000);
    let state = Number(seed) || 1;
    let shot = 0, total = 0, startedAt = 0, finished = false;
    let keeperZone = 2;

    function rnd(){ state=(state*1664525+1013904223)>>>0; return state/4294967296; }
    function zoneFor(x,y){
      const col = x < .33 ? 0 : x > .66 ? 2 : 1;
      const row = y < .52 ? 0 : 1;
      return row*3+col;
    }
    function setupShot(){
      keeperZone = Math.floor(rnd()*6);
      keeper.className = `penalty-keeper keeper-zone-${keeperZone}`;
      keeper.textContent = '🧤';
      mark.hidden = true;
      help.textContent = 'Toca dónde quieres colocar el penalti';
    }

    container.innerHTML = `
      <div class="football-surface shooting-surface">
        <div class="football-topline"><span data-shot>Penalti 1 / ${shots}</span><strong><span data-score>0</span> pts</strong></div>
        <div class="goal-frame penalty-goal" data-goal>
          <div class="goal-net"></div>
          <div class="penalty-keeper" data-keeper>🧤</div>
          <div class="shot-mark" data-mark hidden></div>
        </div>
        <div class="penalty-ball">⚽</div>
        <div class="football-hint" data-help>El portero elegirá una zona. Tú elige la tuya.</div>
      </div>`;

    const goal = container.querySelector('[data-goal]');
    const keeper = container.querySelector('[data-keeper]');
    const mark = container.querySelector('[data-mark]');
    const shotEl = container.querySelector('[data-shot]');
    const scoreEl = container.querySelector('[data-score]');
    const help = container.querySelector('[data-help]');

    function finish(){
      if(finished) return;
      finished = true;
      help.textContent = 'Resultado registrando…';
      onFinish({ score: Math.min(maxScore, Math.round(total)), duration: performance.now()-startedAt, metadata:{shots,total:Math.round(total)} });
    }

    function press(event){
      if(finished || shot>=shots) return;
      event.preventDefault();
      const r=goal.getBoundingClientRect();
      const x=Math.max(0,Math.min(1,(event.clientX-r.left)/r.width));
      const y=Math.max(0,Math.min(1,(event.clientY-r.top)/r.height));
      const zone=zoneFor(x,y);
      const saved=zone===keeperZone;
      const cornerDistance=Math.hypot(Math.min(x,1-x), y);
      const cornerBonus=Math.max(0,1-Math.min(1,cornerDistance/.72));
      const points=saved?0:Math.round(600+400*cornerBonus);
      total+=points;
      shot+=1;
      mark.hidden=false;
      mark.style.left=`${x*100}%`;
      mark.style.top=`${y*100}%`;
      mark.textContent=saved?'✋':'⚽';
      keeper.classList.add('is-diving');
      scoreEl.textContent=Math.round(total);
      help.textContent=saved?'¡Parada!':points>900?'¡Golazo!':points>760?'¡Gol!':'Dentro';
      if(shot>=shots){
        shotEl.textContent=`Penalti ${shots} / ${shots}`;
        return setTimeout(finish,650);
      }
      shotEl.textContent=`Penalti ${shot+1} / ${shots}`;
      setTimeout(()=>{ keeper.classList.remove('is-diving'); setupShot(); },650);
    }

    goal.addEventListener('pointerdown',press,{passive:false});

    return {
      start(){ startedAt=performance.now(); setupShot(); },
      destroy(){ finished=true; goal.removeEventListener('pointerdown',press); }
    };
  });
})();