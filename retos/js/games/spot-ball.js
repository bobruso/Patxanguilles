(() => {
  'use strict';

  window.PatxGameRegistry.register('spot-ball', ({ container, config = {}, seed = 1, onFinish }) => {
    const revealMs = Number(config.reveal_ms || 1800);
    const maxError = Number(config.max_error || 1000);
    let state = Number(seed) || 1;
    let startedAt = 0, hiddenAt = 0, finished = false, canGuess = false, timer = 0;

    function rnd(){ state=(state*1664525+1013904223)>>>0; return state/4294967296; }
    const target = { x:.16+rnd()*.68, y:.20+rnd()*.58 };
    const players = Array.from({length:7},(_,i)=>({x:.08+rnd()*.84,y:.10+rnd()*.78,team:i%2}));

    container.innerHTML = `
      <div class="spotball-surface">
        <div class="football-topline"><span>SPOT THE BALL</span><strong data-phase>MEMORIZA</strong></div>
        <div class="spotball-pitch" data-pitch>
          ${players.map((p,i)=>`<div class="spot-player team-${p.team}" style="left:${p.x*100}%;top:${p.y*100}%">${i+1}</div>`).join('')}
          <div class="spot-ball" data-ball style="left:${target.x*100}%;top:${target.y*100}%">⚽</div>
          <div class="spot-guess" data-guess hidden></div>
        </div>
        <div class="football-hint" data-help>Recuerda exactamente dónde está el balón.</div>
      </div>`;

    const pitch=container.querySelector('[data-pitch]');
    const ball=container.querySelector('[data-ball]');
    const guess=container.querySelector('[data-guess]');
    const phase=container.querySelector('[data-phase]');
    const help=container.querySelector('[data-help]');

    function hideBall(){
      if(finished)return;
      ball.hidden=true;canGuess=true;hiddenAt=performance.now();phase.textContent='SEÑALA';help.textContent='¿Dónde estaba? Toca el punto exacto.';
    }

    function press(event){
      if(!canGuess||finished)return;
      event.preventDefault();
      const r=pitch.getBoundingClientRect();
      const x=Math.max(0,Math.min(1,(event.clientX-r.left)/r.width));
      const y=Math.max(0,Math.min(1,(event.clientY-r.top)/r.height));
      const dx=(x-target.x)*r.width,dy=(y-target.y)*r.height;
      const diag=Math.hypot(r.width,r.height)||1;
      const error=Math.min(maxError,(Math.hypot(dx,dy)/diag)*2000);
      guess.hidden=false;guess.style.left=`${x*100}%`;guess.style.top=`${y*100}%`;
      ball.hidden=false;ball.classList.add('reveal-answer');
      canGuess=false;finished=true;phase.textContent='RESULTADO';
      help.textContent=error<30?'¡Clavado!':error<100?'Muy cerca':error<250?'Cerca':'Lejos';
      setTimeout(()=>onFinish({score:error,duration:performance.now()-startedAt,metadata:{guess_x:Number(x.toFixed(4)),guess_y:Number(y.toFixed(4)),target_x:Number(target.x.toFixed(4)),target_y:Number(target.y.toFixed(4)),guess_delay_ms:Math.round(performance.now()-hiddenAt)}}),450);
    }

    pitch.addEventListener('pointerdown',press,{passive:false});
    return {
      start(){startedAt=performance.now();timer=setTimeout(hideBall,revealMs);},
      destroy(){finished=true;clearTimeout(timer);pitch.removeEventListener('pointerdown',press);}
    };
  });
})();