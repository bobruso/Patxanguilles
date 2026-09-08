
(()=>{
  const PAGE={w:210,h:297,margin:8,gap:4};
  const DARK=[7,16,11];
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  function loadScript(src,check){
    if(check())return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const existing=[...document.scripts].find(s=>s.src===src);
      if(existing){
        existing.addEventListener('load',resolve,{once:true});
        existing.addEventListener('error',reject,{once:true});
        return;
      }
      const s=document.createElement('script');
      s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
    });
  }

  async function loadAny(urls,check){
    if(check())return;
    let last;
    for(const u of urls){
      try{await loadScript(u,check);if(check())return}catch(e){last=e}
    }
    throw last||new Error('No se pudieron cargar las librerías PDF');
  }

  function visible(el){
    if(!el||!(el instanceof HTMLElement))return false;
    const cs=getComputedStyle(el);
    return cs.display!=='none'&&cs.visibility!=='hidden'&&el.offsetWidth>0&&el.offsetHeight>0;
  }

  function blocks(panel){
    const out=[],add=el=>{if(visible(el)&&!out.includes(el))out.push(el)};
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
    return out;
  }

  async function capture(el){
    return window.html2canvas(el,{
      backgroundColor:'#07100b',
      scale:1.45,
      useCORS:true,
      allowTaint:false,
      logging:false,
      imageTimeout:18000,
      removeContainer:true
    });
  }

  function fillPage(pdf){
    pdf.setFillColor(...DARK);
    pdf.rect(0,0,PAGE.w,PAGE.h,'F');
  }

  function clean(v){
    return String(v||'Jugador').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^\w-]+/g,'_').replace(/^_+|_+$/g,'')||'Jugador';
  }

  async function makePdf(btn){
    const panel=document.querySelector('.patx-gps-panel');if(!panel)return;
    const original=btn.textContent;
    btn.disabled=true;btn.textContent='Maquetando PDF…';

    const details=[...panel.querySelectorAll('details')],states=details.map(d=>d.open);
    details.forEach(d=>d.open=true);
    document.documentElement.classList.add('patx-v212-pdf-exporting');

    try{
      await loadAny([
        'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
      ],()=>!!window.html2canvas);

      await loadAny([
        'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
      ],()=>!!window.jspdf?.jsPDF);

      await sleep(450);
      const {jsPDF}=window.jspdf;
      const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
      fillPage(pdf);

      const usableW=PAGE.w-PAGE.margin*2;
      const usableH=PAGE.h-PAGE.margin*2-5;
      let y=PAGE.margin;

      for(const el of blocks(panel)){
        const c=await capture(el);
        if(!c?.width||!c?.height)continue;

        let w=usableW,h=c.height/c.width*w;
        if(h>usableH){
          const s=usableH/h;h*=s;w*=s;
        }

        if(y+h>PAGE.h-PAGE.margin-5&&y>PAGE.margin+1){
          pdf.addPage();fillPage(pdf);y=PAGE.margin;
        }

        const x=PAGE.margin+(usableW-w)/2;
        pdf.addImage(c.toDataURL('image/jpeg',.94),'JPEG',x,y,w,h,undefined,'FAST');
        y+=h+PAGE.gap;
      }

      const count=pdf.getNumberOfPages();
      for(let i=1;i<=count;i++){
        pdf.setPage(i);
        pdf.setTextColor(120,136,127);
        pdf.setFontSize(7.5);
        pdf.text(`PATXANGUILLES · INFORME GPS · ${i}/${count}`,PAGE.w/2,PAGE.h-3.2,{align:'center'});
      }

      const player=(panel.querySelector('.patx-gps-title-row h3')?.textContent||'Jugador').trim();
      const kicker=(panel.querySelector('.patx-gps-kicker')?.textContent||'').trim();
      const date=(kicker.match(/\b\d{1,2}-\d{1,2}-\d{4}\b/)||[])[0]||'partido';
      pdf.setProperties({
        title:`Informe de análisis - ${player} - ${date}`,
        subject:'Informe de análisis GPS del partido',
        author:'Patxanguilles Antifeixistes'
      });
      pdf.save(`Informe_analisis_${clean(player)}_${date}.pdf`);
    }catch(err){
      console.error('[PDF v212]',err);
      alert('No se pudo generar el PDF automáticamente. Se abrirá la impresión con el fondo oscuro y saltos preparados.');
      window.print();
    }finally{
      details.forEach((d,i)=>d.open=states[i]);
      document.documentElement.classList.remove('patx-v212-pdf-exporting');
      btn.disabled=false;btn.textContent=original;
    }
  }

  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('[data-v204-save-pdf]');
    if(!btn)return;
    e.preventDefault();e.stopImmediatePropagation();
    makePdf(btn);
  },true);
})();
