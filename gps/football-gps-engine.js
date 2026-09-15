/** Patxanguilles Football GPS Engine - manufacturer-independent FIT normalization. */
export const GPS_ENGINE_VERSION='1.1';

export const GPS_ENGINE_CONFIG=Object.freeze({
  // Dense football tracks normally record each second. Both distribution and gaps are checked.
  denseGpsMedianIntervalSec:1.5,denseIntervalMaxSec:2,denseIntervalRatio:0.7,
  smartRecordingMedianIntervalSec:2,smartRecordingIrregularRatio:0.1,largeGapSec:4,
  // 13 m/s leaves room for elite football sprints while identifying implausible GPS jumps.
  impossibleSpeedMps:13,teleportReturnRadiusM:12,teleportMinDistanceM:35,
  // Stationary drift is reduced only when a multi-sample window has little net progress.
  jitterWindowSec:6,jitterMaxNetM:2.5,jitterMaxRatio:0.28,jitterMaxSpreadM:4,
  interpolationMaxGapSec:2.5,minimumPeakCoverage:0.9,
  corosDistanceCalibrationFactor:1.032
});

// FIT SDK product ids exposed by fit-file-parser without a product_name.
const GARMIN_PRODUCT_NAMES=Object.freeze({4432:'Forerunner 165'});

const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const value=v=>finite(v)?Number(v):null;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const median=a=>{const x=a.filter(finite).map(Number).sort((p,q)=>p-q);if(!x.length)return null;const m=Math.floor(x.length/2);return x.length%2?x[m]:(x[m-1]+x[m])/2};
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
const percentile=(a,q)=>{const x=a.filter(finite).map(Number).sort((p,q)=>p-q);if(!x.length)return null;const p=clamp(q,0,1)*(x.length-1),lo=Math.floor(p),hi=Math.ceil(p);return x[lo]+(x[hi]-x[lo])*(p-lo)};

export function haversineMeters(a,b){
  if(!a||!b||!finite(a.lat)||!finite(a.lon)||!finite(b.lat)||!finite(b.lon))return 0;
  const R=6371000,r=Math.PI/180,dLat=(Number(b.lat)-Number(a.lat))*r,dLon=(Number(b.lon)-Number(a.lon))*r;
  const q=Math.sin(dLat/2)**2+Math.cos(Number(a.lat)*r)*Math.cos(Number(b.lat)*r)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.min(1,Math.sqrt(q)));
}

function normalizedCoordinate(v,latitude){
  const n=value(v);if(n==null)return null;const limit=latitude?90:180;
  if(Math.abs(n)<=limit)return n;
  const degrees=n*(180/2**31);return Math.abs(degrees)<=limit?degrees:null;
}

function flattenMetadata(root,out=[],depth=0,seen=new Set()){
  if(root==null||depth>5||seen.has(root))return out;
  if(typeof root!=='object')return out;seen.add(root);
  for(const [key,v] of Object.entries(root)){
    if(/^(records|sessions|laps)$/i.test(key))continue;
    if(v!=null&&typeof v==='object')flattenMetadata(v,out,depth+1,seen);
    else if(/manufacturer|product|garmin_product|device|software_version|serial_number/i.test(key))out.push([key,v]);
  }return out;
}

export function detectFitDevice(parsed={}){
  const entries=flattenMetadata(parsed),text=entries.map(([k,v])=>`${k}:${v}`).join(' ').toLowerCase();
  const known=['coros','garmin','polar','suunto','wahoo','amazfit','apple'];
  let manufacturer=known.find(x=>text.includes(x))||null;
  if(!manufacturer){const raw=entries.find(([k])=>/^manufacturer$/i.test(k))?.[1];if(typeof raw==='string'&&raw.trim())manufacturer=raw.trim().toLowerCase()}
  const productEntry=entries.find(([k,v])=>/^(product_name|product|garmin_product)$/i.test(k)&&typeof v==='string'&&v.trim()),productId=value(entries.find(([k])=>/^(product|garmin_product)$/i.test(k))?.[1]);
  const resolved=productEntry?String(productEntry[1]).trim():(manufacturer==='garmin'&&productId!=null?GARMIN_PRODUCT_NAMES[productId]||null:null);
  return{manufacturer,product:resolved,productId,detected:!!manufacturer,confidence:manufacturer&&resolved?'high':manufacturer?'medium':'low'};
}

export function inspectRecordingQuality(records=[]){
  const gps=records.filter(r=>finite(r.tSec)&&finite(r.lat)&&finite(r.lon)),intervals=[];
  for(let i=1;i<gps.length;i++){const dt=Number(gps[i].tSec)-Number(gps[i-1].tSec);if(dt>0)intervals.push(dt)}
  const med=median(intervals),avg=mean(intervals),p95=percentile(intervals,.95),max=intervals.length?Math.max(...intervals):null;
  const near=intervals.length?intervals.filter(x=>x<=GPS_ENGINE_CONFIG.denseIntervalMaxSec).length/intervals.length:0;
  const irregular=intervals.length?intervals.filter(x=>x>=GPS_ENGINE_CONFIG.largeGapSec).length/intervals.length:0;
  const dense=gps.length>=8&&med!=null&&med<=GPS_ENGINE_CONFIG.denseGpsMedianIntervalSec&&near>=GPS_ENGINE_CONFIG.denseIntervalRatio&&irregular<.08;
  const smart=gps.length>=4&&!dense&&(med>=GPS_ENGINE_CONFIG.smartRecordingMedianIntervalSec&&p95>=3||irregular>=GPS_ENGINE_CONFIG.smartRecordingIrregularRatio||near<.5);
  return{recordCount:records.length,gpsPointCount:gps.length,medianSampleInterval:med,meanSampleInterval:avg,p95SampleInterval:p95,maxGap:max,oneToTwoSecondRatio:near,largeGapRatio:irregular,denseGps:dense,irregularSampling:!dense&&(irregular>.05||(p95!=null&&med!=null&&p95>med*2.5)),probableSmartRecording:smart};
}

function removeTeleports(points){
  const keep=Array(points.length).fill(true);let removed=0;
  for(let i=1;i<points.length-1;i++){
    const a=points[i-1],b=points[i],c=points[i+1],ab=haversineMeters(a,b),bc=haversineMeters(b,c),ac=haversineMeters(a,c),dt1=b.tSec-a.tSec,dt2=c.tSec-b.tSec;
    const jump=dt1>0&&ab/dt1>GPS_ENGINE_CONFIG.impossibleSpeedMps,returning=dt2>0&&bc/dt2>GPS_ENGINE_CONFIG.impossibleSpeedMps&&ac<=GPS_ENGINE_CONFIG.teleportReturnRadiusM;
    if(ab>=GPS_ENGINE_CONFIG.teleportMinDistanceM&&jump&&returning){keep[i]=false;removed++}
  }
  return{points:points.filter((_,i)=>keep[i]),removed};
}

function markJitter(points,segments){
  let ignored=0,left=0;
  for(let right=0;right<points.length;right++){
    while(points[right].tSec-points[left].tSec>GPS_ENGINE_CONFIG.jitterWindowSec&&left<right)left++;
    if(right-left<3)continue;let path=0,spread=0;
    for(let i=left+1;i<=right;i++)path+=segments[i].rawDistanceM;
    for(let i=left;i<=right;i++)spread=Math.max(spread,haversineMeters(points[left],points[i]));
    const net=haversineMeters(points[left],points[right]),ratio=path>0?net/path:1;
    if(path>0&&net<=GPS_ENGINE_CONFIG.jitterMaxNetM&&ratio<=GPS_ENGINE_CONFIG.jitterMaxRatio&&spread<=GPS_ENGINE_CONFIG.jitterMaxSpreadM){
      for(let i=left+1;i<=right;i++)if(!segments[i].jitter){segments[i].jitter=true;ignored+=segments[i].rawDistanceM}
    }
  }return ignored;
}

function missingCoordinateDiagnostics(records){
  let missingCoordinateRecords=0,missingCoordinateIntervals=0,missingCoordinateDurationSec=0,inGap=false;
  for(let i=0;i<records.length;i++){
    const missing=!finite(records[i].lat)||!finite(records[i].lon);
    if(missing){missingCoordinateRecords++;if(!inGap){missingCoordinateIntervals++;inGap=true}if(i>0)missingCoordinateDurationSec+=Math.max(0,Number(records[i].tSec)-Number(records[i-1].tSec))}
    else inGap=false;
  }
  return{missingCoordinateRecords,missingCoordinateIntervals,missingCoordinateDurationSec};
}

function cumulativeAt(points,segments,t){
  if(t<points[0].tSec||t>points.at(-1).tSec)return null;let lo=0,hi=points.length-1;
  while(lo+1<hi){const m=(lo+hi)>>1;if(points[m].tSec<=t)lo=m;else hi=m}
  if(points[hi]?.tSec===t)return segments[hi].cumulativeM;
  const a=points[lo],b=points[lo+1],dt=b.tSec-a.tSec;if(!(dt>0&&dt<=GPS_ENGINE_CONFIG.interpolationMaxGapSec))return null;
  return segments[lo].cumulativeM+(segments[lo+1].distanceM||0)*((t-a.tSec)/dt);
}

export function calculatePeakSpeedWindow(points,segments,durationSec){
  if(points.length<2)return{speedMps:null,tSec:null};let best=null;
  for(let i=0;i<points.length;i++){const p=points[i],end=p.tSec+durationSec;if(end>points.at(-1).tSec)break;let gap=false;
    for(let j=i+1;j<points.length&&points[j-1].tSec<end;j++)if(segments[j].dt>GPS_ENGINE_CONFIG.interpolationMaxGapSec){gap=true;break}
    if(gap)continue;const a=cumulativeAt(points,segments,p.tSec),b=cumulativeAt(points,segments,end);if(a==null||b==null)continue;const speed=(b-a)/durationSec;if(!best||speed>best.speedMps)best={speedMps:speed,tSec:p.tSec}}
  return best||{speedMps:null,tSec:null};
}

// First paired-activity calibration; only the selected total for a valid COROS dense profile.
export function calibrateSelectedDistanceMeters(distanceMeters,device,recordingProfile){
  if(!Number.isFinite(distanceMeters))return distanceMeters;
  const coros=String(device?.manufacturer||'').trim().toLowerCase()==='coros';
  return coros&&recordingProfile==='dense-gps'
    ?distanceMeters*GPS_ENGINE_CONFIG.corosDistanceCalibrationFactor
    :distanceMeters;
}

export function normalizeFitActivity(rawRecords=[],metadata={}){
  const records=rawRecords.map((r,i)=>({...r,_rawIndex:i,lat:normalizedCoordinate(r.lat??r.position_lat,true),lon:normalizedCoordinate(r.lon??r.position_long,false)}));
  const device=detectFitDevice(metadata),recording=inspectRecordingQuality(records),valid=records.filter(r=>finite(r.tSec)&&finite(r.lat)&&finite(r.lon)&&r.lat>=-90&&r.lat<=90&&r.lon>=-180&&r.lon<=180);
  const uncleanGpsDistance=valid.slice(1).reduce((sum,p,i)=>sum+haversineMeters(valid[i],p),0),cleaned=removeTeleports(valid),points=cleaned.points,segments=points.map((p,i)=>({distanceM:0,rawDistanceM:0,cumulativeM:0,jitter:false,dt:i?p.tSec-points[i-1].tSec:0}));
  for(let i=1;i<points.length;i++){const d=haversineMeters(points[i-1],points[i]);segments[i].rawDistanceM=d;segments[i].distanceM=d}
  const possibleJitterMeters=recording.denseGps?markJitter(points,segments):0;
  for(let i=1;i<segments.length;i++){if(segments[i].jitter)segments[i].distanceM=0;segments[i].cumulativeM=segments[i-1].cumulativeM+segments[i].distanceM}
  const peak3=recording.denseGps?calculatePeakSpeedWindow(points,segments,3):{speedMps:null,tSec:null},peak5=recording.denseGps?calculatePeakSpeedWindow(points,segments,5):{speedMps:null,tSec:null};
  const speedFilteredDistance=segments.at(-1)?.cumulativeM??null,rawDistance=segments.reduce((s,x)=>s+x.rawDistanceM,0),removedDefiniteErrorMeters=Math.max(0,uncleanGpsDistance-rawDistance),missing=missingCoordinateDiagnostics(records);
  let profile=recording.denseGps?'dense-gps':recording.probableSmartRecording?'smart-recording':points.length?'sparse-gps':'generic';
  const byIndex=new Map(points.map((p,i)=>[p._rawIndex,{point:p,segment:segments[i]}]));
  const normalizedRecords=records.map(r=>{const hit=byIndex.get(r._rawIndex);if(!hit)return{...r,_rejectedGps:true};const s=hit.segment,dt=s.dt;return{...r,dInc:s.distanceM,gpsSpeedKmh:dt>0&&dt<=GPS_ENGINE_CONFIG.interpolationMaxGapSec?s.distanceM/dt*3.6:null,_jitter:s.jitter}}).filter(r=>!r._rejectedGps||!finite(r.lat)||!finite(r.lon));
  const fitDistance=records.map(r=>value(r.distance)).filter(finite),recordDistance=fitDistance.length>1&&fitDistance.at(-1)>=fitDistance[0]?fitDistance.at(-1)-fitDistance[0]:null,session=Array.isArray(metadata?.sessions)?metadata.sessions[0]:null,sessionDistance=value(session?.total_distance),fitDistanceMeters=sessionDistance??recordDistance;
  const fitSpeeds=records.map(r=>value(r.enhancedSpeedKmh??r.fitSpeedKmh??r.speedKmh)).filter(v=>v!=null&&v>=0&&v<=45);
  const sessionEnhancedMax=value(session?.enhanced_max_speed),sessionMax=value(session?.max_speed),fitMaxSpeedKmh=sessionEnhancedMax??sessionMax??(fitSpeeds.length?Math.max(...fitSpeeds):null);
  // Distance deliberately uses only the valid, teleport-cleaned GPS path. Possible jitter
  // remains informational so short football movements cannot be removed speculatively.
  const selectedDistanceMeters=recording.denseGps&&rawDistance!=null?rawDistance:fitDistanceMeters;
  const distanceMeters=calibrateSelectedDistanceMeters(selectedDistanceMeters,device,profile);
  const maxSpeed3sMps=peak3.speedMps??(fitMaxSpeedKmh!=null?fitMaxSpeedKmh/3.6:null),hasEnhanced=sessionEnhancedMax!=null||records.some(r=>finite(r.enhancedSpeedKmh));
  return{version:GPS_ENGINE_VERSION,device,recording:{...recording,profile},metrics:{distanceMeters,maxSpeed3sMps,maxSpeed5sMps:peak5.speedMps,peak3sAtSec:peak3.tSec,peak5sAtSec:peak5.tSec,rawFitDistanceMeters:fitDistanceMeters,rawFitMaxSpeedKmh:fitMaxSpeedKmh,distanceSource:recording.denseGps?'gps-clean':fitDistanceMeters!=null?'fit-distance':'fallback',maxSpeedSource:peak3.speedMps!=null?'gps-3s':fitMaxSpeedKmh!=null?(hasEnhanced?'enhanced-speed':'speed'):'fallback',confidence:recording.denseGps?'high':fitMaxSpeedKmh!=null?'medium':'low'},track:points,visualTrack:points,distanceTrack:points,records:normalizedRecords,diagnostics:{rawPoints:rawRecords.length,validPoints:points.length,removedOutliers:cleaned.removed,definiteGpsErrors:cleaned.removed,removedDefiniteErrorMeters,possibleJitterSegments:segments.filter(s=>s.jitter).length,possibleJitterMeters,rawGpsDistanceMeters:uncleanGpsDistance,gpsCleanDistanceMeters:rawDistance,normalizedDistanceMeters:distanceMeters,speedFilteredDistanceMeters:speedFilteredDistance,...missing}};
}
