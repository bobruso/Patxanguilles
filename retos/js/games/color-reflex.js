(() => {
  'use strict';

  window.PatxGameRegistry.register('color-reflex', ({ container, config = {}, seed = 1, onFinish }) => {
    const rounds = Number(config.rounds || 8);
    const timeoutMs = Number(config.round_timeout_ms || 2200);
    const names = ['ROJO','AZUL','VERDE','AMARILLO'];
    let state = Number(seed) || 1;
    let round = 0;
    let correct = 0;
    let reactionSum = 0;
    let roundStart = 0;
    let startedAt = 0;
    let timer = 0;
    let finished = false;
    let target = 0;

    function rnd() {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    }

    container.innerHTML = `
      <div class="game-surface color-reflex-surface">
        <div class="game-kicker">COLOR REFLEX</div>
        <div class="round-counter" data-round>Ronda 1 / ${rounds}</div>
        <div class="color-target" data-target>PREPÁRATE</div>
        <div class="color-grid">
          ${names.map((name,i)=>`<button type="button" class="color-option color-${i}" data-color="${i}">${name}</button>`).join('')}
        </div>
        <div class="game-help" data-help>Toca el color que se pide. Importa acertar y hacerlo rápido.</div>
      </div>`;

    const roundEl = container.querySelector('[data-round]');
    const targetEl = container.querySelector('[data-target]');
    const helpEl = container.querySelector('[data-help]');

    function end() {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      const duration = performance.now() - startedAt;
      const score = Math.max(correct * 1000 - Math.round(reactionSum), 0);
      targetEl.textContent = `${correct} / ${rounds}`;
      helpEl.textContent = 'Resultado registrando…';
      onFinish({ score, duration, metadata: { correct, reaction_sum_ms: Math.round(reactionSum), rounds } });
    }

    function nextRound() {
      clearTimeout(timer);
      if (round >= rounds) return end();
      target = Math.floor(rnd() * names.length);
      roundEl.textContent = `Ronda ${round + 1} / ${rounds}`;
      targetEl.textContent = names[target];
      roundStart = performance.now();
      timer = setTimeout(() => {
        round += 1;
        helpEl.textContent = 'Demasiado lento.';
        setTimeout(nextRound, 180);
      }, timeoutMs);
    }

    function press(event) {
      const button = event.target.closest('[data-color]');
      if (!button || finished) return;
      event.preventDefault();
      clearTimeout(timer);
      const chosen = Number(button.dataset.color);
      const elapsed = performance.now() - roundStart;
      if (chosen === target) {
        correct += 1;
        reactionSum += elapsed;
        helpEl.textContent = '¡Bien!';
      } else {
        helpEl.textContent = 'Fallaste el color.';
      }
      round += 1;
      setTimeout(nextRound, 180);
    }

    container.addEventListener('pointerdown', press, { passive: false });

    return {
      start() {
        startedAt = performance.now();
        setTimeout(nextRound, 450);
      },
      destroy() {
        finished = true;
        clearTimeout(timer);
        container.removeEventListener('pointerdown', press);
      }
    };
  });
})();