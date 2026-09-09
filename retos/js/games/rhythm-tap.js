(() => {
  'use strict';
  window.PatxGameRegistry.register('rhythm-tap', ({container,config={},onFinish}) => {
    const beats=Number(config.beats||12), interval=Number(config.interval_ms||700), maxScore=Number(config.max_score||12000);
    let startedAt=0, baseAt=0, currentBeat=0, taps=0, errorSum=0, finished=false, raf=0, timeout=0, tappedForBeat=false;
    container.innerHTML=`<div class="game-surface rhythm-surface"><div class="game-kicker">RHYTHM TAP</div><div class="round-counter" data-round>Preparado</div><button class="rhythm-pad" type="button" data-pad><span data-pulse></span></button><div class="game-help" data-help>Toca cuando el pulso llegue al centro.</div><div class="hl-score" data-score>0 / ${beats}</div></div>`;
    const pad=container.querySelector('[data-pad]'),pulse=container.querySelector('[data-pulse]'),roundEl=container.querySelector('[data-round]'),help=container.querySelector('[data-help]'),scoreEl=container.querySelector('[data-score]');
    function finish(){if(finished)return;finished=true;cancelAnimationFrame(raf);clearTimeout(timeout);pad.disabled=true;const score=Math.max(maxScore-Math.round(errorSum),0);onFinish({score,duration:performance.now()-startedAt,metadata:{taps,error_sum_ms:Math.round(errorSum),beats}});}
    function advance(now){if(finished)return;const elapsed=now-baseAt;const beat=Math.floor(elapsed/interval);if(beat>=beats){if(!tappedForBeat&&currentBeat<beats)errorSum+=1000;return finish();}if(beat!==currentBeat){if(currentBeat>=0&&!tappedForBeat)errorSum+=1000;currentBeat=beat;tappedForBeat=false;roundEl.textContent=`Pulso ${beat+1} / ${beats}`;}const phase=(elapsed%interval)/interval;const scale=.35+Math.sin(Math.PI*phase)*.9;pulse.style.transform=`scale(${scale})`;raf=requestAnimationFrame(advance);}
    function tap(){if(finished||tappedForBeat)return;const now=performance.now(), ideal=baseAt+currentBeat*interval+interval/2;const err=Math.abs(now-ideal);errorSum+=Math.min(err,1000);tappedForBeat=true;taps++;scoreEl.textContent=`${taps} / ${beats}`;help.textContent=err<90?'PERFECTO':err<180?'BIEN':'FUERA DE TIEMPO';}
    pad.addEventListener('pointerdown',tap);
    return{start(){startedAt=performance.now();baseAt=startedAt+500;currentBeat=-1;timeout=setTimeout(()=>{raf=requestAnimationFrame(advance);},450);},destroy(){finished=true;cancelAnimationFrame(raf);clearTimeout(timeout);pad.removeEventListener('pointerdown',tap);}};
  });
})();