(() => {
  'use strict';

  window.PatxGameRegistry.register('tower-stack', ({ container, config = {}, onFinish }) => {
    const maxLevel=Number(config.max_level||50),startSpeed=Number(config.start_speed||0.55),speedStep=Number(config.speed_step||0.035);
    const blockStep=18;
    let startedAt=0,finished=false,raf=0,level=0,prev={x:25,w:50},moving={x:0,w:50,dir:1},cameraY=0;

    container.innerHTML=`
      <div class="game-surface stack-surface camera-stack-surface">
        <div class="game-kicker">TOWER STACK</div>
        <div class="stack-head"><div class="round-counter" data-level>Nivel 0</div><div class="round-counter" data-width>100%</div></div>
        <div class="stack-stage camera-stack-stage" data-stage>
          <div class="stack-skyline" aria-hidden="true"></div>
          <div class="stack-world" data-world>
            <div class="stack-block base" style="left:25%;width:50%;bottom:8px"></div>
            <div class="stack-block moving" data-moving></div>
          </div>
          <div class="stack-focus-line" aria-hidden="true"></div>
          <div class="stack-flash" data-flash></div>
        </div>
        <div class="game-help" data-help>La cámara subirá contigo. Mantén la pieza móvil en el centro visual.</div>
      </div>`;

    const levelEl=container.querySelector('[data-level]'),widthEl=container.querySelector('[data-width]'),stage=container.querySelector('[data-stage]'),world=container.querySelector('[data-world]'),movingEl=container.querySelector('[data-moving]'),helpEl=container.querySelector('[data-help]'),flashEl=container.querySelector('[data-flash]');

    function speed(){return startSpeed+level*speedStep;}
    function desiredCamera(){
      const movingBottom=8+(level+1)*blockStep;
      const target=155;
      return Math.max(0,movingBottom-target);
    }
    function updateCamera(instant=false){
      const target=desiredCamera();
      if(instant)cameraY=target;else cameraY+=(target-cameraY)*.12;
      world.style.transform=`translateY(${cameraY}px)`;
      stage.style.setProperty('--tower-camera',String(cameraY));
    }
    function renderMoving(){
      movingEl.style.left=`${moving.x}%`;movingEl.style.width=`${moving.w}%`;movingEl.style.bottom=`${8+(level+1)*blockStep}px`;
    }
    function tick(){
      if(finished)return;
      moving.x+=moving.dir*speed();
      if(moving.x<=0){moving.x=0;moving.dir=1;}
      if(moving.x+moving.w>=100){moving.x=100-moving.w;moving.dir=-1;}
      renderMoving();updateCamera(false);raf=requestAnimationFrame(tick);
    }
    function end(){
      if(finished)return;finished=true;cancelAnimationFrame(raf);stage.classList.add('is-finished');helpEl.textContent=`Torre terminada · ${level} pisos`;
      onFinish({score:level,duration:performance.now()-startedAt,metadata:{level,final_width:Number(prev.w.toFixed(3))}});
    }
    function flash(ok){flashEl.className=`stack-flash ${ok?'perfect':'trim'}`;flashEl.textContent=ok?'PERFECTO':'RECORTADO';setTimeout(()=>{flashEl.className='stack-flash';flashEl.textContent='';},360);}

    function drop(e){
      e?.preventDefault();if(finished)return;
      const left=Math.max(moving.x,prev.x),right=Math.min(moving.x+moving.w,prev.x+prev.w),overlap=right-left;
      if(overlap<=0){helpEl.textContent='No has tocado la torre.';stage.classList.add('is-miss');return setTimeout(end,280);}
      const ratio=overlap/prev.w;level++;
      const block=document.createElement('div');block.className='stack-block landed';block.style.left=`${left}%`;block.style.width=`${overlap}%`;block.style.bottom=`${8+level*blockStep}px`;world.insertBefore(block,movingEl);
      prev={x:left,w:overlap};levelEl.textContent=`Nivel ${level}`;widthEl.textContent=`${Math.max(1,Math.round(overlap/50*100))}%`;helpEl.textContent=ratio>.96?'¡Perfecto! La cámara sube.':'La torre se estrecha.';flash(ratio>.96);
      if(level>=maxLevel)return end();
      moving={x:moving.dir>0?0:100-overlap,w:overlap,dir:moving.dir};renderMoving();updateCamera(false);
    }

    container.addEventListener('pointerdown',drop,{passive:false});
    return{start(){startedAt=performance.now();renderMoving();updateCamera(true);raf=requestAnimationFrame(tick);},destroy(){finished=true;cancelAnimationFrame(raf);container.removeEventListener('pointerdown',drop);}};
  });
})();