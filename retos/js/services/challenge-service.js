(() => {
  'use strict';

  if (!window.PatxAuth) throw new Error('PatxAuth no está disponible');
  const db = window.PatxAuth.getClient();
  const footballSkillGames = new Set(['spot-ball','perfect-pass','free-kick']);
  const arcadeGames = new Set(['higher-lower','cups','memory-cards','tower-stack','zig-zag','lane-rush','arrow-rush','drop-zone','orbit-pins','rhythm-tap','shape-gate','snake-sprint']);

  function firstRow(data) { return Array.isArray(data) ? (data[0] || null) : (data || null); }
  async function rpc(name, args = undefined) { const { data, error } = await db.rpc(name, args); if (error) throw error; return data; }

  async function getToday() {
    const challenge = firstRow(await rpc('get_or_create_daily_challenge'));
    if (!challenge?.game_id) return challenge;
    const { data: game, error } = await db.from('game_definitions').select('category').eq('id', challenge.game_id).maybeSingle();
    if (!error && game?.category) challenge.category = game.category;
    return challenge;
  }

  async function startAttempt() { return firstRow(await rpc('start_daily_game_attempt')); }
  async function getTriviaQuestions(attemptId) { const data = await rpc('get_trivia_questions_for_attempt', { p_attempt_id: attemptId }); return Array.isArray(data) ? data : []; }

  async function finishAttempt({ attemptId, gameId, score, durationMs, metadata = {} }) {
    const duration = Math.max(0, Math.round(Number(durationMs) || 0));
    if (gameId === 'football-trivia') return firstRow(await rpc('finish_trivia_game_attempt', { p_attempt_id: attemptId, p_duration_ms: duration, p_metadata: metadata || {} }));
    if (arcadeGames.has(gameId)) return firstRow(await rpc('finish_arcade_game_attempt', { p_attempt_id: attemptId, p_score: Number(score), p_duration_ms: duration, p_metadata: metadata || {} }));
    if (footballSkillGames.has(gameId)) return firstRow(await rpc('finish_football_skill_attempt', { p_attempt_id: attemptId, p_score: Number(score), p_duration_ms: duration, p_metadata: metadata || {} }));
    return firstRow(await rpc('finish_daily_game_attempt', { p_attempt_id: attemptId, p_score: Number(score), p_duration_ms: duration, p_metadata: metadata || {} }));
  }

  async function getLeaderboard(){ const data=await rpc('get_daily_game_leaderboard'); return Array.isArray(data)?data:[]; }
  async function getLeaderboardForDate(date){ const data=await rpc('get_game_leaderboard_for_date',{p_date:date}); return Array.isArray(data)?data:[]; }
  async function getSeason(){ return firstRow(await rpc('get_current_game_season')); }
  async function getSeasonLeaderboard(){ const data=await rpc('get_season_leaderboard'); return Array.isArray(data)?data:[]; }
  async function getHistory(limit=14){ const data=await rpc('get_challenge_history',{p_limit:Math.max(1,Math.min(60,Number(limit)||14))}); return Array.isArray(data)?data:[]; }

  window.PatxChallengeService=Object.freeze({getToday,startAttempt,getTriviaQuestions,finishAttempt,getLeaderboard,getLeaderboardForDate,getSeason,getSeasonLeaderboard,getHistory});
})();