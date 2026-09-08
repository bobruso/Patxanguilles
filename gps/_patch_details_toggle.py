from pathlib import Path

p=Path('gps/player-gps-panel.js')
s=p.read_text()
start='  <div class="patx-gps-breakdown-grid">'
if start not in s: raise SystemExit('detail start missing')
s=s.replace(start,'  <details class="patx-gps-details" data-gps-details><summary><span>ANÁLISIS DETALLADO</span><strong>Ver posición, velocidad, sprints, intensidad y pulso</strong><i>+</i></summary><div class="patx-gps-details-body">\n  <div class="patx-gps-breakdown-grid">',1)
end="  ${hasHr?`<section class=\"patx-gps-section patx-gps-wide\"><div class=\"patx-gps-section-head\"><span>FRECUENCIA CARDÍACA</span><h4>Pulsaciones y zonas</h4></div>${chartCard('Pulso durante el partido','Evolución durante los 60 minutos','hr')}<div class=\"patx-gps-inline-metrics\">${mini('FC media',(a.avgHr??'—')+' ppm')}${mini('FC máxima',(a.maxHr??'—')+' ppm')}${mini('Referencia máx.',(hr.referenceMaxBpm??'—')+' ppm')}${mini('Cadencia media',work.avgCadence==null?'—':work.avgCadence+' spm')}</div><div class=\"patx-gps-hr-zones\">${(hr.zones||[]).map(z=>hrZone(z,a?.durationS)).join('')}</div></section>`:''}</section>`;"
new_end="  ${hasHr?`<section class=\"patx-gps-section patx-gps-wide\"><div class=\"patx-gps-section-head\"><span>FRECUENCIA CARDÍACA</span><h4>Pulsaciones y zonas</h4></div>${chartCard('Pulso durante el partido','Evolución durante los 60 minutos','hr')}<div class=\"patx-gps-inline-metrics\">${mini('FC media',(a.avgHr??'—')+' ppm')}${mini('FC máxima',(a.maxHr??'—')+' ppm')}${mini('Referencia máx.',(hr.referenceMaxBpm??'—')+' ppm')}${mini('Cadencia media',work.avgCadence==null?'—':work.avgCadence+' spm')}</div><div class=\"patx-gps-hr-zones\">${(hr.zones||[]).map(z=>hrZone(z,a?.durationS)).join('')}</div></section>`:''}</div></details></section>`;"
if end not in s: raise SystemExit('detail end missing')
s=s.replace(end,new_end,1)
old_mount="export function mountPlayerGpsPanel(container,analysis,options={}){if(!container)return null;container.innerHTML=playerGpsPanelHtml(analysis,options);const panel=container.querySelector('[data-patx-gps-panel]');if(panel)requestAnimationFrame(()=>drawAll(panel,analysis));return panel}"
new_mount="export function mountPlayerGpsPanel(container,analysis,options={}){if(!container)return null;container.innerHTML=playerGpsPanelHtml(analysis,options);const panel=container.querySelector('[data-patx-gps-panel]');if(panel){requestAnimationFrame(()=>drawAll(panel,analysis));const details=panel.querySelector('[data-gps-details]');details?.addEventListener('toggle',()=>{if(details.open)requestAnimationFrame(()=>drawAllTimeCharts(panel,analysis))})}return panel}"
if old_mount not in s: raise SystemExit('mount target missing')
s=s.replace(old_mount,new_mount,1)
p.write_text(s)

p=Path('gps/gps-panel.css')
s=p.read_text()
css='''\n.patx-gps-details{margin-top:14px;border:1px solid rgba(255,255,255,.11);border-radius:15px;background:#09100c;overflow:hidden}.patx-gps-details>summary{list-style:none;display:grid;grid-template-columns:1fr auto;grid-template-rows:auto auto;gap:2px 14px;align-items:center;padding:15px 17px;cursor:pointer;user-select:none}.patx-gps-details>summary::-webkit-details-marker{display:none}.patx-gps-details>summary span{font-size:9px;font-weight:950;letter-spacing:.16em;color:#e3262e}.patx-gps-details>summary strong{font-size:14px;color:#dce4df}.patx-gps-details>summary i{grid-column:2;grid-row:1/3;font-style:normal;font-size:26px;line-height:1;color:#9aa69f;transition:transform .18s ease}.patx-gps-details[open]>summary{border-bottom:1px solid rgba(255,255,255,.08);background:#0d1712}.patx-gps-details[open]>summary i{transform:rotate(45deg);color:#fff}.patx-gps-details-body{padding:0 2px 2px}.patx-gps-details-body>.patx-gps-breakdown-grid{margin-top:12px}\n@media(max-width:560px){.patx-gps-details>summary{padding:13px 14px}.patx-gps-details>summary strong{font-size:12px}}\n'''
if '.patx-gps-details{' not in s:s+=css
p.write_text(s)
