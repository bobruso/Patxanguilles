/*
  Presentation core: layout, lifecycle, motion helpers and small utilities.
  Kept free of scene/animation specifics so scenes can be reasoned about in isolation.
*/

export const LANDSCAPE = { w: 1920, h: 1080 };
export const PORTRAIT = { w: 1080, h: 1920 };

export const root = document.documentElement;
export const stage = document.getElementById('presentationStage');
/* Scenes render into their own layer, separate from the stage decoration. */
export const layer = (() => {
  let el = document.getElementById('presentationSceneLayer');
  if (!el && stage) {
    el = document.createElement('div');
    el.id = 'presentationSceneLayer';
    el.className = 'patx-present-scene-layer';
    stage.prepend(el);
  }
  return el || stage;
})();

export const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
export const reducedMotion = prefersReducedMotion();

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
/*
  Strict numeric test. `Number(null)` is 0, so a loose check would silently turn
  "missing" into a real zero — which must never happen to a score or a metric.
*/
export function finite(v) {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean') return false;
  return Number.isFinite(Number(v));
}
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const lerp = (a, b, t) => a + (b - a) * t;

export function firstFinite(...values) {
  for (const value of values) if (finite(value)) return Number(value);
  return null;
}

export function meanFinite(values) {
  /* Missing entries are excluded, never coerced to 0. */
  const list = (values || []).filter(finite).map(Number);
  return list.length ? list.reduce((sum, v) => sum + v, 0) / list.length : null;
}

export function pathGet(obj, path) {
  let cur = obj;
  for (const key of path) {
    if (cur == null) return undefined;
    cur = cur[key];
  }
  return cur;
}

export function initials(name) {
  return String(name || 'P').trim().split(/\s+/).slice(0, 2).map(x => x[0] || '').join('').toUpperCase() || 'P';
}

export const fmtKm = m => (finite(m) ? (Number(m) / 1000).toFixed(2) : '—');
export const fmtKmh = v => (finite(v) ? Number(v).toFixed(1) : '—');
export const fmtMinutes = s => (finite(s) ? `${Math.max(0, Math.round(Number(s) / 60))} MIN` : '—');

export const fmtDate = value => {
  if (!value) return 'PARTIDO';
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? String(value)
    : new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }).format(d).toUpperCase();
};

export const modeLabel = m => (m === 'football7' ? 'FÚTBOL 7' : m === 'football5' ? 'FÚTBOL SALA' : 'GPS');

/* ------------------------------------------------------------------ device */

export function isMobileDevice() {
  if (typeof navigator.userAgentData?.mobile === 'boolean') return navigator.userAgentData.mobile;
  const ua = String(navigator.userAgent || '');
  if (/Android|iPhone|iPod|IEMobile|Opera Mini|Mobile/i.test(ua)) return true;
  if (/iPad/i.test(ua)) return true;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches === true;
  const shortest = Math.min(Number(screen.width) || innerWidth, Number(screen.height) || innerHeight);
  return coarse && shortest <= 1024;
}

/*
  Layout is automatic and device-driven only: mobile device -> vertical master,
  everything else -> horizontal master. Window shape never switches the master, so
  the director does not flip compositions when a desktop window is resized.
*/
export function resolveLayout() {
  return isMobileDevice() ? 'portrait' : 'landscape';
}

export function stageSize(layout) {
  return layout === 'portrait' ? PORTRAIT : LANDSCAPE;
}

/*
  Fit the virtual stage into the physical viewport.
  The stage is absolutely positioned at the origin with transform-origin 0 0, so the
  translate below is exact: no grid-track overflow, no clipped right/bottom edge.
*/
export function fitStage() {
  const layout = resolveLayout();
  const { w, h } = stageSize(layout);
  if (stage.dataset.layout !== layout) stage.dataset.layout = layout;
  const scale = Math.min(innerWidth / w, innerHeight / h);
  const x = (innerWidth - w * scale) / 2;
  const y = (innerHeight - h * scale) / 2;
  stage.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) scale(${scale.toFixed(5)})`;
  stage.style.setProperty('--patx-stage-scale', String(scale));
  stage.style.setProperty('--patx-stage-w', `${w}px`);
  stage.style.setProperty('--patx-stage-h', `${h}px`);
  root.style.setProperty('--patx-letterbox-y', `${Math.max(0, y).toFixed(1)}px`);
  return { layout, w, h, scale, x, y };
}

/* --------------------------------------------------------------- lifecycle */

/*
  Every scene runs inside a SceneContext. Anything scheduled through it (rAF,
  timers, listeners, Leaflet maps, Web Animations) is released when the scene ends,
  so replaying the presentation cannot leak frames, timers or map instances.
*/
export class SceneContext {
  constructor() {
    this.disposed = false;
    this.frames = new Set();
    this.timers = new Set();
    this.pendingWaiters = new Set();
    this.listeners = [];
    this.cleanups = [];
    this.animations = new Set();
  }

  get alive() {
    return !this.disposed;
  }

  requestAnimationFrame(fn) {
    if (this.disposed) return 0;
    let id = 0;
    id = requestAnimationFrame(now => {
      this.frames.delete(id);
      if (this.disposed) return;
      fn(now);
    });
    this.frames.add(id);
    return id;
  }

  setTimeout(fn, ms) {
    if (this.disposed) return 0;
    const id = setTimeout(() => {
      this.timers.delete(id);
      if (this.disposed) return;
      fn();
    }, ms);
    this.timers.add(id);
    return id;
  }

  wait(ms) {
    return new Promise(resolve => {
      if (this.disposed) return resolve();
      const settle = () => {
        this.pendingWaiters.delete(settle);
        resolve();
      };
      this.pendingWaiters.add(settle);
      this.setTimeout(settle, reducedMotion ? Math.min(ms, 180) : ms);
    });
  }

  on(target, type, handler, options) {
    if (!target?.addEventListener) return;
    target.addEventListener(type, handler, options);
    this.listeners.push([target, type, handler, options]);
    return handler;
  }

  once(target, type, handler, options) {
    return this.on(target, type, handler, { ...options, once: true });
  }

  track(animation) {
    if (!animation) return animation;
    this.animations.add(animation);
    animation.finished?.catch(() => {}).finally(() => this.animations.delete(animation));
    return animation;
  }

  addCleanup(fn) {
    if (typeof fn === 'function') this.cleanups.push(fn);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const id of this.frames) cancelAnimationFrame(id);
    this.frames.clear();
    for (const id of this.timers) clearTimeout(id);
    this.timers.clear();
    /* Anything awaiting ctx.wait() must settle, or a scene would hang on teardown. */
    for (const settle of [...this.pendingWaiters]) settle();
    this.pendingWaiters.clear();
    for (const [target, type, handler, options] of this.listeners) {
      try {
        target.removeEventListener(type, handler, options);
      } catch (_) {}
    }
    this.listeners.length = 0;
    for (const animation of this.animations) {
      try {
        animation.cancel();
      } catch (_) {}
    }
    this.animations.clear();
    for (const fn of this.cleanups.reverse()) {
      try {
        fn();
      } catch (err) {
        console.warn('[GPS presentation] cleanup', err);
      }
    }
    this.cleanups.length = 0;
  }
}

/* ------------------------------------------------------------------- motion */

const DEFAULT_EASE = 'cubic-bezier(.2,.82,.16,1)';

export function animate(ctx, el, keyframes, options = {}) {
  if (!el) return Promise.resolve();
  if (reducedMotion) {
    const last = keyframes[keyframes.length - 1] || {};
    for (const [key, value] of Object.entries(last)) el.style.setProperty(key, value);
    return Promise.resolve();
  }
  const animation = el.animate(keyframes, {
    duration: options.duration || 700,
    easing: options.easing || DEFAULT_EASE,
    fill: options.fill || 'forwards',
    delay: options.delay || 0,
  });
  ctx?.track?.(animation);
  return animation.finished.catch(() => {});
}

/* Entrances are always concealed before their first paint (CSS keeps [data-anim] at 0). */
export function enter(ctx, selector, delay = 0, distance = 38, options = {}) {
  const targets = typeof selector === 'string' ? stage.querySelectorAll(selector) : [selector];
  const jobs = [];
  targets.forEach((el, index) => {
    if (!el) return;
    jobs.push(
      animate(
        ctx,
        el,
        [
          { opacity: 0, transform: `translate3d(0,${distance}px,0)`, filter: 'blur(12px)' },
          { opacity: 1, transform: 'translate3d(0,0,0)', filter: 'blur(0px)' },
        ],
        { duration: options.duration || 860, delay: delay + index * (options.stagger || 0), easing: options.easing },
      ),
    );
  });
  return Promise.all(jobs);
}

export function countNumber(ctx, el, from, to, duration, formatter = v => String(v)) {
  if (!el) return Promise.resolve();
  if (!finite(to)) {
    el.textContent = formatter(to);
    return Promise.resolve();
  }
  if (reducedMotion) {
    el.textContent = formatter(to);
    return Promise.resolve();
  }
  const start = performance.now();
  return new Promise(resolve => {
    const tick = now => {
      if (!ctx.alive) return resolve();
      const p = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = formatter(from + (to - from) * eased);
      if (p < 1) ctx.requestAnimationFrame(tick);
      else resolve();
    };
    ctx.requestAnimationFrame(tick);
  });
}

/* --------------------------------------------------------------- canvas fit */

const MAX_CANVAS_PIXELS = 2_600_000;
const MAX_DPR = 2;

/*
  Bounded canvas sizing: caps DPR and total backing-store pixels so heavy portrait
  canvases cannot allocate huge buffers on mobile.
*/
export function fitCanvas(canvas, { minW = 400, minH = 220, aspect = null } = {}) {
  const parentW = canvas.parentElement?.clientWidth || 0;
  let cssW = Math.max(minW, Math.round(canvas.clientWidth || parentW || minW));
  let cssH = aspect
    ? Math.round(cssW * aspect)
    : Math.max(minH, Math.round(canvas.clientHeight || canvas.parentElement?.clientHeight || minH));
  let dpr = clamp(devicePixelRatio || 1, 1, MAX_DPR);
  while (cssW * dpr * cssH * dpr > MAX_CANVAS_PIXELS && dpr > 1) dpr = Math.round((dpr - 0.25) * 100) / 100;
  const targetW = Math.max(1, Math.round(cssW * dpr));
  const targetH = Math.max(1, Math.round(cssH * dpr));
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }
  if (aspect) {
    canvas.style.width = '100%';
    canvas.style.height = `${cssH}px`;
  }
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx: c, w: cssW, h: cssH, dpr };
}

export function preloadImage(src, timeout = 4500) {
  if (!src) return Promise.resolve(false);
  return new Promise(resolve => {
    const img = new Image();
    img.decoding = 'async';
    let settled = false;
    const finish = ok => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false), timeout);
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    img.src = src;
  });
}
