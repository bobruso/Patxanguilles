/*
  Data access for the presentation. Every metric comes from the stored analysis:
  nothing here recomputes speed, thresholds, zones or the score formula weights.
*/
import { fromSupabaseRow } from '../fit-analysis-v230.js?v=230';
import { buildFatigueProfile } from '../fatigue-profile.js';
import { clamp, finite, meanFinite, pathGet } from './core.js';

export const SUPABASE_URL = 'https://cnnhstlguewrxjihhlqc.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_uWEwYEMkAe3YkeAzX7ACAg_0aEYHmM6';

export function normalizeSeries(raw, { timeKeys = ['tSec', 'timeSec', 'elapsedSec', 'sec', 't', 'time'], valueKeys = ['value'] } = {}) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (item == null) continue;
    let t = null;
    let v = null;
    for (const key of timeKeys) {
      if (finite(item?.[key])) {
        t = Number(item[key]);
        break;
      }
    }
    for (const key of valueKeys) {
      if (finite(item?.[key])) {
        v = Number(item[key]);
        break;
      }
    }
    if (t == null && Array.isArray(item) && finite(item[0])) t = Number(item[0]);
    if (v == null && Array.isArray(item) && finite(item[1])) v = Number(item[1]);
    if (t == null || v == null) continue;
    out.push({ tSec: t, value: v });
  }
  return out.sort((a, b) => a.tSec - b.tSec);
}

export function extractHrSeries(analysis) {
  const raw =
    pathGet(analysis, ['analysisDetail', 'heartRate', 'series']) ??
    pathGet(analysis, ['analysisDetail', 'hr', 'hrSeries']) ??
    pathGet(analysis, ['analysisDetail', 'heartRate', 'hrSeries']) ??
    pathGet(analysis, ['analysisDetail', 'hr', 'series']) ??
    pathGet(analysis, ['analysisDetail', 'heartRateSeries']) ??
    analysis?.hrSeries ??
    [];
  return normalizeSeries(raw, { valueKeys: ['value', 'hr', 'bpm', 'heartRate'] });
}

export function extractSpeedSeries(analysis) {
  const raw =
    pathGet(analysis, ['analysisDetail', 'speed', 'speedSeries']) ??
    pathGet(analysis, ['analysisDetail', 'speed', 'series']) ??
    analysis?.speedSeries ??
    [];
  return normalizeSeries(raw, { valueKeys: ['value', 'speedKmh', 'kmh', 'speed'] });
}

export function hasHrData(analysis) {
  return extractHrSeries(analysis).length > 0 || finite(analysis?.avgHr) || finite(analysis?.maxHr);
}

/* ------------------------------------------------------- comparison metrics */

export function historyMetrics(analysis) {
  const speed = analysis?.analysisDetail?.speed || {};
  const work = analysis?.analysisDetail?.workload || {};
  const pos = analysis?.analysisDetail?.positional || {};
  const fatigue = buildFatigueProfile(speed, analysis?.durationS);
  const distancePerMin = finite(work?.distancePerMin)
    ? Number(work.distancePerMin)
    : finite(analysis?.distanceM) && finite(analysis?.movingTimeS) && Number(analysis.movingTimeS) > 0
      ? Number(analysis.distanceM) / (Number(analysis.movingTimeS) / 60)
      : null;
  return {
    distanceM: finite(analysis?.distanceM) ? Number(analysis.distanceM) : null,
    highIntensityDistanceM: finite(analysis?.highIntensityDistanceM) ? Number(analysis.highIntensityDistanceM) : null,
    sprintCount: finite(analysis?.sprintCount) ? Number(analysis.sprintCount) : null,
    topSpeedKmh: finite(analysis?.topSpeedKmh) ? Number(analysis.topSpeedKmh) : null,
    avgHr: finite(analysis?.avgHr) ? Number(analysis.avgHr) : null,
    maxHr: finite(analysis?.maxHr) ? Number(analysis.maxHr) : null,
    distancePerMin: finite(distancePerMin) ? Number(distancePerMin) : null,
    fatigueRetention: fatigue?.available && finite(fatigue?.summary?.retention) ? Number(fatigue.summary.retention) : null,
    attackShare: Array.isArray(pos?.thirds) && finite(pos.thirds[2]) ? Number(pos.thirds[2]) : null,
    role: String(pos?.role?.top || ''),
  };
}

export function historyAverages(metrics) {
  const keys = ['distanceM', 'highIntensityDistanceM', 'sprintCount', 'topSpeedKmh', 'avgHr', 'maxHr', 'distancePerMin', 'fatigueRetention', 'attackShare'];
  return Object.fromEntries(keys.map(k => [k, meanFinite(metrics.map(m => m[k]))]));
}

export const ratioDelta = (current, average) =>
  finite(current) && finite(average) && Number(average) > 0 ? Number(current) / Number(average) - 1 : null;

export function weightedDelta(parts) {
  let sum = 0;
  let w = 0;
  for (const part of parts) {
    if (!finite(part?.delta) || !(Number(part?.weight) > 0)) continue;
    sum += clamp(Number(part.delta), -0.65, 0.65) * Number(part.weight);
    w += Number(part.weight);
  }
  return w ? sum / w : null;
}

/*
  PUNTUACIÓN PARTIDO /100. Semantics and weights are unchanged from the GPS report:
  ~70 is the player's own average match.
*/
export function physicalScore(current, avg) {
  const parts = [
    { delta: ratioDelta(current.distanceM, avg.distanceM), weight: 0.2 },
    { delta: ratioDelta(current.highIntensityDistanceM, avg.highIntensityDistanceM), weight: 0.18 },
    { delta: ratioDelta(current.sprintCount, avg.sprintCount), weight: 0.14 },
    { delta: ratioDelta(current.distancePerMin, avg.distancePerMin), weight: 0.12 },
    { delta: ratioDelta(current.topSpeedKmh, avg.topSpeedKmh), weight: 0.1 },
    { delta: ratioDelta(current.avgHr, avg.avgHr), weight: 0.08 },
    { delta: ratioDelta(current.maxHr, avg.maxHr), weight: 0.04 },
    { delta: ratioDelta(current.fatigueRetention, avg.fatigueRetention), weight: 0.14 },
  ];
  const delta = weightedDelta(parts);
  return finite(delta) ? clamp(Math.round(70 + Number(delta) * 100), 0, 100) : null;
}

export function effortDelta(current, avg) {
  return weightedDelta([
    { delta: ratioDelta(current.distanceM, avg.distanceM), weight: 0.3 },
    { delta: ratioDelta(current.highIntensityDistanceM, avg.highIntensityDistanceM), weight: 0.25 },
    { delta: ratioDelta(current.sprintCount, avg.sprintCount), weight: 0.15 },
    { delta: ratioDelta(current.distancePerMin, avg.distancePerMin), weight: 0.15 },
    { delta: ratioDelta(current.avgHr, avg.avgHr), weight: 0.15 },
  ]);
}

export function fallbackRecoveryDrops(analysis) {
  const hr = extractHrSeries(analysis);
  const speed = extractSpeedSeries(analysis);
  if (hr.length < 4) return [];
  const speedAt = t => {
    if (!speed.length) return null;
    let best = speed[0];
    let d = Math.abs(Number(best.tSec) - t);
    for (const point of speed) {
      const q = Math.abs(Number(point.tSec) - t);
      if (q < d) {
        best = point;
        d = q;
      }
    }
    return Number(best.value);
  };
  const ref = Number(analysis?.analysisDetail?.heartRate?.referenceMaxBpm) || Number(analysis?.maxHr) || 0;
  const drops = [];
  let lastEnd = -9999;
  for (let i = 1; i < hr.length - 2; i++) {
    const start = hr[i];
    const prev = hr[i - 1];
    const next = hr[i + 1];
    if (Number(start.tSec) < lastEnd + 20) continue;
    if (Number(start.value) < Math.max(115, ref ? ref * 0.68 : 115)) continue;
    if (Number(start.value) < Number(prev.value) || Number(start.value) < Number(next.value)) continue;
    let best = null;
    for (let j = i + 1; j < hr.length; j++) {
      const dt = Number(hr[j].tSec) - Number(start.tSec);
      if (dt > 75) break;
      if (dt < 10) continue;
      const sv = speedAt(Number(hr[j].tSec));
      if (sv != null && sv > 8.5) continue;
      if (!best || Number(hr[j].value) < Number(best.value)) best = hr[j];
    }
    if (!best) continue;
    const drop = Number(start.value) - Number(best.value);
    const duration = Number(best.tSec) - Number(start.tSec);
    if (drop < 12 || duration < 10) continue;
    drops.push(drop);
    lastEnd = Number(best.tSec);
  }
  return drops.slice(0, 40);
}

export function recoveryMetric(analysis) {
  const hr = analysis?.analysisDetail?.heartRate || {};
  const summary = hr?.recoverySummary || {};
  const events = Array.isArray(hr?.recoveryEvents) ? hr.recoveryEvents : [];
  let drops = events.map(e => Number(e?.dropBpm ?? (Number(e?.startHr) - Number(e?.endHr)))).filter(Number.isFinite);
  if (!drops.length) drops = fallbackRecoveryDrops(analysis);
  const avgDrop = finite(summary?.avgDropBpm) ? Number(summary.avgDropBpm) : drops.length ? meanFinite(drops) : null;
  return { avgDropBpm: avgDrop, count: events.length || drops.length };
}

export function historyHeadline(current, avg, score, effort) {
  const d = ratioDelta(current.distanceM, avg.distanceM);
  const hi = ratioDelta(current.highIntensityDistanceM, avg.highIntensityDistanceM);
  const sp = finite(current.sprintCount) && finite(avg.sprintCount) ? Number(current.sprintCount) - Number(avg.sprintCount) : null;
  const fatigue = finite(current.fatigueRetention) && finite(avg.fatigueRetention) ? Number(current.fatigueRetention) - Number(avg.fatigueRetention) : null;
  if (finite(d) && d > 0.1 && finite(hi) && hi > 0.1 && finite(fatigue) && fatigue > 0.03) return 'Has corrido más, a mayor intensidad y has mantenido mejor el ritmo.';
  if (finite(sp) && sp >= 2) return 'Más sprints de lo habitual en un partido de alta activación.';
  if (finite(effort) && effort > 0.1 && finite(fatigue) && fatigue < -0.06) return 'Más esfuerzo de lo normal, con mayor desgaste en el tramo final.';
  if (finite(score) && score >= 85) return 'Partido físicamente muy por encima de tu media habitual.';
  if (finite(score) && score >= 75) return 'Rendimiento físico por encima de tu nivel medio.';
  if (finite(score) && score < 50) return 'Partido de menor carga física que tu media habitual.';
  return 'Partido bastante parecido a tu perfil físico habitual.';
}

export async function buildComparisonBundle(sb, { matchId, playerId, currentAnalysis }) {
  const current = historyMetrics(currentAnalysis);
  const recoveryCurrent = recoveryMetric(currentAnalysis);
  const fallback = {
    sampleSize: 0,
    current,
    avg: null,
    score: null,
    effort: null,
    recoveryCurrent,
    recoveryAvgDropBpm: null,
    headline: 'Todavía no hay suficiente histórico para puntuar este partido.',
  };

  const { data: rows, error } = await sb.from('match_player_gps').select('*').eq('player_id', playerId).limit(80);
  if (error) {
    console.warn('[GPS presentation] comparación', error);
    return fallback;
  }

  const history = (rows || []).filter(raw => String(raw.match_id) !== String(matchId)).map(raw => fromSupabaseRow(raw));
  if (!history.length) return fallback;

  const metrics = history.map(historyMetrics);
  const avg = historyAverages(metrics);
  const score = physicalScore(current, avg);
  const effort = effortDelta(current, avg);
  const recoveryAvgDropBpm = meanFinite(history.map(a => recoveryMetric(a).avgDropBpm));
  return { sampleSize: history.length, current, avg, score, effort, recoveryCurrent, recoveryAvgDropBpm, headline: historyHeadline(current, avg, score, effort) };
}

/* ---------------------------------------------------- pitch (Santa Ana) data */

function normalizePitchText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizedPitchMode(value) {
  const s = String(value || '').trim().toLowerCase().replace(/[ _-]/g, '');
  if (['f7', 'football7', 'futbol7', '7'].includes(s)) return 'f7';
  if (['fs', 'f5', 'football5', 'futbol5', 'futsal', 'salon'].includes(s)) return 'fs';
  return s;
}

export function isSantaAnaF7Pitch(pitch, match) {
  if (!pitch || match?.competition !== 'football7') return false;
  const name = normalizePitchText(pitch.name || match?.pitchName || '');
  return name.includes('santa ana') && normalizedPitchMode(pitch.mode || 'f7') === 'f7' && Array.isArray(pitch.corners) && pitch.corners.length === 4;
}

export async function resolvePresentationPitch(sb, analysis, match) {
  const pos = analysis?.analysisDetail?.positional || {};
  if (!pos.fieldCalibrated) return null;
  const columns = 'id,name,mode,corners,center_lat,center_lon,match_radius_m,is_active,goal_a_label,goal_b_label';
  try {
    if (pos.pitchId) {
      const { data: pitch, error } = await sb.from('gps_pitches').select(columns).eq('id', pos.pitchId).maybeSingle();
      if (!error && Array.isArray(pitch?.corners) && pitch.corners.length === 4) return pitch;
    }
    if (pos.pitchName) {
      const { data: rows, error } = await sb.from('gps_pitches').select(columns).eq('name', pos.pitchName).limit(2);
      if (!error) {
        const hit = (rows || []).find(p => Array.isArray(p?.corners) && p.corners.length === 4);
        if (hit) return hit;
      }
    }
    const mode = match?.competition === 'football7' ? 'f7' : 'fs';
    const { data: rows, error } = await sb.from('gps_pitches').select(columns).eq('is_active', true);
    if (error) return null;
    const valid = (rows || []).filter(p => Array.isArray(p?.corners) && p.corners.length === 4);
    const santa = valid.find(p => normalizePitchText(p.name).includes('santa ana') && normalizedPitchMode(p.mode) === mode);
    if (santa) return santa;
    const same = valid.filter(p => normalizedPitchMode(p.mode) === mode);
    return same.length === 1 ? same[0] : valid.length === 1 ? valid[0] : null;
  } catch (err) {
    console.warn('[GPS presentation] campo calibrado', err);
    return null;
  }
}

/*
  Local QA seam: `?fixture=<name>` loads a synthetic payload so degraded-data paths
  can be exercised without inventing production data. Served from localhost only.
*/
async function loadQaFixture(name) {
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if (!name || !local) return null;
  try {
    const mod = await import('./qa-fixture.js');
    return mod.buildFixture(name);
  } catch (err) {
    console.warn('[GPS presentation] fixture local no disponible', err);
    return null;
  }
}

export async function loadPresentationData(sb, { matchId, playerId, fixture }) {
  if (!matchId || !playerId) throw new Error('Falta el identificador del partido o del jugador.');

  const fixtureData = await loadQaFixture(fixture);
  if (fixtureData) return fixtureData;

  const [{ data: g, error: ge }, { data: p, error: pe }, { data: m, error: me }] = await Promise.all([
    sb.from('match_player_gps').select('*').eq('match_id', matchId).eq('player_id', playerId).maybeSingle(),
    sb.from('players').select('id,nickname,photo_url,card_url').eq('id', playerId).maybeSingle(),
    sb.from('matches').select('id,match_date,competition,red_score,black_score').eq('id', matchId).maybeSingle(),
  ]);
  if (ge || !g) throw ge || new Error('No hay análisis GPS guardado para este jugador y partido.');
  if (pe) console.warn('[GPS presentation] jugador', pe);
  if (me) console.warn('[GPS presentation] partido', me);

  const analysis = fromSupabaseRow(g);
  const match = {
    id: matchId,
    date: m?.match_date || '',
    competition: m?.competition || '',
    redScore: m?.red_score,
    blackScore: m?.black_score,
    pitchName: analysis?.analysisDetail?.positional?.pitchName || '',
  };
  const [comparison, pitch] = await Promise.all([
    buildComparisonBundle(sb, { matchId, playerId, currentAnalysis: analysis }),
    resolvePresentationPitch(sb, analysis, match),
  ]);
  return {
    raw: g,
    analysis,
    comparison,
    pitch,
    player: { id: playerId, name: p?.nickname || 'Jugador', photoUrl: p?.photo_url || '', cardUrl: p?.card_url || '' },
    match,
  };
}
