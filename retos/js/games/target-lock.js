(() => {
  'use strict';
  window.PatxGameRegistry.register('target-lock', ({container,config={},seed=1,onFinish}) => {
    const rounds=Number(config.rounds||10),maxScore=Number(config.max_score||10000);
    let round=0,points=0,phase=0,startedAt=0,roundAt=0,finished=false,raf=0,timer=0;
    container.innerHTML=`<div class="game-surface lock-surface"><div class="game-kicker">TARGET LOCK</div><div class="round-counter" data-round></div><button type="button" class="lock-target" data-target><span class="lock-core"></span><span class="lock-ring" data-ring></span></button><div class="game-help" data-help>Pulsa cuando el anillo coincida con el objetivo.</div><div class="hl-score" data-score>0 pts</div></div>`;
    const target=container.querySelector('[data-target]'),ring=container.querySelector('[data-ring]'),roundEl=container.querySelector('[data-round]'),help=container.querySelector('[data-help]'),scoreEl=container.querySelector('[data-score]');
    function finish(){if(finished)return;finished=true;cancelAnimationFrame(raf);clearTimeout(timer);target.disabled=true;onFinish({score:points,duration:performance.now()-startedAt,metadata:{points,rounds}});}
    function animate(now){if(finished)return;const t=(now-roundAt)/1000;phase=(Math.sin(t*5)+1)/2;const scale=.55+phase*1.15;ring.style.transform=`translate(-50%,-50%) scale(${scale})`;raf=requestAnimationFrame(animate);}
    function next(){if(finished)return;if(round>=rounds)return finish();roundEl.textContent=`Ronda ${round+1} / ${rounds}`;help.textContent='Espera el momento exacto';target.disabled=false;roundAt=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(animate);clearTimeout(timer);timer=setTimeout(()=>resolve(null),2200);}
    function resolve(){if(finished||target.disabled)return;target.disabled=true;clearTimeout(timer);cancelAnimationFrame(raf);const error=Math.abs(phase-.5);const gained=Math.max(0,Math.round(1000-error*2000));points=Math.min(maxScore,points+gained);help.textContent=gained>850?'PERFECTO':gained>550?'BIEN':gained>200?'CERCA':'FALLO';scoreEl.textContent=`${points} pts`;round++;setTimeout(next,350);}
    target.addEventListener('pointerdown',resolve);
    return{start(){startedAt=performance.now();next();},destroy(){finished=true;cancelAnimationFrame(raf);clearTimeout(timer);target.removeEventListener('pointerdown',resolve);}};
  });
})();