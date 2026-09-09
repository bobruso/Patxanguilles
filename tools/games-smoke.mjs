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

const memory=await readFile(path.join(ROOT,'juegos/memoria-vintage.html'),'utf8');
if(!/const\s+PAIRS\s*=\s*12\b/.test(memory))fail('Memoria Vintage no está configurado a 12 parejas');else ok('Memoria Vintage: 12 parejas confirmadas');

const quiz=await readFile(path.join(ROOT,'juegos/quien-es-vintage.html'),'utf8');
if(!/ROUNDS\s*=\s*10\s*,\s*CHOICES\s*=\s*6/.test(quiz))fail('¿Quién es? no está configurado a 10 rondas y 6 respuestas');else ok('¿Quién es?: 10 rondas y 6 respuestas confirmadas');

const heads=await readFile(path.join(ROOT,'juegos/cabezones/index.html'),'utf8');
if(!/<canvas[^>]+id=["']game["']/i.test(heads))fail('Patxanguilles Heads: falta canvas de juego');else ok('Patxanguilles Heads: canvas encontrado');
if(!/setMode\(['"]cpu['"]\)/.test(heads)||!/setMode\(['"]local['"]\)/.test(heads))fail('Patxanguilles Heads: faltan modos CPU/local');else ok('Patxanguilles Heads: modos CPU y 2P local presentes');
if(!/data-touch-player=["']1["']/.test(heads)||!/data-touch-player=["']2["']/.test(heads))fail('Patxanguilles Heads: faltan controles táctiles independientes para los dos jugadores');else ok('Patxanguilles Heads: controles táctiles 2P presentes');

const maskEditor=await readFile(path.join(ROOT,'juegos/admin-mascaras-vintage.html'),'utf8');
if(!/admin_set_vintage_card_mask/.test(maskEditor))fail('Editor de máscaras: no llama a la RPC protegida');else ok('Editor de máscaras: RPC protegida presente');

if(failures){
  console.error(`\n${failures} comprobación(es) fallaron.`);
  process.exit(1);
}
console.log('\nTodos los smoke tests de juegos han pasado.');
