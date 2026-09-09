(() => {
  'use strict';

  window.PatxGameRegistry.register('balance', ({container,config={},seed=1,onFinish}) => {
    const duration=Number(config.duration_ms||30000),maxScore=Number(config.max_score||30000),levelMs=Number(config.level_ms||4000);
    let state=Number(seed)||1,ballX=0,ballV=0,angle=0,angleV=0,held=0,startedAt=0,last=0,finished=false,raf=0,level=0;
    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}

    container.innerHTML=`
      <div class="game-surface balance-surface seesaw-surface">
        <div class="game-kicker">BALANCE</div>
        <div class="balance-head"><div class="round-counter" data-time>0.0 s</div><div class="round-counter" data-level>NIVEL 1</div></div>
        <canvas class="arcade-canvas balance-canvas" width="560" height="330" tabindex="0"></canvas>
        <div class="balance-actions seesaw-actions"><button type="button" data-dir="-1">← IZQUIERDA</button><button type="button" data-dir="1">DERECHA →</button></div>
        <div class="game-help" data-help>Mantén la bola sobre el balancín. Cada pocos segundos se hace más pequeño. PC: ← → o A / D.</div>
      </div>`;
    const canvas=container.querySelector('canvas'),ctx=canvas.getContext('2d'),timeEl=container.querySelector('[data-time]'),levelEl=container.querySelector('[data-level]'),help=container.querySelector('[data-help]'),buttons=[...container.querySelectorAll('[data-dir]')];

    function beamHalf(){return Math.max(82,205-level*18);}
    function finish(){if(finished)return;finished=true;cancelAnimationFrame(raf);const score=Math.min(maxScore,Math.max(0,Math.round(performance.now()-startedAt)));buttons.forEach(b=>b.disabled=true);help.textContent=`Fin · aguantaste ${(score/1000).toFixed(2)} s`;onFinish({score,duration:score,metadata:{in_zone_ms:score,level}});}
    function setHeld(v){held=v;buttons.forEach(b=>b.classList.toggle('is-held',Number(b.dataset.dir)===v&&v!==0));}
    function down(e){const b=e.target.closest('[data-dir]');if(b){e.preventDefault();setHeld(Number(b.dataset.dir));canvas.focus({preventScroll:true});}}
    function up(){setHeld(0);}
    function key(e){const k=e.key.toLowerCase();if(k==='arrowleft'||k==='a'){setHeld(-1);e.preventDefault();}else if(k==='arrowright'||k==='d'){setHeld(1);e.preventDefault();}}
    function keyup(e){const k=e.key.toLowerCase();if(['arrowleft','arrowright','a','d'].includes(k)){setHeld(0);e.preventDefault();}}

    function draw(){
      ctx.clearRect(0,0,560,330);
      const bg=ctx.createLinearGradient(0,0,0,330);bg.addColorStop(0,'#e9f6ff');bg.addColorStop(1,'#d5f0df');ctx.fillStyle=bg;ctx.fillRect(0,0,560,330);
      ctx.fillStyle='#3f9757';ctx.fillRect(0,260,560,70);
      const cx=280,cy=205,half=beamHalf(),cos=Math.cos(angle),sin=Math.sin(angle);
      ctx.save();ctx.translate(cx,cy);ctx.rotate(angle);ctx.fillStyle='#24232b';ctx.beginPath();ctx.roundRect(-half,-10,half*2,20,10);ctx.fill();ctx.fillStyle='#ffd75e';ctx.fillRect(-half+12,-4,half*2-24,8);ctx.restore();
      ctx.fillStyle='#6b55f5';ctx.beginPath();ctx.moveTo(cx-28,260);ctx.lineTo(cx+28,260);ctx.lineTo(cx,cy+9);ctx.closePath();ctx.fill();
      const bx=cx+ballX*cos,by=cy+ballX*sin-22;
      ctx.fillStyle='#fff';ctx.strokeStyle='#1f2229';ctx.lineWidth=2;ctx.beginPath();ctx.arc(bx,by,16,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#1f2229';ctx.beginPath();ctx.arc(bx,by,5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(31,34,41,.75)';ctx.font='900 12px system-ui';ctx.textAlign='center';ctx.fillText(`BALANCÍN ${Math.round(half*2)} px`,280,300);
    }

    function loop(now){
      if(finished)return;const elapsed=now-startedAt;if(elapsed>=duration)return finish();const dt=Math.min(.035,(now-last)/1000);last=now;
      const nextLevel=Math.floor(elapsed/levelMs);if(nextLevel!==level){level=nextLevel;levelEl.textContent=`NIVEL ${level+1}`;help.textContent='El balancín se ha hecho más pequeño.';}
      const control=held*.95;angleV+=(control-angle*2.4-angleV*2.3)*dt;angleV+=(rnd()-.5)*.035*dt;angle+=angleV;angle=Math.max(-.36,Math.min(.36,angle));
      ballV+=(Math.sin(angle)*410)*dt;ballV*=.995;ballX+=ballV*dt;
      const limit=beamHalf()-18;if(Math.abs(ballX)>limit)return finish();
      timeEl.textContent=`${(elapsed/1000).toFixed(1)} s`;levelEl.textContent=`NIVEL ${level+1}`;draw();raf=requestAnimationFrame(loop);
    }

    container.addEventListener('pointerdown',down,{passive:false});container.addEventListener('pointerup',up);container.addEventListener('pointercancel',up);container.addEventListener('pointerleave',up);window.addEventListener('keydown',key);window.addEventListener('keyup',keyup);
    return{start(){startedAt=last=performance.now();ballX=(rnd()-.5)*24;draw();canvas.focus({preventScroll:true});raf=requestAnimationFrame(loop);},destroy(){finished=true;cancelAnimationFrame(raf);container.removeEventListener('pointerdown',down);container.removeEventListener('pointerup',up);container.removeEventListener('pointercancel',up);container.removeEventListener('pointerleave',up);window.removeEventListener('keydown',key);window.removeEventListener('keyup',keyup);}};
  });
})();