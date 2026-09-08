import assert from'node:assert/strict';
import{buildFatigueProfile}from'./fatigue-profile.js';

function speedSeries(duration=3600,fn=()=>12){const out=[];for(let t=0;t<=duration;t+=10)out.push({tSec:t,value:fn(t)});return out}
function events(times,peakFn=()=>18,recoveryFn=()=>45){return times.map((t,i)=>({tSec:t,peakSpeedKmh:peakFn(t,i),recoveryToNextS:i<times.length-1?recoveryFn(t,i):null,distanceM:22,durationS:5,prominenceKmh:5}))}

{
  const speed={speedSeries:speedSeries(3600,t=>10+4*Math.sin(t/150)+2*Math.sin(t/37)),sprints:events([180,420,660,900,1140,1380,1620,1860,2100,2340,2580,2820,3060,3300],()=>18.5,()=>48)};
  const f=buildFatigueProfile(speed,3600);
  assert.equal(f.available,true);
  assert.equal(f.summary.level,'stable');
}

{
  // Deliberately strong, multi-signal deterioration: both high-speed capacity and sprint peaks fall sharply, while recovery worsens.
  const speed={speedSeries:speedSeries(3600,t=>{const fade=t<1800?1:1-.35*((t-1800)/1800);return (10+5*Math.sin(t/120)+2*Math.sin(t/31))*fade}),sprints:events([180,420,660,900,1140,1380,1620,1860,2160,2460,2760,3060,3360],t=>t<1800?19:13.5,t=>t<1800?45:95)};
  const f=buildFatigueProfile(speed,3600);
  assert.equal(f.available,true);
  assert.equal(f.summary.level,'clear','Only a consistent multi-signal deterioration should classify as clear fatigue');
}

{
  const speed={speedSeries:speedSeries(3600,t=>10+4*Math.sin(t/140)+2*Math.sin(t/39)),sprints:events([180,420,660,900,1140,1380,1620,2100,2700,3300],()=>18.6,()=>50)};
  const f=buildFatigueProfile(speed,3600);
  assert.equal(f.available,true);
  assert.notEqual(f.summary.level,'clear','A tactical lull alone must not be classified as clear fatigue');
}

console.log('Fatigue profile regression tests OK');
