import fs from'node:fs/promises';
import os from'node:os';
import path from'node:path';
import{pathToFileURL}from'node:url';
import{GPS_ENGINE_CONFIG,haversineMeters,normalizeFitActivity}from'../gps/football-gps-engine.js';

const parserModule=await import(pathToFileURL(path.join(os.tmpdir(),'patx-fit-validation','node_modules','fit-file-parser','dist','fit-parser.js')));
const FitParser=parserModule.default;
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const toMs=v=>new Date(v).getTime();
const fmt=(v,d=2)=>finite(v)?Number(v).toFixed(d):'n/a';

async function parse(file){
  const parser=new FitParser({mode:'list',speedUnit:'km/h',lengthUnit:'m'}),buffer=await fs.readFile(file),data=await parser.parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength));
  const records=data.records.filter(r=>Number.isFinite(toMs(r.timestamp))).sort((a,b)=>toMs(a.timestamp)-toMs(b.timestamp)),startMs=toMs(records[0].timestamp);
  const raw=records.map((r,index)=>({index,absoluteMs:toMs(r.timestamp),tSec:(toMs(r.timestamp)-startMs)/1000,lat:finite(r.position_lat)?Number(r.position_lat):null,lon:finite(r.position_long)?Number(r.position_long):null,speedKmh:finite(r.enhanced_speed??r.speed)?Number(r.enhanced_speed??r.speed):null,enhancedSpeedKmh:finite(r.enhanced_speed)?Number(r.enhanced_speed):null,fitSpeedKmh:finite(r.speed)?Number(r.speed):null,distance:finite(r.distance)?Number(r.distance):null}));
  return{data,raw,startMs};
}

function bearing(a,b){
  const r=Math.PI/180,p1=a.lat*r,p2=b.lat*r,d=(b.lon-a.lon)*r;
  return(Math.atan2(Math.sin(d)*Math.cos(p2),Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(d))*180/Math.PI+360)%360;
}
function angleDelta(a,b){const d=Math.abs(a-b)%360;return Math.min(d,360-d)}
function metrics(points){
  let pathM=0,spreadM=0,directionChanges=0,previousBearing=null;
  for(let i=1;i<points.length;i++){
    pathM+=haversineMeters(points[i-1],points[i]);const current=bearing(points[i-1],points[i]);
    if(previousBearing!=null&&angleDelta(previousBearing,current)>=60)directionChanges++;previousBearing=current;
  }
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)spreadM=Math.max(spreadM,haversineMeters(points[i],points[j]));
  const netM=points.length>1?haversineMeters(points[0],points.at(-1)):0,durationS=points.length>1?(points.at(-1).absoluteMs-points[0].absoluteMs)/1000:0;
  return{pathM,netM,ratio:pathM?netM/pathM:1,spreadM,directionChanges,durationS,speedMps:durationS>0?pathM/durationS:0};
}

function currentJitterTriggers(points){
  const triggers=new Map(),segments=points.map((p,i)=>({rawDistanceM:i?haversineMeters(points[i-1],p):0}));let left=0;
  for(let right=0;right<points.length;right++){
    while((points[right].absoluteMs-points[left].absoluteMs)/1000>GPS_ENGINE_CONFIG.jitterWindowSec&&left<right)left++;
    if(right-left<3)continue;const window=points.slice(left,right+1),m=metrics(window),anchorSpreadM=Math.max(...window.map(p=>haversineMeters(window[0],p)));
    if(m.pathM>0&&m.netM<=GPS_ENGINE_CONFIG.jitterMaxNetM&&m.ratio<=GPS_ENGINE_CONFIG.jitterMaxRatio&&anchorSpreadM<=GPS_ENGINE_CONFIG.jitterMaxSpreadM){
      for(let i=left+1;i<=right;i++)if(!triggers.has(i))triggers.set(i,{left,right,...m,points:window.length,distanceRemovedM:segments[i].rawDistanceM});
    }
  }return triggers;
}

function garminEvidence(garminPoints,startMs,endMs){
  const before=[...garminPoints].reverse().find(p=>p.absoluteMs<=startMs),after=garminPoints.find(p=>p.absoluteMs>=endMs);
  if(!before||!after||before===after)return{classification:'inconclusive',reason:'sin puntos Garmin que rodeen ambos extremos'};
  const observed=garminPoints.filter(p=>p.absoluteMs>=before.absoluteMs&&p.absoluteMs<=after.absoluteMs),m=metrics(observed),bracketS=(after.absoluteMs-before.absoluteMs)/1000;
  // Auxiliary validation only: require close temporal brackets and a clear spatial signal.
  if(bracketS>7)return{classification:'inconclusive',reason:'resolución temporal insuficiente',bracketS,...m,points:observed.length};
  if(m.netM>=3||m.pathM>=4)return{classification:'movement-supported',reason:'desplazamiento Garmin observado',bracketS,...m,points:observed.length};
  if(bracketS<=4&&m.netM<=1.2&&m.pathM<=2)return{classification:'stationary-supported',reason:'posición Garmin observada esencialmente estable',bracketS,...m,points:observed.length};
  return{classification:'inconclusive',reason:'señal Garmin ambigua',bracketS,...m,points:observed.length};
}

const coros=await parse(path.resolve('tests/COROS_PACE_4.FIT')),garmin=await parse(path.resolve('tests/GARMIN_FORERUNNER_165.fit'));
const corosEngine=normalizeFitActivity(coros.raw,coros.data),corosPoints=corosEngine.records.filter(r=>finite(r.lat)&&finite(r.lon)).map(r=>({...r,absoluteMs:coros.startMs+r.tSec*1000})),garminPoints=garmin.raw.filter(r=>finite(r.lat)&&finite(r.lon));
const triggers=currentJitterTriggers(corosPoints),rows=[];
for(const[index,trigger]of triggers){
  const a=corosPoints[index-1],b=corosPoints[index],evidence=garminEvidence(garminPoints,a.absoluteMs,b.absoluteMs);
  rows.push({segment:index,start:new Date(a.absoluteMs).toISOString(),end:new Date(b.absoluteMs).toISOString(),durationS:(b.absoluteMs-a.absoluteMs)/1000,corosPathM:trigger.pathM,corosNetM:trigger.netM,netPathRatio:trigger.ratio,directionChanges:trigger.directionChanges,spreadM:trigger.spreadM,estimatedSpeedMps:trigger.speedMps,distanceRemovedM:trigger.distanceRemovedM,pointsInWindow:trigger.points,garminClass:evidence.classification,garminBracketS:evidence.bracketS??null,garminPathM:evidence.pathM??null,garminNetM:evidence.netM??null,garminPoints:evidence.points??0,reason:evidence.reason});
}
const groups=['movement-supported','stationary-supported','inconclusive'].map(classification=>{const selected=rows.filter(r=>r.garminClass===classification);return{classification,segments:selected.length,meters:selected.reduce((s,r)=>s+r.distanceRemovedM,0)}});
console.log('PATXANGUILLES FOOTBALL GPS ENGINE · COROS JITTER DIAGNOSTIC');
console.log(`Current jitter removal: ${rows.length} segments / ${fmt(rows.reduce((s,r)=>s+r.distanceRemovedM,0))} m`);
for(const g of groups)console.log(`${g.classification}: ${g.segments} segments / ${fmt(g.meters)} m`);
console.log('\nSEGMENT DETAIL (coordinates intentionally omitted)');
console.table(rows.map(r=>({segment:r.segment,start:r.start.slice(11,19),end:r.end.slice(11,19),duration_s:fmt(r.durationS,1),coros_path_m:fmt(r.corosPathM),coros_net_m:fmt(r.corosNetM),net_path:fmt(r.netPathRatio,3),turns:r.directionChanges,spread_m:fmt(r.spreadM),speed_mps:fmt(r.estimatedSpeedMps),removed_m:fmt(r.distanceRemovedM),points:r.pointsInWindow,garmin:r.garminClass,g_path_m:fmt(r.garminPathM),g_net_m:fmt(r.garminNetM),g_points:r.garminPoints,g_bracket_s:fmt(r.garminBracketS,1)})));
await fs.writeFile(path.resolve('tests/coros-jitter-diagnostic.json'),JSON.stringify({generatedAt:new Date().toISOString(),currentJitterRemoval:{segments:rows.length,meters:rows.reduce((s,r)=>s+r.distanceRemovedM,0)},garminValidation:groups,segments:rows},null,2));
console.log('\nDetailed JSON: tests/coros-jitter-diagnostic.json');
