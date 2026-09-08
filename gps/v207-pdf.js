(()=>{
  const MARGIN=8, GAP=4, PAGE_W=210, PAGE_H=297;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  function loadScript(src,check){
    if(check())return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
    });
  }
  async function loadAny(urls,check){
    if(check())return;
    let last=null;
    for(const url of urls){
      try{await loadScript(url,check);if(check())return}catch(err){last=err}
    }
    throw last||new Error('No se pudo cargar la librería PDF');
  }
  function visible(el){
    if(!el||!(el instanceof HTMLElement))return false;
    const cs=getComputedStyle(el);
    return cs.display!=='none'&&cs.visibility!=='hidden'&&el.offsetWidth>0&&el.offsetHeight>0;
  }
  function collectBlocks(panel){
    const blocks=[],add=el=>{if(visible(el)&&!blocks.includes(el))blocks.push(el)};
    [...panel.children].forEach(child=>{
      if(child.matches('.patx-v204-save-zone,.patx-gps-admin-zone'))return;
      if(child.matches('.patx-gps-map-grid')){[...child.children].forEach(add);return}
      if(child.matches('details.patx-gps-details')){
        add(child.querySelector(':scope > summary'));
        const body=child.querySelector('.patx-gps-details-body');
        if(body)[...body.children].forEach(add);
        return;
      }
      add(child);
    });
    return blocks;
  }
  function fallbackCanvas(el){
    const source=el.querySelector?.('canvas');
    if(source&&source.width&&source.height){
      const title=(el.querySelector('strong')?.textContent||'Mapa').trim();
      const w=Math.max(900,source.width),top=70,h=top+Math.round(source.height*(w/source.width));
      const c=document.createElement('canvas');c.width=w;c.height=h;
      const ctx=c.getContext('2d');ctx.fillStyle='#07100b';ctx.fillRect(0,0,w,h);
      ctx.fillStyle='#fff';ctx.font='700 30px system-ui';ctx.fillText(title,24,44);
      ctx.drawImage(source,0,top,w,h-top);return c;
    }
    const text=(el?.innerText||el?.textContent||'').trim().replace(/\s+/g,' ');
    const c=document.createElement('canvas');c.width=1200;c.height=260;
    const ctx=c.getContext('2d');ctx.fillStyle='#07100b';ctx.fillRect(0,0,c.width,c.height);
    ctx.fillStyle='#fff';ctx.font='24px system-ui';
    let line='',y=44;
    for(const word of text.split(' ')){
      const test=line?line+' '+word:word;
      if(ctx.measureText(test).width>1120){ctx.fillText(line,38,y);line=word;y+=34;if(y>230)break}
      else line=test;
    }
    if(line&&y<=230)ctx.fillText(line,38,y);
    return c;
  }
  async function capture(el){
    try{
      return await window.html2canvas(el,{
        backgroundColor:'#07100b',
        scale:Math.min(1.6,Math.max(1.15,window.devicePixelRatio||1)),
        useCORS:true,allowTaint:false,logging:false,imageTimeout:15000,removeContainer:true
      });
    }catch(err){
      console.warn('[PDF] fallback de bloque',err);
      return fallbackCanvas(el);
    }
  }
  function cleanFilename(v){
    return String(v||'Jugador').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^\w-]+/g,'_').replace(/^_+|_+$/g,'')||'Jugador';
  }
  async function generatePdf(button){
    const panel=document.querySelector('.patx-gps-panel');if(!panel)return;
    const oldText=button.textContent;button.disabled=true;button.textContent='Generando PDF…';
    const details=[...panel.querySelectorAll('details')],states=details.map(d=>d.open);
    details.forEach(d=>d.open=true);
    document.documentElement.classList.add('patx-v207-pdf-exporting');
    try{
      await loadAny([
        'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
      ],()=>!!window.html2canvas);
      await loadAny([
        'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
      ],()=>!!window.jspdf?.jsPDF);
      await sleep(300);
      const {jsPDF}=window.jspdf;
      const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
      const usableW=PAGE_W-MARGIN*2,usableH=PAGE_H-MARGIN*2;
      let y=MARGIN;
      const blocks=collectBlocks(panel);
      if(!blocks.length)throw new Error('No se encontraron bloques del informe');
      for(const block of blocks){
        const canvas=await capture(block);if(!canvas?.width||!canvas?.height)continue;
        let w=usableW,h=canvas.height/canvas.width*w;
        if(h>usableH){const scale=usableH/h;h*=scale;w*=scale}
        if(y+h>PAGE_H-MARGIN&&y>MARGIN+1){pdf.addPage();y=MARGIN}
        const x=MARGIN+(usableW-w)/2;
        pdf.addImage(canvas.toDataURL('image/jpeg',0.91),'JPEG',x,y,w,h,undefined,'FAST');
        y+=h+GAP;
      }
      const player=(panel.querySelector('.patx-gps-title-row h3')?.textContent||'Jugador').trim();
      const kicker=(panel.querySelector('.patx-gps-kicker')?.textContent||'').trim();
      const date=(kicker.match(/\b\d{1,2}-\d{1,2}-\d{4}\b/)||[])[0]||'partido';
      pdf.setProperties({title:`Informe de análisis - ${player} - ${date}`,subject:'Informe de análisis GPS del partido',author:'Patxanguilles Antifeixistes'});
      pdf.save(`Informe_analisis_${cleanFilename(player)}_${date}.pdf`);
    }catch(err){
      console.error('[PDF v207]',err);
      alert('No se pudo generar el PDF automáticamente. Se abrirá la impresión con saltos preparados para no cortar los bloques.');
      window.print();
    }finally{
      details.forEach((d,i)=>d.open=states[i]);
      document.documentElement.classList.remove('patx-v207-pdf-exporting');
      button.disabled=false;button.textContent=oldText;
    }
  }
  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('[data-v204-save-pdf]');if(!btn)return;
    e.preventDefault();e.stopImmediatePropagation();generatePdf(btn);
  },true);
})();