(() => {
  'use strict';

  window.PatxGameRegistry.register('cups', ({ container, config = {}, seed = 1, onFinish }) => {
    const rounds=Number(config.rounds||6);
    const cupCount=Number(config.cups||3);
    const baseShuffle=Number(config.base_shuffle_ms||2400);
    const minShuffle=Number(config.min_shuffle_ms||1100);
    let state=Number(seed)||1;
    let round=0, correct=0, ballCup=0, startedAt=0, finished=false, accepting=false;
    let timers=[];

    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}
    function later(fn,ms){const id=setTimeout(fn,ms);timers.push(id);return id;}
    function clearTimers(){timers.forEach(clearTimeout);timers=[];}

    container.innerHTML=`
      <div class="game-surface cups-surface">
        <div class="game-kicker">CUPS</div>
        <div class="round-counter" data-round>Ronda 1 / ${rounds}</div>
        <div class="cups-stage" data-stage>
          ${Array.from({length:cupCount},(_,i)=>`<button type="button" class="cup" data-cup="${i}" aria-label="Vaso ${i+1}"><span class="cup-shape">▰</span><span class="cup-ball">●</span></button>`).join('')}
        </div>
        <div class="game-help" data-help>Sigue la bola.</div>
        <div class="hl-score" data-score>0 aciertos</div>
      </div>`;

    const roundEl=container.querySelector('[data-round]');
    const helpEl=container.querySelector('[data-help]');
    const scoreEl=container.querySelector('[data-score]');
    const cups=[...container.querySelectorAll('[data-cup]')];
    let positions=Array.from({length:cupCount},(_,i)=>i);

    function applyPositions(animate=true){
      cups.forEach((cup,id)=>{
        cup.style.transition=animate?'transform .22s ease':'none';
        const pos=positions[id];
        cup.style.transform=`translateX(${(pos-id)*112}px)`;
      });
    }

    function showBall(show){
      cups.forEach((cup,id)=>cup.classList.toggle('has-ball',show&&id===ballCup));
    }

    function finish(){
      if(finished)return;
      finished=true;accepting=false;clearTimers();
      onFinish({score:correct,duration:performance.now()-startedAt,metadata:{correct,rounds}});
    }

    function startRound(){
      if(finished)return;
      if(round>=rounds)return finish();
      accepting=false;
      positions=Array.from({length:cupCount},(_,i)=>i);
      applyPositions(false);
      ballCup=Math.floor(rnd()*cupCount);
      roundEl.textContent=`Ronda ${round+1} / ${rounds}`;
      helpEl.textContent='Memoriza dónde está la bola…';
      showBall(true);
      later(()=>{
        showBall(false);
        helpEl.textContent='Sigue el vaso…';
        const swaps=4+round;
        const total=Math.max(minShuffle,baseShuffle-round*180);
        const step=Math.max(120,total/swaps);
        for(let s=0;s<swaps;s++){
          later(()=>{
            let a=Math.floor(rnd()*cupCount),b=Math.floor(rnd()*cupCount);
            while(b===a)b=Math.floor(rnd()*cupCount);
            const pa=positions[a];positions[a]=positions[b];positions[b]=pa;
            applyPositions(true);
          },s*step);
        }
        later(()=>{accepting=true;helpEl.textContent='¿Dónde está?';},swaps*step+220);
      },850);
    }

    function choose(cupId){
      if(!accepting||finished)return;
      accepting=false;
      const chosenPos=positions[cupId];
      const ballPos=positions[ballCup];
      const ok=chosenPos===ballPos;
      if(ok)correct++;
      showBall(true);
      helpEl.textContent=ok?'¡Correcto!':'No estaba ahí';
      scoreEl.textContent=`${correct} acierto${correct===1?'':'s'}`;
      round++;
      later(()=>{showBall(false);startRound();},700);
    }

    function press(e){const cup=e.target.closest('[data-cup]');if(cup)choose(Number(cup.dataset.cup));}
    container.addEventListener('pointerdown',press);

    return{start(){startedAt=performance.now();startRound();},destroy(){finished=true;clearTimers();container.removeEventListener('pointerdown',press);}};
  });
})();