(() => {
  'use strict';

  window.PatxGameRegistry.register('sequence', ({ container, config = {}, seed = 1, onFinish }) => {
    const startLength = Number(config.start_length || 3);
    const maxLevel = Number(config.max_level || 20);
    let state = Number(seed) || 1;
    let sequence = [];
    let inputIndex = 0;
    let level = 0;
    let accepting = false;
    let finished = false;
    let startedAt = 0;
    const timers = new Set();

    function rnd(){ state=(state*1664525+1013904223)>>>0; return state/4294967296; }
    function later(fn,ms){ const id=setTimeout(()=>{timers.delete(id);fn();},ms); timers.add(id); return id; }
    function nextPad(){ return Math.floor(rnd()*4); }

    container.innerHTML=`
      <div class="game-surface sequence-surface">
        <div class="game-kicker">SECUENCIA</div>
        <div class="round-counter" data-level>Nivel 1</div>
        <div class="sequence-grid">
          ${[0,1,2,3].map(i=>`<button type="button" class="sequence-pad pad-${i}" data-pad="${i}" aria-label="Botón ${i+1}">${i+1}</button>`).join('')}
        </div>
        <div class="game-help" data-help>Observa la secuencia y repítela.</div>
      </div>`;

    const levelEl=container.querySelector('[data-level]');
    const helpEl=container.querySelector('[data-help]');
    const pads=[...container.querySelectorAll('[data-pad]')];

    function flash(index,on){
      pads[index]?.classList.toggle('is-lit',on);
    }

    function end(){
      if(finished) return;
      finished=true;
      accepting=false;
      const duration=performance.now()-startedAt;
      helpEl.textContent='Resultado registrando…';
      onFinish({score:level,duration,metadata:{level,length:sequence.length}});
    }

    function showSequence(){
      if(finished) return;
      if(level>=maxLevel) return end();
      accepting=false;
      inputIndex=0;
      const wanted=startLength+level;
      while(sequence.length<wanted) sequence.push(nextPad());
      levelEl.textContent=`Nivel ${level+1}`;
      helpEl.textContent='Mira…';
      let t=250;
      sequence.slice(0,wanted).forEach((pad)=>{
        later(()=>flash(pad,true),t);
        later(()=>flash(pad,false),t+260);
        t+=430;
      });
      later(()=>{
        accepting=true;
        helpEl.textContent='Tu turno.';
      },t+80);
    }

    function press(event){
      const button=event.target.closest('[data-pad]');
      if(!button||!accepting||finished) return;
      event.preventDefault();
      const pad=Number(button.dataset.pad);
      flash(pad,true);
      later(()=>flash(pad,false),120);
      const wanted=startLength+level;
      if(pad!==sequence[inputIndex]){
        accepting=false;
        helpEl.textContent='Secuencia incorrecta.';
        return later(end,300);
      }
      inputIndex+=1;
      if(inputIndex>=wanted){
        accepting=false;
        level+=1;
        helpEl.textContent='¡Correcto!';
        later(showSequence,500);
      }
    }

    container.addEventListener('pointerdown',press,{passive:false});

    return {
      start(){ startedAt=performance.now(); later(showSequence,350); },
      destroy(){ finished=true; accepting=false; timers.forEach(clearTimeout); timers.clear(); container.removeEventListener('pointerdown',press); }
    };
  });
})();