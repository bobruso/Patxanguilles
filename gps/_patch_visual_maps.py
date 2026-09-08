from pathlib import Path
p=Path('gps/gps-panel.css')
s=p.read_text()
append='''\n/* Visual QA: prioritize heatmap and keep six headline metrics balanced */\n@media(min-width:901px){.patx-gps-map-grid{grid-template-columns:2fr 1fr;grid-template-rows:auto auto;align-items:start}.patx-gps-map-card:first-child{grid-row:1 / span 2}.patx-gps-stats{grid-template-columns:repeat(6,minmax(0,1fr))}}\n@media(max-width:900px){.patx-gps-map-card:first-child{grid-row:auto}}\n'''
if 'Visual QA: prioritize heatmap' not in s:s+=append
p.write_text(s)
# trigger
