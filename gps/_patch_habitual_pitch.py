from pathlib import Path

p=Path('gps-upload.html')
s=p.read_text()
# Remove visible field selector from upload UI.
s=s.replace('<label>Campo <select id="pitch"><option value="auto">Auto · detectar por GPS</option><option value="none">Sin calibrar</option></select></label>','')
# Explain habitual field instead of selectable field.
s=s.replace('<div id="fieldInfo" class="field-info">Cargando campos calibrados…</div>','<div id="fieldInfo" class="field-info">Cargando campo habitual…</div>')
s=s.replace('<div style="margin-top:9px"><a class="small-link" href="gps-calibrate.html">Administrar / calibrar campos</a></div>','<div style="margin-top:9px"><a class="small-link" href="gps-calibrate.html">Administrar campo habitual</a></div>')
# Replace pitch rendering/base options with automatic habitual-field logic.
old="function renderPitches(){const mode=modeFromMatch(match),usable=usablePitches();$('pitch').innerHTML='<option value=\"auto\">Auto · detectar por GPS</option>'+usable.map(p=>`<option value=\"${p.id}\">${esc(p.name)}</option>`).join('')+'<option value=\"none\">Sin calibrar</option>';$('fieldInfo').innerHTML=usable.length?`Hay <b>${usable.length}</b> campo${usable.length===1?'':'s'} calibrado${usable.length===1?'':'s'} para ${mode==='f7'?'Fútbol 7':'Fútbol Sala'}. En Auto se escogerá el más cercano al recorrido.`:'No hay campos calibrados para este formato; se usará la forma del recorrido.'}"
new="function renderPitches(){const mode=modeFromMatch(match),usable=usablePitches();$('fieldInfo').innerHTML=usable.length===1?`Campo habitual: <b>${esc(usable[0].name)}</b> · ${mode==='f7'?'Fútbol 7':'Fútbol Sala'}. Se aplicará automáticamente a todos los archivos.`:usable.length>1?`Hay <b>${usable.length}</b> campos activos. No tienes que elegir: se detectará automáticamente el más cercano al recorrido.`:'<b>Campo habitual aún no calibrado.</b> El análisis puede hacerse con autoajuste GPS, pero para máxima precisión conviene marcar una vez las 4 esquinas desde Administración.'}"
if old not in s: raise SystemExit('renderPitches target missing')
s=s.replace(old,new,1)
old="function baseOptions(){const p=players[$('player').value]||{},choice=$('pitch').value,selected=choice==='auto'?null:pitches.find(x=>String(x.id)===choice)||null;return{age:p.age||null,field:selected,fields:choice==='auto'?usablePitches():[],attackDirection:1}}"
new="function baseOptions(){const p=players[$('player').value]||{},usable=usablePitches();return{age:p.age||null,field:usable.length===1?usable[0]:null,fields:usable.length>1?usable:[],attackDirection:1}}"
if old not in s: raise SystemExit('baseOptions target missing')
s=s.replace(old,new,1)
# Remove field change listener.
s=s.replace(";$('pitch').addEventListener('change',()=>{latest=null;analyzedPlayerId=null;$('save').disabled=true;$('result').hidden=true;$('status').textContent='Campo cambiado. Pulsa Analizar FIT de nuevo.'})",'')
# Save should open full report directly, not return to match.
old="$('status').textContent='Datos GPS guardados.';try{sessionStorage.setItem('patx:gps:refresh-match',String(matchId))}catch{}setTimeout(()=>history.length>1?history.back():location.assign('./index.html'),500)"
new="$('status').textContent='Datos GPS guardados. Abriendo informe…';setTimeout(()=>location.assign(`gps-report.html?match=${encodeURIComponent(matchId)}&player=${encodeURIComponent(analyzedPlayerId)}`),250)"
if old not in s: raise SystemExit('save redirect target missing')
s=s.replace(old,new,1)
p.write_text(s)

# Satellite-first calibration map with street-map fallback.
p=Path('gps-calibrate.html')
s=p.read_text()
old="function initMap(){if(map)return;map=L.map('map').setView([39.4699,-0.3763],15);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:21,attribution:'© OpenStreetMap contributors'}).addTo(map);map.on('click',e=>{if(corners.length>=4)return;corners.push({lat:e.latlng.lat,lon:e.latlng.lng});renderCorners()});renderSteps()}"
new="function initMap(){if(map)return;map=L.map('map').setView([39.4699,-0.3763],17);const satellite=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:20,attribution:'Tiles © Esri'}).addTo(map),streets=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:21,attribution:'© OpenStreetMap contributors'});L.control.layers({'Satélite':satellite,'Mapa':streets},null,{collapsed:false}).addTo(map);map.on('click',e=>{if(corners.length>=4)return;corners.push({lat:e.latlng.lat,lon:e.latlng.lng});renderCorners()});renderSteps()}"
if old not in s: raise SystemExit('map init target missing')
s=s.replace(old,new,1)
s=s.replace('Marca una vez las cuatro esquinas reales del terreno de juego.','Marca una vez las cuatro esquinas reales del terreno de juego sobre la vista satélite.')
p.write_text(s)
