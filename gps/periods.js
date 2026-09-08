const MISSING_SAMPLE_REST_S=120;
const HR_BIN_S=30;
const HR_MIN_REST_S=90;
const MIN_PLAY_PERIOD_S=120;

function playableChunksFromGaps(samples){
  const src=(samples||[]).filter(s=>Number.isFinite(s.tSec)).sort((a,b)=>a.tSec-b.tSec);
  if(src.length<10)return[];
  const chunks=[];let start=0;
  for(let i=1;i<src.length;i++){
    if(src[i].tSec-src[i-1].tSec>=MISSING_SAMPLE_REST_S){chunks.push(src.slice(start,i));start=i}
  }
  chunks.push(src.slice(start));
  return chunks.filter(c=>c.length>=10&&(c.at(-1).tSec-c[0].tSec)>=MIN_PLAY_PERIOD_S);
}

function hrRestIntervals(samples){
  const src=(samples||[]).filter(s=>Number.isFinite(s.tSec)&&Number.isFinite(s.hr)&&s.hr>0).sort((a,b)=>a.tSec-b.tSec);
  if(src.length<12)return[];
  const bins=new Map();
  for(const s of src){const k=Math.floor(s.tSec/HR_BIN_S),a=bins.get(k)||[];a.push(s.hr);bins.set(k,a)}
  const pts=[...bins.entries()].map(([bin,a])=>({t:bin*HR_BIN_S,hr:a.reduce((x,y)=>x+y,0)/a.length})).sort((a,b)=>a.t-b.t);
  if(pts.length<6)return[];
  const sorted=pts.map(p=>p.hr).sort((a,b)=>a-b),baseline=sorted[Math.floor(sorted.length*.75)]||0,low=Math.max(95,baseline*.72),duration=src.at(-1).tSec-src[0].tSec,out=[];
  let i=0;
  while(i<pts.length){
    if(pts[i].hr>low){i++;continue}
    const first=i;while(i+1<pts.length&&pts[i+1].hr<=low)i++;const last=i,restS=(last-first+1)*HR_BIN_S,before=pts.slice(Math.max(0,first-5),first).some(p=>p.hr>low*1.12),after=pts.slice(last+1,Math.min(pts.length,last+6)).some(p=>p.hr>low*1.12),start=pts[first].t,end=pts[last].t+HR_BIN_S;
    if(restS>=HR_MIN_REST_S&&before&&after&&start>90&&end<duration-90&&(!out.length||start-out.at(-1).end>=480))out.push({start,end});
    i++;
  }
  return out;
}

function periodsAroundRests(samples,rests){
  const src=(samples||[]).filter(s=>Number.isFinite(s.tSec)).sort((a,b)=>a.tSec-b.tSec);if(!src.length)return[];
  const first=src[0].tSec,last=src.at(-1).tSec,bounds=[];let cursor=first;
  for(const r of rests){if(r.start-cursor>=MIN_PLAY_PERIOD_S)bounds.push({startSec:cursor,endSec:r.start});cursor=r.end}
  if(last-cursor>=MIN_PLAY_PERIOD_S)bounds.push({startSec:cursor,endSec:last});
  return bounds;
}

export function detectFootballPeriods(samples){
  const chunks=playableChunksFromGaps(samples);
  if(chunks.length>=2){return{source:'recording-gaps',confidence:'high',periods:chunks.map((c,i)=>({index:i,startSec:+c[0].tSec.toFixed(1),endSec:+c.at(-1).tSec.toFixed(1)})),rests:chunks.slice(0,-1).map((c,i)=>({start:+c.at(-1).tSec.toFixed(1),end:+chunks[i+1][0].tSec.toFixed(1)}))}}
  const rests=hrRestIntervals(samples),periods=periodsAroundRests(samples,rests);
  if(periods.length>=2)return{source:'heart-rate-recovery',confidence:'medium',periods:periods.map((p,i)=>({index:i,...p})),rests};
  return{source:'none',confidence:'low',periods:[],rests:[]};
}
