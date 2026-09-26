// Comprobación de interfaz real: abre index.html en Chromium, pega la
// convocatoria del usuario y verifica qué casillas quedan marcadas.
import assert from 'node:assert/strict';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.join(here,'..');
const evidenceDir=path.join(root,'docs','agent-work','result-team-import');

async function loadChromium(){
  try{
    return (await import('playwright')).chromium;
  }catch{
    const {createRequire}=await import('node:module');
    const runtimeNode=process.env.PATX_RUNTIME_NODE||'C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node';
    const require=createRequire(path.join(runtimeNode,'index.js'));
    return require('playwright').chromium;
  }
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

const chromium=await loadChromium();

// El runtime trae Playwright y una caché de Chromium; usamos la que exista si
// la revisión esperada por defecto no está descargada.
const localAppData=process.env.LOCALAPPDATA||'';
const browserCandidates=[
  process.env.PATX_CHROMIUM,
  path.join(localAppData,'ms-playwright','chromium-1243','chrome-win64','chrome.exe'),
  path.join(localAppData,'ms-playwright','chromium_headless_shell-1243','chrome-headless-shell-win64','chrome-headless-shell.exe'),
].filter(Boolean);
const executablePath=browserCandidates.find(candidate=>existsSync(candidate));

const browser=await chromium.launch(executablePath?{headless:true,executablePath}:{headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});

try{
  await page.goto(pathToFileURL(path.join(root,'index.html')).href,{waitUntil:'load',timeout:60000});
  await page.waitForFunction('typeof window.parseResultCallup==="function"',null,{timeout:60000});
  await page.evaluate(()=>{document.getElementById('siteAccessGate')?.remove()});

  const before=await page.evaluate(()=>{
    openResultForm();
    currentSeasonMode='f7';
    document.getElementById('resultCallupText').value=[];
    return document.querySelectorAll('#redChecks input:checked').length+document.querySelectorAll('#blackChecks input:checked').length;
  });
  assert.equal(before,0,'el formulario empieza sin jugadores marcados');

  const result=await page.evaluate(text=>{
    document.getElementById('resultCallupText').value=text;
    parseResultCallup();
    const read=id=>[...document.querySelectorAll(`#${id} input:checked`)].map(x=>x.value);
    return {
      red:read('redChecks'),
      black:read('blackChecks'),
      statusText:document.getElementById('resultCallupStatus').textContent,
      statusVisible:document.getElementById('resultCallupStatus').style.display!=='none',
    };
  },sample);

  assert.deepEqual([...result.black].sort(),[...['Julio','César','Rico','Santi','Manel','Rafeta','Rosana']].sort(),'negros en el navegador');
  assert.deepEqual([...result.red].sort(),[...['Xavi','Nelo','Datxu','Jota','Guillem','Rafa','Nacho']].sort(),'rojos en el navegador');
  assert.equal(result.statusVisible,true,'el estado se muestra');
  assert.match(result.statusText,/7 en Rojos y 7 en Negros/,'el estado explica el reparto');

  const cleared=await page.evaluate(()=>{
    clearResultCallup();
    return {
      red:document.querySelectorAll('#redChecks input:checked').length,
      black:document.querySelectorAll('#blackChecks input:checked').length,
      text:document.getElementById('resultCallupText').value,
    };
  });
  assert.deepEqual(cleared,{red:0,black:0,text:''},'limpiar deja el formulario vacío');

  await page.evaluate(text=>{
    document.getElementById('resultCallupText').value=text;
    parseResultCallup();
  },sample);
  mkdirSync(evidenceDir,{recursive:true});
  const importBox=await page.$('#resultForm .result-callup-import');
  await importBox.screenshot({path:path.join(evidenceDir,'ui-check.png')});
  writeFileSync(path.join(evidenceDir,'ui-check.json'),JSON.stringify({sample,result,cleared,checkedAfterReimport:await page.evaluate(()=>({
    red:[...document.querySelectorAll('#redChecks input:checked')].map(x=>x.value),
    black:[...document.querySelectorAll('#blackChecks input:checked')].map(x=>x.value),
  }))},null,2)+'\n');
  console.log('result-callup-import-ui: passed');
}finally{
  await browser.close();
}
