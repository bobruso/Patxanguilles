(() => {
  'use strict';

  if (!window.PatxAuth) return;

  const params = new URLSearchParams(window.location.search);
  const rawReturnTo = params.get('returnTo');
  const returnTo = window.PatxAuth.safeSameOriginUrl(rawReturnTo);
  if (!returnTo) return;

  let redirecting = false;

  async function tryReturn() {
    if (redirecting) return;
    try {
      const state = await window.PatxAuth.getState(true);
      if (state.signedIn && state.linked) {
        redirecting = true;
        window.location.replace(returnTo);
      }
    } catch (error) {
      console.error('[PatxAuth] No se pudo completar el retorno:', error);
    }
  }

  window.PatxAuth.onChange(() => tryReturn());
  tryReturn();
})();
