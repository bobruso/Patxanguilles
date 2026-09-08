(() => {
  'use strict';

  window.PatxGameRegistry.register('stop-seven', ({ container, config = {}, onFinish }) => {
    const targetMs = Number(config.target_ms || 7000);
    const maxDurationMs = Number(config.max_duration_ms || 14000);
    let state = 'ready';
    let startAt = 0;
    let raf = 0;
    let finished = false;

    container.innerHTML = `
      <div class="game-surface" role="button" tabindex="0" aria-label="Juego Stop 7">
        <div class="game-kicker">STOP 7</div>
        <div class="game-big" data-time>7.000</div>
        <div class="game-help" data-help>Primer toque: empieza el cronómetro. Segundo toque: lo detiene.</div>
        <div class="game-tap" data-tap>TOCA PARA EMPEZAR</div>
      </div>`;

    const surface = container.querySelector('.game-surface');
    const timeEl = container.querySelector('[data-time]');
    const helpEl = container.querySelector('[data-help]');
    const tapEl = container.querySelector('[data-tap]');

    function draw(now) {
      if (state !== 'running') return;
      const elapsed = now - startAt;
      if (elapsed < 3000) {
        timeEl.textContent = (elapsed / 1000).toFixed(3);
      } else {
        timeEl.textContent = '—.———';
      }
      if (elapsed >= maxDurationMs) {
        stop(maxDurationMs);
        return;
      }
      raf = requestAnimationFrame(draw);
    }

    function begin() {
      state = 'running';
      startAt = performance.now();
      timeEl.textContent = '0.000';
      helpEl.textContent = 'El cronómetro desaparecerá a los 3 segundos. Confía en tu cabeza.';
      tapEl.textContent = 'TOCA PARA PARAR';
      raf = requestAnimationFrame(draw);
    }

    function stop(forcedDuration = null) {
      if (state !== 'running' || finished) return;
      const durationMs = forcedDuration == null ? performance.now() - startAt : forcedDuration;
      const score = Math.abs(durationMs - targetMs);
      state = 'finished';
      finished = true;
      cancelAnimationFrame(raf);
      timeEl.textContent = (durationMs / 1000).toFixed(3);
      helpEl.textContent = `Objetivo: ${(targetMs / 1000).toFixed(3)} s`;
      tapEl.textContent = 'RESULTADO REGISTRANDO…';
      onFinish({
        score,
        duration: durationMs,
        metadata: {
          target_ms: targetMs,
          stopped_ms: Math.round(durationMs)
        }
      });
    }

    function handlePress(event) {
      event.preventDefault();
      if (state === 'ready') begin();
      else if (state === 'running') stop();
    }

    function handleKey(event) {
      if (event.key === 'Enter' || event.key === ' ') handlePress(event);
    }

    surface.addEventListener('pointerdown', handlePress, { passive: false });
    surface.addEventListener('keydown', handleKey);

    return {
      start() {
        state = 'ready';
        surface.focus({ preventScroll: true });
      },
      destroy() {
        cancelAnimationFrame(raf);
        surface.removeEventListener('pointerdown', handlePress);
        surface.removeEventListener('keydown', handleKey);
      }
    };
  });
})();