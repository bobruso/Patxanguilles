(() => {
  'use strict';

  window.PatxGameRegistry.register('center-hit', ({ container, config = {}, seed = 1, onFinish }) => {
    const speed=Number(config.speed||0.72);
    let startAt=0,raf=0,finished=false,currentPosition=0;
    const phase=((Number(seed)||0)%1000)/1000;

    container.innerHTML=`
      <div class="game-surface center-hit-surface" role="button" tabindex="0" aria-label="Juego de precisión">
        <div class="game-kicker">CLAVA EL CENTRO</div>
        <div class="center-copy">DETÉN EL MARCADOR</div>
        <div class="center-track-wrap">
          <div class="center-track">
            <div class="center-zone"><span>PERFECTO</span></div>
            <div class="center-line"></div>
            <div class="center-marker" data-marker></div>
          </div>
        </div>
        <div class="center-feedback" data-feedback>Cuanto más cerca del centro, mejor.</div>
        <div class="game-help">El marcador rebota de lado a lado. Toca una sola vez.</div>
        <div class="game-tap" data-tap>TOCA PARA DETENER</div>
      </div>`;

    const surface=container.querySelector('.game-surface');
    const marker=container.querySelector('[data-marker]');
    const feedback=container.querySelector('[data-feedback]');
    const tap=container.querySelector('[data-tap]');

    function positionAt(elapsedMs){
      const cycles=elapsedMs/1000*speed+phase;
      const tri=1-Math.abs(((cycles%2)+2)%2-1);
      return Math.max(0,Math.min(1,tri));
    }

    function draw(now){
      if(finished)return;
      const elapsed=now-startAt;
      currentPosition=positionAt(elapsed);
      marker.style.left=`${currentPosition*100}%`;
      raf=requestAnimationFrame(draw);
    }

    function press(event){
      event.preventDefault();
      if(finished)return;
      const now=performance.now();
      const duration=now-startAt;
      currentPosition=positionAt(duration);
      const score=Math.min(1000,Math.abs(currentPosition-.5)*2000);
      finished=true;cancelAnimationFrame(raf);
      marker.style.left=`${currentPosition*100}%`;
      surface.classList.add(score<15?'is-perfect':score<80?'is-near':'is-miss');
      marker.classList.add('is-stopped');
      feedback.textContent=score<15?'¡CLAVADO!':score<80?'MUY CERCA':`Error: ${Math.round(score)}`;
      tap.textContent='RESULTADO REGISTRANDO…';
      onFinish({score,duration,metadata:{position:Number(currentPosition.toFixed(5)),error:Math.round(score),speed,phase:Number(phase.toFixed(4))}});
    }

    function key(event){if(event.key==='Enter'||event.key===' ')press(event);}

    surface.addEventListener('pointerdown',press,{passive:false});
    surface.addEventListener('keydown',key);

    return{
      start(){startAt=performance.now();surface.focus({preventScroll:true});raf=requestAnimationFrame(draw);},
      destroy(){cancelAnimationFrame(raf);surface.removeEventListener('pointerdown',press);surface.removeEventListener('keydown',key);}
    };
  });
})();