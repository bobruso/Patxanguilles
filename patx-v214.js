(()=>{
  const SUPABASE_URL_V214='https://cnnhstlguewrxjihhlqc.supabase.co';
  const SUPABASE_KEY_V214='sb_publishable_uWEwYEMkAe3YkeAzX7ACAg_0aEYHmM6';

  window.saveQuickFitnessStatus=async function(name){
    const map=(typeof playerIdByName!=='undefined')?playerIdByName:null;
    const id=map?.[name];
    if(!id){if(typeof toast==='function')toast('No se encontró el jugador');return;}
    const control=document.querySelector('.fitness-quick-control');
    const select=control?.querySelector('[data-fitness-select]');
    if(!select)return;
    let value=String(select.value||'').trim();
    if(value==='custom'){
      value=String(control.querySelector('[data-fitness-custom]')?.value||'').trim();
      if(!value){if(typeof toast==='function')toast('Escribe un estado de forma');return;}
    }
    if(value.length>60){if(typeof toast==='function')toast('El estado de forma no puede superar 60 caracteres');return;}
    const btn=control.querySelector('.fitness-save-btn');
    const oldText=btn?.textContent||'Actualizar estado';
    if(btn){btn.disabled=true;btn.textContent='Actualizando…';}
    try{
      const r=await fetch(`${SUPABASE_URL_V214}/functions/v1/update-player-fitness`,{method:'POST',cache:'no-store',headers:{apikey:SUPABASE_KEY_V214,'Content-Type':'application/json'},body:JSON.stringify({player_id:Number(id),fitness_status:value})});
      const data=await r.json().catch(()=>({}));
      if(!r.ok||data?.ok!==true)throw new Error(data?.error||`No se pudo actualizar el estado (${r.status})`);
      if(typeof loadSupabaseData==='function')await loadSupabaseData();
      if(typeof openProfile==='function')await openProfile(name);
      if(typeof toast==='function')toast('Estado de forma actualizado');
    }catch(err){
      console.error('[Estado de forma v214]',err);
      if(typeof toast==='function')toast(err?.message||'No se pudo actualizar el estado');
      if(btn){btn.disabled=false;btn.textContent=oldText;}
    }
  };

  function injectGamesHomeButton(){
    const grid=document.querySelector('#home .home-options');
    if(!grid||document.getElementById('homeGamesBtn'))return;
    if(!document.getElementById('homeGamesBtnStyle')){
      const style=document.createElement('style');
      style.id='homeGamesBtnStyle';
      style.textContent=`#homeGamesBtn{background:linear-gradient(145deg,#242a30,#0e1115)!important;border-color:rgba(255,255,255,.22)!important}#homeGamesBtn .games-home-art{position:relative;width:100%;height:100%;min-height:135px;display:block;overflow:hidden;background:#0e1812}#homeGamesBtn .games-home-art img{display:block;width:100%;height:100%;min-height:135px;object-fit:cover;object-position:center center}@media(max-width:700px){#homeGamesBtn .games-home-art,#homeGamesBtn .games-home-art img{min-height:100px}}`;
      document.head.appendChild(style);
    }
    const btn=document.createElement('button');
    btn.id='homeGamesBtn';btn.type='button';btn.className='mode greenline home-image-card';btn.setAttribute('aria-label','Abrir juegos');
    btn.innerHTML=`<span class="home-card-copy"><span class="icon">🎮</span><strong>Juegos</strong><span>Memoria Vintage y próximos minijuegos</span></span><span class="home-card-image games-home-art" aria-hidden="true"><img src="juegos boton imagen.jpg" alt=""></span>`;
    btn.addEventListener('click',()=>{window.location.href='juegos/';});
    grid.appendChild(btn);
  }

  function injectLatestHistory(){
    const history=document.querySelector('#changeHistory .history-wrap');
    const header=history?.querySelector('.history-header');
    if(!history||!header||history.querySelector('[data-history-version="234"]'))return;
    const versionLabel=header.querySelector('.history-version');
    if(versionLabel)versionLabel.textContent='VERSIÓN v234';
    const html=`
<section class="history-change-section" data-history-version="234"><div class="history-section-number">234</div><div class="history-section-content"><h2>Balance visual de temporada</h2><ul><li>Nueva barra de victorias de Roj@s, empates y victorias de Negr@s encima de Últimos partidos y en Calendario.</li><li>Porcentaje de victorias y goles de cada equipo, contando solo los partidos finalizados de la modalidad seleccionada.</li><li>Diseño compacto visible al entrar en temporada desde móvil y escritorio.</li></ul></div></section>
<section class="history-change-section" data-history-version="233"><div class="history-section-number">233</div><div class="history-section-content"><h2>Convocatorias separadas por equipos</h2><ul><li>Al pegar una lista con los encabezados Rojos y Negros, los jugadores se seleccionan automáticamente en su equipo, en cualquier orden.</li><li>Se mantienen las listas sin equipos y la corrección manual, con avisos de nombres desconocidos o repetidos.</li></ul></div></section>
<section class="history-change-section" data-history-version="232"><div class="history-section-number">232</div><div class="history-section-content"><h2>Navegación GPS sin rebotes</h2><ul><li>La X de la presentación GPS vuelve al análisis correspondiente en lugar de depender de un atrás genérico.</li><li>El cierre «VER ANÁLISIS COMPLETO» usa el mismo retorno seguro al informe.</li><li>Desde el análisis, «← PARTIDO» y el botón Atrás de Android regresan a la ficha del partido sin reabrir la presentación.</li></ul></div></section>
<section class="history-change-section" data-history-version="231"><div class="history-section-number">231</div><div class="history-section-content"><h2>Tu partido en una presentación GPS</h2><ul><li>Nueva presentación audiovisual con recorrido satélite, frecuencia cardíaca, velocidad y comparativa histórica.</li><li>Composiciones adaptadas a escritorio y móvil, con cierre protagonizado por la carta oficial del jugador.</li><li>Abre la presentación desde el informe GPS y vuelve al análisis completo desde el cierre.</li></ul></div></section>
<section class="history-change-section" data-history-version="229"><div class="history-section-number">229</div><div class="history-section-content"><h2>Velocidad máxima GPS unificada</h2><ul><li>La métrica principal <b>Velocidad máxima</b> usa ahora el pico máximo registrado en el FIT del dispositivo tanto para COROS como para Garmin.</li><li>La ventana de 3 segundos, la velocidad GPS raw y los valores suavizados se mantienen como diagnóstico o fallback, pero ya no sustituyen al pico FIT cuando está disponible.</li><li>Los análisis COROS ya guardados pueden recuperar el pico FIT almacenado en sus datos de análisis sin necesidad de volver a subir el archivo.</li><li>Los informes ya guardados y las previsualizaciones GPS recuperan el pico FIT cuando está disponible para evitar mostrar como máxima una ventana sostenida de 3 segundos.</li></ul></div></section>
<section class="history-change-section" data-history-version="228"><div class="history-section-number">228</div><div class="history-section-content"><h2>Patxanguilles Cabuts y análisis GPS comparativo</h2><ul><li>Patxanguilles Heads pasa a llamarse <b>Patxanguilles Cabuts</b> y queda habilitado desde la sección Juegos, con acceso directo a la nueva versión del arcade.</li><li>Los informes GPS bloquean la interacción del mapa satélite para que el scroll de la página no se convierta en zoom al pasar por encima del campo.</li><li>La ocupación del campo, la distancia por intensidad y las zonas de frecuencia cardíaca usan ahora colores diferenciados para facilitar la lectura visual.</li><li>La recuperación cardíaca muestra solo las 10 ventanas más destacadas y la intensidad durante los 60 minutos pasa a un gráfico de barras dobles más fácil de interpretar.</li><li>Cada FIT puede compararse con los FIT anteriores del mismo jugador: medias históricas, diferencias de esfuerzo, distancia, pulso, sprints, fatiga y una puntuación global del partido sobre 100.</li></ul></div></section>
<section class="history-change-section" data-history-version="227"><div class="history-section-number">227</div><div class="history-section-content"><h2>GPS más preciso y análisis ampliado</h2><ul><li>Los archivos FIT se proyectan automáticamente sobre el campo calibrado de Santa Ana y se evita guardar un autoajuste silencioso cuando la calibración no está disponible.</li><li>La velocidad máxima pasa a usar un pico validado mediante media móvil de tres muestras, evitando que una lectura aislada infle el dato.</li><li>El comparador distingue métricas absolutas y relativas, muestra el umbral individual de sprint y deja de declarar ganador por sprints personalizados.</li><li>Los informes incorporan ventanas de recuperación cardíaca, una lectura visual de distancia por intensidad y el recorrido sobre imagen satélite del campo real.</li><li>Las fotos normales del partido y el reconocimiento OCR de convocatorias quedan completamente separados para poder añadir varias fotos sin falsos errores de formato F7.</li></ul></div></section>
<section class="history-change-section" data-history-version="224"><div class="history-section-number">224</div><div class="history-section-content"><h2>Home, móvil, entrenador y Juegos</h2><ul><li>La Home de escritorio pasa a una distribución 2×2 más compacta, con nuevas imágenes para Temporada y Juegos y un diseño visual unificado.</li><li>Se ajusta el botón «Añadir resultado» en móvil y se mejora la estabilidad visual de la clasificación al hacer scroll rápido.</li><li>El Modo Entrenador simplifica la pantalla inicial, recoloca «Crear sala» y muestra un aviso flotante al alcanzar el límite de 14 jugadores o 10 en Fútbol Sala.</li><li>El reproductor de música ocupa menos espacio y mantiene el botón de siguiente canción en modo minimizado.</li><li>Memoria Vintage estrena portada con carrusel de cromos, transiciones suaves, ajuste por altura y una carta precargada para evitar la espera inicial.</li><li>Se incorpora una herramienta interna para hacer una copia de seguridad local y reanudable del archivo completo de cromos vintage.</li></ul></div></section>
<section class="history-change-section" data-history-version="223"><div class="history-section-number">223</div><div class="history-section-content"><h2>Móvil, Temporada e informes GPS</h2><ul><li>En móvil, al entrar en Temporada 26/27, tanto en Fútbol 7 como en Fútbol Sala, se sustituye el fondo de vídeo por <code>background-home-mobile.png</code>.</li><li>El botón «Añadir resultado» se ensancha para evitar que el texto se parta en dos líneas, especialmente en Fútbol Sala.</li><li>En los informes GPS se elimina la etiqueta visible «CAMPO CALIBRADO».</li><li>El botón o gesto Atrás de Android cierra correctamente el informe GPS y devuelve al usuario a la ficha del partido.</li></ul></div></section>
<section class="history-change-section" data-history-version="222"><div class="history-section-number">222</div><div class="history-section-content"><h2>Android y mejoras de integración</h2><ul><li>La web queda asociada con la aplicación Android de Patxanguilles mediante la configuración de enlaces de aplicación.</li><li>Se siguen afinando los minijuegos y sus pruebas de funcionamiento antes de publicarlos.</li><li>Memoria Vintage recibe nuevos ajustes de dificultad, ranking y distribución de cartas.</li></ul></div></section>
<section class="history-change-section" data-history-version="221"><div class="history-section-number">221</div><div class="history-section-content"><h2>Juegos y Memoria Vintage</h2><ul><li>Se incorpora una nueva sección Juegos accesible desde la Home.</li><li>Se publica Memoria Vintage utilizando el archivo de cromos históricos importado desde Odio Eterno al Fútbol Moderno.</li><li>El juego pasa a tener dos dificultades: Fácil · 6 parejas y Difícil · 10 parejas, cada una con su propio ranking.</li><li>Se adapta la disposición de las cartas para móvil, tanto en vertical como en horizontal, evitando cortes y aprovechando mejor la pantalla.</li><li>Se prepara la infraestructura de otros minijuegos, como ¿Quién es? y Patxanguilles Heads, pero permanecen ocultos o desactivados hasta estar terminados.</li><li>Se añaden herramientas internas para importar, preparar y enmascarar nombres de los cromos vintage.</li></ul></div></section>`;
    header.insertAdjacentHTML('afterend',html);
  }

  function setupCoachLobbyV224(){
    const intro=document.querySelector('#coachLobby .coach-draft-intro');
    if(intro)intro.remove();
    const manual=document.querySelector('#coachLobby .coach-manual-label');
    const create=document.getElementById('coachCreateRoomBtn');
    if(manual&&create&&!manual.contains(create))manual.appendChild(create);

    const original=window.toggleCoachSetupPlayer;
    if(typeof original==='function'&&!window.__patxCoachLimitWrapped){
      window.__patxCoachLimitWrapped=true;
      window.toggleCoachSetupPlayer=function(name){
        const needed=(typeof game!=='undefined'&&game==='fs')?10:14;
        const selected=(typeof coachSelectedParticipants!=='undefined')?coachSelectedParticipants:[];
        if(!selected.includes(name)&&selected.length>=needed){
          showCoachLimitToast(name,needed);
          return;
        }
        return original(name);
      };
    }
  }

  function showCoachLimitToast(name,needed){
    document.querySelectorAll('.coach-limit-toast').forEach(x=>x.remove());
    const target=[...document.querySelectorAll('#coachSetupPlayers .player')].find(b=>b.textContent.trim().startsWith(name));
    const tip=document.createElement('div');
    tip.className='coach-limit-toast';
    tip.textContent=`Ya tienes ${needed} jugadores seleccionados`;
    document.body.appendChild(tip);
    const r=target?.getBoundingClientRect();
    const width=Math.min(240,tip.offsetWidth||220);
    let left=r?Math.min(window.innerWidth-width-8,r.right+8):12;
    let top=r?Math.max(8,r.top+(r.height-tip.offsetHeight)/2):12;
    if(r&&left<r.right+4)left=Math.max(8,r.left-width-8);
    tip.style.left=`${left}px`;tip.style.top=`${top}px`;
    requestAnimationFrame(()=>tip.classList.add('show'));
    setTimeout(()=>{tip.classList.remove('show');setTimeout(()=>tip.remove(),180);},2400);
  }

  const inactiveF7V235=new Set(['Cordo','Erika','Jorgito','Oskar']);

  function applyActiveRosterV235(){
    if(typeof F7!=='undefined'&&Array.isArray(F7)){
      inactiveF7V235.forEach(name=>{
        let idx=F7.indexOf(name);
        while(idx>=0){F7.splice(idx,1);idx=F7.indexOf(name);}
      });
    }
    const originalAll=window.allPlayers;
    if(typeof originalAll==='function'&&!window.__patxAllPlayersV235){
      window.__patxAllPlayersV235=true;
      window.allPlayers=function(){return originalAll().filter(name=>!inactiveF7V235.has(name));};
    }
  }

  function remoteContextV235(){
    if(typeof reserves==='undefined'||!Array.isArray(reserves))return[];
    return reserves
      .filter(r=>r&&String(r.name||'').trim())
      .map(r=>({
        n:String(r.name).trim(),
        k:r.level==='alto'?'h':r.level==='bajo'?'l':'m'
      }));
  }

  async function requestTeamsV235(previousRed){
    if(typeof sbPublic==='undefined'||!sbPublic?.rpc)throw new Error('Servicio no disponible');
    const args={
      p_players:[...selected],
      p_previous_red:Array.isArray(previousRed)?[...previousRed]:null,
      p_context:remoteContextV235()
    };
    const {data,error}=await sbPublic.rpc('generate_teams',args);
    if(error)throw error;
    const red=Array.isArray(data?.red)?data.red:[];
    const black=Array.isArray(data?.black)?data.black:[];
    const merged=[...red,...black];
    const selectedSet=new Set(selected);
    if(red.length!==selected.length/2||black.length!==selected.length/2||new Set(merged).size!==selected.length||merged.some(n=>!selectedSet.has(n))){
      throw new Error('Respuesta de alineación no válida');
    }
    return{red:[...red],black:[...black]};
  }

  function installRemoteLineupsV235(){
    if(window.__patxRemoteLineupsV235)return;
    const originalMake=window.makeTeams;
    const originalNew=window.newLineup;
    if(typeof originalMake!=='function'||typeof originalNew!=='function')return;
    window.__patxRemoteLineupsV235=true;

    window.makeTeams=async function(){
      if(typeof game==='undefined'||game!=='f7')return originalMake.apply(this,arguments);
      show('loading');
      const msgs=randomLoadingPhrases(4);
      const title=document.getElementById('loadingTitle');
      const small=document.getElementById('loadingMessage');
      if(small)small.textContent='';
      if(title)title.textContent=msgs[0];
      let i=0;
      const timer=setInterval(()=>{
        i++;
        if(title&&i<msgs.length)title.textContent=msgs[i];
      },1800);
      const generated=requestTeamsV235(null).then(data=>({data}),error=>({error}));
      await wait(7200);
      clearInterval(timer);
      const outcome=await generated;
      if(outcome.error){
        console.error('Generación remota no disponible',outcome.error);
        show('selection');
        if(typeof toast==='function')toast('No se pudieron generar los equipos');
        return;
      }
      teams=outcome.data;
      pendingSwap=null;
      renderResults();
      show('results');
    };

    window.newLineup=async function(){
      if(typeof game==='undefined'||game!=='f7')return originalNew.apply(this,arguments);
      if(window.__patxNewLineupBusyV235)return;
      window.__patxNewLineupBusyV235=true;
      const buttons=[...document.querySelectorAll('#results .lineup-top-actions button')];
      const btn=buttons.find(b=>/otra alineación/i.test(b.textContent||''));
      if(btn)btn.disabled=true;
      try{
        const previous=Array.isArray(teams?.red)?[...teams.red]:[];
        teams=await requestTeamsV235(previous);
        pendingSwap=null;
        renderResults();
        document.getElementById('adjustPanel')?.classList.remove('open');
        document.getElementById('results')?.classList.remove('adjusting-lineups');
        if(typeof toast==='function')toast('Nueva alineación generada');
      }catch(err){
        console.error('No se pudo generar otra alineación',err);
        if(typeof toast==='function')toast('No se pudo generar otra alineación');
      }finally{
        if(btn)btn.disabled=false;
        window.__patxNewLineupBusyV235=false;
      }
    };
  }

  function syncPublishedVersionV235(){
    const homeLink=document.querySelector('.home-version-link a');
    if(homeLink)homeLink.textContent='v235 - Historial cambios';
    const versionLabel=document.querySelector('#changeHistory .history-version');
    if(versionLabel)versionLabel.textContent='VERSIÓN v235';
  }

  function initV214Extras(){
    injectGamesHomeButton();
    injectLatestHistory();
    setupCoachLobbyV224();
    applyActiveRosterV235();
    installRemoteLineupsV235();
    syncPublishedVersionV235();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initV214Extras,{once:true});
  else initV214Extras();
})();
