import {readFile,access} from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const pages=[
  'juegos/index.html',
  'juegos/memoria-vintage.html',
  'juegos/quien-es-vintage.html',
  'juegos/cabezones/index.html',
  'juegos/admin-mascaras-vintage.html'
];

let failures=0;
const fail=(msg)=>{failures++;console.error(`✗ ${msg}`)};
const ok=(msg)=>console.log(`✓ ${msg}`);

async function exists(p){
  try{await access(path.join(ROOT,p));return true}catch{return false}
}

function localRefs(html){
  const refs=[];
  const re=/(?:href|src)=["']([^"']+)["']/gi;
  for(const m of html.matchAll(re)){
    const v=m[1].trim();
    if(!v||v.includes('${')||v.startsWith('#')||v.startsWith('http:')||v.startsWith('https:')||v.startsWith('data:')||v.startsWith('javascript:'))continue;
    refs.push(v.split(/[?#]/)[0]);
  }
  return refs;
}

function inlineScripts(html){
  const out=[];
  const re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  for(const m of html.matchAll(re))out.push(m[1]);
  return out;
}

for(const file of pages){
  if(!(await exists(file))){fail(`${file}: no existe`);continue}
  const html=await readFile(path.join(ROOT,file),'utf8');
  ok(`${file}: encontrado (${html.length} bytes)`);

  if(!/<meta[^>]+name=["']viewport["']/i.test(html))fail(`${file}: falta viewport móvil`);
  if(!/<title>[^<]+<\/title>/i.test(html))fail(`${file}: falta <title>`);

  const base=path.dirname(file);
  for(const ref of localRefs(html)){
    let resolved=path.normalize(path.join(base,ref));
    if(ref.endsWith('/'))resolved=path.join(resolved,'index.html');
    if(!(await exists(resolved)))fail(`${file}: referencia local inexistente → ${ref} (${resolved})`);
  }

  const scripts=inlineScripts(html);
  scripts.forEach((code,i)=>{
    try{new Function(code);ok(`${file}: script inline ${i+1} compila`)}
    catch(err){fail(`${file}: error de sintaxis en script inline ${i+1}: ${err.message}`)}
  });
}

const integration=await readFile(path.join(ROOT,'patx-v214.js'),'utf8');
try{new Function(integration);ok('patx-v214.js: integración Home compila')}catch(err){fail(`patx-v214.js: error de sintaxis: ${err.message}`)}
if(!/homeGamesBtn/.test(integration))fail('patx-v214.js: falta integración del botón Juegos');else ok('patx-v214.js: botón Juegos presente');

const hub=await readFile(path.join(ROOT,'juegos/index.html'),'utf8');
if(!/href=["']memoria-vintage\.html["']/.test(hub))fail('Hub: Memoria Vintage no está enlazado');else ok('Hub: Memoria Vintage disponible');
if(!/href=["'](?:\.\/)?quien-es-vintage\.html["']/.test(hub))fail('Hub: ¿Quién es? no está enlazado');else ok('Hub: ¿Quién es? disponible');
if(/href=["'](?:\.\/)?cabezones\/["']/.test(hub))fail('Hub: Patxanguilles Heads todavía es clicable');else ok('Hub: Patxanguilles Heads permanece bloqueado');
if((hub.match(/PRÓXIMAMENTE/g)||[]).length<1)fail('Hub: falta la etiqueta PRÓXIMAMENTE del juego bloqueado');else ok('Hub: juego bloqueado etiquetado como PRÓXIMAMENTE');

const memory=await readFile(path.join(ROOT,'juegos/memoria-vintage.html'),'utf8');
const memoryCore=await readFile(path.join(ROOT,'juegos/memoria-vintage-v17-core.js'),'utf8');
const memoryGame=await readFile(path.join(ROOT,'juegos/memoria-vintage-v17-game.js'),'utf8');
if(!/let\s+PAIRS\s*=\s*10\b/.test(memoryCore)||!/PAIRS\s*=\s*isMobile\(\)\s*\?\s*6\s*:\s*10/.test(memoryCore))fail('Memoria Vintage no conserva 6 parejas en móvil y 10 en escritorio');else ok('Memoria Vintage: 6 parejas móvil / 10 escritorio confirmadas');
if(!/inspectImage\(/.test(memoryCore)||!/naturalWidth/.test(memoryCore)||!/naturalHeight/.test(memoryCore))fail('Memoria Vintage: falta clasificación de orientación usando la copia local');else ok('Memoria Vintage: orientación uniforme basada en dimensiones del reveal local');
if(!/currentOrientation===['"]landscape['"]/.test(memoryGame)||!/renderBoard\(/.test(memoryGame))fail('Memoria Vintage: el tablero no adapta la proporción al formato');else ok('Memoria Vintage: tablero adapta horizontal/vertical');
const memoryRuntime=`${memory}\n${memoryCore}\n${memoryGame}`;
if(/odioeternoalfutbolmoderno\.es/i.test(memoryRuntime))fail('Memoria Vintage: queda una dependencia runtime de Odio Eterno');else ok('Memoria Vintage: sin peticiones runtime a Odio Eterno');
if(/supabase\.co\/storage\/.*vintage-cards/i.test(memoryRuntime))fail('Memoria Vintage: quedan imágenes runtime de Supabase Storage');else ok('Memoria Vintage: sin imágenes runtime de Supabase Storage');
if(/source_image_url/.test(memoryRuntime))fail('Memoria Vintage: todavía usa source_image_url');else ok('Memoria Vintage: no usa source_image_url');
if(!/\.\/vintage-cards\/reveal\/\$\{card\.slug\}-\$\{String\(card\.id\)\.slice\(0,8\)\}\.jpg/.test(memoryCore))fail('Memoria Vintage: no construye la ruta reveal local estable');else ok('Memoria Vintage: construye rutas reveal locales por slug + UUID corto');
const memoryManifest=JSON.parse(await readFile(path.join(ROOT,'juegos/memory-vintage-assets.json'),'utf8'));
if(!Array.isArray(memoryManifest.assets)||!memoryManifest.assets.length)fail('Memoria Vintage: manifiesto local vacío o inválido');else ok(`Memoria Vintage: manifiesto local con ${memoryManifest.assets.length} cromos validados`);
if(!/memory-vintage-assets\.json/.test(memoryCore))fail('Memoria Vintage: no cruza el catálogo maestro con el manifiesto local');else ok('Memoria Vintage: cruza vintage_cards con el manifiesto local');

const quizGame=await readFile(path.join(ROOT,'juegos/quien-es-game.mjs'),'utf8');
const quizCore=await readFile(path.join(ROOT,'juegos/quien-es-core.mjs'),'utf8');
if(!/ROUNDS\s*=\s*10\b/.test(quizGame)||!/others\.slice\(0,5\)/.test(quizCore))fail('¿Quién es? no está configurado a 10 rondas y 6 respuestas');else ok('¿Quién es?: 10 rondas y 6 respuestas confirmadas');

const quizCatalog=JSON.parse(await readFile(path.join(ROOT,'juegos/quien-es-data.json'),'utf8'));
const quizCards=Array.isArray(quizCatalog)?quizCatalog:quizCatalog.cards;
if(!Array.isArray(quizCards)||!quizCards.length){
  fail('¿Quién es?: el catálogo no contiene cartas');
}else{
  const storagePrefix='supabase.co/storage/v1/object/public/vintage-cards';
  const storageUrls=quizCards.flatMap(card=>[card.quiz_url,card.reveal_url]).filter(url=>String(url).includes(storagePrefix));
  if(storageUrls.length)fail(`¿Quién es?: quedan ${storageUrls.length} URLs de Supabase Storage para quiz/reveal`);else ok('¿Quién es?: quiz/reveal ya no dependen de Supabase Storage');
  const invalidLocalPaths=quizCards.flatMap(card=>[['quiz',card.quiz_url],['reveal',card.reveal_url]].map(([kind,url])=>({card,kind,url})))
    .filter(({kind,url})=>!new RegExp(`^\\./vintage-cards/${kind}/[^/]+\\.jpg$`,'i').test(String(url)));
  if(invalidLocalPaths.length)fail(`¿Quién es?: ${invalidLocalPaths.length} rutas quiz/reveal no son rutas JPG locales válidas`);else ok(`¿Quién es?: ${quizCards.length} cartas usan rutas locales de GitHub Pages`);
}

const heads=await readFile(path.join(ROOT,'juegos/cabezones/index.html'),'utf8');
if(!/<canvas[^>]+id=["']game["']/i.test(heads))fail('Patxanguilles Heads: falta canvas de juego');else ok('Patxanguilles Heads: archivo de desarrollo conserva canvas');

const maskEditor=await readFile(path.join(ROOT,'juegos/admin-mascaras-vintage.html'),'utf8');
if(!/admin_set_vintage_card_mask/.test(maskEditor))fail('Editor de máscaras: no llama a la RPC protegida');else ok('Editor de máscaras: RPC protegida presente');

if(failures){
  console.error(`\n${failures} comprobación(es) fallaron.`);
  process.exit(1);
}
console.log('\nTodos los smoke tests de juegos han pasado.');
