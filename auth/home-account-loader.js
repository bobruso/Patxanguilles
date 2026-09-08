(() => {
  'use strict';

  if (window.__PATX_HOME_ACCOUNT_LOADER__) return;
  window.__PATX_HOME_ACCOUNT_LOADER__ = true;

  const current = document.currentScript;
  const baseUrl = current?.src
    ? new URL('./', current.src)
    : new URL('./auth/', window.location.href);

  const loadCss = (file) => {
    const href = new URL(file, baseUrl).href;
    if ([...document.styleSheets].some((sheet) => sheet.href === href)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  };

  const loadScript = (file) => new Promise((resolve, reject) => {
    const src = new URL(file, baseUrl).href;
    const existing = [...document.scripts].find((script) => script.src === src);
    if (existing) {
      if (existing.dataset.patxLoaded === '1') return resolve();
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.addEventListener('load', () => {
      script.dataset.patxLoaded = '1';
      resolve();
    }, { once: true });
    script.addEventListener('error', reject, { once: true });
    document.head.appendChild(script);
  });

  const ensureSupabase = async () => {
    if (window.supabase?.createClient) return;
    await new Promise((resolve, reject) => {
      const existing = [...document.scripts].find((script) => script.src.includes('@supabase/supabase-js'));
      if (existing) {
        if (window.supabase?.createClient) return resolve();
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', reject, { once: true });
      document.head.appendChild(script);
    });
  };

  const ensureSlot = () => {
    let slot = document.querySelector('[data-patx-account-widget]');
    if (slot) return slot;
    slot = document.createElement('div');
    slot.className = 'patx-account-slot patx-global-account';
    slot.setAttribute('data-patx-account-widget', '');
    slot.setAttribute('aria-label', 'Cuenta de Patxanguilles');
    document.body.appendChild(slot);
    return slot;
  };

  (async () => {
    try {
      loadCss('account-widget.css');
      loadCss('home-account-bridge.css');
      ensureSlot();
      await ensureSupabase();

      if (!window.PATX_AUTH_CONFIG) await loadScript('config.js');
      if (!window.PatxAuth) await loadScript('auth-service.js');
      await loadScript('account-widget.js');
    } catch (error) {
      console.error('[PatxAuth] No se pudo cargar el widget de cuenta en la Home:', error);
      const slot = document.querySelector('[data-patx-account-widget]');
      if (slot) slot.remove();
    }
  })();
})();
