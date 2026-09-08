
(()=>{
  const LOAD_SCRIPT_CACHE=new Map();

  function loadScript(src){
    if(LOAD_SCRIPT_CACHE.has(src))return LOAD_SCRIPT_CACHE.get(src);
    const p=new Promise((resolve,reject)=>{
      const existing=[...document.scripts].find(s=>s.src===src);
      if(existing){
        if(existing.dataset.loaded==='1')return resolve();
        existing.addEventListener('load',()=>resolve(),{once:true});
        existing.addEventListener('error',reject,{once:true});
        return;
      }
      const s=document.createElement('script');
      s.src=src;
      s.async=true;
      s.onload=()=>{s.dataset.loaded='1';resolve()};
      s.onerror=reject;
      document.head.appendChild(s);
    });
    LOAD_SCRIPT_CACHE.set(src,p);
    return p;
  }

  // -------------------------------------------------------
  // A) Fotos de partido: visor / galería
  // -------------------------------------------------------
  let galleryItems=[];
  let galleryIndex=0;
  let galleryHistoryPushed=false;
  let galleryMatchId=null;

  function matchGalleryUrls(m){
    const urls=[];
    const add=u=>{
      const v=String(u||'').trim();
      if(v&&!urls.includes(v))urls.push(v);
    };
    (m?.photos||[]).forEach(p=>add(p?.url));
    add(m?.photoUrl);
    return urls;
  }

  function ensurePhotoGallery(){
    let v=document.getElementById('patxMatchPhotoGallery');
    if(v)return v;
    v=document.createElement('div');
    v.id='patxMatchPhotoGallery';
    v.className='patx-photo-gallery';
    v.setAttribute('aria-hidden','true');
    v.innerHTML=`
      <button class="patx-photo-gallery-close" type="button" aria-label="Cerrar">×</button>
      <button class="patx-photo-gallery-prev" type="button" aria-label="Anterior">‹</button>
      <figure class="patx-photo-gallery-stage">
        <img class="patx-photo-gallery-img" alt="Foto del partido">
        <figcaption class="patx-photo-gallery-counter"></figcaption>
      </figure>
      <button class="patx-photo-gallery-next" type="button" aria-label="Siguiente">›</button>
    `;
    document.body.appendChild(v);
    v.querySelector('.patx-photo-gallery-close').onclick=()=>closeMatchPhotoGallery();
    v.querySelector('.patx-photo-gallery-prev').onclick=e=>{e.stopPropagation();showGalleryIndex(galleryIndex-1)};
    v.querySelector('.patx-photo-gallery-next').onclick=e=>{e.stopPropagation();showGalleryIndex(galleryIndex+1)};
    v.addEventListener('click',e=>{if(e.target===v)closeMatchPhotoGallery()});

    let sx=0,sy=0,moved=false;
    v.addEventListener('touchstart',e=>{
      if(e.touches.length!==1)return;
      sx=e.touches[0].clientX;sy=e.touches[0].clientY;moved=false;
    },{passive:true});
    v.addEventListener('touchmove',e=>{
      if(e.touches.length!==1)return;
      const dx=e.touches[0].clientX-sx,dy=e.touches[0].clientY-sy;
      if(Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy))moved=true;
    },{passive:true});
    v.addEventListener('touchend',e=>{
      if(!moved||!e.changedTouches.length)return;
      const dx=e.changedTouches[0].clientX-sx;
      if(Math.abs(dx)>45)showGalleryIndex(galleryIndex+(dx<0?1:-1));
    },{passive:true});

    return v;
  }

  function showGalleryIndex(i){
    if(!galleryItems.length)return;
    galleryIndex=(i+galleryItems.length)%galleryItems.length;
    const v=ensurePhotoGallery();
    const img=v.querySelector('.patx-photo-gallery-img');
    const prev=v.querySelector('.patx-photo-gallery-prev');
    const next=v.querySelector('.patx-photo-gallery-next');
    const counter=v.querySelector('.patx-photo-gallery-counter');
    img.src=galleryItems[galleryIndex];
    counter.textContent=galleryItems.length>1?`${galleryIndex+1} / ${galleryItems.length}`:'';
    prev.hidden=galleryItems.length<2;
    next.hidden=galleryItems.length<2;
  }

  function openGallery(urls,index=0,matchId=null){
    galleryItems=[...new Set((urls||[]).filter(Boolean))];
    if(!galleryItems.length)return;
    galleryIndex=Math.max(0,Math.min(Number(index)||0,galleryItems.length-1));
    galleryMatchId=matchId;
    const v=ensurePhotoGallery();
    showGalleryIndex(galleryIndex);
    v.classList.add('open');
    v.setAttribute('aria-hidden','false');
    document.body.classList.add('patx-photo-gallery-open');

    if(!galleryHistoryPushed){
      try{
        history.pushState({...history.state,patxPhotoGallery:true},'',location.href);
        galleryHistoryPushed=true;
      }catch(e){}
    }
  }

  window.closeMatchPhotoGallery=function(fromPop=false){
    const v=document.getElementById('patxMatchPhotoGallery');
    if(v){
      v.classList.remove('open');
      v.setAttribute('aria-hidden','true');
    }
    document.body.classList.remove('patx-photo-gallery-open');
    galleryItems=[];galleryIndex=0;galleryMatchId=null;

    if(!fromPop&&galleryHistoryPushed){
      galleryHistoryPushed=false;
      history.back();
    }else if(fromPop){
      galleryHistoryPushed=false;
    }
  };

  window.openMatchPhotoGallery=function(matchId,index=0){
    const m=window.db?.matches?.find?.(x=>String(x.id)===String(matchId));
    if(!m)return;
    openGallery(matchGalleryUrls(m),index,matchId);
  };

  const oldProfilePhotoViewer=window.openPhotoViewer;
  window.openPhotoViewer=function(src){
    if(!src)return;
    openGallery([src],0,null);
  };

  window.addEventListener('popstate',()=>{
    const v=document.getElementById('patxMatchPhotoGallery');
    if(v?.classList.contains('open'))window.closeMatchPhotoGallery(true);
  });

  document.addEventListener('keydown',e=>{
    const v=document.getElementById('patxMatchPhotoGallery');
    if(!v?.classList.contains('open'))return;
    if(e.key==='Escape')window.closeMatchPhotoGallery();
    if(e.key==='ArrowLeft')showGalleryIndex(galleryIndex-1);
    if(e.key==='ArrowRight')showGalleryIndex(galleryIndex+1);
  });

  function decorateMatchDetailPhotos(matchId){
    const m=window.db?.matches?.find?.(x=>String(x.id)===String(matchId));
    if(!m)return;
    const urls=matchGalleryUrls(m);
    document.querySelectorAll('#matchContent .match-photo-view img').forEach((img,i)=>{
      img.classList.add('patx-match-photo-clickable');
      img.setAttribute('role','button');
      img.tabIndex=0;
      const open=ev=>{
        ev.preventDefault();ev.stopPropagation();
        openGallery(urls,Math.min(i,Math.max(0,urls.length-1)),matchId);
      };
      img.onclick=open;
      img.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();open(ev)}};
    });
  }

  if(typeof window.openMatch==='function'){
    const oldOpenMatch=window.openMatch;
    window.openMatch=function(id){
      const r=oldOpenMatch.apply(this,arguments);
      setTimeout(()=>decorateMatchDetailPhotos(id),0);
      return r;
    };
  }

  function primaryMatchPhoto(m){
    return m?.photos?.[0]?.url||m?.photoUrl||'';
  }

  if(typeof window.matchRow==='function'){
    const oldMatchRow=window.matchRow;
    window.matchRow=function(m,compact=false){
      let html=oldMatchRow.apply(this,arguments);
      const photo=primaryMatchPhoto(m);
      if(!photo)return html;

      const thumb=`<img class="${compact?'match-thumb':'calendar-match-thumb'} patx-row-photo-clickable" src="${window.escapeHtml?escapeHtml(photo):photo}" alt="Foto del partido" loading="lazy" onclick="event.stopPropagation();openMatchPhotoGallery('${m.id}',0)">`;

      if(compact){
        if(/<img class="match-thumb\b[^>]*>/i.test(html)){
          html=html.replace(/<img class="match-thumb\b[^>]*>/i,thumb);
        }else{
          html=html.replace(/(<div class="latest-date-line">[\s\S]*?<\/div>)/i,`$1${thumb}`);
        }
      }else{
        if(!/calendar-match-thumb/.test(html)){
          html=html.replace(/(<div class="match-date">[\s\S]*?<\/div>)/i,`$1${thumb}`);
        }
      }
      return html;
    };
  }

  // -------------------------------------------------------
  // B) Reconocimiento de convocatoria desde imagen
  //    1) metadata PNG exacta (v212+)
  //    2) OCR fallback si metadata fue eliminada
  // -------------------------------------------------------
  function crc32(bytes){
    let table=crc32._table;
    if(!table){
      table=new Uint32Array(256);
      for(let n=0;n<256;n++){
        let c=n;
        for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);
        table[n]=c>>>0;
      }
      crc32._table=table;
    }
    let c=0xffffffff;
    for(const b of bytes)c=table[(c^b)&0xff]^(c>>>8);
    return (c^0xffffffff)>>>0;
  }

  function u32be(n){
    return new Uint8Array([(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255]);
  }

  function concatBytes(parts){
    const len=parts.reduce((s,p)=>s+p.length,0);
    const out=new Uint8Array(len);
    let o=0;
    for(const p of parts){out.set(p,o);o+=p.length}
    return out;
  }

  window.embedLineupMetadata=async function(blob,payload){
    try{
      if(!blob||blob.type!=='image/png')return blob;
      const bytes=new Uint8Array(await blob.arrayBuffer());
      const sig=[137,80,78,71,13,10,26,10];
      if(sig.some((v,i)=>bytes[i]!==v))return blob;

      let pos=8,iend=-1;
      while(pos+12<=bytes.length){
        const len=(bytes[pos]<<24)|(bytes[pos+1]<<16)|(bytes[pos+2]<<8)|bytes[pos+3];
        const type=String.fromCharCode(bytes[pos+4],bytes[pos+5],bytes[pos+6],bytes[pos+7]);
        if(type==='IEND'){iend=pos;break}
        pos+=12+(len>>>0);
      }
      if(iend<0)return blob;

      const enc=new TextEncoder();
      const keyword=enc.encode('PATX_LINEUP');
      const json=enc.encode(JSON.stringify(payload||{}));
      const data=concatBytes([keyword,new Uint8Array([0]),json]);
      const type=enc.encode('tEXt');
      const crc=u32be(crc32(concatBytes([type,data])));
      const chunk=concatBytes([u32be(data.length),type,data,crc]);

      return new Blob([bytes.slice(0,iend),chunk,bytes.slice(iend)],{type:'image/png'});
    }catch(err){
      console.warn('[convocatoria imagen] no se pudo incrustar metadata',err);
      return blob;
    }
  };

  async function readLineupMetadata(file){
    try{
      const bytes=new Uint8Array(await file.arrayBuffer());
      const sig=[137,80,78,71,13,10,26,10];
      if(sig.some((v,i)=>bytes[i]!==v))return null;

      let pos=8;
      const dec=new TextDecoder();
      while(pos+12<=bytes.length){
        const len=((bytes[pos]<<24)|(bytes[pos+1]<<16)|(bytes[pos+2]<<8)|bytes[pos+3])>>>0;
        const type=String.fromCharCode(bytes[pos+4],bytes[pos+5],bytes[pos+6],bytes[pos+7]);
        const dataStart=pos+8,dataEnd=dataStart+len;
        if(dataEnd>bytes.length)break;
        if(type==='tEXt'){
          const data=bytes.slice(dataStart,dataEnd);
          const zero=data.indexOf(0);
          if(zero>0){
            const key=dec.decode(data.slice(0,zero));
            if(key==='PATX_LINEUP'){
              const raw=dec.decode(data.slice(zero+1));
              const parsed=JSON.parse(raw);
              if(parsed&&Array.isArray(parsed.red)&&Array.isArray(parsed.black))return parsed;
            }
          }
        }
        if(type==='IEND')break;
        pos=dataEnd+4;
      }
    }catch(err){
      console.warn('[convocatoria imagen] metadata ilegible',err);
    }
    return null;
  }

  function normalizeName(v){
    return String(v||'')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .toLowerCase().replace(/[’'`´]/g,'')
      .replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  }

  function levenshtein(a,b){
    a=normalizeName(a);b=normalizeName(b);
    const m=a.length,n=b.length;
    if(!m)return n;if(!n)return m;
    const prev=Array.from({length:n+1},(_,i)=>i),cur=new Array(n+1);
    for(let i=1;i<=m;i++){
      cur[0]=i;
      for(let j=1;j<=n;j++){
        cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));
      }
      for(let j=0;j<=n;j++)prev[j]=cur[j];
    }
    return prev[n];
  }

  function bestRosterMatch(text,roster){
    const n=normalizeName(text);
    if(!n)return null;
    let best=null,score=Infinity;

    for(const name of roster){
      const rn=normalizeName(name);
      if(!rn)continue;
      if(n===rn||n.includes(rn)||rn.includes(n)){
        const diff=Math.abs(n.length-rn.length);
        if(diff<score){score=diff;best=name}
        continue;
      }
      const d=levenshtein(n,rn);
      const maxLen=Math.max(n.length,rn.length);
      const ok=d<=1||(maxLen>=6&&d<=2);
      if(ok&&d<score){score=d;best=name}
    }
    return best;
  }

  function imageSize(file){
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file),img=new Image();
      img.onload=()=>{resolve({width:img.naturalWidth,height:img.naturalHeight});URL.revokeObjectURL(url)};
      img.onerror=e=>{URL.revokeObjectURL(url);reject(e)};
      img.src=url;
    });
  }

  function setResultImageStatus(text,type=''){
    const el=document.getElementById('resultImageCallupStatus');
    if(!el)return;
    el.textContent=text||'';
    el.style.display=text?'':'none';
    el.dataset.state=type;
  }

  function applyDetectedTeams(red,black,meta=null){
    const redClean=[...new Set((red||[]).filter(Boolean))];
    const blackClean=[...new Set((black||[]).filter(Boolean))];
    if(typeof window.renderChecks==='function'){
      window.renderChecks('redChecks',redClean,'red');
      window.renderChecks('blackChecks',blackClean,'black');
    }else{
      const set=(id,names)=>{
        document.querySelectorAll(`#${id} input[type="checkbox"]`).forEach(x=>x.checked=names.includes(x.value));
      };
      set('redChecks',redClean);set('blackChecks',blackClean);
    }
    if(meta?.date){
      const d=document.getElementById('matchDate');
      if(d)d.value=meta.date;
    }
    setResultImageStatus(`Convocatoria reconocida: ${redClean.length} roj@s y ${blackClean.length} negr@s. Revisa y corrige si hace falta.`,'ok');
  }

  async function detectLineupByOcr(file){
    const roster=[...document.querySelectorAll('#redChecks input[type="checkbox"]')].map(x=>x.value);
    if(!roster.length)throw new Error('No se encontró la plantilla de jugadores');

    await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
    const size=await imageSize(file);
    setResultImageStatus('Leyendo nombres de la imagen… el VAR está revisando la toma.','loading');

    const result=await window.Tesseract.recognize(file,'eng',{
      logger:m=>{
        if(m.status==='recognizing text'&&Number.isFinite(m.progress)){
          setResultImageStatus(`Reconociendo convocatoria… ${Math.round(m.progress*100)}%`,'loading');
        }
      }
    });

    const lines=(result?.data?.lines||[]).map(x=>({text:x.text||'',bbox:x.bbox||{}}));
    const red=[],black=[],seen=new Set();

    for(const line of lines){
      const hit=bestRosterMatch(line.text,roster);
      if(!hit||seen.has(hit))continue;
      const b=line.bbox||{};
      const cy=((Number(b.y0)||0)+(Number(b.y1)||0))/2;
      // Las imágenes de alineación de Patxanguilles colocan negro arriba y rojo abajo.
      if(cy<size.height*0.52)black.push(hit);
      else red.push(hit);
      seen.add(hit);
    }

    if(!red.length&&!black.length)throw new Error('No he podido reconocer nombres con suficiente seguridad');
    return {red,black,source:'ocr'};
  }

  window.importResultLineupImage=async function(input){
    const file=input?.files?.[0];
    if(!file)return;
    try{
      setResultImageStatus('Analizando imagen de convocatoria…','loading');
      const meta=await readLineupMetadata(file);
      if(meta){
        applyDetectedTeams(meta.red,meta.black,meta);
        return;
      }

      setResultImageStatus('La imagen no conserva la firma interna. Intentando reconocimiento visual…','loading');
      const ocr=await detectLineupByOcr(file);
      applyDetectedTeams(ocr.red,ocr.black,null);
    }catch(err){
      console.error(err);
      setResultImageStatus(`No se pudo reconocer automáticamente: ${err?.message||'imagen no compatible'}. Puedes usar la convocatoria de texto o marcar jugadores manualmente.`,'error');
    }
  };

  function injectImageCallupImport(){
    if(document.getElementById('resultCallupImage'))return;
    const textBox=document.querySelector('#resultForm .result-callup-import');
    if(!textBox)return;
    const box=document.createElement('div');
    box.className='result-image-import';
    box.innerHTML=`
      <div class="result-image-import-copy">
        <strong>🖼️ O sube la convocatoria en imagen</strong>
        <span>Reconoce automáticamente l@s jugador@s y el color de cada equipo.</span>
      </div>
      <label class="secondary result-image-import-btn">
        Elegir imagen
        <input id="resultCallupImage" type="file" accept="image/png,image/jpeg,image/webp" hidden onchange="importResultLineupImage(this)">
      </label>
      <div id="resultImageCallupStatus" class="coach-callup-warning" style="display:none"></div>
    `;
    textBox.insertAdjacentElement('afterend',box);
  }

  // -------------------------------------------------------
  // C) Ajustes generales de interfaz
  // -------------------------------------------------------
  function applyUiFixes(){
    injectImageCallupImport();
  }

  // Guardamos modo para la importación si se abre desde selector.
  if(typeof window.openResultMode==='function'){
    const oldOpenResultMode=window.openResultMode;
    window.openResultMode=function(mode){
      window.__patxResultMode=mode;
      return oldOpenResultMode.apply(this,arguments);
    };
  }

  const obs=new MutationObserver(()=>applyUiFixes());
  obs.observe(document.documentElement,{childList:true,subtree:true});

  setTimeout(applyUiFixes,0);
  setTimeout(applyUiFixes,400);
})();
