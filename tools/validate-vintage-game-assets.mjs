import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const DATA_FILE=path.join(ROOT,'juegos','quien-es-data.json');
const GAME_DIR=path.dirname(DATA_FILE);
const ASSET_ROOT=path.join(GAME_DIR,'vintage-cards');
const EXPECTED_EXTENSION='.jpg';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const relative=p=>path.relative(ROOT,p).split(path.sep).join('/');
const listFiles=async dir=>(await readdir(dir,{withFileTypes:true}))
  .filter(entry=>entry.isFile())
  .map(entry=>entry.name)
  .sort((a,b)=>a.localeCompare(b,'en'));

function assetMatchesCard(filename,cardId){
  const stem=path.parse(filename).name.toLowerCase();
  const id=cardId.toLowerCase();
  return stem===id||stem.endsWith(`-${id.slice(0,8)}`);
}

async function duplicateContentGroups(dir,files){
  const groups=new Map();
  for(const filename of files){
    const bytes=await readFile(path.join(dir,filename));
    const digest=createHash('sha256').update(bytes).digest('hex');
    const group=groups.get(digest)||[];
    group.push(filename);
    groups.set(digest,group);
  }
  return [...groups.entries()]
    .filter(([,names])=>names.length>1)
    .map(([sha256,names])=>({sha256,files:names}));
}

async function validateKind(cards,kind){
  const dir=path.join(ASSET_ROOT,kind);
  const files=await listFiles(dir);
  const filesByLowerName=new Map(files.map(name=>[name.toLowerCase(),name]));
  const matchesByCard=new Map();
  const usedFiles=new Set();
  const brokenCatalogPaths=[];

  for(const card of cards){
    const matches=files.filter(filename=>assetMatchesCard(filename,card.id));
    matchesByCard.set(card.id,matches);
    matches.forEach(filename=>usedFiles.add(filename));

    const value=card[`${kind}_url`];
    if(typeof value==='string'&&!/^https?:\/\//i.test(value)){
      const normalized=value.split(/[?#]/)[0].replace(/^\.\//,'');
      const expectedPrefix=`vintage-cards/${kind}/`;
      const catalogName=normalized.startsWith(expectedPrefix)?normalized.slice(expectedPrefix.length):'';
      if(!catalogName||!filesByLowerName.has(catalogName.toLowerCase())||!assetMatchesCard(catalogName,card.id)){
        brokenCatalogPaths.push({id:card.id,value});
      }
    }
  }

  return {
    directory:relative(dir),
    totalFiles:files.length,
    matchedCards:[...matchesByCard.values()].filter(names=>names.length>0).length,
    missing:cards.filter(card=>matchesByCard.get(card.id).length===0).map(card=>card.id),
    duplicateMatches:[...matchesByCard.entries()].filter(([,names])=>names.length>1).map(([id,names])=>({id,files:names})),
    orphanFiles:files.filter(filename=>!usedFiles.has(filename)),
    unexpectedExtensions:files.filter(filename=>path.extname(filename).toLowerCase()!==EXPECTED_EXTENSION),
    duplicateContents:await duplicateContentGroups(dir,files),
    brokenCatalogPaths
  };
}

const catalog=JSON.parse(await readFile(DATA_FILE,'utf8'));
const cards=Array.isArray(catalog)?catalog:catalog.cards;
if(!Array.isArray(cards))throw new Error(`${relative(DATA_FILE)} no contiene un array cards`);

const idCounts=new Map();
for(const card of cards)idCounts.set(card?.id,(idCounts.get(card?.id)||0)+1);
const invalidCardIds=cards.filter(card=>!UUID.test(String(card?.id||''))).map(card=>card?.id??null);
const duplicateCardIds=[...idCounts.entries()].filter(([,count])=>count>1).map(([id,count])=>({id,count}));
const quiz=await validateKind(cards,'quiz');
const reveal=await validateKind(cards,'reveal');
const report={
  catalog:relative(DATA_FILE),
  totalCards:cards.length,
  invalidCardIds,
  duplicateCardIds,
  quiz,
  reveal
};

const json=process.argv.includes('--json');
if(json){
  console.log(JSON.stringify(report,null,2));
}else{
  console.log(`Catálogo: ${report.catalog}`);
  console.log(`Cartas: ${report.totalCards}`);
  console.log(`IDs inválidos: ${invalidCardIds.length}`);
  console.log(`IDs duplicados: ${duplicateCardIds.length}`);
  for(const [kind,result] of [['quiz',quiz],['reveal',reveal]]){
    console.log(`\n${kind.toUpperCase()} · ${result.directory}`);
    console.log(`Archivos: ${result.totalFiles}`);
    console.log(`Cartas con archivo: ${result.matchedCards}`);
    console.log(`Faltantes: ${result.missing.length}`);
    console.log(`Coincidencias duplicadas: ${result.duplicateMatches.length}`);
    console.log(`Contenido duplicado: ${result.duplicateContents.length}`);
    console.log(`Huérfanos: ${result.orphanFiles.length}`);
    console.log(`Extensiones inesperadas: ${result.unexpectedExtensions.length}`);
    console.log(`Rutas de catálogo inválidas: ${result.brokenCatalogPaths.length}`);
    if(result.missing.length)console.log(`  Faltan: ${result.missing.join(', ')}`);
    if(result.orphanFiles.length)console.log(`  Huérfanos: ${result.orphanFiles.join(', ')}`);
  }
}

const blockingFailures=invalidCardIds.length+duplicateCardIds.length+
  quiz.missing.length+reveal.missing.length+
  quiz.duplicateMatches.length+reveal.duplicateMatches.length+
  quiz.duplicateContents.length+reveal.duplicateContents.length+
  quiz.unexpectedExtensions.length+reveal.unexpectedExtensions.length+
  quiz.brokenCatalogPaths.length+reveal.brokenCatalogPaths.length;

if(blockingFailures){
  console.error(`\nValidación fallida: ${blockingFailures} problema(s) bloqueante(s).`);
  process.exitCode=1;
}else{
  console.log('\nValidación superada: cada carta tiene un quiz y un reveal válidos.');
}
