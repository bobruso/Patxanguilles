(function () {
  'use strict';

  const LAST_SEEN_KEY = 'patxLastSeenVersion';
  const MANIFEST_URL = './version.json';
  let manifestPromise;
  let activeManifest = null;

  function readLastSeenVersion() {
    try {
      return Number.parseInt(localStorage.getItem(LAST_SEEN_KEY) || '0', 10) || 0;
    } catch (_) {
      return 0;
    }
  }

  function writeLastSeenVersion(version) {
    try {
      localStorage.setItem(LAST_SEEN_KEY, String(version));
    } catch (_) {}
  }

  function fetchNoStore(url) {
    return fetch(url, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });
  }

  function loadManifest() {
    if (!manifestPromise) {
      manifestPromise = fetchNoStore(MANIFEST_URL + '?t=' + Date.now())
        .then(function (response) {
          if (!response.ok) throw new Error('HTTP ' + response.status);
          return response.json();
        })
        .then(function (manifest) {
          const version = Number(manifest && manifest.version);
          if (!Number.isInteger(version) || version < 1 || !Array.isArray(manifest.summary)) {
            throw new Error('version.json no es válido');
          }
          activeManifest = manifest;
          return manifest;
        });
    }
    return manifestPromise;
  }

  function confirmSuccessfulUpdatedBoot(manifest) {
    const requestedVersion = Number(new URLSearchParams(location.search).get('__patx_update'));
    if (requestedVersion === Number(manifest.version)) {
      writeLastSeenVersion(manifest.version);
    }
  }

  function ensureModal() {
    let modal = document.getElementById('patxUpdateModal');
    if (modal) return modal;

    const style = document.createElement('style');
    style.textContent = [
      '.patx-update-modal{position:fixed;inset:0;z-index:130;display:none;place-items:center;padding:18px;background:rgba(0,0,0,.88)}',
      '.patx-update-modal.open{display:grid}',
      '.patx-update-card{width:min(520px,100%);box-sizing:border-box;padding:30px 26px;border:1px solid rgba(255,255,255,.24);border-radius:24px;background:#0b1014;color:#fff;box-shadow:0 30px 100px rgba(0,0,0,.75);text-align:center}',
      '.patx-update-kicker{font-size:12px;font-weight:900;letter-spacing:.2em;color:#d9ba55}',
      '.patx-update-label{display:inline-block;margin:13px 0 4px;padding:6px 10px;border:1px solid rgba(255,255,255,.18);border-radius:999px;font-size:11px;font-weight:900}',
      '.patx-update-card h2{margin:10px 0 16px;font-size:clamp(27px,6vw,40px);line-height:1.05}',
      '.patx-update-summary{margin:0 auto 22px;padding-left:20px;max-width:420px;text-align:left;color:#d7dcda;line-height:1.45}',
      '.patx-update-summary li+li{margin-top:7px}',
      '.patx-update-actions{display:grid;gap:10px}',
      '.patx-update-primary,.patx-update-history{min-height:46px;border-radius:10px;font:900 13px Arial,sans-serif;letter-spacing:.06em;cursor:pointer}',
      '.patx-update-primary{border:0;background:#b9141d;color:#fff}',
      '.patx-update-history{border:1px solid rgba(255,255,255,.26);background:transparent;color:#fff}',
      '.patx-update-status{min-height:18px;margin:13px 0 0;color:#f0c9ca;font-size:12px;line-height:1.35}',
      '@media(max-width:600px){.patx-update-card{padding:25px 18px;border-radius:20px}}'
    ].join('');
    document.head.appendChild(style);

    modal = document.createElement('div');
    modal.id = 'patxUpdateModal';
    modal.className = 'patx-update-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'patxUpdateTitle');
    document.body.appendChild(modal);
    return modal;
  }

  function belongsToThisApp(scopeUrl) {
    try {
      const scope = new URL(scopeUrl);
      const appRoot = new URL('./', location.href);
      return scope.origin === appRoot.origin && scope.pathname.startsWith(appRoot.pathname);
    } catch (_) {
      return false;
    }
  }

  async function removeOwnOfflineData() {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations
        .filter(function (registration) { return belongsToThisApp(registration.scope); })
        .map(function (registration) { return registration.unregister(); }));
    }
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names
        .filter(function (name) { return /patxanguilles|patx/i.test(name); })
        .map(function (name) { return caches.delete(name); }));
    }
  }

  async function updateNow(button, status) {
    const manifest = activeManifest;
    if (!manifest) return;
    button.disabled = true;
    status.textContent = 'Comprobando la versión publicada…';
    try {
      const probe = await fetchNoStore('./?__patx_probe=' + Date.now());
      if (!probe.ok) throw new Error('HTTP ' + probe.status);
    } catch (_) {
      button.disabled = false;
      status.textContent = 'No hay conexión. Puedes seguir usando esta versión e intentarlo más tarde.';
      return;
    }

    status.textContent = 'Preparando la actualización…';
    try {
      await removeOwnOfflineData();
    } catch (error) {
      console.warn('No se pudo limpiar todo el almacenamiento offline de Patxanguilles', error);
    }
    const target = new URL('./', location.href);
    target.searchParams.set('__patx_update', String(manifest.version));
    target.searchParams.set('t', String(Date.now()));
    location.replace(target.href);
  }

  function showModal(manifest, continueToHome) {
    const modal = ensureModal();
    const summary = manifest.summary.map(function (item) {
      const li = document.createElement('li');
      li.textContent = String(item);
      return li.outerHTML;
    }).join('');
    modal.innerHTML = '<div class="patx-update-card">' +
      '<div class="patx-update-kicker">NUEVA VERSIÓN</div>' +
      '<div class="patx-update-label"></div>' +
      '<h2 id="patxUpdateTitle"></h2>' +
      '<ul class="patx-update-summary">' + summary + '</ul>' +
      '<div class="patx-update-actions">' +
        '<button class="patx-update-primary" type="button">ACTUALIZAR</button>' +
        '<button class="patx-update-history" type="button">Conoce los últimos cambios</button>' +
      '</div>' +
      '<p class="patx-update-status" aria-live="polite"></p>' +
    '</div>';
    modal.querySelector('.patx-update-label').textContent = manifest.label;
    modal.querySelector('h2').textContent = manifest.title;
    const primary = modal.querySelector('.patx-update-primary');
    const status = modal.querySelector('.patx-update-status');
    primary.addEventListener('click', function () { updateNow(primary, status); });
    modal.querySelector('.patx-update-history').addEventListener('click', function () {
      modal.classList.remove('open');
      continueToHome();
      if (typeof window.show === 'function') window.show('changeHistory');
    });
    modal.classList.add('open');
  }

  window.PatxUpdate = {
    showIfAvailable: async function (continueToHome) {
      try {
        const manifest = await loadManifest();
        confirmSuccessfulUpdatedBoot(manifest);
        if (Number(manifest.version) > readLastSeenVersion()) {
          showModal(manifest, continueToHome);
          return;
        }
      } catch (error) {
        console.warn('No se pudo comprobar la versión de Patxanguilles', error);
      }
      continueToHome();
    }
  };
})();
