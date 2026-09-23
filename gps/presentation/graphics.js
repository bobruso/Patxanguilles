/*
  Canvas rendering for the presentation.
  All drawing here reads the already-computed official analysis; nothing is recalculated.
*/
import { clamp, fitCanvas, finite, reducedMotion } from './core.js';

export const PITCH_ASPECT = 68 / 105;

/* ------------------------------------------------------------ pitch drawing */

function pitchMapper(w, h, margin) {
  const pw = w - margin * 2;
  const ph = h - margin * 2;
  return { pw, ph, map: (u, v) => ({ x: margin + u * pw, y: margin + v * ph }) };
}

function drawPitchBase(ctx, w, h, margin) {
  const { pw, ph } = pitchMapper(w, h, margin);
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#123b26' : '#17472e';
    ctx.fillRect(margin + (i * pw) / 12, margin, pw / 12 + 1, ph);
  }
  ctx.strokeStyle = 'rgba(255,255,255,.68)';
  ctx.lineWidth = 2;
  ctx.strokeRect(margin, margin, pw, ph);
  ctx.beginPath();
  ctx.moveTo(margin + pw / 2, margin);
  ctx.lineTo(margin + pw / 2, margin + ph);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(margin + pw / 2, margin + ph / 2, ph * 0.13, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(margin + pw / 2, margin + ph / 2, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  ctx.fill();
  const penW = pw * 0.16;
  const penH = ph * 0.58;
  const goalW = pw * 0.055;
  const goalH = ph * 0.3;
  ctx.strokeRect(margin, margin + (ph - penH) / 2, penW, penH);
  ctx.strokeRect(margin, margin + (ph - goalH) / 2, goalW, goalH);
  ctx.strokeRect(margin + pw - penW, margin + (ph - penH) / 2, penW, penH);
  ctx.strokeRect(margin + pw - goalW, margin + (ph - goalH) / 2, goalW, goalH);
}

function drawDirection(ctx, w, h, margin, analysis) {
  const dir = Number(analysis?.analysisDetail?.positional?.attackDirection) === -1 ? -1 : 1;
  ctx.font = '700 9px system-ui';
  ctx.fillStyle = 'rgba(255,255,255,.78)';
  if (dir === 1) {
    ctx.textAlign = 'left';
    ctx.fillText('◀ DEFENSA', margin + 5, h - 4);
    ctx.textAlign = 'right';
    ctx.fillText('ATAQUE ▶', w - margin - 5, h - 4);
  } else {
    ctx.textAlign = 'left';
    ctx.fillText('◀ ATAQUE', margin + 5, h - 4);
    ctx.textAlign = 'right';
    ctx.fillText('DEFENSA ▶', w - margin - 5, h - 4);
  }
}

const HEAT_STOPS = [
  [0, [28, 62, 199]],
  [0.35, [36, 190, 200]],
  [0.55, [70, 210, 90]],
  [0.75, [244, 218, 42]],
  [1, [231, 43, 38]],
];

/* Degraded-data state for the closing maps: the pitch is still drawn, honestly labelled. */
function drawEmptyPitch(canvas, message) {
  const { ctx, w, h } = fitCanvas(canvas, { minW: 320, minH: 200, aspect: PITCH_ASPECT });
  const margin = Math.max(14, w * 0.03);
  ctx.clearRect(0, 0, w, h);
  drawPitchBase(ctx, w, h, margin);
  ctx.fillStyle = 'rgba(6,10,8,.72)';
  ctx.fillRect(margin, margin, w - margin * 2, h - margin * 2);
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.font = '700 11px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message, w / 2, h / 2);
}

function heatColor(t) {
  for (let i = 1; i < HEAT_STOPS.length; i++) {
    if (t <= HEAT_STOPS[i][0]) {
      const [t0, c0] = HEAT_STOPS[i - 1];
      const [t1, c1] = HEAT_STOPS[i];
      const f = (t - t0) / (t1 - t0 || 1);
      return c0.map((v, j) => Math.round(v + (c1[j] - v) * f));
    }
  }
  return HEAT_STOPS.at(-1)[1];
}

export function drawHeatmapAtMinute(canvas, analysis, minute = Infinity) {
  if (!canvas?.isConnected) return;
  const baseGrid = analysis?.heatmapGrid;
  const trail = analysis?.trail;
  if (!baseGrid?.length) return drawEmptyPitch(canvas, 'SIN OCUPACIÓN GPS');
  const capSec = Number.isFinite(Number(minute)) ? Math.max(0, Number(minute)) * 60 : Infinity;
  let grid = baseGrid;
  if (Number.isFinite(capSec) && Array.isArray(trail) && trail.length) {
    const gy = baseGrid.length;
    const gx = baseGrid[0]?.length || 0;
    grid = Array.from({ length: gy }, () => Array(gx).fill(0));
    for (const pt of trail) {
      const t = Number(pt?.tSec);
      if (Number.isFinite(t) && t > capSec) continue;
      const u = clamp(Number(pt?.u) || 0, 0, 0.999999);
      const v = clamp(Number(pt?.v) || 0, 0, 0.999999);
      const x = Math.min(gx - 1, Math.floor(u * gx));
      const y = Math.min(gy - 1, Math.floor(v * gy));
      if (x >= 0 && y >= 0) grid[y][x] += 1;
    }
  }
  const { ctx, w, h } = fitCanvas(canvas, { minW: 320, minH: 200, aspect: PITCH_ASPECT });
  const margin = Math.max(14, w * 0.03);
  const { pw, ph, map } = pitchMapper(w, h, margin);
  ctx.clearRect(0, 0, w, h);
  drawPitchBase(ctx, w, h, margin);
  const gx = grid[0]?.length || 0;
  const gy = grid.length;
  const max = Math.max(1, ...grid.flat());
  const cellW = pw / Math.max(1, gx);
  const radius = Math.max(11, cellW * 1.8);
  const layer = document.createElement('canvas');
  layer.width = Math.max(1, Math.round(w));
  layer.height = Math.max(1, Math.round(h));
  const lctx = layer.getContext('2d');
  for (let y = 0; y < gy; y++) {
    for (let x = 0; x < gx; x++) {
      const value = grid[y][x];
      if (value <= 0) continue;
      const intensity = Math.pow(value / max, 0.55);
      const p = map((x + 0.5) / gx, (y + 0.5) / gy);
      const g = lctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
      g.addColorStop(0, `rgba(0,0,0,${0.92 * intensity})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lctx.fillStyle = g;
      lctx.fillRect(p.x - radius, p.y - radius, radius * 2, radius * 2);
    }
  }
  const img = lctx.getImageData(0, 0, layer.width, layer.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3] / 255;
    if (a <= 0.02) {
      d[i + 3] = 0;
      continue;
    }
    const c = heatColor(a);
    d[i] = c[0];
    d[i + 1] = c[1];
    d[i + 2] = c[2];
    d[i + 3] = Math.min(235, a * 235);
  }
  lctx.putImageData(img, 0, 0);
  ctx.drawImage(layer, 0, 0, w, h);
  drawDirection(ctx, w, h, margin, analysis);
}

function timeColor(t) {
  return [Math.round(137 + (255 - 137) * t), Math.round(88 + (149 - 88) * t), Math.round(248 + (28 - 248) * t)];
}

export function drawTrailAtMinute(canvas, analysis, minute = Infinity) {
  if (!canvas?.isConnected) return;
  const allPts = analysis?.trail;
  if (!allPts?.length) return drawEmptyPitch(canvas, 'SIN RECORRIDO GPS');
  const capSec = Number.isFinite(Number(minute)) ? Math.max(0, Number(minute)) * 60 : Infinity;
  let pts = allPts.filter(p => !Number.isFinite(Number(p?.tSec)) || Number(p.tSec) <= capSec);
  if (!pts.length) pts = [allPts[0]];
  const { ctx, w, h } = fitCanvas(canvas, { minW: 320, minH: 200, aspect: PITCH_ASPECT });
  const margin = Math.max(14, w * 0.03);
  const { map } = pitchMapper(w, h, margin);
  ctx.clearRect(0, 0, w, h);
  drawPitchBase(ctx, w, h, margin);
  const tMax = allPts.at(-1)?.tSec || 1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.5, w / 520);
  for (let i = 1; i < pts.length; i++) {
    const a = map(pts[i - 1].u, pts[i - 1].v);
    const b = map(pts[i].u, pts[i].v);
    const c = timeColor(Math.min(1, (pts[i].tSec || i) / tMax));
    ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},.68)`;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  const start = map(allPts[0].u, allPts[0].v);
  const endPt = pts.at(-1);
  const end = map(endPt.u, endPt.v);
  ctx.beginPath();
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 2;
  ctx.arc(start.x, start.y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#111';
  ctx.font = '800 9px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('I', start.x, start.y + 0.5);
  ctx.beginPath();
  ctx.fillStyle = '#ffb01e';
  ctx.strokeStyle = '#111';
  ctx.arc(end.x, end.y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#111';
  ctx.fillText('F', end.x, end.y + 0.5);
  drawDirection(ctx, w, h, margin, analysis);
}

/* ------------------------------------------------------------- line charts */

const CHART_FONT = '700 13px Inter, system-ui, sans-serif';

function chartFrame(ctx, w, h, pad) {
  const gw = w - pad.l - pad.r;
  const gh = h - pad.t - pad.b;
  ctx.strokeStyle = 'rgba(255,255,255,.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = Math.round(pad.t + (gh * i) / 4) + 0.5;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(w - pad.r, y);
    ctx.stroke();
  }
  return { gw, gh };
}

function seriesGeometry(series, { pad, gw, gh, maxT, minV, maxV }) {
  return series.map(p => ({
    t: Number(p.tSec),
    v: Number(p.value),
    x: pad.l + (Number(p.tSec) / maxT) * gw,
    y: pad.t + gh - ((Number(p.value) - minV) / (maxV - minV)) * gh,
  }));
}

function tracePath(ctx, pts, uptoT) {
  ctx.beginPath();
  let started = false;
  let last = null;
  for (const p of pts) {
    if (last && p.t > uptoT) {
      const span = p.t - last.t || 1;
      const f = clamp((uptoT - last.t) / span, 0, 1);
      const x = last.x + (p.x - last.x) * f;
      const y = last.y + (p.y - last.y) * f;
      if (started) ctx.lineTo(x, y);
      return { started, end: { x, y } };
    }
    if (!started) {
      ctx.moveTo(p.x, p.y);
      started = true;
    } else {
      ctx.lineTo(p.x, p.y);
    }
    last = p;
  }
  return { started, end: last ? { x: last.x, y: last.y } : null };
}

/*
  Heart-rate curve. The chart builds while the counters run, and the measured peak
  is ticked once the trace reaches it.
*/
export function drawHrProgress(canvas, analysis, series, progress) {
  if (!canvas?.isConnected) return;
  const { ctx, w, h } = fitCanvas(canvas, { minW: 400, minH: 200 });
  ctx.clearRect(0, 0, w, h);
  const pad = { l: 46, r: 30, t: 30, b: 38 };
  const { gw, gh } = chartFrame(ctx, w, h, pad);

  if (!series.length) {
    /* The scene supplies the wording; the chart only shows its empty grid. */
    ctx.strokeStyle = 'rgba(255,255,255,.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t + gh);
    ctx.lineTo(w - pad.r, pad.t + gh);
    ctx.stroke();
    return;
  }

  const values = series.map(p => p.value);
  const minHr = Math.max(60, Math.min(...values) - 10);
  const maxHr = Math.max(minHr + 25, Math.max(...values) + 10);
  const maxT = Math.max(1, series.at(-1)?.tSec || Number(analysis.durationS) || 3600);
  const pts = seriesGeometry(series, { pad, gw, gh, maxT, minV: minHr, maxV: maxHr });
  const uptoT = maxT * clamp(progress, 0, 1);

  const fill = ctx.createLinearGradient(0, pad.t, 0, pad.t + gh);
  fill.addColorStop(0, 'rgba(227,38,46,.30)');
  fill.addColorStop(1, 'rgba(227,38,46,0)');
  ctx.beginPath();
  const seg = tracePath(ctx, pts, uptoT);
  if (seg.started && seg.end) {
    ctx.lineTo(seg.end.x, pad.t + gh);
    ctx.lineTo(pad.l, pad.t + gh);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  const stroke = ctx.createLinearGradient(0, pad.t, 0, pad.t + gh);
  stroke.addColorStop(0, '#ff5a4d');
  stroke.addColorStop(1, 'rgba(227,38,46,.55)');
  tracePath(ctx, pts, uptoT);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(2.4, w / 620);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  if (progress > 0.9 && finite(analysis?.maxHr)) {
    const peak = pts.reduce((best, p) => (p.y < best.y ? p : best), pts[0]);
    ctx.beginPath();
    ctx.arc(peak.x, peak.y, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe066';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,224,102,.32)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(peak.x, peak.y - 8);
    ctx.lineTo(peak.x, pad.t);
    ctx.stroke();
    ctx.fillStyle = '#ffe066';
    ctx.font = '800 12px Inter, system-ui, sans-serif';
    ctx.textAlign = peak.x > w - pad.r - 70 ? 'right' : 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`${Math.round(Number(analysis.maxHr))} PPM`, peak.x > w - pad.r - 70 ? peak.x - 8 : peak.x + 8, Math.max(pad.t + 12, peak.y - 12));
  }

  ctx.fillStyle = 'rgba(255,255,255,.46)';
  ctx.font = CHART_FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${Math.round(maxHr)} PPM`, pad.l, 18);
  ctx.fillText('0′', pad.l, h - 12);
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.round(maxT / 60)}′`, w - pad.r, h - 12);
}

/*
  Speed curve using analysis.topSpeedKmh unchanged, with real sprint events marked.
*/
export function drawSpeedProgress(canvas, analysis, series, progress) {
  const { ctx, w, h } = fitCanvas(canvas, { minW: 400, minH: 240 });
  ctx.clearRect(0, 0, w, h);
  const pad = { l: 46, r: 32, t: 34, b: 42 };
  const { gw, gh } = chartFrame(ctx, w, h, pad);
  if (!series.length) {
    ctx.strokeStyle = 'rgba(255,255,255,.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t + gh);
    ctx.lineTo(w - pad.r, pad.t + gh);
    ctx.stroke();
    return;
  }

  const top = finite(analysis?.topSpeedKmh) ? Number(analysis.topSpeedKmh) : Math.max(...series.map(p => Number(p.value) || 0));
  const maxT = Math.max(1, series.at(-1)?.tSec || Number(analysis.durationS) || 3600);
  const maxV = Math.max(10, top, ...series.map(p => Number(p.value) || 0)) * 1.1;
  const pts = seriesGeometry(series, { pad, gw, gh, maxT, minV: 0, maxV });
  const uptoT = maxT * clamp(progress, 0, 1);

  const sprints = Array.isArray(analysis?.analysisDetail?.speed?.sprints) ? analysis.analysisDetail.speed.sprints : [];
  for (const sprint of sprints) {
    const t = Number(sprint?.tSec);
    if (!Number.isFinite(t) || t > uptoT) continue;
    const x = pad.l + (t / maxT) * gw;
    ctx.strokeStyle = 'rgba(255,224,102,.26)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, pad.t + gh);
    ctx.lineTo(x, pad.t + gh - gh * 0.16);
    ctx.stroke();
  }

  const fill = ctx.createLinearGradient(0, pad.t, 0, pad.t + gh);
  fill.addColorStop(0, 'rgba(244,247,244,.22)');
  fill.addColorStop(1, 'rgba(244,247,244,0)');
  ctx.beginPath();
  const seg = tracePath(ctx, pts, uptoT);
  if (seg.started && seg.end) {
    ctx.lineTo(seg.end.x, pad.t + gh);
    ctx.lineTo(pad.l, pad.t + gh);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  tracePath(ctx, pts, uptoT);
  ctx.strokeStyle = '#f4f7f4';
  ctx.lineWidth = Math.max(1.6, w / 900);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  /*
    Peak tag: anchored on the official topSpeedEvent when the analysis carries one,
    otherwise on the stored sample closest in value to the official top speed. The
    metric is never recomputed here, and with no official top speed there is no tag.
  */
  const officialTop = finite(analysis?.topSpeedKmh) ? Number(analysis.topSpeedKmh) : null;
  const eventSec = analysis?.analysisDetail?.speed?.topSpeedEvent?.tSec;
  const hasEvent = finite(eventSec);
  if (progress > 0.86 && officialTop != null) {
    let best = null;
    for (const p of pts) {
      const score = hasEvent ? Math.abs(p.t - Number(eventSec)) : Math.abs(p.v - officialTop);
      if (!best || score < best.score) best = { p, score };
    }
    if (best) {
      const { x, y } = best.p;
      const spike = clamp((progress - 0.86) / 0.14, 0, 1);
      ctx.beginPath();
      ctx.arc(x, y, 3.4 + 5 * (1 - spike), 0, Math.PI * 2);
      ctx.fillStyle = '#ffe066';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,224,102,.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x, pad.t);
      ctx.stroke();
      ctx.globalAlpha = spike;
      ctx.fillStyle = '#ffe066';
      ctx.font = '800 13px Inter, system-ui, sans-serif';
      ctx.textAlign = x > w - pad.r - 90 ? 'right' : 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(`${officialTop.toFixed(1)} KM/H`, x > w - pad.r - 90 ? x - 10 : x + 10, Math.max(pad.t + 14, y - 14));
      ctx.globalAlpha = 1;
    }
  }

  ctx.fillStyle = 'rgba(255,255,255,.46)';
  ctx.font = CHART_FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('0′', pad.l, h - 12);
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.round(maxT / 60)}′`, w - pad.r, h - 12);
}

/* --------------------------------------------------------- outro celebration */

/*
  Recognisable fireworks: several staggered radial bursts, each particle with a short
  trail, drawn behind the content. Deterministic (seeded) so QA screenshots are
  reproducible, and bounded in particle count, canvas size and rAF lifetime.
*/
const BURST_COLORS = {
  acid: [228, 255, 69],
  ivory: [245, 243, 236],
  red: [255, 106, 90],
};

const BURSTS_LAYOUT = [
  { at: 0.15, x: 0.17, y: 0.34, color: 'acid', radius: 132, count: 30 },
  { at: 0.7, x: 0.83, y: 0.26, color: 'ivory', radius: 112, count: 26 },
  { at: 1.2, x: 0.5, y: 0.15, color: 'red', radius: 104, count: 24 },
  { at: 1.85, x: 0.28, y: 0.52, color: 'acid', radius: 118, count: 26 },
  { at: 2.45, x: 0.74, y: 0.48, color: 'ivory', radius: 108, count: 24 },
  { at: 3.15, x: 0.5, y: 0.38, color: 'red', radius: 150, count: 34 },
];

export function createCelebration(canvas, ctx, options = {}) {
  const portrait = options.layout === 'portrait';
  const { ctx: c, w, h } = fitCanvas(canvas, { minW: 320, minH: 220 });
  let seed = options.seed || 20260923;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  /* Portrait keeps the bursts in the upper half so the card stays clear. */
  const bursts = BURSTS_LAYOUT.map(b => ({
    ...b,
    px: b.x * w,
    py: (portrait ? b.y * 0.82 + 0.06 : b.y) * h,
    parts: Array.from({ length: b.count }, (_, i) => {
      const angle = (i / b.count) * Math.PI * 2 + rand() * 0.24;
      const speed = b.radius * (0.72 + rand() * 0.42);
      return {
        ax: Math.cos(angle) * speed,
        ay: Math.sin(angle) * speed,
        x: 0,
        y: 0,
        px: 0,
        py: 0,
        sinceTail: 0,
        life: 1.05 + rand() * 0.55,
        size: 1.1 + rand() * 1.5,
      };
    }),
  }));

  const TOTAL_MS = 6600;
  const FIXED_DT = 1 / 60;
  /* Mild time-based drag: total travel approaches v / K_DRAG, so a 132 px burst
     really does open to roughly that radius instead of collapsing to a few pixels. */
  const K_DRAG = 1.15;
  const GRAVITY = 42;
  const DRAG_PER_STEP = Math.exp(-K_DRAG * FIXED_DT);

  const drawBurst = (burst, age) => {
    const rgb = BURST_COLORS[burst.color] || BURST_COLORS.ivory;
    const flash = clamp(1 - age / 0.18, 0, 1);
    if (flash > 0) {
      c.beginPath();
      c.fillStyle = `rgba(255,255,255,${(0.5 * flash).toFixed(3)})`;
      c.arc(burst.px, burst.py, 4 + 16 * (1 - flash), 0, Math.PI * 2);
      c.fill();
    }
    for (const p of burst.parts) {
      const t = age;
      if (t > p.life) continue;
      const fade = Math.pow(1 - t / p.life, 1.5);
      const alpha = clamp(fade, 0, 1) * 0.95;
      if (alpha <= 0.02) continue;
      c.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${(alpha * 0.55).toFixed(3)})`;
      c.lineWidth = Math.max(0.7, p.size * 0.85);
      c.beginPath();
      c.moveTo(burst.px + p.px, burst.py + p.py);
      c.lineTo(burst.px + p.x, burst.py + p.y);
      c.stroke();
      c.beginPath();
      c.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha.toFixed(3)})`;
      c.arc(burst.px + p.x, burst.py + p.y, p.size, 0, Math.PI * 2);
      c.fill();
    }
  };

  const step = seconds => {
    for (const burst of bursts) {
      const age = seconds - burst.at;
      if (age <= 0) continue;
      for (const p of burst.parts) {
        if (age > p.life) continue;
        p.ax *= DRAG_PER_STEP;
        p.ay = p.ay * DRAG_PER_STEP + GRAVITY * FIXED_DT;
        p.x += p.ax * FIXED_DT;
        p.y += p.ay * FIXED_DT;
        /* A short visible tail: the position ~85 ms ago. */
        p.sinceTail += 1;
        if (p.sinceTail >= 5) {
          p.sinceTail = 0;
          p.px = p.x;
          p.py = p.y;
        }
      }
    }
  };

  const render = seconds => {
    c.clearRect(0, 0, w, h);
    for (const burst of bursts) {
      const age = seconds - burst.at;
      if (age > 0) drawBurst(burst, age);
    }
  };

  /* Reduced motion: one static, already-expanded frame. No rAF at all. */
  if (reducedMotion) {
    const still = 1.15;
    for (let i = 1; i <= Math.round(still / FIXED_DT); i++) step(i * FIXED_DT);
    render(still);
    return () => c.clearRect(0, 0, w, h);
  }

  const clock = typeof options.now === 'function' ? options.now : () => performance.now();
  const start = clock();
  let accumulated = 0;
  let lastFrame = start;
  let simTime = 0;
  const frame = now => {
    if (!ctx.alive) return;
    if (now - start > TOTAL_MS) {
      c.clearRect(0, 0, w, h);
      return;
    }
    /* Accumulate elapsed time on EVERY frame (a 60 Hz frame is only 16.7 ms, so a
       "draw only when dt >= 20 ms" gate after resetting the clock would never draw).
       Simulation runs at a fixed step; drawing happens whenever a step was taken, so
       60 Hz and 120 Hz produce the same physics and a consistent frame rate. */
    accumulated += Math.max(0, now - lastFrame) / 1000;
    lastFrame = now;
    if (accumulated > 0.25) accumulated = 0.25;
    let steps = 0;
    while (accumulated >= FIXED_DT && steps < 16) {
      simTime += FIXED_DT;
      step(simTime);
      accumulated -= FIXED_DT;
      steps += 1;
    }
    if (steps > 0) render(simTime);
    ctx.requestAnimationFrame(frame);
  };
  ctx.requestAnimationFrame(frame);
  return () => c.clearRect(0, 0, w, h);
}
