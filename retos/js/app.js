(() => {
  'use strict';

  const auth = window.PatxAuth;
  const service = window.PatxChallengeService;
  const registry = window.PatxGameRegistry;
  const $ = id => document.getElementById(id);

  const els = {
    identity:$('identity'), heroName:$('heroName'), heroDescription:$('heroDescription'), demoBadge:$('demoBadge'),
    categoryValue:$('categoryValue'), bestValue:$('bestValue'), attemptsValue:$('attemptsValue'), challengePanel:$('challengePanel'),
    practiceButton:$('practiceButton'), playButton:$('playButton'), microcopy:$('microcopy'), instructionSteps:$('instructionSteps'),
    scoringHint:$('scoringHint'), gamePanel:$('gamePanel'), gameTitle:$('gameTitle'), gameAttempt:$('gameAttempt'), gameMode:$('gameMode'),
    gameStage:$('gameStage'), resultPanel:$('resultPanel'), resultLabel:$('resultLabel'), resultScore:$('resultScore'), resultCopy:$('resultCopy'),
    resultPracticeButton:$('resultPracticeButton'), resultScoreButton:$('resultScoreButton'), ranking:$('ranking'), seasonName:$('seasonName'),
    seasonRanking:$('seasonRanking'), yesterdayTitle:$('yesterdayTitle'), yesterdayRanking:$('yesterdayRanking'), historyList:$('historyList'),
    errorBox:$('errorBox'), scoreConfirm:$('scoreConfirm'), scoreConfirmText:$('scoreConfirmText'), confirmScoreButton:$('confirmScoreButton')
  };

  const D = (id,name,description,category,unit,config) => ({id,game_name:name,description,category,unit,config});
  const demoDefinitions = {
    'stop-seven':D('stop-seven','Stop 7','Pulsa para iniciar y vuelve a pulsar lo más cerca posible de 7,000 segundos.','timing','ms_error',{target_ms:7000,max_duration_ms:14000}),
    reaction:D('reaction','Reacción','Espera la señal y pulsa tan rápido como puedas.','reflex','ms',{min_wait_ms:1600,max_wait_ms:4200,max_reaction_ms:2500}),
    'center-hit':D('center-hit','Clava el centro','Detén el marcador exactamente en el centro.','precision','error',{speed:.72,max_error:1000}),
    'speed-tap':D('speed-tap','Speed Tap','Toca la pantalla tantas veces como puedas durante cinco segundos.','speed','taps',{duration_ms:5000,max_taps:120}),
    'color-reflex':D('color-reflex','Color Reflex','Responde al color correcto lo más rápido posible.','reflex','points',{rounds:8,round_timeout_ms:2200,max_score:8000}),
    'quick-maths':D('quick-maths','Quick Maths','Resuelve diez operaciones sencillas contra el reloj.','logic','points',{questions:10,question_timeout_ms:5000,max_score:10000}),
    'grid-memory':D('grid-memory','Grid Memory','Memoriza las casillas iluminadas y repítelas.','memory','level',{start_cells:3,max_level:8}),
    sequence:D('sequence','Secuencia','Memoriza y repite una secuencia cada vez más larga.','memory','level',{start_length:3,max_level:8}),
    'football-trivia':D('football-trivia','Trivial futbolero','Cinco preguntas de fútbol. Acertar rápido da más puntos.','football','points',{questions:5,question_timeout_ms:8000,max_score:5000}),
    'higher-lower':D('higher-lower','Higher or Lower','Decide si el siguiente número será mayor o menor.','logic','correct',{rounds:10,min_value:1,max_value:99,round_timeout_ms:3500}),
    cups:D('cups','Cups','Sigue la bola mientras se mezclan los vasos y elige dónde está.','memory','correct',{rounds:6,cups:3,base_shuffle_ms:2400,min_shuffle_ms:1100}),
    'memory-cards':D('memory-cards','Memory Cards','Encuentra las ocho parejas lo más rápido posible.','memory','time_ms',{pairs:8,timeout_ms:30000,max_score:60000}),
    'tower-stack':D('tower-stack','Tower Stack','Suelta cada bloque sobre el anterior y construye la torre más alta.','precision','level',{max_level:25,start_speed:.55,speed_step:.035}),
    'zig-zag':D('zig-zag','Zig Zag','Toca para cambiar de dirección y no salirte del camino.','arcade','points',{max_score:40}),
    'lane-rush':D('lane-rush','Lane Rush','Cambia de carril para esquivar obstáculos cada vez más rápidos.','arcade','points',{lanes:3,max_score:40,start_interval_ms:900,min_interval_ms:360}),
    'arrow-rush':D('arrow-rush','Arrow Rush','Responde a la dirección correcta antes de que cambie la señal.','reflex','points',{rounds:16,round_timeout_ms:1400,max_score:16000}),
    'drop-zone':D('drop-zone','Drop Zone','Suelta la bola en el momento exacto para atravesar cada hueco.','precision','level',{levels:10,max_level:10}),
    'orbit-pins':D('orbit-pins','Orbit Pins','Lanza clavijas al objetivo giratorio sin tocar las anteriores.','precision','pins',{pins:14,max_score:14}),
    'rhythm-tap':D('rhythm-tap','Rhythm Tap','Toca siguiendo el pulso con la mayor precisión posible.','timing','points',{beats:12,interval_ms:700,max_score:12000}),
    'shape-gate':D('shape-gate','Shape Gate','Elige rápidamente la figura que encaja en la puerta.','reflex','points',{rounds:12,round_timeout_ms:1800,max_score:12000}),
    'snake-sprint':D('snake-sprint','Snake Sprint','Guía la serpiente, recoge puntos y evita chocar durante veinte segundos.','arcade','points',{duration_ms:20000,max_score:50}),
    'odd-one':D('odd-one','Odd One','Encuentra el símbolo diferente antes de que se acabe el tiempo.','reflex','points',{rounds:12,round_timeout_ms:1800,max_score:12000}),
    'flash-count':D('flash-count','Flash Count','Cuenta cuántos destellos aparecen y responde rápido.','memory','points',{rounds:8,min_count:2,max_count:8,max_score:8000}),
    balance:D('balance','Balance','Mantén la aguja dentro de la zona segura durante doce segundos.','precision','points',{duration_ms:12000,max_score:12000}),
    'target-lock':D('target-lock','Target Lock','Pulsa cuando el anillo móvil coincida con el objetivo.','timing','points',{rounds:10,max_score:10000}),
    'swipe-sort':D('swipe-sort','Swipe Sort','Desliza cada tarjeta hacia el lado correcto siguiendo la regla.','reflex','points',{rounds:16,round_timeout_ms:1800,max_score:16000}),
    'catch-drop':D('catch-drop','Catch Drop','Mueve la cesta y atrapa tantos objetos como puedas.','arcade','points',{duration_ms:18000,max_score:50})
  };

  const guides = {
    'stop-seven':['Pulsa una vez para arrancar el cronómetro.','No intentes contar mirando el reloj: concéntrate en el tiempo.','Pulsa otra vez intentando detenerlo exactamente en 7,000 s.'],
    reaction:['No pulses mientras la pantalla esté esperando.','Cuando aparezca la señal de salida, toca inmediatamente.','Si te adelantas, el intento termina como salida falsa.'],
    'center-hit':['Observa el marcador que se mueve por la barra.','Toca una sola vez para detenerlo.','Cuanto más cerca quede del centro, mejor.'],
    'speed-tap':['Cuando empiece el tiempo, toca repetidamente la zona de juego.','Tienes 5 segundos.','Cuenta el número total de toques válidos.'],
    'color-reflex':['Mira la indicación de color de cada ronda.','Elige el color correcto antes de que se agote el tiempo.','Responder bien y rápido da más puntos.'],
    'quick-maths':['Resuelve la operación que aparece.','Elige la respuesta antes de que venza el tiempo.','Hay 10 operaciones y la velocidad también cuenta.'],
    'grid-memory':['Memoriza las casillas que se iluminan.','Cuando se apaguen, toca exactamente esas casillas.','Cada nivel añade dificultad. Un error termina la ronda.'],
    sequence:['Observa la secuencia completa sin tocar.','Repite los botones en el mismo orden.','Cada ronda añade un nuevo paso.'],
    'football-trivia':['Responde 5 preguntas de fútbol.','Solo una respuesta es correcta.','En el intento oficial, acertar más rápido da más puntuación.'],
    'higher-lower':['Mira el número actual.','Decide si el siguiente será MAYOR o MENOR.','Tienes 10 rondas: suma un punto por acierto.'],
    cups:['Fíjate en qué vaso esconde la bola.','Sigue los vasos mientras se mezclan.','Al terminar el movimiento, toca el vaso correcto.'],
    'memory-cards':['Destapa dos cartas cada vez.','Si son iguales quedan descubiertas; si no, vuelven a taparse.','Encuentra todas las parejas en el menor tiempo posible.'],
    'tower-stack':['El bloque superior se mueve de lado a lado.','Toca para soltarlo sobre la torre.','Si no se solapa con el bloque anterior, la partida termina.'],
    'zig-zag':['La pieza avanza automáticamente.','Cada toque cambia su dirección.','Mantente sobre el camino el máximo tiempo posible.'],
    'lane-rush':['Tu pieza avanza por tres carriles.','Toca a izquierda o derecha para cambiar de carril.','Esquiva los obstáculos y aguanta todo lo posible.'],
    'arrow-rush':['Mira la flecha grande que aparece.','Pulsa la misma dirección en los controles.','Responde rápido: cada ronda dura muy poco.'],
    'drop-zone':['La bola se mueve sobre un hueco.','Toca para soltarla en el momento adecuado.','Si atraviesa el hueco avanzas al siguiente nivel.'],
    'orbit-pins':['El objetivo gira continuamente.','Toca para lanzar una nueva clavija.','No golpees ninguna clavija que ya esté colocada.'],
    'rhythm-tap':['Observa y escucha visualmente el pulso.','Toca el círculo exactamente en cada beat.','Cuanto menor sea tu desviación, más puntos recibes.'],
    'shape-gate':['Mira la figura objetivo.','Elige entre las opciones la figura que encaja.','Responde antes de que termine el tiempo de la ronda.'],
    'snake-sprint':['Guía la serpiente por el tablero.','Recoge los objetivos para sumar puntos.','Evita paredes y tu propio cuerpo.'],
    'odd-one':['Busca el único símbolo diferente del grupo.','Tócalo antes de que venza el tiempo.','Cada ronda cambia la disposición y aumenta la presión.'],
    'flash-count':['Mira atentamente los destellos.','Cuenta cuántos han aparecido.','Cuando termine la secuencia, elige la cantidad correcta.'],
    balance:['La aguja tenderá a escaparse del centro.','Mantén pulsado ← o → para corregirla.','Solo puntúa el tiempo que permanece dentro de la zona segura.'],
    'target-lock':['Observa el anillo que cambia de tamaño.','Toca cuando coincida con el objetivo.','Cuanto más exacta sea la coincidencia, más puntos.'],
    'swipe-sort':['Lee la regla que aparece en pantalla.','Desliza cada tarjeta hacia el lado correcto.','Encadena decisiones rápidas sin equivocarte.'],
    'catch-drop':['Mueve la cesta horizontalmente.','Colócala debajo de los objetos que caen.','Atrapa tantos como puedas antes de que termine el tiempo.']
  };

  const scoreHints = {
    'stop-seven':'Gana quien tenga el menor error respecto a 7,000 segundos.',reaction:'Gana el menor tiempo de reacción.','center-hit':'Gana quien deje el marcador más cerca del centro.',
    'memory-cards':'Gana quien complete todas las parejas en menos tiempo.','grid-memory':'Gana el nivel más alto alcanzado.',sequence:'Gana el nivel más alto alcanzado.',
    cups:'Gana quien consiga más aciertos.','higher-lower':'Gana quien consiga más aciertos.','orbit-pins':'Gana quien coloque más clavijas sin chocar.'
  };

  let accountState = null;
  let challenge = null;
  let activeGame = null;
  let playing = false;
  let currentMode = 'practice';

  const demoGameId = new URLSearchParams(location.search).get('demo');
  const demoMode = Boolean(demoGameId && demoDefinitions[demoGameId]);

  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const shown = () => demoMode ? demoDefinitions[demoGameId] : challenge;
  const shownGameId = () => shown()?.game_id || shown()?.id;

  function showError(message){ els.errorBox.textContent = message || 'Ha ocurrido un error.'; els.errorBox.hidden = false; }
  function clearError(){ els.errorBox.hidden = true; els.errorBox.textContent = ''; }

  function formatScore(score,unit){
    if(score == null || Number.isNaN(Number(score))) return '—';
    const n = Number(score);
    if(unit === 'ms_error') return `±${(n/1000).toFixed(3)} s`;
    if(unit === 'ms') return `${Math.round(n)} ms`;
    if(unit === 'time_ms') return `${(n/1000).toFixed(2)} s`;
    if(unit === 'error') return `${Math.round(n)} error`;
    if(unit === 'taps') return `${Math.round(n)} toques`;
    if(unit === 'pins') return `${Math.round(n)} clavijas`;
    if(unit === 'points') return `${Math.round(n)} pts`;
    if(unit === 'level') return `Nivel ${Math.round(n)}`;
    if(unit === 'correct') return `${Math.round(n)} acierto${Math.round(n) === 1 ? '' : 's'}`;
    return Number.isInteger(n) ? String(n) : n.toFixed(2);
  }

  function categoryLabel(id){
    const labels = {timing:'TIEMPO',reflex:'REFLEJOS',precision:'PRECISIÓN',speed:'VELOCIDAD',logic:'LÓGICA',memory:'MEMORIA',football:'FÚTBOL',arcade:'ARCADE'};
    return labels[id] || String(id || 'JUEGO').toUpperCase();
  }

  function dateLabel(v){
    if(!v) return '';
    try { return new Date(`${v}T12:00:00`).toLocaleDateString('es-ES',{day:'numeric',month:'short'}); }
    catch(_) { return v; }
  }

  function defaultScoreHint(def){
    const id = def?.game_id || def?.id;
    if(scoreHints[id]) return scoreHints[id];
    if(def?.scoring_direction === 'lower') return 'Cuanto menor sea tu resultado, mejor posición tendrás.';
    if(def?.unit === 'time_ms' || def?.unit === 'ms' || def?.unit === 'error' || def?.unit === 'ms_error') return 'En este reto gana el resultado más bajo.';
    return 'En este reto, cuanto mayor sea tu puntuación, mejor posición tendrás.';
  }

  function renderGuide(def){
    const id = def?.game_id || def?.id;
    const steps = guides[id] || ['Lee la instrucción principal del juego.','Haz una práctica gratuita si tienes dudas.','Cuando estés preparado, inicia tu intento oficial.'];
    els.instructionSteps.innerHTML = steps.map((text,i) => `<div class="instruction-step"><span>${i+1}</span><p>${esc(text)}</p></div>`).join('');
    els.scoringHint.textContent = defaultScoreHint(def);
  }

  function applyTheme(def){
    const category = def?.category || challenge?.category || 'arcade';
    document.body.dataset.gameCategory = category;
    document.body.dataset.gameId = def?.game_id || def?.id || '';
  }

  function renderChallenge(){
    const def = shown();
    if(!def) return;
    applyTheme(def);
    renderGuide(def);
    els.heroName.textContent = def.game_name || def.name || 'Reto del día';
    els.heroDescription.textContent = def.description || '';
    els.categoryValue.textContent = categoryLabel(def.category || challenge?.category);
    els.demoBadge.hidden = !demoMode;
    els.bestValue.textContent = demoMode ? 'No guarda' : formatScore(challenge.best_score,challenge.unit);
    els.attemptsValue.textContent = demoMode ? '—' : `${challenge.attempts_remaining} / ${challenge.max_attempts}`;
    els.practiceButton.disabled = false;
    els.playButton.hidden = demoMode;
    const remaining = demoMode ? 0 : Number(challenge.attempts_remaining || 0);
    els.playButton.disabled = !demoMode && remaining <= 0;
    const scoreLabel = els.playButton.querySelector('span:last-child');
    if(scoreLabel) scoreLabel.textContent = remaining > 0 ? 'JUGAR POR PUNTOS' : 'SIN INTENTOS';
    els.microcopy.textContent = demoMode
      ? 'Modo demo: puedes practicar sin límite y no se guarda ningún resultado.'
      : 'PROBAR JUEGO es ilimitado. Solo JUGAR POR PUNTOS consume uno de tus intentos oficiales.';
    if(!demoMode){
      els.scoreConfirmText.textContent = `Te quedan ${remaining} intento${remaining === 1 ? '' : 's'} oficial${remaining === 1 ? '' : 'es'} hoy. Esta partida sí entrará en la clasificación.`;
    }
  }

  function dailyRowsHtml(rows,unit){
    return rows.map(row => {
      const avatar = row.photo_url ? `<img class="rank-avatar" src="${esc(row.photo_url)}" alt="">` : '<div class="rank-avatar fallback">●</div>';
      return `<div class="rank-row"><div class="rank-pos">${row.rank}</div>${avatar}<div><div class="rank-name">${esc(row.nickname || 'Jugador')}</div><div class="rank-meta">${row.attempts} intento${Number(row.attempts) === 1 ? '' : 's'}</div></div><div class="rank-score">${formatScore(row.best_score,unit)}</div></div>`;
    }).join('');
  }

  function renderLeaderboard(rows){
    els.ranking.innerHTML = rows.length ? dailyRowsHtml(rows,challenge?.unit) : '<div class="empty">Todavía no hay resultados oficiales hoy. Puedes ser el primero.</div>';
  }

  function renderSeason(season,rows){
    els.seasonName.textContent = season?.season_name || 'Clasificación mensual';
    if(!rows.length){ els.seasonRanking.innerHTML = '<div class="empty">La temporada empieza con el primer resultado.</div>'; return; }
    els.seasonRanking.innerHTML = rows.map(row => {
      const avatar = row.photo_url ? `<img class="rank-avatar" src="${esc(row.photo_url)}" alt="">` : '<div class="rank-avatar fallback">●</div>';
      return `<div class="rank-row season-row"><div class="rank-pos">${row.rank}</div>${avatar}<div><div class="rank-name">${esc(row.nickname || 'Jugador')}</div><div class="rank-meta">${row.days_played} día${Number(row.days_played) === 1 ? '' : 's'} · ${row.wins} victoria${Number(row.wins) === 1 ? '' : 's'} · ${row.podiums} podio${Number(row.podiums) === 1 ? '' : 's'}</div></div><div class="rank-score">${row.points} pts</div></div>`;
    }).join('');
  }

  function renderHistory(rows){
    if(!rows.length){ els.historyList.innerHTML = '<div class="panel empty">Todavía no hay historial.</div>'; return; }
    els.historyList.innerHTML = rows.map(row => {
      const mine = row.my_rank ? `Tú: #${row.my_rank} · ${formatScore(row.my_best_score,row.unit)}` : 'No participaste';
      const winner = row.winner_nickname ? `Ganó ${esc(row.winner_nickname)} · ${formatScore(row.winner_score,row.unit)}` : 'Sin resultados';
      return `<article class="panel history-card"><div class="history-date">${dateLabel(row.challenge_date)}</div><div class="history-main"><strong>${esc(row.game_name)}</strong><span>${mine}</span></div><div class="history-foot">${winner}<span>${row.participants} jugador${Number(row.participants) === 1 ? '' : 'es'}</span></div></article>`;
    }).join('');
  }

  async function refreshSupplemental(){
    try{
      const [season,seasonRows,history] = await Promise.all([service.getSeason(),service.getSeasonLeaderboard(),service.getHistory(14)]);
      renderSeason(season,seasonRows);
      renderHistory(history);
      const previous = history.find(row => row.challenge_date !== challenge?.challenge_date);
      if(!previous){
        els.yesterdayTitle.textContent = 'Resultados anteriores';
        els.yesterdayRanking.innerHTML = '<div class="empty">Todavía no hay un reto anterior.</div>';
      }else{
        els.yesterdayTitle.textContent = `${previous.game_name} · ${dateLabel(previous.challenge_date)}`;
        const rows = await service.getLeaderboardForDate(previous.challenge_date);
        els.yesterdayRanking.innerHTML = rows.length ? dailyRowsHtml(rows,previous.unit) : '<div class="empty">Ese reto no tuvo resultados.</div>';
      }
    }catch(error){ console.warn('[Retos] No se pudo cargar información histórica:',error); }
  }

  async function refreshData(){
    challenge = await service.getToday();
    if(!challenge) throw new Error('No se ha podido cargar el reto de hoy.');
    renderChallenge();
    renderLeaderboard(await service.getLeaderboard());
    await refreshSupplemental();
  }

  function cleanupGame(){
    if(activeGame){ try{ activeGame.destroy(); }catch(_){} activeGame = null; }
    playing = false;
  }

  function configureResultActions(){
    els.resultPracticeButton.hidden = false;
    els.resultScoreButton.hidden = demoMode || Number(challenge?.attempts_remaining || 0) <= 0;
  }

  function showResult(result,saved,def){
    els.resultPanel.hidden = false;
    const official = currentMode === 'score';
    if(!official){
      els.resultLabel.textContent = 'RESULTADO DE PRÁCTICA';
      els.resultScore.textContent = formatScore(result.score,def.unit);
      els.resultCopy.textContent = 'No se ha guardado y no has consumido ningún intento. Puedes repetir o pasar al intento oficial.';
    }else if(saved?.status === 'completed'){
      els.resultLabel.textContent = 'RESULTADO OFICIAL';
      els.resultScore.textContent = formatScore(saved.score ?? result.score,def.unit);
      const remaining = Number(saved.attempts_remaining || 0);
      els.resultCopy.textContent = remaining > 0 ? `Resultado guardado. Te queda ${remaining} intento${remaining === 1 ? '' : 's'} oficial${remaining === 1 ? '' : 'es'} hoy.` : 'Resultado guardado. Has usado todos tus intentos oficiales de hoy.';
    }else{
      els.resultLabel.textContent = 'INTENTO NO VÁLIDO';
      els.resultScore.textContent = 'NO VÁLIDO';
      els.resultCopy.textContent = 'El servidor ha rechazado este resultado. El intento sigue contando.';
    }
    configureResultActions();
  }

  async function finishGame(attempt,def,result){
    let saved = null;
    try{
      if(currentMode === 'score'){
        saved = await service.finishAttempt({attemptId:attempt.attempt_id,gameId:attempt.game_id,score:result.score,durationMs:result.duration,metadata:result.metadata || {}});
      }
      showResult(result,saved,def);
      cleanupGame();
      if(currentMode === 'score') await refreshData(); else renderChallenge();
      els.resultPanel.scrollIntoView({behavior:'smooth',block:'nearest'});
    }catch(error){
      cleanupGame();
      showError(error.message || 'No se pudo guardar el resultado.');
      if(currentMode === 'score') await refreshData().catch(()=>{});
    }
  }

  function practiceAttempt(def){
    const id = def.game_id || def.id;
    const randomSeed = Math.floor(Math.random()*2147483646)+1;
    return {attempt_id:null,attempt_no:'PRÁCTICA',game_id:id,seed:randomSeed,config:def.config || {},attempts_remaining:999};
  }

  async function startGame(mode){
    if(playing) return;
    clearError();
    els.resultPanel.hidden = true;
    const def = shown();
    currentMode = mode;
    els.practiceButton.disabled = true;
    els.playButton.disabled = true;
    try{
      const attempt = mode === 'practice' ? practiceAttempt(def) : await service.startAttempt();
      if(!attempt) throw new Error('No se pudo iniciar el intento.');
      if(!registry.has(attempt.game_id)) throw new Error(`El juego ${attempt.game_id} todavía no está instalado.`);
      playing = true;
      els.gamePanel.hidden = false;
      els.gameTitle.textContent = def.game_name || def.name || 'Reto';
      els.gameStage.innerHTML = '';
      if(mode === 'practice'){
        els.gameMode.className = 'game-mode practice';
        els.gameMode.textContent = 'PRÁCTICA · NO PUNTÚA';
        els.gameAttempt.textContent = 'INTENTOS ILIMITADOS';
      }else{
        els.gameMode.className = 'game-mode score';
        els.gameMode.textContent = 'INTENTO OFICIAL · PUNTÚA';
        els.gameAttempt.textContent = `INTENTO ${attempt.attempt_no} / ${challenge.max_attempts}`;
        challenge.attempts_remaining = attempt.attempts_remaining;
        renderChallenge();
      }
      activeGame = registry.create(attempt.game_id,{
        container:els.gameStage,
        config:attempt.config || def.config || {},
        seed:attempt.seed,
        attemptId:attempt.attempt_id,
        onFinish:result => finishGame(attempt,def,result)
      });
      activeGame.start();
      els.gamePanel.scrollIntoView({behavior:'smooth',block:'center'});
    }catch(error){
      cleanupGame();
      showError(error.message || 'No se pudo empezar el juego.');
      renderChallenge();
    }
  }

  function openScoreConfirmation(){
    if(demoMode) return;
    const remaining = Number(challenge?.attempts_remaining || 0);
    if(remaining <= 0) return;
    els.scoreConfirmText.textContent = `Te quedan ${remaining} intento${remaining === 1 ? '' : 's'} oficial${remaining === 1 ? '' : 'es'} hoy. Esta partida sí entrará en la clasificación.`;
    if(typeof els.scoreConfirm.showModal === 'function') els.scoreConfirm.showModal();
    else if(window.confirm(`${els.scoreConfirmText.textContent}\n\nSi cierras o recargas después de empezar, el intento seguirá consumido.`)) startGame('score');
  }

  async function init(){
    try{
      accountState = await auth.requireAccount({returnTo:location.href});
      if(!accountState) return;
      els.identity.textContent = `● ${accountState.nickname || 'Jugador'}`;
      if(demoMode){
        challenge = {...demoDefinitions[demoGameId],attempts_remaining:999,max_attempts:999,best_score:null};
        renderChallenge();
        renderLeaderboard([]);
      }else{
        await refreshData();
      }
      els.challengePanel.classList.remove('loading');
      els.practiceButton.addEventListener('click',()=>startGame('practice'));
      els.playButton.addEventListener('click',openScoreConfirmation);
      els.resultPracticeButton.addEventListener('click',()=>startGame('practice'));
      els.resultScoreButton.addEventListener('click',openScoreConfirmation);
      els.confirmScoreButton.addEventListener('click',event=>{event.preventDefault();els.scoreConfirm.close();startGame('score');});
    }catch(error){
      console.error(error);
      showError(error.message || 'No se pudo cargar Reto del día.');
    }
  }

  window.addEventListener('pagehide',cleanupGame);
  init();
})();