from pathlib import Path

p=Path('gps/player-gps-panel.js')
s=p.read_text()
old="import{sprintSpatialPanelHtml}from'./sprint-spatial-panel.js';"
new="import{sprintSpatialPanelHtml}from'./sprint-spatial-panel.js';\nimport{matchSummaryHtml}from'./match-summary.js';"
if old not in s: raise SystemExit('summary import target missing')
s=s.replace(old,new,1)

old_block="""</div></div>${orientation}<div class=\"patx-gps-stats\">${stat('Distancia',fmtKm(a?.distanceM),'distancia total')}${stat('Velocidad máxima',fmtKmh(a?.topSpeedKmh),'pico suavizado')}${stat('Velocidad media',fmtKmh(a?.avgSpeedKmh),'en movimiento')}${stat('Sprints relativos',String(a?.sprintCount??'—'),finite(speed.relativeSprintCutoffKmh)?`umbral individual ≈ ${Number(speed.relativeSprintCutoffKmh).toFixed(1)} km/h`:'picos de velocidad')}${stat('Alta intensidad',fmtKm(a?.highIntensityDistanceM),'>'+Number(speed.highIntensityThresholdKmh||13).toFixed(0)+' km/h')}${stat('Tiempo en movimiento',fmtTime(a?.movingTimeS),'actividad')}${hasHr?stat('FC media',(a.avgHr??'—')+' ppm','frecuencia cardíaca'):''}${hasHr?stat('FC máxima',(a.maxHr??'—')+' ppm','frecuencia cardíaca'):''}</div>\n  <div class=\"patx-gps-map-grid\">${mapCard('Mapa de calor','Tiempo acumulado en cada zona','heatmap')}${mapCard('Recorrido','Movimiento durante los 60 minutos','trail')}${mapCard('Ocupación por zonas','Porcentaje de tiempo en cada sector','zones')}</div>"""
new_block="""</div></div>${orientation}${matchSummaryHtml(a,speed)}\n  <div class=\"patx-gps-map-grid\">${mapCard('Mapa de calor','Tiempo acumulado + puntos de sprint','heatmap')}${mapCard('Recorrido','Movimiento durante los 60 minutos','trail')}${mapCard('Ocupación por zonas','Porcentaje de tiempo en cada sector','zones')}</div>\n  <div class=\"patx-gps-stats\">${stat('Distancia',fmtKm(a?.distanceM),'distancia total')}${stat('Velocidad máxima',fmtKmh(a?.topSpeedKmh),'pico suavizado')}${stat('Sprints relativos',String(a?.sprintCount??'—'),finite(speed.relativeSprintCutoffKmh)?`umbral individual ≈ ${Number(speed.relativeSprintCutoffKmh).toFixed(1)} km/h`:'picos de velocidad')}${stat('Alta intensidad',fmtKm(a?.highIntensityDistanceM),'>'+Number(speed.highIntensityThresholdKmh||13).toFixed(0)+' km/h')}${hasHr?stat('FC media',(a.avgHr??'—')+' ppm','frecuencia cardíaca'):stat('Velocidad media',fmtKmh(a?.avgSpeedKmh),'en movimiento')}${hasHr?stat('FC máxima',(a.maxHr??'—')+' ppm','frecuencia cardíaca'):stat('Tiempo en movimiento',fmtTime(a?.movingTimeS),'actividad')}</div>"""
if old_block not in s: raise SystemExit('hero hierarchy target missing')
s=s.replace(old_block,new_block,1)
p.write_text(s)

p=Path('gps/gps-panel.css')
s=p.read_text()
append="""
.patx-gps-summary{margin:8px 0 14px;padding:18px 20px;border-radius:16px;background:linear-gradient(135deg,rgba(227,38,46,.16),rgba(12,20,16,.96) 55%);border:1px solid rgba(227,38,46,.24);box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}.patx-gps-summary-kicker{font-size:9px;font-weight:950;letter-spacing:.16em;color:#ff6c72}.patx-gps-summary h4{margin:5px 0 7px;font-size:24px;line-height:1.08}.patx-gps-summary p{margin:0;max-width:1050px;color:#bdc7c1;font-size:13px;line-height:1.55}.patx-gps-map-grid{grid-template-columns:2fr 1fr 1fr;margin-bottom:14px}.patx-gps-map-card:first-child{box-shadow:0 14px 34px rgba(0,0,0,.28);border-color:rgba(255,255,255,.16)}.patx-gps-map-card:first-child .patx-gps-map-title strong{font-size:16px}.patx-gps-stats{margin-top:0}
@media(max-width:900px){.patx-gps-map-grid{grid-template-columns:1fr}.patx-gps-summary h4{font-size:21px}}
"""
if '.patx-gps-summary{' not in s:s+=append
p.write_text(s)
