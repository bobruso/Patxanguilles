(() => {
  'use strict';

  window.PatxGameRegistry.register('zig-zag', ({ container, config = {}, seed = 1, onFinish }) => {
    const maxScore=Number(config.max_score||40);
    let state=Number(seed)||1,startedAt=0,lastAt=0,finished=false,raf=0,playerX=.5,dir=1,score=0;
    const segmentMs=700,centers=[.5];
    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}
    for(let i=1;i<maxScore+8;i++){let delta=rnd()<.5?-.15:.15;let next=centers[i-1]+delta;if(next<.22||next>.78)next=centers[i-1]-delta;centers.push(next);}dir=centers[1]>=centers[0]?1:-1;

    container.innerHTML=`
      <div class="game-surface zig-surface">
        <div class="game-kicker">ZIG ZAG</div>
        <div class="arcade-head"><div class="round-counter" data-score>0 puntos</div><div class="round-counter">TOCA = GIRA</div></div>
        <canvas class="arcade-canvas zig-canvas" data-canvas></canvas>
        <div class="game-help">Cada toque cambia tu dirección. Mantente dentro del camino.</div>
      </div>`;
    const canvas=container.querySelector('[data-canvas]'),scoreEl=container.querySelector('[data-score]'),ctx=canvas.getContext('2d');

    function resize(){const rect=canvas.getBoundingClientRect();const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,Math.floor(rect.width*dpr));canvas.height=Math.max(1,Math.floor(rect.height*dpr));ctx.setTransform(dpr,0,0,dpr,0,0);}
    function dims(){const r=canvas.getBoundingClientRect();return{w:r.width,h:r.height};}
    function pathCenter(progress){const seg=Math.floor(progress),t=progress-seg;const a=centers[Math.min(seg,centers.length-1)],b=centers[Math.min(seg+1,centers.length-1)];return a+(b-a)*t;}

    function draw(progress){
      const {w,h}=dims();ctx.clearRect(0,0,w,h);
      const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#30247c');bg.addColorStop(1,'#17143e');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
      for(let i=0;i<18;i++){ctx.fillStyle=`rgba(255,255,255,${i%3===0?.12:.05})`;ctx.beginPath();ctx.arc((i*97)%w,(i*53)%h,2+(i%3),0,Math.PI*2);ctx.fill();}
      ctx.lineWidth=Math.max(54,w*.17);ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#7567d9';ctx.beginPath();
      for(let j=0;j<8;j++){const p=progress+j*.52,x=pathCenter(p)*w,y=h*.79-j*h*.105;if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
      ctx.lineWidth=Math.max(42,w*.13);ctx.strokeStyle='#f7f4ff';ctx.stroke();
      ctx.lineWidth=3;ctx.setLineDash([9,11]);ctx.strokeStyle='rgba(104,78,213,.35)';ctx.stroke();ctx.setLineDash([]);
      const px=playerX*w,py=h*.79;ctx.shadowColor='rgba(255,220,69,.6)';ctx.shadowBlur=16;ctx.beginPath();ctx.arc(px,py,13,0,Math.PI*2);ctx.fillStyle='#ffe04e';ctx.fill();ctx.shadowBlur=0;ctx.beginPath();ctx.arc(px,py,5,0,Math.PI*2);ctx.fillStyle='#5c46d6';ctx.fill();
    }

    function end(){if(finished)return;finished=true;cancelAnimationFrame(raf);onFinish({score,duration:performance.now()-startedAt,metadata:{points:score}});}
    function tick(now){
      if(finished)return;if(!lastAt)lastAt=now;const dt=Math.min(.035,(now-lastAt)/1000);lastAt=now;const elapsed=now-startedAt,progress=elapsed/segmentMs;playerX+=dir*.22*dt;
      const currentScore=Math.min(maxScore,Math.floor(progress));if(currentScore!==score){score=currentScore;scoreEl.textContent=`${score} punto${score===1?'':'s'}`;}
      const center=pathCenter(progress);if(Math.abs(playerX-center)>.105||playerX<0||playerX>1)return end();if(score>=maxScore)return end();draw(progress);raf=requestAnimationFrame(tick);
    }
    function press(e){e.preventDefault();if(!finished)dir*=-1;}
    canvas.addEventListener('pointerdown',press,{passive:false});window.addEventListener('resize',resize);
    return{start(){resize();startedAt=performance.now();raf=requestAnimationFrame(tick);},destroy(){finished=true;cancelAnimationFrame(raf);canvas.removeEventListener('pointerdown',press);window.removeEventListener('resize',resize);}};
  });
})();