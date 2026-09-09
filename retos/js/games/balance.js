(() => {
  'use strict';
  window.PatxGameRegistry.register('balance', ({container,config={},seed=1,onFinish}) => {
    const duration=Number(config.duration_ms||12000),maxScore=Number(config.max_score||12000);
    let state=Number(seed)||1,pos=0,vel=0,drift=0,held=0,startedAt=0,last=0,inZone=0,finished=false,raf=0;
    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}
    container.innerHTML=`<div class="game-surface balance-surface"><div class="game-kicker">BALANCE</div><div class="round-counter" data-time>12.0 s</div><div class="balance-track"><div class="balance-safe"></div><div class="balance-needle" data-needle></div></div><div class="balance-actions"><button type="button" data-dir="-1">←</button><button type="button" data-dir="1">→</button></div><div class="game-help">Mantén la aguja dentro de la zona central.</div><div class="hl-score" data-score>0 ms</div></div>`;
    const needle=container.querySelector('[data-needle]'),timeEl=container.querySelector('[data-time]'),scoreEl=container.querySelector('[data-score]'),buttons=[...container.querySelectorAll('[data-dir]')];
    function finish(){if(finished)return;finished=true;cancelAnimationFrame(raf);const score=Math.min(maxScore,Math.round(inZone));buttons.forEach(b=>b.disabled=true);onFinish({score,duration:performance.now()-startedAt,metadata:{in_zone_ms:score}});}
    function down(e){const b=e.target.closest('[data-dir]');if(b){held=Number(b.dataset.dir);b.setPointerCapture?.(e.pointerId);}}
    function up(){held=0;}
    function loop(now){if(finished)return;const elapsed=now-startedAt;if(elapsed>=duration)return finish();const dt=Math.min((now-last)/1000,.04);last=now;if(Math.floor(elapsed/900)!==Math.floor((elapsed-dt*1000)/900))drift=(rnd()-.5)*.9;vel+=((held*1.8)+drift-pos*.7)*dt;vel*=.985;pos+=vel*dt;pos=Math.max(-1,Math.min(1,pos));if(Math.abs(pos)<.18)inZone+=dt*1000;needle.style.left=`${50+pos*45}%`;timeEl.textContent=`${((duration-elapsed)/1000).toFixed(1)} s`;scoreEl.textContent=`${Math.round(inZone)} ms`;raf=requestAnimationFrame(loop);}
    container.addEventListener('pointerdown',down);container.addEventListener('pointerup',up);container.addEventListener('pointercancel',up);container.addEventListener('pointerleave',up);
    return{start(){startedAt=last=performance.now();drift=(rnd()-.5)*.8;raf=requestAnimationFrame(loop);},destroy(){finished=true;cancelAnimationFrame(raf);container.removeEventListener('pointerdown',down);container.removeEventListener('pointerup',up);container.removeEventListener('pointercancel',up);container.removeEventListener('pointerleave',up);}};
  });
})();