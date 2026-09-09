(() => {
  'use strict';

  window.PatxGameRegistry.register('center-hit', ({ container, config = {}, seed = 1, onFinish }) => {
    const startSpeed=Number(config.speed||0.72);
    const speedMultiplier=Number(config.speed_multiplier||1.11);
    const successError=Number(config.success_error_max||150);
    const maxStreak=Number(config.max_streak||100);
    const phase=((Number(seed)||0)%1000)/1000;
    let roundStart=0,startedAt=0,raf=0,finished=false,currentPosition=0,streak=0,speed=startSpeed,locked=false;

    container.innerHTML=`
      <div class="game-surface center-hit-surface" role="button" tabindex="0" aria-label="Juego de precisión infinito">
        <div class="game-kicker">CLAVA EL CENTRO</div>
        <div class="center-run-head">
          <div class="round-counter" data-streak>0 seguidos</div>
          <div class="round-counter" data-speed>Velocidad ×1.00</div>
        </div>
        <div class="center-copy">ACIERTO = SIGUES · FALLO = FIN</div>
        <div class="center-track-wrap">
          <div class="center-track">
            <div class="center-zone"><span>ACIERTO</span></div>
            <div class="center-line"></div>
            <div class="center-marker" data-marker></div>
          </div>
        </div>
        <div class="center-feedback" data-feedback>Detén el marcador dentro de la zona central.</div>
        <div class="game-help" data-help>Cada acierto acelera la barra.</div>
        <div class="game-tap" data-tap>TOCA PARA DETENER</div>
      </div>`;

    const surface=container.querySelector('.game-surface');
    const marker=container.querySelector('[data-marker]');
    const feedback=container.querySelector('[data-feedback]');
    const help=container.querySelector('[data-help]');
    const tap=container.querySelector('[data-tap]');
    const streakEl=container.querySelector('[data-streak]');
    const speedEl=container.querySelector('[data-speed]');

    function positionAt(elapsedMs){
      const cycles=elapsedMs/1000*speed+phase;
      const tri=1-Math.abs(((cycles%2)+2)%2-1);
      return Math.max(0,Math.min(1,tri));
    }

    function draw(now){
      if(finished||locked)return;
      currentPosition=positionAt(now-roundStart);
      marker.style.left=`${currentPosition*100}%`;
      raf=requestAnimationFrame(draw);
    }

    function startRound(){
      if(finished)return;
      locked=false;
      surface.classList.remove('is-perfect','is-near','is-miss','is-round-success');
      marker.classList.remove('is-stopped');
      feedback.textContent='Detén el marcador dentro de la zona central.';
      tap.textContent='TOCA PARA DETENER';
      roundStart=performance.now();
      raf=requestAnimationFrame(draw);
    }

    function finish(finalError){
      if(finished)return;
      finished=true;locked=true;cancelAnimationFrame(raf);
      surface.classList.add('is-miss');
      feedback.textContent=streak===0?'FALLO · 0 seguidos':`FALLO · racha de ${streak}`;
      help.textContent=`Error final: ${Math.round(finalError)}. La próxima vez, más cerca del centro.`;
      tap.textContent='FIN';
      onFinish({score:streak,duration:performance.now()-startedAt,metadata:{streak,final_error:Math.round(finalError),speed:Number(speed.toFixed(4)),success_error_max:successError}});
    }

    function press(event){
      event.preventDefault();
      if(finished||locked)return;
      locked=true;cancelAnimationFrame(raf);
      const now=performance.now();
      currentPosition=positionAt(now-roundStart);
      const error=Math.min(1000,Math.abs(currentPosition-.5)*2000);
      marker.style.left=`${currentPosition*100}%`;
      marker.classList.add('is-stopped');

      if(error>successError) return setTimeout(()=>finish(error),280);

      streak+=1;
      surface.classList.add('is-round-success');
      streakEl.textContent=`${streak} seguido${streak===1?'':'s'}`;
      const ratio=speed/startSpeed;
      speedEl.textContent=`Velocidad ×${ratio.toFixed(2)}`;
      feedback.textContent=error<28?'¡CLAVADO!':error<80?'¡MUY BIEN!':'¡DENTRO!';
      help.textContent='Sube la velocidad…';
      tap.textContent='SIGUES';
      if(streak>=maxStreak){
        finished=true;
        return onFinish({score:streak,duration:performance.now()-startedAt,metadata:{streak,final_error:Math.round(error),speed:Number(speed.toFixed(4)),perfect_run:true}});
      }
      speed=Math.min(startSpeed*Math.pow(speedMultiplier,streak),startSpeed*6);
      speedEl.textContent=`Velocidad ×${(speed/startSpeed).toFixed(2)}`;
      setTimeout(startRound,430);
    }

    function key(event){if(event.key==='Enter'||event.key===' ')press(event);}
    surface.addEventListener('pointerdown',press,{passive:false});
    surface.addEventListener('keydown',key);

    return{
      start(){startedAt=performance.now();surface.focus({preventScroll:true});startRound();},
      destroy(){finished=true;cancelAnimationFrame(raf);surface.removeEventListener('pointerdown',press);surface.removeEventListener('keydown',key);}
    };
  });
})();