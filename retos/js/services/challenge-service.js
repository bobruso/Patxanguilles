(() => {
  'use strict';

  if (!window.PatxAuth) throw new Error('PatxAuth no está disponible');
  const db = window.PatxAuth.getClient();

  function firstRow(data) {
    if (Array.isArray(data)) return data[0] || null;
    return data || null;
  }

  async function rpc(name, args = undefined) {
    const { data, error } = await db.rpc(name, args);
    if (error) throw error;
    return data;
  }

  async function getToday() {
    const challenge = firstRow(await rpc('get_or_create_daily_challenge'));
    if (!challenge?.game_id) return challenge;

    const { data: game, error } = await db
      .from('game_definitions')
      .select('category')
      .eq('id', challenge.game_id)
      .maybeSingle();

    if (!error && game?.category) challenge.category = game.category;
    return challenge;
  }

  async function startAttempt() {
    return firstRow(await rpc('start_daily_game_attempt'));
  }

  async function finishAttempt({ attemptId, score, durationMs, metadata = {} }) {
    return firstRow(await rpc('finish_daily_game_attempt', {
      p_attempt_id: attemptId,
      p_score: Number(score),
      p_duration_ms: Math.max(0, Math.round(Number(durationMs) || 0)),
      p_metadata: metadata || {}
    }));
  }

  async function getLeaderboard() {
    const data = await rpc('get_daily_game_leaderboard');
    return Array.isArray(data) ? data : [];
  }

  window.PatxChallengeService = Object.freeze({
    getToday,
    startAttempt,
    finishAttempt,
    getLeaderboard
  });
})();