(() => {
  'use strict';
  window.PatxGameRegistry.register('drop-zone', ({container,config={},seed=1,onFinish}) => {
    const maxLevel=Number(config.max_level||10);
    let state=Number(seed)||1, level=0, startedAt=0, finished=false, raf=0, dropping=false, ballX=.5, dir=1, gapX=.5, speed=.42;
    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}
    container.innerHTML=`<div class="game-surface drop-surface"><div class="game-kicker">DROP ZONE</div><div class="round-counter" data-level>Nivel 1 / ${maxLevel}</div><canvas class="arcade-canvas" width="560" height="320"></canvas><div class="game-help">Toca para soltar la bola cuando esté sobre el hueco.</div></div>`;
    const canvas=container.querySelector('canvas'),ctx=canvas.getContext('2d'),levelEl=container.querySelector('[data-level]');
    function reset(){ballX=.12+rnd()*.76;gapX=.15+rnd()*.7;dir=rnd()>.5?1:-1;dropping=false;levelEl.textContent=`Nivel ${Math.min(level+1,maxLevel)} / ${maxLevel}`;}
    function finish(){if(finished)return;finished=true;cancelAnimationFrame(raf);onFinish({score:level,duration:performance.now()-startedAt,metadata:{level}});}
    function draw(){ctx.clearRect(0,0,560,320);ctx.fillStyle='#121821';ctx.fillRect(0,0,560,320);ctx.fillStyle='#d6dde6';ctx.fillRect(30,240,500,18);ctx.fillStyle='#121821';ctx.fillRect(gapX*500+30-42,236,84,26);ctx.fillStyle='#ef3340';ctx.beginPath();ctx.arc(ballX*500+30,dropping?190:70,15,0,Math.PI*2);ctx.fill();}
    function loop(t){if(finished)return;if(!dropping){ballX+=dir*speed/60;if(ballX>.96){ballX=.96;dir=-1;}if(ballX<.04){ballX=.04;dir=1;}}draw();raf=requestAnimationFrame(loop);}
    function drop(){if(finished||dropping)return;dropping=true;const ok=Math.abs(ballX-gapX)<.085;setTimeout(()=>{if(ok){level++;if(level>=maxLevel)finish();else{speed=Math.min(.8,speed+.035);reset();}}else finish();},320);}
    canvas.addEventListener('pointerdown',drop);
    return{start(){startedAt=performance.now();reset();raf=requestAnimationFrame(loop);},destroy(){finished=true;cancelAnimationFrame(raf);canvas.removeEventListener('pointerdown',drop);}};
  });
})();