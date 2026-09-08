(() => {
  'use strict';

  const config = window.PATX_AUTH_CONFIG;
  if (!config || !window.supabase) {
    console.error('[PatxAuth] Falta PATX_AUTH_CONFIG o supabase-js.');
    return;
  }

  const client = window.supabase.createClient(
    config.supabaseUrl,
    config.supabasePublishableKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  let accountCache = undefined;
  let accountPromise = null;
  const listeners = new Set();

  function safeSameOriginUrl(value, fallback = null) {
    if (!value) return fallback;
    try {
      const url = new URL(value, window.location.href);
      if (url.origin !== window.location.origin) return fallback;
      return url.href;
    } catch (_) {
      return fallback;
    }
  }

  function getAuthUrl(returnTo) {
    const authPath = config.authPath || '/auth/';
    const url = new URL(authPath, window.location.origin);
    const safeReturnTo = safeSameOriginUrl(returnTo);
    if (safeReturnTo) url.searchParams.set('returnTo', safeReturnTo);
    return url.href;
  }

  async function callAccountAuth(action, payload = {}) {
    const response = await fetch(`${config.supabaseUrl}/functions/v1/account-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.supabasePublishableKey
      },
      body: JSON.stringify({ action, ...payload })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false) {
      const error = new Error(data?.error || 'No se pudo completar la operación.');
      error.status = response.status;
      error.payload = data;
      throw error;
    }
    return data;
  }

  async function setReturnedSession(session) {
    if (!session?.access_token || !session?.refresh_token) return false;
    const { error } = await client.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    });
    if (error) throw error;
    accountCache = undefined;
    accountPromise = null;
    return true;
  }

  async function getSession() {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data?.session || null;
  }

  async function getUser() {
    const { data, error } = await client.auth.getUser();
    if (error) throw error;
    return data?.user || null;
  }

  async function getAccount(force = false) {
    const session = await getSession();
    if (!session) {
      accountCache = null;
      return null;
    }

    if (!force && accountCache !== undefined) return accountCache;
    if (!force && accountPromise) return accountPromise;

    accountPromise = (async () => {
      const { data, error } = await client.rpc('get_my_account');
      if (error) throw error;
      const account = Array.isArray(data) ? (data[0] || null) : data;
      accountCache = account || null;
      return accountCache;
    })();

    try {
      return await accountPromise;
    } finally {
      accountPromise = null;
    }
  }

  async function getState(force = false) {
    const session = await getSession();
    if (!session) {
      return {
        signedIn: false,
        linked: false,
        isAdmin: false,
        session: null,
        user: null,
        account: null,
        playerId: null,
        nickname: null
      };
    }

    const account = await getAccount(force);
    return {
      signedIn: true,
      linked: Boolean(account?.player_id),
      isAdmin: account?.role === 'admin',
      session,
      user: session.user || null,
      account,
      playerId: account?.player_id ?? null,
      nickname: account?.player_nickname || account?.display_name || null
    };
  }

  async function listAvailablePlayers() {
    const data = await callAccountAuth('available_players');
    return data.players || [];
  }

  async function listRegisteredPlayers() {
    const data = await callAccountAuth('registered_players');
    return data.players || [];
  }

  async function requestRegistration(playerId) {
    return callAccountAuth('request_registration', {
      player_id: Number(playerId)
    });
  }

  async function completeRegistration({ playerId, requestId, code, password }) {
    const data = await callAccountAuth('complete_registration', {
      player_id: Number(playerId),
      request_id: requestId,
      code,
      password
    });
    if (data.session) await setReturnedSession(data.session);
    return data;
  }

  async function signInPlayer(playerId, password) {
    accountCache = undefined;
    accountPromise = null;
    const data = await callAccountAuth('login', {
      player_id: Number(playerId),
      password
    });
    await setReturnedSession(data.session);
    return data;
  }

  // Legacy helper retained temporarily while the account branch is being tested.
  async function signIn(email, password) {
    accountCache = undefined;
    return client.auth.signInWithPassword({
      email: String(email || '').trim(),
      password
    });
  }

  async function signOut() {
    accountCache = undefined;
    accountPromise = null;
    return client.auth.signOut();
  }

  async function requireAccount(options = {}) {
    const state = await getState(Boolean(options.force));
    if (state.signedIn && state.linked) return state;

    if (options.redirect !== false) {
      const returnTo = options.returnTo || window.location.href;
      window.location.replace(getAuthUrl(returnTo));
    }
    return null;
  }

  async function requireAdmin(options = {}) {
    const state = await getState(Boolean(options.force));
    if (state.signedIn && state.linked && state.isAdmin) return state;

    if (options.redirect !== false) {
      const returnTo = options.returnTo || window.location.href;
      window.location.replace(getAuthUrl(returnTo));
    }
    return null;
  }

  function onChange(callback) {
    if (typeof callback !== 'function') return () => {};
    listeners.add(callback);
    return () => listeners.delete(callback);
  }

  async function notify(event, session) {
    let state = null;
    try {
      state = await getState(true);
    } catch (error) {
      console.error('[PatxAuth] No se pudo refrescar la identidad:', error);
    }
    for (const listener of listeners) {
      try {
        listener({ event, session, state });
      } catch (error) {
        console.error('[PatxAuth] Error en listener:', error);
      }
    }
  }

  client.auth.onAuthStateChange((event, session) => {
    accountCache = undefined;
    accountPromise = null;
    setTimeout(() => notify(event, session), 0);
  });

  window.PatxAuth = Object.freeze({
    getClient: () => client,
    getSession,
    getUser,
    getAccount,
    getState,
    signIn,
    signInPlayer,
    signOut,
    listAvailablePlayers,
    listRegisteredPlayers,
    requestRegistration,
    completeRegistration,
    requireAccount,
    requireAdmin,
    getAuthUrl,
    safeSameOriginUrl,
    onChange
  });
})();
