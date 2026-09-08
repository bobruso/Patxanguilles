(() => {
  'use strict';

  window.PatxGameRegistry.register('lane-rush', ({ container, config = {}, seed = 1, onFinish }) => {
    const lanes=Number(config.lanes||3);
    const maxScore=Number(config.max_score||40);
    const startInterval=Number(config.start_interval_ms||900);
    const minInterval=Number(config.min_interval_ms||360);
    let state=Number(seed)||1;
    let startedAt=0,lastAt=0,lastSpawn=0,finished=false,raf=0,playerLane=Math.floor(lanes/2),score=0;
    const obstacles=[];
    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}

    container.innerHTML=`
      <div class="game-surface lane-surface">
        <div class="game-kicker">LANE RUSH</div>
        <div class="round-counter" data-score>0 puntos</div>
        <canvas class="arcade-canvas" data-canvas></canvas>
        <div class="lane-controls"><span>← TOCA IZQUIERDA</span><span>TOCA DERECHA →</span></div>
      </div>`;
    const canvas=container.querySelector('[data-canvas]');
    const scoreEl=container.querySelector('[data-score]');
    const ctx=canvas.getContext('2d');

    function resize(){const r=canvas.getBoundingClientRect();const d=Math.min(devicePixelRatio||1,2);canvas.width=Math.floor(r.width*d);canvas.height=Math.floor(r.height*d);ctx.setTransform(d,0,0,d,0,0);}
    function dims(){const r=canvas.getBoundingClientRect();return{w:r.width,h:r.height};}
    function laneX(i,w){return ((i+.5)/lanes)*w;}

    function spawn(now){
      const lane=Math.floor(rnd()*lanes);
      obstacles.push({lane,y:-.08});
      lastSpawn=now;
    }

    function draw(){
      const {w,h}=dims();ctx.clearRect(0,0,w,h);ctx.fillStyle='#0d1118';ctx.fillRect(0,0,w,h);
      ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=1;
      for(let i=1;i<lanes;i++){const x=i*w/lanes;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
      const px=laneX(playerLane,w);ctx.fillStyle='#f4f7f8';ctx.fillRect(px-16,h*.82-18,32,36);ctx.fillStyle='#ef3340';ctx.fillRect(px-10,h*.82-11,20,22);
      ctx.fillStyle='#ffd166';
      obstacles.forEach(o=>{const x=laneX(o.lane,w);ctx.fillRect(x-18,o.y*h-12,36,24);});
    }

    function end(){if(finished)return;finished=true;cancelAnimationFrame(raf);onFinish({score,duration:performance.now()-startedAt,metadata:{points:score}});}

    function tick(now){
      if(finished)return;
      if(!lastAt)lastAt=now;
      const dt=Math.min(.035,(now-lastAt)/1000);lastAt=now;
      const interval=Math.max(minInterval,startInterval-score*13);
      if(now-lastSpawn>=interval)spawn(now);
      const speed=.48+score*.008;
      for(let i=obstacles.length-1;i>=0;i--){
        const o=obstacles[i];o.y+=speed*dt;
        if(o.lane===playerLane&&o.y>.75&&o.y<.89)return end();
        if(o.y>1.08){obstacles.splice(i,1);score++;scoreEl.textContent=`${score} punto${score===1?'':'s'}`;if(score>=maxScore)return end();}
      }
      draw();raf=requestAnimationFrame(tick);
    }

    function press(e){
      e.preventDefault();if(finished)return;
      const r=canvas.getBoundingClientRect();const x=e.clientX-r.left;
      if(x<r.width/2)playerLane=Math.max(0,playerLane-1);else playerLane=Math.min(lanes-1,playerLane+1);
    }
    canvas.addEventListener('pointerdown',press,{passive:false});window.addEventListener('resize',resize);
    return{start(){resize();startedAt=performance.now();lastSpawn=startedAt-500;raf=requestAnimationFrame(tick);},destroy(){finished=true;cancelAnimationFrame(raf);canvas.removeEventListener('pointerdown',press);window.removeEventListener('resize',resize);}};
  });
})();