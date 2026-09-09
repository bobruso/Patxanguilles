(() => {
  'use strict';

  window.PatxGameRegistry.register('shape-gate', ({container,config={},seed=1,onFinish}) => {
    const rounds=Number(config.rounds||14),timeoutMs=Number(config.round_timeout_ms||2500);
    let state=Number(seed)||1,round=0,correct=0,reactionSum=0,targetPoints='',targetIndex=0,roundAt=0,startedAt=0,timer=0,raf=0,finished=false,locked=false;
    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}
    function clearTimers(){clearTimeout(timer);cancelAnimationFrame(raf);}
    function shuffle(list){for(let i=list.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;}

    container.innerHTML=`
      <div class="game-surface shape-surface complex-shape-surface">
        <div class="game-kicker">SHAPE GATE</div>
        <div class="shape-head"><div class="round-counter" data-round></div><div class="round-counter" data-score>0 aciertos</div></div>
        <div class="shape-timer"><div data-timer></div></div>
        <div class="shape-card" data-card><div class="shape-card-label">¿QUÉ FIGURA ES EXACTAMENTE IGUAL?</div><div class="shape-target" data-target></div></div>
        <div class="shape-actions complex-shape-actions" data-actions></div>
        <div class="game-help" data-help>Fíjate en vértices, entrantes y proporciones.</div>
      </div>`;

    const targetEl=container.querySelector('[data-target]'),card=container.querySelector('[data-card]'),timerEl=container.querySelector('[data-timer]'),roundEl=container.querySelector('[data-round]'),help=container.querySelector('[data-help]'),scoreEl=container.querySelector('[data-score]'),actions=container.querySelector('[data-actions]');

    function svg(points){return `<svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="${points}"/></svg>`;}
    function shapeFor(vertices,irregularity=.18){
      const vals=[];const rot=rnd()*Math.PI*2;
      for(let i=0;i<vertices;i++){const a=rot+i*Math.PI*2/vertices;const alternating=i%2?1-irregularity*.55:1;const jitter=1-(rnd()*irregularity);const r=42*alternating*jitter;vals.push([50+Math.cos(a)*r,50+Math.sin(a)*r]);}
      return vals.map(([x,y])=>`${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    }
    function mutate(points,amount){
      const arr=points.split(' ').map(p=>p.split(',').map(Number));const idx=Math.floor(rnd()*arr.length);const dx=(rnd()>.5?1:-1)*(4+amount*rnd()),dy=(rnd()>.5?1:-1)*(3+amount*rnd());arr[idx][0]=Math.max(7,Math.min(93,arr[idx][0]+dx));arr[idx][1]=Math.max(7,Math.min(93,arr[idx][1]+dy));
      if(arr.length>6&&rnd()>.45){const idx2=(idx+2)%arr.length;arr[idx2][0]=Math.max(7,Math.min(93,arr[idx2][0]-dx*.45));}
      return arr.map(([x,y])=>`${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    }
    function complexity(){return Math.min(11,4+Math.floor(round/2));}
    function tick(now){if(finished||locked)return;const ratio=Math.max(0,1-(now-roundAt)/timeoutMs);timerEl.style.transform=`scaleX(${ratio})`;if(ratio>0)raf=requestAnimationFrame(tick);}
    function finish(){if(finished)return;finished=true;locked=true;clearTimers();const score=Math.max(correct*1000-Math.round(reactionSum),0);onFinish({score,duration:performance.now()-startedAt,metadata:{correct,reaction_sum_ms:Math.round(reactionSum),rounds}});}

    function next(){
      clearTimers();if(finished)return;if(round>=rounds)return finish();locked=false;
      const vertices=complexity(),base=shapeFor(vertices,Math.min(.28,.12+round*.012));targetPoints=base;
      const options=[base];const mutation=Math.max(3.2,9-round*.35);while(options.length<4)options.push(mutate(base,mutation));shuffle(options);targetIndex=options.indexOf(base);
      targetEl.innerHTML=svg(base);actions.innerHTML=options.map((p,i)=>`<button type="button" data-shape="${i}" aria-label="Figura ${i+1}">${svg(p)}</button>`).join('');
      card.className='shape-card';roundEl.textContent=`Ronda ${round+1} / ${rounds}`;scoreEl.textContent=`${correct} acierto${correct===1?'':'s'}`;help.textContent=`${vertices} vértices · compara con cuidado.`;
      timerEl.style.transform='scaleX(1)';roundAt=performance.now();raf=requestAnimationFrame(tick);timer=setTimeout(()=>resolve(-1),timeoutMs);
    }
    function resolve(choice){
      if(finished||locked)return;locked=true;clearTimers();const buttons=[...actions.querySelectorAll('[data-shape]')];buttons.forEach(b=>b.disabled=true);const rt=performance.now()-roundAt,ok=choice===targetIndex;
      if(ok){correct++;reactionSum+=Math.min(rt,1200);help.textContent='¡Exacta!';card.classList.add('is-correct');buttons[choice]?.classList.add('is-correct');}
      else{help.textContent=choice<0?'Tiempo agotado':'No era exactamente igual';card.classList.add('is-wrong');if(choice>=0)buttons[choice]?.classList.add('is-wrong');buttons[targetIndex]?.classList.add('is-correct');}
      scoreEl.textContent=`${correct} acierto${correct===1?'':'s'}`;round++;setTimeout(next,620);
    }
    function press(e){const b=e.target.closest('[data-shape]');if(b)resolve(Number(b.dataset.shape));}
    actions.addEventListener('pointerdown',press);
    return{start(){startedAt=performance.now();next();},destroy(){finished=true;clearTimers();actions.removeEventListener('pointerdown',press);}};
  });
})();