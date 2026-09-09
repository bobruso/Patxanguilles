(() => {
  'use strict';

  window.PatxGameRegistry.register('orbit-pins', ({container,config={},onFinish}) => {
    const maxPins=Number(config.max_score||14);
    let startedAt=0,finished=false,raf=0,rotation=0,speed=.018,pins=[],flash='';

    container.innerHTML=`
      <div class="game-surface orbit-surface">
        <div class="game-kicker">ORBIT PINS</div>
        <div class="orbit-head"><div class="round-counter" data-count>0 / ${maxPins}</div><div class="round-counter" data-speed>NIVEL 1</div></div>
        <canvas class="arcade-canvas orbit-canvas" width="560" height="320"></canvas>
        <div class="game-help" data-help>Toca para lanzar una clavija. No choques con las anteriores.</div>
      </div>`;
    const canvas=container.querySelector('canvas'),ctx=canvas.getContext('2d'),countEl=container.querySelector('[data-count]'),speedEl=container.querySelector('[data-speed]'),helpEl=container.querySelector('[data-help]');

    function norm(a){while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a;}
    function finish(){if(finished)return;finished=true;cancelAnimationFrame(raf);onFinish({score:pins.length,duration:performance.now()-startedAt,metadata:{pins:pins.length}});}

    function shoot(){
      if(finished)return;
      const entry=Math.PI/2;
      for(const rel of pins){const world=norm(rel+rotation);if(Math.abs(norm(world-entry))<.24){flash='miss';helpEl.textContent='¡Choque!';return setTimeout(finish,240);}}
      pins.push(norm(entry-rotation));countEl.textContent=`${pins.length} / ${maxPins}`;speed=Math.min(.045,speed+.0015);speedEl.textContent=`NIVEL ${1+Math.floor(pins.length/4)}`;flash='hit';helpEl.textContent=pins.length===maxPins?'¡Completado!':'Buena clavija';setTimeout(()=>{flash='';},180);if(pins.length>=maxPins)setTimeout(finish,260);
    }

    function draw(){
      ctx.clearRect(0,0,560,320);const bg=ctx.createLinearGradient(0,0,560,320);bg.addColorStop(0,'#30266f');bg.addColorStop(1,'#18143b');ctx.fillStyle=bg;ctx.fillRect(0,0,560,320);
      const cx=280,cy=140,r=72;
      ctx.shadowColor='rgba(112,216,255,.35)';ctx.shadowBlur=20;ctx.fillStyle=flash==='miss'?'#ff7890':'#6f5be0';ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=6;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle='#ffe04e';ctx.beginPath();ctx.arc(cx,cy,16,0,Math.PI*2);ctx.fill();
      for(const rel of pins){const a=rel+rotation,x1=cx+Math.cos(a)*r,y1=cy+Math.sin(a)*r,x2=cx+Math.cos(a)*(r+38),y2=cy+Math.sin(a)*(r+38);ctx.strokeStyle='#fff';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.fillStyle='#ff7b91';ctx.beginPath();ctx.arc(x2,y2,6,0,Math.PI*2);ctx.fill();}
      ctx.strokeStyle='#ffe04e';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(cx,306);ctx.lineTo(cx,240);ctx.stroke();ctx.beginPath();ctx.moveTo(cx-10,250);ctx.lineTo(cx,240);ctx.lineTo(cx+10,250);ctx.stroke();
      if(flash==='hit'){ctx.fillStyle='rgba(255,224,78,.18)';ctx.beginPath();ctx.arc(cx,cy,r+24,0,Math.PI*2);ctx.fill();}
    }
    function loop(){if(finished)return;rotation+=speed;draw();raf=requestAnimationFrame(loop);}
    canvas.addEventListener('pointerdown',shoot);
    return{start(){startedAt=performance.now();raf=requestAnimationFrame(loop);},destroy(){finished=true;cancelAnimationFrame(raf);canvas.removeEventListener('pointerdown',shoot);}};
  });
})();