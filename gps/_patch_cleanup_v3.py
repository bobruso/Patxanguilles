from pathlib import Path
import re

# --- fit-analysis: relative acceleration threshold ---
p=Path('gps/fit-analysis.js'); s=p.read_text()
old="function accelEvents(samples){const sm=smooth(samples.map(s=>s.speedKmh/3.6),5),events={accelerations:[],decelerations:[]};for(let i=1;i<samples.length;i++){const dt=samples[i].dt;if(!(dt>0&&dt<=3))continue;const a=(sm[i]-sm[i-1])/dt;if(a>=2.2)events.accelerations.push({tSec:+samples[i].tSec.toFixed(1),ms2:+a.toFixed(2)});if(a<=-2.2)events.decelerations.push({tSec:+samples[i].tSec.toFixed(1),ms2:+a.toFixed(2)})}events.accelerations=events.accelerations.slice(0,80);events.decelerations=events.decelerations.slice(0,80);return events}"
new="function accelEvents(samples){const sm=smooth(samples.map(s=>s.speedKmh/3.6),5),vals=[];for(let i=1;i<samples.length;i++){const dt=samples[i].dt;if(!(dt>0&&dt<=3)){vals.push(0);continue}vals.push((sm[i]-sm[i-1])/dt)}const positive=vals.filter(v=>v>0),negative=vals.filter(v=>v<0).map(Math.abs),accelThreshold=Math.max(.5,percentile(positive,.975)||.5),decelThreshold=Math.max(.5,percentile(negative,.975)||.5);function peaks(sign,threshold){const raw=[];for(let i=2;i<vals.length-2;i++){const v=sign*vals[i];if(v<threshold)continue;if(v>=sign*vals[i-1]&&v>sign*vals[i+1])raw.push(i)}const selected=[];for(const i of raw.slice().sort((a,b)=>sign*vals[b]-sign*vals[a])){const ti=Number(samples[i+1]?.tSec)||0;if(selected.every(j=>Math.abs(ti-(Number(samples[j+1]?.tSec)||0))>=4))selected.push(i)}return selected.sort((a,b)=>a-b).slice(0,80).map(i=>({tSec:+Number(samples[i+1]?.tSec||0).toFixed(1),ms2:+vals[i].toFixed(2)}))}return{accelerations:peaks(1,accelThreshold),decelerations:peaks(-1,decelThreshold),accelThresholdMs2:+accelThreshold.toFixed(2),decelThresholdMs2:+decelThreshold.toFixed(2),model:'relative_accel_v1'}}"
if old not in s: raise SystemExit('accelEvents target missing')
s=s.replace(old,new,1)
old="accelerations:accels.accelerations,decelerations:accels.decelerations"
new="accelerations:accels.accelerations,decelerations:accels.decelerations,accelerationThresholdMs2:accels.accelThresholdMs2,decelerationThresholdMs2:accels.decelThresholdMs2,accelerationModel:accels.model"
if old not in s: raise SystemExit('accel detail target missing')
s=s.replace(old,new,1)
p.write_text(s)

# --- fatigue: require consistent capacity deterioration; density alone never diagnoses fatigue ---
p=Path('gps/fatigue-profile.js'); s=p.read_text()
s=s.replace("if(capacityDrop>=1&&(capacityMild>=2||recoveryWorse)){label='Descenso claro de intensidad';level='clear'}\n    else if(capacityMild>=1||recoveryWorse||(densityWorse&&capacitySignals.some(v=>v<.98))){label='Descenso leve de intensidad';level='mild'}","if(capacityDrop>=2&&recoveryWorse){label='Descenso claro de intensidad';level='clear'}\n    else if(capacityMild>=2&&recoveryWorse){label='Descenso leve de intensidad';level='mild'}")
p.write_text(s)

# --- fatigue panel: remove 4 top cards; keep chart/notes only ---
p=Path('gps/fatigue-panel.js'); s=p.read_text()
s=re.sub(r"\s*const cards=\[\['Velocidad alta'.*?\];\n",'\n',s,count=1)
s=s.replace("<div class=\"patx-gps-inline-metrics\">${cards.map(([label,a,b,u])=>`<div class=\"patx-gps-mini\"><span>${label}</span><strong>${fmt1(a)}${u?' '+u:''} → ${fmt1(b)}${u?' '+u:''}</strong></div>`).join('')}</div>","")
p.write_text(s)

# --- player panel labels, explanations, highlights fallback, cadence hiding ---
p=Path('gps/player-gps-panel.js'); s=p.read_text()
s=s.replace("${leyRico?'Desactivar Ley Rico':'Activar Ley Rico'}","${leyRico?'Ley Rico activada':'Ley Rico desactivada'}")
s=s.replace("MATCH HIGHLIGHTS","HIGHLIGHTS")
s=s.replace("stat('Distancia',fmtKm(a?.distanceM),'distancia total')","stat('Distancia total recorrida',fmtKm(a?.distanceM),'')")
s=s.replace("stat('Sprints relativos',String(a?.sprintCount??'—'),finite(speed.relativeSprintCutoffKmh)?`umbral individual ≈ ${Number(speed.relativeSprintCutoffKmh).toFixed(1)} km/h`:'picos de velocidad')","stat('Sprints',String(a?.sprintCount??'—'),finite(speed.relativeSprintCutoffKmh)?`umbral individual ≈ ${Number(speed.relativeSprintCutoffKmh).toFixed(1)} km/h`:'picos de velocidad')")
s=s.replace("${mini('Punta robusta',finite(speed.robustTopKmh)?Number(speed.robustTopKmh).toFixed(1)+' km/h':'—')}","${mini('Punta robusta',finite(speed.robustTopKmh)?Number(speed.robustTopKmh).toFixed(1)+' km/h':'—','Percentil alto de la velocidad suavizada; evita que un pico aislado de 1 s distorsione la lectura.')}")
s=s.replace("${mini('Esfuerzos >18',speed.absoluteSprintCount18??'—')}","${mini('Esfuerzos >18',speed.absoluteSprintCount18??'—','Tramos continuos de al menos 1 s por encima de 18 km/h.')}")
s=s.replace("${mini('Aceleraciones fuertes',speed.accelerations?.length??'—')}","${mini('Aceleraciones fuertes',speed.accelerations?.length??'—',finite(speed.accelerationThresholdMs2)?`Umbral individual ≈ ${Number(speed.accelerationThresholdMs2).toFixed(2)} m/s².`:'Umbral individual según la propia actividad.')}")
s=s.replace("${mini('Distancia / min',finite(work.distancePerMin)?Math.round(work.distancePerMin)+' m':'—')}","${mini('Distancia / min',finite(work.distancePerMin)?Math.round(work.distancePerMin)+' m':'—','Metros recorridos por cada minuto en movimiento.')}")
s=s.replace("${mini('Densidad',finite(speed.eventSummary?.densityPer10Min)?Number(speed.eventSummary.densityPer10Min).toFixed(1)+' / 10 min':'—')}","${mini('Densidad',finite(speed.eventSummary?.densityPer10Min)?Number(speed.eventSummary.densityPer10Min).toFixed(1)+' / 10 min':'—','Sprints relativos registrados por cada 10 minutos de partido.')}")
s=s.replace("${mini('Cadencia media',work.avgCadence==null?'—':work.avgCadence+' spm')}","${work.avgCadence==null?'':mini('Cadencia media',work.avgCadence+' spm','Pasos por minuto cuando el archivo aporta cadencia.')}")
s=s.replace("function stat(label,value,caption){return `<div class=\"patx-gps-stat\"><span>${label}</span><strong>${value}</strong><small>${caption}</small></div>`}function mini(label,value){return `<div class=\"patx-gps-mini\"><span>${label}</span><strong>${value}</strong></div>`}","function stat(label,value,caption){return `<div class=\"patx-gps-stat\"><span>${label}</span><strong>${value}</strong>${caption?`<small>${caption}</small>`:''}</div>`}function mini(label,value,caption=''){return `<div class=\"patx-gps-mini\"><span>${label}</span><strong>${value}</strong>${caption?`<small>${caption}</small>`:''}</div>`}")
old="function matchHighlights(a,speed){const top=speed?.topSpeedEvent||null,longest=speed?.eventSummary?.longest||null,busy=speed?.busiestBlock||null,items=[];"
new="function approximateBusiestBlock(speed,durationS){const series=(speed?.speedSeries||[]).filter(x=>finite(x.tSec)&&finite(x.value));if(series.length<2)return null;const duration=Number(durationS)||Number(series.at(-1).tSec)||0;let best=null;for(let start=0;start<duration;start+=600){let distanceM=0;for(let i=1;i<series.length;i++){const a=series[i-1],b=series[i],mid=(Number(a.tSec)+Number(b.tSec))/2;if(mid<start||mid>=start+600)continue;const dt=Math.max(0,Number(b.tSec)-Number(a.tSec));distanceM+=(Number(a.value)+Number(b.value))/2/3.6*dt}if(!best||distanceM>best.distanceM)best={startSec:start,endSec:Math.min(start+600,duration),distanceM}}return best}\nfunction matchHighlights(a,speed){const top=speed?.topSpeedEvent||null,longest=speed?.eventSummary?.longest||null,busy=speed?.busiestBlock||approximateBusiestBlock(speed,a?.durationS),items=[];"
if old not in s: raise SystemExit('highlights target missing')
s=s.replace(old,new,1)
p.write_text(s)

# --- CSS: larger type, explanatory mini captions ---
p=Path('gps/gps-panel.css'); s=p.read_text(); s += '''\n/* Readability cleanup v3 */\n.patx-gps-panel{font-size:15px}.patx-gps-kicker{font-size:11px}.patx-gps-context-row{font-size:12px}.patx-gps-role-pill{font-size:12px}.patx-gps-orientation button{font-size:13px;padding:9px 13px}.patx-gps-orientation small{font-size:11px}.patx-gps-stat span{font-size:12px}.patx-gps-stat strong{font-size:23px}.patx-gps-stat small{font-size:11px}.patx-gps-map-title strong{font-size:16px}.patx-gps-map-title span{font-size:11px}.patx-gps-section-head span{font-size:10px}.patx-gps-section-head h4{font-size:21px}.patx-gps-note,.patx-gps-notes{font-size:12px}.patx-gps-mini span{font-size:10px}.patx-gps-mini strong{font-size:16px}.patx-gps-mini small{display:block;margin-top:5px;color:#87928c;font-size:10px;line-height:1.35}.patx-gps-zone-row,.patx-gps-role-ranking>div{font-size:12px}.patx-gps-highlight-row b{font-size:14px}.patx-gps-highlight-row span{font-size:11px}.patx-match-gps-player strong{font-size:13px}.patx-match-gps-player small{font-size:10px}\n'''; p.write_text(s)
# trigger
