import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SUPABASE_URL='https://cnnhstlguewrxjihhlqc.supabase.co';
const SUPABASE_KEY='sb_publishable_uWEwYEMkAe3YkeAzX7ACAg_0aEYHmM6';
const require=createRequire(import.meta.url);
const playwrightRoot=process.env.WORKSPACE_NODE_MODULES;
const {chromium}=playwrightRoot?require(path.join(playwrightRoot,'playwright')):require('playwright');

async function fetchCatalog(){
  const url=new URL(`${SUPABASE_URL}/rest/v1/vintage_cards`);
  url.searchParams.set('select','id,slug,player_name');
  url.searchParams.set('enabled','eq.true');
  url.searchParams.set('parse_status','eq.ready');
  url.searchParams.set('order','slug.asc,id.asc');
  const response=await fetch(url,{headers:{apikey:SUPABASE_KEY,Range:'0-999'}});
  if(!response.ok)throw new Error(`No se pudo leer vintage_cards: ${response.status}`);
  return response.json();
}

function contentType(filename){
  return ({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg'})[path.extname(filename).toLowerCase()]||'application/octet-stream';
}

async function localServer(){
  const server=createServer(async (request,response)=>{
    try{
      const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
      const relative=pathname==='/'?'juegos/memoria-vintage.html':pathname.replace(/^\//,'');
      const filename=path.resolve(ROOT,relative);
      if(!filename.startsWith(ROOT+path.sep))throw new Error('Ruta fuera del proyecto');
      const bytes=await readFile(filename);
      response.writeHead(200,{'content-type':contentType(filename),'cache-control':'no-store'});
      response.end(bytes);
    }catch{
      response.writeHead(404,{'content-type':'text/plain'});response.end('Not found');
    }
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {server,baseUrl:`http://127.0.0.1:${server.address().port}`};
}

function fakeSupabaseScript(catalog){
  return `window.supabase={createClient(){
    const builder=(rows,single=null)=>{const result=Promise.resolve({data:rows,error:null});const q={
      select(){return q},eq(){return q},not(){return q},order(){return q},limit(){return q},
      maybeSingle(){return Promise.resolve({data:single,error:null})},then:result.then.bind(result),catch:result.catch.bind(result)
    };return q};
    return {
      auth:{getSession:async()=>({data:{session:{user:{id:'browser-smoke-user'}}}}),signOut:async()=>({}),setSession:async()=>({})},
      from(table){if(table==='profiles')return builder([], {id:'browser-smoke-user',display_name:'Smoke',player_id:1,role:'user'});if(table==='vintage_cards')return builder(${JSON.stringify(catalog)});return builder([])},
      rpc:async()=>({data:[{rank_position:1}],error:null})
    }
  }};`;
}

async function runViewport(browser,baseUrl,catalog,viewport,expectedCards,label,additionalId){
  const context=await browser.newContext({viewport});
  const page=await context.newPage();
  const requests=[];const badResponses=[];const consoleErrors=[];
  page.on('request',request=>requests.push(request.url()));
  page.on('response',response=>{if(response.status()>=400)badResponses.push(`${response.status()} ${response.url()}`)});
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text())});
  page.on('pageerror',error=>consoleErrors.push(error.message));
  await page.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({status:200,contentType:'text/javascript',body:fakeSupabaseScript(catalog)}));
  await page.addInitScript(()=>{localStorage.setItem('memorySound','off');sessionStorage.clear()});
  await page.goto(`${baseUrl}/juegos/memoria-vintage.html`,{waitUntil:'networkidle'});
  await page.waitForFunction(count=>document.querySelectorAll('.memory-card').length===count,expectedCards);
  const first=await page.evaluate(()=>({
    catalogSize:catalogCards.length,
    cardCount:document.querySelectorAll('.memory-card').length,
    uniquePairs:new Set([...document.querySelectorAll('.memory-card')].map(card=>card.dataset.pair)).size,
    sources:[...document.querySelectorAll('.front-face img')].map(img=>img.src),
    imagesOk:[...document.querySelectorAll('.front-face img')].every(img=>img.complete&&img.naturalWidth>0&&img.naturalHeight>0),
    chosenIds:[...previousIds],orientation:currentOrientation
  }));
  if(first.catalogSize!==696)throw new Error(`${label}: catálogo runtime ${first.catalogSize}, esperado 696`);
  if(first.cardCount!==expectedCards||first.uniquePairs!==expectedCards/2||!first.imagesOk)throw new Error(`${label}: tablero o imágenes inválidos`);
  if(first.sources.some(url=>!url.startsWith(`${baseUrl}/juegos/vintage-cards/reveal/`)))throw new Error(`${label}: imagen fuera de GitHub/local`);

  const additional=await page.evaluate(async id=>{
    const card=catalogCards.find(item=>item.id===id);
    return {present:Boolean(card),orientation:card?await inspectImage(localRevealUrl(card)):null};
  },additionalId);
  if(!additional.present||!additional.orientation)throw new Error(`${label}: una carta ajena a Quién es no es seleccionable`);

  await page.evaluate(()=>newGame());
  await page.waitForFunction(previous=>[...previousIds].some(id=>!previous.includes(id)),first.chosenIds);
  await page.waitForFunction(count=>document.querySelectorAll('.memory-card').length===count&&[...document.querySelectorAll('.front-face img')].every(img=>img.complete&&img.naturalWidth>0),expectedCards);
  const secondOrientation=await page.evaluate(()=>currentOrientation);
  if(secondOrientation===first.orientation)throw new Error(`${label}: la segunda partida no alternó orientación`);

  const forbidden=request=>/odioeternoalfutbolmoderno\.es/i.test(request)||/supabase\.co\/storage\/.*vintage-cards/i.test(request);
  const forbiddenRequests=requests.filter(forbidden);
  if(forbiddenRequests.length)throw new Error(`${label}: peticiones prohibidas: ${forbiddenRequests.join(', ')}`);
  if(badResponses.length)throw new Error(`${label}: respuestas HTTP fallidas: ${badResponses.join(', ')}`);
  if(consoleErrors.length)throw new Error(`${label}: errores de consola: ${consoleErrors.join(' | ')}`);
  await context.close();
  console.log(`✓ ${label}: dos partidas, ${first.uniquePairs} parejas, imágenes locales, 0 errores/404/peticiones prohibidas`);
}

const catalog=await fetchCatalog();
const quizRaw=JSON.parse(await readFile(path.join(ROOT,'juegos','quien-es-data.json'),'utf8'));
const quizIds=new Set((Array.isArray(quizRaw)?quizRaw:quizRaw.cards).map(card=>card.id));
const manifest=JSON.parse(await readFile(path.join(ROOT,'juegos','memory-vintage-assets.json'),'utf8'));
const additionalId=manifest.assets.find(asset=>!quizIds.has(asset.id))?.id;
if(catalog.length!==704)throw new Error(`Supabase devolvió ${catalog.length} registros; se esperaban 704`);
if(!additionalId)throw new Error('No hay carta adicional a Quién es para la prueba');

const {server,baseUrl}=await localServer();
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
try{
  await runViewport(browser,baseUrl,catalog,{width:1280,height:900},20,'Escritorio',additionalId);
  await runViewport(browser,baseUrl,catalog,{width:390,height:844},12,'Móvil',additionalId);
  console.log('Smoke browser de Memoria Vintage superado.');
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
