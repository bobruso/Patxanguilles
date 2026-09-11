import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const baseUrl=(process.argv[2]||'https://patxanguillesantifeixistes.es').replace(/\/$/,'');
const SUPABASE_URL='https://cnnhstlguewrxjihhlqc.supabase.co';
const SUPABASE_KEY='sb_publishable_uWEwYEMkAe3YkeAzX7ACAg_0aEYHmM6';
const manifest=JSON.parse(await readFile(path.join(ROOT,'juegos','memory-vintage-assets.json'),'utf8'));
const catalogUrl=new URL(`${SUPABASE_URL}/rest/v1/vintage_cards`);
catalogUrl.searchParams.set('select','id,slug');
catalogUrl.searchParams.set('enabled','eq.true');
catalogUrl.searchParams.set('parse_status','eq.ready');
const catalogResponse=await fetch(catalogUrl,{headers:{apikey:SUPABASE_KEY,Range:'0-999'}});
if(!catalogResponse.ok)throw new Error(`No se pudo leer vintage_cards: ${catalogResponse.status}`);
const catalog=await catalogResponse.json();
const cardsById=new Map(catalog.map(card=>[card.id,card]));
const queue=manifest.assets.map(asset=>cardsById.get(asset.id)).filter(Boolean);
const results=[];
let cursor=0;

async function worker(){
  while(cursor<queue.length){
    const row=queue[cursor++];
    const filename=`${row.slug}-${row.id.slice(0,8)}.jpg`;
    const url=`${baseUrl}/juegos/vintage-cards/reveal/${filename}`;
    try{
      const response=await fetch(url,{headers:{'cache-control':'no-cache'}});
      const bytes=Buffer.from(await response.arrayBuffer());
      results.push({id:row.id,url,status:response.status,bytes:bytes.length,valid:response.ok&&bytes[0]===0xff&&bytes[1]===0xd8});
    }catch(error){results.push({id:row.id,url,status:0,bytes:0,valid:false,error:error.message})}
  }
}

await Promise.all(Array.from({length:20},worker));
const failed=results.filter(result=>!result.valid);
const summary={baseUrl,total:results.length,ok:results.length-failed.length,notFound:results.filter(result=>result.status===404).length,failed};
console.log(JSON.stringify(summary,null,2));
if(failed.length)process.exitCode=1;
