(() => {
  'use strict';

  window.PatxGameRegistry.register('free-kick', ({ container, config = {}, seed = 1, onFinish }) => {
    const shots = Number(config.shots || 3);
    const maxScore = Number(config.max_score || 3000);
    let state = Number(seed) || 1;
    let shot = 0, total = 0, startedAt = 0, finished = false, dragging = false, timer = 0;
    let canvas,ctx,dpr=1,w=0,h=0,start=null,current=null,target=null,wall=null,resultLine=null;

    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}

    container.innerHTML=`
      <div class="skill-game-wrap">
        <div class="football-topline"><span data-shot>Falta 1 / ${shots}</span><strong><span data-score>0</span> pts</strong></div>
        <canvas class="skill-canvas" data-canvas></canvas>
        <div class="football-hint" data-help>Arrastra desde el balón hacia donde quieres colocar la falta.</div>
      </div>`;
    canvas=container.querySelector('[data-canvas]');ctx=canvas.getContext('2d');
    const shotEl=container.querySelector('[data-shot]'),scoreEl=container.querySelector('[data-score]'),help=container.querySelector('[data-help]');

    function resize(){const r=canvas.getBoundingClientRect();dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1));w=Math.max(280,r.width);h=Math.max(360,r.height);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);setupShot(false);draw();}

    function setupShot(reset=true){
      if(reset){resultLine=null;current=null;}
      start={x:w*.5,y:h*.85};
      const left=rnd()>.5;
      target={x:w*(left?.20:.80),y:h*(.19+rnd()*.07)};
      const wallCenter=w*(.42+rnd()*.16);
      wall={x:wallCenter-w*.13,y:h*.53,width:w*.26,height:h*.13};
      draw();
    }

    function drawPitch(){
      ctx.clearRect(0,0,w,h);ctx.fillStyle='#0d2c1a';ctx.fillRect(0,0,w,h);
      ctx.strokeStyle='rgba(255,255,255,.18)';ctx.lineWidth=2;ctx.strokeRect(12,12,w-24,h-24);
      const gx=w*.12,gy=h*.09,gw=w*.76,gh=h*.28;
      ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=4;ctx.strokeRect(gx,gy,gw,gh);
      ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=1;for(let i=1;i<8;i++){const x=gx+gw*i/8;ctx.beginPath();ctx.moveTo(x,gy);ctx.lineTo(x,gy+gh);ctx.stroke();}for(let i=1;i<4;i++){const y=gy+gh*i/4;ctx.beginPath();ctx.moveTo(gx,y);ctx.lineTo(gx+gw,y);ctx.stroke();}
    }

    function draw(){
      if(!ctx||!start)return;drawPitch();
      ctx.fillStyle='#ef3340';ctx.beginPath();ctx.arc(target.x,target.y,24,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();
      ctx.fillStyle='#272d34';ctx.fillRect(wall.x,wall.y,wall.width,wall.height);ctx.fillStyle='#fff';ctx.font='900 12px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';for(let i=0;i<4;i++)ctx.fillText('D',wall.x+wall.width*(i+.5)/4,wall.y+wall.height*.5);
      ctx.font='34px system-ui';ctx.fillText('⚽',start.x,start.y);
      if(dragging&&current){ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.lineTo(current.x,current.y);ctx.strokeStyle='#ffd166';ctx.lineWidth=5;ctx.setLineDash([8,7]);ctx.stroke();ctx.setLineDash([]);}
      if(resultLine){ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.quadraticCurveTo(resultLine.cx,resultLine.cy,resultLine.x,resultLine.y);ctx.strokeStyle=resultLine.blocked?'#ef3340':'#f4f6f8';ctx.lineWidth=6;ctx.stroke();ctx.font='25px system-ui';ctx.fillText(resultLine.blocked?'💥':'⚽',resultLine.x,resultLine.y);}
    }

    function lineXAtY(endX,endY,y){const denom=endY-start.y;if(Math.abs(denom)<1)return start.x;const t=(y-start.y)/denom;return start.x+(endX-start.x)*t;}

    function evaluate(end){
      const goal={left:w*.12,right:w*.88,top:h*.09,bottom:h*.37};
      const inGoal=end.x>=goal.left&&end.x<=goal.right&&end.y>=goal.top&&end.y<=goal.bottom;
      const crossX=lineXAtY(end.x,end.y,wall.y+wall.height*.5);
      const blocked=end.y<wall.y+wall.height && crossX>=wall.x-8&&crossX<=wall.x+wall.width+8;
      const dist=Math.hypot(end.x-target.x,end.y-target.y);
      let points=inGoal&&!blocked?Math.round(1000*Math.max(0,1-dist/190)):0;
      return{points,blocked,inGoal,dist};
    }

    function finish(){if(finished)return;finished=true;clearTimeout(timer);help.textContent='Resultado registrando…';onFinish({score:Math.min(maxScore,total),duration:performance.now()-startedAt,metadata:{shots,total}});}
    function nextShot(){shot++;if(shot>=shots)return setTimeout(finish,450);shotEl.textContent=`Falta ${shot+1} / ${shots}`;setupShot();help.textContent='Arrastra desde el balón y supera la barrera.';}
    function pos(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
    function down(e){if(finished)return;const p=pos(e);if(Math.hypot(p.x-start.x,p.y-start.y)>48){help.textContent='Empieza el gesto sobre el balón.';return;}e.preventDefault();dragging=true;current=p;canvas.setPointerCapture?.(e.pointerId);draw();}
    function move(e){if(!dragging||finished)return;e.preventDefault();current=pos(e);draw();}
    function up(e){if(!dragging||finished)return;e.preventDefault();dragging=false;const p=pos(e);const vx=p.x-start.x,vy=p.y-start.y;if(Math.hypot(vx,vy)<75||vy>-30){help.textContent='Haz un gesto más largo hacia la portería.';current=null;draw();return;}
      const scale=Math.min(1.45,Math.max(.7,340/Math.max(120,Math.hypot(vx,vy))));
      const end={x:start.x+vx*scale,y:start.y+vy*scale};end.x=Math.max(12,Math.min(w-12,end.x));end.y=Math.max(20,Math.min(h*.48,end.y));
      const ev=evaluate(end);total+=ev.points;scoreEl.textContent=total;resultLine={x:end.x,y:end.y,cx:(start.x+end.x)/2+(vx>0?-28:28),cy:(start.y+end.y)/2-35,blocked:ev.blocked};current=null;draw();
      help.textContent=ev.blocked?'¡A la barrera!':!ev.inGoal?'Fuera':ev.points>850?'¡A la escuadra!':ev.points>500?'Buen golpeo':'Gol';timer=setTimeout(nextShot,750);
    }

    canvas.addEventListener('pointerdown',down,{passive:false});canvas.addEventListener('pointermove',move,{passive:false});canvas.addEventListener('pointerup',up,{passive:false});canvas.addEventListener('pointercancel',up,{passive:false});window.addEventListener('resize',resize);
    return{start(){startedAt=performance.now();resize();setupShot();},destroy(){finished=true;clearTimeout(timer);window.removeEventListener('resize',resize);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);}};
  });
})();