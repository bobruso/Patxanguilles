(() => {
  'use strict';

  window.PatxGameRegistry.register('sequence', ({ container, config = {}, seed = 1, onFinish }) => {
    const startLength=Number(config.start_length||3);
    const maxLevel=Number(config.max_level||20);
    const maxGrid=Number(config.max_grid_size||5);
    let state=Number(seed)||1,sequence=[],inputIndex=0,level=0,accepting=false,finished=false,startedAt=0,pads=[];
    const timers=new Set();

    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}
    function later(fn,ms){const id=setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);return id;}
    function gridSize(){return Math.min(maxGrid,2+Math.floor(level/4));}
    function sequenceLength(){return startLength+level+Math.floor(level/3);}
    function makeSequence(totalPads,length){
      const out=[];let prev=-1;
      for(let i=0;i<length;i++){let next=Math.floor(rnd()*totalPads);while(totalPads>1&&next===prev)next=Math.floor(rnd()*totalPads);out.push(next);prev=next;}
      return out;
    }

    container.innerHTML=`
      <div class="game-surface sequence-surface dynamic-sequence-surface">
        <div class="game-kicker">SECUENCIA</div>
        <div class="sequence-head"><div class="round-counter" data-level>Nivel 1</div><div class="round-counter" data-gridinfo>2 × 2</div></div>
        <div class="sequence-grid dynamic-sequence-grid" data-grid></div>
        <div class="sequence-phase" data-phase>OBSERVA</div>
        <div class="game-help" data-help>Cada nivel cambia el patrón; la cuadrícula también crecerá.</div>
      </div>`;

    const levelEl=container.querySelector('[data-level]');
    const gridInfo=container.querySelector('[data-gridinfo]');
    const grid=container.querySelector('[data-grid]');
    const phaseEl=container.querySelector('[data-phase]');
    const helpEl=container.querySelector('[data-help]');

    function renderGrid(size){
      grid.style.gridTemplateColumns=`repeat(${size},1fr)`;
      grid.innerHTML=Array.from({length:size*size},(_,i)=>`<button type="button" class="sequence-pad simple-sequence-pad" data-pad="${i}" aria-label="Casilla ${i+1}"><span>${i+1}</span></button>`).join('');
      pads=[...grid.querySelectorAll('[data-pad]')];
    }
    function flash(index,on){pads[index]?.classList.toggle('is-lit',on);}

    function end(){
      if(finished)return;finished=true;accepting=false;phaseEl.textContent='FIN';helpEl.textContent='Resultado registrando…';
      onFinish({score:level,duration:performance.now()-startedAt,metadata:{level,sequence_length:sequence.length,grid_size:gridSize()}});
    }

    function showSequence(){
      if(finished)return;if(level>=maxLevel)return end();
      accepting=false;inputIndex=0;
      const size=gridSize(),wanted=sequenceLength();renderGrid(size);sequence=makeSequence(size*size,wanted);
      levelEl.textContent=`Nivel ${level+1}`;gridInfo.textContent=`${size} × ${size} · ${wanted} pasos`;
      phaseEl.textContent='OBSERVA';phaseEl.className='sequence-phase watch';helpEl.textContent='Memoriza el patrón completo.';
      const flashMs=Math.max(180,310-level*5),gapMs=Math.max(80,145-level*3);let t=260;
      sequence.forEach(pad=>{later(()=>flash(pad,true),t);later(()=>flash(pad,false),t+flashMs);t+=flashMs+gapMs;});
      later(()=>{accepting=true;phaseEl.textContent='TU TURNO';phaseEl.className='sequence-phase play';helpEl.textContent='Repítelo en el mismo orden.';},t+80);
    }

    function press(event){
      const button=event.target.closest('[data-pad]');if(!button||!accepting||finished)return;
      event.preventDefault();const pad=Number(button.dataset.pad);flash(pad,true);later(()=>flash(pad,false),110);
      if(pad!==sequence[inputIndex]){
        accepting=false;button.classList.add('is-wrong');pads[sequence[inputIndex]]?.classList.add('is-correct');phaseEl.textContent='FALLO';phaseEl.className='sequence-phase fail';helpEl.textContent=`Fin de la racha en nivel ${level+1}.`;return later(end,720);
      }
      inputIndex+=1;
      if(inputIndex>=sequence.length){accepting=false;level+=1;phaseEl.textContent='¡BIEN!';phaseEl.className='sequence-phase success';helpEl.textContent='Nuevo patrón, un poco más difícil.';later(showSequence,620);}
    }

    grid.addEventListener('pointerdown',press,{passive:false});
    return{start(){startedAt=performance.now();later(showSequence,180);},destroy(){finished=true;accepting=false;timers.forEach(clearTimeout);timers.clear();grid.removeEventListener('pointerdown',press);}};
  });
})();