import assert from'node:assert/strict';
import{GPS_ENGINE_CONFIG,calibrateSelectedDistanceMeters,haversineMeters,inspectRecordingQuality,normalizeFitActivity}from'../gps/football-gps-engine.js';
import{analyzeSamples,toSupabaseRow}from'../gps/fit-analysis.js';
import{playerGpsPanelHtml}from'../gps/player-gps-panel.js';

const origin={lat:39.47,lon:-0.376};
const north=(meters,t)=>({tSec:t,lat:origin.lat+meters/111320,lon:origin.lon,distance:null,speedKmh:null});
const close=(actual,expected,tolerance,message)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${message}: ${actual}`);

assert.equal(haversineMeters(origin,origin),0,'identical coordinates');
close(haversineMeters(origin,north(100,1)),100,1,'known 100 m displacement');

const slow=Array.from({length:11},(_,i)=>north(i,i));
const slowResult=normalizeFitActivity(slow,{});
assert.equal(slowResult.recording.denseGps,true);
close(slowResult.metrics.distanceMeters,10,1,'persistent slow movement must remain');

const jitterOffsets=[[0,0],[.7,.2],[-.5,.4],[.4,-.5],[-.4,-.3],[.3,.2],[-.6,.1],[.5,-.2],[0,0]];
const jitter=jitterOffsets.map(([n,e],i)=>({tSec:i,lat:origin.lat+n/111320,lon:origin.lon+e/(111320*Math.cos(origin.lat*Math.PI/180))}));
const jitterResult=normalizeFitActivity(jitter,{});
close(jitterResult.metrics.distanceMeters,jitterResult.diagnostics.gpsCleanDistanceMeters,.001,'possible jitter must remain in distance');
assert.ok(jitterResult.diagnostics.possibleJitterMeters>0,'possible jitter diagnostics');

const sprint=Array.from({length:9},(_,i)=>north(i*8,i));
const sprintResult=normalizeFitActivity(sprint,{});
close(sprintResult.metrics.maxSpeed3sMps,8,.2,'3 second sprint');

const calibrationTrack=Array.from({length:101},(_,i)=>north(i*10,i));
assert.equal(calibrateSelectedDistanceMeters(1000,{manufacturer:'COROS'},'dense-gps'),1032);
assert.equal(calibrateSelectedDistanceMeters(1000,{manufacturer:'garmin'},'dense-gps'),1000);
for(const manufacturer of ['polar','suunto','apple','amazfit',null])assert.equal(calibrateSelectedDistanceMeters(1000,{manufacturer},'dense-gps'),1000);
assert.equal(calibrateSelectedDistanceMeters(1000,{manufacturer:'coros'},'smart-recording'),1000);
assert.equal(calibrateSelectedDistanceMeters(null,{manufacturer:'coros'},'dense-gps'),null);
const corosDense=normalizeFitActivity(calibrationTrack,{file_ids:[{manufacturer:'coros'}]});
const garminDense=normalizeFitActivity(calibrationTrack,{file_ids:[{manufacturer:'garmin'}]});
assert.equal(corosDense.recording.profile,'dense-gps');
assert.equal(garminDense.recording.profile,'dense-gps');
close(corosDense.metrics.distanceMeters,corosDense.diagnostics.gpsCleanDistanceMeters*GPS_ENGINE_CONFIG.corosDistanceCalibrationFactor,.001,'COROS dense calibration after distance selection');
close(garminDense.metrics.distanceMeters,garminDense.diagnostics.gpsCleanDistanceMeters,.001,'Garmin dense distance unchanged');
assert.equal(corosDense.metrics.maxSpeed3sMps,garminDense.metrics.maxSpeed3sMps,'calibration cannot change speed');
const corosSamples=corosDense.records.map((r,i,a)=>({...r,dt:i?r.tSec-a[i-1].tSec:0,speedKmh:r.gpsSpeedKmh??r.speedKmh}));
const corosAnalysis=analyzeSamples(corosSamples,Date.UTC(2026,0,1),{gpsEngine:corosDense});
assert.equal(corosAnalysis.distanceM,corosDense.metrics.distanceMeters,'analysis receives only the final distance');
assert.equal(corosAnalysis.topSpeedKmh,corosDense.metrics.maxSpeed3sMps*3.6,'analysis speed stays tied to the original peak');
const stored=toSupabaseRow('match','player',corosAnalysis);
assert.equal(stored.distance_m,corosDense.metrics.distanceMeters,'persistence uses the final distance');
assert.ok(!Object.keys(stored.analysis_detail.gpsEngine.metrics).some(k=>/calibrat|compens|correct|factor|before|after/i.test(k)));
const panel=playerGpsPanelHtml(corosAnalysis);
assert.ok(panel.includes((corosAnalysis.distanceM/1000).toFixed(2)+' km'),'panel displays final distance');
assert.ok(!/compensation|correction|adjustment|calibraci[oó]n|compensaci[oó]n|1\.032|3,2\s*%|3\.2\s*%/i.test(panel),'panel has no calibration text');

const teleport=[north(0,0),north(1,1),north(101,2),north(2,3),north(3,4),north(4,5),north(5,6),north(6,7),north(7,8)];
const teleportResult=normalizeFitActivity(teleport,{});
assert.equal(teleportResult.diagnostics.removedOutliers,1,'out-and-back teleport removed');
assert.ok(teleportResult.metrics.distanceMeters<12,'teleport must not add 200 m');

const irregular=[0,1,5,7].map((t,i)=>north(i,t));
const quality=inspectRecordingQuality(irregular);
assert.equal(quality.denseGps,false);
assert.equal(quality.probableSmartRecording,true);
const irregularResult=normalizeFitActivity(irregular,{});
assert.equal(irregularResult.metrics.maxSpeed3sMps,null,'must not invent a sparse 3 second sprint');
const corosSmart=normalizeFitActivity(irregular,{file_ids:[{manufacturer:'coros'}],sessions:[{total_distance:1000}]});
const garminSmart=normalizeFitActivity(irregular,{file_ids:[{manufacturer:'garmin'}],sessions:[{total_distance:1000}]});
assert.equal(corosSmart.recording.profile,'smart-recording');
assert.equal(corosSmart.metrics.distanceMeters,1000,'COROS smart-recording is outside first calibration');
assert.equal(garminSmart.metrics.distanceMeters,1000,'Garmin smart-recording remains unchanged');

const empty=normalizeFitActivity([],{});
assert.equal(empty.metrics.distanceMeters,null);
assert.equal(empty.recording.profile,'generic');

console.log('Patxanguilles Football GPS Engine and internal distance calibration: passed');
