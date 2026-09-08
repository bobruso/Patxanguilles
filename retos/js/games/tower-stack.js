(() => {
  'use strict';

  window.PatxGameRegistry.register('tower-stack', ({ container, config = {}, onFinish }) => {
    const maxLevel=Number(config.max_level||25);
    const startSpeed=Number(config.start_speed||0.55);
    const speedStep=Number(config.speed_step||0.035);
    let startedAt=0,finished=false,raf=0,level=0;
    let prev={x:25,w:50};
    let moving={x:0,w:50,dir:1};

    container.innerHTML=`
      <div class="game-surface stack-surface">
        <div class="game-kicker">TOWER STACK</div>
        <div class="round-counter" data-level>Nivel 0</div>
        <div class="stack-stage" data-stage><div class="stack-block base" style="left:25%;width:50%;bottom:8px"></div><div class="stack-block moving" data-moving></div></div>
        <div class="game-help" data-help>Toca para soltar el bloque.</div>
      </div>`;

    const levelEl=container.querySelector('[data-level]');
    const stage=container.querySelector('[data-stage]');
    const movingEl=container.querySelector('[data-moving]');
    const helpEl=container.querySelector('[data-help]');

    function speed(){return startSpeed+level*speedStep;}
    function renderMoving(){
      movingEl.style.left=`${moving.x}%`;
      movingEl.style.width=`${moving.w}%`;
      movingEl.style.bottom=`${8+(level+1)*14}px`;
    }

    function tick(){
      if(finished)return;
      moving.x+=moving.dir*speed();
      if(moving.x<=0){moving.x=0;moving.dir=1;}
      if(moving.x+moving.w>=100){moving.x=100-moving.w;moving.dir=-1;}
      renderMoving();
      raf=requestAnimationFrame(tick);
    }

    function end(){
      if(finished)return;
      finished=true;cancelAnimationFrame(raf);
      helpEl.textContent='Torre terminada';
      onFinish({score:level,duration:performance.now()-startedAt,metadata:{level}});
    }

    function drop(e){
      e?.preventDefault();
      if(finished)return;
      const left=Math.max(moving.x,prev.x);
      const right=Math.min(moving.x+moving.w,prev.x+prev.w);
      const overlap=right-left;
      if(overlap<=0)return end();

      level++;
      const block=document.createElement('div');
      block.className='stack-block landed';
      block.style.left=`${left}%`;block.style.width=`${overlap}%`;block.style.bottom=`${8+level*14}px`;
      stage.insertBefore(block,movingEl);
      prev={x:left,w:overlap};
      levelEl.textContent=`Nivel ${level}`;
      if(level>=maxLevel)return end();
      moving={x:moving.dir>0?0:100-overlap,w:overlap,dir:moving.dir};
      renderMoving();
      if(level>18)stage.classList.add('stack-compress');
    }

    container.addEventListener('pointerdown',drop,{passive:false});
    return{start(){startedAt=performance.now();renderMoving();raf=requestAnimationFrame(tick);},destroy(){finished=true;cancelAnimationFrame(raf);container.removeEventListener('pointerdown',drop);}};
  });
})();