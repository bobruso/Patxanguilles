(() => {
  'use strict';

  function seeded01(seed) {
    let x = (Number(seed) || 1) >>> 0;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return ((x >>> 0) % 1000000) / 1000000;
  }

  window.PatxGameRegistry.register('reaction', ({ container, config = {}, seed = 1, onFinish }) => {
    const minWait = Number(config.min_wait_ms || 1600);
    const maxWait = Number(config.max_wait_ms || 4200);
    const falseStartScore = Number(config.max_reaction_ms || 2500);
    const waitMs = Math.round(minWait + seeded01(seed) * Math.max(0, maxWait - minWait));

    let state = 'ready';
    let gameStart = 0;
    let goAt = 0;
    let timer = 0;
    let finished = false;

    container.innerHTML = `
      <div class="game-surface reaction-ready" role="button" tabindex="0" aria-label="Juego de reacción">
        <div class="game-kicker">REACCIÓN</div>
        <div class="game-big" data-main>ESPERA</div>
        <div class="game-help" data-help>No pulses hasta que la pantalla cambie y aparezca AHORA.</div>
        <div class="game-tap" data-tap>NO TOQUES TODAVÍA</div>
      </div>`;

    const surface = container.querySelector('.game-surface');
    const main = container.querySelector('[data-main]');
    const help = container.querySelector('[data-help]');
    const tap = container.querySelector('[data-tap]');

    function finish(payload) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      state = 'finished';
      onFinish(payload);
    }

    function signalGo() {
      if (state !== 'waiting') return;
      state = 'go';
      goAt = performance.now();
      surface.classList.remove('reaction-ready');
      surface.classList.add('reaction-go');
      main.textContent = 'AHORA';
      help.textContent = '¡Pulsa!';
      tap.textContent = 'TOCA';
    }

    function begin() {
      gameStart = performance.now();
      state = 'waiting';
      main.textContent = 'ESPERA';
      timer = setTimeout(signalGo, waitMs);
      surface.focus({ preventScroll: true });
    }

    function press(event) {
      event.preventDefault();
      if (state === 'waiting') {
        const duration = performance.now() - gameStart;
        surface.classList.remove('reaction-ready');
        surface.classList.add('reaction-false');
        main.textContent = '¡ANTES!';
        help.textContent = 'Te has adelantado. El intento cuenta.';
        tap.textContent = 'SALIDA FALSA';
        finish({
          score: falseStartScore,
          duration,
          metadata: { false_start: true, wait_ms: waitMs }
        });
        return;
      }
      if (state === 'go') {
        const now = performance.now();
        const reactionMs = now - goAt;
        const duration = now - gameStart;
        main.textContent = `${Math.round(reactionMs)} ms`;
        help.textContent = 'Tiempo de reacción';
        tap.textContent = 'RESULTADO REGISTRANDO…';
        finish({
          score: reactionMs,
          duration,
          metadata: { false_start: false, wait_ms: waitMs, reaction_ms: Math.round(reactionMs) }
        });
      }
    }

    function key(event) {
      if (event.key === 'Enter' || event.key === ' ') press(event);
    }

    surface.addEventListener('pointerdown', press, { passive: false });
    surface.addEventListener('keydown', key);

    return {
      start: begin,
      destroy() {
        clearTimeout(timer);
        surface.removeEventListener('pointerdown', press);
        surface.removeEventListener('keydown', key);
      }
    };
  });
})();