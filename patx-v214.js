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
})();