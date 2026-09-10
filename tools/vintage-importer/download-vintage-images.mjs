import { mkdir, stat, writeFile, rename, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const DEFAULT_SUPABASE_URL = 'https://cnnhstlguewrxjihhlqc.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_uWEwYEMkAe3YkeAzX7ACAg_0aEYHmM6';

const args = new Map(process.argv.slice(2).map(arg => {
  const [k, ...rest] = arg.split('=');
  return [k, rest.length ? rest.join('=') : true];
}));

const outputDir = path.resolve(String(args.get('--output') || 'vintage-download'));
const concurrency = Math.max(1, Math.min(8, Number(args.get('--concurrency') || 3)));
const limit = Math.max(0, Number(args.get('--limit') || 0));
const overwrite = args.has('--overwrite');
const supabaseUrl = String(process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, '');
const supabaseKey = String(process.env.SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_KEY);

const originalsDir = path.join(outputDir, 'originals');
const manifestPath = path.join(outputDir, 'manifest.json');
const failuresPath = path.join(outputDir, 'failed.json');

await mkdir(originalsDir, { recursive: true });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function safeName(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'cromo';
}
function extFromContentType(contentType, sourceUrl) {
  const t = String(contentType || '').split(';')[0].trim().toLowerCase();
  const byType = {
    'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png',
    'image/webp': '.webp', 'image/gif': '.gif', 'image/avif': '.avif'
  };
  if (byType[t]) return byType[t];
  try {
    const ext = path.extname(new URL(sourceUrl).pathname).toLowerCase();
    if (/^\.(jpe?g|png|webp|gif|avif)$/.test(ext)) return ext === '.jpeg' ? '.jpg' : ext;
  } catch {}
  return '.img';
}
async function fileExistsNonEmpty(file) {
  try { return (await stat(file)).size > 0; } catch { return false; }
}
async function sha256File(file) {
  const buf = await readFile(file);
  return createHash('sha256').update(buf).digest('hex');
}
async function fetchJson(url, options = {}, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const r = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      if (r.ok) return await r.json();
      const body = await r.text().catch(() => '');
      throw new Error(`${r.status} ${r.statusText}${body ? ` · ${body.slice(0, 160)}` : ''}`);
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      if (i < attempts - 1) await sleep(750 * (2 ** i));
    }
  }
  throw lastErr;
}
async function fetchCards() {
  const pageSize = 500;
  const all = [];
  for (let offset = 0; ; offset += pageSize) {
    const qs = new URLSearchParams({
      select: 'id,slug,player_name,source_image_url,raw_meta',
      enabled: 'eq.true',
      parse_status: 'eq.ready',
      source_image_url: 'not.is.null',
      order: 'slug.asc',
      limit: String(pageSize),
      offset: String(offset)
    });
    const rows = await fetchJson(`${supabaseUrl}/rest/v1/vintage_cards?${qs}`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
    });
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return limit ? all.slice(0, limit) : all;
}
async function downloadOne(card, index, total) {
  const base = `${safeName(card.slug || card.player_name)}-${String(card.id).slice(0, 8)}`;
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const r = await fetch(card.source_image_url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'PatxanguillesVintageBackup/1.0 (+personal archival backup)' }
      });
      clearTimeout(timer);
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      const contentType = r.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) throw new Error(`Respuesta no es imagen: ${contentType || 'sin content-type'}`);
      const ext = extFromContentType(contentType, card.source_image_url);
      const file = path.join(originalsDir, `${base}${ext}`);
      if (!overwrite && await fileExistsNonEmpty(file)) {
        const size = (await stat(file)).size;
        console.log(`[${index + 1}/${total}] ✓ ya existe · ${path.basename(file)} · ${(size / 1024).toFixed(1)} KB`);
        return { ...card, local_file: path.relative(outputDir, file).replaceAll('\\', '/'), bytes: size, sha256: await sha256File(file), content_type: contentType, status: 'existing' };
      }
      const buf = Buffer.from(await r.arrayBuffer());
      if (!buf.length) throw new Error('Archivo vacío');
      const tmp = `${file}.part`;
      await writeFile(tmp, buf);
      await rename(tmp, file);
      const hash = createHash('sha256').update(buf).digest('hex');
      console.log(`[${index + 1}/${total}] ↓ ${path.basename(file)} · ${(buf.length / 1024).toFixed(1)} KB`);
      return { ...card, local_file: path.relative(outputDir, file).replaceAll('\\', '/'), bytes: buf.length, sha256: hash, content_type: contentType, status: 'downloaded' };
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      if (attempt < 4) await sleep(1000 * (2 ** (attempt - 1)));
    }
  }
  console.error(`[${index + 1}/${total}] ✗ ${card.player_name || card.slug} · ${lastErr?.message || lastErr}`);
  return { ...card, status: 'failed', error: String(lastErr?.message || lastErr) };
}

console.log('Patxanguilles · copia de seguridad de cromos vintage');
console.log(`Destino: ${outputDir}`);
console.log(`Concurrencia: ${concurrency}`);
console.log('Leyendo catálogo de Supabase…');

const cards = await fetchCards();
console.log(`Cromos encontrados: ${cards.length}`);
if (!cards.length) process.exit(0);

const results = new Array(cards.length);
let cursor = 0;
async function worker() {
  while (true) {
    const i = cursor++;
    if (i >= cards.length) return;
    results[i] = await downloadOne(cards[i], i, cards.length);
    await sleep(250);
  }
}
await Promise.all(Array.from({ length: concurrency }, () => worker()));

const ok = results.filter(x => x?.status !== 'failed');
const failed = results.filter(x => x?.status === 'failed');
const bytes = ok.reduce((sum, x) => sum + Number(x.bytes || 0), 0);
const manifest = {
  generated_at: new Date().toISOString(),
  source: 'Supabase vintage_cards.source_image_url',
  count: results.length,
  successful: ok.length,
  failed: failed.length,
  total_bytes: bytes,
  total_megabytes: Number((bytes / 1024 / 1024).toFixed(2)),
  items: results
};
await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
await writeFile(failuresPath, JSON.stringify(failed, null, 2));

console.log('\nCopia terminada.');
console.log(`Correctos: ${ok.length}`);
console.log(`Fallidos: ${failed.length}`);
console.log(`Peso descargado/validado: ${(bytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`Manifest: ${manifestPath}`);
if (failed.length) console.log(`Revisa: ${failuresPath} y vuelve a ejecutar el mismo comando; el script reanuda sin repetir archivos.`);
