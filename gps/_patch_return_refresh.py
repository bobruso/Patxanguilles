from pathlib import Path

p=Path('gps-upload.html')
s=p.read_text()
old="$('status').textContent='Datos GPS guardados.';setTimeout(()=>history.length>1?history.back():location.assign('./index.html'),500)"
new="$('status').textContent='Datos GPS guardados.';try{sessionStorage.setItem('patx:gps:refresh-match',String(matchId))}catch{}setTimeout(()=>history.length>1?history.back():location.assign('./index.html'),500)"
if old not in s: raise SystemExit('upload save return target missing')
s=s.replace(old,new,1)
p.write_text(s)

p=Path('gps/index-integration.js')
s=p.read_text()
old="function refreshCurrentMatchGps(){\n  if(currentMatchId==null)return;\n  const modal=document.getElementById('matchModal');\n  const content=document.getElementById('matchContent');\n  if(!modal?.classList.contains('open')||!content)return;\n  setTimeout(()=>enhanceOpenMatchGps(currentMatchId),0);\n}"
new="function refreshCurrentMatchGps(){\n  let requested=null;try{requested=sessionStorage.getItem('patx:gps:refresh-match')}catch{}\n  if(requested!=null&&currentMatchId!=null&&String(requested)===String(currentMatchId)){try{sessionStorage.removeItem('patx:gps:refresh-match')}catch{}}\n  const target=currentMatchId??requested;\n  if(target==null)return;\n  const modal=document.getElementById('matchModal');\n  const content=document.getElementById('matchContent');\n  if(!modal?.classList.contains('open')||!content)return;\n  currentMatchId=target;\n  setTimeout(()=>enhanceOpenMatchGps(target),0);\n}"
if old not in s: raise SystemExit('index refresh target missing')
s=s.replace(old,new,1)
p.write_text(s)
# trigger
