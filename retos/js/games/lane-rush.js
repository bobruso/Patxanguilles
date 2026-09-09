(() => {
  'use strict';

  window.PatxGameRegistry.register('lane-rush', ({ container, config = {}, seed = 1, onFinish }) => {
    const lanes=Number(config.lanes||3),maxScore=Number(config.max_score||40),startInterval=Number(config.start_interval_ms||900),minInterval=Number(config.min_interval_ms||360);
    let state=Number(seed)||1,startedAt=0,lastAt=0,lastSpawn=0,finished=false,raf=0,playerLane=Math.floor(lanes/2),score=0;
    const obstacles=[];
    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}

    container.innerHTML=`
      <div class="game-surface lane-surface">
        <div class="game-kicker">LANE RUSH</div>
        <div class="arcade-head"><div class="round-counter" data-score>0 puntos</div><div class="round-counter" data-speed>NIVEL 1</div></div>
        <canvas class="arcade-canvas lane-canvas" data-canvas></canvas>
        <div class="lane-controls"><span>← TOCA IZQUIERDA</span><span>TOCA DERECHA →</span></div>
      </div>`;
    const canvas=container.querySelector('[data-canvas]'),scoreEl=container.querySelector('[data-score]'),speedEl=container.querySelector('[data-speed]'),ctx=canvas.getContext('2d');

    function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);canvas.width=Math.floor(r.width*d);canvas.height=Math.floor(r.height*d);ctx.setTransform(d,0,0,d,0,0);}
    function dims(){const r=canvas.getBoundingClientRect();return{w:r.width,h:r.height};}
    function laneX(i,w){return((i+.5)/lanes)*w;}
    function spawn(now){obstacles.push({lane:Math.floor(rnd()*lanes),y:-.08,type:rnd()<.5?0:1});lastSpawn=now;}

    function roundedRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
    function draw(){
      const {w,h}=dims();ctx.clearRect(0,0,w,h);
      const bg=ctx.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#40358c');bg.addColorStop(1,'#211a52');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
      ctx.fillStyle='#554aa3';ctx.fillRect(w*.12,0,w*.76,h);
      ctx.strokeStyle='rgba(255,255,255,.38)';ctx.lineWidth=3;ctx.setLineDash([18,18]);
      for(let i=1;i<lanes;i++){const x=w*.12+i*(w*.76/lanes);ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}ctx.setLineDash([]);
      const px=w*.12+((playerLane+.5)/lanes)*w*.76;
      ctx.fillStyle='#ffe04f';roundedRect(px-18,h*.8-24,36,48,10);ctx.fillStyle='#5d46db';roundedRect(px-10,h*.8-15,20,30,6);
      obstacles.forEach(o=>{const x=w*.12+((o.lane+.5)/lanes)*w*.76,y=o.y*h;ctx.fillStyle=o.type===0?'#ff7b91':'#73d9ff';roundedRect(x-20,y-14,40,28,8);ctx.fillStyle='rgba(255,255,255,.72)';roundedRect(x-11,y-7,22,7,4);});
    }

    function end(){if(finished)return;finished=true;cancelAnimationFrame(raf);onFinish({score,duration:performance.now()-startedAt,metadata:{points:score}});}
    function tick(now){
      if(finished)return;if(!lastAt)lastAt=now;const dt=Math.min(.035,(now-lastAt)/1000);lastAt=now;
      const interval=Math.max(minInterval,startInterval-score*13);if(now-lastSpawn>=interval)spawn(now);const speed=.48+score*.008;
      speedEl.textContent=`NIVEL ${1+Math.floor(score/8)}`;
      for(let i=obstacles.length-1;i>=0;i--){const o=obstacles[i];o.y+=speed*dt;if(o.lane===playerLane&&o.y>.75&&o.y<.89)return end();if(o.y>1.08){obstacles.splice(i,1);score++;scoreEl.textContent=`${score} punto${score===1?'':'s'}`;if(score>=maxScore)return end();}}
      draw();raf=requestAnimationFrame(tick);
    }
    function press(e){e.preventDefault();if(finished)return;const r=canvas.getBoundingClientRect(),x=e.clientX-r.left;if(x<r.width/2)playerLane=Math.max(0,playerLane-1);else playerLane=Math.min(lanes-1,playerLane+1);}
    canvas.addEventListener('pointerdown',press,{passive:false});window.addEventListener('resize',resize);
    return{start(){resize();startedAt=performance.now();lastSpawn=startedAt-500;raf=requestAnimationFrame(tick);},destroy(){finished=true;cancelAnimationFrame(raf);canvas.removeEventListener('pointerdown',press);window.removeEventListener('resize',resize);}};
  });
})();