(() => {
  'use strict';

  window.PatxGameRegistry.register('quick-maths', ({ container, config = {}, seed = 1, onFinish }) => {
    const total = Number(config.questions || 10);
    const timeoutMs = Number(config.question_timeout_ms || 5000);
    let state = Number(seed) || 1;
    let index = 0;
    let correct = 0;
    let score = 0;
    let questionStart = 0;
    let startedAt = 0;
    let timer = 0;
    let finished = false;
    let answer = 0;

    function rnd() {
      state = (state * 1103515245 + 12345) >>> 0;
      return state / 4294967296;
    }
    function randint(min,max){ return min + Math.floor(rnd() * (max-min+1)); }
    function shuffle(list){
      for(let i=list.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [list[i],list[j]]=[list[j],list[i]]; }
      return list;
    }

    container.innerHTML = `
      <div class="game-surface maths-surface">
        <div class="game-kicker">QUICK MATHS</div>
        <div class="round-counter" data-round>1 / ${total}</div>
        <div class="math-question" data-question>...</div>
        <div class="answer-grid" data-answers></div>
        <div class="game-help" data-help>Elige el resultado correcto. Cuanto más rápido, más puntos.</div>
      </div>`;

    const roundEl = container.querySelector('[data-round]');
    const questionEl = container.querySelector('[data-question]');
    const answersEl = container.querySelector('[data-answers]');
    const helpEl = container.querySelector('[data-help]');

    function makeQuestion(){
      const mode = randint(0,2);
      let a,b,op;
      if(mode===0){ a=randint(2,30); b=randint(2,30); op='+'; answer=a+b; }
      else if(mode===1){ a=randint(8,35); b=randint(2,a-1); op='−'; answer=a-b; }
      else { a=randint(2,9); b=randint(2,9); op='×'; answer=a*b; }
      const options = new Set([answer]);
      while(options.size<4){
        const delta = randint(-8,8) || 1;
        options.add(Math.max(0,answer+delta));
      }
      return { label:`${a} ${op} ${b}`, options:shuffle([...options]) };
    }

    function end(){
      if(finished) return;
      finished=true;
      clearTimeout(timer);
      const duration=performance.now()-startedAt;
      questionEl.textContent=`${correct} / ${total}`;
      helpEl.textContent='Resultado registrando…';
      onFinish({ score:Math.round(score), duration, metadata:{ correct, questions:total } });
    }

    function next(){
      clearTimeout(timer);
      if(index>=total) return end();
      const q=makeQuestion();
      roundEl.textContent=`${index+1} / ${total}`;
      questionEl.textContent=q.label;
      answersEl.innerHTML=q.options.map(value=>`<button type="button" class="answer-option" data-answer="${value}">${value}</button>`).join('');
      questionStart=performance.now();
      timer=setTimeout(()=>{
        helpEl.textContent='Tiempo agotado.';
        index+=1;
        setTimeout(next,180);
      },timeoutMs);
    }

    function press(event){
      const button=event.target.closest('[data-answer]');
      if(!button||finished) return;
      event.preventDefault();
      clearTimeout(timer);
      const chosen=Number(button.dataset.answer);
      const elapsed=performance.now()-questionStart;
      if(chosen===answer){
        correct+=1;
        score+=Math.max(100,1000-Math.min(elapsed,900));
        helpEl.textContent='¡Correcto!';
      }else{
        helpEl.textContent=`Era ${answer}.`;
      }
      index+=1;
      setTimeout(next,180);
    }

    container.addEventListener('pointerdown',press,{passive:false});

    return {
      start(){ startedAt=performance.now(); setTimeout(next,350); },
      destroy(){ finished=true; clearTimeout(timer); container.removeEventListener('pointerdown',press); }
    };
  });
})();