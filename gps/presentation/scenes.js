/*
  The five narrative scenes. Each one renders its own markup, owns its animation,
  and returns an optional hand-off shape so the energy line can carry the story on.
*/
import {
  animate,
  clamp,
  countNumber,
  enter,
  esc,
  finite,
  firstFinite,
  fmtDate,
  fmtMinutes,
  initials,
  layer,
  modeLabel,
  reducedMotion,
  stage,
} from './core.js';
import { createCelebration, drawHeatmapAtMinute, drawHrProgress, drawSpeedProgress, drawTrailAtMinute } from './graphics.js';
import { extractHrSeries, extractSpeedSeries } from './data.js';
import { drawHeatmap, drawMovementTrail } from '../pitch-maps.js';

const photoHtml = (data, className) => {
  const url = String(data.player.cardUrl || data.player.photoUrl || '').trim();
  return url
    ? `<img class="${className}" src="${esc(url)}" alt="${esc(data.player.name)}">`
    : `<div class="${className}-fallback">${esc(initials(data.player.name))}</div>`;
};

/* Real cardiac peaks from the stored series, used to drive the pulse rhythm. */
function hrPeakTimes(series, max = 14) {
  if (series.length < 5) return [];
  const peaks = [];
  for (let i = 2; i < series.length - 2; i++) {
    const v = series[i].value;
    if (v >= series[i - 1].value && v >= series[i + 1].value && v > series[i - 2].value && v > series[i + 2].value) {
      peaks.push({ tSec: series[i].tSec, value: v });
    }
  }
  peaks.sort((a, b) => b.value - a.value);
  return peaks.slice(0, max).sort((a, b) => a.tSec - b.tSec);
}

const dash = () => '—';

/* --------------------------------------------------------------- 1 · intro */

export async function runClassicIntro(ctx, api) {
  const { data } = api;
  layer.innerHTML = `<section class="patx-present-scene patx-intro" data-scene="classic-intro">
    <div class="patx-intro-copy">
      <div class="patx-intro-photo-wrap" data-anim="photo">${photoHtml(data, 'patx-intro-photo')}</div>
      <div>
        <h1 class="patx-intro-name" data-anim="name">${esc(data.player.name)}</h1>
        <div class="patx-intro-meta" data-anim="meta">${esc(fmtDate(data.match.date))}<br>${esc(modeLabel(data.match.competition))}${data.match.pitchName ? ` · ${esc(data.match.pitchName)}` : ''}</div>
        <div class="patx-intro-distance" data-anim="distance"><strong id="introDistance" class="patx-present-metric">${finite(data.analysis.distanceM) ? '0.00' : '—'}</strong><span class="patx-present-metric-unit">KM</span></div>
      </div>
    </div>
    <div class="patx-intro-maps" data-anim="maps">
      <article class="patx-map-card">
        <div class="patx-map-caption"><strong>MAPA DE CALOR</strong><span>OCUPACIÓN</span></div>
        <div class="patx-map-stage"><canvas id="introHeatmap"></canvas></div>
      </article>
      <article class="patx-map-card">
        <div class="patx-map-caption"><strong>RECORRIDO</strong><span>MOVIMIENTO</span></div>
        <div class="patx-map-stage"><canvas id="introTrail"></canvas></div>
      </article>
    </div>
  </section>`;

  await Promise.all([
    enter(ctx, '[data-anim="photo"]', 40, 26),
    enter(ctx, '[data-anim="name"]', 250, 32),
    enter(ctx, '[data-anim="meta"]', 360, 24),
    enter(ctx, '[data-anim="distance"]', 480, 30),
    enter(ctx, '[data-anim="maps"]', 210, 22),
  ]);
  if (!ctx.alive) return {};

  const heat = stage.querySelector('#introHeatmap');
  const trail = stage.querySelector('#introTrail');
  const distanceEl = stage.querySelector('#introDistance');
  const totalMinutes = Math.max(1, (Number(data.analysis.durationS) || 3600) / 60);
  const totalKm = finite(data.analysis.distanceM) ? Number(data.analysis.distanceM) / 1000 : null;
  const duration = reducedMotion ? 500 : 7600;
  const startedAt = performance.now();
  let lastMap = 0;

  await new Promise(resolve => {
    const frame = now => {
      if (!ctx.alive) return resolve();
      if (!heat?.isConnected || !trail?.isConnected) return resolve();
      const p = clamp((now - startedAt) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - p, 2.2);
      if (distanceEl) distanceEl.textContent = totalKm == null ? dash() : (totalKm * eased).toFixed(2);
      if (now - lastMap > 75 || p >= 1) {
        const minute = totalMinutes * eased;
        drawHeatmapAtMinute(heat, data.analysis, minute);
        drawTrailAtMinute(trail, data.analysis, minute);
        lastMap = now;
      }
      if (p < 1) ctx.requestAnimationFrame(frame);
      else resolve();
    };
    ctx.requestAnimationFrame(frame);
  });

  drawHeatmapAtMinute(heat, data.analysis, totalMinutes);
  drawTrailAtMinute(trail, data.analysis, totalMinutes);

  await ctx.wait(1400);
  return {};
}

/* ---------------------------------------------------------------- 2 · corazón */

export async function runHeartRate(ctx, api) {
  const { data } = api;
  const analysis = data.analysis;
  const series = extractHrSeries(analysis);
  const avgHr = firstFinite(analysis.avgHr);
  const maxHr = firstFinite(analysis.maxHr, analysis.peakHr);
  const peaks = hrPeakTimes(series);
  const beats = peaks.length >= 4 ? peaks : null;
  const hasMeasuredHr = series.length > 0 || finite(avgHr) || finite(maxHr);

  layer.innerHTML = `<section class="patx-present-scene patx-heart-scene" data-scene="heart">
    <header class="patx-heart-head">
      <div class="patx-present-kicker" data-anim="kicker">PULSACIONES</div>
      <h2 class="patx-present-display" data-anim="title">RESPUESTA<br>CARDÍACA</h2>
    </header>
    <div class="patx-heart-body">
      <div class="patx-heart-stats" data-anim="stats">
        <div class="patx-heart-stat"><span>FRECUENCIA MEDIA</span><div class="patx-heart-value"><strong id="heartAvg">${finite(avgHr) ? '0' : '—'}</strong><small>PPM</small></div></div>
        <div class="patx-heart-core-wrap">
          <div class="patx-heart-core" data-heart-core>
            <div class="patx-heart-disc"></div>
            <div class="patx-heart-rings"></div>
            <svg class="patx-heart-icon" viewBox="0 0 32 29" aria-hidden="true" focusable="false">
              <path d="M16 28.5C16 28.5 1.5 19.6 1.5 10.4 1.5 5.9 5 2.5 9.2 2.5c3 0 5.5 1.6 6.8 4.1 1.3-2.5 3.8-4.1 6.8-4.1 4.2 0 7.7 3.4 7.7 7.9 0 9.2-14.5 18.1-14.5 18.1z"></path>
            </svg>
          </div>
        </div>
        <div class="patx-heart-stat"><span>FRECUENCIA MÁXIMA</span><div class="patx-heart-value"><strong id="heartMax">${finite(maxHr) ? '0' : '—'}</strong><small>PPM</small></div></div>
      </div>
      <div class="patx-heart-chart-shell" data-anim="chart">
        <div class="patx-heart-chart-label">CURVA DE FRECUENCIA CARDÍACA</div>
        <canvas id="heartChart" class="patx-heart-chart"></canvas>
        ${series.length ? '' : '<div class="patx-chart-empty" data-empty-state="hr"><strong>SIN SERIE DE PULSACIONES</strong><span>Este partido no tiene datos de frecuencia cardíaca guardados.</span></div>'}
      </div>
    </div>
  </section>`;

  await Promise.all([
    enter(ctx, '[data-anim="kicker"]', 40),
    enter(ctx, '[data-anim="title"]', 110, 40),
    enter(ctx, '[data-anim="stats"]', 200, 26),
    enter(ctx, '[data-anim="chart"]', 190, 24),
  ]);
  if (!ctx.alive) return {};

  const avgEl = stage.querySelector('#heartAvg');
  const maxEl = stage.querySelector('#heartMax');
  const chart = stage.querySelector('#heartChart');
  const core = stage.querySelector('[data-heart-core]');

  /* Pulse rhythm follows the real recorded cardiac peaks (or the average rate). */
  let beatTimer = 0;
  if (!reducedMotion && core && hasMeasuredHr) {
    const beatOnce = strength => {
      if (!ctx.alive) return;
      core.style.setProperty('--patx-beat', String(strength));
      core.classList.remove('is-beating');
      void core.offsetWidth;
      core.classList.add('is-beating');
    };
    if (beats) {
      const span = Math.max(1, beats.at(-1).tSec - beats[0].tSec);
      const window = 5600;
      let index = 0;
      const schedule = () => {
        if (!ctx.alive || index >= beats.length) return;
        const delay =
          index === 0
            ? 260
            : Math.max(150, ((beats[index].tSec - beats[index - 1].tSec) / span) * window);
        beatTimer = ctx.setTimeout(() => {
          beatOnce(clamp((beats[index].value - 120) / 70 + 0.55, 0.55, 1.25));
          index++;
          schedule();
        }, delay);
      };
      schedule();
    } else {
      const interval = clamp(60000 / (avgHr || 120), 420, 1100);
      const tick = () => {
        if (!ctx.alive) return;
        beatOnce(0.8);
        beatTimer = ctx.setTimeout(tick, interval);
      };
      beatTimer = ctx.setTimeout(tick, 260);
    }
  }

  const jobs = [];
  if (avgEl && finite(avgHr)) jobs.push(countNumber(ctx, avgEl, 0, avgHr, reducedMotion ? 200 : 1150, v => String(Math.round(v))));
  else if (avgEl) avgEl.textContent = '—';
  if (maxEl && finite(maxHr)) jobs.push(countNumber(ctx, maxEl, 0, maxHr, reducedMotion ? 240 : 1300, v => String(Math.round(v))));
  else if (maxEl) maxEl.textContent = '—';

  const duration = reducedMotion ? 500 : 4400;
  const startedAt = performance.now();
  const graph = new Promise(resolve => {
    const frame = now => {
      if (!ctx.alive) return resolve();
      if (!chart?.isConnected) return resolve();
      const p = clamp((now - startedAt) / duration, 0, 1);
      drawHrProgress(chart, analysis, series, p);
      if (p < 1) ctx.requestAnimationFrame(frame);
      else resolve();
    };
    ctx.requestAnimationFrame(frame);
  });

  await Promise.all([...jobs, graph]);
  await ctx.wait(series.length ? 2000 : 900);
  clearTimeout(beatTimer);
  return {};
}

/* --------------------------------------------------------- 3 · sprint/speed */

export async function runSprintSpeed(ctx, api) {
  const { data } = api;
  const analysis = data.analysis;
  const top = firstFinite(analysis.topSpeedKmh);
  const sprints = firstFinite(analysis.sprintCount);
  const movingS = Number(analysis.movingTimeS) || Number(analysis.durationS) || 0;
  const series = extractSpeedSeries(analysis);

  layer.innerHTML = `<section class="patx-present-scene patx-sprint-scene" data-scene="sprint">
    <div class="patx-sprint-sweep" aria-hidden="true"></div>
    <div class="patx-sprint-panel">
      <div class="patx-present-kicker" data-anim="kicker">SPRINTS</div>
      <h2 class="patx-present-display" data-anim="title">RUPTURA<br>Y VELOCIDAD</h2>
      <div class="patx-sprint-main" data-anim="hero">
        <div class="patx-sprint-orb"></div>
        <strong id="sprintMain" class="patx-present-metric">${sprints == null ? '—' : '0'}</strong>
        <span class="patx-present-label">SPRINTS VALIDADOS</span>
      </div>
      <div class="patx-sprint-mini-grid" data-anim="mini">
        <div class="patx-sprint-mini"><span>PICO DE VELOCIDAD</span><strong id="speedMain">${top == null ? '—' : '0.0'}</strong><small>KM/H</small></div>
        <div class="patx-sprint-mini"><span>TIEMPO EN MOVIMIENTO</span><strong>${esc(fmtMinutes(movingS))}</strong><small>ACTIVO</small></div>
      </div>
    </div>
    <div class="patx-sprint-chart-shell" data-anim="chart">
      <div class="patx-speed-badge">VELOCIDAD DURANTE EL PARTIDO</div>
      <canvas id="speedChart" class="patx-speed-chart"></canvas>
      ${series.length ? '' : '<div class="patx-chart-empty" data-empty-state="speed"><strong>SIN SERIE DE VELOCIDAD</strong><span>Este partido no tiene curva de velocidad guardada.</span></div>'}
    </div>
  </section>`;

  await Promise.all([
    enter(ctx, '[data-anim="kicker"]', 40),
    enter(ctx, '[data-anim="title"]', 100, 38),
    enter(ctx, '[data-anim="hero"]', 200, 26),
    enter(ctx, '[data-anim="mini"]', 300, 22),
    enter(ctx, '[data-anim="chart"]', 220, 24),
  ]);
  if (!ctx.alive) return {};

  const canvas = stage.querySelector('#speedChart');
  const sprintEl = stage.querySelector('#sprintMain');
  const speedEl = stage.querySelector('#speedMain');

  /* Counters and the speed curve run at the same time: the numbers land while the
     trace is still being drawn, so the scene reads as acceleration, not as a queue. */
  const counts = Promise.all([
    countNumber(ctx, sprintEl, 0, sprints, reducedMotion ? 200 : 1350, v => (v == null ? dash() : String(Math.round(v)))),
    countNumber(ctx, speedEl, 0, top, reducedMotion ? 200 : 1400, v => (v == null ? dash() : v.toFixed(1))),
  ]);
  const duration = reducedMotion ? 500 : 4400;
  const startedAt = performance.now();
  const graph = new Promise(resolve => {
    const frame = now => {
      if (!ctx.alive) return resolve();
      if (!canvas?.isConnected) return resolve();
      const p = clamp((now - startedAt) / duration, 0, 1);
      drawSpeedProgress(canvas, analysis, series, p);
      if (p < 1) ctx.requestAnimationFrame(frame);
      else resolve();
    };
    ctx.requestAnimationFrame(frame);
  });

  await Promise.all([counts, graph]);
  await ctx.wait(2100);
  return {};
}

/* ------------------------------------------------------------- 4 · histórico */

export async function runComparison(ctx, api) {
  const { data } = api;
  const bundle = data.comparison;
  const score = finite(bundle?.score) ? Number(bundle.score) : null;
  const effortPct = finite(bundle?.effort) ? Number(bundle.effort) * 100 : null;
  const sprintCurrent = finite(bundle?.current?.sprintCount) ? Number(bundle.current.sprintCount) : null;
  const sprintAvg = finite(bundle?.avg?.sprintCount) ? Number(bundle.avg.sprintCount) : null;
  // Removing the former row saves 620ms reveal + 1150ms count when present.
  // Previous two-second trim, plus the subsequently requested 1.5 seconds.
  const readingHoldMs = finite(bundle?.current?.fatigueRetention) ? 3670 : 1900;
  const hasHistory = Number(bundle?.sampleSize) > 0;
  const rows = [
    {
      key: 'effort',
      label: 'ESFUERZO GLOBAL',
      value: effortPct,
      note: 'respecto a tu media',
      format: v => `${v >= 0 ? '+' : ''}${Math.round(v)}%`,
    },
    {
      key: 'sprints',
      label: 'SPRINTS',
      value: sprintCurrent,
      note: finite(sprintAvg) ? `media ${Number(sprintAvg).toFixed(1)}` : 'sin media histórica',
      format: v => String(Math.round(v)),
    },
  ];

  layer.innerHTML = `<section class="patx-present-scene patx-history-scene" data-scene="comparison">
    <header class="patx-history-head" data-anim="head">
      <div class="patx-present-kicker">TU HISTÓRICO GPS</div>
      <h2 class="patx-present-display">ESTE PARTIDO<br>FRENTE A TI</h2>
      <p>${hasHistory ? `Comparado con ${bundle.sampleSize} FIT${bundle.sampleSize === 1 ? '' : 's'} anterior${bundle.sampleSize === 1 ? '' : 'es'} del mismo jugador.` : 'Todavía no hay suficientes FIT anteriores para una comparación completa.'}</p>
    </header>
    <div class="patx-history-body">
      <div class="patx-score-orbit" data-anim="score">
        <svg class="patx-score-ring" viewBox="0 0 240 240" aria-hidden="true">
          <circle class="patx-score-ring-track" cx="120" cy="120" r="96"></circle>
          <circle id="historyScoreRing" class="patx-score-ring-value" cx="120" cy="120" r="96" pathLength="100"></circle>
        </svg>
        <div class="patx-score-orbit-copy">
          <strong id="historyScoreValue">${score == null ? '—' : '0'}</strong><span>/100</span>
          <small>PUNTUACIÓN PARTIDO</small>
          <i>70 = TU PARTIDO MEDIO</i>
        </div>
      </div>
      <div class="patx-history-readout">
        <div class="patx-history-verdict" data-anim="verdict">${esc(bundle?.headline || 'Perfil físico del partido')}</div>
        <div class="patx-history-metrics" data-sequential>
          ${rows
            .map(
              (row, index) => `<article data-metric-row="${row.key}" data-metric-index="${index}" data-anim="row${index}">
            <span>${esc(row.label)}</span>
            <strong id="historyMetric${index}">${row.value == null ? '—' : '0'}</strong>
            <small>${esc(row.note)}</small>
          </article>`,
            )
            .join('')}
        </div>
      </div>
    </div>
  </section>`;

  await Promise.all([enter(ctx, '[data-anim="head"]', 30, 26), enter(ctx, '[data-anim="score"]', 170, 22)]);
  if (!ctx.alive) return {};

  /* 1) the score, ring and counter, fully finished before anything else appears. */
  const scoreJobs = [];
  const scoreEl = stage.querySelector('#historyScoreValue');
  const ring = stage.querySelector('#historyScoreRing');
  if (score != null && scoreEl) {
    scoreJobs.push(countNumber(ctx, scoreEl, 0, score, reducedMotion ? 220 : 1650, v => String(Math.round(v))));
    if (ring) {
      const target = 100 - clamp(score, 0, 100);
      scoreJobs.push(animate(ctx, ring, [{ strokeDashoffset: '100' }, { strokeDashoffset: String(target) }], { duration: reducedMotion ? 0 : 1750, easing: 'cubic-bezier(.22,.8,.2,1)' }));
    }
  }
  await Promise.all(scoreJobs);
  if (!ctx.alive) return {};

  /* 2) then each indicator in order, one reveal plus counter at a time. */
  await enter(ctx, '[data-anim="verdict"]', 0, 18);
  const rowEls = [...stage.querySelectorAll('[data-metric-row]')];
  for (let index = 0; index < rowEls.length; index++) {
    if (!ctx.alive) return {};
    const el = rowEls[index];
    const row = rows[index];
    const value = el.querySelector('strong');
    await enter(ctx, `[data-anim="row${index}"]`, 0, 20, { duration: reducedMotion ? 0 : 620 });
    if (!ctx.alive) return {};
    if (value && row.value != null) {
      await countNumber(ctx, value, 0, row.value, reducedMotion ? 180 : 1150, row.format);
    }
    if (!ctx.alive) return {};
  }

  /* 3) reading time measured after the last metric has fully landed. */
  await ctx.wait(readingHoldMs);

  return {};
}
/* ---------------------------------------------------------------- 5 · outro */

export async function runOutro(ctx, api) {
  const { data, layout } = api;
  const bundle = data.comparison || {};
  const cardUrl = String(data.player.cardUrl || '').trim();
  const score = finite(bundle.score) ? Number(bundle.score) : null;
  const effortPct = finite(bundle.effort) ? Number(bundle.effort) * 100 : null;
  const sprintCurrent = finite(bundle.current?.sprintCount)
    ? Number(bundle.current.sprintCount)
    : firstFinite(data.analysis.sprintCount);
  const sprintAvg = finite(bundle.avg?.sprintCount) ? Number(bundle.avg.sprintCount) : null;
  const distanceKm = finite(data.analysis.distanceM) ? Number(data.analysis.distanceM) / 1000 : null;
  const topSpeed = finite(data.analysis.topSpeedKmh) ? Number(data.analysis.topSpeedKmh) : null;
  const reportHref = `./gps-report.html?match=${encodeURIComponent(data.match?.id ?? '')}&player=${encodeURIComponent(data.player?.id ?? '')}`;

  layer.innerHTML = `<section class="patx-present-scene patx-outro" data-scene="outro">
    <div class="patx-outro-aura" data-anim="aura" aria-hidden="true"></div>
    <canvas class="patx-outro-sparks" data-outro-sparks aria-hidden="true"></canvas>
    <div class="patx-outro-sweep" aria-hidden="true"></div>
    <div class="patx-outro-left" data-anim="left">
      <div class="patx-outro-message">¡Buen partido!</div>
      <div class="patx-outro-stat-big">
        <span>PUNTUACIÓN PARTIDO</span>
        <strong id="outroScore">${score == null ? '—' : '0'}</strong>
        <small>/100 · 70 = tu partido medio</small>
      </div>
      <div class="patx-outro-stat-grid">
        <article><span>ESFUERZO</span><strong id="outroEffort">${effortPct == null ? '—' : '0'}</strong><small>vs tu media</small></article>
        <article><span>SPRINTS</span><strong id="outroSprints">${sprintCurrent == null ? '—' : '0'}</strong><small>${finite(sprintAvg) ? `media ${Number(sprintAvg).toFixed(1)}` : 'sin media histórica'}</small></article>
        <article><span>DISTANCIA</span><strong id="outroDistance">${distanceKm == null ? dash() : '0.00'}</strong><small>km recorridos</small></article>
        <article><span>VELOCIDAD PUNTA</span><strong id="outroTopSpeed">${topSpeed == null ? dash() : '0.0'}</strong><small>km/h</small></article>
      </div>
    </div>
    <div class="patx-special-card-wrap" data-anim="card">
      ${cardUrl
        ? `<img class="patx-special-card-image" src="${esc(cardUrl)}" alt="Carta especial de ${esc(data.player.name)}">`
        : `<div class="patx-special-card-missing" data-empty-state="card"><span>CARTA ESPECIAL</span><strong>${esc(data.player.name)}</strong><small>No hay una carta guardada para este jugador.</small></div>`}
    </div>
    <div class="patx-outro-right" data-anim="right">
      <div class="patx-outro-map-card">
        <div class="patx-map-caption"><strong>MAPA DE CALOR</strong><span>OCUPACIÓN</span></div>
        <div class="patx-map-stage"><canvas id="outroHeatmap"></canvas></div>
      </div>
      <div class="patx-outro-map-card">
        <div class="patx-map-caption"><strong>RECORRIDO</strong><span>MOVIMIENTO</span></div>
        <div class="patx-map-stage"><canvas id="outroTrail"></canvas></div>
      </div>
    </div>
    <div class="patx-outro-footer" data-anim="signature">
      <div class="patx-outro-signature">PATXANGUILLES ANTIFEIXISTES - MATCH PERFORMANCE</div>
      <a class="patx-outro-cta" data-outro-cta href="${esc(reportHref)}">VER ANÁLISIS COMPLETO</a>
    </div>
  </section>`;

  /*
    The closing maps are the same static official renderers the GPS report uses
    (gps/pitch-maps.js), so they carry heatmapGrid, avgPosition and sprintPoints and
    the official canvas sizing.
  */
  drawHeatmap(stage.querySelector('#outroHeatmap'), data.analysis);
  drawMovementTrail(stage.querySelector('#outroTrail'), data.analysis);

  await Promise.all([
    enter(ctx, '[data-anim="aura"]', 10, 0, { duration: 1200 }),
    enter(ctx, '[data-anim="left"]', 170, 24),
    animate(ctx, stage.querySelector('[data-anim="card"]'), [
      { opacity: 0, transform: 'translate3d(0,60px,0) scale(.9)', filter: 'blur(14px)' },
      { opacity: 1, transform: 'translate3d(0,0,0) scale(1)', filter: 'blur(0px)' },
    ], { duration: 1400, delay: 110, easing: 'cubic-bezier(.16,.9,.24,1)' }),
    enter(ctx, '[data-anim="right"]', 250, 24),
    enter(ctx, '[data-anim="signature"]', 780, 16),
  ]);
  if (!ctx.alive) return {};

  const sparks = stage.querySelector('[data-outro-sparks]');
  if (sparks) createCelebration(sparks, ctx, { layout });

  const jobs = [];
  const scoreEl = stage.querySelector('#outroScore');
  if (scoreEl && score != null) jobs.push(countNumber(ctx, scoreEl, 0, score, reducedMotion ? 220 : 1600, v => String(Math.round(v))));
  const effortEl = stage.querySelector('#outroEffort');
  if (effortEl && effortPct != null) jobs.push(countNumber(ctx, effortEl, 0, effortPct, reducedMotion ? 180 : 1250, v => `${v >= 0 ? '+' : ''}${Math.round(v)}%`));
  const sprintEl = stage.querySelector('#outroSprints');
  if (sprintEl) jobs.push(countNumber(ctx, sprintEl, 0, sprintCurrent, reducedMotion ? 180 : 1150, v => (v == null ? dash() : String(Math.round(v)))));
  const distanceEl = stage.querySelector('#outroDistance');
  if (distanceEl) jobs.push(countNumber(ctx, distanceEl, 0, distanceKm, reducedMotion ? 180 : 1350, v => (v == null ? dash() : v.toFixed(2))));
  const topEl = stage.querySelector('#outroTopSpeed');
  if (topEl) jobs.push(countNumber(ctx, topEl, 0, topSpeed, reducedMotion ? 180 : 1350, v => (v == null ? dash() : v.toFixed(1))));
  await Promise.all(jobs);
  if (!ctx.alive) return {};

  const card = stage.querySelector('.patx-special-card-wrap');
  if (card && !reducedMotion) {
    animate(ctx, card, [
      { transform: 'translate3d(0,0,0) scale(1)' },
      { transform: 'translate3d(0,-12px,0) scale(1.012)' },
      { transform: 'translate3d(0,0,0) scale(1)' },
    ], { duration: 6200, easing: 'ease-in-out' });
  }

  /* Stay on the card long enough to be enjoyed; this scene is never faded out. */
  await ctx.wait(9000);
  return {};
}