#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requested = Number.parseInt(process.argv[2] || '', 10);

if (!Number.isInteger(requested) || requested < 1) {
  console.error('Uso: node tools/release-version.mjs <version>');
  console.error('Ejemplo: node tools/release-version.mjs 226');
  process.exit(1);
}

const manifestPath = path.join(root, 'version.json');
const indexPath = path.join(root, 'index.html');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

if (!Array.isArray(manifest.summary) || manifest.summary.length === 0 ||
    manifest.summary.some((line) => typeof line !== 'string' || !line.trim())) {
  console.error('No se actualizó nada: version.json.summary debe contener el resumen real de la nueva versión.');
  process.exit(1);
}

const previous = Number(manifest.version);
manifest.version = requested;
manifest.label = `v${requested}`;
let html = await readFile(indexPath, 'utf8');
const assetPattern = /(?:patx-v212\.css|patx-v213\.css|patx-v212\.js|patx-v213\.js|patx-v214\.js|patx-update\.js)\?v=\d+/g;
const assetReferences = html.match(assetPattern) || [];
if (assetReferences.length !== 6) {
  console.error(`No se actualizó nada: se esperaban 6 referencias versionadas y se encontraron ${assetReferences.length}.`);
  process.exit(1);
}

html = html.replace(/((?:patx-v212\.css|patx-v213\.css|patx-v212\.js|patx-v213\.js|patx-v214\.js|patx-update\.js)\?v=)\d+/g, `$1${requested}`);
html = html.replace(/(<span class="history-version">VERSIÓN )v\d+(<\/span>)/, `$1v${requested}$2`);
html = html.replace(/(<a href="#" onclick="event\.preventDefault\(\);show\('changeHistory'\)">)v\d+( - Historial cambios<\/a>)/, `$1v${requested}$2`);
html = html.replace(/(data-current-history=")\d+("[\s\S]*?<div class="history-section-number">)\d+(<\/div>)/, `$1${requested}$2${requested}$3`);
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
await writeFile(indexPath, html, 'utf8');

console.log(`Versión técnica actualizada: v${previous} → v${requested}.`);
console.warn('IMPORTANTE: el script ha conservado summary. Revísalo y escribe el resumen real de esta versión antes de publicar; no se genera texto de changelog automáticamente.');
