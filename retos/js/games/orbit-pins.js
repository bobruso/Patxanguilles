(() => {
  'use strict';
  window.PatxGameRegistry.register('orbit-pins', ({container,config={},seed=1,onFinish}) => {
    const maxPins=Number(config.max_score||14);
    let startedAt=0,finished=false,raf=0,rotation=0,speed=.018,pins=[];
    container.innerHTML=`<div class="game-surface orbit-surface"><div class="game-kicker">ORBIT PINS</div><div class="round-counter" data-count>0 / ${maxPins}</div><canvas class="arcade-canvas" width="560" height="320"></canvas><div class="game-help">Toca para lanzar una clavija. No choques con las anteriores.</div></div>`;
    const canvas=container.querySelector('canvas'),ctx=canvas.getContext('2d'),countEl=container.querySelector('[data-count]');
    function norm(a){while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a;}
    function finish(){if(finished)return;finished=true;cancelAnimationFrame(raf);onFinish({score:pins.length,duration:performance.now()-startedAt,metadata:{pins:pins.length}});}
    function shoot(){if(finished)return;const entry=Math.PI/2;for(const rel of pins){const world=norm(rel+rotation);if(Math.abs(norm(world-entry))<.24)return finish();}pins.push(norm(entry-rotation));countEl.textContent=`${pins.length} / ${maxPins}`;speed=Math.min(.045,speed+.0015);if(pins.length>=maxPins)finish();}
    function draw(){ctx.clearRect(0,0,560,320);ctx.fillStyle='#0d1118';ctx.fillRect(0,0,560,320);const cx=280,cy=142,r=72;ctx.strokeStyle='#d8dee7';ctx.lineWidth=4;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();for(const rel of pins){const a=rel+rotation;const x1=cx+Math.cos(a)*r,y1=cy+Math.sin(a)*r,x2=cx+Math.cos(a)*(r+34),y2=cy+Math.sin(a)*(r+34);ctx.strokeStyle='#ef3340';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}ctx.strokeStyle='#fff';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(cx,305);ctx.lineTo(cx,238);ctx.stroke();ctx.beginPath();ctx.moveTo(cx-8,246);ctx.lineTo(cx,238);ctx.lineTo(cx+8,246);ctx.stroke();}
    function loop(){if(finished)return;rotation+=speed;draw();raf=requestAnimationFrame(loop);}
    canvas.addEventListener('pointerdown',shoot);
    return{start(){startedAt=performance.now();raf=requestAnimationFrame(loop);},destroy(){finished=true;cancelAnimationFrame(raf);canvas.removeEventListener('pointerdown',shoot);}};
  });
})();