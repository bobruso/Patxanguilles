(() => {
  'use strict';

  window.PatxGameRegistry.register('perfect-pass', ({ container, config = {}, seed = 1, onFinish }) => {
    const rounds = Number(config.rounds || 3);
    const maxScore = Number(config.max_score || 3000);
    let state = Number(seed) || 1;
    let round = 0, total = 0, startedAt = 0, finished = false, drawing = false;
    let canvas, ctx, dpr = 1, w = 0, h = 0, path = [], scene = null, timer = 0;

    function rnd(){ state=(state*1664525+1013904223)>>>0; return state/4294967296; }

    container.innerHTML = `
      <div class="skill-game-wrap">
        <div class="football-topline"><span data-round>Pase 1 / ${rounds}</span><strong><span data-score>0</span> pts</strong></div>
        <canvas class="skill-canvas" data-canvas></canvas>
        <div class="football-hint" data-help>Toca el balón y dibuja el pase hasta el compañero.</div>
      </div>`;
    canvas=container.querySelector('[data-canvas]');ctx=canvas.getContext('2d');
    const roundEl=container.querySelector('[data-round]'),scoreEl=container.querySelector('[data-score]'),help=container.querySelector('[data-help]');

    function resize(){
      const r=canvas.getBoundingClientRect();dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1));w=Math.max(280,r.width);h=Math.max(360,r.height);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw();
    }

    function makeScene(){
      const start={x:w*(.18+rnd()*.64),y:h*.83};
      const target={x:w*(.18+rnd()*.64),y:h*.18};
      const defenders=[];
      for(let i=0;i<3;i++) defenders.push({x:w*(.18+rnd()*.64),y:h*(.34+i*.14+rnd()*.06),r:24+rnd()*6});
      return {start,target,defenders};
    }

    function pitch(){
      ctx.clearRect(0,0,w,h);ctx.fillStyle='#0e2b1b';ctx.fillRect(0,0,w,h);
      ctx.strokeStyle='rgba(255,255,255,.18)';ctx.lineWidth=2;ctx.strokeRect(14,14,w-28,h-28);ctx.beginPath();ctx.moveTo(14,h/2);ctx.lineTo(w-14,h/2);ctx.stroke();
      ctx.beginPath();ctx.arc(w/2,h/2,46,0,Math.PI*2);ctx.stroke();
    }

    function circle(p,r,fill,text){ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=2;ctx.stroke();if(text){ctx.fillStyle='#fff';ctx.font='900 12px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,p.x,p.y);}}

    function draw(){
      if(!ctx||!scene)return;pitch();
      scene.defenders.forEach((d,i)=>circle(d,d.r,'#242a32',`D${i+1}`));
      circle(scene.target,22,'#d8323d','T');circle(scene.start,20,'#f4f6f8','');
      ctx.font='30px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⚽',scene.start.x,scene.start.y);
      if(path.length>1){ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);for(let i=1;i<path.length;i++)ctx.lineTo(path[i].x,path[i].y);ctx.strokeStyle='#ffd166';ctx.lineWidth=6;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();}
    }

    function distanceToSegment(p,a,b){const vx=b.x-a.x,vy=b.y-a.y,wx=p.x-a.x,wy=p.y-a.y;const c2=vx*vx+vy*vy||1;const t=Math.max(0,Math.min(1,(wx*vx+wy*vy)/c2));return Math.hypot(p.x-(a.x+t*vx),p.y-(a.y+t*vy));}

    function evaluate(){
      const end=path[path.length-1]||scene.start;
      const targetDist=Math.hypot(end.x-scene.target.x,end.y-scene.target.y);
      let collisions=0;
      scene.defenders.forEach(d=>{for(let i=1;i<path.length;i++){if(distanceToSegment(d,path[i-1],path[i])<d.r+8){collisions++;break;}}});
      let points=Math.round(1000*Math.max(0,1-targetDist/180));
      points=Math.max(0,points-collisions*420);
      if(path.length<3) points=0;
      return {points,targetDist,collisions};
    }

    function finish(){if(finished)return;finished=true;clearTimeout(timer);help.textContent='Resultado registrando…';onFinish({score:Math.min(maxScore,total),duration:performance.now()-startedAt,metadata:{rounds,total}});}
    function nextRound(){round++;if(round>=rounds)return setTimeout(finish,450);roundEl.textContent=`Pase ${round+1} / ${rounds}`;path=[];scene=makeScene();draw();help.textContent='Toca el balón y esquiva a los defensas.';}

    function pos(event){const r=canvas.getBoundingClientRect();return{x:event.clientX-r.left,y:event.clientY-r.top};}
    function down(event){if(finished)return;const p=pos(event);if(Math.hypot(p.x-scene.start.x,p.y-scene.start.y)>42){help.textContent='Empieza desde el balón.';return;}event.preventDefault();drawing=true;path=[p];canvas.setPointerCapture?.(event.pointerId);draw();}
    function move(event){if(!drawing||finished)return;event.preventDefault();const p=pos(event);const prev=path[path.length-1];if(!prev||Math.hypot(p.x-prev.x,p.y-prev.y)>5){path.push(p);draw();}}
    function up(event){if(!drawing||finished)return;event.preventDefault();drawing=false;const p=pos(event);path.push(p);draw();const result=evaluate();total+=result.points;scoreEl.textContent=total;help.textContent=result.collisions?'Intercepción.':result.points>850?'¡Pase perfecto!':result.points>500?'Buen pase':'No llegó limpio';timer=setTimeout(nextRound,650);}

    canvas.addEventListener('pointerdown',down,{passive:false});canvas.addEventListener('pointermove',move,{passive:false});canvas.addEventListener('pointerup',up,{passive:false});canvas.addEventListener('pointercancel',up,{passive:false});window.addEventListener('resize',resize);
    return {start(){startedAt=performance.now();resize();scene=makeScene();draw();},destroy(){finished=true;clearTimeout(timer);window.removeEventListener('resize',resize);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);}};
  });
})();