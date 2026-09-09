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

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',injectGamesHomeButton,{once:true});
  else injectGamesHomeButton();
})();