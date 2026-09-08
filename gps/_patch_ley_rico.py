from pathlib import Path

# player panel
p=Path('gps/player-gps-panel.js'); s=p.read_text()
old="  const orientation=showOrientation?`<div class=\"patx-gps-orientation\" data-gps-orientation><span>ORIENTACIÓN</span><div><button type=\"button\" data-gps-dir=\"-1\" class=\"${dir===-1?'active':''}\">◀ ATACANDO</button><button type=\"button\" data-gps-dir=\"1\" class=\"${dir===1?'active':''}\">ATACANDO ▶</button></div><small>Invierte el eje del campo y recalcula ocupación, posición media, ubicación de sprints y rol estimado.</small><span class=\"patx-gps-orientation-state\" data-gps-orientation-state></span></div>`:'';"
new="  const goalA=String(pos.goalALabel||'Portería A'),goalB=String(pos.goalBLabel||'Portería B'),muroDir=/muro/i.test(goalA)?-1:/muro/i.test(goalB)?1:1,leyRico=dir===muroDir,normalGoal=muroDir===1?goalA:goalB,muroGoal=muroDir===1?goalB:goalA;\n  const orientation=showOrientation?`<div class=\"patx-gps-orientation\" data-gps-orientation><span>LEY RICO</span><div><button type=\"button\" data-gps-ley-rico data-gps-dir=\"${leyRico?-muroDir:muroDir}\" class=\"${leyRico?'active':''}\">${leyRico?'Desactivar Ley Rico':'Activar Ley Rico'}</button></div><small>${leyRico?`Activa · atacando hacia ${esc(muroGoal)}`:`Desactivada · atacando hacia ${esc(normalGoal)}`}. Al cambiarla se recalculan ocupación, posición media, ubicación de sprints y rol estimado.</small><span class=\"patx-gps-orientation-state\" data-gps-orientation-state></span></div>`:'';"
if old not in s: raise SystemExit('orientation block not found')
s=s.replace(old,new,1); p.write_text(s)

# Upload: keep same binding mechanism, but default to non-Ley-Rico = opposite of Muro.
p=Path('gps-upload.html'); s=p.read_text()
old="function baseOptions(){const p=players[$('player').value]||{},usable=usablePitches();return{age:p.age||null,field:usable.length===1?usable[0]:null,fields:usable.length>1?usable:[],attackDirection:1}}"
new="function muroDirection(field){const a=String(field?.goal_a_label||''),b=String(field?.goal_b_label||'');return /muro/i.test(a)?-1:/muro/i.test(b)?1:1}function baseOptions(){const p=players[$('player').value]||{},usable=usablePitches(),field=usable.length===1?usable[0]:null;return{age:p.age||null,field,fields:usable.length>1?usable:[],attackDirection:field?-muroDirection(field):-1}}"
if old not in s: raise SystemExit('baseOptions block not found')
s=s.replace(old,new,1)
p.write_text(s)

# report and upload already bind data-gps-dir generically; update save/status wording in report.
p=Path('gps-report.html'); s=p.read_text()
s=s.replace("setOrientationState('Guardando orientación…')","setOrientationState('Guardando Ley Rico…')")
s=s.replace("console.warn('[GPS] No se pudo guardar orientación',error)","console.warn('[GPS] No se pudo guardar Ley Rico',error)")
s=s.replace("setOrientationState('Orientación guardada')","setOrientationState('Ley Rico guardada')")
p.write_text(s)
# trigger
