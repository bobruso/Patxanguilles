(() => {
  'use strict';

  window.PatxGameRegistry.register('quick-maths', ({ container, config = {}, seed = 1, onFinish }) => {
    const total = Number(config.questions || 10);
    const timeoutMs = Number(config.question_timeout_ms || 5000);
    let state = Number(seed) || 1;
    let index = 0, correct = 0, score = 0, questionStart = 0, startedAt = 0;
    let timer = 0, raf = 0, finished = false, locked = false, answer = 0;

    function rnd(){ state=(state*1103515245+12345)>>>0; return state/4294967296; }
    function randint(min,max){ return min+Math.floor(rnd()*(max-min+1)); }
    function shuffle(list){ for(let i=list.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [list[i],list[j]]=[list[j],list[i]]; } return list; }

    container.innerHTML = `
      <div class="game-surface maths-surface">
        <div class="game-kicker">QUICK MATHS</div>
        <div class="maths-head">
          <div class="round-counter" data-round>1 / ${total}</div>
          <div class="round-counter" data-score>0 pts</div>
        </div>
        <div class="maths-timer"><div data-timer></div></div>
        <div class="math-question" data-question>...</div>
        <div class="answer-grid" data-answers></div>
        <div class="game-help" data-help>Elige el resultado correcto. La velocidad suma puntos.</div>
      </div>`;

    const roundEl=container.querySelector('[data-round]');
    const scoreEl=container.querySelector('[data-score]');
    const timerEl=container.querySelector('[data-timer]');
    const questionEl=container.querySelector('[data-question]');
    const answersEl=container.querySelector('[data-answers]');
    const helpEl=container.querySelector('[data-help]');

    function makeQuestion(){
      const mode=randint(0,2); let a,b,op;
      if(mode===0){a=randint(2,30);b=randint(2,30);op='+';answer=a+b;}
      else if(mode===1){a=randint(8,35);b=randint(2,a-1);op='−';answer=a-b;}
      else{a=randint(2,9);b=randint(2,9);op='×';answer=a*b;}
      const options=new Set([answer]);
      while(options.size<4){const delta=randint(-8,8)||1;options.add(Math.max(0,answer+delta));}
      return {label:`${a} ${op} ${b}`,options:shuffle([...options])};
    }

    function clearTimers(){ clearTimeout(timer); cancelAnimationFrame(raf); }

    function tick(now){
      if(finished||locked) return;
      const elapsed=now-questionStart;
      const ratio=Math.max(0,1-elapsed/timeoutMs);
      timerEl.style.transform=`scaleX(${ratio})`;
      if(ratio>0) raf=requestAnimationFrame(tick);
    }

    function end(){
      if(finished) return;
      finished=true; clearTimers(); locked=true;
      questionEl.textContent=`${correct} / ${total}`;
      answersEl.innerHTML='';
      helpEl.textContent='Resultado registrando…';
      onFinish({score:Math.round(score),duration:performance.now()-startedAt,metadata:{correct,questions:total}});
    }

    function next(){
      clearTimers();
      if(index>=total) return end();
      locked=false;
      const q=makeQuestion();
      roundEl.textContent=`${index+1} / ${total}`;
      scoreEl.textContent=`${Math.round(score)} pts`;
      questionEl.textContent=q.label;
      answersEl.innerHTML=q.options.map(value=>`<button type="button" class="answer-option" data-answer="${value}">${value}</button>`).join('');
      helpEl.textContent='Elige la respuesta correcta.';
      timerEl.style.transform='scaleX(1)';
      questionStart=performance.now();
      raf=requestAnimationFrame(tick);
      timer=setTimeout(()=>resolve(null),timeoutMs);
    }

    function resolve(chosen){
      if(locked||finished) return;
      locked=true; clearTimers();
      const elapsed=performance.now()-questionStart;
      const buttons=[...answersEl.querySelectorAll('[data-answer]')];
      buttons.forEach(button=>{
        button.disabled=true;
        const value=Number(button.dataset.answer);
        if(value===answer) button.classList.add('is-correct');
        if(chosen!==null&&value===chosen&&value!==answer) button.classList.add('is-wrong');
      });
      if(chosen===answer){
        correct+=1;
        score+=Math.max(100,1000-Math.min(elapsed,900));
        helpEl.textContent='¡Correcto!';
      }else if(chosen===null){
        helpEl.textContent=`Tiempo. Era ${answer}.`;
      }else{
        helpEl.textContent=`Era ${answer}.`;
      }
      scoreEl.textContent=`${Math.round(score)} pts`;
      index+=1;
      setTimeout(next,520);
    }

    function press(event){
      const button=event.target.closest('[data-answer]');
      if(!button||finished||locked) return;
      event.preventDefault();
      resolve(Number(button.dataset.answer));
    }

    container.addEventListener('pointerdown',press,{passive:false});

    return {
      start(){startedAt=performance.now();setTimeout(next,180);},
      destroy(){finished=true;locked=true;clearTimers();container.removeEventListener('pointerdown',press);}
    };
  });
})();