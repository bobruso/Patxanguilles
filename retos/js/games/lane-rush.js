(() => {
  'use strict';

  window.PatxGameRegistry.register('lane-rush', ({ container, config = {}, seed = 1, onFinish }) => {
    const lanes=Number(config.lanes||3);
    const maxScore=Number(config.max_score||60);
    const startInterval=Number(config.start_interval_ms||950);
    const minInterval=Number(config.min_interval_ms||300);
    let state=Number(seed)||1,startedAt=0,lastAt=0,lastSpawn=0,finished=false,raf=0,playerLane=Math.floor(lanes/2),score=0;
    const obstacles=[];
    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}

    container.innerHTML=`
      <div class="game-surface lane-surface football-lane-surface">
        <div class="game-kicker">LANE RUSH</div>
        <div class="arcade-head"><div class="round-counter" data-score>0 regates</div><div class="round-counter" data-speed>VELOCIDAD ×1.00</div></div>
        <canvas class="arcade-canvas lane-canvas" data-canvas aria-label="Carrera con balón"></canvas>
        <div class="lane-controls football-lane-controls"><button type="button" data-move="-1">← IZQUIERDA</button><button type="button" data-move="1">DERECHA →</button></div>
        <div class="game-help">Esquiva las entradas. En PC usa ← → o A / D.</div>
      </div>`;
    const canvas=container.querySelector('[data-canvas]'),scoreEl=container.querySelector('[data-score]'),speedEl=container.querySelector('[data-speed]'),ctx=canvas.getContext('2d');

    function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,Math.floor(r.width*d));canvas.height=Math.max(1,Math.floor(r.height*d));ctx.setTransform(d,0,0,d,0,0);}
    function dims(){const r=canvas.getBoundingClientRect();return{w:r.width,h:r.height};}
    function fieldX(lane,w){const left=w*.12,width=w*.76;return left+((lane+.5)/lanes)*width;}
    function spawn(now){
      const type=Math.floor(rnd()*3);
      obstacles.push({lane:Math.floor(rnd()*lanes),y:-.12,type,phase:rnd()*Math.PI*2});
      lastSpawn=now;
    }
    function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
    function drawFootball(x,y,r){
      ctx.save();ctx.translate(x,y);ctx.fillStyle='#fff';ctx.strokeStyle='#20242c';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle='#20242c';ctx.beginPath();for(let i=0;i<5;i++){const a=-Math.PI/2+i*Math.PI*2/5,px=Math.cos(a)*r*.33,py=Math.sin(a)*r*.33;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();ctx.fill();
      ctx.restore();
    }
    function drawRunner(x,y,t){
      const bob=Math.sin(t*.012)*2;
      ctx.save();ctx.translate(x,y+bob);
      ctx.fillStyle='#f2bf92';ctx.beginPath();ctx.arc(0,-27,8,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#171923';rr(-10,-20,20,25,7);
      ctx.strokeStyle='#171923';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-5,3);ctx.lineTo(-10,18);ctx.moveTo(5,3);ctx.lineTo(11,17);ctx.stroke();
      ctx.strokeStyle='#f2bf92';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-9,-14);ctx.lineTo(-17,-2);ctx.moveTo(9,-14);ctx.lineTo(17,-3);ctx.stroke();
      drawFootball(10,24,8);
      ctx.restore();
    }
    function drawDefender(o,x,y){
      ctx.save();ctx.translate(x,y);ctx.fillStyle='#df3f4f';ctx.strokeStyle='#8b1e2b';ctx.lineCap='round';
      if(o.type===0){
        ctx.rotate(-.22);ctx.fillStyle='#f0b98d';ctx.beginPath();ctx.arc(-20,-5,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#df3f4f';rr(-13,-12,30,18,7);ctx.strokeStyle='#df3f4f';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(11,0);ctx.lineTo(28,10);ctx.moveTo(5,3);ctx.lineTo(-4,15);ctx.stroke();
      }else if(o.type===1){
        ctx.fillStyle='#f0b98d';ctx.beginPath();ctx.arc(0,-24,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#df3f4f';rr(-11,-18,22,25,7);ctx.strokeStyle='#df3f4f';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-6,5);ctx.lineTo(-18,20);ctx.moveTo(6,5);ctx.lineTo(18,19);ctx.stroke();ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-8,-12);ctx.lineTo(-22,0);ctx.moveTo(8,-12);ctx.lineTo(21,-2);ctx.stroke();
      }else{
        ctx.rotate(.18);ctx.fillStyle='#f0b98d';ctx.beginPath();ctx.arc(0,-22,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#df3f4f';rr(-10,-16,20,23,6);ctx.strokeStyle='#df3f4f';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-5,5);ctx.lineTo(-14,20);ctx.moveTo(5,5);ctx.lineTo(22,13);ctx.stroke();
      }
      ctx.restore();
    }

    function draw(now){
      const {w,h}=dims();ctx.clearRect(0,0,w,h);
      ctx.fillStyle='#2f8d49';ctx.fillRect(0,0,w,h);
      for(let i=0;i<9;i++){ctx.fillStyle=i%2?'rgba(255,255,255,.035)':'rgba(0,0,0,.035)';ctx.fillRect(0,i*h/9,w,h/9);}
      const left=w*.12,right=w*.88;ctx.strokeStyle='rgba(255,255,255,.82)';ctx.lineWidth=3;ctx.strokeRect(left,0,right-left,h);
      ctx.setLineDash([18,22]);ctx.strokeStyle='rgba(255,255,255,.42)';ctx.lineWidth=2;for(let i=1;i<lanes;i++){const x=left+i*(right-left)/lanes;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}ctx.setLineDash([]);
      ctx.fillStyle='rgba(255,255,255,.16)';ctx.beginPath();ctx.arc(w/2,h*.38,42,0,Math.PI*2);ctx.fill();
      const px=fieldX(playerLane,w);drawRunner(px,h*.79,now);
      obstacles.forEach(o=>drawDefender(o,fieldX(o.lane,w),o.y*h));
    }

    function end(){if(finished)return;finished=true;cancelAnimationFrame(raf);onFinish({score,duration:performance.now()-startedAt,metadata:{points:score}});}
    function tick(now){
      if(finished)return;if(!lastAt)lastAt=now;const dt=Math.min(.035,(now-lastAt)/1000);lastAt=now;
      const interval=Math.max(minInterval,startInterval-score*15);if(now-lastSpawn>=interval)spawn(now);
      const speed=.42+Math.min(.72,score*.012);speedEl.textContent=`VELOCIDAD ×${(speed/.42).toFixed(2)}`;
      for(let i=obstacles.length-1;i>=0;i--){const o=obstacles[i];o.y+=speed*dt;if(o.lane===playerLane&&o.y>.69&&o.y<.88)return end();if(o.y>1.12){obstacles.splice(i,1);score++;scoreEl.textContent=`${score} regate${score===1?'':'s'}`;if(score>=maxScore)return end();}}
      draw(now);raf=requestAnimationFrame(tick);
    }
    function move(delta){if(finished)return;playerLane=Math.max(0,Math.min(lanes-1,playerLane+delta));}
    function press(e){const b=e.target.closest('[data-move]');if(b){e.preventDefault();move(Number(b.dataset.move));return;}if(e.target===canvas){const r=canvas.getBoundingClientRect();move(e.clientX-r.left<r.width/2?-1:1);}}
    function key(e){if(e.key==='ArrowLeft'||e.key.toLowerCase()==='a')move(-1);else if(e.key==='ArrowRight'||e.key.toLowerCase()==='d')move(1);}
    container.addEventListener('pointerdown',press,{passive:false});window.addEventListener('keydown',key);window.addEventListener('resize',resize);
    return{start(){resize();startedAt=performance.now();lastSpawn=startedAt-500;raf=requestAnimationFrame(tick);},destroy(){finished=true;cancelAnimationFrame(raf);container.removeEventListener('pointerdown',press);window.removeEventListener('keydown',key);window.removeEventListener('resize',resize);}};
  });
})();