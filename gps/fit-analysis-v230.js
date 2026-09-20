import{
  analyzeSamples as baseAnalyzeSamples,
  fromSupabaseRow as baseFromSupabaseRow
}from'./fit-analysis.js?v=229-base';
import{normalizeFitActivity}from'./football-gps-engine.js';
export*from'./fit-analysis.js?v=229-base';

const FIT_CDN='https://esm.sh/fit-file-parser@5.0.2';
export const ISOLATED_SPEED_NOISE_GAP_KMH=7;
let FitParserCtor=null;
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
function toMs(ts){if(ts instanceof Date)return ts.getTime();const d=new Date(ts);return Number.isFinite(d.getTime())?d.getTime():null}
async function loadFitParser(){if(FitParserCtor)return FitParserCtor;const mod=await import(FIT_CDN);FitParserCtor=mod.default;return FitParserCtor}

export function cleanIsolatedSpeedSpike(points,{valueKey='value',timeKey='tSec',thresholdKmh=ISOLATED_SPEED_NOISE_GAP_KMH,mutate=false}={}){
  const src=mutate?(points||[]):(points||[]).map(p=>p&&typeof p==='object'?{...p}:p);
  const ranked=src.map((p,i)=>({i,value:num(p?.[valueKey])})).filter(x=>x.value!=null).sort((a,b)=>b.value-a.value);
  if(ranked.length<2)return{points:src,noise:null};
  const highest=ranked[0],second=ranked[1],gap=highest.value-second.value;
  if(!(gap>Number(thresholdKmh)))return{points:src,noise:null};
  const i=highest.i,current=src[i];let prev=null,next=null;
  for(let j=i-1;j>=0;j--)if(num(src[j]?.[valueKey])!=null){prev={point:src[j],value:Number(src[j][valueKey])};break}
  for(let j=i+1;j<src.length;j++)if(num(src[j]?.[valueKey])!=null){next={point:src[j],value:Number(src[j][valueKey])};break}
  let replacement=second.value;
  if(prev&&next){const t=num(current?.[timeKey]),t0=num(prev.point?.[timeKey]),t1=num(next.point?.[timeKey]);replacement=t!=null&&t0!=null&&t1!=null&&t1>t0?prev.value+(next.value-prev.value)*((t-t0)/(t1-t0)):(prev.value+next.value)/2}
  else if(prev)replacement=prev.value;else if(next)replacement=next.value;
  replacement=Math.min(second.value,Math.max(0,Number(replacement)||0));
  current[valueKey]=replacement;
  return{points:src,noise:{removed:true,index:i,tSec:num(current?.[timeKey]),originalKmh:highest.value,replacementKmh:replacement,secondHighestKmh:second.value,gapKmh:gap,thresholdKmh:Number(thresholdKmh)}};
}
function topSpeedPoint(points,valueKey='value'){let best=null;for(const p of points||[]){const value=num(p?.[valueKey]);if(value==null)continue;if(!best||value>best.value)best={point:p,value}}return best}
function alignAnalysisToValidatedSeries(a,fullSamples=null,noise=null,{legacyStoredSeries=false}={}){
  if(!a)return a;
  a.analysisDetail=a.analysisDetail||{};const speed=a.analysisDetail.speed||(a.analysisDetail.speed={});
  const source=Array.isArray(fullSamples)&&fullSamples.length?fullSamples:(Array.isArray(speed.speedSeries)?speed.speedSeries:null);
  const valueKey=source===fullSamples?'speedKmh':'value',top=topSpeedPoint(source,valueKey);
  if(top){
    a.topSpeedKmh=top.value;
    speed.topSpeedMethod='validated-series-peak';
    speed.topSpeedEvent={tSec:+Number(top.point?.tSec||0).toFixed(1),speedKmh:+Number(top.value).toFixed(2)};
  }
  if(noise)speed.speedNoiseFilter={...noise,legacyStoredSeries:!!legacyStoredSeries};
  return a;
}
function prepareSamples(samples,engine){
  const prepared=(samples||[]).map(s=>({...s}));
  const dense=!!engine?.recording?.denseGps;
  if(dense)for(const s of prepared)if(Number.isFinite(Number(s.gpsSpeedKmh)))s.speedKmh=Number(s.gpsSpeedKmh);
  const validation=cleanIsolatedSpeedSpike(prepared,{valueKey:'speedKmh',mutate:true});
  if(validation.noise&&dense){const s=prepared[validation.noise.index];if(s&&Number.isFinite(Number(s.gpsSpeedKmh)))s.gpsSpeedKmh=validation.noise.replacementKmh}
  return{prepared,noise:validation.noise};
}

export function analyzeSamples(samples,t0,options={}){
  const{prepared,noise}=prepareSamples(samples,options.gpsEngine||null),a=baseAnalyzeSamples(prepared,t0,options);
  return alignAnalysisToValidatedSeries(a,prepared,noise);
}
export async function analyzeFit(buf,options={}){
  const FitParser=await loadFitParser(),parser=new FitParser({mode:'list',speedUnit:'km/h',lengthUnit:'m'}),data=await parser.parseAsync(buf),records=(data.records||[]).filter(r=>toMs(r.timestamp)!=null).sort((a,b)=>toMs(a.timestamp)-toMs(b.timestamp));
  if(!records.length)throw new Error('El FIT no contiene registros con tiempo.');
  const t0=toMs(records[0].timestamp),raw=records.map((r,i)=>({tSec:(toMs(r.timestamp)-t0)/1000,dt:i?Math.max(0,Math.min(8,(toMs(r.timestamp)-toMs(records[i-1].timestamp))/1000)):0,lat:num(r.position_lat),lon:num(r.position_long),speedKmh:num(r.enhanced_speed??r.speed),enhancedSpeedKmh:num(r.enhanced_speed),fitSpeedKmh:num(r.speed),distance:num(r.distance),hr:num(r.heart_rate),cadence:num(r.cadence)})),engine=normalizeFitActivity(raw,data);
  const samples=engine.records.map((r,i,a)=>({...r,dt:i?Math.max(0,Math.min(8,Number(r.tSec)-Number(a[i-1].tSec))):0,speedKmh:engine.recording.denseGps?(r.gpsSpeedKmh??r.speedKmh):r.speedKmh}));
  if(options.debugGpsEngine)console.info('[Patxanguilles GPS Engine]',engine);
  const result=analyzeSamples(samples,t0,{...options,gpsEngine:engine});result.sourceFormat='fit';return result;
}
export function fromSupabaseRow(row){
  const a=baseFromSupabaseRow(row);if(!a)return a;
  const speed=a.analysisDetail?.speed;if(!Array.isArray(speed?.speedSeries)||speed.speedSeries.length<2)return a;
  const validated=cleanIsolatedSpeedSpike(speed.speedSeries,{valueKey:'value'});speed.speedSeries=validated.points;
  return alignAnalysisToValidatedSeries(a,null,validated.noise,{legacyStoredSeries:true});
}
function normalizedHistoricalRow(row){
  if(!row||typeof row!=='object')return row;const a=fromSupabaseRow(row);if(!a)return row;
  const clone=typeof structuredClone==='function'?structuredClone(row):JSON.parse(JSON.stringify(row));clone.top_speed_kmh=a.topSpeedKmh;clone.analysis_detail=a.analysisDetail||clone.analysis_detail||{};
  const speed=clone.analysis_detail.speed||(clone.analysis_detail.speed={});
  if(Number.isFinite(Number(a.topSpeedKmh))){if(Number.isFinite(Number(speed.smoothedTopSpeedKmh))&&!Number.isFinite(Number(speed.originalSmoothedTopSpeedKmh)))speed.originalSmoothedTopSpeedKmh=Number(speed.smoothedTopSpeedKmh);speed.smoothedTopSpeedKmh=Number(a.topSpeedKmh)}
  return clone;
}
function wrapBuilder(builder,table){
  if(!builder||typeof builder!=='object')return builder;
  return new Proxy(builder,{get(target,prop){
    if(prop==='then')return(onFulfilled,onRejected)=>target.then(res=>{if(table==='match_player_gps'&&res?.data){const data=Array.isArray(res.data)?res.data.map(normalizedHistoricalRow):normalizedHistoricalRow(res.data);res={...res,data}}return onFulfilled?onFulfilled(res):res},onRejected);
    const value=target[prop];if(typeof value!=='function')return value;
    return(...args)=>{const next=value.apply(target,args);return next&&typeof next==='object'&&typeof next.then==='function'?wrapBuilder(next,table):next};
  }});
}
export function wrapSupabaseForSpeedPolicy(sb){
  if(!sb||sb.__patxV230SpeedWrapped)return sb;
  const proxy=new Proxy(sb,{get(target,prop){if(prop==='__patxV230SpeedWrapped')return true;if(prop==='from')return table=>wrapBuilder(target.from(table),table);const value=target[prop];return typeof value==='function'?value.bind(target):value}});return proxy;
}
if(typeof window!=='undefined'&&!window.__PATX_V230_SPEED_SB_HOOK__){
  window.__PATX_V230_SPEED_SB_HOOK__=true;let stored=window.__patxGpsSupabase;
  Object.defineProperty(window,'__patxGpsSupabase',{configurable:true,get(){return stored},set(v){stored=wrapSupabaseForSpeedPolicy(v)}});
  if(stored)stored=wrapSupabaseForSpeedPolicy(stored);
}
