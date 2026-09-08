from pathlib import Path

# 1) Store exact sprint positions in new analyses + flip them with attack direction.
p=Path('gps/fit-analysis.js'); s=p.read_text()
old="""function sprintSpatialProfile(pos,sprints){
  if(!pos?.points?.length||!Array.isArray(sprints)||!sprints.length)return{thirds:[0,0,0],sides:[0,0,0],count:0};
  const thirds=[0,0,0],sides=[0,0,0];
  for(const sp of sprints){
    let best=pos.points[0],bestDt=Math.abs(Number(best.tSec)-Number(sp.tSec));
    for(const pt of pos.points){const d=Math.abs(Number(pt.tSec)-Number(sp.tSec));if(d<bestDt){best=pt;bestDt=d}}
    thirds[Math.min(2,Math.floor(clamp(Number(best.u)||0,0,0.9999)*3))]++;
    sides[Math.min(2,Math.floor(clamp(Number(best.v)||0,0,0.9999)*3))]++;
  }
  const n=sprints.length||1;return{thirds:thirds.map(v=>v/n),sides:sides.map(v=>v/n),count:sprints.length};
}"""
new="""function sprintSpatialProfile(pos,sprints){
  if(!pos?.points?.length||!Array.isArray(sprints)||!sprints.length)return{thirds:[0,0,0],sides:[0,0,0],count:0,points:[]};
  const thirds=[0,0,0],sides=[0,0,0],points=[];
  for(const sp of sprints){
    let best=pos.points[0],bestDt=Math.abs(Number(best.tSec)-Number(sp.tSec));
    for(const pt of pos.points){const d=Math.abs(Number(pt.tSec)-Number(sp.tSec));if(d<bestDt){best=pt;bestDt=d}}
    thirds[Math.min(2,Math.floor(clamp(Number(best.u)||0,0,0.9999)*3))]++;
    sides[Math.min(2,Math.floor(clamp(Number(best.v)||0,0,0.9999)*3))]++;
    points.push({u:+Number(best.u).toFixed(4),v:+Number(best.v).toFixed(4),tSec:+Number(sp.tSec).toFixed(1),peakSpeedKmh:+Number(sp.peakSpeedKmh||0).toFixed(2)});
  }
  const n=sprints.length||1;return{thirds:thirds.map(v=>v/n),sides:sides.map(v=>v/n),count:sprints.length,points};
}"""
if old not in s: raise SystemExit('sprintSpatialProfile target missing')
s=s.replace(old,new,1)
s=s.replace("const detail={positional:{thirds:pos?.thirds||[],sides:pos?.sides||[],sprintProfile,role,attackDirection", "const detail={positional:{thirds:pos?.thirds||[],sides:pos?.sides||[],sprintProfile,sprintPoints:sprintProfile.points||[],role,attackDirection",1)
s=s.replace("if(p.sprintProfile?.thirds)p.sprintProfile={...p.sprintProfile,thirds:p.sprintProfile.thirds.slice().reverse()};p.attackDirection=target;", "if(p.sprintProfile?.thirds)p.sprintProfile={...p.sprintProfile,thirds:p.sprintProfile.thirds.slice().reverse()};if(Array.isArray(p.sprintPoints))p.sprintPoints=p.sprintPoints.map(x=>({...x,u:1-Number(x.u||0)}));p.attackDirection=target;",1)
p.write_text(s)

# 2) Overlay sprint points and make direction labels always explicit.
p=Path('gps/pitch-maps.js'); s=p.read_text()
if "import{buildSprintSpatial}" not in s:
    s="import{buildSprintSpatial}from'./sprint-spatial.js';\n"+s
start=s.index('function orientationReliable(analysis)')
end=s.index('\nfunction heatColor',start)
replacement="""function drawDirection(ctx,w,h,margin,analysis){
  const dir=Number(analysis?.analysisDetail?.positional?.attackDirection)===-1?-1:1;
  ctx.font='700 11px system-ui';ctx.fillStyle='rgba(255,255,255,.78)';
  if(dir===1){ctx.textAlign='left';ctx.fillText('◀ DEFENSA',margin+5,h-4);ctx.textAlign='right';ctx.fillText('ATAQUE ▶',w-margin-5,h-4)}
  else{ctx.textAlign='left';ctx.fillText('◀ ATAQUE',margin+5,h-4);ctx.textAlign='right';ctx.fillText('DEFENSA ▶',w-margin-5,h-4)}
}

function drawSprintPoints(ctx,w,h,margin,analysis){
  const spatial=buildSprintSpatial(analysis);if(!spatial.count)return;
  const{map}=pitchMapper(w,h,margin),robust=Number(analysis?.analysisDetail?.speed?.robustTopKmh)||1;
  for(const sp of spatial.points){const p=map(sp.u,sp.v),ratio=Math.max(.75,Math.min(1.25,(Number(sp.peakSpeedKmh)||robust)/robust)),r=Math.max(4,Math.min(8,w/150))*ratio;ctx.beginPath();ctx.fillStyle='rgba(255,176,30,.92)';ctx.strokeStyle='rgba(17,17,17,.92)';ctx.lineWidth=1.5;ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();ctx.stroke()}
}"""
s=s[:start]+replacement+s[end:]
needle="  if(analysis.avgPosition){const p=map(analysis.avgPosition.u,analysis.avgPosition.v);ctx.beginPath();ctx.fillStyle='#fff';ctx.strokeStyle='#111';ctx.lineWidth=2;ctx.arc(p.x,p.y,7,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#111';ctx.font='800 10px system-ui';ctx.textAlign='center';ctx.fillText('AVG',p.x,p.y-11)}\n  drawDirection(ctx,w,h,margin,analysis);"
replace="  if(analysis.avgPosition){const p=map(analysis.avgPosition.u,analysis.avgPosition.v);ctx.beginPath();ctx.fillStyle='#fff';ctx.strokeStyle='#111';ctx.lineWidth=2;ctx.arc(p.x,p.y,7,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#111';ctx.font='800 10px system-ui';ctx.textAlign='center';ctx.fillText('AVG',p.x,p.y-11)}\n  drawSprintPoints(ctx,w,h,margin,analysis);\n  drawDirection(ctx,w,h,margin,analysis);"
if needle not in s: raise SystemExit('heatmap overlay target missing')
s=s.replace(needle,replace,1)
p.write_text(s)

# 3) Add spatial summary section to main report.
p=Path('gps/player-gps-panel.js'); s=p.read_text()
old="import{fatiguePanelHtml}from'./fatigue-panel.js';"
new="import{fatiguePanelHtml}from'./fatigue-panel.js';\nimport{sprintSpatialPanelHtml}from'./sprint-spatial-panel.js';"
if old not in s: raise SystemExit('panel import target missing')
s=s.replace(old,new,1)
old2="  ${fatiguePanelHtml(speed,a?.durationS)}"
new2="  ${sprintSpatialPanelHtml(a,speed)}\n  ${fatiguePanelHtml(speed,a?.durationS)}"
if old2 not in s: raise SystemExit('panel section target missing')
s=s.replace(old2,new2,1)
p.write_text(s)
