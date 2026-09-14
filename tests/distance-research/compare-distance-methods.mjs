import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { readFit, project, csv } from './io.mjs';
import { configurations, splitRuns, clip, mask, intersectSupports, total, length, geometry, mean, quantile, features, noiseEstimate, resample } from './methods.mjs';
import { syntheticStudy } from './synthetic.mjs';

const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(dir,'../..'),out=path.join(dir,'results');
await fs.mkdir(out,{recursive:true});
const protectedFiles=['gps/football-gps-engine.js','gps/fit-analysis.js','gps/gps-panel.css','gps/player-gps-panel.js'];
const hash=async f=>createHash('sha256').update(await fs.readFile(path.join(root,f))).digest('hex');
const before=Object.fromEntries(await Promise.all(protectedFiles.map(async f=>[f,await hash(f)])));
const methods=configurations();
console.log(`Synthetic study: ${methods.length} configurations; seeded training and holdout, before FIT comparison.`);
const synthetic=syntheticStudy(methods);
await csv(path.join(out,'synthetic-cells.csv'),synthetic.rows);
await csv(path.join(out,'synthetic-summary.csv'),synthetic.summary);
await csv(path.join(out,'speed-ablation.csv'),synthetic.ablation);
console.log('Synthetic study complete. Reading paired FIT files.');
const fits=await Promise.all([readFit(path.join(dir,'../COROS_PACE_4.FIT')),readFit(path.join(dir,'../GARMIN_FORERUNNER_165.fit'))]);
const zero=Math.min(...fits.map(f=>f.records[0].t)),origin=fits[0].records.find(p=>p.lat!=null&&p.lon!=null);
const devices=fits.map((fit,i)=>{const records=project(fit.records,origin).map(p=>({...p,t:p.t-zero})),runs=splitRuns(records),dt=records.slice(1).map((p,i)=>p.t-records[i].t),valid=records.filter(p=>p.x!=null&&p.y!=null),session=fit.data.sessions?.[0]||{};
  let missingCount=0,missingRuns=0,missingDuration=0,inGap=false;
  for(let i=0;i<records.length;i++){if(records[i].x==null||records[i].y==null){missingCount++;if(!inGap)missingRuns++;inGap=true;if(i)missingDuration+=records[i].t-records[i-1].t;}else inGap=false;}
  const gaps=runs.slice(1).map((p,i)=>({startSec:runs[i].at(-1).t,endSec:p[0].t,durationSec:p[0].t-runs[i].at(-1).t,bridgeM:length([runs[i].at(-1),p[0]])}));
  return {name:i?'GARMIN':'COROS',records,runs,inventory:fit.inventory,meta:{records:records.length,gpsPoints:valid.length,startSec:records[0].t,endSec:records.at(-1).t,recordDurationSec:records.at(-1).t-records[0].t,sessionDurationSec:session.total_elapsed_time,sessionTimerSec:session.total_timer_time,sessionDistanceM:session.total_distance,recordFitDeltaM:records.at(-1).fit-records[0].fit,firstFitM:records[0].fit,medianDt:quantile(dt,.5),p95Dt:quantile(dt,.95),maxDt:Math.max(...dt),missingCount,missingRuns,missingDurationSec:missingDuration,observableGpsSeconds:runs.reduce((s,p)=>s+p.at(-1).t-p[0].t,0),legacyBridgedRawM:total([valid]),observedRawM:total(runs),gaps,noiseEstimates:runs.map(noiseEstimate),events:fit.data.events?.map(e=>({offsetSec:+new Date(e.timestamp)/1000-zero,event:e.event,type:e.event_type})),laps:(fit.data.laps||[]).map(l=>({startSec:+new Date(l.start_time)/1000-zero,endSec:+new Date(l.timestamp)/1000-zero,distanceM:l.total_distance,timerSec:l.total_timer_time}))}};
});
const commonStart=Math.max(...devices.map(d=>d.meta.startSec)),commonEnd=Math.min(...devices.map(d=>d.meta.endSec));
const commonRuns=devices.map(d=>clip(d.runs,commonStart,commonEnd)),support=intersectSupports(...commonRuns),supportSec=support.reduce((s,[a,b])=>s+b-a,0);
const paired=[],realSummary=[],processed=new Map();
for(const m of methods){const filtered=devices.map(d=>d.runs.map(m.run));processed.set(m.id,filtered);
  for(const window of ['full','common','common-observed']){const source=devices.map((d,i)=>window==='full'?d.runs:window==='common'?commonRuns[i]:mask(d.runs,support)),result=filtered.map(p=>window==='full'?p:window==='common'?clip(p,commonStart,commonEnd):mask(p,support));
    const values=result.map(total),raw=source.map(total),diff=values[1]-values[0];
    const row={method:m.id,family:m.family,parameter:m.param,acceleration:m.accel??null,window,corosM:values[0],garminM:values[1],signedDifferenceM:diff,absoluteDifferenceM:Math.abs(diff),relativeToCorosPct:values[0]?100*diff/values[0]:null,symmetricAbsDifferencePct:mean(values)?100*Math.abs(diff)/mean(values):null,corosRemovedM:raw[0]-values[0],garminRemovedM:raw[1]-values[1],corosRetainedPct:raw[0]?100*values[0]/raw[0]:null,garminRetainedPct:raw[1]?100*values[1]/raw[1]:null};paired.push(row);
    if(window==='common')realSummary.push(row);
  }
}
const geometryRows=[];for(const m of methods)devices.forEach((d,i)=>geometryRows.push({method:m.id,device:d.name,...geometry(d.runs,processed.get(m.id)[i])}));
// FIT increments/speed are comparators, not normalized GPS methods. Split missing speed explicitly.
const auxiliary=[];
for(const d of devices){const speedRuns=splitRuns(d.records.map(p=>({...p,x:Number.isFinite(p.speed)?0:null,y:Number.isFinite(p.speed)?0:null}))),fitRuns=splitRuns(d.records.map(p=>({...p,x:Number.isFinite(p.fit)?0:null,y:Number.isFinite(p.fit)?0:null})));
  for(const window of ['full','common','common-observed']){const select=r=>window==='full'?r:window==='common'?clip(r,commonStart,commonEnd):mask(r,support),s=select(speedRuns),f=select(fitRuns);const integration=sumRuns(s,(a,b)=>(a.speed+b.speed)/2*(b.t-a.t)),fitDelta=sumRuns(f,(a,b)=>Math.max(0,b.fit-a.fit));auxiliary.push({device:d.name,window,recordFitDistanceM:fitDelta,speedTrapezoidM:integration,speedCoveredSec:s.reduce((n,p)=>n+p.at(-1).t-p[0].t,0),fitDecreasingEdges:sumRuns(f,(a,b)=>b.fit<a.fit?1:0)});}
}
function sumRuns(runs,fn){return runs.reduce((s,p)=>s+p.slice(1).reduce((v,b,i)=>v+fn(p[i],b),0),0);}
// COROS downsample uses elapsed-time thresholds and retains observed-run endpoints.
const garminDt=devices[1].records.slice(1).map((p,i)=>p.t-devices[1].records[i].t);
function downsample(p,pattern,phase=0){if(p.length<3)return p;let next=p[0].t+phase+pattern[0],j=0;const q=[p[0]];for(let i=1;i<p.length-1;i++)if(p[i].t>=next){q.push(p[i]);next=p[i].t+pattern[++j%pattern.length];}q.push(p.at(-1));return q;}
const sampling=[];
for(const [name,pattern] of [['original',[1]],['every2',[2]],['every3',[3]],['every4',[4]],['every5',[5]],['garmin-like',garminDt]])for(const phase of name==='original'?[0]:[0,.5,1]){const sampled=devices[0].runs.map(p=>name==='original'?p:downsample(p,pattern,phase));for(const m of methods){const value=total(sampled.map(m.run)),original=total(processed.get(m.id)[0]);sampling.push({sampling:name,phaseSec:phase,method:m.id,points:sampled.reduce((s,p)=>s+p.length,0),distanceM:value,originalM:original,deltaM:value-original,deltaPct:original?100*(value-original)/original:null});}}
// Garmin interpolation ablation: changing mesh density is not recovery of lost turns.
const inverse=[];for(const step of [.25,.5,1,2])for(const cubic of [false,true])for(const keepKnots of [false,true]){const r=devices[1].runs.map(p=>resample(p,step,keepKnots,cubic));inverse.push({stepSec:step,interpolation:cubic?'pchip':'linear',keepKnots,distanceM:total(r),deltaRawM:total(r)-total(devices[1].runs)});}
// Same time windows for both devices, selected only from unfiltered COROS observations.
const candidates=[];for(const p of commonRuns[0])for(let t=p[0].t;t+12<=p.at(-1).t;t+=3){const q=clip([p],t,t+12)[0];candidates.push({startSec:t,endSec:t+12,...features(q)});}
const selectors={sprint:a=>a.speed??-Infinity,stationary:a=>-(a.path/12+a.spread),slow:a=>-Math.abs(a.path/12-.4),turns:a=>a.turns,straight:a=>a.path>=12?a.ratio:-Infinity};
const intervals=[],intervalRows=[];
for(const [category,score] of Object.entries(selectors)){const chosen=[...candidates].sort((a,b)=>score(b)-score(a))[0];if(!chosen)continue;intervals.push({category,...chosen,label:'heuristic; not ground truth'});for(const m of methods)devices.forEach((d,i)=>{const raw=clip(d.runs,chosen.startSec,chosen.endSec),p=clip(processed.get(m.id)[i],chosen.startSec,chosen.endSec);intervalRows.push({category,device:d.name,method:m.id,startSec:chosen.startSec,endSec:chosen.endSec,rawM:total(raw),distanceM:total(p),retainedPct:total(raw)?100*total(p)/total(raw):null,...geometry(raw,p)});});}
const sensitivity=[];for(const family of ['rdp','sed','anchor','temporal','resample-temporal','adaptive','multiscale']){const group=methods.filter(m=>m.family===family).sort((a,b)=>a.param-b.param);for(let i=1;i<group.length;i++){const prev=paired.find(r=>r.method===group[i-1].id&&r.window==='common-observed'),next=paired.find(r=>r.method===group[i].id&&r.window==='common-observed'),step=group[i].param-group[i-1].param;sensitivity.push({family,from:group[i-1].param,to:group[i].param,corosDeltaM:next.corosM-prev.corosM,garminDeltaM:next.garminM-prev.garminM,corosSlopeMPerUnit:(next.corosM-prev.corosM)/step,garminSlopeMPerUnit:(next.garminM-prev.garminM)/step});}}
// Quantify the boundary/context convention, especially for globally selected anchors.
const contextRows=[];for(const m of methods)devices.forEach((d,i)=>{const clippedFirst=mask(d.runs,support),value=total(clippedFirst.map(m.run)),filteredFirst=paired.find(r=>r.method===m.id&&r.window==='common-observed')[i?'garminM':'corosM'];contextRows.push({method:m.id,device:d.name,clipThenFilterM:value,filterThenClipM:filteredFirst,deltaM:value-filteredFirst});});
const after=Object.fromEntries(await Promise.all(protectedFiles.map(async f=>[f,await hash(f)])));
if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('Production file changed while study ran');
const metadata={version:1,node:process.version,parser:'fit-file-parser@5.0.2',methods:methods.length,syntheticSeeds:{train:[1,2,3],holdout:[101,102,103]},syntheticCells:synthetic.rows.length,
  timePolicy:'seconds relative to earliest FIT record; no absolute timestamps exported',commonStartSec:commonStart,commonEndSec:commonEnd,commonDurationSec:commonEnd-commonStart,commonObservedSec:supportSec,commonObservedIntervals:support,
  gapPolicy:'split at any missing coordinate or nonpositive dt or dt > 10 s; preserve 1–7 s Smart chords; linear boundary clipping, never across gaps',
  processingPolicy:'filter complete observed runs, then clip windows (context retained); paired common-observed excludes COROS gaps from both distances',
  geometryPolicy:'local equirectangular metres R=6371000; no coordinates serialized',productionHashesBefore:before,productionHashesAfter:after,
  devices:devices.map(d=>({name:d.name,...d.meta,inventory:d.inventory})),intervals};
await Promise.all([
  csv(path.join(out,'paired.csv'),paired),csv(path.join(out,'geometry.csv'),geometryRows),csv(path.join(out,'auxiliary-fit.csv'),auxiliary),
  csv(path.join(out,'coros-downsampling.csv'),sampling),csv(path.join(out,'garmin-interpolation.csv'),inverse),csv(path.join(out,'intervals.csv'),intervalRows),csv(path.join(out,'sensitivity.csv'),sensitivity),csv(path.join(out,'boundary-context.csv'),contextRows),
  fs.writeFile(path.join(out,'metadata.json'),JSON.stringify(metadata,null,2)+'\n'),fs.writeFile(path.join(out,'summary.json'),JSON.stringify({paired,synthetic:synthetic.summary,geometry:geometryRows,auxiliary,sensitivity},null,2)+'\n')
]);
const f=v=>v==null?'—':v.toFixed(2),chosen=['raw','temporal-3s','temporal-5s','linear-1Hz','pchip-knots-1Hz','rdp-1m','rdp-2m','sed-1m','sed-2m','anchor-1.5m','vw-1m','adaptive-12s','hybrid-12s','kalman-s1-a2','multiscale-0.01','noise-adaptive'];
let md='# Resultados numéricos reproducibles\n\nUnidades: metros salvo indicación. Diferencia = Garmin − COROS. Raw aquí excluye huecos explícitos. Los sintéticos no son ground truth del partido.\n\n';
for(const window of ['full','common','common-observed']){md+=`## ${window}\n\n| Método | COROS m | Garmin m | Δ m | Δ/COROS % | Retenido C % | Retenido G % |\n|---|---:|---:|---:|---:|---:|---:|\n`;for(const id of chosen){const r=paired.find(r=>r.method===id&&r.window===window);md+=`| ${id} | ${f(r.corosM)} | ${f(r.garminM)} | ${f(r.signedDifferenceM)} | ${f(r.relativeToCorosPct)} | ${f(r.corosRetainedPct)} | ${f(r.garminRetainedPct)} |\n`;}md+='\n';}
md+='## Sintéticos: holdout\n\nMAPE: media de errores absolutos porcentuales de movimientos, con igual peso por escenario × ruido × muestreo. Estacionario separado; nunca dividir por cero. Peor limpio incluye aliasing de Smart Recording.\n\n| Método | MAPE movimiento % | Sesgo % | Quieto m/min | Peor limpio % | Caminata MAPE % | Fútbol MAPE % | Sensibilidad sampling % |\n|---|---:|---:|---:|---:|---:|---:|---:|\n';for(const id of chosen){const r=synthetic.summary.find(r=>r.method===id&&r.split==='holdout');md+=`| ${id} | ${f(r.movingMapePct)} | ${f(r.movingBiasPct)} | ${f(r.stationaryMPerMin)} | ${f(r.cleanWorstMapePct)} | ${f(r.slowMapePct)} | ${f(r.footballMapePct)} | ${f(r.samplingDeltaPct)} |\n`;}
md+='\n## Geometría del FIT completo\n\nDesviación temporal respecto al GPS original, que contiene ruido; no es error respecto a trayectoria física. Giros ≥45°, lados ≥0.25 m; correspondencia uno a uno ±2 s y ±30°.\n\n| Método | Dispositivo | RMS m | Máximo m | Giros conservados % | P10 retención local 10s |\n|---|---|---:|---:|---:|---:|\n';for(const id of chosen)for(const r of geometryRows.filter(r=>r.method===id))md+=`| ${id} | ${r.device} | ${f(r.positionRmsM)} | ${f(r.maxTimeAlignedDisplacementM)} | ${f(r.turnRetentionPct)} | ${f(r.local10sRetentionP10)} |\n`;
md+='\n## COROS downsampling, fase 0\n\n| Sampling | Método | Distancia m | Δ original % |\n|---|---|---:|---:|\n';for(const r of sampling.filter(r=>r.phaseSec===0&&['raw','temporal-3s','rdp-1m','anchor-1.5m','multiscale-0.01'].includes(r.method)))md+=`| ${r.sampling} | ${r.method} | ${f(r.distanceM)} | ${f(r.deltaPct)} |\n`;
await fs.writeFile(path.join(dir,'RESULTS.md'),md);
console.log(JSON.stringify({methods:methods.length,syntheticCells:synthetic.rows.length,commonStart,commonEnd,supportSec,devices:devices.map(d=>({name:d.name,...d.meta})),summary:realSummary.filter(r=>chosen.includes(r.method)),syntheticTop:synthetic.summary.filter(r=>r.split==='train').sort((a,b)=>a.score-b.score).slice(0,5),eligible:synthetic.summary.filter(r=>r.split==='holdout'&&r.eligible).map(r=>r.method)},null,2));
