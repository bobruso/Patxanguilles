from pathlib import Path

p=Path('gps-calibrate.html')
s=p.read_text()

s=s.replace("Después los FIT de ese campo se proyectarán sobre su geometría real.","Después cualquier actividad FIT, TCX o GPX de ese campo se proyectará sobre su geometría real.")
s=s.replace("para indicar fácilmente el sentido de ataque al importar un FIT.","para indicar fácilmente el sentido de ataque al importar una actividad.")
s=s.replace('<label>Radio de autodetección<input id="radius" type="number" min="25" max="2000" step="25" value="250"></label>','<input id="radius" type="hidden" value="250">')
s=s.replace('<button id="save" class="primary" disabled>Guardar campo</button>','<button id="save" class="primary" disabled>Guardar como campo habitual</button>')

old="function renderCorners(){markers.forEach(m=>m.remove());markers=[];if(polygon){polygon.remove();polygon=null}corners.forEach((c,i)=>markers.push(L.marker([c.lat,c.lon],{icon:markerIcon(i)}).addTo(map)));if(corners.length>=2)polygon=L.polyline(corners.map(c=>[c.lat,c.lon]).concat(corners.length===4?[[corners[0].lat,corners[0].lon]]:[]),{color:'#e3262e',weight:3}).addTo(map);renderSteps();const tf=corners.length===4?buildFieldTransform(corners):null;$('length').textContent=tf?tf.lengthM.toFixed(1)+' m':'—';$('width').textContent=tf?tf.widthM.toFixed(1)+' m':'—';$('save').disabled=!tf||!$('name').value.trim()}"
new="function renderCorners(){markers.forEach(m=>m.remove());markers=[];if(polygon){polygon.remove();polygon=null}corners.forEach((c,i)=>{const m=L.marker([c.lat,c.lon],{icon:markerIcon(i),draggable:true}).addTo(map);m.on('dragend',e=>{const ll=e.target.getLatLng();corners[i]={lat:ll.lat,lon:ll.lng};renderCorners()});markers.push(m)});if(corners.length>=2)polygon=L.polyline(corners.map(c=>[c.lat,c.lon]).concat(corners.length===4?[[corners[0].lat,corners[0].lon]]:[]),{color:'#e3262e',weight:3}).addTo(map);renderSteps();const tf=corners.length===4?buildFieldTransform(corners):null;$('length').textContent=tf?tf.lengthM.toFixed(1)+' m':'—';$('width').textContent=tf?tf.widthM.toFixed(1)+' m':'—';$('save').disabled=!tf||!$('name').value.trim()}"
if old not in s: raise SystemExit('renderCorners target missing')
s=s.replace(old,new,1)

old="$('save').onclick=async()=>{if(corners.length!==4)return;const tf=buildFieldTransform(corners),name=$('name').value.trim();if(!tf||!name)return;const row={name,mode:$('mode').value,corners,goal_a_label:goalName('goalA'),goal_b_label:goalName('goalB'),center_lat:tf.center.lat,center_lon:tf.center.lon,match_radius_m:Number($('radius').value)||250,is_active:true,updated_at:new Date().toISOString()};$('status').textContent='Guardando…';let res;if(editingId)res=await sb.from('gps_pitches').update(row).eq('id',editingId);else res=await sb.from('gps_pitches').insert(row);if(res.error){$('status').textContent='No se pudo guardar: '+res.error.message;return}$('status').textContent='Campo guardado.';resetEditor();loadPitches()};"
new="$('save').onclick=async()=>{if(corners.length!==4)return;const tf=buildFieldTransform(corners),name=$('name').value.trim(),mode=$('mode').value;if(!tf||!name)return;const row={name,mode,corners,goal_a_label:goalName('goalA'),goal_b_label:goalName('goalB'),center_lat:tf.center.lat,center_lon:tf.center.lon,match_radius_m:Number($('radius').value)||250,is_active:true,updated_at:new Date().toISOString()};$('status').textContent='Guardando campo habitual…';let deactivate=sb.from('gps_pitches').update({is_active:false,updated_at:new Date().toISOString()}).eq('mode',mode).eq('is_active',true);if(editingId)deactivate=deactivate.neq('id',editingId);const off=await deactivate;if(off.error){$('status').textContent='No se pudo actualizar el campo habitual: '+off.error.message;return}let res;if(editingId)res=await sb.from('gps_pitches').update(row).eq('id',editingId);else res=await sb.from('gps_pitches').insert(row);if(res.error){$('status').textContent='No se pudo guardar: '+res.error.message;return}$('status').textContent='Campo habitual guardado.';resetEditor();loadPitches()};"
if old not in s: raise SystemExit('save handler target missing')
s=s.replace(old,new,1)

old="async function togglePitch(id){const p=pitches.find(x=>String(x.id)===String(id));if(!p)return;const{error}=await sb.from('gps_pitches').update({is_active:!p.is_active,updated_at:new Date().toISOString()}).eq('id',p.id);if(error)return alert(error.message);loadPitches()}"
new="async function togglePitch(id){const p=pitches.find(x=>String(x.id)===String(id));if(!p)return;if(p.is_active){const{error}=await sb.from('gps_pitches').update({is_active:false,updated_at:new Date().toISOString()}).eq('id',p.id);if(error)return alert(error.message)}else{const off=await sb.from('gps_pitches').update({is_active:false,updated_at:new Date().toISOString()}).eq('mode',p.mode).eq('is_active',true);if(off.error)return alert(off.error.message);const{error}=await sb.from('gps_pitches').update({is_active:true,updated_at:new Date().toISOString()}).eq('id',p.id);if(error)return alert(error.message)}loadPitches()}"
if old not in s: raise SystemExit('toggle handler target missing')
s=s.replace(old,new,1)

s=s.replace("${p.is_active?'':' · INACTIVO'}","${p.is_active?' · HABITUAL':' · INACTIVO'}")
s=s.replace("${p.is_active?'Desactivar':'Activar'}","${p.is_active?'Desactivar':'Usar como habitual'}")

p.write_text(s)
