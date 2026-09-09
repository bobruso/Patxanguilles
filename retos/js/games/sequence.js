(() => {
  'use strict';

  window.PatxGameRegistry.register('sequence', ({ container, config = {}, seed = 1, onFinish }) => {
    const startLength=Number(config.start_length||3);
    const maxLevel=Math.min(Number(config.max_level||8),8);
    let state=Number(seed)||1,sequence=[],inputIndex=0,level=0,accepting=false,finished=false,startedAt=0;
    const timers=new Set();

    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}
    function later(fn,ms){const id=setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);return id;}
    function nextPad(){return Math.floor(rnd()*4);}

    container.innerHTML=`
      <div class="game-surface sequence-surface">
        <div class="game-kicker">SECUENCIA</div>
        <div class="sequence-head">
          <div class="round-counter" data-level>Nivel 1</div>
          <div class="round-counter" data-progress>0 / ${startLength}</div>
        </div>
        <div class="sequence-grid">
          ${[0,1,2,3].map(i=>`<button type="button" class="sequence-pad pad-${i}" data-pad="${i}" aria-label="Botón ${i+1}"><span>${i+1}</span></button>`).join('')}
        </div>
        <div class="sequence-phase" data-phase>OBSERVA</div>
        <div class="game-help" data-help>Mira la secuencia completa antes de tocar.</div>
      </div>`;

    const levelEl=container.querySelector('[data-level]');
    const progressEl=container.querySelector('[data-progress]');
    const phaseEl=container.querySelector('[data-phase]');
    const helpEl=container.querySelector('[data-help]');
    const pads=[...container.querySelectorAll('[data-pad]')];

    function flash(index,on){pads[index]?.classList.toggle('is-lit',on);}

    function end(){
      if(finished)return;
      finished=true;accepting=false;
      phaseEl.textContent='FIN';
      helpEl.textContent='Resultado registrando…';
      onFinish({score:level,duration:performance.now()-startedAt,metadata:{level,length:sequence.length}});
    }

    function showSequence(){
      if(finished)return;
      if(level>=maxLevel)return end();
      accepting=false;inputIndex=0;
      const wanted=startLength+level;
      while(sequence.length<wanted)sequence.push(nextPad());
      levelEl.textContent=`Nivel ${level+1}`;
      progressEl.textContent=`0 / ${wanted}`;
      phaseEl.textContent='OBSERVA';
      phaseEl.className='sequence-phase watch';
      helpEl.textContent='Mira la secuencia…';
      let t=260;
      sequence.slice(0,wanted).forEach(pad=>{
        later(()=>flash(pad,true),t);
        later(()=>flash(pad,false),t+280);
        t+=460;
      });
      later(()=>{
        accepting=true;
        phaseEl.textContent='TU TURNO';
        phaseEl.className='sequence-phase play';
        helpEl.textContent='Repítela en el mismo orden.';
      },t+80);
    }

    function press(event){
      const button=event.target.closest('[data-pad]');
      if(!button||!accepting||finished)return;
      event.preventDefault();
      const pad=Number(button.dataset.pad);
      flash(pad,true);later(()=>flash(pad,false),130);
      const wanted=startLength+level;
      if(pad!==sequence[inputIndex]){
        accepting=false;
        button.classList.add('is-wrong');
        pads[sequence[inputIndex]]?.classList.add('is-correct');
        phaseEl.textContent='FALLO';
        phaseEl.className='sequence-phase fail';
        helpEl.textContent='Ese no era el siguiente botón.';
        return later(end,750);
      }
      inputIndex+=1;
      progressEl.textContent=`${inputIndex} / ${wanted}`;
      if(inputIndex>=wanted){
        accepting=false;level+=1;
        phaseEl.textContent='¡BIEN!';
        phaseEl.className='sequence-phase success';
        helpEl.textContent='Secuencia completada.';
        later(()=>{
          pads.forEach(p=>p.classList.remove('is-wrong','is-correct'));
          showSequence();
        },700);
      }
    }

    container.addEventListener('pointerdown',press,{passive:false});

    return{
      start(){startedAt=performance.now();later(showSequence,180);},
      destroy(){finished=true;accepting=false;timers.forEach(clearTimeout);timers.clear();container.removeEventListener('pointerdown',press);}
    };
  });
})();