(() => {
  'use strict';
  window.PatxGameRegistry.register('snake-sprint', ({container,config={},seed=1,onFinish}) => {
    const durationMs=Number(config.duration_ms||20000),maxScore=Number(config.max_score||50),cols=18,rows=12,stepMs=125;
    let state=Number(seed)||1, snake=[[5,6],[4,6],[3,6]],dir=[1,0],nextDir=[1,0],food=[12,6],points=0,startedAt=0,finished=false,lastStep=0,raf=0,pointerStart=null;
    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}
    container.innerHTML=`<div class="game-surface snake-surface"><div class="game-kicker">SNAKE SPRINT</div><div class="round-counter" data-score>0 puntos</div><canvas class="arcade-canvas" width="540" height="360"></canvas><div class="game-help">Desliza para girar. Recoge puntos y no choques.</div></div>`;
    const canvas=container.querySelector('canvas'),ctx=canvas.getContext('2d'),scoreEl=container.querySelector('[data-score]');
    function spawn(){for(let i=0;i<100;i++){const f=[Math.floor(rnd()*cols),Math.floor(rnd()*rows)];if(!snake.some(s=>s[0]===f[0]&&s[1]===f[1])){food=f;return;}}}
    function finish(){if(finished)return;finished=true;cancelAnimationFrame(raf);onFinish({score:points,duration:performance.now()-startedAt,metadata:{points}});}
    function setDir(x,y){if(x===-dir[0]&&y===-dir[1])return;nextDir=[x,y];}
    function key(e){if(e.key==='ArrowUp')setDir(0,-1);else if(e.key==='ArrowDown')setDir(0,1);else if(e.key==='ArrowLeft')setDir(-1,0);else if(e.key==='ArrowRight')setDir(1,0);}
    function down(e){pointerStart=[e.clientX,e.clientY];}
    function up(e){if(!pointerStart)return;const dx=e.clientX-pointerStart[0],dy=e.clientY-pointerStart[1];pointerStart=null;if(Math.max(Math.abs(dx),Math.abs(dy))<12)return;if(Math.abs(dx)>Math.abs(dy))setDir(dx>0?1:-1,0);else setDir(0,dy>0?1:-1);}
    function step(){dir=nextDir;const h=snake[0],n=[h[0]+dir[0],h[1]+dir[1]];if(n[0]<0||n[0]>=cols||n[1]<0||n[1]>=rows||snake.some(s=>s[0]===n[0]&&s[1]===n[1]))return finish();snake.unshift(n);if(n[0]===food[0]&&n[1]===food[1]){points++;scoreEl.textContent=`${points} punto${points===1?'':'s'}`;spawn();if(points>=maxScore)return finish();}else snake.pop();}
    function draw(now){ctx.clearRect(0,0,540,360);ctx.fillStyle='#0c1118';ctx.fillRect(0,0,540,360);const cw=540/cols,ch=360/rows;ctx.fillStyle='#ef3340';ctx.fillRect(food[0]*cw+5,food[1]*ch+5,cw-10,ch-10);snake.forEach((s,i)=>{ctx.fillStyle=i===0?'#f3f5f7':'#8996a5';ctx.fillRect(s[0]*cw+2,s[1]*ch+2,cw-4,ch-4);});const left=Math.max(0,durationMs-(now-startedAt));ctx.fillStyle='#9aa6b2';ctx.font='700 13px system-ui';ctx.fillText(`${(left/1000).toFixed(1)} s`,12,20);}
    function loop(now){if(finished)return;if(now-startedAt>=durationMs)return finish();if(now-lastStep>=stepMs){lastStep=now;step();}draw(now);raf=requestAnimationFrame(loop);}
    canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointerup',up);window.addEventListener('keydown',key);
    return{start(){startedAt=performance.now();lastStep=startedAt;spawn();raf=requestAnimationFrame(loop);},destroy(){finished=true;cancelAnimationFrame(raf);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointerup',up);window.removeEventListener('keydown',key);}};
  });
})();