import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { configurations, splitRuns, clip, mask, intersectSupports, resample, temporal, rdp, sed, anchor, total, length, dist, segmentDistance, at } from './methods.mjs';
import { scenarios, sampleScenario } from './synthetic.mjs';
import { readFit, project } from './io.mjs';

const near=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<=e,`${a} != ${b}`),p=(t,x,y=0)=>({t,x,y});
test('missing coordinates and large gaps split distance for every method',()=>{
  const runs=splitRuns([p(0,0),p(1,1),p(2,null),p(3,100),p(4,101),p(20,200),p(21,201)]);
  assert.equal(runs.length,3);near(total(runs),3);
  for(const method of configurations()){const q=runs.map(method.run);near(total(q),3);assert.equal(q.length,3);}
});
test('boundary clipping uses fractional chords only within observed runs',()=>{
  const runs=[[p(0,0),p(10,10)],[p(20,20),p(30,30)]];
  near(total(clip(runs,5,25)),10);near(total(clip(runs,11,19)),0);
  assert.deepEqual(intersectSupports(runs,[[p(8,8),p(22,22)]]),[[8,10],[20,22]]);
  near(total(mask(runs,[[8,10],[20,22]])),4);
});
test('linear insertion preserves length; grid-only sampling can cut corners',()=>{
  const q=[p(0,0),p(.5,1,1),p(2,2)];
  near(length(resample(q,1,true)),length(q));
  assert.ok(length(resample(q,1,false))<length(q));
});
test('PCHIP reproduces line, passes knots and remains within coordinate extrema',()=>{
  const line=[p(0,0),p(2,2),p(5,5)];near(length(resample(line,.25,true,true)),5);
  const q=[p(0,0),p(1,2),p(4,1),p(5,5)],filtered=resample(q,.125,true,true);
  for(const a of q){const b=filtered.find(b=>b.t===a.t);near(dist(a,b),0);}
  for(const a of filtered)assert.ok(a.x>=0&&a.x<=5);
});
test('time-integral smoothing does not weight dense clusters more heavily',()=>{
  const sparse=[p(0,0),p(2,4),p(5,0),p(8,0)],dense=resample(sparse,.25,true);
  const a=temporal(sparse,3),b=temporal(dense,3);
  for(const q of a)near(dist(q,b.find(r=>r.t===q.t)),0);
});
test('spatial algorithms preserve slow straight progress and bounded RDP deviation',()=>{
  const q=Array.from({length:101},(_,t)=>p(t,.4*t));
  near(length(anchor(q,1.5)),40);near(length(rdp(q,1)),40);
  const z=Array.from({length:30},(_,t)=>p(t,t,3*Math.sin(t)));const r=rdp(z,1);
  for(const a of z)assert.ok(Math.min(...r.slice(1).map((b,i)=>segmentDistance(a,r[i],b)))<=1+1e-9);
});
test('synchronous simplification bounds temporal error and preserves observed reversals',()=>{
  const shuttle=sampleScenario(scenarios().find(s=>s.name==='shuttle5')).runs[0],q=sed(shuttle,1);
  near(length(q),length(shuttle));for(const p of shuttle)assert.ok(dist(p,at(q,p.t))<=1+1e-9);
});
test('known synthetic lengths, missing support, deterministic correlated noise',()=>{
  const cases=scenarios();near(cases.find(s=>s.name==='straight100').point(50).s,100);
  near(cases.find(s=>s.name==='slow04').point(100).s,40);
  near(cases.find(s=>s.name==='shuttle5').point(50).s,100);
  near(cases.find(s=>s.name==='circle10').point(60).s,20*Math.PI);
  const m=sampleScenario(cases.find(s=>s.name==='missing-slow04'));
  near(total(m.runs),m.observableTruth);assert.ok(m.observableTruth<m.fullTruth);
  assert.deepEqual(sampleScenario(cases[0],{sigma:2,tau:3,seed:9}),sampleScenario(cases[0],{sigma:2,tau:3,seed:9}));
});
test('all methods finite, immutable, endpoint-preserving on noisy and degenerate inputs',()=>{
  for(const s of scenarios()){const {runs}=sampleScenario(s,{sigma:2,tau:3,seed:99}),before=JSON.stringify(runs);
    for(const m of configurations()){for(const run of [...runs,[p(0,0)],[p(0,0),p(1,0),p(2,0)]]){const result=m.run(run);assert.ok(Number.isFinite(length(result)),m.id);near(dist(result[0],run[0]),0);near(dist(result.at(-1),run.at(-1)),0);for(let i=1;i<result.length;i++)assert.ok(result[i].t>result[i-1].t,m.id);}}
    assert.equal(JSON.stringify(runs),before);
  }
});
test('loss of sub-sample out-and-back motion cannot be recovered from equal endpoints',()=>{
  const stationary=[p(0,0),p(2,0)],shuttle=[p(0,0),p(1,5),p(2,0)];
  assert.deepEqual(shuttle.filter(q=>q.t%2===0),stationary);near(length(shuttle),10);near(length(stationary),0);
});
test('real FIT counts, CRC, parser agreement, common support and projection error',async()=>{
  const c=await readFit(fileURLToPath(new URL('../COROS_PACE_4.FIT',import.meta.url))),g=await readFit(fileURLToPath(new URL('../GARMIN_FORERUNNER_165.fit',import.meta.url)));
  assert.equal(c.records.length,868);assert.equal(g.records.length,451);
  const origin=c.records.find(p=>p.lat!=null),cr=splitRuns(project(c.records,origin)),gr=splitRuns(project(g.records,origin));
  const a=Math.max(c.records[0].t,g.records[0].t),b=Math.min(c.records.at(-1).t,g.records.at(-1).t),support=intersectSupports(clip(cr,a,b),clip(gr,a,b));
  near(b-a,864);near(support.reduce((s,[a,b])=>s+b-a,0),808);
  function hav(a,b){const r=Math.PI/180,v=Math.sin((b.lat-a.lat)*r/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin((b.lon-a.lon)*r/2)**2;return 2*6371000*Math.asin(Math.sqrt(v));}
  for(const runs of [cr,gr]){const exact=runs.reduce((s,p)=>s+p.slice(1).reduce((s,q,i)=>s+hav(p[i],q),0),0);near(total(runs),exact,.02);}
});
test('generated summaries exclude coordinate values and personal metadata values',async()=>{
  const report=JSON.parse(await fs.readFile(new URL('results/summary.json',import.meta.url),'utf8'));
  assert.ok(report.paired.every(r=>Number.isFinite(r.corosM)&&Number.isFinite(r.garminM)));
  const forbidden=new Set(['lat','lon','x','y','serial_number','friendly_name','position_lat','position_long','timestamp']);
  function walk(v){if(!v||typeof v!=='object')return;for(const [key,value] of Object.entries(v)){assert.ok(!forbidden.has(key));walk(value);}}walk(report);
});
