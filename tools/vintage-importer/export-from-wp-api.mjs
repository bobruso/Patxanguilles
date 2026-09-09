import * as cheerio from 'cheerio';
import { writeFile } from 'node:fs/promises';

const BASE='https://odioeternoalfutbolmoderno.es';
const CATEGORY_ID=422;
const PER_PAGE=100;
const OUT=process.env.OUTPUT_FILE||'vintage-cards-wp.json';
const clean=(v='')=>String(v).replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const decodeHtml=(v='')=>{const $=cheerio.load(`<div>${v}</div>`);return clean($('div').text())};

async function getJson(url,attempt=1){
  const r=await fetch(url,{headers:{'User-Agent':'PatxanguillesVintageImporter/2.0 (+personal non-commercial football project)','Accept':'application/json'}});
  if((r.status===429||r.status>=500)&&attempt<5){await new Promise(x=>setTimeout(x,attempt*600));return getJson(url,attempt+1)}
  if(!r.ok)throw new Error(`${r.status} ${r.statusText}: ${url}`);
  return {data:await r.json(),total:Number(r.headers.get('x-wp-total')||0),pages:Number(r.headers.get('x-wp-totalpages')||0)};
}
function field($,labels){
  const wanted=labels.map(x=>x.toLocaleLowerCase('es-ES'));let result=null;
  $('li,p').each((_,el)=>{if(result)return;const text=clean($(el).text()),low=text.toLocaleLowerCase('es-ES');for(const label of wanted){if(low.startsWith(`${label}:`)||low.startsWith(`${label} :`)){result=clean(text.slice(text.indexOf(':')+1));break}}});
  return result;
}
function parsePost(post){
  const html=post?.content?.rendered||'';$=null;
  const $=cheerio.load(html);
  const title=decodeHtml(post?.title?.rendered||post?.slug||'');
  const playerName=field($,['Nombre'])||title;
  const nationality=field($,['Nacionalidad']);
  const position=field($,['Posición','Posicion']);
  const yearsRaw=field($,['Años en activo','Anos en activo']);
  const honors=field($,['Palmarés como jugador','Palmarés','Palmares como jugador','Palmares']);
  const distinctions=field($,['Distinciones individuales','Distinciones']);
  let img=$('img').filter((_,el)=>/cromo de/i.test(clean($(el).attr('alt')))).first();
  if(!img.length)img=$('img').first();
  const imageUrl=img.attr('src')||img.attr('data-src')||img.attr('data-lazy-src')||null;
  const years=yearsRaw?Number.parseInt(yearsRaw,10):null;
  return {
    slug:post.slug,
    title,
    player_name:playerName,
    nationality:nationality||null,
    position:position||null,
    active_years:Number.isFinite(years)?years:null,
    honors:honors||null,
    individual_distinctions:distinctions||null,
    source_url:post.link,
    source_image_url:imageUrl,
    source_published_at:String(post.date||'').slice(0,10)||null,
    parse_status:imageUrl&&playerName?'ready':'needs_review',
    enabled:true,
    raw_meta:{image_alt:clean(img.attr('alt'))||null,wp_post_id:post.id,imported_from:'WordPress REST API category 422'},
    updated_at:new Date().toISOString()
  };
}

const first=await getJson(`${BASE}/wp-json/wp/v2/posts?categories=${CATEGORY_ID}&per_page=${PER_PAGE}&page=1&orderby=date&order=desc`);
const total=first.total,pages=first.pages||Math.ceil(total/PER_PAGE);console.log(`API: ${total} entradas · ${pages} páginas`);
const posts=[...first.data];
for(let page=2;page<=pages;page++){
  const r=await getJson(`${BASE}/wp-json/wp/v2/posts?categories=${CATEGORY_ID}&per_page=${PER_PAGE}&page=${page}&orderby=date&order=desc`);
  posts.push(...r.data);console.log(`Página ${page}/${pages}: ${posts.length}/${total}`);
}
const records=posts.map(parsePost);const ready=records.filter(x=>x.parse_status==='ready').length;
await writeFile(OUT,JSON.stringify(records,null,2));
console.log(`Exportado ${records.length}: ${ready} listos · ${records.length-ready} para revisar → ${OUT}`);
