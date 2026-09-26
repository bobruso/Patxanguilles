// Pruebas dirigidas sobre el código real de index.html: importación de la
// convocatoria de resultado con equipos («Negros» / «Rojos»).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const here=path.dirname(fileURLToPath(import.meta.url));
const html=readFileSync(path.join(here,'..','index.html'),'utf8');

function extractFunction(name){
  const start=html.indexOf(`function ${name}(`);
  assert.ok(start>=0,`${name} no existe en index.html`);
  let depth=0;
  for(let i=html.indexOf('{',start);i<html.length;i++){
    if(html[i]==='{')depth++;
    else if(html[i]==='}'){depth--;if(!depth)return html.slice(start,i+1)}
  }
  throw new Error(`No se pudo extraer ${name}`);
}

function extractRoster(name){
  const start=html.indexOf(`const ${name}=[`);
  assert.ok(start>=0,`${name} no existe en index.html`);
  const end=html.indexOf(']',start);
  return JSON.parse(html.slice(html.indexOf('[',start),end+1));
}

// Comprobación de sintaxis del bloque <script> que contiene la función.
{
  const anchor=html.indexOf('function parseResultCallup(');
  const block=html.slice(html.lastIndexOf('<script>',anchor)+'<script>'.length,html.indexOf('</script>',anchor));
  new Function(block);
}

const sandbox=new Function('context',`with(context){
  ${['normalizeCoachCallupName','cleanCoachCallupLine','coachLevenshtein','closestCoachRosterName','resultCallupTeamKey','parseResultCallupText','renderChecks','parseResultCallup','clearResultCallup'].map(extractFunction).join('\n')}
  return {parseResultCallup,clearResultCallup,resultCallupTeamKey};
}`);

const F7=extractRoster('F7');
const FS=extractRoster('FS');

function makeDoc(){
  const elements={};
  const get=id=>elements[id]||(elements[id]={id,value:'',innerHTML:'',textContent:'',style:{},dataset:{},classList:{add(){},remove(){},toggle(){}}});
  return {elements,getElementById:get};
}

function checked(htmlText){
  return [...String(htmlText||'').matchAll(/<input type="checkbox" value="([^"]*)"([^>]*)>/g)]
    .filter(m=>/checked/.test(m[2]))
    .map(m=>m[1]);
}

// Las casillas se pintan en el orden de la plantilla, no en el orden pegado.
const setOf=values=>[...new Set(values)].sort();

function run(text,{mode='f7'}={}){
  const document_=makeDoc();
  const context={document:document_,currentSeasonMode:mode,F7,FS,escapeHtml:v=>String(v),pendingResultCallupNames:[]};
  const api=sandbox(context);
  document_.getElementById('resultCallupText').value=text;
  api.parseResultCallup();
  return {
    api,
    doc:document_,
    red:checked(document_.elements.redChecks.innerHTML),
    black:checked(document_.elements.blackChecks.innerHTML),
    status:document_.elements.resultCallupStatus.textContent,
  };
}

const sample=[
  'Negros 🖤',
  '. Julio',
  '. César',
  '. Rico',
  '. Santi',
  '. Manel',
  '. Rafeta',
  '. Rosana',
  '',
  'Rojos ❤️',
  '. Xavi',
  '. Nelo',
  '. Datxu',
  '. Jota',
  '. Guillem',
  '. Rafa',
  '. Nacho',
].join('\n');

// 1) Muestra del usuario: cada bloque va a su equipo.
{
  const r=run(sample);
  assert.deepEqual(setOf(r.black),setOf(['Julio','César','Rico','Santi','Manel','Rafeta','Rosana']),'negros de la muestra');
  assert.deepEqual(setOf(r.red),setOf(['Xavi','Nelo','Datxu','Jota','Guillem','Rafa','Nacho']),'rojos de la muestra');
  assert.match(r.status,/14 de 14/,'total detectado');
  assert.match(r.status,/7 en Rojos y 7 en Negros/,'reparto por equipo');
}

// 2) Encabezados en orden inverso y con variantes de formato.
{
  const reversed=[
    'ROJOS ❤️',
    '1. Xavi',
    '2) Nelo',
    'Negros',
    '- Julio',
    '* César',
  ].join('\n');
  const r=run(reversed);
  assert.deepEqual(setOf(r.red),setOf(['Xavi','Nelo']),'rojos con encabezado primero');
  assert.deepEqual(setOf(r.black),setOf(['Julio','César']),'negros con viñetas');

  const variants=run('Equipo Negro:\n. Julio\nEQUIPO ROJO.\n. Xavi');
  assert.deepEqual(setOf(variants.black),['Julio'],'«Equipo Negro:» es encabezado');
  assert.deepEqual(setOf(variants.red),['Xavi'],'«EQUIPO ROJO.» es encabezado');
}

// 3) Sin encabezados se mantiene el comportamiento antiguo (misma lista en ambos).
{
  const legacyNames=['Julio','César','Rico','Santi','Manel','Rafeta','Rosana','Xavi','Nelo','Datxu','Jota','Guillem','Rafa','Nacho'];
  const legacy=legacyNames.map((name,i)=>`${i+1}. ${name}`).join('\n');
  const r=run(legacy);
  assert.deepEqual(setOf(r.red),setOf(r.black),'legado: misma detección en los dos equipos');
  assert.equal(r.red.length,14,'legado: 14 jugadores');
  assert.match(r.status,/14 de 14/,'legado: estado informativo');

  // Regresión: con más jugadores de los necesarios, las casillas se recortan
  // pero el aviso debe seguir contando todo lo detectado.
  const overflow=run([...legacyNames,'Álex','Benja'].map((name,i)=>`${i+1}. ${name}`).join('\n'));
  assert.equal(overflow.red.length,14,'legado: casillas de rojos limitadas al número necesario');
  assert.equal(overflow.black.length,14,'legado: casillas de negros limitadas al número necesario');
  assert.deepEqual(setOf(overflow.red),setOf(overflow.black),'legado: mismo recorte en ambos equipos');
  assert.match(overflow.status,/16 de 14/,'legado: el aviso cuenta los 16 detectados');
  assert.match(overflow.status,/2 jugadores de más/,'legado: aviso de jugadores de más');
  assert.doesNotMatch(overflow.status,/14 de 14/,'legado: no informa como si cuadrara');

  const dotted=run('. Julio\n. Xavi');
  assert.deepEqual(setOf(dotted.red),setOf(['Julio','Xavi']),'legado con puntos y sin numerar');
  assert.deepEqual(setOf(dotted.black),setOf(['Julio','Xavi']),'legado con puntos y sin numerar (negros)');
}

// 4) Desconocidos, parecidos y reservas.
{
  const text=[
    'Negros 🖤',
    '. Julio',
    '. Ricoo',
    '. Fulanito',
    'Rojos ❤️',
    '. Xavi',
    'Reservas',
    '. Santi',
    '. Nelo',
  ].join('\n');
  const r=run(text);
  assert.deepEqual(setOf(r.black),['Julio'],'solo nombres exactos del roster');
  assert.deepEqual(setOf(r.red),['Xavi'],'solo nombres exactos del roster (rojos)');
  assert.ok(!r.red.includes('Santi')&&!r.black.includes('Santi'),'las reservas no se seleccionan');
  assert.ok(!r.red.includes('Nelo')&&!r.black.includes('Nelo'),'nada después de Reservas entra');
  assert.match(r.status,/Ricoo → ¿Rico\?/,'parecido avisado sin seleccionar');
  assert.match(r.status,/Fulanito/,'desconocido avisado');
  assert.match(r.status,/No he seleccionado automáticamente/,'aviso de no seleccionados');
}

// 5) Duplicados y conflicto entre equipos.
{
  const text=[
    'Negros 🖤',
    '. Julio',
    '. Julio',
    '. Xavi',
    'Rojos ❤️',
    '. Xavi',
    '. Nelo',
  ].join('\n');
  const r=run(text);
  assert.deepEqual(setOf(r.black),setOf(['Julio','Xavi']),'el jugador repetido no se duplica');
  assert.deepEqual(setOf(r.red),['Nelo'],'el conflicto se queda en el primer equipo');
  assert.ok(!r.red.includes('Xavi'),'nunca en los dos equipos a la vez');
  assert.match(r.status,/repetidos/,'aviso de repetidos');
  assert.match(r.status,/dos equipos/,'aviso de conflicto');
  assert.match(r.status,/Xavi/,'el conflicto nombra al jugador');
}

// 6) Nombres fuera de cualquier bloque no se asignan solos.
{
  const r=run('Julio\nNegros 🖤\n. César');
  assert.deepEqual(setOf(r.black),['César'],'solo lo que está dentro del bloque');
  assert.ok(!r.red.includes('Julio')&&!r.black.includes('Julio'),'lo previo no se autoasigna');
  assert.match(r.status,/sin asignar: Julio/,'aviso de nombres sin equipo');

  // Regresión: si el nombre previo sí aparece luego en un equipo, no se avisa.
  const reassigned=run('Julio\nNegros 🖤\n. Julio');
  assert.deepEqual(setOf(reassigned.black),['Julio'],'el nombre previo que acaba en un equipo se marca');
  assert.doesNotMatch(reassigned.status,/sin asignar/,'sin falso aviso de nombre sin asignar');
}

// 7) Reimportar y limpiar no dejan selecciones antiguas.
{
  const document_=makeDoc();
  const context={document:document_,currentSeasonMode:'f7',F7,FS,escapeHtml:v=>String(v),pendingResultCallupNames:[]};
  const api=sandbox(context);
  const textarea=document_.getElementById('resultCallupText');

  textarea.value=sample;
  api.parseResultCallup();
  assert.equal(checked(document_.elements.redChecks.innerHTML).length,7,'primera importación');

  textarea.value='Negros 🖤\n. Julio\nRojos ❤️\n. Xavi';
  api.parseResultCallup();
  assert.deepEqual(setOf(checked(document_.elements.redChecks.innerHTML)),['Xavi'],'reimportación sin restos en rojos');
  assert.deepEqual(setOf(checked(document_.elements.blackChecks.innerHTML)),['Julio'],'reimportación sin restos en negros');

  textarea.value='Negros 🖤\n. Rico';
  api.parseResultCallup();
  assert.deepEqual(setOf(checked(document_.elements.blackChecks.innerHTML)),['Rico'],'reimportación más pequeña');
  assert.deepEqual(setOf(checked(document_.elements.redChecks.innerHTML)),[],'los rojos antiguos desaparecen');

  api.clearResultCallup();
  assert.equal(textarea.value,'','limpiar vacía el texto');
  assert.deepEqual(checked(document_.elements.redChecks.innerHTML),[],'limpiar vacía los rojos');
  assert.deepEqual(checked(document_.elements.blackChecks.innerHTML),[],'limpiar vacía los negros');
  assert.equal(document_.elements.resultCallupStatus.textContent,'','limpiar oculta el estado');

  textarea.value='';
  api.parseResultCallup();
  assert.deepEqual(checked(document_.elements.redChecks.innerHTML),[],'texto vacío no deja selección');
}

// 8) Fútbol sala: solo se eligen los nombres que existen en FS.
{
  const r=run(sample,{mode:'fs'});
  assert.deepEqual(setOf(r.red),setOf(['Xavi','Datxu','Guillem','Rafa']),'rojos que existen en FS');
  assert.deepEqual(setOf(r.black),setOf(['Rico','Rafeta']),'negros que existen en FS');
  const notInFs=['Julio','César','Santi','Manel','Rosana','Nelo','Jota','Nacho'];
  for(const name of notInFs){
    assert.ok(!r.red.includes(name)&&!r.black.includes(name),`${name} no está en FS y no debe seleccionarse`);
  }
  assert.match(r.status,/No he seleccionado automáticamente: /,'FS avisa de los no reconocidos');
}

console.log('result-callup-import: passed');
