(() => {
  'use strict';

  window.PatxGameRegistry.register('tower-stack', ({ container, config = {}, onFinish }) => {
    const maxLevel=Number(config.max_level||25),startSpeed=Number(config.start_speed||0.55),speedStep=Number(config.speed_step||0.035);
    let startedAt=0,finished=false,raf=0,level=0,prev={x:25,w:50},moving={x:0,w:50,dir:1};

    container.innerHTML=`
      <div class="game-surface stack-surface">
        <div class="game-kicker">TOWER STACK</div>
        <div class="stack-head"><div class="round-counter" data-level>Nivel 0</div><div class="round-counter" data-width>100%</div></div>
        <div class="stack-stage" data-stage>
          <div class="stack-skyline" aria-hidden="true"></div>
          <div class="stack-block base" style="left:25%;width:50%;bottom:8px"></div>
          <div class="stack-block moving" data-moving></div>
          <div class="stack-flash" data-flash></div>
        </div>
        <div class="game-help" data-help>Toca para soltar el bloque justo encima del anterior.</div>
      </div>`;

    const levelEl=container.querySelector('[data-level]'),widthEl=container.querySelector('[data-width]'),stage=container.querySelector('[data-stage]'),movingEl=container.querySelector('[data-moving]'),helpEl=container.querySelector('[data-help]'),flashEl=container.querySelector('[data-flash]');

    function speed(){return startSpeed+level*speedStep;}
    function renderMoving(){movingEl.style.left=`${moving.x}%`;movingEl.style.width=`${moving.w}%`;movingEl.style.bottom=`${8+(level+1)*14}px`;}
    function tick(){if(finished)return;moving.x+=moving.dir*speed();if(moving.x<=0){moving.x=0;moving.dir=1;}if(moving.x+moving.w>=100){moving.x=100-moving.w;moving.dir=-1;}renderMoving();raf=requestAnimationFrame(tick);}
    function end(){if(finished)return;finished=true;cancelAnimationFrame(raf);stage.classList.add('is-finished');helpEl.textContent='Torre terminada';onFinish({score:level,duration:performance.now()-startedAt,metadata:{level}});}

    function flash(ok){flashEl.className=`stack-flash ${ok?'perfect':'trim'}`;flashEl.textContent=ok?'PERFECTO':'RECORTADO';setTimeout(()=>{flashEl.className='stack-flash';flashEl.textContent='';},360);}

    function drop(e){
      e?.preventDefault();if(finished)return;
      const left=Math.max(moving.x,prev.x),right=Math.min(moving.x+moving.w,prev.x+prev.w),overlap=right-left;
      if(overlap<=0){helpEl.textContent='No has tocado la torre.';stage.classList.add('is-miss');return setTimeout(end,280);}
      const ratio=overlap/prev.w;
      level++;
      const block=document.createElement('div');block.className='stack-block landed';block.style.left=`${left}%`;block.style.width=`${overlap}%`;block.style.bottom=`${8+level*14}px`;stage.insertBefore(block,movingEl);
      prev={x:left,w:overlap};levelEl.textContent=`Nivel ${level}`;widthEl.textContent=`${Math.max(1,Math.round(overlap/50*100))}%`;helpEl.textContent=ratio>.96?'¡Perfecto!':'La torre se estrecha.';flash(ratio>.96);
      if(level>=maxLevel)return end();moving={x:moving.dir>0?0:100-overlap,w:overlap,dir:moving.dir};renderMoving();if(level>18)stage.classList.add('stack-compress');
    }

    container.addEventListener('pointerdown',drop,{passive:false});
    return{start(){startedAt=performance.now();renderMoving();raf=requestAnimationFrame(tick);},destroy(){finished=true;cancelAnimationFrame(raf);container.removeEventListener('pointerdown',drop);}};
  });
})();