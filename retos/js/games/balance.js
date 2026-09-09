(() => {
  'use strict';

  window.PatxGameRegistry.register('balance', ({container,config={},seed=1,onFinish}) => {
    const duration=Number(config.duration_ms||12000),maxScore=Number(config.max_score||12000);
    let state=Number(seed)||1,pos=0,vel=0,drift=0,held=0,startedAt=0,last=0,inZone=0,finished=false,raf=0;
    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}

    container.innerHTML=`
      <div class="game-surface balance-surface">
        <div class="game-kicker">BALANCE</div>
        <div class="balance-head"><div class="round-counter" data-time>12.0 s</div><div class="round-counter" data-score>0%</div></div>
        <div class="balance-status" data-status>MANTÉN EL CENTRO</div>
        <div class="balance-track"><div class="balance-safe"><span>ZONA SEGURA</span></div><div class="balance-needle" data-needle></div></div>
        <div class="balance-actions"><button type="button" data-dir="-1">← CORRIGE</button><button type="button" data-dir="1">CORRIGE →</button></div>
        <div class="game-help">Mantén pulsado izquierda o derecha para compensar el movimiento.</div>
      </div>`;

    const needle=container.querySelector('[data-needle]'),timeEl=container.querySelector('[data-time]'),scoreEl=container.querySelector('[data-score]'),statusEl=container.querySelector('[data-status]'),track=container.querySelector('.balance-track'),buttons=[...container.querySelectorAll('[data-dir]')];

    function finish(){if(finished)return;finished=true;cancelAnimationFrame(raf);const score=Math.min(maxScore,Math.round(inZone));buttons.forEach(b=>b.disabled=true);onFinish({score,duration:performance.now()-startedAt,metadata:{in_zone_ms:score}});}
    function down(e){const b=e.target.closest('[data-dir]');if(b){held=Number(b.dataset.dir);b.classList.add('is-held');b.setPointerCapture?.(e.pointerId);}}
    function up(){held=0;buttons.forEach(b=>b.classList.remove('is-held'));}

    function loop(now){
      if(finished)return;const elapsed=now-startedAt;if(elapsed>=duration)return finish();const dt=Math.min((now-last)/1000,.04);last=now;
      if(Math.floor(elapsed/900)!==Math.floor((elapsed-dt*1000)/900))drift=(rnd()-.5)*.9;
      vel+=((held*1.8)+drift-pos*.7)*dt;vel*=.985;pos+=vel*dt;pos=Math.max(-1,Math.min(1,pos));
      const safe=Math.abs(pos)<.18;if(safe)inZone+=dt*1000;needle.style.left=`${50+pos*45}%`;track.classList.toggle('is-safe',safe);track.classList.toggle('is-danger',Math.abs(pos)>.72);
      timeEl.textContent=`${((duration-elapsed)/1000).toFixed(1)} s`;scoreEl.textContent=`${Math.round((inZone/Math.max(elapsed,1))*100)}%`;statusEl.textContent=safe?'BIEN · AGUANTA':Math.abs(pos)>.72?'¡CORRIGE YA!':'VUELVE AL CENTRO';statusEl.className=`balance-status ${safe?'safe':Math.abs(pos)>.72?'danger':'warn'}`;
      raf=requestAnimationFrame(loop);
    }

    container.addEventListener('pointerdown',down);container.addEventListener('pointerup',up);container.addEventListener('pointercancel',up);container.addEventListener('pointerleave',up);
    return{start(){startedAt=last=performance.now();drift=(rnd()-.5)*.8;raf=requestAnimationFrame(loop);},destroy(){finished=true;cancelAnimationFrame(raf);container.removeEventListener('pointerdown',down);container.removeEventListener('pointerup',up);container.removeEventListener('pointercancel',up);container.removeEventListener('pointerleave',up);}};
  });
})();