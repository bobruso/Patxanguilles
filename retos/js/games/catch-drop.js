(() => {
  'use strict';

  window.PatxGameRegistry.register('catch-drop', ({container,config={},seed=1,onFinish}) => {
    const duration=Number(config.duration_ms||18000),maxScore=Number(config.max_score||50);
    let state=Number(seed)||1,startedAt=0,finished=false,raf=0,lastSpawn=0,basketX=.5,points=0,items=[];
    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}

    container.innerHTML=`
      <div class="game-surface catch-surface">
        <div class="game-kicker">CATCH DROP</div>
        <div class="arcade-head"><div class="round-counter" data-score>0 puntos</div><div class="round-counter" data-time>18.0 s</div></div>
        <canvas class="arcade-canvas catch-canvas" width="560" height="320"></canvas>
        <div class="game-help">Arrastra la cesta para atrapar los objetos que caen.</div>
      </div>`;
    const canvas=container.querySelector('canvas'),ctx=canvas.getContext('2d'),scoreEl=container.querySelector('[data-score]'),timeEl=container.querySelector('[data-time]');

    function finish(){if(finished)return;finished=true;cancelAnimationFrame(raf);onFinish({score:points,duration:performance.now()-startedAt,metadata:{points}});}
    function move(e){const r=canvas.getBoundingClientRect();basketX=Math.max(.08,Math.min(.92,(e.clientX-r.left)/r.width));}
    function spawn(now){items.push({x:.08+rnd()*.84,y:-.05,v:.22+rnd()*.18,type:Math.floor(rnd()*3),spin:rnd()*Math.PI});lastSpawn=now;}

    function drawItem(o){
      const x=o.x*560,y=o.y*320;ctx.save();ctx.translate(x,y);ctx.rotate(o.spin);
      if(o.type===0){ctx.fillStyle='#ffe14e';ctx.beginPath();ctx.arc(0,0,11,0,Math.PI*2);ctx.fill();}
      else if(o.type===1){ctx.fillStyle='#ff7890';ctx.fillRect(-10,-10,20,20);}
      else{ctx.fillStyle='#70d8ff';ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(11,10);ctx.lineTo(-11,10);ctx.closePath();ctx.fill();}
      ctx.restore();
    }

    function loop(now){
      if(finished)return;const elapsed=now-startedAt;if(elapsed>=duration||points>=maxScore)return finish();if(now-lastSpawn>520)spawn(now);
      const dt=1/60;items.forEach(o=>{o.y+=o.v*dt*2.2;o.spin+=.02;});
      for(let i=items.length-1;i>=0;i--){const o=items[i];if(o.y>.84&&o.y<.96&&Math.abs(o.x-basketX)<.11){points++;scoreEl.textContent=`${points} punto${points===1?'':'s'}`;items.splice(i,1);}else if(o.y>1.05)items.splice(i,1);}
      ctx.clearRect(0,0,560,320);const bg=ctx.createLinearGradient(0,0,560,320);bg.addColorStop(0,'#31266d');bg.addColorStop(1,'#1b163e');ctx.fillStyle=bg;ctx.fillRect(0,0,560,320);
      for(let i=0;i<16;i++){ctx.fillStyle='rgba(255,255,255,.06)';ctx.beginPath();ctx.arc((i*83)%560,(i*47)%260,3+(i%4),0,Math.PI*2);ctx.fill();}
      items.forEach(drawItem);
      const bx=basketX*560;ctx.fillStyle='#fff';ctx.beginPath();ctx.roundRect(bx-44,277,88,22,8);ctx.fill();ctx.fillStyle='#6a53df';ctx.beginPath();ctx.roundRect(bx-34,282,68,11,5);ctx.fill();
      timeEl.textContent=`${Math.max(0,(duration-elapsed)/1000).toFixed(1)} s`;raf=requestAnimationFrame(loop);
    }

    canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerdown',move);
    return{start(){startedAt=performance.now();lastSpawn=startedAt;raf=requestAnimationFrame(loop);},destroy(){finished=true;cancelAnimationFrame(raf);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerdown',move);}};
  });
})();