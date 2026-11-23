// Pruebas dirigidas del acceso rápido «Pegar convocatoria WhatsApp».
// Usan el código real de index.html (detección compartida e importadores
// antiguos) y el módulo nuevo patx-quick-callup.js.
//
// Casos cubiertos: A, B, C, D, E, H, I y K del encargo, más normalización de
// tildes/mayúsculas, erratas cercanas y rechazo de cabeceras/fechas.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {existsSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, '..');
const html = readFileSync(path.join(repo, 'index.html'), 'utf8');
const moduleCode = readFileSync(path.join(repo, 'patx-quick-callup.js'), 'utf8');

function extractFunction(name) {
  const start = html.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} no existe en index.html`);
  // Cierre de la lista de parámetros (algunas funciones usan opts={}).
  let paren = 0;
  let cursor = html.indexOf('(', start);
  for (; cursor < html.length; cursor++) {
    if (html[cursor] === '(') paren++;
    else if (html[cursor] === ')') {
      paren--;
      if (!paren) break;
    }
  }
  assert.ok(cursor < html.length, `${name}: lista de parámetros incompleta`);
  const bodyStart = html.indexOf('{', cursor);
  let depth = 0;
  for (let i = bodyStart; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') {
      depth--;
      if (!depth) return html.slice(start, i + 1);
    }
  }
  throw new Error(`No se pudo extraer ${name}`);
}

function extractRoster(name) {
  const start = html.indexOf(`const ${name}=[`);
  assert.ok(start >= 0, `${name} no existe en index.html`);
  const end = html.indexOf(']', start);
  return JSON.parse(html.slice(html.indexOf('[', start), end + 1));
}

const F7 = extractRoster('F7');
const FS = extractRoster('FS');

const sharedFns = [
  'normalizeCoachCallupName',
  'cleanCoachCallupLine',
  'coachLevenshtein',
  'closestCoachRosterName',
  'scanCallupParticipantLines',
  'parseCallupEntries'
];

// ---------------------------------------------------------------------------
// 1. Carga del módulo nuevo con el contexto mínimo (sin DOM real).
// ---------------------------------------------------------------------------
const listeners = {};
const modWindow = {};
const modContext = {
  window: modWindow,
  document: {
    readyState: 'loading',
    addEventListener(name, fn) { listeners[name] = fn; },
    querySelector() { return null; },
    getElementById() { return null; }
  },
  console,
  F7,
  FS,
  navigator: {}
};
vm.createContext(modContext);
vm.runInContext(sharedFns.map(extractFunction).join('\n'), modContext);
vm.runInContext(moduleCode, modContext);
const api = modWindow.PatxQuickCallup;
assert.ok(api, 'El módulo debe exponer window.PatxQuickCallup');

const numbered = names => names.map((name, i) => `${i + 1}. ${name}`).join('\n');
const plain = value => JSON.parse(JSON.stringify(value));

const F7_14 = ['Jorge', 'Xavi', 'Pau', 'Rico', 'Guillem', 'Ernest', 'Germán', 'Héctor', 'Benja', 'Àlex', 'Nelo', 'Jota', 'Datxu', 'César'];
const FS_10 = ['Pau', 'Álex', 'Ángel', 'Benja', 'Datxu', 'Dídac', 'Guillem', 'Héctor', 'Luís', 'Rafeta'];

// Caso A — F7 normal: 14 conocidos → 7 y 7.
{
  const analysis = api.analyze(numbered(F7_14));
  assert.equal(analysis.count, 14, 'Caso A: 14 titulares');
  assert.equal(analysis.mode, 'f7', 'Caso A: modalidad F7');
  assert.equal(analysis.valid, true, 'Caso A: convocatoria válida');
  const plan = api.buildPlan(analysis);
  assert.equal(plan.names.length, 14, 'Caso A: 14 jugadores al algoritmo');
  assert.equal(plan.guests.length, 0, 'Caso A: sin invitados');
  assert.equal(plan.reserves.length, 0, 'Caso A: sin reservas de contexto');
}

// Caso B — F7 con invitado: 13 conocidos + desconocido → 7 y 7, nivel medio.
{
  const analysis = api.analyze(numbered([...F7_14.slice(0, 13), 'Pepito']));
  assert.equal(analysis.count, 14, 'Caso B: el invitado cuenta como 14');
  assert.equal(analysis.mode, 'f7', 'Caso B: modalidad F7');
  assert.deepEqual(plain(analysis.guests.map(g => g.name)), ['Pepito'], 'Caso B: invitado detectado');
  const plan = api.buildPlan(analysis);
  assert.deepEqual(plain(plan.reserves), [{name: 'Pepito', level: 'medio'}], 'Caso B: invitado con nivel medio para el contexto');
  assert.ok(plan.names.includes('Pepito'), 'Caso B: el invitado participa');
}

// Caso C — FS normal: 10 conocidos → 5 y 5.
{
  const analysis = api.analyze(numbered(FS_10));
  assert.equal(analysis.count, 10, 'Caso C: 10 titulares');
  assert.equal(analysis.mode, 'fs', 'Caso C: modalidad FS');
  assert.equal(analysis.teamSize, 5, 'Caso C: 5 contra 5');
  assert.equal(api.buildPlan(analysis).guests.length, 0, 'Caso C: sin invitados');
}

// Caso D — FS con invitado: 9 conocidos + desconocido → 5 y 5.
{
  const analysis = api.analyze(numbered([...FS_10.slice(0, 9), 'Pepito']));
  assert.equal(analysis.count, 10, 'Caso D: el invitado cuenta como 10');
  assert.equal(analysis.mode, 'fs', 'Caso D: modalidad FS');
  assert.deepEqual(plain(api.buildPlan(analysis).reserves), [{name: 'Pepito', level: 'medio'}], 'Caso D: invitado nivel medio');
}

// Caso E — Reservas: 14 titulares + 3 reservas → solo los 14 titulares.
{
  const text = numbered(F7_14) + '\n\nRESERVAS\n15. Santi\n16. Rafa\n17. Manu';
  const analysis = api.analyze(text);
  assert.equal(analysis.count, 14, 'Caso E: ignora las reservas');
  assert.ok(!analysis.entries.some(entry => /Santi|Rafa|Manu/.test(entry.name)), 'Caso E: Santi, Rafa y Manu quedan fuera');
  assert.equal(analysis.mode, 'f7', 'Caso E: modalidad F7 con los titulares');
}

// Caso E2 — variantes de encabezado de reservas (emoji/negrita).
{
  const text = numbered(F7_14) + '\n\n🔁 Reservas:\n15. Santi\n16. Rafa';
  assert.equal(api.analyze(text).count, 14, 'Reservas con emoji no cuentan');
}

// Caso H — convocatoria incompleta: 12 titulares → advertencia, sin plan.
{
  const analysis = api.analyze(numbered(F7_14.slice(0, 12)));
  assert.equal(analysis.count, 12, 'Caso H: detecta 12');
  assert.equal(analysis.valid, false, 'Caso H: no es válida');
  assert.equal(analysis.mode, null, 'Caso H: no inventa modalidad');
  assert.ok(analysis.warnings.length > 0, 'Caso H: hay advertencia');
  assert.equal(api.buildPlan(analysis), null, 'Caso H: no se puede generar nada');
}

// Caso I — duplicados: la misma persona no puede aparecer dos veces.
{
  const text = numbered(F7_14) + '\n15. Jorge\n16. JORGE';
  const analysis = api.analyze(text);
  assert.equal(analysis.count, 14, 'Caso I: los duplicados no suman');
  assert.equal(analysis.entries.filter(entry => entry.name === 'Jorge').length, 1, 'Caso I: Jorge aparece una sola vez');
}

// Nombre desconocido con anotación entre paréntesis: participa como invitado
// medio y NO se ignora como línea rara («Javi (Xavi)»).
{
  const analysis = api.analyze(numbered([...F7_14.slice(0, 13), 'Javi (Xavi)']));
  assert.equal(analysis.count, 14, 'Paréntesis: el jugador desconocido cuenta');
  assert.equal(analysis.valid, true, 'Paréntesis: convocatoria válida');
  assert.equal(analysis.skipped.length, 0, 'Paréntesis: la línea no se ignora');
  assert.deepEqual(plain(analysis.guests.map(g => g.name)), ['Javi (Xavi)'], 'Paréntesis: se conserva el nombre escrito');
  assert.deepEqual(plain(api.buildPlan(analysis).reserves), [{name: 'Javi (Xavi)', level: 'medio'}], 'Paréntesis: nivel medio para el algoritmo');
}

// Anotaciones con paréntesis o emoji tampoco descartan a un desconocido.
{
  const analysis = api.analyze(numbered([...F7_14.slice(0, 12), 'Javi (Xavi)', 'Pepito ✅']));
  assert.equal(analysis.count, 14, 'Anotaciones: cuentan los dos desconocidos');
  assert.equal(analysis.skipped.length, 0, 'Anotaciones: ninguna línea se ignora');
  assert.deepEqual(plain(analysis.guests.map(g => g.name)), ['Javi (Xavi)', 'Pepito ✅'], 'Anotaciones: se conserva el nombre escrito');
}

// Un enlace o una cabecera siguen sin contarse como jugador (aunque tengan letras).
{
  const analysis = api.analyze([
    ...F7_14.slice(0, 13).map((name, i) => `${i + 1}. ${name}`),
    '14. www.patxanguilles.com'
  ].join('\n'));
  assert.equal(analysis.count, 13, 'Enlaces: no se cuentan como jugador');
  assert.equal(analysis.skipped.length, 1, 'Enlaces: quedan como línea ignorada');
}

// Normalización de tildes y mayúsculas que ya hace el parser.
{
  const rest = F7_14.filter(name => !['Jorge', 'Xavi', 'Héctor', 'César'].includes(name));
  const analysis = api.analyze(numbered(['JORGE', 'xavi', 'hector', 'CESAR', ...rest]));
  assert.equal(analysis.count, 14, 'Normalización: siguen siendo 14');
  assert.ok(analysis.known.includes('Héctor') && analysis.known.includes('César') && analysis.known.includes('Jorge'), 'Normalización: devuelve el nombre canónico de la plantilla');
}

// Nombre escrito distinto pero parecido → se conserva y se trata como invitado.
{
  const text = numbered([...F7_14.slice(0, 13), 'Rafetaa']);
  const analysis = api.analyze(text);
  const entry = analysis.entries.find(item => item.name === 'Rafetaa');
  assert.ok(entry, 'Errónimo: se conserva el nombre escrito');
  assert.equal(entry.type, 'uncertain', 'Errónimo: se marca como dudoso');
  assert.equal(entry.suggestion, 'Rafeta', 'Errónimo: sugiere el nombre de la plantilla');
  assert.equal(api.buildPlan(analysis).reserves[0].level, 'medio', 'Errónimo: nivel medio');
}

// Cabeceras, fechas y texto explicativo no son jugadores.
{
  const text = [
    'F7 Santa Ana · sábado 20:30',
    'Convocatoria oficial',
    ...F7_14.map((name, i) => `${i + 1}. ${name}`),
    '15. Fecha: sábado 20:30',
    '16. Campo: Santa Ana'
  ].join('\n');
  const analysis = api.analyze(text);
  assert.equal(analysis.count, 14, 'Cabeceras/fechas ignoradas');
  assert.ok(analysis.skipped.length >= 2, 'Cabeceras/fechas quedan registradas como ignoradas');
}

// Convocatoria sin numerar: reconoce conocidos y añade el desconocido.
{
  const text = ['Convocatoria oficial', ...F7_14.slice(0, 13), 'Pepito'].join('\n');
  const analysis = api.analyze(text);
  assert.equal(analysis.count, 14, 'Sin numerar: 13 conocidos + Pepito');
  assert.deepEqual(plain(analysis.guests.map(g => g.name)), ['Pepito'], 'Sin numerar: Pepito participa');
  assert.ok(!analysis.entries.some(entry => entry.name === 'Convocatoria oficial'), 'Sin numerar: la cabecera no cuenta');
}

// ---------------------------------------------------------------------------
// 2. Compatibilidad de los importadores antiguos (Caso K).
// ---------------------------------------------------------------------------
function makeDoc() {
  const elements = {};
  const get = id => (elements[id] ||= {
    id, value: '', innerHTML: '', textContent: '', disabled: false,
    style: {}, dataset: {},
    classList: {add() {}, remove() {}, toggle() {}}
  });
  return {elements, get};
}

function runOld(parserName, text) {
  const doc = makeDoc();
  const ctx = {
    document: {getElementById: doc.get, querySelectorAll() { return []; }},
    game: 'f7',
    F7,
    FS,
    escapeHtml: value => String(value),
    selected: [],
    coachParsedCallup: [],
    coachCallupConfirmed: false,
    renderPlayerList() {},
    updateCount() {}
  };
  const bundle = new Function('context', `with(context){
    ${[...sharedFns, parserName, 'coachPlayersForMode'].map(extractFunction).join('\n')}
    return {run:${parserName}};
  }`);
  const run = bundle(ctx);
  if (parserName === 'parseAutomaticCallup') doc.get('automaticCallupText').value = text;
  else doc.get('coachCallupText').value = text;
  run.run();
  return {ctx, doc};
}

// Algoritmo tradicional: sigue seleccionando solo jugadores conocidos.
{
  const {ctx} = runOld('parseAutomaticCallup', numbered(F7_14));
  assert.equal(ctx.selected.length, 14, 'K: el importador tradicional sigue encontrando 14');
}
{
  const {ctx, doc} = runOld('parseAutomaticCallup', numbered([...F7_14.slice(0, 13), 'Pepito']));
  assert.equal(ctx.selected.length, 13, 'K: el importador tradicional no selecciona desconocidos');
  assert.match(doc.get('automaticCallupStatus').textContent, /Pepito/, 'K: avisa del desconocido como antes');
}
{
  const {ctx} = runOld('parseAutomaticCallup', numbered(F7_14) + '\n\nRESERVAS\n15. Santi');
  assert.equal(ctx.selected.length, 14, 'K: el importador tradicional sigue ignorando reservas');
}

// Modo Entrenador: su detección sigue clasificando igual (conocidos, invitados).
{
  const {ctx} = runOld('parseCoachCallup', numbered([...F7_14.slice(0, 13), 'Pepito']));
  assert.equal(ctx.coachParsedCallup.length, 14, 'K: Modo Entrenador detecta los 14');
  assert.equal(ctx.coachParsedCallup.filter(item => item.type === 'guest').length, 1, 'K: Modo Entrenador mantiene el invitado');
  assert.equal(ctx.coachParsedCallup.filter(item => item.type === 'known').length, 13, 'K: Modo Entrenador mantiene 13 conocidos');
}

// ---------------------------------------------------------------------------
// 3. Cableado estático de la interfaz.
// ---------------------------------------------------------------------------
{
  const homeStart = html.indexOf('<section id="home"');
  const homeEnd = html.indexOf('</section>', homeStart);
  const home = html.slice(homeStart, homeEnd);
  assert.ok(home.includes('PEGAR CONVOCATORIA WHATSAPP'), 'Home: nueva tarjeta presente');
  assert.ok(!home.includes('album.html'), 'Home: la tarjeta del álbum ya no está en Home');
  assert.ok(existsSync(path.join(repo, 'album.html')), 'El álbum sigue existiendo como página');
  assert.ok(html.includes('id="whatsappQuick"'), 'Pantalla de pegado presente');
  assert.ok(html.includes('id="whatsappMethod"'), 'Pantalla de elección presente');
  assert.ok(html.includes("whatsappQuick:'pegar-convocatoria'"), 'Ruta de historial de la pantalla de pegado');
  assert.ok(html.includes("whatsappMethod:'metodo-rapido'"), 'Ruta de historial de la pantalla de métodos');
  assert.ok(html.includes('patx-quick-callup.css'), 'CSS nuevo cargado');
  assert.ok(html.includes('patx-quick-callup.js'), 'Módulo nuevo cargado');
  assert.ok(!html.includes('whatsappMethodDetails'), 'La pantalla de método ya no muestra tags ni invitados');
  assert.ok(!moduleCode.includes('nivel medio'), 'El nivel interno del invitado no se renderiza en ninguna pantalla');
  assert.ok(!moduleCode.includes('whatsapp-guest-chip'), 'No quedan chips de invitado con nivel');
  assert.ok(html.includes('./patx-v214.js?v=234'), 'patx-v214.js sigue cargado');
  const updateLoader = readFileSync(path.join(repo, 'patx-update.js'), 'utf8');
  assert.ok(updateLoader.includes('patx-v236-result-team-emojis.js?v=236'), 'La capa v236 de emojis sigue cargada');
}

console.log('quick-callup: passed');
