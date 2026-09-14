import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { Decoder, Stream, Profile } from '@garmin/fitsdk';

export const finite = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
export async function parserClass() {
  for (const location of ['fit-file-parser', pathToFileURL(path.join(os.tmpdir(), 'patx-fit-validation/node_modules/fit-file-parser/dist/fit-parser.js')).href]) {
    try { const m = await import(location); return m.default?.default || m.default; } catch {}
  }
  throw new Error('Install fit-file-parser@5.0.2 in this directory (npm install), or in TEMP/patx-fit-validation.');
}

// Inventory serialized fields, including unknown/developer fields which a semantic parser may omit.
// Does not export payload values, locations, serial numbers or absolute timestamps.
export function binaryInventory(b) {
  if (b.toString('ascii', 8, 12) !== '.FIT') throw new Error('Invalid FIT signature');
  let p = b[0]; const end = p + b.readUInt32LE(4), defs = new Map(), inventory = {};
  const need = n => { if (p + n > end || end > b.length) throw new Error('Truncated FIT'); };
  while (p < end) {
    need(1); const h = b[p++], compressed = !!(h & 128), local = compressed ? (h >> 5) & 3 : h & 15;
    if (!compressed && (h & 64)) {
      need(5); p++; const big = b[p++] === 1, global = big ? b.readUInt16BE(p) : b.readUInt16LE(p); p += 2;
      const count = b[p++], fields = []; need(count * 3);
      for (let i = 0; i < count; i++) { fields.push({ id: b[p], size: b[p+1], base: b[p+2] }); p += 3; }
      const developer = [];
      if (h & 32) { need(1); const n = b[p++]; need(n*3); for (let i=0;i<n;i++) { developer.push({ id:b[p],size:b[p+1],index:b[p+2] }); p+=3; } }
      defs.set(local, { global, fields, developer });
    } else {
      const d = defs.get(local); if (!d) throw new Error('Undefined local FIT message');
      const entry = inventory[d.global] ||= { count:0, fields:{}, developerFields:{} }; entry.count++;
      for (const f of d.fields) {
        const key = String(f.id); entry.fields[key] = (entry.fields[key] || 0) + 1;
        if (!(compressed && f.id === 253)) { need(f.size); p += f.size; }
      }
      for (const f of d.developer) { const key=`${f.index}:${f.id}`; entry.developerFields[key]=(entry.developerFields[key]||0)+1; need(f.size);p+=f.size; }
    }
  }
  if (p !== end) throw new Error('FIT payload size mismatch');
  return inventory;
}

export async function readFit(file) {
  const b = await fs.readFile(file), Parser = await parserClass();
  const data = await new Parser({ force:false, mode:'list', speedUnit:'m/s', lengthUnit:'m' }).parseAsync(b);
  const original = (data.records || []).filter(r => r.timestamp != null && Number.isFinite(+new Date(r.timestamp)));
  const sorted = [...original].sort((a,b) => +new Date(a.timestamp) - +new Date(b.timestamp));
  const records = sorted.map(r => ({ t:+new Date(r.timestamp)/1000,
    lat:finite(r.position_lat)?Number(r.position_lat):null, lon:finite(r.position_long)?Number(r.position_long):null,
    speed:finite(r.enhanced_speed ?? r.speed)?Number(r.enhanced_speed ?? r.speed):null,
    cadence:finite(r.cadence)?Number(r.cadence):null, fit:finite(r.distance)?Number(r.distance):null }));
  const decoder=new Decoder(Stream.fromBuffer(b)),integrity=decoder.checkIntegrity();
  const {messages,errors}=decoder.read({includeUnknownData:true,expandComponents:false,expandSubFields:false,mergeHeartRates:false});
  if(!integrity||errors.length)throw new Error('Official SDK integrity/decode failure');
  const official=messages.recordMesgs||[];
  if(official.length!==records.length)throw new Error('FIT parser record-count disagreement');
  let maxPositionDifferenceDegrees=0,maxSpeedDifferenceMps=0,maxDistanceDifferenceM=0;
  official.forEach((p,i)=>{const r=records[i];if(+new Date(p.timestamp)/1000!==r.t)throw new Error('Timestamp disagreement');
    for(const [k,v] of [['positionLat',r.lat],['positionLong',r.lon]]){if((p[k]!=null)!==(v!=null))throw new Error('Coordinate availability disagreement');if(v!=null)maxPositionDifferenceDegrees=Math.max(maxPositionDifferenceDegrees,Math.abs(p[k]*180/2**31-v));}
    const s=p.enhancedSpeed??p.speed;if((s!=null)!==(r.speed!=null))throw new Error('Speed availability disagreement');if(s!=null)maxSpeedDifferenceMps=Math.max(maxSpeedDifferenceMps,Math.abs(s-r.speed));
    if((p.distance!=null)!==(r.fit!=null))throw new Error('Distance availability disagreement');if(p.distance!=null)maxDistanceDifferenceM=Math.max(maxDistanceDifferenceM,Math.abs(p.distance-r.fit));
  });
  if(maxPositionDifferenceDegrees>1e-9||maxSpeedDifferenceMps>1e-9||maxDistanceDifferenceM>1e-9)throw new Error('Semantic parser disagreement');
  const officialGroups=Object.fromEntries(Object.entries(messages).map(([k,rows])=>[k,{count:rows.length,fields:Object.fromEntries([...new Set(rows.flatMap(r=>Object.keys(r)))].map(key=>[key,rows.filter(r=>r[key]!=null).length]))}]));
  const fields = {};
  for (const [group, value] of Object.entries(data)) {
    const rows = Array.isArray(value) ? value : value && typeof value === 'object' ? [value] : [];
    if (!rows.length) continue;
    const counts = {};
    for (const r of rows) for (const [k,v] of Object.entries(r)) {
      const c=counts[k] ||= {present:0, finite:0, zero:0}; c.present++;
      if (finite(v) && typeof v !== 'object') { c.finite++; if (+v===0)c.zero++; }
    }
    fields[group] = {count:rows.length, fields:counts};
  }
  return { records, data, inventory: { file:path.basename(file), sha256:createHash('sha256').update(b).digest('hex'), bytes:b.length,
    discardedTimestampRecords:(data.records||[]).length-original.length,
    officialSdk:{version:'21.214.0',profile:Profile.version,integrity,errors:errors.length,recordsCompared:official.length,maxPositionDifferenceDegrees,maxSpeedDifferenceMps,maxDistanceDifferenceM,groups:officialGroups},
    nonIncreasingTimestamps:records.filter((r,i)=>i&&r.t<=records[i-1].t).length,
    fields, binary:binaryInventory(b) } };
}

export function project(records, origin) {
  const rad=Math.PI/180, R=6371000;
  return records.map(p => ({...p, x: p.lon==null?null:R*(p.lon-origin.lon)*rad*Math.cos(origin.lat*rad),
    y:p.lat==null?null:R*(p.lat-origin.lat)*rad }));
}

export async function csv(file, rows) {
  if (!rows.length) return;
  const keys=Object.keys(rows[0]), quote=v=>'"'+String(v == null ? '' : typeof v==='object'?JSON.stringify(v):v).replaceAll('"','""')+'"';
  await fs.writeFile(file, [keys.map(quote).join(','), ...rows.map(r=>keys.map(k=>quote(r[k])).join(','))].join('\n')+'\n');
}
