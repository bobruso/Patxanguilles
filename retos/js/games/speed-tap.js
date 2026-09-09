(() => {
  'use strict';

  window.PatxGameRegistry.register('speed-tap', ({ container, config = {}, onFinish }) => {
    const durationMs = Number(config.duration_ms || 5000);
    let active = false;
    let finished = false;
    let taps = 0;
    let startAt = 0;
    let raf = 0;

    container.innerHTML = `
      <div class="game-surface speed-tap-surface" role="button" tabindex="0">
        <div class="game-kicker">SPEED TAP</div>
        <div class="speed-tap-topline">
          <div class="round-counter" data-time>5.0 s</div>
          <div class="round-counter" data-rate>0.0 /s</div>
        </div>
        <div class="speed-tap-target" data-target>
          <div class="speed-tap-count" data-count>0</div>
          <div class="speed-tap-label">TOQUES</div>
        </div>
        <div class="speed-tap-progress"><div data-progress></div></div>
        <div class="game-help" data-help>Toca cualquier parte de la zona de juego tan rápido como puedas.</div>
        <div class="game-tap" data-tap>¡TOCA!</div>
      </div>`;

    const surface = container.querySelector('.game-surface');
    const countEl = container.querySelector('[data-count]');
    const timeEl = container.querySelector('[data-time]');
    const rateEl = container.querySelector('[data-rate]');
    const progressEl = container.querySelector('[data-progress]');
    const targetEl = container.querySelector('[data-target]');
    const tapEl = container.querySelector('[data-tap]');

    function draw(now) {
      if (!active || finished) return;
      const elapsed = now - startAt;
      const left = Math.max(0, durationMs - elapsed);
      const ratio = Math.max(0, Math.min(1, left / durationMs));
      timeEl.textContent = `${(left / 1000).toFixed(1)} s`;
      rateEl.textContent = `${elapsed > 0 ? (taps / (elapsed / 1000)).toFixed(1) : '0.0'} /s`;
      progressEl.style.transform = `scaleX(${ratio})`;

      if (left <= 0) {
        finished = true;
        active = false;
        surface.classList.add('is-finished');
        tapEl.textContent = 'FIN';
        onFinish({ score: taps, duration: elapsed, metadata: { taps } });
        return;
      }
      raf = requestAnimationFrame(draw);
    }

    function press(event) {
      event.preventDefault();
      if (!active || finished) return;
      taps += 1;
      countEl.textContent = String(taps);
      targetEl.classList.remove('is-hit');
      void targetEl.offsetWidth;
      targetEl.classList.add('is-hit');
    }

    function key(event) {
      if (event.key === 'Enter' || event.key === ' ') press(event);
    }

    surface.addEventListener('pointerdown', press, { passive: false });
    surface.addEventListener('keydown', key);

    return {
      start() {
        surface.focus({ preventScroll: true });
        active = true;
        startAt = performance.now();
        progressEl.style.transform = 'scaleX(1)';
        raf = requestAnimationFrame(draw);
      },
      destroy() {
        active = false;
        finished = true;
        cancelAnimationFrame(raf);
        surface.removeEventListener('pointerdown', press);
        surface.removeEventListener('keydown', key);
      }
    };
  });
})();