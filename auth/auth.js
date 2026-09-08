(() => {
  'use strict';

  const config = window.PATX_AUTH_CONFIG;
  if (!config || !window.supabase) {
    document.body.innerHTML = '<p style="padding:24px;color:white">No se ha podido cargar el sistema de autenticación.</p>';
    return;
  }

  const db = window.supabase.createClient(
    config.supabaseUrl,
    config.supabasePublishableKey,
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
  );

  const $ = (id) => document.getElementById(id);
  const els = {
    status: $('statusBanner'),
    loggedOut: $('loggedOutView'),
    unlinked: $('unlinkedView'),
    account: $('accountView'),
    loginTab: $('loginTab'),
    registerTab: $('registerTab'),
    loginForm: $('loginForm'),
    registerForm: $('registerForm'),
    loginEmail: $('loginEmail'),
    loginPassword: $('loginPassword'),
    loginButton: $('loginButton'),
    registerPlayer: $('registerPlayer'),
    inviteCode: $('inviteCode'),
    registerEmail: $('registerEmail'),
    registerPassword: $('registerPassword'),
    registerButton: $('registerButton'),
    claimForm: $('claimForm'),
    claimPlayer: $('claimPlayer'),
    claimCode: $('claimCode'),
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

  let currentAccount = null;
  let claimablePlayers = [];

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

  function switchTab(mode) {
    const login = mode === 'login';
    els.loginTab.classList.toggle('active', login);
    els.registerTab.classList.toggle('active', !login);
    els.loginForm.hidden = !login;
    els.registerForm.hidden = login;
    clearStatus();
    if (!login) loadClaimablePlayers();
  }

  function hideAllViews() {
    els.loggedOut.hidden = true;
    els.unlinked.hidden = true;
    els.account.hidden = true;
  }

  async function loadClaimablePlayers() {
    const { data, error } = await db.rpc('list_claimable_players');
    if (error) {
      claimablePlayers = [];
      populatePlayerSelect(els.registerPlayer, []);
      populatePlayerSelect(els.claimPlayer, []);
      showStatus(`No se pudieron cargar los jugadores disponibles: ${error.message}`, 'error');
      return;
    }

    claimablePlayers = data || [];
    populatePlayerSelect(els.registerPlayer, claimablePlayers);
    populatePlayerSelect(els.claimPlayer, claimablePlayers);

    const pending = readPendingClaim();
    if (pending?.playerId && claimablePlayers.some((p) => String(p.id) === String(pending.playerId))) {
      els.claimPlayer.value = String(pending.playerId);
      els.registerPlayer.value = String(pending.playerId);
      els.claimCode.value = pending.code || '';
      els.inviteCode.value = pending.code || '';
    }
  }

  function populatePlayerSelect(select, players) {
    if (!select) return;
    select.innerHTML = '';
    if (!players.length) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No hay invitaciones activas';
      select.appendChild(option);
      select.disabled = true;
      return;
    }

    select.disabled = false;
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Selecciona tu jugador';
    select.appendChild(placeholder);

    for (const player of players) {
      const option = document.createElement('option');
      option.value = player.id;
      option.textContent = player.nickname;
      select.appendChild(option);
    }
  }

  function savePendingClaim(playerId, code) {
    localStorage.setItem('patx_pending_account_claim', JSON.stringify({
      playerId: String(playerId),
      code: String(code || '').trim(),
      savedAt: Date.now()
    }));
  }

  function readPendingClaim() {
    try {
      const raw = localStorage.getItem('patx_pending_account_claim');
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function clearPendingClaim() {
    localStorage.removeItem('patx_pending_account_claim');
  }

  async function signIn(email, password) {
    return db.auth.signInWithPassword({ email: email.trim(), password });
  }

  async function claimPlayer(playerId, inviteCode) {
    const { data, error } = await db.rpc('claim_player_profile', {
      p_player_id: Number(playerId),
      p_invite_code: String(inviteCode).trim()
    });
    if (error) throw error;
    clearPendingClaim();
    return data;
  }

  async function getMyAccount() {
    const { data, error } = await db.rpc('get_my_account');
    if (error) throw error;
    return Array.isArray(data) ? (data[0] || null) : data;
  }

  async function renderAuthState() {
    clearStatus();
    const { data: sessionData } = await db.auth.getSession();
    const session = sessionData?.session;

    if (!session) {
      currentAccount = null;
      hideAllViews();
      els.loggedOut.hidden = false;
      switchTab('login');
      return;
    }

    try {
      currentAccount = await getMyAccount();
    } catch (error) {
      hideAllViews();
      els.loggedOut.hidden = false;
      showStatus(`La sesión existe, pero no se pudo cargar el perfil: ${error.message}`, 'error');
      return;
    }

    if (!currentAccount || !currentAccount.player_id) {
      hideAllViews();
      els.unlinked.hidden = false;
      await loadClaimablePlayers();
      const pending = readPendingClaim();
      if (pending) {
        els.claimPlayer.value = pending.playerId || '';
        els.claimCode.value = pending.code || '';
      }
      return;
    }

    hideAllViews();
    els.account.hidden = false;
    renderAccount(currentAccount);

    if (currentAccount.role === 'admin') {
      els.adminPanel.hidden = false;
      await loadAdminPlayers();
    } else {
      els.adminPanel.hidden = true;
    }
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
        .filter((p) => p.player_id != null)
        .map((p) => [String(p.player_id), p])
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
        <div class="admin-state">${profile ? `Cuenta activa · ${escapeHtml(profile.role)}` : 'Sin cuenta vinculada'}</div>
      `;

      const action = document.createElement('button');
      action.className = 'secondary small row-action';
      action.type = 'button';
      action.textContent = profile ? 'Vinculada' : 'Generar código';
      action.disabled = Boolean(profile);

      if (!profile) {
        action.addEventListener('click', () => generateInvite(player, row, action));
      }

      row.append(avatar, copy, action);
      els.adminPlayers.appendChild(row);
    }
  }

  async function generateInvite(player, row, button) {
    clearStatus();
    setBusy(button, true, 'Generando…');
    const { data, error } = await db.rpc('admin_create_player_invite', {
      p_player_id: Number(player.id),
      p_valid_hours: 168
    });
    setBusy(button, false);

    if (error) {
      showStatus(error.message, 'error');
      return;
    }

    const invite = Array.isArray(data) ? data[0] : data;
    if (!invite?.invite_code) {
      showStatus('No se recibió el código de invitación.', 'error');
      return;
    }

    button.textContent = 'Regenerar código';
    const oldCode = row.querySelector('.code-box');
    if (oldCode) oldCode.remove();

    const codeBox = document.createElement('button');
    codeBox.type = 'button';
    codeBox.className = 'code-box row-action';
    codeBox.textContent = `${invite.invite_code} · copiar`;
    codeBox.title = 'Pulsa para copiar el código';
    codeBox.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(invite.invite_code);
        codeBox.textContent = `${invite.invite_code} · copiado`;
      } catch (_) {
        codeBox.textContent = invite.invite_code;
      }
    });
    row.appendChild(codeBox);
    showStatus(`Código generado para ${player.nickname}. Caduca en 7 días.`, 'success');
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
    setBusy(els.loginButton, true, 'Entrando…');
    const { error } = await signIn(els.loginEmail.value, els.loginPassword.value);
    setBusy(els.loginButton, false);
    if (error) {
      showStatus(error.message, 'error');
      return;
    }
    els.loginPassword.value = '';
    await renderAuthState();
  });

  els.registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearStatus();

    const playerId = els.registerPlayer.value;
    const code = els.inviteCode.value.trim();
    const email = els.registerEmail.value.trim();
    const password = els.registerPassword.value;

    if (!playerId) {
      showStatus('Selecciona tu jugador.', 'error');
      return;
    }

    savePendingClaim(playerId, code);
    setBusy(els.registerButton, true, 'Creando cuenta…');

    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: claimablePlayers.find((p) => String(p.id) === String(playerId))?.nickname || '' }
      }
    });

    if (error) {
      setBusy(els.registerButton, false);
      showStatus(error.message, 'error');
      return;
    }

    if (!data.session) {
      setBusy(els.registerButton, false);
      showStatus('La cuenta se ha creado, pero Supabase todavía exige confirmar el email. Para Patxanguilles desactivaremos esa confirmación; después el alta será inmediata.', 'error');
      return;
    }

    try {
      await claimPlayer(playerId, code);
      setBusy(els.registerButton, false);
      showStatus('Cuenta creada y jugador vinculado correctamente.', 'success');
      await renderAuthState();
    } catch (claimError) {
      setBusy(els.registerButton, false);
      showStatus(`La cuenta se creó, pero no se pudo vincular el jugador: ${claimError.message}`, 'error');
      await renderAuthState();
    }
  });

  els.claimForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearStatus();
    const button = els.claimForm.querySelector('button[type="submit"]');
    setBusy(button, true, 'Vinculando…');
    try {
      await claimPlayer(els.claimPlayer.value, els.claimCode.value);
      setBusy(button, false);
      showStatus('Jugador vinculado correctamente.', 'success');
      await renderAuthState();
    } catch (error) {
      setBusy(button, false);
      showStatus(error.message, 'error');
    }
  });

  async function logout() {
    clearPendingClaim();
    await db.auth.signOut();
    currentAccount = null;
    await renderAuthState();
  }

  els.logoutButton.addEventListener('click', logout);
  els.unlinkedLogout.addEventListener('click', logout);
  els.refreshAdmin.addEventListener('click', loadAdminPlayers);

  db.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
      setTimeout(renderAuthState, 0);
    }
  });

  renderAuthState();
})();
