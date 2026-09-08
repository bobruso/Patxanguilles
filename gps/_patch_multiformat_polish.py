from pathlib import Path

p=Path('gps-upload.html')
s=p.read_text()
s=s.replace('<p class="privacy">El archivo se analiza localmente. Admite FIT, GPX y TCX. Se guardan métricas y posiciones normalizadas, nunca las coordenadas GPS originales ni el archivo original.</p>','<p class="privacy">El archivo se analiza localmente. <b>Recomendado: FIT</b> · También compatible con TCX y GPX. Se guardan métricas y posiciones normalizadas, nunca las coordenadas GPS originales ni el archivo original.</p>')
s=s.replace('<button id="analyze" class="primary">Analizar FIT</button>','<button id="analyze" class="primary">Analizar actividad</button>')
s=s.replace("function resetAnalysis(){latest=null;latestBuffer=null;analyzedPlayerId=null;$('save').disabled=true;$('result').hidden=true;$('status').textContent=''}","function resetAnalysis(){latest=null;analyzedPlayerId=null;$('save').disabled=true;$('result').hidden=true;$('status').textContent=''}")
s=s.replace("e?.message||'No se pudo analizar el FIT'","e?.message||'No se pudo analizar la actividad'")
s=s.replace("'Has cambiado de jugador. Vuelve a analizar el FIT.'","'Has cambiado de jugador. Vuelve a analizar la actividad.'")
p.write_text(s)

p=Path('gps/player-gps-panel.js')
s=p.read_text()
old="  const d=a?.analysisDetail||{},pos=d.positional||{},speed=buildSprintEvents(d.speed||{},a?.durationS),hr=d.heartRate||{},work=d.workload||{},role=pos.role||null,thirds=pos.thirds||[],sides=pos.sides||[],hasHr=!!a?.hasHr,dir=Number(pos.attackDirection)===-1?-1:1;"
new="  const d=a?.analysisDetail||{},pos=d.positional||{},speed=buildSprintEvents(d.speed||{},a?.durationS),hr=d.heartRate||{},work=d.workload||{},role=pos.role||null,thirds=pos.thirds||[],sides=pos.sides||[],hasHr=!!a?.hasHr,dir=Number(pos.attackDirection)===-1?-1:1,sourceFormat=String(a?.sourceFormat||'fit').toUpperCase();"
if old not in s: raise SystemExit('panel const target missing')
s=s.replace(old,new,1)
old="  const pitchContext=`<div class=\"patx-gps-context-row\"><span class=\"patx-gps-context-badge ${pos.fieldCalibrated?'is-calibrated':'is-auto'}\">${contextLabel}</span><span>${contextDetail}</span></div>`;"
new="  const pitchContext=`<div class=\"patx-gps-context-row\"><span class=\"patx-gps-context-badge ${pos.fieldCalibrated?'is-calibrated':'is-auto'}\">${contextLabel}</span><span>${contextDetail}</span><span class=\"patx-gps-context-badge\">ORIGEN ${esc(sourceFormat)}</span></div>`;"
if old not in s: raise SystemExit('pitch context target missing')
s=s.replace(old,new,1)
p.write_text(s)
# trigger
