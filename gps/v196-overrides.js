(()=>{
  'use strict';

  const SUPABASE_URL='https://cnnhstlguewrxjihhlqc.supabase.co';
  const SUPABASE_KEY='sb_publishable_uWEwYEMkAe3YkeAzX7ACAg_0aEYHmM6';

  function layoutReportTop(){
    const panel=document.querySelector('.patx-gps-panel');
    if(!panel)return;
    const summary=panel.querySelector(':scope > .patx-gps-summary');
    const highlights=panel.querySelector(':scope > .patx-gps-highlights');
    if(summary&&highlights&&!summary.closest('.patx-gps-top-grid')){
      const grid=document.createElement('div');
      grid.className='patx-gps-top-grid';
      summary.parentNode.insertBefore(grid,summary);
      grid.append(summary,highlights);
    }
    panel.querySelectorAll('.patx-gps-highlight-row').forEach(row=>{
      const title=row.querySelector('b');
      const time=row.querySelector(':scope > strong');
      const note=row.querySelector('span');
      if(!title||!time||!note||!/^Bloque más activo/i.test(title.textContent))return;
      const m=note.textContent.match(/\((\d+)\s*[–-]\s*(\d+)\s*min\)/i);
      if(m)time.textContent=`${m[1]}′–${m[2]}′`;
    });
  }

  function updateRicoText(){
    const panel=document.querySelector('.patx-gps-panel');
    if(!panel)return;
    const orientation=panel.querySelector('.patx-gps-orientation');
    const head=panel.querySelector('.patx-gps-head');
    if(!orientation||!head)return;

    const mobile=window.matchMedia('(max-width:700px)').matches;
    let inside=orientation.querySelector(':scope > small');
    let moved=panel.querySelector(':scope > .patx-gps-rico-mobile-note');
    const note=inside||moved;
    if(!note)return;

    note.textContent='*Orientación ataque-defensa. Al cambiarla se recalculan ocupación, posición media, ubicación de sprints y rol estimado.';

    if(mobile){
      note.classList.add('patx-gps-rico-mobile-note');
      if(note.parentElement!==panel){
        head.insertAdjacentElement('afterend',note);
      }
    }else if(note.parentElement===panel){
      note.classList.remove('patx-gps-rico-mobile-note');
      const state=orientation.querySelector('.patx-gps-orientation-state');
      orientation.insertBefore(note,state||null);
    }
  }

  function normalizeMobileMaps(){
    const panel=document.querySelector('.patx-gps-panel');
    if(!panel)return;
    panel.querySelectorAll('.patx-gps-map-card').forEach(card=>{
      const wrap=card.querySelector('.patx-gps-canvas-wrap');
      const canvas=wrap?.querySelector('canvas');
      if(!wrap||!canvas)return;
      wrap.classList.add('patx-gps-map-uniform');
    });
  }

  let adminChecked=false;
  async function mountAdminDelete(){
    if(adminChecked)return;
    const panel=document.querySelector('.patx-gps-panel');
    if(!panel)return;
    if(!location.pathname.endsWith('gps-report.html')&&!location.pathname.endsWith('/gps-report.html'))return;
    adminChecked=true;

    try{
      if(!window.supabase?.createClient)return;
      const authClient=window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY,
        {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}
      );
      const{data:{session}}=await authClient.auth.getSession();
      if(!session)return;

      const{data:profile,error:profileError}=await authClient
        .from('profiles')
        .select('role')
        .eq('id',session.user.id)
        .single();

      if(profileError||profile?.role!=='admin')return;

      if(panel.querySelector('[data-gps-admin-delete]'))return;

      const q=new URLSearchParams(location.search);
      const matchId=q.get('match');
      const playerId=q.get('player');
      if(!matchId||!playerId)return;

      const zone=document.createElement('section');
      zone.className='patx-gps-admin-zone';
      zone.innerHTML=`
        <div>
          <span>ADMINISTRACIÓN</span>
          <strong>Borrar este informe GPS</strong>
          <small>Elimina únicamente los datos GPS de este jugador para este partido.</small>
        </div>
        <button type="button" data-gps-admin-delete>Borrar informe</button>
      `;
      panel.appendChild(zone);

      const btn=zone.querySelector('[data-gps-admin-delete]');
      btn.onclick=async()=>{
        if(!confirm('¿Borrar este informe GPS?\n\nEsta acción eliminará los datos GPS de este jugador para este partido.'))return;
        btn.disabled=true;
        btn.textContent='Borrando…';

        const{error}=await authClient
          .from('match_player_gps')
          .delete()
          .eq('match_id',matchId)
          .eq('player_id',playerId);

        if(error){
          console.error('[GPS] Error al borrar informe',error);
          alert('No se pudo borrar el informe GPS: '+(error.message||'Error de Supabase'));
          btn.disabled=false;
          btn.textContent='Borrar informe';
          return;
        }

        document.body.innerHTML='<main class="gps-page"><div class="gps-page-status">Informe GPS borrado correctamente. Puedes cerrar esta pestaña.</div></main>';
      };
    }catch(err){
      console.warn('[GPS] No se pudo comprobar el modo administrador',err);
    }
  }

  function refresh(){
    layoutReportTop();
    updateRicoText();
    normalizeMobileMaps();
    mountAdminDelete();
  }

  let queued=false;
  const observer=new MutationObserver(()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;refresh()});
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('resize',refresh);
  setTimeout(refresh,0);
  setTimeout(refresh,250);
  setTimeout(refresh,900);
})();
