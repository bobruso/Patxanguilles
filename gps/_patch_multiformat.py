from pathlib import Path
import re

p=Path('gps/fit-analysis.js')
s=p.read_text()
start=s.index('export async function analyzeFit(buf,options={}){')
body_start=s.index('  for(const s of samples)if(s.speedKmh==null', start)
end_marker='\n}\n\nexport function toSupabaseRow'
end=s.index(end_marker, body_start)
body=s[body_start:end]
# Replace old analyzeFit with shared sample analyzer + slimmer FIT adapter.
prefix=s[:start]
suffix=s[end+2:]
shared="""export function analyzeSamples(samples,t0,options={}){\n  const highIntensityKmh=Number(options.highIntensityKmh)||DEFAULT_HIGH_INTENSITY_KMH,attackDirection=Number(options.attackDirection)===-1?-1:1;\n"""+body+"\n}\n\n"
fit="""export async function analyzeFit(buf,options={}){\n  const FitParser=await loadFitParser(),parser=new FitParser({mode:'list',speedUnit:'km/h',lengthUnit:'m'}),data=await parser.parseAsync(buf),records=(data.records||[]).filter(r=>toMs(r.timestamp)!=null).sort((a,b)=>toMs(a.timestamp)-toMs(b.timestamp));if(!records.length)throw new Error('El FIT no contiene registros con tiempo.');\n  const t0=toMs(records[0].timestamp),samples=records.map((r,i)=>({tSec:(toMs(r.timestamp)-t0)/1000,dt:i?Math.max(0,Math.min(8,(toMs(r.timestamp)-toMs(records[i-1].timestamp))/1000)):0,lat:num(r.position_lat),lon:num(r.position_long),speedKmh:num(r.enhanced_speed??r.speed),distance:num(r.distance),hr:num(r.heart_rate),cadence:num(r.cadence)}));\n  const result=analyzeSamples(samples,t0,options);result.sourceFormat='fit';return result;\n}\n\n"""
s=prefix+shared+fit+suffix
# Preserve actual source format in DB.
s=s.replace("source_format:'fit'","source_format:a.sourceFormat||'fit'",1)
# Restore sourceFormat when reading saved rows.
old="const a={sourceStartedAt:row.source_started_at,"
new="const a={sourceFormat:row.source_format||'fit',sourceStartedAt:row.source_started_at,"
if old not in s: raise SystemExit('fromSupabase source target missing')
s=s.replace(old,new,1)
p.write_text(s)

# New XML adapters.
Path('gps/activity-import.js').write_text(r'''import{analyzeFit,analyzeSamples}from'./fit-analysis.js';
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const text=(el,name)=>{const n=[...el.getElementsByTagName('*')].find(x=>x.localName===name);return n?.textContent?.trim()||null};
const children=(root,name)=>[...root.getElementsByTagName('*')].filter(x=>x.localName===name);
function toMs(v){const n=new Date(v).getTime();return Number.isFinite(n)?n:null}
function normalize(records,label){records=records.filter(r=>r.ms!=null).sort((a,b)=>a.ms-b.ms);if(!records.length)throw new Error(`El ${label} no contiene puntos con tiempo.`);const t0=records[0].ms;const samples=records.map((r,i)=>({tSec:(r.ms-t0)/1000,dt:i?Math.max(0,Math.min(8,(r.ms-records[i-1].ms)/1000)):0,lat:r.lat,lon:r.lon,speedKmh:r.speedKmh,distance:r.distance,hr:r.hr,cadence:r.cadence}));return{samples,t0}}
function parseXml(xml,label){const doc=new DOMParser().parseFromString(xml,'application/xml');if(doc.querySelector('parsererror'))throw new Error(`No se pudo leer el archivo ${label}.`);return doc}
function parseGpx(xml){const doc=parseXml(xml,'GPX'),pts=children(doc,'trkpt').map(p=>{const speed=num(text(p,'speed'));return{ms:toMs(text(p,'time')),lat:num(p.getAttribute('lat')),lon:num(p.getAttribute('lon')),speedKmh:speed==null?null:speed*3.6,distance:null,hr:num(text(p,'hr')),cadence:num(text(p,'cad')??text(p,'cadence'))}});return normalize(pts,'GPX')}
function parseTcx(xml){const doc=parseXml(xml,'TCX'),pts=children(doc,'Trackpoint').map(p=>{const pos=children(p,'Position')[0],lat=pos?num(text(pos,'LatitudeDegrees')):null,lon=pos?num(text(pos,'LongitudeDegrees')):null;let speed=num(text(p,'Speed'));if(speed!=null)speed*=3.6;return{ms:toMs(text(p,'Time')),lat,lon,speedKmh:speed,distance:num(text(p,'DistanceMeters')),hr:num(text(p,'Value')),cadence:num(text(p,'Cadence'))}});return normalize(pts,'TCX')}
export function detectActivityFormat(file){const n=String(file?.name||'').toLowerCase();if(n.endsWith('.fit'))return'fit';if(n.endsWith('.gpx'))return'gpx';if(n.endsWith('.tcx'))return'tcx';return null}
export async function analyzeActivityFile(file,options={}){const format=detectActivityFormat(file);if(!format)throw new Error('Formato no compatible. Usa FIT, GPX o TCX.');if(format==='fit'){const a=await analyzeFit(await file.arrayBuffer(),options);a.sourceFormat='fit';return a}const xml=await file.text(),parsed=format==='gpx'?parseGpx(xml):parseTcx(xml),a=analyzeSamples(parsed.samples,parsed.t0,options);a.sourceFormat=format;return a}
''')

# Update upload UI / imports.
p=Path('gps-upload.html');s=p.read_text()
s=s.replace('Importar archivo .FIT','Importar actividad GPS')
s=s.replace('Archivo FIT <input id="fit" type="file" accept=".fit,application/octet-stream">','Archivo <input id="fit" type="file" accept=".fit,.gpx,.tcx,application/octet-stream,application/gpx+xml,application/vnd.garmin.tcx+xml">')
s=s.replace("import{analyzeFit,toSupabaseRow,setAttackDirection}from'./gps/fit-analysis.js';import{mountPlayerGpsPanel}from'./gps/player-gps-panel.js';","import{toSupabaseRow,setAttackDirection}from'./gps/fit-analysis.js';import{analyzeActivityFile,detectActivityFormat}from'./gps/activity-import.js';import{mountPlayerGpsPanel}from'./gps/player-gps-panel.js';")
s=s.replace("latestBuffer=null,","")
s=s.replace("latestBuffer=await f.arrayBuffer();analyzedPlayerId=$('player').value;latest=await analyzeFit(latestBuffer,baseOptions());renderAnalysis()","analyzedPlayerId=$('player').value;latest=await analyzeActivityFile(f,baseOptions());renderAnalysis()")
s=s.replace("if(!f)return $('status').textContent='Selecciona un .fit'","if(!f)return $('status').textContent='Selecciona un archivo FIT, GPX o TCX'")
s=s.replace("$('status').textContent='Analizando…'","$('status').textContent=`Analizando ${String(detectActivityFormat(f)||'archivo').toUpperCase()}…`")
s=s.replace('El archivo se analiza localmente. Se guardan métricas y posiciones normalizadas, nunca las coordenadas GPS originales ni el FIT.','El archivo se analiza localmente. Admite FIT, GPX y TCX. Se guardan métricas y posiciones normalizadas, nunca las coordenadas GPS originales ni el archivo original.')
p.write_text(s)
