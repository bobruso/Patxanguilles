(() => {
  'use strict';

  window.PatxGameRegistry.register('grid-memory', ({ container, config = {}, seed = 1, onFinish }) => {
    const startCells=Number(config.start_cells||3);
    const maxLevel=Math.min(Number(config.max_level||8),8);
    let state=Number(seed)||1,level=0,target=[],picked=new Set(),accepting=false,finished=false,startedAt=0;
    const timers=new Set();

    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}
    function later(fn,ms){const id=setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);return id;}
    function chooseCells(count){
      const pool=Array.from({length:16},(_,i)=>i);
      for(let i=pool.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
      return pool.slice(0,Math.min(count,10));
    }

    container.innerHTML=`
      <div class="game-surface memory-surface">
        <div class="game-kicker">GRID MEMORY</div>
        <div class="memory-head">
          <div class="round-counter" data-level>Nivel 1</div>
          <div class="round-counter" data-count>0 / 0</div>
        </div>
        <div class="memory-grid" data-grid>
          ${Array.from({length:16},(_,i)=>`<button type="button" class="memory-cell" data-cell="${i}" aria-label="Casilla ${i+1}"></button>`).join('')}
        </div>
        <div class="memory-phase" data-phase>MEMORIZA</div>
        <div class="game-help" data-help>Memoriza las casillas iluminadas.</div>
      </div>`;

    const levelEl=container.querySelector('[data-level]');
    const countEl=container.querySelector('[data-count]');
    const phaseEl=container.querySelector('[data-phase]');
    const helpEl=container.querySelector('[data-help]');
    const cells=[...container.querySelectorAll('[data-cell]')];

    function end(){
      if(finished)return;
      finished=true;accepting=false;
      phaseEl.textContent='FIN';
      helpEl.textContent='Resultado registrando…';
      onFinish({score:level,duration:performance.now()-startedAt,metadata:{level}});
    }

    function clearCells(){cells.forEach(cell=>cell.classList.remove('is-lit','is-picked','is-wrong','is-correct'));}

    function showLevel(){
      if(finished)return;
      if(level>=maxLevel)return end();
      picked=new Set();accepting=false;clearCells();
      const count=startCells+Math.floor(level/2);
      target=chooseCells(count);
      levelEl.textContent=`Nivel ${level+1}`;
      countEl.textContent=`0 / ${target.length}`;
      phaseEl.textContent='MEMORIZA';
      phaseEl.className='memory-phase memorize';
      helpEl.textContent=`Memoriza ${target.length} casillas.`;
      target.forEach(i=>cells[i].classList.add('is-lit'));
      const showMs=Math.max(520,1100-level*45);
      later(()=>{
        target.forEach(i=>cells[i].classList.remove('is-lit'));
        accepting=true;
        phaseEl.textContent='REPITE';
        phaseEl.className='memory-phase repeat';
        helpEl.textContent='Toca exactamente las casillas que viste.';
      },showMs);
    }

    function press(event){
      const cell=event.target.closest('[data-cell]');
      if(!cell||!accepting||finished)return;
      event.preventDefault();
      const i=Number(cell.dataset.cell);
      if(picked.has(i))return;
      if(!target.includes(i)){
        accepting=false;
        cell.classList.add('is-wrong');
        target.filter(x=>!picked.has(x)).forEach(x=>cells[x].classList.add('is-correct'));
        phaseEl.textContent='FALLO';
        phaseEl.className='memory-phase fail';
        helpEl.textContent='Esa casilla no estaba iluminada.';
        return later(end,700);
      }
      picked.add(i);
      cell.classList.add('is-picked');
      countEl.textContent=`${picked.size} / ${target.length}`;
      if(picked.size===target.length){
        accepting=false;level+=1;
        phaseEl.textContent='¡BIEN!';
        phaseEl.className='memory-phase success';
        helpEl.textContent='Perfecto. Siguiente nivel.';
        later(showLevel,650);
      }
    }

    container.addEventListener('pointerdown',press,{passive:false});

    return{
      start(){startedAt=performance.now();later(showLevel,180);},
      destroy(){finished=true;accepting=false;timers.forEach(clearTimeout);timers.clear();container.removeEventListener('pointerdown',press);}
    };
  });
})();