function setCardPosition(el,index){
  const mobile=isMobile();
  const zone=document.querySelector('.board-zone');
  const zw=zone.clientWidth,zh=zone.clientHeight;
  const gap=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gap'))||6;
  const ratio=currentOrientation==='portrait'?3/4:4/3;

  // FÁCIL · 6 parejas / 12 cartas
  if(difficultyMode==='easy'){
    let cols,rows,scale=1;

    if(mobile){
      if(currentOrientation==='landscape'){
        // Horizontal móvil: 2 x 6, ligeramente más pequeño
        // para dejar margen inferior y evitar que se corte la última fila.
        cols=2;
        rows=6;
        scale=.88;
      }else{
        cols=3;
        rows=4;
      }
    }else{
      cols=4;
      rows=3;
    }

    const byW=(zw-gap*(cols-1))/cols;
    const byH=((zh-gap*(rows-1))/rows)*ratio;
    const cw=Math.max(20,Math.min(byW,byH)*scale);
    const ch=cw/ratio;
    const gridW=cols*cw+(cols-1)*gap;
    const gridH=rows*ch+(rows-1)*gap;
    const ox=(zw-gridW)/2;
    let oy=(zh-gridH)/2;

    // Móvil APP · 6 parejas:
    // dejamos más margen por debajo desplazando el tablero hacia arriba.
    if(mobile && currentOrientation==='portrait'){
      oy=Math.max(0,oy-16);
    }
    if(mobile && currentOrientation==='landscape'){
      oy=Math.max(0,oy-28);
    }

    const col=index%cols;
    const row=Math.floor(index/cols);

    el.style.width=`${cw}px`;
    el.style.height=`${ch}px`;
    el.style.left=`${ox+col*(cw+gap)}px`;
    el.style.top=`${oy+row*(ch+gap)}px`;
    return;
  }

  // DIFÍCIL · 10 parejas / 20 cartas
  if(mobile){
    if(currentOrientation==='landscape'){
      // Horizontal móvil:
      // 1 x 3 x 3 x 3 x 3 x 3 x 3 x 1
      // Carta suelta superior e inferior centradas.
      const cols=3;
      const rows=8;

      // Dejamos algo de aire vertical para que las 8 filas entren cómodas.
      const byW=(zw-gap*(cols-1))/cols;
      const byH=((zh-gap*(rows-1))/rows)*ratio;
      const cw=Math.max(18,Math.min(byW,byH)*.94);
      const ch=cw/ratio;

      const gridW=cols*cw+(cols-1)*gap;
      const gridH=rows*ch+(rows-1)*gap;
      const ox=(zw-gridW)/2;
      const oy=(zh-gridH)/2;

      let col,row;

      if(index===0){
        col=1;
        row=0;
      }else if(index===19){
        col=1;
        row=7;
      }else{
        const n=index-1; // 0..17
        col=n%3;
        row=1+Math.floor(n/3); // filas 1..6
      }

      el.style.width=`${cw}px`;
      el.style.height=`${ch}px`;
      el.style.left=`${ox+col*(cw+gap)}px`;
      el.style.top=`${oy+row*(ch+gap)}px`;
      return;
    }

    // Vertical móvil difícil: 4 x 5
    const cols=4,rows=5;
    const byW=(zw-gap*(cols-1))/cols;
    const byH=((zh-gap*(rows-1))/rows)*ratio;
    const cw=Math.max(20,Math.min(byW,byH));
    const ch=cw/ratio;
    const gridW=cols*cw+(cols-1)*gap;
    const gridH=rows*ch+(rows-1)*gap;
    const ox=(zw-gridW)/2;
    const oy=(zh-gridH)/2;
    const col=index%cols;
    const row=Math.floor(index/cols);

    el.style.width=`${cw}px`;
    el.style.height=`${ch}px`;
    el.style.left=`${ox+col*(cw+gap)}px`;
    el.style.top=`${oy+row*(ch+gap)}px`;
    return;
  }

  // Escritorio difícil · vertical:
  // 18 centrales 6x3 + una lateral izquierda + una lateral derecha.
  if(currentOrientation==='portrait'){
    const byW=(zw-gap*7)/8;
    const byH=((zh-gap*2)/3)*ratio;
    const cw=Math.max(24,Math.min(byW,byH));
    const ch=cw/ratio;
    const gridW=8*cw+7*gap;
    const gridH=3*ch+2*gap;
    const ox=(zw-gridW)/2;
    const oy=(zh-gridH)/2;

    let col,row;
    if(index===0){
      col=0;row=1;
    }else if(index===19){
      col=7;row=1;
    }else{
      const n=index-1;
      col=1+(n%6);
      row=Math.floor(n/6);
    }

    el.style.width=`${cw}px`;
    el.style.height=`${ch}px`;
    el.style.left=`${ox+col*(cw+gap)}px`;
    el.style.top=`${oy+row*(ch+gap)}px`;
  }else{
    // Escritorio difícil · horizontal: 5 x 4.
    const cols=5,rows=4;
    const byW=(zw-gap*(cols-1))/cols;
    const byH=((zh-gap*(rows-1))/rows)*ratio;
    const cw=Math.max(24,Math.min(byW,byH));
    const ch=cw/ratio;
    const gridW=cols*cw+(cols-1)*gap;
    const gridH=rows*ch+(rows-1)*gap;
    const ox=(zw-gridW)/2;
    const oy=(zh-gridH)/2;
    const col=index%cols;
    const row=Math.floor(index/cols);

    el.style.width=`${cw}px`;
    el.style.height=`${ch}px`;
    el.style.left=`${ox+col*(cw+gap)}px`;
    el.style.top=`${oy+row*(ch+gap)}px`;
  }
}
function fitBoard(){
  [...document.querySelectorAll('.memory-card')].forEach((el,i)=>setCardPosition(el,i));
}

function renderBoard(){
  board.innerHTML=deck.map(card=>`
    <button class="memory-card ${currentOrientation==='landscape'?'horizontal':''}" data-pair="${card.pairIndex}" onclick="flipCard(this)">
      <span class="card-inner">
        <span class="face back-face"></span>
        <span class="face front-face"><img src="${esc(card.image_url)}" alt="Cromo de ${esc(card.player_name)}" draggable="false"></span>
      </span>
    </button>`).join('');
  requestAnimationFrame(fitBoard);
}

async function newGame(){
  setModeForDevice();
  if(!session||!profile)return;
  stopClock();matched=moves=errors=0;startedAt=null;finished=false;locked=false;firstCard=secondCard=null;updateStats();
  loading.style.display='grid';
  loading.innerHTML=`<div class="loading-card"><div class="spinner"></div><b>Preparando el álbum…</b><div style="margin-top:7px;font-size:11px;color:#6f604b">${esc(randomLoadingPhrase())}</div></div>`;

  try{
    await loadCatalog();

    // Elegimos orientación al azar, pero alternamos cuando sea posible para que ambas versiones aparezcan con frecuencia.
    const lastOrientation=sessionStorage.getItem('memoryLastOrientation');
    currentOrientation=lastOrientation==='portrait'?'landscape':lastOrientation==='landscape'?'portrait':(Math.random()<.5?'portrait':'landscape');
    const chosen=await selectHealthyCards(currentOrientation);
    previousIds=new Set(chosen.map(c=>String(c.id)));
    sessionStorage.setItem('memoryPreviousCards',JSON.stringify([...previousIds]));
    sessionStorage.setItem('memoryLastOrientation',currentOrientation);

    orientationChip.textContent=`${PAIRS===6?'APP · 6':'ORDENADOR · 10'} · ${currentOrientation==='portrait'?'verticales':'horizontales'}`;

    deck=shuffle(chosen.flatMap((card,pairIndex)=>[
      {...card,pairIndex,instance:`${pairIndex}a`},{...card,pairIndex,instance:`${pairIndex}b`}
    ]));
    renderBoard();loading.style.display='none';
  }catch(e){
    console.error(e);
    loading.innerHTML=`<div class="loading-card"><b>Error</b><div style="margin-top:6px">${esc(e.message)}</div><button class="primary" onclick="catalogLoaded=false;newGame()">Reintentar</button></div>`;
  }
}

function flipCard(el){
  if(locked||finished||el===firstCard||el.classList.contains('matched'))return;
  startClock();
  if(soundEnabled&&!tensionTimer)startTensionMusic();
  el.classList.add('flipped');
  if(!firstCard){firstCard=el;return}
  secondCard=el;moves++;locked=true;
  if(firstCard.dataset.pair===secondCard.dataset.pair){
    setTimeout(()=>{
      firstCard.classList.add('matched');secondCard.classList.add('matched');
      firstCard.disabled=secondCard.disabled=true;matched++;
      playMatchSfx();
      firstCard=secondCard=null;locked=false;updateStats();
      if(matched===PAIRS)completeGame();
    },240);
  }else{
    errors++;
    setTimeout(()=>{
      firstCard.classList.remove('flipped');secondCard.classList.remove('flipped');
      firstCard=secondCard=null;locked=false;updateStats();
    },1180);
  }
}

async function completeGame(){
  finished=true;stopClock();stopTensionMusic();playVictorySfx();updateStats();
  const durationMs=Date.now()-startedAt;

  document.querySelectorAll('.memory-card').forEach(c=>c.classList.add('flipped'));
  completeBanner.classList.remove('show');void completeBanner.offsetWidth;completeBanner.classList.add('show');

  let result=null,errorText='';
  try{
    const {data,error}=await sb.rpc('submit_memory_score',{
      p_duration_ms:Math.round(durationMs),
      p_orientation:currentOrientation,
      p_pairs:PAIRS,
      p_moves:moves,
      p_errors:errors
    });
    if(error)throw error;
    result=Array.isArray(data)?data[0]:data;
  }catch(e){
    errorText=e.message||'No se pudo guardar el resultado';
  }

  setTimeout(()=>{
    finishTime.textContent=formatTime(durationMs);
    finishRank.textContent=result?.rank_position||'—';
    saveStatus.textContent=result
      ? `Resultado guardado en ${PAIRS===6?'APP · 6 PAREJAS':'ORDENADOR · 10 PAREJAS'}.`
      : errorText;
    finishOverlay.classList.add('open');
  },3000);
}
function closeFinish(){finishOverlay.classList.remove('open')}

function openRanking(){
  rankingOverlay.classList.add('open');
  loadRanking(isMobile()?6:10);
}
function closeRanking(){
  rankingOverlay.classList.remove('open');
  if(finished)finishOverlay.classList.add('open');
}
async function loadRanking(pairs=10){
  rankEasyTab.classList.toggle('active',pairs===6);
  rankHardTab.classList.toggle('active',pairs===10);
  rankingList.innerHTML='<div class="rank-empty">Cargando…</div>';
  try{
    const {data,error}=await sb.rpc('get_memory_leaderboard',{p_pairs:pairs,p_limit:50});
    if(error)throw error;
    if(!data?.length){
      rankingList.innerHTML=`<div class="rank-empty">Todavía no hay tiempos en ${pairs===6?'APP · 6 PAREJAS':'ORDENADOR · 10 PAREJAS'}.</div>`;
      return;
    }
    rankingList.innerHTML=data.map((r,i)=>`
      <div class="rank-row ${profile&&Number(r.player_id)===Number(profile.player_id)?'me':''}">
        <div class="rank-num">${i+1}</div>
        <img class="rank-avatar" src="${esc(r.photo_url||'')}" alt="" onerror="this.style.visibility='hidden'">
        <div class="rank-name">${esc(r.nickname||'Jugador')}
          <div class="rank-meta">${formatRecordDate(r.record_created_at)} · ${Number(r.best_moves||0)} movimientos</div>
        </div>
        <div class="rank-time">${formatTime(Number(r.best_duration_ms||0))}</div>
      </div>`).join('');
  }catch(e){
    rankingList.innerHTML=`<div class="rank-empty">${esc(e.message||'No se pudo cargar')}</div>`;
  }
}

/* ADMIN */
function openAdminRanking(){
  if(profile?.role!=='admin')return;
  rankingOverlay.classList.remove('open');adminOverlay.classList.add('open');loadAdminScores();
}
function closeAdminRanking(){adminOverlay.classList.remove('open')}
async function loadAdminScores(){
  adminList.innerHTML='<div class="rank-empty">Cargando…</div>';adminStatus.textContent='';
  const {data,error}=await sb.rpc('admin_list_memory_scores',{p_limit:500});
  if(error){adminList.innerHTML=`<div class="rank-empty">${esc(error.message)}</div>`;return}
  if(!data?.length){adminList.innerHTML='<div class="rank-empty">No hay resultados.</div>';return}
  adminList.innerHTML=data.map(r=>`
    <div class="admin-row">
      <div><b>${esc(r.nickname)}</b> · ${formatTime(r.duration_ms)}
        <small>#${r.score_id} · ${Number(r.pairs)===6?'APP · 6':'ORDENADOR · 10'} · ${r.orientation==='portrait'?'vertical':'horizontal'} · ${new Date(r.created_at).toLocaleString()}</small>
      </div>
      <div class="admin-actions">
        <button class="mini" onclick="editScore(${r.score_id},${r.duration_ms})">Editar</button>
        <button class="mini delete" onclick="deleteScore(${r.score_id})">Borrar</button>
      </div>
    </div>`).join('');
}
async function editScore(id,currentMs){
  const current=(currentMs/1000).toFixed(1);
  const val=prompt('Nuevo tiempo en segundos:',current);
  if(val===null)return;
  const sec=Number(String(val).replace(',','.'));
  if(!Number.isFinite(sec)||sec<1){alert('Tiempo no válido');return}
  const {data,error}=await sb.rpc('admin_update_memory_score',{p_score_id:id,p_duration_ms:Math.round(sec*1000)});
  if(error){alert(error.message);return}
  adminStatus.textContent='Tiempo actualizado.';loadAdminScores();
}
async function deleteScore(id){
  if(!confirm('¿Borrar esta partida del ranking?'))return;
  const {error}=await sb.rpc('admin_delete_memory_score',{p_score_id:id});
  if(error){alert(error.message);return}
  adminStatus.textContent='Resultado borrado.';loadAdminScores();
}
async function resetRanking(){
  if(!confirm('Esto BORRARÁ TODOS los tiempos de Memoria Vintage. ¿Seguro?'))return;
  if(!confirm('Última confirmación: ¿resetear completamente el ranking?'))return;
  const {data,error}=await sb.rpc('admin_reset_memory_ranking');
  if(error){alert(error.message);return}
  adminStatus.textContent=`Ranking reseteado. ${data||0} resultados eliminados.`;loadAdminScores();
}

async function boot(){
  fitBoard();
  if(await hydrateSession()){
    loading.style.display='none';setModeForDevice();difficultyOverlay.classList.remove('open');newGame();
  }else{
    loading.style.display='none';authOverlay.classList.add('open');
    try{await loadAuthPlayers()}catch(e){authStatus.textContent=e.message}
  }
}
addEventListener('resize',()=>requestAnimationFrame(fitBoard));
addEventListener('orientationchange',()=>setTimeout(fitBoard,160));
boot();

updateSoundButton();
