(() => {
  'use strict';

  window.PatxGameRegistry.register('snake-sprint', ({container,config={},seed=1,onFinish}) => {
    const durationMs=Number(config.duration_ms||20000),maxScore=Number(config.max_score||50),cols=18,rows=12,stepMs=125;
    let state=Number(seed)||1,snake=[[5,6],[4,6],[3,6]],dir=[1,0],nextDir=[1,0],food=[12,6],points=0,startedAt=0,finished=false,lastStep=0,raf=0,pointerStart=null;
    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}

    container.innerHTML=`
      <div class="game-surface snake-surface">
        <div class="game-kicker">SNAKE SPRINT</div>
        <div class="arcade-head"><div class="round-counter" data-score>0 puntos</div><div class="round-counter" data-time>20.0 s</div></div>
        <canvas class="arcade-canvas snake-canvas" width="540" height="360" tabindex="0"></canvas>
        <div class="snake-control-wrap">
          <div class="snake-pc-hint">PC · FLECHAS O WASD</div>
          <div class="snake-dpad" aria-label="Controles de dirección">
            <button type="button" data-dir="0,-1">↑</button>
            <button type="button" data-dir="-1,0">←</button>
            <button type="button" data-dir="0,1">↓</button>
            <button type="button" data-dir="1,0">→</button>
          </div>
        </div>
        <div class="game-help">Móvil: desliza o usa el pad. PC: flechas o W A S D.</div>
      </div>`;
    const canvas=container.querySelector('canvas'),ctx=canvas.getContext('2d'),scoreEl=container.querySelector('[data-score]'),timeEl=container.querySelector('[data-time]'),dpad=container.querySelector('.snake-dpad');

    function spawn(){for(let i=0;i<100;i++){const f=[Math.floor(rnd()*cols),Math.floor(rnd()*rows)];if(!snake.some(s=>s[0]===f[0]&&s[1]===f[1])){food=f;return;}}}
    function finish(){if(finished)return;finished=true;cancelAnimationFrame(raf);onFinish({score:points,duration:performance.now()-startedAt,metadata:{points}});}
    function setDir(x,y){if(x===-dir[0]&&y===-dir[1])return;nextDir=[x,y];}
    function key(e){const k=e.key.toLowerCase();if(k==='arrowup'||k==='w')setDir(0,-1);else if(k==='arrowdown'||k==='s')setDir(0,1);else if(k==='arrowleft'||k==='a')setDir(-1,0);else if(k==='arrowright'||k==='d')setDir(1,0);else return;e.preventDefault();}
    function down(e){pointerStart=[e.clientX,e.clientY];canvas.focus({preventScroll:true});}
    function up(e){if(!pointerStart)return;const dx=e.clientX-pointerStart[0],dy=e.clientY-pointerStart[1];pointerStart=null;if(Math.max(Math.abs(dx),Math.abs(dy))<12)return;if(Math.abs(dx)>Math.abs(dy))setDir(dx>0?1:-1,0);else setDir(0,dy>0?1:-1);}
    function padPress(e){const b=e.target.closest('[data-dir]');if(!b)return;const [x,y]=b.dataset.dir.split(',').map(Number);setDir(x,y);canvas.focus({preventScroll:true});}
    function step(){dir=nextDir;const h=snake[0],n=[h[0]+dir[0],h[1]+dir[1]];if(n[0]<0||n[0]>=cols||n[1]<0||n[1]>=rows||snake.some(s=>s[0]===n[0]&&s[1]===n[1]))return finish();snake.unshift(n);if(n[0]===food[0]&&n[1]===food[1]){points++;scoreEl.textContent=`${points} punto${points===1?'':'s'}`;spawn();if(points>=maxScore)return finish();}else snake.pop();}

    function draw(now){
      ctx.clearRect(0,0,540,360);
      const bg=ctx.createLinearGradient(0,0,540,360);bg.addColorStop(0,'#2a235d');bg.addColorStop(1,'#171332');ctx.fillStyle=bg;ctx.fillRect(0,0,540,360);
      const cw=540/cols,ch=360/rows;
      ctx.strokeStyle='rgba(255,255,255,.045)';ctx.lineWidth=1;
      for(let x=1;x<cols;x++){ctx.beginPath();ctx.moveTo(x*cw,0);ctx.lineTo(x*cw,360);ctx.stroke();}
      for(let y=1;y<rows;y++){ctx.beginPath();ctx.moveTo(0,y*ch);ctx.lineTo(540,y*ch);ctx.stroke();}
      ctx.shadowColor='rgba(255,225,74,.65)';ctx.shadowBlur=16;ctx.fillStyle='#ffe14d';ctx.beginPath();ctx.arc(food[0]*cw+cw/2,food[1]*ch+ch/2,Math.min(cw,ch)*.28,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      snake.forEach((s,i)=>{ctx.fillStyle=i===0?'#7de5b8':'#56cfa1';ctx.beginPath();ctx.roundRect(s[0]*cw+3,s[1]*ch+3,cw-6,ch-6,7);ctx.fill();if(i===0){ctx.fillStyle='#23314b';ctx.beginPath();ctx.arc(s[0]*cw+cw*.65,s[1]*ch+ch*.36,2.2,0,Math.PI*2);ctx.fill();}});
      const left=Math.max(0,durationMs-(now-startedAt));timeEl.textContent=`${(left/1000).toFixed(1)} s`;
    }

    function loop(now){if(finished)return;if(now-startedAt>=durationMs)return finish();if(now-lastStep>=stepMs){lastStep=now;step();}draw(now);raf=requestAnimationFrame(loop);}
    canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointerup',up);dpad.addEventListener('pointerdown',padPress);window.addEventListener('keydown',key);
    return{start(){startedAt=performance.now();lastStep=startedAt;spawn();canvas.focus({preventScroll:true});raf=requestAnimationFrame(loop);},destroy(){finished=true;cancelAnimationFrame(raf);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointerup',up);dpad.removeEventListener('pointerdown',padPress);window.removeEventListener('keydown',key);}};
  });
})();