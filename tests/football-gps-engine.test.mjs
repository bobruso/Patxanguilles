import assert from'node:assert/strict';
import{haversineMeters,inspectRecordingQuality,normalizeFitActivity}from'../gps/football-gps-engine.js';

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

const empty=normalizeFitActivity([],{});
assert.equal(empty.metrics.distanceMeters,null);
assert.equal(empty.recording.profile,'generic');

console.log('Patxanguilles Football GPS Engine: 8 cases, 14 assertions passed');
