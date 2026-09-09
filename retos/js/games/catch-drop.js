(() => {
  'use strict';
  window.PatxGameRegistry.register('catch-drop', ({container,config={},seed=1,onFinish}) => {
    const duration=Number(config.duration_ms||18000),maxScore=Number(config.max_score||50);
    let state=Number(seed)||1,startedAt=0,finished=false,raf=0,lastSpawn=0,basketX=.5,points=0,items=[];
    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}
    container.innerHTML=`<div class="game-surface catch-surface"><div class="game-kicker">CATCH DROP</div><div class="round-counter" data-score>0 puntos</div><canvas class="arcade-canvas" width="560" height="320"></canvas><div class="game-help">Mueve la cesta con el dedo o el ratón.</div></div>`;
    const canvas=container.querySelector('canvas'),ctx=canvas.getContext('2d'),scoreEl=container.querySelector('[data-score]');
    function finish(){if(finished)return;finished=true;cancelAnimationFrame(raf);onFinish({score:points,duration:performance.now()-startedAt,metadata:{points}});}
    function move(e){const r=canvas.getBoundingClientRect();basketX=Math.max(.08,Math.min(.92,(e.clientX-r.left)/r.width));}
    function spawn(now){items.push({x:.08+rnd()*.84,y:-.05,v:.22+rnd()*.18});lastSpawn=now;}
    function loop(now){if(finished)return;const elapsed=now-startedAt;if(elapsed>=duration||points>=maxScore)return finish();if(now-lastSpawn>520)spawn(now);const dt=1/60;items.forEach(o=>o.y+=o.v*dt*2.2);for(let i=items.length-1;i>=0;i--){const o=items[i];if(o.y>.84&&o.y<.96&&Math.abs(o.x-basketX)<.11){points++;scoreEl.textContent=`${points} punto${points===1?'':'s'}`;items.splice(i,1);}else if(o.y>1.05)items.splice(i,1);}ctx.clearRect(0,0,560,320);ctx.fillStyle='#0c1118';ctx.fillRect(0,0,560,320);ctx.fillStyle='#ef3340';items.forEach(o=>{ctx.beginPath();ctx.arc(o.x*560,o.y*320,10,0,Math.PI*2);ctx.fill();});ctx.fillStyle='#eef2f5';ctx.fillRect(basketX*560-42,280,84,18);ctx.fillStyle='#9aa6b2';ctx.font='700 13px system-ui';ctx.fillText(`${Math.max(0,(duration-elapsed)/1000).toFixed(1)} s`,12,20);raf=requestAnimationFrame(loop);}
    canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerdown',move);
    return{start(){startedAt=performance.now();lastSpawn=startedAt;raf=requestAnimationFrame(loop);},destroy(){finished=true;cancelAnimationFrame(raf);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerdown',move);}};
  });
})();