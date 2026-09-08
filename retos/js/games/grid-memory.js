(() => {
  'use strict';

  window.PatxGameRegistry.register('grid-memory', ({ container, config = {}, seed = 1, onFinish }) => {
    const startCells = Number(config.start_cells || 3);
    const maxLevel = Number(config.max_level || 15);
    let state = Number(seed) || 1;
    let level = 0;
    let target = [];
    let picked = new Set();
    let accepting = false;
    let finished = false;
    let startedAt = 0;
    const timers = new Set();

    function rnd(){ state=(state*1664525+1013904223)>>>0; return state/4294967296; }
    function later(fn,ms){ const id=setTimeout(()=>{timers.delete(id);fn();},ms); timers.add(id); return id; }
    function chooseCells(count){
      const pool=Array.from({length:16},(_,i)=>i);
      for(let i=pool.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
      return pool.slice(0,Math.min(count,10));
    }

    container.innerHTML=`
      <div class="game-surface memory-surface">
        <div class="game-kicker">GRID MEMORY</div>
        <div class="round-counter" data-level>Nivel 1</div>
        <div class="memory-grid">
          ${Array.from({length:16},(_,i)=>`<button type="button" class="memory-cell" data-cell="${i}" aria-label="Casilla ${i+1}"></button>`).join('')}
        </div>
        <div class="game-help" data-help>Memoriza las casillas iluminadas.</div>
      </div>`;

    const levelEl=container.querySelector('[data-level]');
    const helpEl=container.querySelector('[data-help]');
    const cells=[...container.querySelectorAll('[data-cell]')];

    function end(){
      if(finished) return;
      finished=true;
      accepting=false;
      const duration=performance.now()-startedAt;
      helpEl.textContent='Resultado registrando…';
      onFinish({score:level,duration,metadata:{level}});
    }

    function showLevel(){
      if(finished) return;
      if(level>=maxLevel) return end();
      picked=new Set();
      accepting=false;
      const count=startCells+Math.floor(level/2);
      target=chooseCells(count);
      levelEl.textContent=`Nivel ${level+1}`;
      helpEl.textContent=`Memoriza ${target.length} casillas.`;
      cells.forEach(cell=>cell.classList.remove('is-lit','is-picked'));
      target.forEach(i=>cells[i].classList.add('is-lit'));
      const showMs=Math.max(420,1000-level*35);
      later(()=>{
        target.forEach(i=>cells[i].classList.remove('is-lit'));
        accepting=true;
        helpEl.textContent='Ahora repítelas.';
      },showMs);
    }

    function press(event){
      const cell=event.target.closest('[data-cell]');
      if(!cell||!accepting||finished) return;
      event.preventDefault();
      const i=Number(cell.dataset.cell);
      if(picked.has(i)) return;
      if(!target.includes(i)){
        cell.classList.add('is-wrong');
        helpEl.textContent='Esa no era.';
        return later(end,300);
      }
      picked.add(i);
      cell.classList.add('is-picked');
      if(picked.size===target.length){
        accepting=false;
        level+=1;
        helpEl.textContent='¡Bien!';
        later(showLevel,450);
      }
    }

    container.addEventListener('pointerdown',press,{passive:false});

    return {
      start(){ startedAt=performance.now(); later(showLevel,350); },
      destroy(){ finished=true; accepting=false; timers.forEach(clearTimeout); timers.clear(); container.removeEventListener('pointerdown',press); }
    };
  });
})();