(() => {
  'use strict';

  window.PatxGameRegistry.register('zig-zag', ({ container, config = {}, seed = 1, onFinish }) => {
    const maxScore=Number(config.max_score||120);
    let state=Number(seed)||1,startedAt=0,lastAt=0,finished=false,raf=0,playerX=.5,dir=1,score=0,progress=0;
    const centers=[.5,.5,.5];
    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}

    function difficulty(segment){return Math.min(1,segment/35);}
    for(let i=3;i<maxScore+18;i++){
      const d=difficulty(i);
      const amp=.035+d*.15;
      let delta=(rnd()*2-1)*amp;
      if(i<7)delta*=.35;
      let next=centers[i-1]+delta;
      if(next<.18||next>.82)next=centers[i-1]-delta;
      centers.push(Math.max(.18,Math.min(.82,next)));
    }
    dir=1;

    container.innerHTML=`
      <div class="game-surface zig-surface smooth-zig-surface">
        <div class="game-kicker">ZIG ZAG</div>
        <div class="arcade-head"><div class="round-counter" data-score>0 puntos</div><div class="round-counter" data-speed>FÁCIL · ×1.00</div></div>
        <canvas class="arcade-canvas zig-canvas" data-canvas></canvas>
        <div class="game-help">Toca para cambiar de dirección. El camino empieza ancho y suave; después acelera y se retuerce.</div>
      </div>`;
    const canvas=container.querySelector('[data-canvas]'),scoreEl=container.querySelector('[data-score]'),speedEl=container.querySelector('[data-speed]'),ctx=canvas.getContext('2d');

    function resize(){const rect=canvas.getBoundingClientRect();const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,Math.floor(rect.width*dpr));canvas.height=Math.max(1,Math.floor(rect.height*dpr));ctx.setTransform(dpr,0,0,dpr,0,0);}
    function dims(){const r=canvas.getBoundingClientRect();return{w:r.width,h:r.height};}
    function catmull(p0,p1,p2,p3,t){const t2=t*t,t3=t2*t;return .5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3);}
    function pathCenter(p){
      const i=Math.floor(p),t=p-i;
      const p0=centers[Math.max(0,i-1)],p1=centers[Math.min(i,centers.length-1)],p2=centers[Math.min(i+1,centers.length-1)],p3=centers[Math.min(i+2,centers.length-1)];
      return Math.max(.12,Math.min(.88,catmull(p0,p1,p2,p3,t)));
    }
    function roadHalf(){return Math.max(.075,.155-Math.min(score,45)*.00175);}
    function pace(){return .58+Math.min(score,60)*.014;}
    function steerSpeed(){return .17+Math.min(score,50)*.0018;}

    function draw(){
      const {w,h}=dims();ctx.clearRect(0,0,w,h);
      const bg=ctx.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#7567db');bg.addColorStop(1,'#30246f');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
      for(let i=0;i<18;i++){ctx.fillStyle='rgba(255,255,255,.09)';ctx.beginPath();ctx.arc((i*83+score*7)%w,(i*61)%h,2+(i%2),0,Math.PI*2);ctx.fill();}

      const samples=34,baseY=h*.8,span=h*.86;
      const pts=[];
      for(let j=0;j<samples;j++){const look=progress+j*.12;pts.push([pathCenter(look)*w,baseY-j*(span/(samples-1))]);}
      const roadPx=Math.max(48,roadHalf()*2*w);
      ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.lineWidth=roadPx+12;ctx.strokeStyle='rgba(49,36,116,.42)';ctx.stroke();
      ctx.lineWidth=roadPx;ctx.strokeStyle='#f9f7ff';ctx.stroke();
      ctx.lineWidth=2;ctx.setLineDash([9,12]);ctx.strokeStyle='rgba(90,66,208,.28)';ctx.stroke();ctx.setLineDash([]);

      const px=playerX*w,py=baseY;ctx.shadowColor='rgba(255,224,73,.65)';ctx.shadowBlur=17;ctx.beginPath();ctx.arc(px,py,13,0,Math.PI*2);ctx.fillStyle='#ffe04e';ctx.fill();ctx.shadowBlur=0;ctx.beginPath();ctx.arc(px,py,5,0,Math.PI*2);ctx.fillStyle='#5b45d9';ctx.fill();
    }

    function end(){if(finished)return;finished=true;cancelAnimationFrame(raf);onFinish({score,duration:performance.now()-startedAt,metadata:{points:score,progress:Number(progress.toFixed(3))}});}
    function tick(now){
      if(finished)return;if(!lastAt)lastAt=now;const dt=Math.min(.035,(now-lastAt)/1000);lastAt=now;
      progress+=pace()*dt;playerX+=dir*steerSpeed()*dt;
      const currentScore=Math.min(maxScore,Math.floor(progress));
      if(currentScore!==score){score=currentScore;scoreEl.textContent=`${score} punto${score===1?'':'s'}`;const p=pace()/.58;speedEl.textContent=`${score<8?'FÁCIL':score<22?'MEDIO':score<40?'DIFÍCIL':'BRUTAL'} · ×${p.toFixed(2)}`;}
      const center=pathCenter(progress),half=roadHalf();
      if(Math.abs(playerX-center)>half||playerX<0||playerX>1)return end();if(score>=maxScore)return end();draw();raf=requestAnimationFrame(tick);
    }
    function press(e){e.preventDefault();if(!finished)dir*=-1;}
    canvas.addEventListener('pointerdown',press,{passive:false});window.addEventListener('resize',resize);
    return{start(){resize();startedAt=performance.now();lastAt=startedAt;progress=0;playerX=.5;draw();raf=requestAnimationFrame(tick);},destroy(){finished=true;cancelAnimationFrame(raf);canvas.removeEventListener('pointerdown',press);window.removeEventListener('resize',resize);}};
  });
})();