(()=>{
  const SUPABASE_URL_V214='https://cnnhstlguewrxjihhlqc.supabase.co';
  const SUPABASE_KEY_V214='sb_publishable_uWEwYEMkAe3YkeAzX7ACAg_0aEYHmM6';

  window.saveQuickFitnessStatus=async function(name){
    const map=(typeof playerIdByName!=='undefined')?playerIdByName:null;
    const id=map?.[name];
    if(!id){
      if(typeof toast==='function')toast('No se encontró el jugador');
      return;
    }

    const control=document.querySelector('.fitness-quick-control');
    const select=control?.querySelector('[data-fitness-select]');
    if(!select)return;

    let value=String(select.value||'').trim();
    if(value==='custom'){
      value=String(control.querySelector('[data-fitness-custom]')?.value||'').trim();
      if(!value){
        if(typeof toast==='function')toast('Escribe un estado de forma');
        return;
      }
    }

    if(value.length>60){
      if(typeof toast==='function')toast('El estado de forma no puede superar 60 caracteres');
      return;
    }

    const btn=control.querySelector('.fitness-save-btn');
    const oldText=btn?.textContent||'Actualizar estado';
    if(btn){
      btn.disabled=true;
      btn.textContent='Actualizando…';
    }

    try{
      const r=await fetch(`${SUPABASE_URL_V214}/functions/v1/update-player-fitness`,{
        method:'POST',
        cache:'no-store',
        headers:{
          apikey:SUPABASE_KEY_V214,
          'Content-Type':'application/json'
        },
        body:JSON.stringify({
          player_id:Number(id),
          fitness_status:value
        })
      });

      const data=await r.json().catch(()=>({}));
      if(!r.ok||data?.ok!==true){
        throw new Error(data?.error||`No se pudo actualizar el estado (${r.status})`);
      }

      if(typeof loadSupabaseData==='function')await loadSupabaseData();
      if(typeof openProfile==='function')await openProfile(name);
      if(typeof toast==='function')toast('Estado de forma actualizado');
    }catch(err){
      console.error('[Estado de forma v214]',err);
      if(typeof toast==='function')toast(err?.message||'No se pudo actualizar el estado');
      if(btn){
        btn.disabled=false;
        btn.textContent=oldText;
      }
    }
  };

  /* Acceso publicado a Juegos desde la Home. */
  function injectGamesHomeButton(){
    const grid=document.querySelector('#home .home-options');
    if(!grid||document.getElementById('homeGamesBtn'))return;

    if(!document.getElementById('homeGamesBtnStyle')){
      const style=document.createElement('style');
      style.id='homeGamesBtnStyle';
      style.textContent=`
        #homeGamesBtn{
          background:linear-gradient(145deg,#173f2b,#0b1812)!important;
          border-color:rgba(118,221,150,.28)!important;
        }
        #homeGamesBtn .games-home-art{
          position:relative;
          width:100%;height:100%;min-height:135px;
          display:grid;place-items:center;
          overflow:hidden;
          background:
            radial-gradient(circle at 62% 42%,rgba(255,255,255,.13),transparent 4%),
            radial-gradient(circle at 50% 50%,rgba(47,203,103,.22),transparent 58%),
            repeating-linear-gradient(90deg,rgba(255,255,255,.025) 0 1px,transparent 1px 32px),
            repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 32px);
        }
        #homeGamesBtn .games-home-art:before{
          content:'⚽';position:absolute;left:16%;bottom:14%;font-size:clamp(38px,5vw,66px);
          transform:rotate(-12deg);filter:drop-shadow(0 10px 10px rgba(0,0,0,.45));
        }
        #homeGamesBtn .games-home-art:after{
          content:'🎮';position:absolute;right:13%;top:17%;font-size:clamp(42px,5vw,70px);
          transform:rotate(9deg);filter:drop-shadow(0 10px 10px rgba(0,0,0,.45));
        }
        #homeGamesBtn .games-home-vs{
          position:relative;z-index:2;
          font:1000 clamp(20px,2.5vw,34px)/1 system-ui,sans-serif;
          letter-spacing:.08em;color:#f4e6b8;
          text-shadow:0 3px 14px rgba(0,0,0,.8);
        }
        @media(max-width:700px){
          #homeGamesBtn .games-home-art{min-height:100px}
        }
      `;
      document.head.appendChild(style);
    }

    const btn=document.createElement('button');
    btn.id='homeGamesBtn';
    btn.type='button';
    btn.className='mode greenline home-image-card';
    btn.setAttribute('aria-label','Abrir juegos');
    btn.innerHTML=`
      <span class="home-card-copy">
        <span class="icon">🎮</span>
        <strong>Juegos</strong>
        <span>Memoria Vintage y próximos minijuegos</span>
      </span>
      <span class="home-card-image games-home-art" aria-hidden="true"><span class="games-home-vs">PLAY</span></span>
    `;
    btn.addEventListener('click',()=>{window.location.href='juegos/'});
    grid.appendChild(btn);
  }

  function injectLatestHistory(){
    const history=document.querySelector('#changeHistory .history-wrap');
    const header=history?.querySelector('.history-header');
    if(!history||!header||history.querySelector('[data-history-version="223"]'))return;

    const versionLabel=header.querySelector('.history-version');
    if(versionLabel)versionLabel.textContent='VERSIÓN v223';

    const html=`
<section class="history-change-section" data-history-version="223">
  <div class="history-section-number">223</div>
  <div class="history-section-content">
    <h2>Móvil, Temporada e informes GPS</h2>
    <ul>
      <li>En móvil, al entrar en Temporada 26/27, tanto en Fútbol 7 como en Fútbol Sala, se sustituye el fondo de vídeo por <code>background-home-mobile.png</code>.</li>
      <li>El botón «Añadir resultado» se ensancha para evitar que el texto se parta en dos líneas, especialmente en Fútbol Sala.</li>
      <li>En los informes GPS se elimina la etiqueta visible «CAMPO CALIBRADO».</li>
      <li>El botón o gesto Atrás de Android cierra correctamente el informe GPS y devuelve al usuario a la ficha del partido.</li>
    </ul>
  </div>
</section>

<section class="history-change-section" data-history-version="222">
  <div class="history-section-number">222</div>
  <div class="history-section-content">
    <h2>Android y mejoras de integración</h2>
    <ul>
      <li>La web queda asociada con la aplicación Android de Patxanguilles mediante la configuración de enlaces de aplicación.</li>
      <li>Se siguen afinando los minijuegos y sus pruebas de funcionamiento antes de publicarlos.</li>
      <li>Memoria Vintage recibe nuevos ajustes de dificultad, ranking y distribución de cartas.</li>
    </ul>
  </div>
</section>

<section class="history-change-section" data-history-version="221">
  <div class="history-section-number">221</div>
  <div class="history-section-content">
    <h2>Juegos y Memoria Vintage</h2>
    <ul>
      <li>Se incorpora una nueva sección Juegos accesible desde la Home.</li>
      <li>Se publica Memoria Vintage utilizando el archivo de cromos históricos importado desde Odio Eterno al Fútbol Moderno.</li>
      <li>El juego pasa a tener dos dificultades: Fácil · 6 parejas y Difícil · 10 parejas, cada una con su propio ranking.</li>
      <li>Se adapta la disposición de las cartas para móvil, tanto en vertical como en horizontal, evitando cortes y aprovechando mejor la pantalla.</li>
      <li>Se prepara la infraestructura de otros minijuegos, como ¿Quién es? y Patxanguilles Heads, pero permanecen ocultos o desactivados hasta estar terminados.</li>
      <li>Se añaden herramientas internas para importar, preparar y enmascarar nombres de los cromos vintage.</li>
    </ul>
  </div>
</section>`;

    header.insertAdjacentHTML('afterend',html);
  }

  function initV214Extras(){
    injectGamesHomeButton();
    injectLatestHistory();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initV214Extras,{once:true});
  else initV214Extras();
})();