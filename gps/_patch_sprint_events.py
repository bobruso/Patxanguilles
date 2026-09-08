from pathlib import Path

p=Path('gps/fit-analysis.js'); s=p.read_text()
old="""  const sprints=selected.filter(p=>p.peakSpeedKmh>=cutoff).map(p=>({tSec:+samples[p.index].tSec.toFixed(1),peakSpeedKmh:+p.peakSpeedKmh.toFixed(2),prominenceKmh:+p.prominenceKmh.toFixed(2)}));
  return{model:'relative_peak_v1',cutoffKmh:+cutoff.toFixed(2),robustTopKmh:+robustTop.toFixed(2),runningFloorKmh:+runningFloor.toFixed(2),candidatePeakCount:selected.length,sprints};"""
new="""  const eventFloor=Math.max(runningFloor,cutoff*.78);
  const sprints=selected.filter(p=>p.peakSpeedKmh>=cutoff).map(p=>{
    let a=p.index,b=p.index;
    while(a>0&&values[a-1]>=eventFloor&&samples[p.index].tSec-samples[a-1].tSec<=12)a--;
    while(b<values.length-1&&values[b+1]>=eventFloor&&samples[b+1].tSec-samples[p.index].tSec<=12)b++;
    let distanceM=0;for(let j=a;j<=b;j++)distanceM+=Number(samples[j].dInc)||0;
    const startSec=Number(samples[a].tSec)||0,endSec=Number(samples[b].tSec)||startSec,durationS=Math.max(0,endSec-startSec),peakSec=Number(samples[p.index].tSec)||0;
    return{tSec:+peakSec.toFixed(1),startSec:+startSec.toFixed(1),endSec:+endSec.toFixed(1),durationS:+durationS.toFixed(1),distanceM:+distanceM.toFixed(1),peakSpeedKmh:+p.peakSpeedKmh.toFixed(2),prominenceKmh:+p.prominenceKmh.toFixed(2),relativeIntensityPct:robustTop>0?Math.round(p.peakSpeedKmh/robustTop*100):null};
  });
  for(let i=0;i<sprints.length;i++)sprints[i].recoveryToNextS=i<sprints.length-1?+Math.max(0,sprints[i+1].startSec-sprints[i].endSec).toFixed(1):null;
  const longest=sprints.slice().sort((a,b)=>b.distanceM-a.distanceM)[0]||null,explosive=sprints.slice().sort((a,b)=>(b.prominenceKmh/Math.max(.5,b.durationS))-(a.prominenceKmh/Math.max(.5,a.durationS)))[0]||null,fastest=sprints.slice().sort((a,b)=>b.peakSpeedKmh-a.peakSpeedKmh)[0]||null,totalSprintDistanceM=sprints.reduce((n,x)=>n+x.distanceM,0),recoveries=sprints.map(x=>x.recoveryToNextS).filter(Number.isFinite),avgRecoveryS=recoveries.length?mean(recoveries):null;
  const eventSummary={count:sprints.length,totalSprintDistanceM:+totalSprintDistanceM.toFixed(1),avgRecoveryS:Number.isFinite(avgRecoveryS)?+avgRecoveryS.toFixed(1):null,densityPer10Min:samples.length&&samples.at(-1).tSec>0?+(sprints.length/(samples.at(-1).tSec/600)).toFixed(2):0,longest:longest?{tSec:longest.tSec,distanceM:longest.distanceM,durationS:longest.durationS}:null,fastest:fastest?{tSec:fastest.tSec,peakSpeedKmh:fastest.peakSpeedKmh}:null,mostExplosive:explosive?{tSec:explosive.tSec,prominenceKmh:explosive.prominenceKmh,durationS:explosive.durationS}:null};
  return{model:'relative_peak_v2',cutoffKmh:+cutoff.toFixed(2),robustTopKmh:+robustTop.toFixed(2),runningFloorKmh:+runningFloor.toFixed(2),eventFloorKmh:+eventFloor.toFixed(2),candidatePeakCount:selected.length,eventSummary,sprints};"""
if old not in s: raise SystemExit('sprint function target missing')
p.write_text(s.replace(old,new))

p=Path('gps/player-gps-panel.js'); s=p.read_text()
s=s.replace("${mini('Distancia / min',finite(work.distancePerMin)?Math.round(work.distancePerMin)+' m':'—')}</div>${sprintPeakTable(speed)}", "${mini('Distancia / min',finite(work.distancePerMin)?Math.round(work.distancePerMin)+' m':'—')}${mini('Distancia en sprint',finite(speed.eventSummary?.totalSprintDistanceM)?Math.round(speed.eventSummary.totalSprintDistanceM)+' m':'—')}${mini('Densidad',finite(speed.eventSummary?.densityPer10Min)?Number(speed.eventSummary.densityPer10Min).toFixed(1)+' / 10 min':'—')}${mini('Recuperación media',finite(speed.eventSummary?.avgRecoveryS)?Math.round(speed.eventSummary.avgRecoveryS)+' s':'—')}</div>${sprintHighlights(speed)}${sprintPeakTable(speed)}")
start=s.index('function sprintPeakTable(speed)')
end=s.index('\nfunction fmtClock',start)
newfn="""function sprintHighlights(speed){const e=speed?.eventSummary||{};if(!e.count)return'';return `<div class=\"patx-gps-sprint-highlights\">${e.longest?mini('Sprint más largo',`${Math.round(e.longest.distanceM)} m · ${Number(e.longest.durationS).toFixed(1)} s`):''}${e.fastest?mini('Mayor punta',fmtKmh(e.fastest.peakSpeedKmh)):''}${e.mostExplosive?mini('Más explosivo',`${Number(e.mostExplosive.prominenceKmh).toFixed(1)} km/h de subida`):''}</div>`}function sprintPeakTable(speed){const arr=(speed?.sprints||[]).slice().sort((a,b)=>Number(b.peakSpeedKmh)-Number(a.peakSpeedKmh)).slice(0,10);if(!arr.length)return'';return `<div class=\"patx-gps-sprint-table\"><div class=\"patx-gps-sprint-head\"><span>#</span><span>MOMENTO</span><span>PUNTA</span><span>DURACIÓN</span><span>DISTANCIA</span><span>RECUP.</span></div>${arr.map((x,i)=>`<div class=\"patx-gps-sprint-row\"><b>#${i+1}</b><span>${fmtClock(x.tSec)}</span><strong>${fmtKmh(x.peakSpeedKmh)}</strong><span>${finite(x.durationS)?Number(x.durationS).toFixed(1)+' s':'—'}</span><span>${finite(x.distanceM)?Math.round(x.distanceM)+' m':'—'}</span><span>${finite(x.recoveryToNextS)?Math.round(x.recoveryToNextS)+' s':'—'}</span></div>`).join('')}</div>`}"""
s=s[:start]+newfn+s[end:]
p.write_text(s)

p=Path('gps/gps-panel.css'); s=p.read_text()
css="""\n.patx-gps-sprint-highlights{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}.patx-gps-sprint-table{margin-top:14px;border:1px solid rgba(255,255,255,.08);border-radius:12px;overflow:hidden}.patx-gps-sprint-head,.patx-gps-sprint-row{display:grid;grid-template-columns:55px 1fr 1fr 1fr 1fr 1fr;gap:8px;align-items:center}.patx-gps-sprint-head{padding:8px 10px;background:#111a15;color:#89958e;font-size:9px;font-weight:900;letter-spacing:.08em}.patx-gps-sprint-row{padding:9px 10px;border-top:1px solid rgba(255,255,255,.06);font-size:11px}.patx-gps-sprint-row strong{white-space:nowrap}@media(max-width:650px){.patx-gps-sprint-highlights{grid-template-columns:1fr}.patx-gps-sprint-head,.patx-gps-sprint-row{grid-template-columns:42px 1fr 1fr 1fr}.patx-gps-sprint-head span:nth-child(5),.patx-gps-sprint-head span:nth-child(6),.patx-gps-sprint-row span:nth-child(5),.patx-gps-sprint-row span:nth-child(6){display:none}}\n"""
if '.patx-gps-sprint-highlights{' not in s:s+=css
p.write_text(s)
