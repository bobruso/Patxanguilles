const DPR=()=>Math.max(1,window.devicePixelRatio||1);
const finite=v=>Number.isFinite(Number(v));

function prepare(canvas,height=210){
  const width=Math.max(320,canvas.parentElement?.clientWidth||canvas.clientWidth||760),dpr=DPR();
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.style.width='100%';canvas.style.height=height+'px';
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);return{ctx,w:width,h:height};
}

function niceMax(v,step){return Math.max(step,Math.ceil(Number(v||0)/step)*step)}
function clock(sec){const s=Math.max(0,Math.round(Number(sec)||0)),m=Math.floor(s/60);return m+'′'}

function drawGrid(ctx,w,h,pad,{xMax,yMin,yMax,yStep,labelFormatter}){
  const pw=w-pad.l-pad.r,ph=h-pad.t-pad.b;
  ctx.fillStyle='#0b120e';ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='rgba(255,255,255,.08)';ctx.lineWidth=1;
  const yCount=Math.max(1,Math.round((yMax-yMin)/yStep));
  for(let i=0;i<=yCount;i++){
    const y=pad.t+ph*(i/yCount),value=yMax-(yMax-yMin)*(i/yCount);
    ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();
    ctx.fillStyle='rgba(215,225,219,.58)';ctx.font='10px system-ui';ctx.textAlign='right';ctx.textBaseline='middle';ctx.fillText(labelFormatter(value),pad.l-7,y);
  }
  const xTicks=5;
  for(let i=0;i<=xTicks;i++){
    const x=pad.l+pw*(i/xTicks),value=xMax*(i/xTicks);
    ctx.beginPath();ctx.moveTo(x,pad.t);ctx.lineTo(x,h-pad.b);ctx.stroke();
    ctx.fillStyle='rgba(215,225,219,.52)';ctx.font='10px system-ui';ctx.textAlign=i===0?'left':i===xTicks?'right':'center';ctx.textBaseline='top';ctx.fillText(clock(value),x,h-pad.b+7);
  }
  return{pw,ph};
}

function drawSeries(canvas,series,config){
  if(!Array.isArray(series)||series.length<2)return drawEmpty(canvas,config.empty||'Sin datos suficientes');
  const clean=series.filter(p=>finite(p?.tSec)&&finite(p?.value));if(clean.length<2)return drawEmpty(canvas,config.empty||'Sin datos suficientes');
  const{ctx,w,h}=prepare(canvas,config.height||210),pad={l:44,r:14,t:17,b:28},xMax=Math.max(1,...clean.map(p=>Number(p.tSec))),rawMin=Math.min(...clean.map(p=>Number(p.value))),rawMax=Math.max(...clean.map(p=>Number(p.value))),yMin=config.zero?0:Math.max(0,Math.floor((rawMin-(config.padding||5))/(config.step||10))*(config.step||10)),yMax=config.zero?niceMax(rawMax,config.step||10):niceMax(rawMax+(config.padding||5),config.step||10),{pw,ph}=drawGrid(ctx,w,h,pad,{xMax,yMin,yMax,yStep:config.step||10,labelFormatter:config.labelFormatter||Math.round});
  const map=p=>({x:pad.l+(Number(p.tSec)/xMax)*pw,y:pad.t+(1-(Number(p.value)-yMin)/Math.max(1,yMax-yMin))*ph});
  const area=ctx.createLinearGradient(0,pad.t,0,h-pad.b);area.addColorStop(0,config.areaTop||'rgba(139,210,255,.26)');area.addColorStop(1,'rgba(139,210,255,0)');
  ctx.beginPath();clean.forEach((p,i)=>{const q=map(p);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)});const last=map(clean.at(-1)),first=map(clean[0]);ctx.lineTo(last.x,h-pad.b);ctx.lineTo(first.x,h-pad.b);ctx.closePath();ctx.fillStyle=area;ctx.fill();
  ctx.beginPath();clean.forEach((p,i)=>{const q=map(p);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)});ctx.strokeStyle=config.stroke||'#8bd2ff';ctx.lineWidth=2;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();
  if(Array.isArray(config.thresholds))for(const threshold of config.thresholds){if(!finite(threshold.value)||threshold.value<yMin||threshold.value>yMax)continue;const y=pad.t+(1-(threshold.value-yMin)/(yMax-yMin))*ph;ctx.setLineDash([4,5]);ctx.strokeStyle=threshold.color||'rgba(255,255,255,.45)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=threshold.color||'rgba(255,255,255,.65)';ctx.font='9px system-ui';ctx.textAlign='right';ctx.textBaseline='bottom';ctx.fillText(threshold.label||String(threshold.value),w-pad.r-2,y-2)}
}

function drawEmpty(canvas,message){const{ctx,w,h}=prepare(canvas,190);ctx.fillStyle='#0b120e';ctx.fillRect(0,0,w,h);ctx.fillStyle='#8f9b94';ctx.font='600 13px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(message,w/2,h/2)}

export function drawSpeedChart(canvas,analysis){
  const speed=analysis?.analysisDetail?.speed||{},series=speed.speedSeries||[];
  drawSeries(canvas,series,{zero:true,step:5,stroke:'#8bd2ff',areaTop:'rgba(74,173,235,.26)',labelFormatter:v=>Math.round(v),thresholds:[{value:Number(speed.highIntensityThresholdKmh)||13,label:'Alta intensidad',color:'rgba(255,176,30,.75)'},{value:Number(speed.sprintThresholdKmh)||18,label:'Sprint',color:'rgba(255,75,69,.8)'}],empty:'Sin serie de velocidad'});
}

export function drawHeartRateChart(canvas,analysis){
  const hr=analysis?.analysisDetail?.heartRate||{},series=hr.series||[],max=Number(hr.referenceMaxBpm)||0;
  const thresholds=max?[.6,.7,.8,.9].map((p,i)=>({value:Math.round(max*p),label:'Z'+(i+2),color:'rgba(255,110,100,.45)'})):[];
  drawSeries(canvas,series,{zero:false,step:20,padding:10,stroke:'#ff7168',areaTop:'rgba(255,75,69,.22)',labelFormatter:v=>Math.round(v),thresholds,empty:'El FIT no contiene pulsaciones'});
}

export function drawAllTimeCharts(root,analysis){
  const speed=root.querySelector('[data-gps-chart="speed"]'),hr=root.querySelector('[data-gps-chart="hr"]');if(speed)drawSpeedChart(speed,analysis);if(hr)drawHeartRateChart(hr,analysis);
}
