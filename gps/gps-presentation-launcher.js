/*
  "▶ VER PRESENTACIÓN" action inside the GPS report.

  The report page is always opened as `gps-report.html?match=<id>&player=<id>` — by
  the season/match view and by the report overlay iframe — so the query string is the
  real call context. This launcher reads that context (plus an explicit data-attribute
  or window hook if a future caller provides one) and never guesses from location.hash.
*/
(function () {
  var BUTTON_ATTR = 'data-gps-presentation-launcher';
  var STYLE = [
    'display:inline-flex',
    'align-items:center',
    'justify-content:center',
    'gap:8px',
    'min-height:40px',
    'align-self:flex-start',
    'flex:0 0 auto',
    'padding:0 15px',
    'border-radius:10px',
    'border:1px solid rgba(228,255,69,.55)',
    'background:linear-gradient(180deg,rgba(228,255,69,.16),rgba(228,255,69,.06))',
    'color:#f5f3ec',
    'text-decoration:none',
    'font-weight:900',
    'font-size:12px',
    'letter-spacing:.14em',
    'white-space:nowrap',
    'cursor:pointer',
  ].join(';');

  function readContext() {
    var context = { match: null, player: null };
    try {
      var params = new URLSearchParams(window.location.search || '');
      context.match = params.get('match');
      context.player = params.get('player');
    } catch (_) {}
    if (!context.match || !context.player) {
      var hook = window.__patxGpsPresentationContext;
      if (hook && hook.match != null && hook.player != null) {
        context.match = hook.match;
        context.player = hook.player;
      }
    }
    if (!context.match || !context.player) {
      var host = document.querySelector('[' + BUTTON_ATTR + '-context]');
      if (host) {
        context.match = context.match || host.getAttribute('data-match');
        context.player = context.player || host.getAttribute('data-player');
      }
    }
    return context.match && context.player ? context : null;
  }

  function presentationUrl(context) {
    var base = './gps-presentation.html';
    if (window.__patxGpsPresentationBase) base = String(window.__patxGpsPresentationBase);
    return (
      base +
      '?match=' +
      encodeURIComponent(context.match) +
      '&player=' +
      encodeURIComponent(context.player)
    );
  }

  function mount() {
    var context = readContext();
    if (!context) return false;
    var host =
      document.querySelector('.patx-gps-head-actions') ||
      document.querySelector('.patx-gps-head') ||
      document.querySelector('[data-patx-gps-panel]');
    if (!host) return false;
    var existing = host.querySelector('[' + BUTTON_ATTR + ']');
    var anchor = existing || document.createElement('a');
    anchor.setAttribute(BUTTON_ATTR, '');
    anchor.setAttribute('href', presentationUrl(context));
    anchor.setAttribute('aria-label', 'Ver la presentación GPS del jugador');
    anchor.title = 'Presentación GPS';
    /* Inside the report overlay iframe the presentation opens in its own tab. Keep
       the same-origin report as opener so closing the presentation reveals it again. */
    var embedded = false;
    try {
      embedded = window.top !== window.self;
    } catch (_) {
      embedded = true;
    }
    if (embedded) {
      anchor.setAttribute('target', '_blank');
      anchor.setAttribute('rel', 'opener');
    } else {
      anchor.removeAttribute('target');
      anchor.removeAttribute('rel');
    }
    anchor.style.cssText = STYLE;
    if (!existing) {
      anchor.innerHTML = '<span aria-hidden="true">▶</span><span>VER PRESENTACIÓN</span>';
      host.appendChild(anchor);
    }
    return true;
  }

  var mounted = mount();

  /*
    The report re-renders its panel on every analysis update, which removes the
    action. So the update listener is always attached (not only on the first pass),
    and the observer is only a bounded helper for the very first async mount.
  */
  window.addEventListener('patx-gps-analysis-updated', mount);

  if (!mounted) {
    var observer = new MutationObserver(function () {
      if (mount()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(function () {
      observer.disconnect();
    }, 15000);
  }

  window.addEventListener('pagehide', function () {
    window.removeEventListener('patx-gps-analysis-updated', mount);
  });
})();
