(() => {
  'use strict';

  window.PatxGameRegistry.register('catch-drop', ({container,config={},seed=1,onFinish}) => {
    const duration=Number(config.duration_ms||45000),maxScore=Number(config.max_score||30);
    let startedAt=0,finished=false,raf=0,last=0,paddleX=.5,ball={x:.5,y:.72,vx:.34,vy:-.44,r:.022},points=0,bricks=[];

    container.innerHTML=`
      <div class="game-surface catch-surface arkanoid-surface">
        <div class="game-kicker">CATCH DROP · ARKANOID</div>
        <div class="arcade-head"><div class="round-counter" data-score>0 / ${maxScore}</div><div class="round-counter" data-time>45.0 s</div></div>
        <canvas class="arcade-canvas catch-canvas" width="560" height="360" tabindex="0" aria-label="Arkanoid con balón de fútbol"></canvas>
        <div class="game-help">Mueve la barra, devuelve el balón y rompe los bloques. PC: ← → o A / D.</div>
      </div>`;
    const canvas=container.querySelector('canvas'),ctx=canvas.getContext('2d'),scoreEl=container.querySelector('[data-score]'),timeEl=container.querySelector('[data-time]');

    function makeBricks(){bricks=[];const cols=6,rows=5;for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)bricks.push({x:.08+x*.145,y:.09+y*.075,w:.12,h:.05,alive:true,row:y});}
    function finish(){if(finished)return;finished=true;cancelAnimationFrame(raf);onFinish({score:points,duration:performance.now()-startedAt,metadata:{points,cleared:points>=maxScore}});}
    function setPaddle(px){paddleX=Math.max(.11,Math.min(.89,px));}
    function move(e){const r=canvas.getBoundingClientRect();setPaddle((e.clientX-r.left)/r.width);canvas.focus({preventScroll:true});}
    function key(e){const k=e.key.toLowerCase();if(k==='arrowleft'||k==='a'){setPaddle(paddleX-.07);e.preventDefault();}else if(k==='arrowright'||k==='d'){setPaddle(paddleX+.07);e.preventDefault();}}
    function football(x,y,r){ctx.save();ctx.translate(x,y);ctx.fillStyle='#fff';ctx.strokeStyle='#1e2027';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#1e2027';ctx.beginPath();for(let i=0;i<5;i++){const a=-Math.PI/2+i*Math.PI*2/5,px=Math.cos(a)*r*.34,py=Math.sin(a)*r*.34;if(!i)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();ctx.fill();ctx.restore();}
    function draw(){
      ctx.clearRect(0,0,560,360);ctx.fillStyle='#226d3b';ctx.fillRect(0,0,560,360);for(let i=0;i<9;i++){ctx.fillStyle=i%2?'rgba(255,255,255,.03)':'rgba(0,0,0,.03)';ctx.fillRect(0,i*40,560,40);}
      ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=2;ctx.strokeRect(12,12,536,336);
      bricks.forEach(b=>{if(!b.alive)return;ctx.fillStyle=['#f05b68','#f6aa4d','#ffe05a','#67d79d','#6ac9ff'][b.row%5];ctx.beginPath();ctx.roundRect(b.x*560,b.y*360,b.w*560,b.h*360,7);ctx.fill();ctx.fillStyle='rgba(255,255,255,.28)';ctx.fillRect(b.x*560+8,b.y*360+5,b.w*560-16,4);});
      const px=paddleX*560;ctx.fillStyle='#171923';ctx.beginPath();ctx.roundRect(px-54,322,108,15,8);ctx.fill();ctx.fillStyle='#ffe05a';ctx.fillRect(px-37,326,74,5);football(ball.x*560,ball.y*360,ball.r*560);
    }
    function hitBrick(b){return ball.x+ball.r>b.x&&ball.x-ball.r<b.x+b.w&&ball.y+ball.r>b.y&&ball.y-ball.r<b.y+b.h;}
    function loop(now){
      if(finished)return;const elapsed=now-startedAt;if(elapsed>=duration)return finish();if(!last)last=now;const dt=Math.min(.03,(now-last)/1000);last=now;
      ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
      if(ball.x-ball.r<.02){ball.x=.02+ball.r;ball.vx=Math.abs(ball.vx);}if(ball.x+ball.r>.98){ball.x=.98-ball.r;ball.vx=-Math.abs(ball.vx);}if(ball.y-ball.r<.025){ball.y=.025+ball.r;ball.vy=Math.abs(ball.vy);}
      const paddleY=.895,paddleHalf=.097;if(ball.vy>0&&ball.y+ball.r>paddleY&&ball.y-ball.r<paddleY+.045&&Math.abs(ball.x-paddleX)<paddleHalf){const offset=(ball.x-paddleX)/paddleHalf;ball.y=paddleY-ball.r;ball.vy=-Math.abs(ball.vy);ball.vx=Math.max(-.7,Math.min(.7,ball.vx+offset*.22));}
      for(const b of bricks){if(!b.alive||!hitBrick(b))continue;b.alive=false;points++;scoreEl.textContent=`${points} / ${maxScore}`;ball.vy*=-1;const boost=1+Math.min(.22,points*.006);ball.vx*=boost;ball.vy*=boost;if(points>=maxScore)return finish();break;}
      if(ball.y-ball.r>1.03)return finish();
      timeEl.textContent=`${Math.max(0,(duration-elapsed)/1000).toFixed(1)} s`;draw();raf=requestAnimationFrame(loop);
    }
    canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerdown',move);window.addEventListener('keydown',key);
    return{start(){startedAt=last=performance.now();makeBricks();draw();canvas.focus({preventScroll:true});raf=requestAnimationFrame(loop);},destroy(){finished=true;cancelAnimationFrame(raf);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerdown',move);window.removeEventListener('keydown',key);}};
  });
})();