(() => {
  'use strict';

  window.PatxGameRegistry.register('cups', ({ container, config = {}, seed = 1, onFinish }) => {
    const cupCount=Number(config.cups||3);
    const baseShuffle=Number(config.base_shuffle_ms||2400);
    const minShuffle=Number(config.min_shuffle_ms||900);
    const maxRounds=Number(config.max_rounds||60);
    let state=Number(seed)||1,round=0,correct=0,ballCup=0,startedAt=0,finished=false,accepting=false,timers=[];

    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}
    function later(fn,ms){const id=setTimeout(fn,ms);timers.push(id);return id;}
    function clearTimers(){timers.forEach(clearTimeout);timers=[];}

    container.innerHTML=`
      <div class="game-surface cups-surface endless-cups-surface">
        <div class="game-kicker">CUPS</div>
        <div class="cups-head"><div class="round-counter" data-round>Ronda 1</div><div class="round-counter" data-score>0 seguidos</div></div>
        <div class="cups-stage" data-stage>${Array.from({length:cupCount},(_,i)=>`<button type="button" class="cup" data-cup="${i}" aria-label="Vaso ${i+1}"><span class="cup-shape">▰</span><span class="cup-ball">●</span></button>`).join('')}</div>
        <div class="game-help" data-help>Sigue la bola. Un fallo termina la partida.</div>
      </div>`;

    const roundEl=container.querySelector('[data-round]'),helpEl=container.querySelector('[data-help]'),scoreEl=container.querySelector('[data-score]'),cups=[...container.querySelectorAll('[data-cup]')];
    let positions=Array.from({length:cupCount},(_,i)=>i);

    function applyPositions(animate=true){cups.forEach((cup,id)=>{cup.style.transition=animate?'transform .2s cubic-bezier(.2,.75,.3,1)':'none';cup.style.transform=`translateX(${(positions[id]-id)*112}px)`;});}
    function clearFeedback(){cups.forEach(c=>c.classList.remove('is-correct','is-wrong'));}
    function showBall(show){cups.forEach((cup,id)=>cup.classList.toggle('has-ball',show&&id===ballCup));}

    function finish(failed=false){
      if(finished)return;finished=true;accepting=false;clearTimers();
      helpEl.textContent=failed?`Fin: ${correct} acierto${correct===1?'':'s'} seguido${correct===1?'':'s'}.`:'Racha máxima completada.';
      setTimeout(()=>onFinish({score:correct,duration:performance.now()-startedAt,metadata:{correct,failed,rounds_played:round+Number(failed)}}),failed?500:0);
    }

    function startRound(){
      if(finished)return;if(correct>=maxRounds)return finish(false);
      accepting=false;clearFeedback();positions=Array.from({length:cupCount},(_,i)=>i);applyPositions(false);ballCup=Math.floor(rnd()*cupCount);
      roundEl.textContent=`Ronda ${round+1}`;scoreEl.textContent=`${correct} seguido${correct===1?'':'s'}`;helpEl.textContent='Memoriza dónde está la bola…';showBall(true);
      later(()=>{
        showBall(false);helpEl.textContent='Sigue el vaso…';
        const swaps=Math.min(14,4+round);
        const total=Math.max(minShuffle,baseShuffle-round*115);
        const step=Math.max(85,total/swaps);
        for(let s=0;s<swaps;s++) later(()=>{
          let a=Math.floor(rnd()*cupCount),b=Math.floor(rnd()*cupCount);while(b===a)b=Math.floor(rnd()*cupCount);
          const pa=positions[a];positions[a]=positions[b];positions[b]=pa;applyPositions(true);
        },s*step);
        later(()=>{accepting=true;helpEl.textContent='¿Dónde está? Un error y se acabó.';},swaps*step+180);
      },Math.max(500,850-round*18));
    }

    function choose(cupId){
      if(!accepting||finished)return;accepting=false;
      const chosenPos=positions[cupId],ballPos=positions[ballCup],ok=chosenPos===ballPos;
      showBall(true);const correctCup=cups.find((_,id)=>positions[id]===ballPos);cups[cupId]?.classList.add(ok?'is-correct':'is-wrong');if(!ok)correctCup?.classList.add('is-correct');
      if(!ok){helpEl.textContent='Fallo. La bola estaba aquí.';return finish(true);}
      correct+=1;round+=1;scoreEl.textContent=`${correct} seguido${correct===1?'':'s'}`;helpEl.textContent='¡Correcto! La mezcla se acelera.';
      later(()=>{showBall(false);clearFeedback();startRound();},720);
    }

    function press(e){const cup=e.target.closest('[data-cup]');if(cup)choose(Number(cup.dataset.cup));}
    container.addEventListener('pointerdown',press,{passive:false});
    return{start(){startedAt=performance.now();startRound();},destroy(){finished=true;clearTimers();container.removeEventListener('pointerdown',press);}};
  });
})();