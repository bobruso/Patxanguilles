(() => {
  'use strict';

  if (!window.PatxAuth) {
    document.body.innerHTML = '<p style="padding:24px;color:white">No se ha podido cargar el sistema de autenticación.</p>';
    return;
  }

  const auth = window.PatxAuth;
  const db = auth.getClient();
  const $ = (id) => document.getElementById(id);
  const els = {
    status: $('statusBanner'),
    loggedOut: $('loggedOutView'),
    unlinked: $('unlinkedView'),
    account: $('accountView'),
    loginTab: $('loginTab'),
    registerTab: $('registerTab'),
    loginForm: $('loginForm'),
    loginPlayer: $('loginPlayer'),
    loginPassword: $('loginPassword'),
    loginButton: $('loginButton'),
    registerFlow: $('registerFlow'),
    registerRequestForm: $('registerRequestForm'),
    registerPlayer: $('registerPlayer'),
    registerPassword: $('registerPassword'),
    registerPasswordRepeat: $('registerPasswordRepeat'),
    requestRegistrationButton: $('requestRegistrationButton'),
    codeStep: $('codeStep'),
    codeStepCopy: $('codeStepCopy'),
    registrationCode: $('registrationCode'),
    completeRegistrationForm: $('completeRegistrationForm'),
    completeRegistrationButton: $('completeRegistrationButton'),
    restartRegistration: $('restartRegistration'),
    unlinkedLogout: $('unlinkedLogout'),
    accountRole: $('accountRole'),
    accountName: $('accountName'),
    accountFullName: $('accountFullName'),
    accountPhoto: $('accountPhoto'),
    accountPhotoFallback: $('accountPhotoFallback'),
    openPlayerProfile: $('openPlayerProfile'),
    logoutButton: $('logoutButton'),
    adminPanel: $('adminPanel'),
    adminPlayers: $('adminPlayers'),
    refreshAdmin: $('refreshAdmin')
  };

  let currentTab = 'login';
  let currentAccount = null;
  let availablePlayers = [];
  let registeredPlayers = [];
  let pendingRegistration = null;

  function showStatus(message, type = '') {
    els.status.textContent = message;
    els.status.className = `status-banner${type ? ` ${type}` : ''}`;
    els.status.hidden = false;
  }

  function clearStatus() {
    els.status.hidden = true;
    els.status.textContent = '';
    els.status.className = 'status-banner';
  }

  function setBusy(button, busy, busyText) {
    if (!button) return;
    if (busy) {
      button.dataset.originalText = button.textContent;
      button.textContent = busyText || 'Cargando…';
      button.disabled = true;
    } else {
      button.textContent = button.dataset.originalText || button.textContent;
      button.disabled = false;
    }
  }

  function populatePlayerSelect(select, players, emptyText, placeholderText) {
    if (!select) return;
    const previous = select.value;
    select.innerHTML = '';

    if (!players.length) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = emptyText;
      select.appendChild(option);
      select.disabled = true;
      return;
    }

    select.disabled = false;
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = placeholderText;
    select.appendChild(placeholder);

    for (const player of players) {
      const option = document.createElement('option');
      option.value = String(player.id);
      option.textContent = player.nickname;
      select.appendChild(option);
    }

    if (players.some((player) => String(player.id) === String(previous))) {
      select.value = previous;
    }
  }

  async function loadRegisteredPlayers() {
    try {
      registeredPlayers = await auth.listRegisteredPlayers();
      populatePlayerSelect(
        els.loginPlayer,
        registeredPlayers,
        'Todavía no hay cuentas registradas',
        'Selecciona tu jugador'
      );
    } catch (error) {
      registeredPlayers = [];
      populatePlayerSelect(els.loginPlayer, [], 'No se pudieron cargar las cuentas', 'Selecciona tu jugador');
      showStatus(error.message, 'error');
    }
  }

  async function loadAvailablePlayers() {
    try {
      availablePlayers = await auth.listAvailablePlayers();
      populatePlayerSelect(
        els.registerPlayer,
        availablePlayers,
        'Todos los jugadores ya tienen cuenta',
        'Selecciona quién eres'
      );
    } catch (error) {
      availablePlayers = [];
      populatePlayerSelect(els.registerPlayer, [], 'No se pudieron cargar los jugadores', 'Selecciona quién eres');
      showStatus(error.message, 'error');
    }
  }

  async function switchTab(mode) {
    currentTab = mode === 'register' ? 'register' : 'login';
    const login = currentTab === 'login';
    els.loginTab.classList.toggle('active', login);
    els.registerTab.classList.toggle('active', !login);
    els.loginForm.hidden = !login;
    els.registerFlow.hidden = login;
    clearStatus();

    if (login) {
      await loadRegisteredPlayers();
    } else {
      if (!pendingRegistration) {
        els.registerRequestForm.hidden = false;
        els.codeStep.hidden = true;
      }
      await loadAvailablePlayers();
    }
  }

  function hideAllViews() {
    els.loggedOut.hidden = true;
    els.unlinked.hidden = true;
    els.account.hidden = true;
  }

  function renderAccount(account) {
    els.accountRole.textContent = account.role === 'admin' ? 'ADMINISTRADOR' : 'JUGADOR';
    els.accountName.textContent = account.player_nickname || account.display_name || 'Jugador';
    els.accountFullName.textContent = account.player_full_name || '';
    els.openPlayerProfile.href = '../';

    if (account.player_photo_url) {
      els.accountPhoto.src = account.player_photo_url;
      els.accountPhoto.hidden = false;
      els.accountPhotoFallback.hidden = true;
    } else {
      els.accountPhoto.hidden = true;
      els.accountPhotoFallback.hidden = false;
    }
  }

  async function renderAuthState() {
    const state = await auth.getState(true);

    if (!state.signedIn) {
      currentAccount = null;
      hideAllViews();
      els.loggedOut.hidden = false;
      await switchTab(currentTab);
      return;
    }

    currentAccount = state.account;
    if (!state.linked) {
      hideAllViews();
      els.unlinked.hidden = false;
      return;
    }

    hideAllViews();
    els.account.hidden = false;
    renderAccount(currentAccount);

    if (state.isAdmin) {
      els.adminPanel.hidden = false;
      await loadAdminPlayers();
    } else {
      els.adminPanel.hidden = true;
    }
  }

  async function loadAdminPlayers() {
    els.adminPlayers.innerHTML = '<div class="muted">Cargando jugadores…</div>';

    const [playersResult, profilesResult] = await Promise.all([
      db.from('players').select('id,nickname,photo_url').order('nickname', { ascending: true }),
      db.from('profiles').select('id,player_id,display_name,role')
    ]);

    if (playersResult.error || profilesResult.error) {
      const error = playersResult.error || profilesResult.error;
      els.adminPlayers.innerHTML = `<div class="notice">No se pudo cargar la gestión de cuentas: ${escapeHtml(error.message)}</div>`;
      return;
    }

    const profileByPlayer = new Map(
      (profilesResult.data || [])
        .filter((profile) => profile.player_id != null)
        .map((profile) => [String(profile.player_id), profile])
    );

    els.adminPlayers.innerHTML = '';
    for (const player of playersResult.data || []) {
      const profile = profileByPlayer.get(String(player.id));
      const row = document.createElement('div');
      row.className = 'admin-row';

      const avatar = document.createElement('img');
      avatar.className = 'admin-avatar';
      avatar.alt = '';
      if (player.photo_url) avatar.src = player.photo_url;

      const copy = document.createElement('div');
      copy.innerHTML = `
        <div class="admin-name">${escapeHtml(player.nickname)}</div>
        <div class="admin-state">${profile ? `Cuenta activa · ${escapeHtml(profile.role)}` : 'Disponible para registro'}</div>
      `;

      const badge = document.createElement('span');
      badge.className = `account-state-badge ${profile ? 'active' : ''}`;
      badge.textContent = profile ? 'REGISTRADO' : 'LIBRE';

      row.append(avatar, copy, badge);
      els.adminPlayers.appendChild(row);
    }
  }

  function beginCodeStep(result, playerId, nickname, password) {
    pendingRegistration = {
      requestId: result.request_id,
      playerId: Number(playerId),
      nickname,
      password
    };

    els.registerRequestForm.hidden = true;
    els.codeStep.hidden = false;
    els.codeStepCopy.textContent = result.already_pending
      ? `Ya existe una solicitud activa para ${nickname}. El administrador ya tiene el código de esa solicitud.`
      : `Has solicitado crear la cuenta de ${nickname}. La cuenta no se creará hasta que introduzcas el código correcto.`;
    els.registrationCode.value = '';
    setTimeout(() => els.registrationCode.focus(), 50);
  }

  function restartRegistrationFlow() {
    pendingRegistration = null;
    els.codeStep.hidden = true;
    els.registerRequestForm.hidden = false;
    els.registrationCode.value = '';
    els.registerPassword.value = '';
    els.registerPasswordRepeat.value = '';
    clearStatus();
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  els.loginTab.addEventListener('click', () => switchTab('login'));
  els.registerTab.addEventListener('click', () => switchTab('register'));

  els.loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearStatus();

    const playerId = els.loginPlayer.value;
    const password = els.loginPassword.value;
    if (!playerId || password.length === 0) {
      showStatus('Selecciona tu jugador y escribe tu contraseña.', 'error');
      return;
    }

    setBusy(els.loginButton, true, 'Entrando…');
    try {
      await auth.signInPlayer(playerId, password);
      els.loginPassword.value = '';
      await renderAuthState();
    } catch (error) {
      showStatus(error.message, 'error');
    } finally {
      setBusy(els.loginButton, false);
    }
  });

  els.registerRequestForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearStatus();

    const playerId = els.registerPlayer.value;
    const password = els.registerPassword.value;
    const repeat = els.registerPasswordRepeat.value;
    const player = availablePlayers.find((item) => String(item.id) === String(playerId));

    if (!playerId || !player) {
      showStatus('Selecciona quién eres.', 'error');
      return;
    }
    if (password.length === 0) {
      showStatus('Escribe una contraseña. Puede ser la que quieras, pero no puede estar vacía.', 'error');
      return;
    }
    if (password !== repeat) {
      showStatus('Las dos contraseñas no coinciden.', 'error');
      return;
    }

    setBusy(els.requestRegistrationButton, true, 'Avisando al administrador…');
    try {
      const result = await auth.requestRegistration(playerId);
      beginCodeStep(result, playerId, player.nickname, password);
      showStatus('Solicitud preparada. Pide el código al administrador.', 'success');
    } catch (error) {
      showStatus(error.message, 'error');
      if (error.status === 409) await loadAvailablePlayers();
    } finally {
      setBusy(els.requestRegistrationButton, false);
    }
  });

  els.completeRegistrationForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearStatus();

    if (!pendingRegistration) {
      showStatus('La solicitud ya no está disponible. Empieza de nuevo.', 'error');
      restartRegistrationFlow();
      return;
    }

    const code = els.registrationCode.value.trim();
    if (!/^\d{6}$/.test(code)) {
      showStatus('Introduce el código de 6 cifras.', 'error');
      return;
    }

    setBusy(els.completeRegistrationButton, true, 'Verificando…');
    try {
      const result = await auth.completeRegistration({
        playerId: pendingRegistration.playerId,
        requestId: pendingRegistration.requestId,
        code,
        password: pendingRegistration.password
      });

      if (!result.signed_in) {
        await auth.signInPlayer(pendingRegistration.playerId, pendingRegistration.password);
      }

      pendingRegistration = null;
      els.registerPassword.value = '';
      els.registerPasswordRepeat.value = '';
      els.registrationCode.value = '';
      showStatus('Cuenta creada correctamente. Ya estás identificado.', 'success');
      await renderAuthState();
    } catch (error) {
      showStatus(error.message, 'error');
      els.registrationCode.select();
    } finally {
      setBusy(els.completeRegistrationButton, false);
    }
  });

  els.restartRegistration.addEventListener('click', restartRegistrationFlow);

  async function logout() {
    pendingRegistration = null;
    await auth.signOut();
    currentAccount = null;
    await renderAuthState();
  }

  els.logoutButton.addEventListener('click', logout);
  els.unlinkedLogout.addEventListener('click', logout);
  els.refreshAdmin.addEventListener('click', loadAdminPlayers);

  auth.onChange(({ event }) => {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
      setTimeout(() => renderAuthState().catch(console.error), 0);
    }
  });

  renderAuthState().catch((error) => {
    console.error(error);
    showStatus('No se pudo cargar el sistema de cuentas.', 'error');
  });
})();
