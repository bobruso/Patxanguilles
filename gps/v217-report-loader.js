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
  if(!overlay)return;

  const started=performance.now();
  let pos=Math.floor(Math.random()*phrases.length);
  let finished=false;

  function nextPhrase(){
    if(phrase)phrase.textContent=phrases[pos++%phrases.length];
  }

  function hide(){
    if(finished)return;
    finished=true;
    clearInterval(timer);
    const elapsed=performance.now()-started;
    setTimeout(()=>{
      overlay.classList.add('is-ready');
      setTimeout(()=>overlay.remove(),420);
    },Math.max(0,650-elapsed));
  }

  nextPhrase();
  const timer=setInterval(nextPhrase,1650);

  window.addEventListener('patx-gps-terrain-ready',hide,{once:true});

  const root=document.getElementById('gpsReport');
  if(root){
    const obs=new MutationObserver(()=>{
      const panel=root.querySelector('.patx-gps-panel');
      const text=(root.textContent||'').trim();
      if(!panel&&text&&text!=='Cargando análisis GPS…'&&!text.startsWith('Cargando análisis GPS')){
        obs.disconnect();hide();
      }
    });
    obs.observe(root,{childList:true,subtree:true,characterData:true});
  }

  // Nunca dejar al usuario atrapado detrás del loading si un servicio externo falla.
  setTimeout(hide,10000);
})();
