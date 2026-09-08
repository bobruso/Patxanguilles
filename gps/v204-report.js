import{buildSprintEvents}from'./sprint-events.js';

const SUPABASE_URL='https://cnnhstlguewrxjihhlqc.supabase.co';
const SUPABASE_KEY='sb_publishable_uWEwYEMkAe3YkeAzX7ACAg_0aEYHmM6';

const q=new URLSearchParams(location.search);
const matchId=q.get('match');
const playerId=q.get('player');

let sb=null;
let metaCache=null;
let analysisCache=null;

function client(){
  if(sb)return sb;
  if(window.__patxGpsSupabase){sb=window.__patxGpsSupabase;return sb}
  if(!window.supabase?.createClient)return null;
  sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false}});
  return sb;
}
const finite=v=>Number.isFinite(Number(v));
const esc=v=>String(v??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));

function formatDate(iso){
  const m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m?`${Number(m[3])}-${Number(m[2])}-${m[1]}`:String(iso||'');
}
async function meta(){
  if(metaCache)return metaCache;
  const c=client();
  if(!c||!matchId||!playerId)return null;
  const [{data:p},{data:m}]=await Promise.all([
    c.from('players').select('id,nickname,photo_url').eq('id',playerId).maybeSingle(),
    c.from('matches').select('id,match_date,competition,red_score,black_score').eq('id',matchId).maybeSingle()
  ]);
  metaCache={player:p||null,match:m||null};
  return metaCache;
}
async function analysis(){
  if(window.__patxGpsAnalysis)return window.__patxGpsAnalysis;
  if(analysisCache)return analysisCache;
  const c=client();
  if(!c||!matchId||!playerId)return null;
  const {data}=await c.from('match_player_gps').select('*').eq('match_id',matchId).eq('player_id',playerId).maybeSingle();
  if(!data)return null;
  analysisCache={
    distanceM:Number(data.distance_m),topSpeedKmh:Number(data.top_speed_kmh),
    sprintCount:Number(data.sprint_count)||0,durationS:Number(data.duration_s)||0,
    analysisDetail:data.analysis_detail||{}
  };
  return analysisCache;
}
const ricoText=()=>'*Orientación ataque-defensa. Al cambiarla se recalculan ocupación, posición media, ubicación de sprints y rol estimado.';

function placeRico(){
  const panel=document.querySelector('.patx-gps-panel');
  if(!panel)return;
  const orientation=panel.querySelector('.patx-gps-orientation');
  const highlights=panel.querySelector('.patx-gps-highlights');
  const headActions=panel.querySelector('.patx-gps-head-actions');
  if(!orientation)return;

  [...orientation.querySelectorAll('small')].forEach(el=>{
    if(/orientaci[oó]n|al cambiarla|atacando hacia/i.test(el.textContent||''))el.classList.add('patx-v204-rico-original-note');
  });

  let note=panel.querySelector('.patx-v204-rico-note');
  if(!note){
    note=document.createElement('div');
    note.className='patx-v204-rico-note';
  }
  note.textContent=ricoText();

  const mobile=window.matchMedia('(max-width:700px)').matches;
  if(mobile&&highlights){
    let block=panel.querySelector('.patx-v204-rico-mobile-block');
    if(!block){
      block=document.createElement('div');
      block.className='patx-v204-rico-mobile-block';
    }
    if(block.parentElement!==highlights.parentElement||block.previousElementSibling!==highlights){
      highlights.insertAdjacentElement('afterend',block);
    }
    if(orientation.parentElement!==block)block.appendChild(orientation);
    if(note.parentElement!==block)block.appendChild(note);
  }else if(headActions){
    if(orientation.parentElement!==headActions)headActions.prepend(orientation);
    if(note.parentElement!==orientation)orientation.appendChild(note);
    const block=panel.querySelector('.patx-v204-rico-mobile-block');
    if(block&&block.childElementCount===0)block.remove();
  }
}

function styleHighlights(){
  document.querySelectorAll('.patx-gps-highlight-row').forEach(row=>{
    row.classList.add('patx-v204-highlight-row');
    const minute=row.querySelector(':scope > strong');
    if(minute)minute.classList.add('patx-v204-highlight-minute');
    const title=row.querySelector('div > b');
    if(!title||title.dataset.v204Done==='1')return;
    const text=(title.textContent||'').trim();
    let label=text,value='',m=text.match(/^(Top speed)\s+([\d.,]+\s*km\/h)$/i);
    if(m){label=m[1];value=m[2]}
    if(!m){m=text.match(/^(Sprint más largo)\s+([\d.,]+\s*m)$/i);if(m){label=m[1];value=m[2]}}
    if(!m){m=text.match(/^(Bloque más activo)\s*[·:-]?\s*([\d.,]+\s*m)$/i);if(m){label=m[1];value=m[2]}}
    if(value){
      title.innerHTML=`<span class="patx-v204-highlight-label">${esc(label)}</span><strong class="patx-v204-highlight-value">${esc(value)}</strong>`;
      title.dataset.v204Done='1';
    }
  });
}

function fixProfileRanking(){
  const sections=[...document.querySelectorAll('.patx-gps-section')];
  const profile=sections.find(s=>/PERFIL/i.test(s.querySelector('.patx-gps-section-head span')?.textContent||''));
  if(!profile)return;
  const main=profile.querySelector('.patx-gps-role-main strong');
  const ranking=profile.querySelector('.patx-gps-role-ranking');
  if(!main||!ranking)return;
  const mainRole=(main.textContent||'').trim().toLowerCase();
  [...ranking.children].forEach(row=>{
    const span=row.querySelector('span');
    const txt=(span?.textContent||'').replace(/^\s*\d+\.\s*/,'').trim().toLowerCase();
    if(txt===mainRole)row.remove();
  });
  if(ranking.children.length&&!profile.querySelector('.patx-v204-alt-label')){
    const lab=document.createElement('div');
    lab.className='patx-v204-alt-label';
    lab.textContent='Alternativas de posición';
    ranking.insertAdjacentElement('beforebegin',lab);
  }
}

async function renameSpeedMetrics(){
  const a=await analysis();
  const speed=buildSprintEvents(a?.analysisDetail?.speed||{},a?.durationS);
  document.querySelectorAll('.patx-gps-mini').forEach(mini=>{
    const label=mini.querySelector('span'),value=mini.querySelector('strong'),small=mini.querySelector('small');
    if(!label)return;
    const t=(label.textContent||'').trim();
    if(/^Punta robusta$/i.test(t)){
      label.textContent='Velocidad media de sprint alto';
      const peaks=(speed?.sprints||[]).map(x=>Number(x.peakSpeedKmh)).filter(Number.isFinite);
      if(value&&peaks.length)value.textContent=(peaks.reduce((s,v)=>s+v,0)/peaks.length).toFixed(1)+' km/h';
      if(small)small.textContent='Media de las velocidades punta de los sprints detectados.';
    }
    if(/^Esfuerzos\s*>18$/i.test(t))label.textContent='Esfuerzos >18 km/h';
  });
  document.querySelectorAll('.patx-gps-sprint-highlights .patx-gps-mini').forEach(mini=>{
    const label=mini.querySelector('span');
    if(label&&/^Mayor punta$/i.test((label.textContent||'').trim()))label.textContent='Mayor punta de velocidad';
  });
}

async function headerEnhancements(){
  const panel=document.querySelector('.patx-gps-panel');
  if(!panel)return;
  const info=await meta();
  if(!info)return;

  const kicker=panel.querySelector('.patx-gps-kicker');
  if(kicker&&info.match){
    const comp=info.match.competition==='football7'?'FÚTBOL 7':'FÚTBOL SALA';
    kicker.textContent=`${formatDate(info.match.match_date)} · ${comp}`;
  }

  const titleRow=panel.querySelector('.patx-gps-title-row');
  const content=titleRow?.querySelector(':scope > div:not(.patx-v204-player-photo-wrap)');
  if(titleRow&&content&&!titleRow.querySelector('.patx-v204-player-photo-wrap')){
    const wrap=document.createElement('div');
    wrap.className='patx-v204-player-photo-wrap';
    if(info.player?.photo_url){
      wrap.innerHTML=`<img class="patx-v204-player-photo" src="${esc(info.player.photo_url)}" alt="Foto de ${esc(info.player.nickname||'jugador')}" crossorigin="anonymous">`;
    }else{
      wrap.innerHTML=`<span class="patx-v204-player-photo-fallback">${esc((info.player?.nickname||'J').charAt(0).toUpperCase())}</span>`;
    }
    titleRow.insertBefore(wrap,content);
  }

  const context=panel.querySelector('.patx-gps-context-row');
  if(context&&!context.querySelector('[data-v204-compare]')){
    const anchor=context.querySelector('.patx-gps-context-badge.is-calibrated')||context.querySelector('.patx-gps-context-badge');
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='patx-gps-context-badge patx-v204-compare-btn';
    btn.dataset.v204Compare='1';
    btn.dataset.html2canvasIgnore='1';
    btn.textContent='COMPARAR';
    btn.onclick=()=>location.href=`gps-compare.html?match=${encodeURIComponent(matchId)}&player=${encodeURIComponent(playerId)}`;
    anchor?anchor.insertAdjacentElement('afterend',btn):context.prepend(btn);
  }
}

function installBackBridge(){
  if(document.documentElement.dataset.v204BackBridge==='1')return;
  document.documentElement.dataset.v204BackBridge='1';
  document.addEventListener('click',e=>{
    const back=e.target.closest('[data-gps-back]');
    if(!back||window.parent===window)return;
    e.preventDefault();e.stopImmediatePropagation();
    window.parent.postMessage({type:'patx-gps-close-report'},location.origin);
  },true);
}

function loadScript(src,check){
  if(check())return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const existing=[...document.scripts].find(s=>s.src===src);
    if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}
    const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
  });
}

async function savePdf(button){
  const panel=document.querySelector('.patx-gps-panel');
  if(!panel)return;
  const info=await meta();
  button.disabled=true;const oldText=button.textContent;button.textContent='Generando PDF…';
  const details=[...panel.querySelectorAll('details')],states=details.map(d=>d.open);details.forEach(d=>d.open=true);
  try{
    await loadScript('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',()=>!!window.html2canvas);
    await loadScript('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',()=>!!window.jspdf?.jsPDF);
    await new Promise(r=>setTimeout(r,350));
    const canvas=await window.html2canvas(panel,{backgroundColor:'#07100b',scale:1.35,useCORS:true,allowTaint:false,logging:false,imageTimeout:15000,ignoreElements:el=>el.hasAttribute?.('data-html2canvas-ignore')});
    const {jsPDF}=window.jspdf,pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
    const pageW=210,pageH=297,margin=7,imgW=pageW-margin*2,pxPerMm=canvas.width/imgW,pagePx=Math.floor((pageH-margin*2)*pxPerMm);
    let y=0,page=0;
    while(y<canvas.height){
      const sliceH=Math.min(pagePx,canvas.height-y),slice=document.createElement('canvas');slice.width=canvas.width;slice.height=sliceH;
      slice.getContext('2d').drawImage(canvas,0,y,canvas.width,sliceH,0,0,canvas.width,sliceH);
      if(page>0)pdf.addPage();
      pdf.addImage(slice.toDataURL('image/jpeg',0.90),'JPEG',margin,margin,imgW,sliceH/pxPerMm,undefined,'FAST');
      y+=sliceH;page++;
    }
    const name=String(info?.player?.nickname||'Jugador').replace(/[^\p{L}\p{N}_-]+/gu,'_').replace(/^_+|_+$/g,'');
    const date=formatDate(info?.match?.match_date||'');
    pdf.setProperties({title:`Informe de análisis - ${info?.player?.nickname||'Jugador'} - ${date}`,subject:'Informe de análisis GPS del partido',author:'Patxanguilles Antifeixistes'});
    pdf.save(`Informe_analisis_${name||'Jugador'}_${date||'partido'}.pdf`);
  }catch(err){
    console.error('[GPS PDF]',err);
    alert('No se pudo generar el PDF directamente. Se abrirá el diálogo de impresión para guardarlo como PDF.');
    const oldTitle=document.title;document.title=`Informe análisis ${info?.player?.nickname||'Jugador'} ${formatDate(info?.match?.match_date||'')}`;window.print();document.title=oldTitle;
  }finally{
    details.forEach((d,i)=>d.open=states[i]);button.disabled=false;button.textContent=oldText;
  }
}

function mountSaveButton(){
  const panel=document.querySelector('.patx-gps-panel');
  if(!panel||panel.querySelector('[data-v204-save-pdf]'))return;
  const zone=document.createElement('section');zone.className='patx-v204-save-zone';
  zone.innerHTML='<button type="button" class="patx-v204-save-pdf" data-v204-save-pdf data-html2canvas-ignore>Guardar informe</button>';
  panel.appendChild(zone);
  const btn=zone.querySelector('[data-v204-save-pdf]');btn.onclick=()=>savePdf(btn);
}

async function apply(){
  placeRico();styleHighlights();fixProfileRanking();
  await renameSpeedMetrics();await headerEnhancements();mountSaveButton();
}
installBackBridge();
let queued=false;
const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})});
observer.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('resize',apply);
window.addEventListener('patx-gps-analysis-updated',apply);
setTimeout(apply,0);setTimeout(apply,250);setTimeout(apply,900);
