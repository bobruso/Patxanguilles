(()=>{
  'use strict';

  const VERSION='237';

  function historyEntryHtml(){
    return `<section class="history-change-section" data-history-version="${VERSION}"><div class="history-section-number">${VERSION}</div><div class="history-section-content"><h2>Bienvenida musical y convocatoria rápida</h2><ul><li>Al entrar en la web, un aviso pregunta una sola vez por sesión si se quiere escuchar el playlist futbolero; «Sí» arranca el reproductor y «No» lo deja en pausa.</li><li>El balón de ENTRAR desaparece: al responder al aviso aparecen los cuatro accesos de la Home.</li><li>La música ya no se inicia sola con el primer clic en cualquier parte de la web.</li><li>Nueva tarjeta «Pegar convocatoria WhatsApp»: analiza el texto pegado, detecta la modalidad y prepara los equipos con el algoritmo o con una sala del Modo Entrenador.</li></ul></div></section>`;
  }

  /* Capas anteriores (v214, v236) inyectan su historial al cargar y pueden
     dejar la cabecera en una versión antigua. Esta capa se ejecuta después y
     vuelve a fijar la cabecera y a colocar la entrada v237 como primera. */
  function injectHistoryV237(){
    const history=document.querySelector('#changeHistory .history-wrap');
    const header=history?.querySelector('.history-header');
    if(!history||!header)return;

    const versionLabel=header.querySelector('.history-version');
    if(versionLabel)versionLabel.textContent='VERSIÓN v'+VERSION;

    let section=history.querySelector(`[data-history-version="${VERSION}"]`);
    if(!section){
      header.insertAdjacentHTML('afterend',historyEntryHtml());
      section=history.querySelector(`[data-history-version="${VERSION}"]`);
    }
    if(section&&header.nextElementSibling!==section){
      header.insertAdjacentElement('afterend',section);
    }
  }

  function syncHomeVersionLink(){
    const link=document.querySelector('.home-version-link a');
    if(link)link.textContent='v'+VERSION+' - Historial cambios';
  }

  function boot(){
    injectHistoryV237();
    syncHomeVersionLink();
    setTimeout(()=>{injectHistoryV237();syncHomeVersionLink()},0);
    setTimeout(()=>{injectHistoryV237();syncHomeVersionLink()},900);
  }

  window.PatxReleaseV237={inject:injectHistoryV237,syncLink:syncHomeVersionLink};

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
  window.addEventListener('load',boot,{once:true});
})();
