(() => {
  'use strict';

  window.PatxGameRegistry.register('keep-up', ({ container, config = {}, onFinish }) => {
    const gravity = Number(config.gravity || 1650);
    const impulse = Number(config.impulse || -620);
    const maxTouches = Number(config.max_touches || 200);
    const maxDuration = Number(config.max_duration_ms || 30000);
    let x = .5, y = .36, vx = 40, vy = 0;
    let touches = 0, startedAt = 0, lastAt = 0, raf = 0, finished = false;

    container.innerHTML = `
      <div class="football-surface keepup-surface">
        <div class="football-score"><span data-score>0</span><small>TOQUES</small></div>
        <div class="keepup-ball" data-ball aria-label="Balón">⚽</div>
        <div class="football-hint" data-help>Toca el balón antes de que caiga</div>
      </div>`;

    const surface = container.querySelector('.football-surface');
    const ball = container.querySelector('[data-ball]');
    const scoreEl = container.querySelector('[data-score]');
    const help = container.querySelector('[data-help]');

    function render() {
      const w = surface.clientWidth || 320;
      const h = surface.clientHeight || 410;
      ball.style.left = `${x * w}px`;
      ball.style.top = `${y * h}px`;
    }

    function end() {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      help.textContent = touches ? 'El balón cayó' : 'Ni un toque';
      onFinish({ score: touches, duration: performance.now() - startedAt, metadata: { touches } });
    }

    function frame(now) {
      if (finished) return;
      if (!lastAt) lastAt = now;
      const dt = Math.min((now - lastAt) / 1000, .035);
      lastAt = now;
      const w = surface.clientWidth || 320;
      const h = surface.clientHeight || 410;
      const radius = Math.max(24, Math.min(w, h) * .065);

      vy += gravity * dt;
      x += (vx * dt) / w;
      y += (vy * dt) / h;
      if (x * w < radius) { x = radius / w; vx = Math.abs(vx); }
      if (x * w > w - radius) { x = (w - radius) / w; vx = -Math.abs(vx); }
      if (y * h < radius) { y = radius / h; vy = Math.abs(vy) * .35; }

      render();
      if (y * h > h - radius || now - startedAt >= maxDuration || touches >= maxTouches) return end();
      raf = requestAnimationFrame(frame);
    }

    function press(event) {
      if (finished) return;
      event.preventDefault();
      const r = surface.getBoundingClientRect();
      const px = event.clientX - r.left;
      const py = event.clientY - r.top;
      const bx = x * r.width;
      const by = y * r.height;
      const radius = Math.max(34, Math.min(r.width, r.height) * .09);
      const dx = px - bx, dy = py - by;
      if (Math.hypot(dx, dy) > radius) return;
      touches += 1;
      scoreEl.textContent = touches;
      vy = impulse;
      vx += Math.max(-180, Math.min(180, -dx * 4.2));
      vx = Math.max(-260, Math.min(260, vx));
      ball.classList.remove('is-hit');
      void ball.offsetWidth;
      ball.classList.add('is-hit');
      help.textContent = touches < 3 ? '¡Sigue!' : touches < 10 ? 'Buen toque' : 'No la dejes caer';
    }

    surface.addEventListener('pointerdown', press, { passive: false });

    return {
      start() {
        startedAt = performance.now();
        lastAt = startedAt;
        render();
        raf = requestAnimationFrame(frame);
      },
      destroy() {
        finished = true;
        cancelAnimationFrame(raf);
        surface.removeEventListener('pointerdown', press);
      }
    };
  });
})();