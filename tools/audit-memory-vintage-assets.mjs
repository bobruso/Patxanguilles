import {createHash} from 'node:crypto';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const REVEAL_DIR=path.join(ROOT,'juegos','vintage-cards','reveal');
const QUIZ_DATA=path.join(ROOT,'juegos','quien-es-data.json');
const REPORT=path.join(ROOT,'tmp','memory-vintage-migration-report.md');
const MAPPING=path.join(ROOT,'tmp','memory-vintage-mapping.csv');
const MANIFEST=path.join(ROOT,'juegos','memory-vintage-assets.json');
const SUPABASE_URL='https://cnnhstlguewrxjihhlqc.supabase.co';
const SUPABASE_KEY='sb_publishable_uWEwYEMkAe3YkeAzX7ACAg_0aEYHmM6';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const csv=value=>`"${String(value??'').replaceAll('"','""')}"`;
const expectedName=card=>`${card.slug}-${card.id.slice(0,8)}.jpg`;
const groupCollisions=(items,keyOf)=>{
  const groups=new Map();
  for(const item of items){
    const key=keyOf(item);
    const group=groups.get(key)||[];
    group.push(item);
    groups.set(key,group);
  }
  return [...groups.entries()].filter(([,values])=>values.length>1);
};

async function fetchEnabledCards(){
  const rows=[];
  for(let from=0;;from+=1000){
    const url=new URL(`${SUPABASE_URL}/rest/v1/vintage_cards`);
    url.searchParams.set('select','id,slug,player_name,enabled,parse_status,source_url,source_image_url,local_image_url,raw_meta');
    url.searchParams.set('enabled','eq.true');
    url.searchParams.set('order','slug.asc,id.asc');
    const response=await fetch(url,{headers:{apikey:SUPABASE_KEY,Range:`${from}-${from+999}`}});
    if(!response.ok)throw new Error(`Supabase respondió ${response.status}: ${await response.text()}`);
    const batch=await response.json();
    rows.push(...batch);
    if(batch.length<1000)break;
  }
  return rows;
}

function jpegDimensions(bytes){
  if(bytes.length<4||bytes[0]!==0xff||bytes[1]!==0xd8)return null;
  let offset=2;
  while(offset+8<bytes.length){
    if(bytes[offset]!==0xff){offset++;continue}
    const marker=bytes[offset+1];
    if(marker===0xd9||marker===0xda)break;
    const length=bytes.readUInt16BE(offset+2);
    if(length<2||offset+2+length>bytes.length)return null;
    if((marker>=0xc0&&marker<=0xc3)||(marker>=0xc5&&marker<=0xc7)||(marker>=0xc9&&marker<=0xcb)||(marker>=0xcd&&marker<=0xcf)){
      const height=bytes.readUInt16BE(offset+5),width=bytes.readUInt16BE(offset+7);
      return width>0&&height>0?{width,height,orientation:height>width?'portrait':'landscape'}:null;
    }
    offset+=2+length;
  }
  return null;
}

async function inspectFile(filename){
  const bytes=await readFile(path.join(REVEAL_DIR,filename));
  const dimensions=jpegDimensions(bytes);
  return {
    filename,
    bytes:bytes.length,
    sha256:createHash('sha256').update(bytes).digest('hex'),
    valid:path.extname(filename).toLowerCase()==='.jpg'&&Boolean(dimensions),
    ...dimensions
  };
}

const cards=await fetchEnabledCards();
const filenames=(await readdir(REVEAL_DIR,{withFileTypes:true})).filter(x=>x.isFile()).map(x=>x.name).sort();
const files=await Promise.all(filenames.map(inspectFile));
const fileByLower=new Map(files.map(file=>[file.filename.toLowerCase(),file]));
const cardByExpected=new Map(cards.map(card=>[expectedName(card).toLowerCase(),card]));
const quizRaw=JSON.parse(await readFile(QUIZ_DATA,'utf8'));
const quizCards=Array.isArray(quizRaw)?quizRaw:quizRaw.cards;
const quizIds=new Set(quizCards.map(card=>String(card.id).toLowerCase()));

const mapping=cards.map(card=>{
  const expected=expectedName(card);
  const file=fileByLower.get(expected.toLowerCase());
  return {
    ...card,wp_post_id:card?.raw_meta?.wp_post_id??'',expected_file:expected,found:Boolean(file),valid:Boolean(file?.valid),
    bytes:file?.bytes??'',width:file?.width??'',height:file?.height??'',orientation:file?.orientation??'',
    used_by_quien_es:quizIds.has(card.id.toLowerCase())
  };
});
const missing=mapping.filter(row=>!row.found);
const invalidMappings=mapping.filter(row=>row.found&&!row.valid);
const unmatched=files.filter(file=>!cardByExpected.has(file.filename.toLowerCase()));
const invalidFiles=files.filter(file=>!file.valid);
const slugCollisions=groupCollisions(cards,card=>card.slug.toLowerCase());
const shortIdCollisions=groupCollisions(cards,card=>card.id.slice(0,8).toLowerCase());
const duplicateExpected=groupCollisions(cards,card=>expectedName(card).toLowerCase());
const duplicateContents=groupCollisions(files,file=>file.sha256);
const invalidIds=cards.filter(card=>!UUID.test(card.id));
const additionalForMemory=mapping.filter(row=>row.found&&row.valid&&!row.used_by_quien_es);

await mkdir(path.dirname(REPORT),{recursive:true});
const headers=['id','slug','player_name','enabled','parse_status','source_url','source_image_url','local_image_url','wp_post_id','expected_file','found','valid','bytes','width','height','orientation','used_by_quien_es'];
await writeFile(MAPPING,[headers.map(csv).join(','),...mapping.map(row=>headers.map(key=>csv(row[key])).join(','))].join('\n')+'\n');

const detail=(title,rows,format)=>rows.length?`\n### ${title} (${rows.length})\n\n${rows.map(format).join('\n')}`:'';
const report=`# Auditoría de assets de Memoria Vintage

Generado: ${new Date().toISOString()}

## Resumen

- Registros habilitados en \`vintage_cards\`: **${cards.length}**
- Archivos reveal existentes: **${files.length}**
- Registros con reveal encontrado y válido: **${mapping.filter(row=>row.found&&row.valid).length}**
- Registros sin reveal: **${missing.length}**
- Registros cuyo reveal existe pero es inválido: **${invalidMappings.length}**
- Reveal sin correspondencia exacta: **${unmatched.length}**
- Reveal aprovechables usados por Quién es: **${mapping.filter(row=>row.found&&row.valid&&row.used_by_quien_es).length}**
- Reveal adicionales válidos para Memoria que Quién es no usa: **${additionalForMemory.length}**
- Colisiones de slug: **${slugCollisions.length}**
- Colisiones de UUID corto: **${shortIdCollisions.length}**
- Nombres esperados duplicados: **${duplicateExpected.length}**
- Grupos de contenido duplicado: **${duplicateContents.length}**
- Archivos inválidos: **${invalidFiles.length}**
- IDs inválidos: **${invalidIds.length}**

La correspondencia se considera válida únicamente cuando coincide exactamente con \`{slug}-{id.substring(0,8)}.jpg\`. No se usa \`quien-es-data.json\` como catálogo maestro; solo se consulta para separar los reveal ya usados por ese juego de los adicionales aprovechables por Memoria.
${detail('Registros sin reveal',missing,row=>`- \`${row.id}\` · \`${row.slug}\` · ${row.player_name} · fuente: ${row.source_image_url||'SIN FUENTE'}`)}
${detail('Reveal sin correspondencia',unmatched,file=>`- \`${file.filename}\` (${file.bytes} bytes)`)}
${detail('Archivos inválidos',invalidFiles,file=>`- \`${file.filename}\``)}
${detail('Colisiones de slug',slugCollisions,([key,rows])=>`- \`${key}\`: ${rows.map(row=>row.id).join(', ')}`)}
${detail('Colisiones de UUID corto',shortIdCollisions,([key,rows])=>`- \`${key}\`: ${rows.map(row=>row.id).join(', ')}`)}
${detail('Contenido duplicado',duplicateContents,([hash,rows])=>`- \`${hash}\`: ${rows.map(row=>row.filename).join(', ')}`)}
`;
await writeFile(REPORT,report);
if(process.argv.includes('--write-manifest')){
  const assets=mapping.filter(row=>row.found&&row.valid).map(row=>({id:row.id,orientation:row.orientation}));
  await writeFile(MANIFEST,JSON.stringify({version:1,assets},null,2)+'\n');
}

console.log(JSON.stringify({
  enabledCards:cards.length,revealFiles:files.length,matchedValid:mapping.filter(row=>row.found&&row.valid).length,
  missing:missing.length,invalidMappings:invalidMappings.length,unmatched:unmatched.length,
  usedByQuienEs:mapping.filter(row=>row.found&&row.valid&&row.used_by_quien_es).length,
  additionalForMemory:additionalForMemory.length,slugCollisions:slugCollisions.length,
  shortIdCollisions:shortIdCollisions.length,duplicateExpected:duplicateExpected.length,
  duplicateContents:duplicateContents.length,invalidFiles:invalidFiles.length,invalidIds:invalidIds.length,
  report:path.relative(ROOT,REPORT),mapping:path.relative(ROOT,MAPPING),
  manifest:process.argv.includes('--write-manifest')?path.relative(ROOT,MANIFEST):null
},null,2));

if(invalidMappings.length||slugCollisions.length||shortIdCollisions.length||duplicateExpected.length||invalidIds.length)process.exitCode=1;
