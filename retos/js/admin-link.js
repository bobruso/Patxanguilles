(() => {
  'use strict';
  const link = document.getElementById('triviaAdminLink');
  if (!link || !window.PatxAuth) return;
  window.PatxAuth.getState().then(state => {
    link.hidden = !(state?.signedIn && state?.linked && state?.isAdmin);
  }).catch(() => { link.hidden = true; });
})();