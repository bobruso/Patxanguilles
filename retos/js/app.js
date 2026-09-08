(() => {
  'use strict';

  const auth = window.PatxAuth;
  const service = window.PatxChallengeService;
  const registry = window.PatxGameRegistry;
  const $ = (id) => document.getElementById(id);

  const els = {
    identity: $('identity'),
    heroName: $('heroName'),
    heroDescription: $('heroDescription'),
    demoBadge: $('demoBadge'),
    bestValue: $('bestValue'),
    attemptsValue: $('attemptsValue'),
    categoryValue: $('categoryValue'),
    playButton: $('playButton'),
    microcopy: $('microcopy'),
    challengePanel: $('challengePanel'),
    gamePanel: $('gamePanel'),
    gameTitle: $('gameTitle'),
    gameAttempt: $('gameAttempt'),
    gameStage: $('gameStage'),
    resultPanel: $('resultPanel'),
    resultLabel: $('resultLabel'),
    resultScore: $('resultScore'),
    resultCopy: $('resultCopy'),
    ranking: $('ranking'),
    errorBox: $('errorBox')
  };

  const demoDefinitions = {
    'stop-seven': { id:'stop-seven', game_name:'Stop 7', description:'Pulsa para iniciar el cronómetro y vuelve a pulsar lo más cerca posible de 7,000 segundos.', category:'timing', unit:'ms_error', scoring_direction:'lower', config:{target_ms:7000,max_duration_ms:14000} },
    reaction: { id:'reaction', game_name:'Reacción', description:'Espera la señal y pulsa tan rápido como puedas. Si te adelantas, el intento cuenta.', category:'reflejos', unit:'ms', scoring_direction:'lower', config:{min_wait_ms:1600,max_wait_ms:4200,max_reaction_ms:2500} },
    'center-hit': { id:'center-hit', game_name:'Clava el centro', description:'Detén el marcador móvil exactamente en el centro de la barra.', category:'precisión', unit:'error', scoring_direction:'lower', config:{speed:.72,max_error:1000} }
  };

  let accountState = null;
  let challenge = null;
  let activeGame = null;
  let playing = false;
  const demoGameId = new URLSearchParams(location.search).get('demo');
  const demoMode = Boolean(demoGameId && demoDefinitions[demoGameId]);

  function esc(value) {
    return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  }

  function showError(message) {
    els.errorBox.textContent = message || 'Ha ocurrido un error.';
    els.errorBox.hidden = false;
  }

  function clearError() {
    els.errorBox.hidden = true;
    els.errorBox.textContent = '';
  }

  function formatScore(score, unit) {
    if (score == null || Number.isNaN(Number(score))) return '—';
    const n = Number(score);
    if (unit === 'ms_error') return `±${(n / 1000).toFixed(3)} s`;
    if (unit === 'ms') return `${Math.round(n)} ms`;
    if (unit === 'error') return `${Math.round(n)} error`;
    return Number.isInteger(n) ? String(n) : n.toFixed(2);
  }

  function categoryLabel(id) {
    const labels = { timing:'TIEMPO', reflex:'REFLEJOS', reflejos:'REFLEJOS', precision:'PRECISIÓN', precisión:'PRECISIÓN' };
    return labels[id] || String(id || 'JUEGO').toUpperCase();
  }

  function renderChallenge() {
    const shown = demoMode ? demoDefinitions[demoGameId] : challenge;
    els.heroName.textContent = shown.game_name || shown.name || 'Reto del día';
    els.heroDescription.textContent = shown.description || '';
    els.bestValue.textContent = demoMode ? 'No guarda' : formatScore(challenge.best_score, challenge.unit);
    els.attemptsValue.textContent = demoMode ? '∞' : `${challenge.attempts_remaining} / ${challenge.max_attempts}`;
    els.categoryValue.textContent = categoryLabel(shown.category || challenge?.category || shown.id);
    els.demoBadge.hidden = !demoMode;

    if (demoMode) {
      els.playButton.disabled = false;
      els.playButton.textContent = 'PROBAR JUEGO';
      els.microcopy.textContent = 'Modo demo: no consume intentos ni guarda resultados.';
    } else {
      const remaining = Number(challenge.attempts_remaining || 0);
      els.playButton.disabled = remaining <= 0;
      els.playButton.textContent = remaining > 0 ? 'JUGAR' : 'SIN INTENTOS';
      els.microcopy.textContent = 'El intento se consume al pulsar JUGAR. Cerrar o recargar no lo devuelve.';
    }
  }

  function renderLeaderboard(rows) {
    if (!rows.length) {
      els.ranking.innerHTML = '<div class="empty">Todavía no hay resultados hoy. Puedes ser el primero.</div>';
      return;
    }
    els.ranking.innerHTML = rows.map((row) => {
      const avatar = row.photo_url
        ? `<img class="rank-avatar" src="${esc(row.photo_url)}" alt="">`
        : '<div class="rank-avatar fallback">⚽</div>';
      return `<div class="rank-row">
        <div class="rank-pos">${row.rank}</div>
        ${avatar}
        <div><div class="rank-name">${esc(row.nickname || 'Jugador')}</div><div class="rank-meta">${row.attempts} intento${Number(row.attempts) === 1 ? '' : 's'}</div></div>
        <div class="rank-score">${formatScore(row.best_score, challenge?.unit)}</div>
      </div>`;
    }).join('');
  }

  async function refreshData() {
    challenge = await service.getToday();
    if (!challenge) throw new Error('No se ha podido cargar el reto de hoy.');
    renderChallenge();
    const ranking = await service.getLeaderboard();
    renderLeaderboard(ranking);
  }

  function cleanupGame() {
    if (activeGame) {
      try { activeGame.destroy(); } catch (_) {}
      activeGame = null;
    }
    playing = false;
  }

  function showResult(result, saved, shown) {
    els.resultPanel.hidden = false;
    els.resultLabel.textContent = demoMode ? 'RESULTADO DEMO' : saved?.status === 'completed' ? 'RESULTADO' : 'INTENTO NO VÁLIDO';
    els.resultScore.textContent = saved?.status === 'invalid' ? 'NO VÁLIDO' : formatScore(result.score, shown.unit);

    if (demoMode) {
      els.resultCopy.textContent = 'No se ha guardado ni se ha consumido ningún intento.';
    } else if (saved?.status === 'completed') {
      const remaining = Number(saved.attempts_remaining || 0);
      els.resultCopy.textContent = remaining > 0 ? `Te queda ${remaining} intento${remaining === 1 ? '' : 's'} hoy.` : 'Has usado todos tus intentos de hoy.';
    } else {
      els.resultCopy.textContent = 'El servidor ha rechazado este resultado. El intento sigue contando.';
    }
  }

  async function finishGame(attempt, shown, result) {
    let saved = null;
    try {
      if (!demoMode) {
        saved = await service.finishAttempt({
          attemptId: attempt.attempt_id,
          score: result.score,
          durationMs: result.duration,
          metadata: result.metadata || {}
        });
      }
      showResult(result, saved, shown);
      cleanupGame();
      if (!demoMode) await refreshData();
      else renderChallenge();
      els.resultPanel.scrollIntoView({ behavior:'smooth', block:'nearest' });
    } catch (error) {
      cleanupGame();
      showError(error.message || 'No se pudo guardar el resultado.');
      if (!demoMode) await refreshData().catch(() => {});
    }
  }

  async function play() {
    if (playing) return;
    clearError();
    els.resultPanel.hidden = true;
    els.playButton.disabled = true;
    els.playButton.textContent = 'PREPARANDO…';

    try {
      const shown = demoMode ? demoDefinitions[demoGameId] : challenge;
      const attempt = demoMode
        ? { attempt_id:null, attempt_no:'DEMO', game_id:demoGameId, seed:Date.now() % 2147483647, config:shown.config, attempts_remaining:999 }
        : await service.startAttempt();

      if (!attempt) throw new Error('No se pudo iniciar el intento.');
      if (!registry.has(attempt.game_id)) throw new Error(`El juego ${attempt.game_id} todavía no está instalado.`);

      playing = true;
      els.gamePanel.hidden = false;
      els.gameTitle.textContent = shown.game_name || shown.name || 'Reto';
      els.gameAttempt.textContent = demoMode ? 'DEMO' : `INTENTO ${attempt.attempt_no} / ${challenge.max_attempts}`;
      els.gameStage.innerHTML = '';

      if (!demoMode) {
        challenge.attempts_remaining = attempt.attempts_remaining;
        renderChallenge();
      }

      activeGame = registry.create(attempt.game_id, {
        container: els.gameStage,
        config: attempt.config || shown.config || {},
        seed: attempt.seed,
        onFinish: (result) => finishGame(attempt, shown, result)
      });
      activeGame.start();
      els.gamePanel.scrollIntoView({ behavior:'smooth', block:'center' });
    } catch (error) {
      cleanupGame();
      showError(error.message || 'No se pudo empezar el juego.');
      await refreshData().catch(() => {});
    }
  }

  async function init() {
    try {
      accountState = await auth.requireAccount({ returnTo: location.href });
      if (!accountState) return;
      els.identity.textContent = `👤 ${accountState.nickname || 'Jugador'}`;
      await refreshData();
      els.challengePanel.classList.remove('loading');
      els.playButton.addEventListener('click', play);
    } catch (error) {
      console.error(error);
      showError(error.message || 'No se pudo cargar Reto del día.');
    }
  }

  window.addEventListener('pagehide', cleanupGame);
  init();
})();