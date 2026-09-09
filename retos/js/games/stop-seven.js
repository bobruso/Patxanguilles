(() => {
  'use strict';

  window.PatxGameRegistry.register('stop-seven', ({ container, config = {}, onFinish }) => {
    const targetMs=Number(config.target_ms||7000);
    const maxDurationMs=Number(config.max_duration_ms||14000);
    let state='ready',startAt=0,raf=0,finished=false;

    container.innerHTML=`
      <div class="game-surface stop-seven-surface" role="button" tabindex="0" aria-label="Juego Stop 7">
        <div class="game-kicker">STOP 7</div>
        <div class="stop-target">OBJETIVO <strong>${(targetMs/1000).toFixed(3)} s</strong></div>
        <div class="stop-clock" data-clock>
          <div class="stop-clock-label" data-label>LISTO</div>
          <div class="game-big" data-time>${(targetMs/1000).toFixed(3)}</div>
        </div>
        <div class="game-help" data-help>Primer toque: arranca. Segundo toque: para.</div>
        <div class="game-tap" data-tap>TOCA PARA EMPEZAR</div>
      </div>`;

    const surface=container.querySelector('.game-surface');
    const clockEl=container.querySelector('[data-clock]');
    const labelEl=container.querySelector('[data-label]');
    const timeEl=container.querySelector('[data-time]');
    const helpEl=container.querySelector('[data-help]');
    const tapEl=container.querySelector('[data-tap]');

    function draw(now){
      if(state!=='running')return;
      const elapsed=now-startAt;
      if(elapsed<3000){
        timeEl.textContent=(elapsed/1000).toFixed(3);
        labelEl.textContent='CRONÓMETRO';
      }else{
        timeEl.textContent='•••';
        labelEl.textContent='TIEMPO OCULTO';
        clockEl.classList.add('is-hidden-time');
      }
      if(elapsed>=maxDurationMs){stop(maxDurationMs);return;}
      raf=requestAnimationFrame(draw);
    }

    function begin(){
      state='running';startAt=performance.now();
      surface.classList.add('is-running');clockEl.classList.remove('is-hidden-time');
      labelEl.textContent='CRONÓMETRO';timeEl.textContent='0.000';
      helpEl.textContent='A los 3 segundos ocultamos el reloj. Confía en tu percepción.';
      tapEl.textContent='TOCA PARA PARAR';
      raf=requestAnimationFrame(draw);
    }

    function stop(forcedDuration=null){
      if(state!=='running'||finished)return;
      const durationMs=forcedDuration==null?performance.now()-startAt:forcedDuration;
      const score=Math.abs(durationMs-targetMs);
      state='finished';finished=true;cancelAnimationFrame(raf);
      surface.classList.remove('is-running');surface.classList.add('is-finished');
      clockEl.classList.remove('is-hidden-time');
      labelEl.textContent=score<100?'CASI PERFECTO':score<300?'MUY CERCA':'TU TIEMPO';
      timeEl.textContent=(durationMs/1000).toFixed(3);
      helpEl.textContent=`Te has quedado a ${(score/1000).toFixed(3)} s del objetivo.`;
      tapEl.textContent=score<100?'¡CLAVADO!':'RESULTADO REGISTRANDO…';
      onFinish({score,duration:durationMs,metadata:{target_ms:targetMs,stopped_ms:Math.round(durationMs)}});
    }

    function handlePress(event){event.preventDefault();if(state==='ready')begin();else if(state==='running')stop();}
    function handleKey(event){if(event.key==='Enter'||event.key===' ')handlePress(event);}

    surface.addEventListener('pointerdown',handlePress,{passive:false});
    surface.addEventListener('keydown',handleKey);

    return{
      start(){state='ready';surface.focus({preventScroll:true});},
      destroy(){cancelAnimationFrame(raf);surface.removeEventListener('pointerdown',handlePress);surface.removeEventListener('keydown',handleKey);}
    };
  });
})();