from pathlib import Path
p=Path('gps/player-gps-panel.js')
s=p.read_text()
old="import{buildSprintEvents}from'./sprint-events.js';"
new="import{buildSprintEvents}from'./sprint-events.js';\nimport{fatiguePanelHtml}from'./fatigue-panel.js';"
if old not in s: raise SystemExit('import target missing')
s=s.replace(old,new,1)
old2="  ${hasHr?`<section class=\"patx-gps-section patx-gps-wide\"><div class=\"patx-gps-section-head\"><span>FRECUENCIA CARDÍACA</span>"
new2="  ${fatiguePanelHtml(speed,a?.durationS)}\n  ${hasHr?`<section class=\"patx-gps-section patx-gps-wide\"><div class=\"patx-gps-section-head\"><span>FRECUENCIA CARDÍACA</span>"
if old2 not in s: raise SystemExit('section target missing')
s=s.replace(old2,new2,1)
p.write_text(s)
