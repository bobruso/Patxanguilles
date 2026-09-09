(() => {
  'use strict';

  window.PatxGameRegistry.register('quick-maths', ({ container, config = {}, seed = 1, onFinish }) => {
    const timeoutMs=Number(config.question_timeout_ms||5000);
    const maxRounds=Number(config.max_rounds||100);
    let state=Number(seed)||1,index=0,correct=0,questionStart=0,startedAt=0,timer=0,raf=0,finished=false,locked=true,answer=0;

    function rnd(){state=(state*1103515245+12345)>>>0;return state/4294967296;}
    function randint(min,max){return min+Math.floor(rnd()*(max-min+1));}
    function shuffle(list){for(let i=list.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;}

    container.innerHTML=`
      <div class="game-surface maths-surface">
        <div class="game-kicker">QUICK MATHS</div>
        <div class="maths-head">
          <div class="round-counter" data-round>Ronda 1</div>
          <div class="round-counter" data-score>0 seguidas</div>
        </div>
        <div class="maths-difficulty" data-difficulty>NIVEL 1 · CALENTAMIENTO</div>
        <div class="maths-timer"><div data-timer></div></div>
        <div class="math-question" data-question>...</div>
        <div class="answer-grid" data-answers></div>
        <div class="game-help" data-help>Un fallo o quedarte sin tiempo termina la partida.</div>
      </div>`;

    const roundEl=container.querySelector('[data-round]');
    const scoreEl=container.querySelector('[data-score]');
    const diffEl=container.querySelector('[data-difficulty]');
    const timerEl=container.querySelector('[data-timer]');
    const questionEl=container.querySelector('[data-question]');
    const answersEl=container.querySelector('[data-answers]');
    const helpEl=container.querySelector('[data-help]');

    function difficultyLabel(round){
      if(round<4)return 'NIVEL 1 · CALENTAMIENTO';
      if(round<8)return 'NIVEL 2 · MULTIPLICA';
      if(round<12)return 'NIVEL 3 · DIVIDE';
      if(round<20)return 'NIVEL 4 · DOS PASOS';
      return 'NIVEL 5 · SIN PIEDAD';
    }

    function makeQuestion(round){
      let label='';
      if(round<4){
        const add=rnd()>.45,a=randint(4,40),b=randint(2,Math.min(a-1,30));
        answer=add?a+b:a-b;label=`${a} ${add?'+':'−'} ${b}`;
      }else if(round<8){
        if(rnd()>.35){const a=randint(3,12),b=randint(3,12);answer=a*b;label=`${a} × ${b}`;}
        else{const a=randint(25,90),b=randint(15,70);answer=a+b;label=`${a} + ${b}`;}
      }else if(round<12){
        if(rnd()>.45){const b=randint(3,12),q=randint(3,14),a=b*q;answer=q;label=`${a} ÷ ${b}`;}
        else{const a=randint(7,15),b=randint(5,13);answer=a*b;label=`${a} × ${b}`;}
      }else if(round<20){
        const mode=randint(0,2);
        if(mode===0){const a=randint(4,18),b=randint(3,15),c=randint(2,7);answer=(a+b)*c;label=`(${a} + ${b}) × ${c}`;}
        else if(mode===1){const a=randint(7,16),b=randint(4,13),c=randint(3,Math.max(3,a*b-2));answer=a*b-c;label=`${a} × ${b} − ${c}`;}
        else{const b=randint(3,10),q=randint(4,16),c=randint(2,20),a=b*q;answer=q+c;label=`${a} ÷ ${b} + ${c}`;}
      }else{
        const mode=randint(0,2);
        if(mode===0){const a=randint(12,29),b=randint(8,24),c=randint(3,9);answer=(a-b)*c;label=`(${a} − ${b}) × ${c}`;if(answer<0)return makeQuestion(round);}
        else if(mode===1){const a=randint(12,25),b=randint(7,18),c=randint(25,90);answer=a*b+c;label=`${a} × ${b} + ${c}`;}
        else{const divisor=randint(4,12),q=randint(12,30),base=divisor*q,minus=randint(3,20);answer=q-minus;label=`${base} ÷ ${divisor} − ${minus}`;}
      }
      const spread=Math.max(4,Math.ceil(Math.abs(answer)*.12));
      const options=new Set([answer]);
      while(options.size<4){let delta=randint(-spread,spread);if(delta===0)delta=randint(1,3);options.add(answer+delta);}
      return {label,options:shuffle([...options])};
    }

    function clearTimers(){clearTimeout(timer);cancelAnimationFrame(raf);}
    function tick(now){if(finished||locked)return;const ratio=Math.max(0,1-(now-questionStart)/timeoutMs);timerEl.style.transform=`scaleX(${ratio})`;if(ratio>0)raf=requestAnimationFrame(tick);}

    function end(reason,chosen=null){
      if(finished)return;
      finished=true;locked=true;clearTimers();
      [...answersEl.querySelectorAll('[data-answer]')].forEach(button=>{
        button.disabled=true;const value=Number(button.dataset.answer);
        if(value===answer)button.classList.add('is-correct');
        if(chosen!==null&&value===chosen&&value!==answer)button.classList.add('is-wrong');
      });
      helpEl.textContent=reason==='timeout'?`Tiempo. Era ${answer}.`:`Fallo. Era ${answer}.`;
      setTimeout(()=>onFinish({score:correct,duration:performance.now()-startedAt,metadata:{correct,failed_reason:reason,last_answer:answer,rounds_played:index+1}}),520);
    }

    function next(){
      clearTimers();
      if(correct>=maxRounds){finished=true;return onFinish({score:correct,duration:performance.now()-startedAt,metadata:{correct,perfect_run:true}});}
      locked=false;
      const q=makeQuestion(index);
      roundEl.textContent=`Ronda ${index+1}`;
      scoreEl.textContent=`${correct} seguida${correct===1?'':'s'}`;
      diffEl.textContent=difficultyLabel(index);
      questionEl.textContent=q.label;
      answersEl.innerHTML=q.options.map(value=>`<button type="button" class="answer-option" data-answer="${value}">${value}</button>`).join('');
      helpEl.textContent='Acierta para pasar a la siguiente. Un fallo termina.';
      timerEl.style.transform='scaleX(1)';
      questionStart=performance.now();raf=requestAnimationFrame(tick);timer=setTimeout(()=>end('timeout'),timeoutMs);
    }

    function resolve(chosen){
      if(locked||finished)return;
      locked=true;clearTimers();
      const buttons=[...answersEl.querySelectorAll('[data-answer]')];
      buttons.forEach(button=>button.disabled=true);
      if(chosen!==answer)return end('wrong',chosen);
      buttons.find(button=>Number(button.dataset.answer)===answer)?.classList.add('is-correct');
      correct+=1;index+=1;scoreEl.textContent=`${correct} seguida${correct===1?'':'s'}`;helpEl.textContent='¡Correcto! Sube la dificultad.';
      setTimeout(next,380);
    }

    function press(event){const button=event.target.closest('[data-answer]');if(!button||finished||locked)return;event.preventDefault();resolve(Number(button.dataset.answer));}
    container.addEventListener('pointerdown',press,{passive:false});

    return{start(){startedAt=performance.now();setTimeout(next,160);},destroy(){finished=true;locked=true;clearTimers();container.removeEventListener('pointerdown',press);}};
  });
})();