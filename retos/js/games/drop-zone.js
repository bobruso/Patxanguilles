(() => {
  'use strict';

  window.PatxGameRegistry.register('drop-zone', ({container,config={},seed=1,onFinish}) => {
    const maxLevel=Number(config.max_level||10);
    let state=Number(seed)||1,level=0,startedAt=0,finished=false,raf=0,dropping=false,ballX=.5,ballY=.18,dir=1,gapX=.5,speed=.42,last=0,resolving=false;
    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}

    container.innerHTML=`
      <div class="game-surface drop-surface">
        <div class="game-kicker">DROP ZONE</div>
        <div class="drop-head"><div class="round-counter" data-level>Nivel 1 / ${maxLevel}</div><div class="round-counter" data-status>PREPARADO</div></div>
        <canvas class="arcade-canvas drop-canvas" width="560" height="320"></canvas>
        <div class="game-help" data-help>Toca para soltar la bola cuando esté exactamente sobre el hueco.</div>
      </div>`;
    const canvas=container.querySelector('canvas'),ctx=canvas.getContext('2d'),levelEl=container.querySelector('[data-level]'),statusEl=container.querySelector('[data-status]'),helpEl=container.querySelector('[data-help]');

    function reset(){ballX=.12+rnd()*.76;ballY=.18;gapX=.15+rnd()*.7;dir=rnd()>.5?1:-1;dropping=false;resolving=false;levelEl.textContent=`Nivel ${Math.min(level+1,maxLevel)} / ${maxLevel}`;statusEl.textContent='APUNTA';helpEl.textContent='Toca para soltar.';}
    function finish(){if(finished)return;finished=true;cancelAnimationFrame(raf);onFinish({score:level,duration:performance.now()-startedAt,metadata:{level}});}

    function draw(){
      ctx.clearRect(0,0,560,320);const bg=ctx.createLinearGradient(0,0,560,320);bg.addColorStop(0,'#312b78');bg.addColorStop(1,'#191540');ctx.fillStyle=bg;ctx.fillRect(0,0,560,320);
      ctx.fillStyle='rgba(255,255,255,.05)';for(let i=0;i<12;i++){ctx.beginPath();ctx.arc((i*97)%560,(i*53)%230,4+(i%3)*2,0,Math.PI*2);ctx.fill();}
      const platformX=30,platformW=500,gapW=84,platformY=240;
      ctx.fillStyle='#f7f4ff';ctx.beginPath();ctx.roundRect(platformX,platformY,platformW,22,10);ctx.fill();
      ctx.fillStyle='#261d5f';ctx.fillRect(gapX*platformW+platformX-gapW/2,platformY-3,gapW,30);
      ctx.fillStyle='#ffe04e';ctx.beginPath();ctx.roundRect(gapX*platformW+platformX-gapW/2+8,platformY+27,gapW-16,8,4);ctx.fill();
      ctx.shadowColor='rgba(255,116,139,.55)';ctx.shadowBlur=18;ctx.fillStyle='#ff748b';ctx.beginPath();ctx.arc(ballX*platformW+platformX,ballY*320,16,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      ctx.strokeStyle='rgba(255,255,255,.3)';ctx.lineWidth=2;ctx.setLineDash([6,7]);ctx.beginPath();ctx.moveTo(ballX*platformW+platformX,ballY*320+22);ctx.lineTo(ballX*platformW+platformX,platformY-10);ctx.stroke();ctx.setLineDash([]);
    }

    function resolveLanding(){
      if(resolving)return;resolving=true;const ok=Math.abs(ballX-gapX)<.085;
      if(ok){statusEl.textContent='¡DENTRO!';helpEl.textContent='Perfecto. Siguiente nivel.';level++;if(level>=maxLevel)return setTimeout(finish,450);speed=Math.min(.8,speed+.035);setTimeout(reset,520);}
      else{statusEl.textContent='FALLO';helpEl.textContent='La bola no ha entrado por el hueco.';setTimeout(finish,520);}
    }

    function loop(now){
      if(finished)return;if(!last)last=now;const dt=Math.min(.04,(now-last)/1000);last=now;
      if(!dropping){ballX+=dir*speed*dt;if(ballX>.96){ballX=.96;dir=-1;}if(ballX<.04){ballX=.04;dir=1;}}
      else if(!resolving){ballY+=1.35*dt;if(ballY>=.73){ballY=.73;resolveLanding();}}
      draw();raf=requestAnimationFrame(loop);
    }
    function drop(e){e?.preventDefault();if(finished||dropping||resolving)return;dropping=true;statusEl.textContent='CAIENDO';helpEl.textContent='…';}
    canvas.addEventListener('pointerdown',drop,{passive:false});
    return{start(){startedAt=last=performance.now();reset();raf=requestAnimationFrame(loop);},destroy(){finished=true;cancelAnimationFrame(raf);canvas.removeEventListener('pointerdown',drop);}};
  });
})();