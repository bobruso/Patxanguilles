(() => {
  'use strict';

  window.PatxGameRegistry.register('drop-zone', ({container,config={},seed=1,onFinish}) => {
    const maxLevel=Number(config.max_level||15);
    let state=Number(seed)||1,level=0,startedAt=0,finished=false,raf=0,last=0,goalX=.5,dir=1,shooting=false,resolving=false,shotT=0,shotGoalX=.5;
    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}

    container.innerHTML=`
      <div class="game-surface drop-surface football-drop-surface">
        <div class="game-kicker">DROP ZONE</div>
        <div class="drop-head"><div class="round-counter" data-level>Nivel 1 / ${maxLevel}</div><div class="round-counter" data-status>PORTERÍA MÓVIL</div></div>
        <canvas class="arcade-canvas drop-canvas" width="560" height="340" aria-label="Tiro a portería móvil"></canvas>
        <div class="game-help" data-help>Toca para chutar cuando la portería esté alineada. Cada nivel es más rápido y estrecho.</div>
      </div>`;
    const canvas=container.querySelector('canvas'),ctx=canvas.getContext('2d'),levelEl=container.querySelector('[data-level]'),statusEl=container.querySelector('[data-status]'),helpEl=container.querySelector('[data-help]');

    function speed(){return .34+level*.055;}
    function goalWidth(){return Math.max(.16,.36-level*.014);}
    function reset(){shooting=false;resolving=false;shotT=0;goalX=.2+rnd()*.6;dir=rnd()>.5?1:-1;levelEl.textContent=`Nivel ${level+1} / ${maxLevel}`;statusEl.textContent=`VELOCIDAD ×${(speed()/.34).toFixed(2)}`;helpEl.textContent='Toca para chutar cuando la portería cruce el centro.';}
    function finish(){if(finished)return;finished=true;resolving=true;cancelAnimationFrame(raf);onFinish({score:level,duration:performance.now()-startedAt,metadata:{level}});}
    function drawBall(x,y,r){ctx.save();ctx.translate(x,y);ctx.fillStyle='#fff';ctx.strokeStyle='#1f2229';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#1f2229';ctx.beginPath();for(let i=0;i<5;i++){const a=-Math.PI/2+i*Math.PI*2/5,px=Math.cos(a)*r*.34,py=Math.sin(a)*r*.34;if(!i)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();ctx.fill();ctx.restore();}
    function drawGoal(cx,gw){
      const y=72,x=cx-gw/2,h=72;ctx.strokeStyle='#fff';ctx.lineWidth=5;ctx.strokeRect(x,y,gw,h);
      ctx.strokeStyle='rgba(255,255,255,.45)';ctx.lineWidth=1;
      for(let i=1;i<6;i++){const xx=x+i*gw/6;ctx.beginPath();ctx.moveTo(xx,y);ctx.lineTo(xx,y+h);ctx.stroke();}
      for(let j=1;j<4;j++){const yy=y+j*h/4;ctx.beginPath();ctx.moveTo(x,yy);ctx.lineTo(x+gw,yy);ctx.stroke();}
    }
    function draw(){
      ctx.clearRect(0,0,560,340);
      const sky=ctx.createLinearGradient(0,0,0,130);sky.addColorStop(0,'#81c9ff');sky.addColorStop(1,'#dff4ff');ctx.fillStyle=sky;ctx.fillRect(0,0,560,130);
      ctx.fillStyle='#2f914d';ctx.fillRect(0,130,560,210);for(let i=0;i<7;i++){ctx.fillStyle=i%2?'rgba(255,255,255,.035)':'rgba(0,0,0,.035)';ctx.fillRect(0,130+i*30,560,30);}
      ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(70,340);ctx.lineTo(210,130);ctx.moveTo(490,340);ctx.lineTo(350,130);ctx.stroke();
      const gx=(shooting||resolving?shotGoalX:goalX)*560,gw=goalWidth()*560;drawGoal(gx,gw);
      ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(275,130,10,210);
      let bx=280,by=296,br=14;
      if(shooting){const eased=1-Math.pow(1-shotT,2);by=296-(296-108)*eased;br=14-7*eased;}
      drawBall(bx,by,br);
      ctx.fillStyle='rgba(0,0,0,.45)';ctx.font='800 12px system-ui';ctx.textAlign='center';ctx.fillText('CHUTA AL CENTRO',280,326);
    }
    function resolveShot(){
      resolving=true;const ok=Math.abs(shotGoalX-.5)<goalWidth()*.43;
      if(ok){level++;statusEl.textContent='¡GOL!';helpEl.textContent=level>=maxLevel?'Reto completado.':'Entra. Ahora más rápido y más estrecho.';if(level>=maxLevel)return setTimeout(finish,520);setTimeout(reset,600);}
      else{statusEl.textContent='FUERA';helpEl.textContent='La portería no estaba alineada.';setTimeout(finish,650);}
    }
    function loop(now){
      if(finished)return;if(!last)last=now;const dt=Math.min(.04,(now-last)/1000);last=now;
      if(!shooting&&!resolving){goalX+=dir*speed()*dt;if(goalX>1-goalWidth()/2){goalX=1-goalWidth()/2;dir=-1;}if(goalX<goalWidth()/2){goalX=goalWidth()/2;dir=1;}}
      else if(shooting){shotT=Math.min(1,shotT+dt*2.6);if(shotT>=1){shooting=false;resolveShot();}}
      draw();raf=requestAnimationFrame(loop);
    }
    function shoot(e){e?.preventDefault();if(finished||shooting||resolving)return;shooting=true;shotT=0;shotGoalX=goalX;statusEl.textContent='¡CHUT!';helpEl.textContent='…';}
    canvas.addEventListener('pointerdown',shoot,{passive:false});
    return{start(){startedAt=last=performance.now();reset();raf=requestAnimationFrame(loop);},destroy(){finished=true;cancelAnimationFrame(raf);canvas.removeEventListener('pointerdown',shoot);}};
  });
})();