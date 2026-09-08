(() => {
  'use strict';

  const root = document.querySelector('[data-patx-account-widget]');
  if (!root || !window.PatxAuth) return;

  let menuOpen = false;

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function closeMenu() {
    const menu = root.querySelector('.patx-account-menu');
    if (menu) menu.hidden = true;
    menuOpen = false;
  }

  function renderSignedOut() {
    const loginUrl = window.PatxAuth.getAuthUrl(window.location.href);
    root.innerHTML = `<a class="patx-signin" href="${escapeHtml(loginUrl)}">SIGN IN</a>`;
  }

  function renderSignedIn(state) {
    const account = state.account || {};
    const photo = account.player_photo_url
      ? `<img class="patx-account-avatar" src="${escapeHtml(account.player_photo_url)}" alt="">`
      : '<span class="patx-account-avatar-fallback">⚽</span>';
    const name = state.nickname || 'Jugador';
    const role = state.isAdmin ? 'ADMINISTRADOR' : 'JUGADOR';

    root.innerHTML = `
      <button class="patx-account-button" type="button" aria-expanded="false">
        ${photo}
        <span class="patx-account-name">${escapeHtml(name)}</span>
        <span class="patx-account-caret">▼</span>
      </button>
      <div class="patx-account-menu" hidden>
        <div class="patx-account-menu-head">
          <div class="patx-account-menu-role">${role}</div>
          <div class="patx-account-menu-name">${escapeHtml(name)}</div>
        </div>
        <a href="/auth/">Mi cuenta</a>
        <a href="/">Volver a Patxanguilles</a>
        <button class="danger" type="button" data-account-logout>Cerrar sesión</button>
      </div>
    `;

    const button = root.querySelector('.patx-account-button');
    const menu = root.querySelector('.patx-account-menu');
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      menuOpen = !menuOpen;
      menu.hidden = !menuOpen;
      button.setAttribute('aria-expanded', String(menuOpen));
    });

    root.querySelector('[data-account-logout]').addEventListener('click', async () => {
      await window.PatxAuth.signOut();
      closeMenu();
      await refresh();
    });
  }

  async function refresh() {
    root.innerHTML = '<span class="patx-account-loading">Cargando cuenta…</span>';
    try {
      const state = await window.PatxAuth.getState(true);
      if (!state.signedIn || !state.linked) {
        renderSignedOut();
      } else {
        renderSignedIn(state);
      }
    } catch (error) {
      console.error('[AccountWidget]', error);
      renderSignedOut();
    }
  }

  document.addEventListener('click', (event) => {
    if (!root.contains(event.target)) closeMenu();
  });

  window.PatxAuth.onChange(() => refresh());
  refresh();
})();
