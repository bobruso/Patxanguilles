import assert from'node:assert/strict';
import fs from'node:fs/promises';
import os from'node:os';
import path from'node:path';
import{pathToFileURL}from'node:url';
import{GPS_ENGINE_CONFIG,normalizeFitActivity}from'../gps/football-gps-engine.js';

const parserModule=await import(pathToFileURL(path.join(os.tmpdir(),'patx-fit-validation','node_modules','fit-file-parser','dist','fit-parser.js')));
const FitParser=parserModule.default;
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const toMs=v=>new Date(v).getTime();
const near=(actual,expected,tolerance,label)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${label}: ${actual}`);
async function analyze(file){
  const parser=new FitParser({mode:'list',speedUnit:'km/h',lengthUnit:'m'}),buffer=await fs.readFile(file),data=await parser.parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength));
  const records=data.records.filter(r=>Number.isFinite(toMs(r.timestamp))).sort((a,b)=>toMs(a.timestamp)-toMs(b.timestamp)),t0=toMs(records[0].timestamp);
  const raw=records.map(r=>({tSec:(toMs(r.timestamp)-t0)/1000,lat:finite(r.position_lat)?Number(r.position_lat):null,lon:finite(r.position_long)?Number(r.position_long):null,speedKmh:finite(r.enhanced_speed??r.speed)?Number(r.enhanced_speed??r.speed):null,enhancedSpeedKmh:finite(r.enhanced_speed)?Number(r.enhanced_speed):null,fitSpeedKmh:finite(r.speed)?Number(r.speed):null,distance:finite(r.distance)?Number(r.distance):null}));
  return normalizeFitActivity(raw,data);
}

const coros=await analyze(path.resolve('tests/COROS_PACE_4.FIT'));
assert.equal(coros.device.manufacturer,'coros');
assert.equal(coros.device.product,'COROS PACE 4');
assert.equal(coros.recording.profile,'dense-gps');
assert.equal(coros.metrics.distanceSource,'gps-clean');
near(coros.diagnostics.gpsCleanDistanceMeters,1278.57,.15,'COROS base distance');
assert.ok(coros.diagnostics.possibleJitterMeters>80);
assert.ok(Math.abs(coros.metrics.distanceMeters-coros.diagnostics.gpsCleanDistanceMeters*GPS_ENGINE_CONFIG.corosDistanceCalibrationFactor)<.001);
near(coros.metrics.distanceMeters,1319.5,.2,'COROS final distance');
near(coros.metrics.maxSpeed3sMps*3.6,28.96,.2,'COROS speed unchanged');
assert.ok(coros.metrics.maxSpeed3sMps*3.6>27.5&&coros.metrics.maxSpeed3sMps*3.6<30.5);
assert.ok(coros.metrics.maxSpeed5sMps*3.6>24&&coros.metrics.maxSpeed5sMps*3.6<27.5);

const garmin=await analyze(path.resolve('tests/GARMIN_FORERUNNER_165.fit'));
assert.equal(garmin.device.manufacturer,'garmin');
assert.equal(garmin.device.product,'Forerunner 165');
assert.equal(garmin.recording.profile,'smart-recording');
assert.equal(garmin.metrics.distanceSource,'fit-distance');
near(garmin.metrics.distanceMeters,1359.71,.05,'Garmin final distance unchanged');
near(garmin.metrics.maxSpeed3sMps*3.6,29.33,.2,'Garmin speed unchanged');
assert.equal(garmin.metrics.distanceMeters,garmin.metrics.rawFitDistanceMeters);
assert.equal(coros.diagnostics.normalizedDistanceMeters,coros.metrics.distanceMeters);
assert.ok(!Object.keys(coros.metrics).some(k=>/calibrat|compens|correct|factor|before|after/i.test(k)));
assert.ok(!Object.keys(coros.diagnostics).some(k=>/calibrat|compens|correct|factor|before|after/i.test(k)));
assert.equal(garmin.metrics.maxSpeedSource,'enhanced-speed');
assert.notEqual(garmin.metrics.maxSpeedSource,'gps-3s');
assert.ok(garmin.metrics.maxSpeed3sMps*3.6>28.8&&garmin.metrics.maxSpeed3sMps*3.6<29.8);

console.log('Real FIT regression and distance calibration: passed');
