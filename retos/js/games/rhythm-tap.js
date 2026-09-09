(() => {
  'use strict';

  window.PatxGameRegistry.register('rhythm-tap', ({container,config={},onFinish}) => {
    const beats=Number(config.beats||12),interval=Number(config.interval_ms||700),maxScore=Number(config.max_score||12000);
    let startedAt=0,baseAt=0,currentBeat=-1,taps=0,errorSum=0,finished=false,raf=0,timeout=0,tappedForBeat=false;

    container.innerHTML=`
      <div class="game-surface rhythm-surface">
        <div class="game-kicker">RHYTHM TAP</div>
        <div class="rhythm-head"><div class="round-counter" data-round>Preparado</div><div class="round-counter" data-score>0 / ${beats}</div></div>
        <div class="rhythm-caption" data-grade>SIGUE EL PULSO</div>
        <button class="rhythm-pad" type="button" data-pad aria-label="Tocar al ritmo" disabled><span class="rhythm-target-ring"></span><span data-pulse></span><span class="rhythm-center-dot"></span></button>
        <div class="rhythm-meter"><div data-meter></div></div>
        <div class="game-help" data-help>Toca cuando el pulso móvil coincida con el centro.</div>
      </div>`;

    const pad=container.querySelector('[data-pad]'),pulse=container.querySelector('[data-pulse]'),roundEl=container.querySelector('[data-round]'),help=container.querySelector('[data-help]'),scoreEl=container.querySelector('[data-score]'),gradeEl=container.querySelector('[data-grade]'),meterEl=container.querySelector('[data-meter]');

    function finish(){if(finished)return;finished=true;cancelAnimationFrame(raf);clearTimeout(timeout);pad.disabled=true;const score=Math.max(maxScore-Math.round(errorSum),0);onFinish({score,duration:performance.now()-startedAt,metadata:{taps,error_sum_ms:Math.round(errorSum),beats}});}

    function advance(now){
      if(finished)return;
      const elapsed=now-baseAt;
      if(elapsed<0){meterEl.style.transform='scaleX(0)';raf=requestAnimationFrame(advance);return;}
      const beat=Math.floor(elapsed/interval);
      if(beat>=beats){if(!tappedForBeat&&currentBeat>=0&&currentBeat<beats)errorSum+=1000;return finish();}
      if(beat!==currentBeat){if(currentBeat>=0&&!tappedForBeat)errorSum+=1000;currentBeat=beat;tappedForBeat=false;pad.disabled=false;roundEl.textContent=`Pulso ${beat+1} / ${beats}`;gradeEl.textContent='ESPERA EL CENTRO';gradeEl.className='rhythm-caption';}
      const phase=(elapsed%interval)/interval,scale=.35+Math.sin(Math.PI*phase)*.9;pulse.style.transform=`scale(${scale})`;meterEl.style.transform=`scaleX(${Math.min(1,Math.max(0,phase))})`;raf=requestAnimationFrame(advance);
    }

    function tap(){
      if(finished||pad.disabled||currentBeat<0||tappedForBeat)return;
      const now=performance.now(),ideal=baseAt+currentBeat*interval+interval/2,err=Math.abs(now-ideal);errorSum+=Math.min(err,1000);tappedForBeat=true;pad.disabled=true;taps++;scoreEl.textContent=`${taps} / ${beats}`;
      const perfect=err<90,good=err<180;gradeEl.className=`rhythm-caption ${perfect?'perfect':good?'good':'miss'}`;gradeEl.textContent=perfect?'PERFECTO':good?'BIEN':'FUERA DE TIEMPO';help.textContent=`Desviación: ${Math.round(err)} ms`;pad.classList.remove('tap-perfect','tap-good','tap-miss');pad.classList.add(perfect?'tap-perfect':good?'tap-good':'tap-miss');setTimeout(()=>pad.classList.remove('tap-perfect','tap-good','tap-miss'),180);
    }

    pad.addEventListener('pointerdown',tap);
    return{start(){startedAt=performance.now();baseAt=startedAt+380;currentBeat=-1;pad.disabled=true;timeout=setTimeout(()=>{raf=requestAnimationFrame(advance);},250);},destroy(){finished=true;cancelAnimationFrame(raf);clearTimeout(timeout);pad.removeEventListener('pointerdown',tap);}};
  });
})();