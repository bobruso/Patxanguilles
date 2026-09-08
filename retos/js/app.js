(() => {
  'use strict';

  const auth = window.PatxAuth;
  const service = window.PatxChallengeService;
  const registry = window.PatxGameRegistry;
  const $ = (id) => document.getElementById(id);

  const els = {
    identity:$('identity'), heroName:$('heroName'), heroDescription:$('heroDescription'), demoBadge:$('demoBadge'),
    bestValue:$('bestValue'), attemptsValue:$('attemptsValue'), categoryValue:$('categoryValue'), playButton:$('playButton'),
    microcopy:$('microcopy'), challengePanel:$('challengePanel'), gamePanel:$('gamePanel'), gameTitle:$('gameTitle'),
    gameAttempt:$('gameAttempt'), gameStage:$('gameStage'), resultPanel:$('resultPanel'), resultLabel:$('resultLabel'),
    resultScore:$('resultScore'), resultCopy:$('resultCopy'), ranking:$('ranking'), seasonName:$('seasonName'),
    seasonRanking:$('seasonRanking'), yesterdayTitle:$('yesterdayTitle'), yesterdayRanking:$('yesterdayRanking'),
    historyList:$('historyList'), errorBox:$('errorBox')
  };

  const demoDefinitions = {
    'stop-seven':{id:'stop-seven',game_name:'Stop 7',description:'Pulsa para iniciar el cronómetro y vuelve a pulsar lo más cerca posible de 7,000 segundos.',category:'timing',unit:'ms_error',scoring_direction:'lower',config:{target_ms:7000,max_duration_ms:14000}},
    reaction:{id:'reaction',game_name:'Reacción',description:'Espera la señal y pulsa tan rápido como puedas. Si te adelantas, el intento cuenta.',category:'reflex',unit:'ms',scoring_direction:'lower',config:{min_wait_ms:1600,max_wait_ms:4200,max_reaction_ms:2500}},
    'center-hit':{id:'center-hit',game_name:'Clava el centro',description:'Detén el marcador móvil exactamente en el centro de la barra.',category:'precision',unit:'error',scoring_direction:'lower',config:{speed:.72,max_error:1000}},
    'speed-tap':{id:'speed-tap',game_name:'Speed Tap',description:'Toca la pantalla tantas veces como puedas durante cinco segundos.',category:'speed',unit:'taps',scoring_direction:'higher',config:{duration_ms:5000,max_taps:120}},
    'color-reflex':{id:'color-reflex',game_name:'Color Reflex',description:'Responde al color correcto lo más rápido posible durante ocho rondas.',category:'reflex',unit:'points',scoring_direction:'higher',config:{rounds:8,round_timeout_ms:2200,max_score:8000}},
    'quick-maths':{id:'quick-maths',game_name:'Quick Maths',description:'Resuelve diez operaciones sencillas antes de que se agote el tiempo.',category:'logic',unit:'points',scoring_direction:'higher',config:{questions:10,question_timeout_ms:5000,max_score:10000}},
    'grid-memory':{id:'grid-memory',game_name:'Grid Memory',description:'Memoriza las casillas iluminadas y repítelas sin equivocarte.',category:'memory',unit:'level',scoring_direction:'higher',config:{start_cells:3,max_level:8}},
    sequence:{id:'sequence',game_name:'Secuencia',description:'Memoriza y repite una secuencia cada vez más larga.',category:'memory',unit:'level',scoring_direction:'higher',config:{start_length:3,max_level:8}},
    'keep-up':{id:'keep-up',game_name:'Que no caiga',description:'Mantén el balón en el aire tocándolo antes de que llegue al suelo.',category:'football',unit:'touches',scoring_direction:'higher',config:{max_touches:200,max_duration_ms:30000,gravity:1650,impulse:-620}},
    penalties:{id:'penalties',game_name:'Penaltis',description:'Cinco lanzamientos. Coloca el balón lejos de donde se tire el portero.',category:'football',unit:'points',scoring_direction:'higher',config:{shots:5,max_score:5000}},
    goalkeeper:{id:'goalkeeper',game_name:'Portero',description:'Lee el disparo y toca la zona correcta antes de que llegue el balón.',category:'football',unit:'saves',scoring_direction:'higher',config:{shots:5,max_score:5,reaction_ms:850}},
    'top-bins':{id:'top-bins',game_name:'A la escuadra',description:'Cinco tiros a objetivos pequeños dentro de la portería. Cuanto más preciso, más puntos.',category:'football',unit:'points',scoring_direction:'higher',config:{shots:5,max_score:5000}},
    'var-offside':{id:'var-offside',game_name:'VAR',description:'Decide rápidamente si la jugada es fuera de juego o posición legal.',category:'football',unit:'correct',scoring_direction:'higher',config:{rounds:8,max_score:8,round_timeout_ms:4500}}
  };

  let accountState=null, challenge=null, activeGame=null, playing=false;
  const demoGameId = new URLSearchParams(location.search).get('demo');
  const demoMode = Boolean(demoGameId && demoDefinitions[demoGameId]);

  function esc(value){return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}
  function showError(message){els.errorBox.textContent=message||'Ha ocurrido un error.';els.errorBox.hidden=false;}
  function clearError(){els.errorBox.hidden=true;els.errorBox.textContent='';}

  function formatScore(score,unit){
    if(score==null||Number.isNaN(Number(score))) return '—';
    const n=Number(score);
    if(unit==='ms_error') return `±${(n/1000).toFixed(3)} s`;
    if(unit==='ms') return `${Math.round(n)} ms`;
    if(unit==='error') return `${Math.round(n)} error`;
    if(unit==='taps'||unit==='touches') return `${Math.round(n)} toques`;
    if(unit==='points') return `${Math.round(n)} pts`;
    if(unit==='level') return `Nivel ${Math.round(n)}`;
    if(unit==='saves') return `${Math.round(n)} parada${Math.round(n)===1?'':'s'}`;
    if(unit==='correct') return `${Math.round(n)} acierto${Math.round(n)===1?'':'s'}`;
    return Number.isInteger(n)?String(n):n.toFixed(2);
  }

  function categoryLabel(id){
    const labels={timing:'TIEMPO',reflex:'REFLEJOS',reflejos:'REFLEJOS',precision:'PRECISIÓN','precisión':'PRECISIÓN',speed:'VELOCIDAD',logic:'LÓGICA',memory:'MEMORIA',football:'FÚTBOL'};
    return labels[id]||String(id||'JUEGO').toUpperCase();
  }
  function dateLabel(value){if(!value)return'';try{return new Date(`${value}T12:00:00`).toLocaleDateString('es-ES',{day:'numeric',month:'short'});}catch(_){return value;}}

  function renderChallenge(){
    const shown=demoMode?demoDefinitions[demoGameId]:challenge;
    els.heroName.textContent=shown.game_name||shown.name||'Reto del día';
    els.heroDescription.textContent=shown.description||'';
    els.bestValue.textContent=demoMode?'No guarda':formatScore(challenge.best_score,challenge.unit);
    els.attemptsValue.textContent=demoMode?'∞':`${challenge.attempts_remaining} / ${challenge.max_attempts}`;
    els.categoryValue.textContent=categoryLabel(shown.category||challenge?.category||shown.id);
    els.demoBadge.hidden=!demoMode;
    if(demoMode){els.playButton.disabled=false;els.playButton.textContent='PROBAR JUEGO';els.microcopy.textContent='Modo demo: no consume intentos ni guarda resultados.';}
    else{const remaining=Number(challenge.attempts_remaining||0);els.playButton.disabled=remaining<=0;els.playButton.textContent=remaining>0?'JUGAR':'SIN INTENTOS';els.microcopy.textContent='El intento se consume al pulsar JUGAR. Cerrar o recargar no lo devuelve.';}
  }

  function dailyRowsHtml(rows,unit){
    return rows.map(row=>{
      const avatar=row.photo_url?`<img class="rank-avatar" src="${esc(row.photo_url)}" alt="">`:'<div class="rank-avatar fallback">⚽</div>';
      return `<div class="rank-row"><div class="rank-pos">${row.rank}</div>${avatar}<div><div class="rank-name">${esc(row.nickname||'Jugador')}</div><div class="rank-meta">${row.attempts} intento${Number(row.attempts)===1?'':'s'}</div></div><div class="rank-score">${formatScore(row.best_score,unit)}</div></div>`;
    }).join('');
  }

  function renderLeaderboard(rows){els.ranking.innerHTML=rows.length?dailyRowsHtml(rows,challenge?.unit):'<div class="empty">Todavía no hay resultados hoy. Puedes ser el primero.</div>';}

  function renderSeason(season,rows){
    els.seasonName.textContent=season?.season_name||'Clasificación mensual';
    if(!rows.length){els.seasonRanking.innerHTML='<div class="empty">La temporada empieza con el primer resultado.</div>';return;}
    els.seasonRanking.innerHTML=rows.map(row=>{
      const avatar=row.photo_url?`<img class="rank-avatar" src="${esc(row.photo_url)}" alt="">`:'<div class="rank-avatar fallback">⚽</div>';
      return `<div class="rank-row season-row"><div class="rank-pos">${row.rank}</div>${avatar}<div><div class="rank-name">${esc(row.nickname||'Jugador')}</div><div class="rank-meta">${row.days_played} día${Number(row.days_played)===1?'':'s'} · ${row.wins} victoria${Number(row.wins)===1?'':'s'} · ${row.podiums} podio${Number(row.podiums)===1?'':'s'}</div></div><div class="rank-score">${row.points} pts</div></div>`;
    }).join('');
  }

  function renderHistory(rows){
    if(!rows.length){els.historyList.innerHTML='<div class="panel empty">Todavía no hay historial.</div>';return;}
    els.historyList.innerHTML=rows.map(row=>{
      const mine=row.my_rank?`Tú: #${row.my_rank} · ${formatScore(row.my_best_score,row.unit)}`:'No participaste';
      const winner=row.winner_nickname?`Ganó ${esc(row.winner_nickname)} · ${formatScore(row.winner_score,row.unit)}`:'Sin resultados';
      return `<article class="panel history-card"><div class="history-date">${dateLabel(row.challenge_date)}</div><div class="history-main"><strong>${esc(row.game_name)}</strong><span>${mine}</span></div><div class="history-foot">${winner}<span>${row.participants} jugador${Number(row.participants)===1?'':'es'}</span></div></article>`;
    }).join('');
  }

  async function refreshSupplemental(){
    try{
      const [season,seasonRows,history]=await Promise.all([service.getSeason(),service.getSeasonLeaderboard(),service.getHistory(14)]);
      renderSeason(season,seasonRows);renderHistory(history);
      const previous=history.find(row=>row.challenge_date!==challenge?.challenge_date);
      if(!previous){els.yesterdayTitle.textContent='Resultados anteriores';els.yesterdayRanking.innerHTML='<div class="empty">Todavía no hay un reto anterior.</div>';}
      else{els.yesterdayTitle.textContent=`${previous.game_name} · ${dateLabel(previous.challenge_date)}`;const rows=await service.getLeaderboardForDate(previous.challenge_date);els.yesterdayRanking.innerHTML=rows.length?dailyRowsHtml(rows,previous.unit):'<div class="empty">Ese reto no tuvo resultados.</div>';}
    }catch(error){console.warn('[Retos] No se pudo cargar información histórica:',error);}
  }

  async function refreshData(){challenge=await service.getToday();if(!challenge)throw new Error('No se ha podido cargar el reto de hoy.');renderChallenge();renderLeaderboard(await service.getLeaderboard());await refreshSupplemental();}

  function cleanupGame(){if(activeGame){try{activeGame.destroy();}catch(_){}activeGame=null;}playing=false;}

  function showResult(result,saved,shown){
    els.resultPanel.hidden=false;
    els.resultLabel.textContent=demoMode?'RESULTADO DEMO':saved?.status==='completed'?'RESULTADO':'INTENTO NO VÁLIDO';
    els.resultScore.textContent=saved?.status==='invalid'?'NO VÁLIDO':formatScore(result.score,shown.unit);
    if(demoMode)els.resultCopy.textContent='No se ha guardado ni se ha consumido ningún intento.';
    else if(saved?.status==='completed'){const remaining=Number(saved.attempts_remaining||0);els.resultCopy.textContent=remaining>0?`Te queda ${remaining} intento${remaining===1?'':'s'} hoy.`:'Has usado todos tus intentos de hoy.';}
    else els.resultCopy.textContent='El servidor ha rechazado este resultado. El intento sigue contando.';
  }

  async function finishGame(attempt,shown,result){
    let saved=null;
    try{
      if(!demoMode)saved=await service.finishAttempt({attemptId:attempt.attempt_id,score:result.score,durationMs:result.duration,metadata:result.metadata||{}});
      showResult(result,saved,shown);cleanupGame();if(!demoMode)await refreshData();else renderChallenge();els.resultPanel.scrollIntoView({behavior:'smooth',block:'nearest'});
    }catch(error){cleanupGame();showError(error.message||'No se pudo guardar el resultado.');if(!demoMode)await refreshData().catch(()=>{});}
  }

  async function play(){
    if(playing)return;clearError();els.resultPanel.hidden=true;els.playButton.disabled=true;els.playButton.textContent='PREPARANDO…';
    try{
      const shown=demoMode?demoDefinitions[demoGameId]:challenge;
      const attempt=demoMode?{attempt_id:null,attempt_no:'DEMO',game_id:demoGameId,seed:Date.now()%2147483647,config:shown.config,attempts_remaining:999}:await service.startAttempt();
      if(!attempt)throw new Error('No se pudo iniciar el intento.');
      if(!registry.has(attempt.game_id))throw new Error(`El juego ${attempt.game_id} todavía no está instalado.`);
      playing=true;els.gamePanel.hidden=false;els.gameTitle.textContent=shown.game_name||shown.name||'Reto';els.gameAttempt.textContent=demoMode?'DEMO':`INTENTO ${attempt.attempt_no} / ${challenge.max_attempts}`;els.gameStage.innerHTML='';
      if(!demoMode){challenge.attempts_remaining=attempt.attempts_remaining;renderChallenge();}
      activeGame=registry.create(attempt.game_id,{container:els.gameStage,config:attempt.config||shown.config||{},seed:attempt.seed,onFinish:(result)=>finishGame(attempt,shown,result)});
      activeGame.start();els.gamePanel.scrollIntoView({behavior:'smooth',block:'center'});
    }catch(error){cleanupGame();showError(error.message||'No se pudo empezar el juego.');await refreshData().catch(()=>{});}
  }

  async function init(){
    try{accountState=await auth.requireAccount({returnTo:location.href});if(!accountState)return;els.identity.textContent=`👤 ${accountState.nickname||'Jugador'}`;await refreshData();els.challengePanel.classList.remove('loading');els.playButton.addEventListener('click',play);}
    catch(error){console.error(error);showError(error.message||'No se pudo cargar Reto del día.');}
  }

  window.addEventListener('pagehide',cleanupGame);
  init();
})();