/*
  Santa Ana F7 satellite intro.

  The GPS route is reconstructed with the real pitch calibration
  (gps_pitches corners + field-transform unproject). Nothing about the geometry is
  invented or clipped: if the stored route ever leaves the calibrated rectangle the
  unprojected line simply continues outside it.
*/
import { buildFieldTransform } from '../field-transform.js';
import { clamp, enter, esc, finite, fmtDate, layer, reducedMotion, stage } from './core.js';

export const TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

let leafletPromise = null;

export function loadLeaflet() {
  if (window.L?.map) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-patx-presentation-leaflet]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.dataset.patxPresentationLeaflet = '1';
      document.head.appendChild(link);
    }
    const existing = [...document.scripts].find(script => /leaflet(?:\.min)?\.js/.test(script.src));
    if (existing) {
      if (window.L?.map) return resolve(window.L);
      existing.addEventListener('load', () => resolve(window.L), { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error('No se pudo cargar el motor del mapa satélite.'));
    document.head.appendChild(script);
  });
  return leafletPromise;
}

/* ------------------------------------------------------------ tile preload */

const lon2tile = (lon, z) => ((lon + 180) / 360) * 2 ** z;
const lat2tile = (lat, z) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
};

function tileUrlsFor(bounds, zoom, clampTile = 96) {
  const z = Math.round(clamp(zoom, 3, 20));
  const xMin = Math.floor(lon2tile(bounds.getWest(), z));
  const xMax = Math.floor(lon2tile(bounds.getEast(), z));
  const yMin = Math.floor(lat2tile(bounds.getNorth(), z));
  const yMax = Math.floor(lat2tile(bounds.getSouth(), z));
  const urls = [];
  for (let x = xMin; x <= xMax; x++) {
    for (let y = yMin; y <= yMax; y++) {
      urls.push(
        TILE_URL.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y)),
      );
      if (urls.length >= clampTile) return urls;
    }
  }
  return urls;
}

/*
  Warm tiles at the original imagery level; camera zoom never changes imagery level.
*/
function prefetchTiles(urls, timeout = 2600) {
  if (!urls.length) return Promise.resolve(0);
  return new Promise(resolve => {
    let done = 0;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve(done);
    };
    const timer = setTimeout(finish, timeout);
    for (const url of urls) {
      const img = new Image();
      img.decoding = 'async';
      const step = () => {
        done++;
        if (done >= urls.length) {
          clearTimeout(timer);
          finish();
        }
      };
      img.onload = step;
      img.onerror = step;
      img.src = url;
    }
  });
}

function decimateRoute(route, maxPoints = 900) {
  if (route.length <= maxPoints) return route;
  const step = (route.length - 1) / (maxPoints - 1);
  const out = [];
  for (let i = 0; i < maxPoints; i++) out.push(route[Math.min(route.length - 1, Math.round(i * step))]);
  return out;
}

function routeToGeo(trail, tf) {
  const raw = trail
    .map(pt => {
      const geo = tf.unproject(Number(pt?.u), Number(pt?.v));
      return finite(geo?.lat) && finite(geo?.lon) ? { lat: Number(geo.lat), lon: Number(geo.lon), tSec: Number(pt?.tSec) } : null;
    })
    .filter(Boolean);
  return decimateRoute(raw);
}

/* ------------------------------------------------------------------- scene */

export async function runSantaAnaIntro(ctx, api) {
  const { data, layout } = api;
  /* QA-only path: ?fixture=missing-tiles forces the imagery layer to fail. */
  const tileUrl = data.forceTileFailure
    ? TILE_URL.replace('server.arcgisonline.com', 'tiles-unavailable.invalid')
    : TILE_URL;
  const pitch = data.pitch;
  const trail = Array.isArray(data.analysis?.trail) ? data.analysis.trail : [];
  const tf = buildFieldTransform(pitch?.corners);
  if (!tf?.unproject || trail.length < 2) throw new Error('No se puede reconstruir el recorrido sobre Santa Ana.');
  const route = routeToGeo(trail, tf);
  if (route.length < 2) throw new Error('El recorrido de Santa Ana no contiene suficientes puntos.');
  /* QA-only: forces the map engine to be unavailable so the classic fallback runs. */
  if (data.forceLeafletFailure) throw new Error('QA: motor del mapa no disponible.');

  const portrait = layout === 'portrait';
  layer.innerHTML = `<section class="patx-present-scene patx-sat-intro" data-scene="satellite">
    <div class="patx-sat-camera" data-sat-camera>
      <div id="patxSantaAnaMap" class="patx-sat-map" aria-label="Vista satélite de Santa Ana"></div>
    </div>
    <div class="patx-sat-vignette"></div>
    <div class="patx-sat-scan"></div>
    <header class="patx-sat-location" data-anim="satLocation"><i></i><span>SANTA ANA</span><small>FÚTBOL 7 · VISTA SATÉLITE</small></header>
    <div class="patx-sat-copy" data-anim="satCopy">
      <h1>${esc(data.player.name)}</h1>
      <p>${esc(fmtDate(data.match.date))}${data.match.pitchName ? ` · ${esc(String(data.match.pitchName).toUpperCase())}` : ''}</p>
      <div class="patx-sat-distance"><strong id="satDistance" class="patx-present-metric">${finite(data.analysis.distanceM) ? '0.00' : '—'}</strong><span class="patx-present-metric-unit">KM</span></div>
    </div>
    <div class="patx-sat-route-label" data-anim="routeLabel"><span>RECORRIDO REAL</span><b>GPS</b></div>
    <div class="patx-sat-attribution">IMAGERY © ESRI</div>
    <div class="patx-sat-notice" data-sat-notice hidden><span>VISTA SATÉLITE NO DISPONIBLE</span><small>Se muestra el recorrido GPS registrado.</small></div>
  </section>`;
  stage.classList.add('patx-satellite-active');

  const L = await loadLeaflet();
  if (!ctx.alive) return {};

  const mapEl = stage.querySelector('#patxSantaAnaMap');
  const notice = stage.querySelector('[data-sat-notice]');
  const distanceEl = stage.querySelector('#satDistance');
  if (!mapEl) throw new Error('No se pudo crear la vista satélite.');

  const map = L.map(mapEl, {
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    touchZoom: false,
    zoomSnap: 0.1,
    zoomDelta: 0.5,
    fadeAnimation: true,
    zoomAnimation: true,
    inertia: false,
    preferCanvas: true,
  });
  ctx.addCleanup(() => {
    try {
      map.remove();
    } catch (_) {}
  });

  const fieldLatLngs = pitch.corners.map(c => [Number(c.lat), Number(c.lon)]);
  const fieldBounds = L.latLngBounds(fieldLatLngs);
  const center = fieldBounds.getCenter();
  const padding = portrait ? [140, 340] : [220, 170];
  const closeZoom = Math.min(20, Math.max(17.2, map.getBoundsZoom(fieldBounds, false, padding) + 0.15));
  const latSpan = Math.max(0.0001, fieldBounds.getNorth() - fieldBounds.getSouth());
  const lonSpan = Math.max(0.0001, fieldBounds.getEast() - fieldBounds.getWest());
  const startZoom = Math.max(14.4, closeZoom - (portrait ? 2.75 : 3.15));
  const startCenter = L.latLng(center.lat + latSpan * 2.05, center.lng - lonSpan * 1.85);
  // Keep the imagery level of the ORIGINAL wide establishing view. Leaflet can
  // move/zoom its camera and accurate route, but must not swap in close-up imagery.
  const imageryZoom = Math.round(startZoom);
  mapEl.dataset.imageryZoom = String(imageryZoom);
  let tileFailures = 0;
  const sat = L.tileLayer(tileUrl, {
    maxZoom: 20,
    minNativeZoom: imageryZoom,
    maxNativeZoom: imageryZoom,
    minZoom: 3,
    attribution: 'Tiles © Esri',
    keepBuffer: 4,
    updateWhenZooming: false,
    updateWhenIdle: false,
  }).addTo(map);
  ctx.on(sat, 'tileerror', () => {
    tileFailures++;
    if (tileFailures > 4 && notice) {
      notice.hidden = false;
      mapEl.closest('.patx-sat-intro')?.setAttribute('data-tiles', 'failed');
    }
  });

  map.setView(reducedMotion ? center : startCenter, reducedMotion ? closeZoom : startZoom, { animate: false });

  const routeGlow = L.polyline([], {
    color: '#ff9f1c',
    weight: portrait ? 8 : 6.5,
    opacity: 0.13,
    interactive: false,
    lineCap: 'round',
    lineJoin: 'round',
    className: 'patx-sat-route-glow',
  }).addTo(map);
  const routeLine = L.polyline([], {
    color: '#ffe066',
    weight: portrait ? 3 : 2.5,
    opacity: 0.97,
    interactive: false,
    lineCap: 'round',
    lineJoin: 'round',
    className: 'patx-sat-route-line',
  }).addTo(map);
  /* A 3px energy tip, not a map marker: it scales in pixels and disappears once drawn. */
  const tip = L.circleMarker([center.lat, center.lng], {
    radius: 3,
    color: '#fff8d6',
    weight: 1,
    opacity: 0,
    fillColor: '#ffe066',
    fillOpacity: 0,
    interactive: false,
  }).addTo(map);

  /*
    Prefetch the landing area at the original imagery level, accounting for the
    magnification between camera zoom and the retained tile level.
    (Using [0,0] and [size] would be the global pixel origin near the dateline.)
  */
  const destZoom = imageryZoom;
  const destCenter = map.project(center, destZoom);
  const halfSize = map.getSize().divideBy(2 * map.getZoomScale(closeZoom, destZoom));
  const destBounds = L.latLngBounds(
    map.unproject(destCenter.clone().subtract(halfSize), destZoom),
    map.unproject(destCenter.clone().add(halfSize), destZoom),
  );
  const destTiles = tileUrlsFor(destBounds, destZoom, 96);
  const centerTile = TILE_URL.replace('{z}', String(destZoom))
    .replace('{x}', String(Math.floor(lon2tile(center.lng, destZoom))))
    .replace('{y}', String(Math.floor(lat2tile(center.lat, destZoom))));
  if (!destTiles.includes(centerTile)) console.warn('[GPS presentation] prefetch no cubre el centro', destZoom);
  const prefetch = reducedMotion
    ? Promise.resolve(0)
    : prefetchTiles(destTiles, 2600);

  await Promise.race([
    new Promise(resolve => ctx.once(sat, 'load', resolve)),
    ctx.wait(1900),
  ]);
  if (!ctx.alive) return {};

  await enter(ctx, '[data-anim="satLocation"]', 40, 18);
  if (!ctx.alive) return {};

  if (!reducedMotion) {
    await prefetch;
    if (!ctx.alive) return {};

    // Restore the approach, retaining the first photograph at the landing.
    // Await its original timing before beginning the GPS drawing.
    map.flyTo(center, closeZoom, { duration: 4.8, easeLinearity: 0.25, noMoveStart: true });
    await Promise.race([new Promise(resolve => ctx.once(map, 'moveend', resolve)), ctx.wait(5200)]);
    if (!ctx.alive) return {};
    await ctx.wait(700);
    if (!ctx.alive) return {};
  }

  /* Copy, label and the route drawing start together: the numbers land while the
     line is still being drawn, so the intro reads as one continuous movement. */
  enter(ctx, '[data-anim="satCopy"]', 40, 30);
  enter(ctx, '[data-anim="routeLabel"]', 240, 16);
  const totalKm = finite(data.analysis.distanceM) ? Number(data.analysis.distanceM) / 1000 : null;
  const drawDuration = reducedMotion ? 600 : 5600;
  const startedAt = performance.now();
  let lastDraw = 0;
  let lastCount = -1;

  await new Promise(resolve => {
    const frame = now => {
      if (!ctx.alive) return resolve();
      const p = clamp((now - startedAt) / drawDuration, 0, 1);
      const eased = 1 - Math.pow(1 - p, 2.15);
      if (now - lastDraw > 66 || p >= 1) {
        const count = Math.max(2, Math.min(route.length, Math.ceil(route.length * eased)));
        if (count !== lastCount) {
          const part = route.slice(0, count).map(pt => [pt.lat, pt.lon]);
          routeGlow.setLatLngs(part);
          routeLine.setLatLngs(part);
          const head = route[count - 1];
          tip.setLatLng([head.lat, head.lon]);
          tip.setStyle({ opacity: p < 0.98 ? 1 : 0, fillOpacity: p < 0.98 ? 0.85 : 0 });
          lastCount = count;
        }
        lastDraw = now;
      }
      distanceEl.textContent = totalKm == null ? '—' : (totalKm * eased).toFixed(2);
      if (p < 1) ctx.requestAnimationFrame(frame);
      else resolve();
    };
    ctx.requestAnimationFrame(frame);
  });

  const fullRoute = route.map(pt => [pt.lat, pt.lon]);
  routeGlow.setLatLngs(fullRoute);
  routeLine.setLatLngs(fullRoute);
  tip.setStyle({ opacity: 0, fillOpacity: 0 });
  distanceEl.textContent = totalKm == null ? '—' : totalKm.toFixed(2);



  await ctx.wait(1350);
  return {};
}
