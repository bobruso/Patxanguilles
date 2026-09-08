import{drawAllPitchMaps}from'./pitch-maps.js';
import{drawAllTimeCharts}from'./time-charts.js';

const esc=v=>String(v??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
const finite=v=>Number.isFinite(Number(v));
const fmtKm=m=>finite(m)?(Number(m)/1000).toFixed(2)+' km':'—';
const fmtKmh=v=>finite(v)?Number(v).toFixed(1)+' km/h':'—';
const fmtTime=s=>{if(!finite(s))return'—';const n=Math.max(0,Math.round(Number(s))),m=Math.floor(n/60),sec=n%60;return m+'m '+String(sec).padStart(2,'0')+'s'};

export function playerGpsPanelHtml(a,{playerName='',showSave=false,showBack=false}={}){
  const d=a?.analysisDetail||{},pos=d.positional||{},speed=d.speed||{},hr=d.heartRate||{},work=d.workload||{},role=pos.role||null,thirds=pos.thirds||[],sides=pos.sides||[],hasHr=!!a?.hasHr,reliable=!!pos.orientationReliable,fieldCalibrated=!!pos.fieldCalibrated,periods=pos.periods||[];
  const thirdLabels=reliable?['Tercio defensivo','Tercio medio','Tercio atacante']:['Tercio A','Tercio central','Tercio B'];
  const roleState=reliable?'':fieldCalibrated?' · falta sentido de ataque':' · campo sin calibrar';
  const pitchContext=pos.pitchName?`<div class="patx-gps-note" style="margin:5px 0 0">Campo: <b>${esc(pos.pitchName)}</b>${finite(pos.lengthM)&&finite(pos.widthM)?` · ${Number(pos.lengthM).toFixed(0)} × ${Number(pos.widthM).toFixed(0)} m`:''}${periods.length?` · ${periods.length} partes detectadas`:''}</div>`:'';
  return `<section class="patx-gps-panel patx-gps-report" data-patx-gps-panel>
    <div class="patx-gps-head">
      <div class="patx-gps-title-row">${showBack?'<button type="button" class="patx-gps-back" data-gps-back>← Partido</button>':''}<div><div class="patx-gps-kicker">ANÁLISIS GPS DEL PARTIDO</div><h3>${esc(playerName||'Jugador')}</h3>${role?`<div class="patx-gps-role-pill"><b>${reliable?esc(role.top):'Perfil provisional'}</b><span>${role.confidence}% confianza${roleState}</span></div>`:''}${pitchContext}</div></div>
      <div class="patx-gps-head-actions">${showSave?'<button type="button" class="patx-gps-save" data-gps-save>Guardar datos</button>':''}</div>
    </div>

    <div class="patx-gps-stats">
      ${stat('Distancia',fmtKm(a?.distanceM),'distancia total')}
      ${stat('Velocidad máxima',fmtKmh(a?.topSpeedKmh),'pico suavizado')}
      ${stat('Velocidad media',fmtKmh(a?.avgSpeedKmh),'en movimiento')}
      ${stat('Sprints',String(a?.sprintCount??'—'),'>'+Number(speed.sprintThresholdKmh||18).toFixed(0)+' km/h')}
      ${stat('Alta intensidad',fmtKm(a?.highIntensityDistanceM),'>'+Number(speed.highIntensityThresholdKmh||13).toFixed(0)+' km/h')}
      ${stat('Tiempo en movimiento',fmtTime(a?.movingTimeS),'actividad')}
      ${hasHr?stat('FC media',(a.avgHr??'—')+' ppm','frecuencia cardíaca'):''}
      ${hasHr?stat('FC máxima',(a.maxHr??'—')+' ppm','frecuencia cardíaca'):''}
    </div>

    <div class="patx-gps-map-grid">
      ${mapCard('Mapa de calor','Tiempo acumulado en cada zona','heatmap')}
      ${mapCard('Recorrido','Movement trail durante el partido','trail')}
      ${mapCard('Ocupación por zonas','Porcentaje de tiempo en cada sector','zones')}
    </div>

    <div class="patx-gps-breakdown-grid">
      <section class="patx-gps-section"><div class="patx-gps-section-head"><span>POSICIÓN</span><h4>Ocupación del campo</h4></div>
        <div class="patx-gps-bars">${bar(thirdLabels[0],thirds[0])}${bar(thirdLabels[1],thirds[1])}${bar(thirdLabels[2],thirds[2])}</div>
        <div class="patx-gps-subtitle">Distribución lateral</div><div class="patx-gps-bars compact">${bar('Izquierda',sides[0])}${bar('Centro',sides[1])}${bar('Derecha',sides[2])}</div>
        ${!reliable?`<p class="patx-gps-note">${fieldCalibrated?'El campo ya está calibrado. Falta indicar hacia qué portería atacaba el jugador en la primera parte para convertir Tercio A/B en defensa/ataque.':'Todavía no asignamos “defensivo” y “atacante” a los extremos. Hay que calibrar las cuatro esquinas del campo.'}</p>`:''}
      </section>

      <section class="patx-gps-section"><div class="patx-gps-section-head"><span>PERFIL</span><h4>${reliable?'Posición estimada':'Lectura provisional del rol'}</h4></div>
        ${role?`<div class="patx-gps-role-main"><strong>${reliable?esc(role.top):'Orientación pendiente'}</strong><b>${role.confidence}%</b></div>${role.ranked?.length?`<div class="patx-gps-role-ranking">${role.ranked.map((r,i)=>`<div><span>${i+1}. ${esc(r.role)}</span><b>${Number(r.score).toFixed(2)}</b></div>`).join('')}</div>`:''}${role.notes?.length?`<ul class="patx-gps-notes">${role.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>`:''}`:'<p class="patx-gps-note">No hay GPS suficiente para estimar posición.</p>'}
        ${!reliable?'<p class="patx-gps-note"><b>No mostramos todavía una posición como definitiva</b>: invertir el eje del campo puede intercambiar un perfil defensivo por uno ofensivo.</p>':''}
      </section>
    </div>

    <section class="patx-gps-section patx-gps-wide"><div class="patx-gps-section-head"><span>VELOCIDAD Y DISTANCIA</span><h4>Breakdown de carrera</h4></div>
      ${chartCard('Velocidad durante el partido','La línea temporal muestra picos, alta intensidad y sprints','speed')}
      <div class="patx-gps-zone-table">${(speed.zones||a?.speedZones||[]).map(z=>zoneRow(z,a?.distanceM)).join('')}</div>
      <div class="patx-gps-inline-metrics">
        ${mini('Sprints detectados',a?.sprintCount??0)}${mini('Carreras alta intensidad',speed.highIntensityRuns?.length??'—')}${mini('Aceleraciones fuertes',speed.accelerations?.length??'—')}${mini('Deceleraciones fuertes',speed.decelerations?.length??'—')}${mini('Distancia / min',finite(work.distancePerMin)?Math.round(work.distancePerMin)+' m':'—')}${mini('Alta intensidad / min',finite(work.highIntensityDistancePerMin)?Math.round(work.highIntensityDistancePerMin)+' m':'—')}
      </div>
    </section>

    ${hasHr?`<section class="patx-gps-section patx-gps-wide"><div class="patx-gps-section-head"><span>FRECUENCIA CARDÍACA</span><h4>Pulsaciones y zonas</h4></div>${chartCard('Pulso durante el partido','Evolución de las pulsaciones y límites aproximados de zonas','hr')}<div class="patx-gps-inline-metrics">${mini('FC media',(a.avgHr??'—')+' ppm')}${mini('FC máxima',(a.maxHr??'—')+' ppm')}${mini('Referencia máx.',(hr.referenceMaxBpm??'—')+' ppm')}${mini('Cadencia media',work.avgCadence==null?'—':work.avgCadence+' spm')}</div><div class="patx-gps-hr-zones">${(hr.zones||[]).map(z=>hrZone(z,a?.durationS)).join('')}</div></section>`:''}

    ${work.fatigue?`<section class="patx-gps-section patx-gps-wide"><div class="patx-gps-section-head"><span>CARGA Y FATIGA</span><h4>Primera mitad vs segunda mitad</h4></div><div class="patx-gps-inline-metrics">${mini('1ª mitad',fmtKm(work.fatigue.first?.distanceM))}${mini('2ª mitad',fmtKm(work.fatigue.second?.distanceM))}${mini('Ritmo 1ª',Math.round(work.fatigue.first?.distancePerMin||0)+' m/min')}${mini('Ritmo 2ª',Math.round(work.fatigue.second?.distancePerMin||0)+' m/min')}${mini('Cambio de ritmo',(work.fatigue.distanceRateChangePct>0?'+':'')+work.fatigue.distanceRateChangePct+'%')}</div><p class="patx-gps-note">${work.fatigue.provisional?'No se ha detectado un descanso fiable; la comparación divide la grabación en dos de forma provisional.':'La comparación utiliza las dos primeras partes detectadas en la grabación.'}</p></section>`:''}
  </section>`;
}

function stat(label,value,caption){return `<div class="patx-gps-stat"><span>${label}</span><strong>${value}</strong><small>${caption}</small></div>`}
function mini(label,value){return `<div class="patx-gps-mini"><span>${label}</span><strong>${value}</strong></div>`}
function mapCard(title,caption,key){return `<article class="patx-gps-map-card"><div class="patx-gps-map-title"><strong>${title}</strong><span>${caption}</span></div><div class="patx-gps-canvas-wrap"><canvas data-gps-map="${key}" aria-label="${title}"></canvas></div></article>`}
function chartCard(title,caption,key){return `<article class="patx-gps-chart-card"><div class="patx-gps-chart-title"><strong>${title}</strong><span>${caption}</span></div><div class="patx-gps-chart-wrap"><canvas data-gps-chart="${key}" aria-label="${title}"></canvas></div></article>`}
function bar(label,value){const p=Math.round((Number(value)||0)*100);return `<div class="patx-gps-bar-row"><div><span>${label}</span><b>${p}%</b></div><i><em style="width:${Math.min(100,p)}%"></em></i></div>`}
function zoneRow(z,total){const d=Number(z.distanceM)||0,p=Number(total)>0?d/Number(total)*100:0;return `<div class="patx-gps-zone-row"><span>${esc(z.name)}</span><div><i><em style="width:${Math.min(100,p)}%"></em></i></div><b>${fmtKm(d)}</b><small>${fmtTime(z.timeS)}</small></div>`}
function hrZone(z,duration){const p=Number(duration)>0?(Number(z.timeS)||0)/Number(duration)*100:0;return `<div class="patx-gps-hr-row"><span>Z${z.zone} · ${z.lowBpm}-${z.highBpm} ppm</span><i><em style="width:${Math.min(100,p)}%"></em></i><b>${Math.round(p)}%</b></div>`}

function drawAll(panel,analysis){drawAllPitchMaps(panel,analysis);drawAllTimeCharts(panel,analysis)}
export function mountPlayerGpsPanel(container,analysis,options={}){if(!container)return null;container.innerHTML=playerGpsPanelHtml(analysis,options);const panel=container.querySelector('[data-patx-gps-panel]');if(panel)requestAnimationFrame(()=>drawAll(panel,analysis));return panel}
export function redrawPlayerGpsPanel(panel,analysis){if(panel)drawAll(panel,analysis)}
