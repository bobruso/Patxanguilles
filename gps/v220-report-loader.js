(()=>{
  const phrases=[
    'Convirtiendo sufrimiento en gráficos.',
    'Preguntando al reloj si de verdad corriste tanto.',
    'Buscando el minuto exacto en que se acabó la gasolina.',
    'Separando sprints reales de carreras a por el balón fuera.',
    'Calculando cuántos metros fueron fútbol y cuántos supervivencia.',
    'Consultando al VAR de las pulsaciones.',
    'Detectando si ese sprint fue presión alta o pánico defensivo.',
    'Negociando con tus pulsaciones para que bajen de una vez.',
    'Reconstruyendo 60 minutos que tus piernas preferirían olvidar.',
    'Buscando una explicación científica para el último cuarto de hora.',
    'Midiendo el desgaste con una precisión innecesariamente seria.',
    'Comprobando si la Ley Rico también aparece en los datos.',
    'Traduciendo jadeos a métricas de rendimiento.',
    'Preparando argumentos estadísticos para la tertulia postpartido.'
  ];

  const overlay=document.getElementById('gpsReportLoadingV217');
  const phrase=document.getElementById('gpsReportLoadingPhraseV217');
  const root=document.getElementById('gpsReport');
  if(!overlay)return;

  const started=performance.now();
  let pos=Math.floor(Math.random()*phrases.length);
  let finished=false;
  let observer=null;

  function nextPhrase(){
    if(phrase)phrase.textContent=phrases[pos++%phrases.length];
  }

  function hide(){
    if(finished)return;
    finished=true;
    clearInterval(timer);
    if(observer)observer.disconnect();
    const elapsed=performance.now()-started;
    setTimeout(()=>{
      overlay.classList.add('is-ready');
      setTimeout(()=>overlay.remove(),420);
    },Math.max(0,650-elapsed));
  }

  function check(){
    if(finished||!root)return;
    const panel=root.querySelector('.patx-gps-panel');
    if(panel){
      // El informe principal ya está montado. Desde v220 no esperamos
      // ningún servicio de mapas externo para mostrarlo.
      requestAnimationFrame(()=>requestAnimationFrame(hide));
      return;
    }
    const text=(root.textContent||'').trim();
    if(text && text!=='Cargando análisis GPS…' && !text.startsWith('Cargando análisis GPS')) hide();
  }

  nextPhrase();
  const timer=setInterval(nextPhrase,1650);
  if(root){
    observer=new MutationObserver(()=>requestAnimationFrame(check));
    observer.observe(root,{childList:true,subtree:true,characterData:true});
  }
  window.addEventListener('patx-gps-analysis-updated',()=>setTimeout(check,0));
  setTimeout(check,0);
  setTimeout(check,250);
  setTimeout(check,700);
  // Red de seguridad: el loading nunca puede bloquear la navegación.
  setTimeout(hide,6000);
})();
