
(()=>{
  const qs=(s,r=document)=>r.querySelector(s), qsa=(s,r=document)=>[...r.querySelectorAll(s)];
  const getMatch=id=>{try{return window.__patxGetMatchById?.(id)||null}catch(e){return null}};
  const urlsFor=m=>{const a=[];const add=u=>{u=String(u||'').trim();if(u&&!a.includes(u))a.push(u)};(m?.photos||[]).forEach(p=>add(p?.url));add(m?.photoUrl);return a};

  let galleryItems=[],galleryIndex=0,galleryHistory=false;
  function ensureGallery(){
    let v=qs('#patxMatchGalleryV213'); if(v)return v;
    v=document.createElement('div'); v.id='patxMatchGalleryV213'; v.className='patx-match-gallery-v213'; v.setAttribute('aria-hidden','true');
    v.innerHTML=`<button type="button" class="patx-match-gallery-close">×</button><button type="button" class="patx-match-gallery-prev">‹</button><div class="patx-match-gallery-stage"><img class="patx-match-gallery-image" alt="Foto del partido"><div class="patx-match-gallery-count"></div></div><button type="button" class="patx-match-gallery-next">›</button>`;
    document.body.appendChild(v);
    qs('.patx-match-gallery-close',v).onclick=()=>closeGallery();
    qs('.patx-match-gallery-prev',v).onclick=e=>{e.stopPropagation();showGallery(galleryIndex-1)};
    qs('.patx-match-gallery-next',v).onclick=e=>{e.stopPropagation();showGallery(galleryIndex+1)};
    v.onclick=e=>{if(e.target===v)closeGallery()};
    let sx=0,sy=0;
    v.addEventListener('touchstart',e=>{if(e.touches.length===1){sx=e.touches[0].clientX;sy=e.touches[0].clientY}},{passive:true});
    v.addEventListener('touchend',e=>{if(e.changedTouches.length!==1)return;const dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy))showGallery(galleryIndex+(dx<0?1:-1))},{passive:true});
    return v;
  }
  function showGallery(i){
    if(!galleryItems.length)return;
    galleryIndex=(i+galleryItems.length)%galleryItems.length;
    const v=ensureGallery(),img=qs('.patx-match-gallery-image',v),count=qs('.patx-match-gallery-count',v),prev=qs('.patx-match-gallery-prev',v),next=qs('.patx-match-gallery-next',v);
    img.src=galleryItems[galleryIndex]; count.textContent=galleryItems.length>1?`${galleryIndex+1} / ${galleryItems.length}`:'';
    prev.hidden=galleryItems.length<2; next.hidden=galleryItems.length<2;
  }
  function openGallery(urls,start=0){
    galleryItems=[...new Set((urls||[]).filter(Boolean))]; if(!galleryItems.length)return;
    galleryIndex=Math.max(0,Math.min(Number(start)||0,galleryItems.length-1));
    const v=ensureGallery(); showGallery(galleryIndex); v.classList.add('open'); v.setAttribute('aria-hidden','false'); document.body.classList.add('patx-match-gallery-open');
    if(!galleryHistory){try{history.pushState({...history.state,patxMatchGalleryV213:true},'',location.href);galleryHistory=true}catch(e){}}
  }
  function closeGallery(fromPop=false){
    const v=qs('#patxMatchGalleryV213'); if(v){v.classList.remove('open');v.setAttribute('aria-hidden','true')}
    document.body.classList.remove('patx-match-gallery-open'); galleryItems=[];galleryIndex=0;
    if(!fromPop&&galleryHistory){galleryHistory=false;history.back()} else if(fromPop)galleryHistory=false;
  }
  window.openMatchPhotoGallery=function(matchId,start=0){const m=getMatch(matchId);if(m)openGallery(urlsFor(m),start)};
  window.closeMatchPhotoGalleryV213=()=>closeGallery();
  window.addEventListener('popstate',()=>{const v=qs('#patxMatchGalleryV213');if(v?.classList.contains('open'))closeGallery(true)});
  document.addEventListener('keydown',e=>{const v=qs('#patxMatchGalleryV213');if(!v?.classList.contains('open'))return;if(e.key==='Escape')closeGallery();if(e.key==='ArrowLeft')showGallery(galleryIndex-1);if(e.key==='ArrowRight')showGallery(galleryIndex+1)});

  function decorateMatch(id){
    const m=getMatch(id); if(!m)return; const urls=urlsFor(m);
    qsa('#matchContent .match-photo-view img').forEach((img,i)=>{
      img.classList.add('patx-match-photo-clickable'); img.tabIndex=0; img.setAttribute('role','button');
      const open=e=>{e?.preventDefault?.();e?.stopPropagation?.();openGallery(urls,Math.min(i,Math.max(0,urls.length-1)))};
      img.onclick=open; img.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(e)}};
    });
  }
  if(typeof window.openMatch==='function'){
    const prev=window.openMatch;
    window.openMatch=function(id){const r=prev.apply(this,arguments);requestAnimationFrame(()=>decorateMatch(id));setTimeout(()=>decorateMatch(id),120);return r};
  }
  if(typeof window.matchRow==='function'){
    const prev=window.matchRow;
    window.matchRow=function(m,compact=false){
      let html=prev.apply(this,arguments), photo=m?.photos?.[0]?.url||m?.photoUrl||''; if(!photo||/patx-row-photo-clickable/.test(html))return html;
      const esc=typeof window.escapeHtml==='function'?window.escapeHtml(photo):String(photo).replace(/"/g,'&quot;'), cls=compact?'match-thumb':'calendar-match-thumb';
      const im=`<img class="${cls} patx-row-photo-clickable" src="${esc}" alt="Foto del partido" loading="lazy" onclick="event.stopPropagation();openMatchPhotoGallery('${m.id}',0)">`;
      return compact?html.replace(/(<div class="latest-date-line">[\s\S]*?<\/div>)/i,`$1${im}`):html.replace(/(<div class="match-date">[\s\S]*?<\/div>)/i,`$1${im}`);
    };
  }

  const CDN='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js', TW=1649,TH=2048;
  const SLOTS=[
    ['black',824,320],['black',500,595],['black',824,595],['black',1148,595],['black',650,775],['black',998,775],['black',824,945],
    ['red',824,1185],['red',650,1395],['red',998,1395],['red',500,1610],['red',824,1610],['red',1148,1610],['red',824,1850]
  ];
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  function lev(a,b){a=norm(a);b=norm(b);const m=a.length,n=b.length;if(!m)return n;if(!n)return m;const p=Array.from({length:n+1},(_,i)=>i),c=new Array(n+1);for(let i=1;i<=m;i++){c[0]=i;for(let j=1;j<=n;j++)c[j]=Math.min(c[j-1]+1,p[j]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));for(let j=0;j<=n;j++)p[j]=c[j]}return p[n]}
  function best(raw,roster,seen){
    const t=norm(raw); if(!t)return null; const vars=[t,...t.split(' ')].filter(Boolean); let hit=null,score=99;
    for(const name of roster){if(seen.has(name))continue;const c=norm(name);for(const v of vars){if(v===c)return name;if(v.includes(c)||c.includes(v)){const s=Math.abs(v.length-c.length);if(s<score){score=s;hit=name}}else{const d=lev(v,c),ml=Math.max(v.length,c.length),s=d/Math.max(1,ml);if((d<=2||(ml>=7&&d<=3&&s<.34))&&s<score){score=s;hit=name}}}}
    return hit;
  }
  function st(text,state=''){const el=qs('#resultImageCallupStatus');if(el){el.textContent=text;el.style.display=text?'':'none';el.dataset.state=state}}
  function loadTess(){if(window.Tesseract?.createWorker)return Promise.resolve();return new Promise((res,rej)=>{const old=[...document.scripts].find(s=>s.src===CDN);if(old){old.addEventListener('load',res,{once:true});old.addEventListener('error',rej,{once:true});return}const s=document.createElement('script');s.src=CDN;s.async=true;s.onload=res;s.onerror=rej;document.head.appendChild(s)})}
  function loadImg(file){return new Promise((res,rej)=>{const u=URL.createObjectURL(file),i=new Image();i.onload=()=>{URL.revokeObjectURL(u);res(i)};i.onerror=e=>{URL.revokeObjectURL(u);rej(e)};i.src=u})}
  function readMeta(file){return file.arrayBuffer().then(buf=>{const b=new Uint8Array(buf),sig=[137,80,78,71,13,10,26,10];if(sig.some((v,i)=>b[i]!==v))return null;const dec=new TextDecoder();let p=8;while(p+12<=b.length){const len=((b[p]<<24)|(b[p+1]<<16)|(b[p+2]<<8)|b[p+3])>>>0,type=String.fromCharCode(b[p+4],b[p+5],b[p+6],b[p+7]),a=p+8,z=a+len;if(z>b.length)break;if(type==='tEXt'){const d=b.slice(a,z),n=d.indexOf(0);if(n>0&&dec.decode(d.slice(0,n))==='PATX_LINEUP'){try{const j=JSON.parse(dec.decode(d.slice(n+1)));if(Array.isArray(j?.red)&&Array.isArray(j?.black))return j}catch(e){}}}if(type==='IEND')break;p=z+4}return null}).catch(()=>null)}
  function crop(img,slot,thr){
    const [team,x,y]=slot,sx=img.naturalWidth/TW,sy=img.naturalHeight/TH,cx=x*sx,cy=(y+129)*sy,sw=330*sx,sh=76*sy,sx0=Math.max(0,cx-sw/2),sy0=Math.max(0,cy-sh/2),scale=3;
    const c=document.createElement('canvas');c.width=Math.max(160,Math.round(sw*scale));c.height=Math.max(50,Math.round(sh*scale));const ctx=c.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(img,sx0,sy0,sw,sh,0,0,c.width,c.height);const d=ctx.getImageData(0,0,c.width,c.height);
    for(let i=0;i<d.data.length;i+=4){const lum=.2126*d.data[i]+.7152*d.data[i+1]+.0722*d.data[i+2],v=lum>thr?0:255;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255}
    ctx.putImageData(d,0,0);return c;
  }
  function roster(){return [...new Set(qsa('#redChecks input[type="checkbox"],#blackChecks input[type="checkbox"]').map(x=>x.value).filter(Boolean))]}
  function applyTeams(red,black,meta=null){
    red=[...new Set(red)];black=[...new Set(black)];
    if(typeof window.renderChecks==='function'){window.renderChecks('redChecks',red,'red');window.renderChecks('blackChecks',black,'black')}
    else{for(const [id,names] of [['redChecks',red],['blackChecks',black]])qsa(`#${id} input`).forEach(x=>x.checked=names.includes(x.value))}
    if(meta?.date&&qs('#matchDate'))qs('#matchDate').value=meta.date;
    st(`Convocatoria reconocida: ${red.length} roj@s y ${black.length} negr@s. Revisa y corrige si hace falta.`,'ok');
  }
  async function recognizeTemplate(file){
    const img=await loadImg(file),ratio=img.naturalWidth/img.naturalHeight;
    if(Math.abs(ratio-TW/TH)>.06)throw new Error('la imagen no coincide con el formato F7 generado por Patxanguilles');
    const r=roster();if(!r.length)throw new Error('no encuentro la plantilla de jugadores');
    await loadTess();const worker=await window.Tesseract.createWorker('eng',1,{logger:()=>{}});
    await worker.setParameters({tessedit_pageseg_mode:'8',tessedit_char_whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'});
    const red=[],black=[],seen=new Set();
    try{
      for(let i=0;i<SLOTS.length;i++){
        st(`Leyendo las 14 etiquetas del campo… ${i+1}/14`,'loading');let hit=null;
        for(const thr of [150,185]){const rr=await worker.recognize(crop(img,SLOTS[i],thr));hit=best(rr?.data?.text||'',r,seen);if(hit)break}
        if(hit){seen.add(hit);(SLOTS[i][0]==='black'?black:red).push(hit)}
      }
    }finally{await worker.terminate()}
    if(red.length+black.length<8)throw new Error(`solo he leído ${red.length+black.length} nombres con seguridad`);
    return {red,black};
  }
  window.importResultLineupImage=async function(input){
    const file=input?.files?.[0];if(!file)return;
    try{
      st('Analizando imagen de convocatoria…','loading');
      const meta=await readMeta(file);if(meta){applyTeams(meta.red,meta.black,meta);return}
      st('La firma interna no está disponible. Leyendo las cartelas una a una…','loading');
      const d=await recognizeTemplate(file);applyTeams(d.red,d.black);
    }catch(err){console.error('[convocatoria v213]',err);st(`No se pudo completar el reconocimiento: ${err?.message||'imagen no compatible'}. Puedes corregirla manualmente.`,'error')}
  };
})();
