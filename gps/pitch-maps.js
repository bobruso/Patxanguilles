const DEFAULT_ASPECT=68/105;

function fitCanvas(canvas,aspect=DEFAULT_ASPECT){
  const cssWidth=Math.max(320,canvas.parentElement?.clientWidth||canvas.clientWidth||900);
  const cssHeight=Math.round(cssWidth*aspect);
  const dpr=Math.max(1,window.devicePixelRatio||1);
  canvas.width=Math.round(cssWidth*dpr);
  canvas.height=Math.round(cssHeight*dpr);
  canvas.style.width='100%';
  canvas.style.height=cssHeight+'px';
  const ctx=canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  return{ctx,w:cssWidth,h:cssHeight};
}

function pitchMapper(w,h,margin){
  const pw=w-margin*2,ph=h-margin*2;
  return{pw,ph,map:(u,v)=>({x:margin+u*pw,y:margin+v*ph})};
}

function drawPitchBase(ctx,w,h,margin){
  const{pw,ph}=pitchMapper(w,h,margin);
  for(let i=0;i<12;i++){
    ctx.fillStyle=i%2===0?'#123b26':'#17472e';
    ctx.fillRect(margin+i*pw/12,margin,pw/12+1,ph);
  }
  ctx.strokeStyle='rgba(255,255,255,.68)';
  ctx.lineWidth=2;
  ctx.strokeRect(margin,margin,pw,ph);
  ctx.beginPath();ctx.moveTo(margin+pw/2,margin);ctx.lineTo(margin+pw/2,margin+ph);ctx.stroke();
  ctx.beginPath();ctx.arc(margin+pw/2,margin+ph/2,ph*.13,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.arc(margin+pw/2,margin+ph/2,2.5,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,.8)';ctx.fill();
  const penW=pw*.16,penH=ph*.58,goalW=pw*.055,goalH=ph*.3;
  ctx.strokeRect(margin,margin+(ph-penH)/2,penW,penH);
  ctx.strokeRect(margin,margin+(ph-goalH)/2,goalW,goalH);
  ctx.strokeRect(margin+pw-penW,margin+(ph-penH)/2,penW,penH);
  ctx.strokeRect(margin+pw-goalW,margin+(ph-goalH)/2,goalW,goalH);
}

function orientationReliable(analysis){return !!analysis?.analysisDetail?.positional?.orientationReliable}
function drawDirection(ctx,w,h,margin,analysis){
  ctx.font='700 11px system-ui';
  ctx.fillStyle='rgba(255,255,255,.78)';
  if(orientationReliable(analysis)){
    ctx.textAlign='left';ctx.fillText('◀ DEFENSA',margin+5,h-4);
    ctx.textAlign='right';ctx.fillText('ATAQUE ▶',w-margin-5,h-4);
  }else{
    ctx.textAlign='center';
    ctx.fillStyle='rgba(255,255,255,.56)';
    ctx.fillText('ORIENTACIÓN DEL CAMPO SIN CALIBRAR',w/2,h-4);
  }
}

function heatColor(t){
  const stops=[[0,[28,62,199]],[.35,[36,190,200]],[.55,[70,210,90]],[.75,[244,218,42]],[1,[231,43,38]]];
  for(let i=1;i<stops.length;i++)if(t<=stops[i][0]){
    const[t0,c0]=stops[i-1],[t1,c1]=stops[i],f=(t-t0)/(t1-t0||1);
    return c0.map((v,j)=>Math.round(v+(c1[j]-v)*f));
  }
  return stops.at(-1)[1];
}

export function drawHeatmap(canvas,analysis){
  const grid=analysis?.heatmapGrid;
  if(!grid?.length)return drawNoGps(canvas,'Sin datos GPS suficientes');
  const{ctx,w,h}=fitCanvas(canvas),margin=Math.max(14,w*.03),{pw,ph,map}=pitchMapper(w,h,margin);
  drawPitchBase(ctx,w,h,margin);
  const gx=grid[0]?.length||0,gy=grid.length,max=Math.max(1,...grid.flat()),cellW=pw/Math.max(1,gx),radius=Math.max(11,cellW*1.8);
  const layer=document.createElement('canvas');layer.width=Math.round(w);layer.height=Math.round(h);const lctx=layer.getContext('2d');
  for(let y=0;y<gy;y++)for(let x=0;x<gx;x++){
    const value=grid[y][x];if(value<=0)continue;
    const intensity=Math.pow(value/max,.55),p=map((x+.5)/gx,(y+.5)/gy),g=lctx.createRadialGradient(p.x,p.y,0,p.x,p.y,radius);
    g.addColorStop(0,`rgba(0,0,0,${.92*intensity})`);g.addColorStop(1,'rgba(0,0,0,0)');lctx.fillStyle=g;lctx.fillRect(p.x-radius,p.y-radius,radius*2,radius*2);
  }
  const img=lctx.getImageData(0,0,Math.round(w),Math.round(h)),d=img.data;
  for(let i=0;i<d.length;i+=4){const a=d[i+3]/255;if(a<=.02){d[i+3]=0;continue}const c=heatColor(a);d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];d[i+3]=Math.min(235,a*235)}
  lctx.putImageData(img,0,0);ctx.drawImage(layer,0,0,w,h);
  if(analysis.avgPosition){const p=map(analysis.avgPosition.u,analysis.avgPosition.v);ctx.beginPath();ctx.fillStyle='#fff';ctx.strokeStyle='#111';ctx.lineWidth=2;ctx.arc(p.x,p.y,7,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#111';ctx.font='800 10px system-ui';ctx.textAlign='center';ctx.fillText('AVG',p.x,p.y-11)}
  drawDirection(ctx,w,h,margin,analysis);
}

function timeColor(t){return[Math.round(137+(255-137)*t),Math.round(88+(149-88)*t),Math.round(248+(28-248)*t)]}

export function drawMovementTrail(canvas,analysis){
  const pts=analysis?.trail;
  if(!pts?.length)return drawNoGps(canvas,'Sin recorrido GPS suficiente');
  const{ctx,w,h}=fitCanvas(canvas),margin=Math.max(14,w*.03),{map}=pitchMapper(w,h,margin);
  drawPitchBase(ctx,w,h,margin);
  const tMax=pts.at(-1)?.tSec||1;
  ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=Math.max(1.5,w/520);
  for(let i=1;i<pts.length;i++){
    const a=map(pts[i-1].u,pts[i-1].v),b=map(pts[i].u,pts[i].v),c=timeColor(Math.min(1,(pts[i].tSec||i)/tMax));
    ctx.strokeStyle=`rgba(${c[0]},${c[1]},${c[2]},.68)`;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  const start=map(pts[0].u,pts[0].v),end=map(pts.at(-1).u,pts.at(-1).v);
  for(const[p,label,fill]of[[start,'I','#fff'],[end,'F','#ffb01e']]){ctx.beginPath();ctx.fillStyle=fill;ctx.strokeStyle='#111';ctx.lineWidth=2;ctx.arc(p.x,p.y,7,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#111';ctx.font='800 9px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,p.x,p.y+.5)}
  drawDirection(ctx,w,h,margin,analysis);
}

export function drawZoneOccupancy(canvas,analysis){
  const grid=analysis?.zoneGrid;
  if(!grid?.length)return drawNoGps(canvas,'Sin ocupación GPS suficiente');
  const{ctx,w,h}=fitCanvas(canvas),margin=Math.max(14,w*.03),{pw,ph}=pitchMapper(w,h,margin);
  drawPitchBase(ctx,w,h,margin);
  const ny=grid.length,nx=grid[0]?.length||0,total=Math.max(1,grid.flat().reduce((a,b)=>a+(Number(b)||0),0)),cw=pw/nx,ch=ph/ny,font=Math.max(10,Math.min(15,cw*.28));
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
    const pct=(Number(grid[y][x])||0)/total,px=margin+x*cw,py=margin+y*ch;
    ctx.fillStyle=`rgba(227,38,46,${.08+Math.min(.84,pct*4.8)})`;ctx.fillRect(px,py,cw,ch);
    ctx.strokeStyle='rgba(255,255,255,.27)';ctx.lineWidth=1;ctx.strokeRect(px,py,cw,ch);
    ctx.fillStyle=pct<.01?'rgba(255,255,255,.42)':'#fff';ctx.font=`800 ${font}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(Math.round(pct*100)+'%',px+cw/2,py+ch/2);
  }
  drawDirection(ctx,w,h,margin,analysis);
}

function drawNoGps(canvas,message){
  const{ctx,w,h}=fitCanvas(canvas);ctx.fillStyle='#0d1712';ctx.fillRect(0,0,w,h);ctx.fillStyle='#9aa69f';ctx.font='600 14px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(message,w/2,h/2);
}

export function drawAllPitchMaps(root,analysis){
  const heat=root.querySelector('[data-gps-map="heatmap"]'),trail=root.querySelector('[data-gps-map="trail"]'),zones=root.querySelector('[data-gps-map="zones"]');
  if(heat)drawHeatmap(heat,analysis);if(trail)drawMovementTrail(trail,analysis);if(zones)drawZoneOccupancy(zones,analysis);
}
