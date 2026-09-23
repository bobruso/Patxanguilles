/*
  GPS presentation bootstrap: routing, data load, chrome (replay/back/error) and
  the presentation director. Scene work lives in ./presentation/*.
*/
import { SceneContext, esc, fitStage, fmtDate, initials, preloadImage } from './presentation/core.js';
import { SUPABASE_KEY, SUPABASE_URL, loadPresentationData } from './presentation/data.js';
import { PresentationDirector } from './presentation/director.js';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const stage = document.getElementById('presentationStage');
const loading = document.getElementById('presentationLoading');
const errorBox = document.getElementById('presentationError');
const errorText = document.getElementById('presentationErrorText');
const replayBtn = document.getElementById('presentationReplay');
const backBtn = document.getElementById('presentationBack');
const errorBackBtn = document.getElementById('presentationErrorBack');
const picker = document.getElementById('presentationPicker');
const pickerList = document.getElementById('presentationPickerList');
const pickerBackBtn = document.getElementById('presentationPickerBack');
const query = new URLSearchParams(location.search);
const matchId = query.get('match');
const playerId = query.get('player');
const fixture = query.get('fixture');

let data = null;
let director = null;
let runId = 0;
const chromeCtx = new SceneContext();

stage.classList.add('is-booting');

function reportHref() {
  return matchId && playerId
    ? `./gps-report.html?match=${encodeURIComponent(matchId)}&player=${encodeURIComponent(playerId)}`
    : null;
}

function isReportWindow(win) {
  try {
    if (!win || win.closed) return false;
    const url = new URL(win.location.href);
    return url.origin === location.origin && /\/gps-report\.html$/.test(url.pathname);
  } catch (_) {
    return false;
  }
}

function referrerIsReport() {
  try {
    if (!document.referrer) return false;
    const url = new URL(document.referrer);
    return url.origin === location.origin && /\/gps-report\.html$/.test(url.pathname);
  } catch (_) {
    return false;
  }
}

function goBack() {
  const fallback = reportHref();
  if (!fallback) {
    location.assign('./#temporada-detalle');
    return;
  }

  /* When the report overlay opened the presentation in a separate tab/window,
     close that auxiliary context and reveal the report that is already underneath. */
  if (isReportWindow(window.opener)) {
    try {
      window.opener.focus();
    } catch (_) {}
    window.close();
    window.setTimeout(() => {
      if (!window.closed) location.replace(fallback);
    }, 120);
    return;
  }

  /* Same-context navigation (including WebView/APK): return to the existing report
     instead of creating a second report entry after the presentation. */
  if (referrerIsReport() && history.length > 1) {
    history.back();
    return;
  }

  /* Direct links have no report behind them. Replace the presentation so Back can
     never reopen it from the report. */
  location.replace(fallback);
}
backBtn.addEventListener('click', goBack);
errorBackBtn.addEventListener('click', goBack);
stage.addEventListener('click', event => {
  const cta = event.target.closest('[data-outro-cta]');
  if (!cta) return;
  event.preventDefault();
  goBack();
});
pickerBackBtn?.addEventListener('click', () => location.assign('./#temporada-detalle'));
replayBtn.addEventListener('click', () => startPresentation());

function onResize() {
  fitStage();
}
window.addEventListener('resize', onResize, { passive: true });
window.addEventListener('orientationchange', () => setTimeout(onResize, 80), { passive: true });
fitStage();

/* ------------------------------------------------------------ report picker */

function pickerModeLabel(value) {
  return value === 'football7' ? 'FÚTBOL 7' : value === 'football5' ? 'FÚTBOL SALA' : String(value || 'GPS').toUpperCase();
}

function pickerPhoto(player) {
  if (player?.photo_url) return `<img src="${esc(player.photo_url)}" alt="">`;
  return `<span>${esc(initials(player?.nickname || 'P'))}</span>`;
}

async function showReportPicker() {
  const { data: rows, error: rowsError } = await sb.from('match_player_gps').select('match_id,player_id').limit(250);
  if (rowsError) throw rowsError;
  const pairs = [];
  const seen = new Set();
  for (const row of rows || []) {
    const key = `${row.match_id}:${row.player_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push(row);
  }
  if (!pairs.length) throw new Error('No hay informes GPS guardados todavía.');
  const playerIds = [...new Set(pairs.map(r => r.player_id).filter(v => v != null))];
  const matchIds = [...new Set(pairs.map(r => r.match_id).filter(v => v != null))];
  const [{ data: players, error: playersError }, { data: matches, error: matchesError }] = await Promise.all([
    sb.from('players').select('id,nickname,photo_url').in('id', playerIds),
    sb.from('matches').select('id,match_date,competition').in('id', matchIds),
  ]);
  if (playersError) console.warn('[GPS presentation picker] jugadores', playersError);
  if (matchesError) console.warn('[GPS presentation picker] partidos', matchesError);
  const playerById = new Map((players || []).map(p => [String(p.id), p]));
  const matchById = new Map((matches || []).map(m => [String(m.id), m]));
  const reports = pairs
    .map(row => ({ row, player: playerById.get(String(row.player_id)) || null, match: matchById.get(String(row.match_id)) || null }))
    .sort(
      (a, b) =>
        String(b.match?.match_date || '').localeCompare(String(a.match?.match_date || '')) ||
        String(a.player?.nickname || '').localeCompare(String(b.player?.nickname || ''), 'es'),
    );

  pickerList.innerHTML = reports
    .map(
      ({ row, player, match }) => `<button type="button" class="patx-present-picker-card" data-picker-match="${esc(row.match_id)}" data-picker-player="${esc(row.player_id)}">
    <span class="patx-present-picker-avatar">${pickerPhoto(player)}</span>
    <span class="patx-present-picker-copy">
      <strong>${esc(player?.nickname || 'Jugador')}</strong>
      <small>${esc(fmtDate(match?.match_date || ''))} · ${esc(pickerModeLabel(match?.competition))}</small>
    </span>
    <b>REPRODUCIR →</b>
  </button>`,
    )
    .join('');
  pickerList.addEventListener('click', event => {
    const card = event.target.closest('[data-picker-match][data-picker-player]');
    if (!card) return;
    const qs = new URLSearchParams({ match: card.dataset.pickerMatch, player: card.dataset.pickerPlayer });
    location.assign(`./gps-presentation.html?${qs.toString()}`);
  });
  picker.hidden = false;
}

/* ------------------------------------------------------------------ runtime */

async function startPresentation() {
  const token = ++runId;
  stage.classList.remove('is-booting');
  replayBtn.classList.add('is-hidden');
  if (!director) {
    director = new PresentationDirector({ data, layout: stage.dataset.layout });
  }
  director.layout = stage.dataset.layout;
  /* Retire the previous run before it can schedule more work, then give the new
     run fresh chrome animations so nothing from the old pass is still animating. */
  director.sceneCtx?.dispose();
  director.pendingReveal = null;
  director.pageCtx?.dispose();
  director.pageCtx = new SceneContext();
  stage.querySelector('.patx-transition-wipe')?.remove();
  await director.play(token, () => runId);
  if (token !== runId) return;
  replayBtn.classList.remove('is-hidden');
}

(async function init() {
  try {
    if (!matchId || !playerId) {
      loading.hidden = true;
      await showReportPicker();
      return;
    }
    data = await loadPresentationData(sb, { matchId, playerId, fixture });
    /* Verify the media before rendering: a broken card/photo URL falls back to the
       honest missing state instead of showing a broken image. */
    const [cardOk, photoOk] = await Promise.all([
      preloadImage(data.player.cardUrl, 4500),
      preloadImage(data.player.photoUrl, 4500),
    ]);
    if (!cardOk) data.player.cardUrl = '';
    if (!photoOk) data.player.photoUrl = '';
    document.title = `${data.player.name} · Presentación GPS · Patxanguilles`;
    loading.hidden = true;
    fitStage();
    await startPresentation();
  } catch (err) {
    console.error('[GPS presentation]', err);
    loading.hidden = true;
    errorText.textContent = err?.message || String(err);
    errorBox.hidden = false;
  }
})();

/* A real unload tears everything down; a bfcache round trip must not leave the stage
   blank, so the presentation restarts when it comes back. */
window.addEventListener('pagehide', event => {
  if (event.persisted) return;
  runId++;
  director?.dispose();
  director = null;
  chromeCtx.dispose();
});
window.addEventListener('pageshow', event => {
  if (!event.persisted) return;
  if (!matchId || !playerId || !data) return;
  if (!document.getElementById('presentationSceneLayer')?.children.length) startPresentation();
});
