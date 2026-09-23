/*
  Synthetic QA fixtures for degraded-data paths.

  These payloads are fabricated locally and are only reachable from localhost via
  `?fixture=<name>`. They exist because no stored report currently lacks heart-rate
  or card data, so graceful-degradation behaviour cannot be exercised otherwise.
  Nothing here is production data and nothing here is written anywhere.
*/

/*
  Deliberately arbitrary rectangle, unrelated to any real pitch: the fixtures only
  need four corners so the satellite code path can run.
*/
const FIXTURE_PITCH = {
  id: 'fixture',
  name: 'Campo Sintético QA',
  mode: 'f7',
  corners: [
    { lat: 41, lon: 1 },
    { lat: 41, lon: 1.001 },
    { lat: 41.0006, lon: 1.001 },
    { lat: 41.0006, lon: 1 },
  ],
};

/* Same synthetic rectangle, but named so the Santa Ana F7 satellite path is taken. */
const SANTA_ANA_QA_PITCH = { ...FIXTURE_PITCH, name: 'Polideportivo Santa Ana QA' };

const series = (count, fn) => Array.from({ length: count }, (_, i) => ({ tSec: i * 20, value: fn(i) }));

function baseAnalysis({ withHr = true, withGps = true } = {}) {
  const speedSeries = series(180, i => 6 + 9 * Math.abs(Math.sin(i / 7)) + (i % 31 === 5 ? 12 : 0));
  const hrSeries = series(180, i => 108 + 38 * Math.abs(Math.sin(i / 11)) + (i % 41 === 7 ? 24 : 0));
  const trail = withGps
    ? series(120, i => i).map((p, i) => ({ u: 0.5 + 0.42 * Math.sin(i / 9), v: 0.5 + 0.38 * Math.cos(i / 7), tSec: p.tSec }))
    : [];
  const heatmapGrid = withGps
    ? Array.from({ length: 27 }, (_, y) => Array.from({ length: 42 }, (_, x) => (Math.sin(x / 4) + Math.cos(y / 3) > 1.2 ? 3 : 0)))
    : [];
  const topSpeed = Math.max(...speedSeries.map(p => p.value));
  return {
    distanceM: 5320,
    highIntensityDistanceM: 1240,
    sprintCount: 17,
    topSpeedKmh: 27.4,
    avgSpeedKmh: topSpeed / 2.6,
    avgHr: withHr ? 141 : null,
    maxHr: withHr ? 184 : null,
    durationS: 3600,
    movingTimeS: 3300,
    sampleCount: 180,
    hasGps: withGps,
    hasHr: withHr,
    trail,
    heatmapGrid,
    zoneGrid: heatmapGrid,
    avgPosition: withGps ? { u: 0.51, v: 0.49 } : null,
    analysisDetail: {
      speed: {
        speedSeries,
        sprints: [3, 9, 14, 20, 27, 33, 41, 47].map(n => ({ tSec: n * 60, peakSpeedKmh: 24 + (n % 4) })),
        topSpeedEvent: { tSec: 1500, speedKmh: topSpeed },
        zones: [],
      },
      workload: { distancePerMin: 96.7 },
      positional: {
        fieldCalibrated: true,
        pitchId: null,
        pitchName: FIXTURE_PITCH.name,
        attackDirection: 1,
        thirds: [0.22, 0.51, 0.27],
        role: { top: 'Centrocampista', confidence: 41 },
        sprintPoints: [],
      },
      heartRate: {
        series: withHr ? hrSeries : [],
        zones: [],
        referenceMaxBpm: 181,
        recoverySummary: { count: 6, avgDropBpm: 24 },
        recoveryEvents: [22, 31, 46].map(n => ({ startHr: 168, endHr: 141, dropBpm: 27, startSec: n * 60, endSec: n * 60 + 40 })),
      },
    },
  };
}

function fullData(overrides = {}) {
  const analysis = overrides.analysis || baseAnalysis();
  return {
    raw: null,
    analysis,
    pitch: overrides.pitch === undefined ? FIXTURE_PITCH : overrides.pitch,
    player: {
      id: 'fixture',
      name: overrides.playerName || 'Jugador QA',
      photoUrl: overrides.photoUrl ?? '',
      cardUrl: overrides.cardUrl ?? 'https://patxanguillesantifeixistes.es/player-cards/player-1.jpg',
    },
    match: { id: 'fixture', date: '2026-09-21', competition: 'football7', pitchName: FIXTURE_PITCH.name, ...(overrides.match || {}) },
    comparison:
      overrides.comparison === undefined
        ? {
            sampleSize: 4,
            current: { sprintCount: 17, fatigueRetention: 0.94, distanceM: 5320 },
            avg: { sprintCount: 13.5, fatigueRetention: 0.9, distanceM: 4600 },
            score: 78,
            effort: 0.12,
            recoveryCurrent: { avgDropBpm: 27, count: 6 },
            recoveryAvgDropBpm: 24,
            headline: 'Rendimiento físico por encima de tu nivel medio.',
          }
        : overrides.comparison,
  };
}

export function buildFixture(name) {
  switch (name) {
    case 'missing-hr':
      return fullData({ analysis: baseAnalysis({ withHr: false }) });
    /* Realistic partial case: the summary exists but the stored series does not. */
    case 'partial-hr': {
      const analysis = baseAnalysis({ withHr: true });
      analysis.analysisDetail.heartRate.series = [];
      return fullData({ analysis });
    }
    case 'missing-card':
      return fullData({ cardUrl: '', photoUrl: '', playerName: 'Sin Carta' });
    /* Unreachable card URL: exercises the preload-failure path (no fabricated card). */
    case 'broken-card':
      return fullData({ cardUrl: 'https://patxanguillesantifeixistes.es/player-cards/__qa-missing__.jpg' });
    case 'no-history':
      return fullData({
        comparison: {
          sampleSize: 0,
          current: { sprintCount: 17, fatigueRetention: null, distanceM: 5320 },
          avg: null,
          score: null,
          effort: null,
          recoveryCurrent: { avgDropBpm: 27, count: 6 },
          recoveryAvgDropBpm: null,
          headline: 'Todavía no hay suficiente histórico para puntuar este partido.',
        },
      });
    case 'missing-tiles':
      return { ...fullData({}), forceTileFailure: true };
    case 'santa-ana-tiles':
      return { ...fullData({ pitch: SANTA_ANA_QA_PITCH }), forceTileFailure: true };
    case 'santa-ana-no-leaflet':
      return { ...fullData({ pitch: SANTA_ANA_QA_PITCH }), forceLeafletFailure: true };
    case 'missing-gps':
      return fullData({ analysis: baseAnalysis({ withGps: false }), pitch: null });
    default:
      return fullData({});
  }
}
