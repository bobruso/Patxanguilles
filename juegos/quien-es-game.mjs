import {eligibleCards,choicesFor,shuffle,scoreFor} from './quien-es-core.mjs';
const $=id=>document.getElementById(id), ROUNDS=10;
let catalogPromise,pool=[],queue=[],index=0,correct=0,points=0,answered=true,started=0,current=null,epoch=0,busy=false;
const images=new Map(),broken=new Set();
function image(url){
 if(images.has(url))return images.get(url);
 const promise=new Promise((resolve,reject)=>{const img=new Image();const timer=setTimeout(()=>{img.src='';reject(Error('Tiempo de carga agotado'))},15000);img.onload=()=>{clearTimeout(timer);resolve(img)};img.onerror=()=>{clearTimeout(timer);reject(Error('Imagen no disponible'))};img.src=url});
 images.set(url,promise);promise.catch(()=>images.delete(url));
 // Only keep a small working cache; browser HTTP caching handles older cards.
 if(images.size>6)images.delete(images.keys().next().value);
 return promise;
}
function preload(url){image(url).catch(e=>console.warn('Precarga fallida',url,e.message))}
function message(title,text){$('loadingTitle').textContent=title;$('loadingText').textContent=text;$('loading').style.display='grid'}
function stats(){$('roundStat').textContent=`${Math.min(index+1,ROUNDS)}/${ROUNDS}`;$('correctStat').textContent=correct;$('pointsStat').textContent=points}
function error(e){busy=false;answered=true;console.warn(e);message('No se pudo preparar la partida',e.message);$('retryBtn').hidden=false;$('spinner').hidden=true}
async function load(){if(!catalogPromise)catalogPromise=fetch('./quien-es-data.json').then(r=>{if(!r.ok)throw Error('No se pudo cargar el catálogo');return r.json()}).then(data=>eligibleCards(data.cards,data.mode)).catch(e=>{catalogPromise=null;throw e});return catalogPromise}
export async function startGame(){
 const token=++epoch;busy=true;answered=true;current=null;index=0;correct=0;points=0;
 $('finish').classList.remove('open');$('retryBtn').hidden=true;$('spinner').hidden=false;$('answers').replaceChildren();$('cardWrap').replaceChildren();$('nextBtn').classList.remove('show');stats();
 message('Cargando catálogo…','Preparando tus diez cromos.');
 try{const loaded=await load();if(token!==epoch)return;pool=loaded.filter(c=>!broken.has(c.id));if(pool.length<ROUNDS)throw Error('No hay diez cromos elegibles disponibles');queue=shuffle(pool);await render(token)}catch(e){if(token===epoch)error(e)}
}
async function render(token){
 busy=true;answered=true;$('nextBtn').classList.remove('show');$('answers').replaceChildren();$('cardWrap').replaceChildren();
 if(index===ROUNDS){busy=false;$('finalCorrect').textContent=`${correct}/${ROUNDS}`;$('finalPoints').textContent=`${points.toLocaleString('es-ES')} puntos`;$('finish').classList.add('open');$('playAgain').focus();return}
 message('Cargando cromo…',`Ronda ${index+1} de ${ROUNDS}`);
 let failures=0;
 while(queue.length&&failures<12){
  const card=queue.shift();let quiz;
  try{[quiz]=await Promise.all([image(card.quiz_url),image(card.reveal_url)])}catch(e){if(token!==epoch)return;console.warn('Carta descartada por imagen',card.id,e.message);broken.add(card.id);failures++;continue}
  if(token!==epoch)return;
  current=card;quiz=quiz.cloneNode();quiz.alt='Cromo de un futbolista con el nombre oculto';
  $('cardWrap').className=`card ${card.orientation==='landscape'?'landscape':'portrait'}`;$('cardWrap').replaceChildren(quiz);
  for(const choice of choicesFor(card,pool)){const b=document.createElement('button');b.className='answer';b.dataset.id=choice.id;b.textContent=choice.answer_name;b.addEventListener('click',()=>answer(b,choice.id));$('answers').append(b)}
  $('feedback').textContent='Elige una respuesta.';stats();$('loading').style.display='none';busy=false;answered=false;started=performance.now();
  if(queue[0])preload(queue[0].quiz_url);
  return;
 }
 throw Error('No se pudieron cargar los cromos. Comprueba la conexión y pulsa Reintentar.');
}
function answer(button,id){
 if(answered||busy||!current)return;answered=true;
 const card=current,ok=id===card.id;
 for(const b of $('answers').children){b.disabled=true;if(b.dataset.id===card.id)b.classList.add('correct')}
 // Reveal was preloaded and verified before enabling choices, so this swap needs no network wait.
 const img=$('cardWrap').querySelector('img');img.src=card.reveal_url;img.alt=`Cromo de ${card.answer_name}`;
 if(ok){correct++;const gain=scoreFor(performance.now()-started);points+=gain;$('feedback').textContent=`✅ Correcto: ${card.answer_name} · +${gain}`}else{button.classList.add('wrong');$('feedback').textContent=`❌ Era ${card.answer_name}.`}
 stats();$('nextBtn').textContent=index===ROUNDS-1?'Ver resultado →':'Siguiente cromo →';$('nextBtn').classList.add('show');$('nextBtn').focus();
}
export async function nextRound(){if(busy||!answered||!current)return;busy=true;index++;const token=epoch;try{await render(token)}catch(e){if(token===epoch)error(e)}}
$('newGame').addEventListener('click',startGame);$('playAgain').addEventListener('click',startGame);$('retryBtn').addEventListener('click',()=>{broken.clear();startGame()});$('nextBtn').addEventListener('click',nextRound);
startGame();
