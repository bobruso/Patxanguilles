(() => {
  'use strict';

  window.PatxGameRegistry.register('goalkeeper', ({ container, config = {}, seed = 1, onFinish }) => {
    const shots = Number(config.shots || 5);
    const maxScore = Number(config.max_score || 5);
    const reactionMs = Number(config.reaction_ms || 850);
    let state = Number(seed) || 1;
    let shot = 0, saves = 0, startedAt = 0, finished = false, active = false;
    let target = 2, shotStarted = 0, timer = 0, raf = 0;
    const zones = [
      [.18,.24],[.5,.2],[.82,.24],[.18,.68],[.5,.64],[.82,.68]
    ];

    function rnd(){ state=(state*1664525+1013904223)>>>0; return state/4294967296; }

    container.innerHTML = `
      <div class="football-surface keeper-surface">
        <div class="football-topline"><span data-shot>Disparo 1 / ${shots}</span><strong><span data-score>0</span> paradas</strong></div>
        <div class="goal-frame keeper-goal" data-goal>
          <div class="goal-net"></div>
          <div class="keeper-player">🧤</div>
          <div class="incoming-ball" data-ball>⚽</div>
        </div>
        <div class="football-hint" data-help>Espera el disparo y toca la zona donde va el balón</div>
      </div>`;

    const goal=container.querySelector('[data-goal]');
    const ball=container.querySelector('[data-ball]');
    const shotEl=container.querySelector('[data-shot]');
    const scoreEl=container.querySelector('[data-score]');
    const help=container.querySelector('[data-help]');

    function finish(){
      if(finished) return;
      finished=true;
      active=false;
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      help.textContent='Resultado registrando…';
      onFinish({score:Math.min(maxScore,saves),duration:performance.now()-startedAt,metadata:{shots,saves}});
    }

    function draw(now){
      if(!active||finished) return;
      const p=Math.max(0,Math.min(1,(now-shotStarted)/reactionMs));
      const [tx,ty]=zones[target];
      const x=.5+(tx-.5)*p;
      const y=.92+(ty-.92)*p;
      ball.style.left=`${x*100}%`;
      ball.style.top=`${y*100}%`;
      ball.style.transform=`translate(-50%,-50%) scale(${.7+.55*p})`;
      if(p>=1){
        active=false;
        help.textContent='Gol.';
        return advance();
      }
      raf=requestAnimationFrame(draw);
    }

    function beginShot(){
      if(finished) return;
      target=Math.floor(rnd()*zones.length);
      ball.hidden=false;
      ball.style.left='50%';
      ball.style.top='92%';
      help.textContent='¡Ahora!';
      active=true;
      shotStarted=performance.now();
      raf=requestAnimationFrame(draw);
    }

    function advance(){
      cancelAnimationFrame(raf);
      ball.hidden=true;
      shot+=1;
      if(shot>=shots) return setTimeout(finish,450);
      shotEl.textContent=`Disparo ${shot+1} / ${shots}`;
      timer=setTimeout(beginShot,900+Math.floor(rnd()*650));
    }

    function press(event){
      if(!active||finished) return;
      event.preventDefault();
      const r=goal.getBoundingClientRect();
      const x=Math.max(0,Math.min(1,(event.clientX-r.left)/r.width));
      const y=Math.max(0,Math.min(1,(event.clientY-r.top)/r.height));
      let nearest=0,best=Infinity;
      zones.forEach((z,i)=>{const d=Math.hypot((x-z[0])*r.width,(y-z[1])*r.height);if(d<best){best=d;nearest=i;}});
      active=false;
      cancelAnimationFrame(raf);
      const saved=nearest===target;
      if(saved){saves+=1;scoreEl.textContent=saves;help.textContent='¡Paradón!';}
      else help.textContent='No llegaste.';
      const [tx,ty]=zones[target];
      ball.style.left=`${tx*100}%`;
      ball.style.top=`${ty*100}%`;
      advance();
    }

    goal.addEventListener('pointerdown',press,{passive:false});

    return {
      start(){ startedAt=performance.now(); ball.hidden=true; timer=setTimeout(beginShot,850+Math.floor(rnd()*500)); },
      destroy(){ finished=true; active=false; clearTimeout(timer); cancelAnimationFrame(raf); goal.removeEventListener('pointerdown',press); }
    };
  });
})();