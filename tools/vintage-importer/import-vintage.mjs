import * as cheerio from 'cheerio';

const BASE_URL = 'https://odioeternoalfutbolmoderno.es';
const CATEGORY_URL = `${BASE_URL}/category/album-vintage`;
const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, rawValue] = arg.split('=');
  return [key, rawValue ?? true];
}));

const fromPage = Number(args.get('--from') ?? 1);
const toPage = Number(args.get('--to') ?? 71);
const dryRun = args.has('--dry-run');
const limit = args.has('--limit') ? Number(args.get('--limit')) : null;
const delayMs = Number(args.get('--delay-ms') ?? 180);

if (!Number.isInteger(fromPage) || !Number.isInteger(toPage) || fromPage < 1 || toPage < fromPage) {
  throw new Error('Rango inválido. Usa por ejemplo --from=1 --to=3');
}

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!dryRun && (!SUPABASE_URL || !SUPABASE_KEY)) {
  throw new Error('Faltan SUPABASE_URL y SUPABASE_SECRET_KEY (o SUPABASE_SERVICE_ROLE_KEY). Usa --dry-run para probar sin escribir.');
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clean = (value = '') => String(value).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

function absolutize(url) {
  if (!url) return null;
  try { return new URL(url, BASE_URL).href; } catch { return null; }
}

async function fetchText(url, attempt = 1) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'PatxanguillesVintageImporter/1.0 (+personal non-commercial football project)',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.6'
    }
  });
  if ((response.status === 429 || response.status >= 500) && attempt < 4) {
    await sleep(500 * attempt * attempt);
    return fetchText(url, attempt + 1);
  }
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} al leer ${url}`);
  return response.text();
}

function archiveUrl(page) {
  return page === 1 ? `${CATEGORY_URL}/` : `${CATEGORY_URL}/page/${page}/`;
}

function extractArticleUrls(html) {
  const $ = cheerio.load(html);
  const urls = new Set();
  const scopes = ['main article', '.site-main article', 'article', '.elementor-post'];
  for (const scope of scopes) {
    $(scope).each((_, el) => {
      const anchor = $(el).find('h1 a, h2 a, h3 a, .entry-title a').first();
      const href = absolutize(anchor.attr('href'));
      if (!href) return;
      if (!href.startsWith(`${BASE_URL}/`)) return;
      if (href.includes('/category/') || href.includes('/tag/') || href.includes('/author/')) return;
      urls.add(href.replace(/\/$/, ''));
    });
    if (urls.size) break;
  }
  return [...urls];
}

function fieldFromItems($, labels) {
  const wanted = labels.map((label) => label.toLocaleLowerCase('es-ES'));
  let value = null;
  $('li, p').each((_, el) => {
    if (value) return;
    const text = clean($(el).text());
    const lower = text.toLocaleLowerCase('es-ES');
    for (const label of wanted) {
      if (lower.startsWith(`${label}:`) || lower.startsWith(`${label} :`)) {
        value = clean(text.slice(text.indexOf(':') + 1));
        return;
      }
    }
  });
  return value;
}

function parseDate($) {
  const iso = $('time[datetime]').first().attr('datetime');
  if (iso) {
    const date = new Date(iso);
    if (!Number.isNaN(date.valueOf())) return date.toISOString().slice(0, 10);
  }
  const body = clean($('body').text());
  const match = body.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

function parseCardPage(html, sourceUrl) {
  const $ = cheerio.load(html);
  const title = clean($('h1').first().text()) || clean($('title').text().split('-')[0]);
  const playerName = fieldFromItems($, ['Nombre']) || title;
  const nationality = fieldFromItems($, ['Nacionalidad']);
  const position = fieldFromItems($, ['Posición', 'Posicion']);
  const activeYearsRaw = fieldFromItems($, ['Años en activo', 'Anos en activo']);
  const honors = fieldFromItems($, ['Palmarés como jugador', 'Palmarés', 'Palmares como jugador', 'Palmares']);
  const distinctions = fieldFromItems($, ['Distinciones individuales', 'Distinciones']);

  let image = $('img').filter((_, el) => /cromo de/i.test(clean($(el).attr('alt')))).first();
  if (!image.length) image = $('main img, article img, .entry-content img').first();
  const imageUrl = absolutize(image.attr('src') || image.attr('data-src') || image.attr('data-lazy-src'));
  const imageAlt = clean(image.attr('alt')) || null;

  const pathname = new URL(sourceUrl).pathname.replace(/^\/+|\/+$/g, '');
  const slug = pathname.split('/').filter(Boolean).pop();
  const years = activeYearsRaw ? Number.parseInt(activeYearsRaw, 10) : null;
  const published = parseDate($);

  const record = {
    slug,
    title,
    player_name: playerName,
    nationality: nationality || null,
    position: position || null,
    active_years: Number.isFinite(years) ? years : null,
    honors: honors || null,
    individual_distinctions: distinctions || null,
    source_url: sourceUrl,
    source_image_url: imageUrl,
    source_published_at: published,
    parse_status: imageUrl && playerName ? 'ready' : 'needs_review',
    enabled: true,
    raw_meta: {
      image_alt: imageAlt,
      imported_from: 'odioeternoalfutbolmoderno.es/category/album-vintage'
    },
    updated_at: new Date().toISOString()
  };

  return record;
}

async function upsertBatch(records) {
  if (dryRun || !records.length) return;
  const headers = {
    apikey: SUPABASE_KEY,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=minimal'
  };
  if (SUPABASE_KEY.startsWith('eyJ')) headers.Authorization = `Bearer ${SUPABASE_KEY}`;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/vintage_cards?on_conflict=slug`, {
    method: 'POST', headers, body: JSON.stringify(records)
  });
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${await response.text()}`);
}

const articleUrls = [];
for (let page = fromPage; page <= toPage; page += 1) {
  const url = archiveUrl(page);
  console.log(`Leyendo índice ${page}: ${url}`);
  const html = await fetchText(url);
  const found = extractArticleUrls(html);
  console.log(`  ${found.length} entradas encontradas`);
  articleUrls.push(...found);
  if (limit && new Set(articleUrls).size >= limit) break;
  await sleep(delayMs);
}

const uniqueUrls = [...new Set(articleUrls)].slice(0, limit || undefined);
if (!uniqueUrls.length) throw new Error('No se encontraron entradas del Álbum Vintage. Revisa los selectores del importador.');

const parsed = [];
for (let i = 0; i < uniqueUrls.length; i += 1) {
  const url = uniqueUrls[i];
  try {
    const html = await fetchText(url);
    const card = parseCardPage(html, url);
    parsed.push(card);
    console.log(`[${i + 1}/${uniqueUrls.length}] ${card.player_name} · ${card.position || 'sin posición'} · ${card.source_image_url ? 'imagen OK' : 'SIN IMAGEN'}`);
  } catch (error) {
    console.error(`[${i + 1}/${uniqueUrls.length}] ERROR ${url}: ${error.message}`);
  }
  await sleep(delayMs);
}

if (dryRun) {
  console.log('\nDRY RUN: no se ha escrito nada en Supabase.');
  console.log(JSON.stringify(parsed.slice(0, 5), null, 2));
} else {
  for (let i = 0; i < parsed.length; i += 50) {
    const batch = parsed.slice(i, i + 50);
    await upsertBatch(batch);
    console.log(`Supabase: ${Math.min(i + 50, parsed.length)}/${parsed.length} cromos guardados`);
  }
}

const ready = parsed.filter((item) => item.parse_status === 'ready').length;
const review = parsed.length - ready;
console.log(`\nTerminado: ${parsed.length} cromos procesados · ${ready} listos · ${review} para revisar.`);
