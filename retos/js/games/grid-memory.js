(() => {
  'use strict';

  window.PatxGameRegistry.register('grid-memory', ({ container, config = {}, seed = 1, onFinish }) => {
    const startCells=Number(config.start_cells||3);
    const maxLevel=Math.max(Number(config.max_level||20),20);
    const maxGrid=Math.max(Number(config.max_grid_size||8),8);
    let state=Number(seed)||1,level=0,target=[],picked=new Set(),accepting=false,finished=false,startedAt=0,cells=[];
    const timers=new Set();
    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}
    function later(fn,ms){const id=setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);return id;}
    function shuffle(pool){for(let i=pool.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}return pool;}
    function gridSize(){return Math.min(maxGrid,4+Math.floor(level/3));}
    function targetCount(size){return Math.min(startCells+level,Math.max(startCells,Math.floor(size*size*.44)));}
    function scatter(size,count){return shuffle(Array.from({length:size*size},(_,i)=>i)).slice(0,count);}
    function mirrored(size,count){const set=new Set(),pool=shuffle(Array.from({length:size*size},(_,i)=>i));for(const i of pool){if(set.size>=count)break;const row=Math.floor(i/size),col=i%size,mirror=row*size+(size-1-col);set.add(i);if(set.size<count)set.add(mirror);}return [...set].slice(0,count);}
    function path(size,count){const set=new Set();let row=Math.floor(rnd()*size),col=Math.floor(rnd()*size);set.add(row*size+col);const dirs=[[1,0],[-1,0],[0,1],[0,-1]];let guard=0;while(set.size<count&&guard++<300){const [dr,dc]=dirs[Math.floor(rnd()*dirs.length)];row=Math.max(0,Math.min(size-1,row+dr));col=Math.max(0,Math.min(size-1,col+dc));set.add(row*size+col);}if(set.size<count)scatter(size,size*size).forEach(i=>{if(set.size<count)set.add(i);});return [...set];}
    function makePattern(size,count){if(level<4)return scatter(size,count);if(level%3===1)return mirrored(size,count);if(level>=8&&level%3===2)return path(size,count);return scatter(size,count);}
    container.innerHTML=`<div class="game-surface memory-surface dynamic-memory-surface"><div class="game-kicker">GRID MEMORY</div><div class="memory-head"><div class="round-counter" data-level>Nivel 1</div><div class="round-counter" data-gridinfo>4 × 4</div></div><div class="memory-grid dynamic-memory-grid" data-grid></div><div class="memory-phase" data-phase>MEMORIZA</div><div class="game-help" data-help>La cuadrícula crecerá y los patrones serán cada vez más complejos.</div></div>`;
    const levelEl=container.querySelector('[data-level]'),gridInfo=container.querySelector('[data-gridinfo]'),grid=container.querySelector('[data-grid]'),phaseEl=container.querySelector('[data-phase]'),helpEl=container.querySelector('[data-help]');
    function renderGrid(size){grid.style.gridTemplateColumns=`repeat(${size},1fr)`;grid.dataset.size=String(size);grid.innerHTML=Array.from({length:size*size},(_,i)=>`<button type="button" class="memory-cell" data-cell="${i}" aria-label="Casilla ${i+1}"></button>`).join('');cells=[...grid.querySelectorAll('[data-cell]')];}
    function end(){if(finished)return;finished=true;accepting=false;phaseEl.textContent='FIN';helpEl.textContent='Resultado registrando…';onFinish({score:level,duration:performance.now()-startedAt,metadata:{level,grid_size:gridSize()}});}
    function showLevel(){if(finished)return;if(level>=maxLevel)return end();const size=gridSize(),count=targetCount(size);picked=new Set();accepting=false;renderGrid(size);target=makePattern(size,count);levelEl.textContent=`Nivel ${level+1}`;gridInfo.textContent=`${size} × ${size}`;phaseEl.textContent='MEMORIZA';phaseEl.className='memory-phase memorize';const patternName=level<4?'casillas':level%3===1?'patrón simétrico':level>=8&&level%3===2?'recorrido':'patrón';helpEl.textContent=`Memoriza ${target.length} casillas · ${patternName}.`;target.forEach(i=>cells[i]?.classList.add('is-lit'));const showMs=Math.max(650,1450-level*28+size*35);later(()=>{target.forEach(i=>cells[i]?.classList.remove('is-lit'));accepting=true;phaseEl.textContent='REPITE';phaseEl.className='memory-phase repeat';helpEl.textContent=`Toca las ${target.length} casillas exactas.`;},showMs);}
    function press(event){const cell=event.target.closest('[data-cell]');if(!cell||!accepting||finished)return;event.preventDefault();const i=Number(cell.dataset.cell);if(picked.has(i))return;if(!target.includes(i)){accepting=false;cell.classList.add('is-wrong');target.filter(x=>!picked.has(x)).forEach(x=>cells[x]?.classList.add('is-correct'));phaseEl.textContent='FALLO';phaseEl.className='memory-phase fail';helpEl.textContent=`Fin de la racha en nivel ${level+1}.`;return later(end,720);}picked.add(i);cell.classList.add('is-picked');if(picked.size===target.length){accepting=false;level+=1;phaseEl.textContent='¡BIEN!';phaseEl.className='memory-phase success';helpEl.textContent='Siguiente nivel: crece la dificultad.';later(showLevel,600);}}
    grid.addEventListener('pointerdown',press,{passive:false});
    return{start(){startedAt=performance.now();later(showLevel,180);},destroy(){finished=true;accepting=false;timers.forEach(clearTimeout);timers.clear();grid.removeEventListener('pointerdown',press);}};
  });
})();