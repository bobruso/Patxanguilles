(() => {
  'use strict';

  window.PatxGameRegistry.register('speed-tap', ({ container, config = {}, onFinish }) => {
    const durationMs = Number(config.duration_ms || 5000);
    let active = false;
    let finished = false;
    let taps = 0;
    let startAt = 0;
    let raf = 0;
    let countdownTimer = 0;

    container.innerHTML = `
      <div class="game-surface speed-tap-surface" role="button" tabindex="0">
        <div class="game-kicker">SPEED TAP</div>
        <div class="game-big" data-count>3</div>
        <div class="game-help" data-help>Prepárate. Cuando aparezca ¡YA!, toca tan rápido como puedas durante 5 segundos.</div>
        <div class="game-tap" data-tap>ESPERA…</div>
      </div>`;

    const surface = container.querySelector('.game-surface');
    const countEl = container.querySelector('[data-count]');
    const helpEl = container.querySelector('[data-help]');
    const tapEl = container.querySelector('[data-tap]');

    function draw(now) {
      if (!active || finished) return;
      const elapsed = now - startAt;
      const left = Math.max(0, durationMs - elapsed);
      helpEl.textContent = `${(left / 1000).toFixed(1)} s`;
      if (left <= 0) {
        finished = true;
        active = false;
        countEl.textContent = taps;
        tapEl.textContent = 'FIN';
        onFinish({ score: taps, duration: elapsed, metadata: { taps } });
        return;
      }
      raf = requestAnimationFrame(draw);
    }

    function begin() {
      active = true;
      startAt = performance.now();
      countEl.textContent = '0';
      helpEl.textContent = '5.0 s';
      tapEl.textContent = '¡TOCA!';
      raf = requestAnimationFrame(draw);
    }

    function press(event) {
      event.preventDefault();
      if (!active || finished) return;
      taps += 1;
      countEl.textContent = String(taps);
    }

    function key(event) {
      if (event.key === 'Enter' || event.key === ' ') press(event);
    }

    surface.addEventListener('pointerdown', press, { passive: false });
    surface.addEventListener('keydown', key);

    return {
      start() {
        surface.focus({ preventScroll: true });
        let value = 3;
        countEl.textContent = String(value);
        countdownTimer = window.setInterval(() => {
          value -= 1;
          if (value > 0) countEl.textContent = String(value);
          else {
            clearInterval(countdownTimer);
            countEl.textContent = '¡YA!';
            setTimeout(begin, 180);
          }
        }, 420);
      },
      destroy() {
        active = false;
        finished = true;
        cancelAnimationFrame(raf);
        clearInterval(countdownTimer);
        surface.removeEventListener('pointerdown', press);
        surface.removeEventListener('keydown', key);
      }
    };
  });
})();