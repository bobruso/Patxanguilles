import fs from'node:fs/promises';
import os from'node:os';
import path from'node:path';
import{createRequire}from'node:module';
import{pathToFileURL}from'node:url';
import{normalizeFitActivity,calculatePeakSpeedWindow,haversineMeters}from'../gps/football-gps-engine.js';

const require=createRequire(import.meta.url);
async function loadParser(){
  try{return(require('fit-file-parser').default||require('fit-file-parser'))}catch{}
  const local=path.join(os.tmpdir(),'patx-fit-validation','node_modules','fit-file-parser','dist','fit-parser.js');
  try{const mod=await import(pathToFileURL(local));return mod.default?.default||mod.default}catch{throw new Error('Falta fit-file-parser@5.0.2. Instálalo con: npm install --prefix "$env:TEMP\\patx-fit-validation" fit-file-parser@5.0.2 --no-save')}
}
const FitParser=await loadParser();
const fixtures=[['COROS',path.resolve('tests/COROS_PACE_4.FIT')],['GARMIN',path.resolve('tests/GARMIN_FORERUNNER_165.fit')]];
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const toMs=v=>{const n=new Date(v).getTime();return Number.isFinite(n)?n:null};
const fmt=(v,d=2)=>finite(v)?Number(v).toFixed(d):'n/a';
const kmh=v=>finite(v)?Number(v)*3.6:null;

function peak(engine,seconds){
  if(!engine.recording.denseGps)return null;
  const points=engine.records.filter(r=>finite(r.lat)&&finite(r.lon)&&finite(r.tSec));
  const segments=points.map((p,i)=>({dt:i?p.tSec-points[i-1].tSec:0,distanceM:i?(finite(p.dInc)?Number(p.dInc):haversineMeters(points[i-1],p)):0,cumulativeM:0}));
  for(let i=1;i<segments.length;i++)segments[i].cumulativeM=segments[i-1].cumulativeM+segments[i].distanceM;
  return calculatePeakSpeedWindow(points,segments,seconds).speedMps;
}

function missingCoordinates(raw){
  let count=0,duration=0,runs=0,inRun=false;
  for(let i=0;i<raw.length;i++){const missing=!finite(raw[i].lat)||!finite(raw[i].lon);if(missing){count++;if(!inRun){runs++;inRun=true}if(i>0)duration+=Math.max(0,raw[i].tSec-raw[i-1].tSec)}else inRun=false}
  return{count,duration,runs};
}

for(const[,file]of fixtures){
  const parser=new FitParser({mode:'list',speedUnit:'km/h',lengthUnit:'m'}),buffer=await fs.readFile(file),data=await parser.parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength));
  const records=(data.records||[]).filter(r=>toMs(r.timestamp)!=null).sort((a,b)=>toMs(a.timestamp)-toMs(b.timestamp)),t0=toMs(records[0]?.timestamp);
  const raw=records.map((r,i)=>({tSec:(toMs(r.timestamp)-t0)/1000,dt:i?(toMs(r.timestamp)-toMs(records[i-1].timestamp))/1000:0,lat:finite(r.position_lat)?Number(r.position_lat):null,lon:finite(r.position_long)?Number(r.position_long):null,speedKmh:finite(r.enhanced_speed??r.speed)?Number(r.enhanced_speed??r.speed):null,enhancedSpeedKmh:finite(r.enhanced_speed)?Number(r.enhanced_speed):null,fitSpeedKmh:finite(r.speed)?Number(r.speed):null,distance:finite(r.distance)?Number(r.distance):null,hr:finite(r.heart_rate)?Number(r.heart_rate):null,cadence:finite(r.cadence)?Number(r.cadence):null}));
  const engine=normalizeFitActivity(raw,data),distances=raw.map(r=>r.distance).filter(finite),speeds=raw.map(r=>r.enhancedSpeedKmh??r.fitSpeedKmh).filter(finite),hrs=raw.map(r=>r.hr).filter(finite),missing=missingCoordinates(raw);
  const fitDistance=distances.length?distances.at(-1)-distances[0]:null,fitMax=speeds.length?Math.max(...speeds):null;
  console.log('\n=====================================\nPATXANGUILLES FOOTBALL GPS ENGINE\n=====================================');
  console.log(`FILE\n${path.basename(file)}\n\nDEVICE\nManufacturer: ${engine.device.manufacturer||'unknown'}\nProduct: ${engine.device.product||'unknown'}\nDetected: ${engine.device.detected} (${engine.device.confidence})`);
  console.log(`\nRECORDING\nRecords: ${records.length}\nGPS points: ${engine.recording.gpsPointCount}\nDuration: ${fmt(raw.at(-1)?.tSec,1)} s\nMedian interval: ${fmt(engine.recording.medianSampleInterval)} s\nMean interval: ${fmt(engine.recording.meanSampleInterval)} s\nP95 interval: ${fmt(engine.recording.p95SampleInterval)} s\nMax gap: ${fmt(engine.recording.maxGap)} s\n1-2 s ratio: ${fmt(engine.recording.oneToTwoSecondRatio*100,1)}%`);
  console.log(`\nPROFILE\n${engine.recording.profile}`);
  const jitterRecords=engine.records.filter(r=>r._jitter),jitterDuration=jitterRecords.reduce((s,r)=>s+(Number(r.dt)||0),0);
  console.log(`\nDISTANCE\nFIT distance: ${fmt(engine.metrics.rawFitDistanceMeters)} m\nRaw GPS distance: ${fmt(engine.diagnostics.rawGpsDistanceMeters)} m\nNormalized distance: ${fmt(engine.metrics.distanceMeters)} m\nDifference normalized - FIT: ${fmt(engine.metrics.distanceMeters-engine.metrics.rawFitDistanceMeters)} m\nDistance source: ${engine.metrics.distanceSource}`);
  console.log(`\nSPEED\nFIT max speed: ${fmt(engine.metrics.rawFitMaxSpeedKmh)} km/h\nGPS peak 1s: ${fmt(kmh(peak(engine,1)))} km/h\nGPS peak 2s: ${fmt(kmh(peak(engine,2)))} km/h\nGPS peak 3s: ${fmt(kmh(peak(engine,3)))} km/h\nGPS peak 5s: ${fmt(kmh(peak(engine,5)))} km/h\nSelected max speed: ${fmt(kmh(engine.metrics.maxSpeed3sMps))} km/h\nMax speed source: ${engine.metrics.maxSpeedSource}`);
  console.log(`\nGPS CLEANING\nDefinite GPS errors: ${engine.diagnostics.definiteGpsErrors}\nRemoved definite error distance: ${fmt(engine.diagnostics.removedDefiniteErrorMeters)} m\nPossible jitter (informational): ${fmt(engine.diagnostics.possibleJitterMeters)} m\nPossible jitter segments: ${engine.diagnostics.possibleJitterSegments}\nPossible jitter duration: ${fmt(jitterDuration,1)} s\nMissing coordinate records: ${engine.diagnostics.missingCoordinateRecords}\nMissing coordinate intervals: ${engine.diagnostics.missingCoordinateIntervals}\nMissing coordinate interval duration: ${fmt(engine.diagnostics.missingCoordinateDurationSec,1)} s`);
  console.log(`\nHEART RATE\nMean: ${hrs.length?fmt(hrs.reduce((a,b)=>a+b,0)/hrs.length,1):'n/a'} bpm\nMax: ${hrs.length?fmt(Math.max(...hrs),0):'n/a'} bpm\n\nCONFIDENCE\n${engine.metrics.confidence}`);
  const session=data.sessions?.[0]||{};console.log(`\nSESSION METRIC FIELDS\n${Object.entries(session).filter(([k])=>/distance|speed|heart_rate|timer_time|elapsed_time/i.test(k)).map(([k,v])=>`${k}: ${JSON.stringify(v)}`).join('\n')}`);
  console.log(`\nPARSER DEVICE METADATA\nfile_ids: ${JSON.stringify(data.file_ids||[])}\ndevice_infos: ${JSON.stringify(data.device_infos||[])}`);
}
