(() => {
  'use strict';

  window.PatxGameRegistry.register('color-reflex', ({ container, config = {}, seed = 1, onFinish }) => {
    const startTimeout=Number(config.start_timeout_ms||4200);
    const minTimeout=Number(config.min_timeout_ms||2000);
    const minFromRound=Number(config.min_timeout_from_round||10);
    const maxRounds=Number(config.max_rounds||100);
    const colors=[
      {name:'ROJO',hex:'#ef4862'},
      {name:'AZUL',hex:'#3977ea'},
      {name:'VERDE',hex:'#27aa72'},
      {name:'AMARILLO',hex:'#f3c928'},
      {name:'MORADO',hex:'#8a58df'}
    ];
    let state=Number(seed)||1,round=0,correct=0,reactionSum=0,roundStart=0,startedAt=0,timer=0,raf=0,finished=false,locked=true,targetInk=0,currentTimeout=startTimeout;

    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}
    function randIndex(exclude=[]){let i=Math.floor(rnd()*colors.length);while(exclude.includes(i))i=Math.floor(rnd()*colors.length);return i;}
    function clearTimers(){clearTimeout(timer);cancelAnimationFrame(raf);}
    function timeoutForRound(index){
      const step=(startTimeout-minTimeout)/Math.max(1,minFromRound-1);
      return Math.max(minTimeout,Math.round(startTimeout-index*step));
    }

    container.innerHTML=`
      <div class="game-surface color-reflex-surface stroop-surface">
        <div class="game-kicker">COLOR REFLEX</div>
        <div class="color-head">
          <div class="round-counter" data-round>Ronda 1</div>
          <div class="round-counter" data-score>0 seguidos</div>
        </div>
        <div class="color-timer"><div data-timer></div></div>
        <div class="stroop-instruction">¿DE QUÉ COLOR ESTÁ ESCRITA?</div>
        <div class="color-prompt stroop-prompt">
          <div class="color-target" data-target>PREPÁRATE</div>
        </div>
        <div class="color-grid stroop-grid" data-answers></div>
        <div class="game-help" data-help>Ignora lo que pone la palabra. Fíjate solo en el color de las letras.</div>
      </div>`;

    const roundEl=container.querySelector('[data-round]');
    const scoreEl=container.querySelector('[data-score]');
    const timerEl=container.querySelector('[data-timer]');
    const targetEl=container.querySelector('[data-target]');
    const answersEl=container.querySelector('[data-answers]');
    const helpEl=container.querySelector('[data-help]');

    function tick(now){
      if(finished||locked)return;
      const ratio=Math.max(0,1-(now-roundStart)/currentTimeout);
      timerEl.style.transform=`scaleX(${ratio})`;
      if(ratio>0)raf=requestAnimationFrame(tick);
    }

    function finalScore(){return Math.max(0,correct*10000-Math.round(reactionSum));}

    function end(reason,chosen=null){
      if(finished)return;
      finished=true;locked=true;clearTimers();
      [...answersEl.querySelectorAll('button')].forEach(button=>{
        button.disabled=true;
        const label=Number(button.dataset.color);
        if(label===targetInk)button.classList.add('is-correct');
        if(chosen!==null&&label===chosen&&chosen!==targetInk)button.classList.add('is-wrong');
      });
      helpEl.textContent=reason==='timeout'?`Tiempo. Era ${colors[targetInk].name}.`:reason==='wrong'?`No. Era ${colors[targetInk].name}.`:'Racha completada.';
      setTimeout(()=>onFinish({score:finalScore(),duration:performance.now()-startedAt,metadata:{correct,reaction_sum_ms:Math.round(reactionSum),failed_reason:reason,rounds_played:round+1}}),520);
    }

    function makeButton(labelIndex){
      const bg=randIndex([labelIndex]);
      const ink=randIndex([labelIndex,bg]);
      return `<button type="button" class="color-option stroop-option" data-color="${labelIndex}" style="background:${colors[bg].hex}!important;color:${colors[ink].hex}!important"><span>${colors[labelIndex].name}</span></button>`;
    }

    function nextRound(){
      clearTimers();
      if(correct>=maxRounds)return end('cap');
      locked=false;
      roundEl.textContent=`Ronda ${round+1}`;
      scoreEl.textContent=`${correct} seguido${correct===1?'':'s'}`;
      currentTimeout=timeoutForRound(round);

      const wordIndex=randIndex();
      targetInk=randIndex([wordIndex]);
      targetEl.textContent=colors[wordIndex].name;
      targetEl.style.color=colors[targetInk].hex;
      targetEl.style.fontSize=wordIndex===3?'clamp(40px,12vw,70px)':'';

      const order=[0,1,2,3,4];
      for(let i=order.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
      answersEl.innerHTML=order.map(makeButton).join('');
      helpEl.textContent=`Ignora la palabra. Tienes ${(currentTimeout/1000).toFixed(1)} s para indicar el color de su tinta.`;
      timerEl.style.transform='scaleX(1)';
      roundStart=performance.now();
      raf=requestAnimationFrame(tick);
      timer=setTimeout(()=>end('timeout'),currentTimeout);
    }

    function choose(value){
      if(finished||locked)return;
      locked=true;clearTimers();
      const elapsed=performance.now()-roundStart;
      if(value!==targetInk)return end('wrong',value);
      correct+=1;reactionSum+=elapsed;round+=1;
      const btn=[...answersEl.querySelectorAll('[data-color]')].find(b=>Number(b.dataset.color)===value);
      btn?.classList.add('is-correct');
      scoreEl.textContent=`${correct} seguido${correct===1?'':'s'}`;
      helpEl.textContent='¡Correcto!';
      setTimeout(nextRound,330);
    }

    function press(event){const button=event.target.closest('[data-color]');if(!button)return;event.preventDefault();choose(Number(button.dataset.color));}
    answersEl.addEventListener('pointerdown',press,{passive:false});

    return{
      start(){startedAt=performance.now();setTimeout(nextRound,160);},
      destroy(){finished=true;locked=true;clearTimers();answersEl.removeEventListener('pointerdown',press);}
    };
  });
})();