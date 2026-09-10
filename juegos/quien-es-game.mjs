import {resetRanking,finishRanking} from './quien-es-ranking.mjs';
import {eligibleCards,choicesFor,shuffle,scoreFor} from './quien-es-core.mjs';
const $=id=>document.getElementById(id), ROUNDS=10;
let catalogPromise,pool=[],queue=[],index=0,correct=0,points=0,answered=true,started=0,current=null,epoch=0,busy=false;
let advanceTimer=null,gameId,totalTime=0;
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
 clearTimeout(advanceTimer);resetRanking();gameId=crypto.randomUUID();totalTime=0;
 const token=++epoch;busy=true;answered=true;current=null;index=0;correct=0;points=0;
 $('finish').classList.remove('open');$('retryBtn').hidden=true;$('spinner').hidden=false;$('answers').replaceChildren();$('cardWrap').replaceChildren();stats();
 message('Cargando catálogo…','Preparando tus diez cromos.');
 try{const loaded=await load();if(token!==epoch)return;pool=loaded.filter(c=>!broken.has(c.id));if(pool.length<ROUNDS)throw Error('No hay diez cromos elegibles disponibles');queue=shuffle(pool);await render(token)}catch(e){if(token===epoch)error(e)}
}
async function render(token){
 busy=true;answered=true;$('answers').replaceChildren();$('cardWrap').replaceChildren();
 if(index===ROUNDS){busy=false;$('finalCorrect').textContent=`${correct}/${ROUNDS}`;$('finalPoints').textContent=`${points.toLocaleString('es-ES')} puntos`;$('finish').classList.add('open');$('playAgain').focus();finishRanking({p_game_id:gameId,p_points:points,p_correct:correct,p_duration_ms:Math.min(86400000,Math.round(totalTime))});return}
 message('Cargando cromo…',`Ronda ${index+1} de ${ROUNDS}`);
 let failures=0;
 while(queue.length&&failures<12){
  const card=queue.shift();let quiz;
  try{[quiz]=await Promise.all([image(card.quiz_url),image(card.reveal_url)])}catch(e){if(token!==epoch)return;console.warn('Carta descartada por imagen',card.id,e.message);broken.add(card.id);failures++;continue}
  if(token!==epoch)return;
  current=card;quiz=quiz.cloneNode();quiz.alt='Cromo de un futbolista con el nombre oculto';
  $('cardWrap').className=`card ${card.orientation==='landscape'?'landscape':'portrait'}`;$('cardWrap').replaceChildren(quiz);
  for(const choice of choicesFor(card,pool)){const b=document.createElement('button');b.className='answer';b.dataset.id=choice.id;b.textContent=choice.answer_name;b.addEventListener('click',()=>answer(b,choice.id));$('answers').append(b)}
  $('feedback').className='feedback';$('feedback').textContent='Elige una respuesta.';stats();$('loading').style.display='none';busy=false;answered=false;started=performance.now();
  if(queue[0])preload(queue[0].quiz_url);
  return;
 }
 throw Error('No se pudieron cargar los cromos. Comprueba la conexión y pulsa Reintentar.');
}
function answer(button,id){
 if(answered||busy||!current)return;answered=true;
 const card=current,ok=id===card.id;totalTime+=performance.now()-started;
 for(const b of $('answers').children){b.disabled=true;if(b.dataset.id===card.id)b.classList.add('correct')}
 // Reveal was preloaded and verified before enabling choices, so this swap needs no network wait.
 const img=$('cardWrap').querySelector('img');img.src=card.reveal_url;img.alt=`Cromo de ${card.answer_name}`;
 const feedback=$('feedback');feedback.replaceChildren();feedback.className=`feedback ${ok?'success':'failure'}`;
 const headline=document.createElement('strong'),detail=document.createElement('span');
 if(ok){correct++;const gain=scoreFor(performance.now()-started);points+=gain;headline.textContent='¡Correcto!';detail.textContent=`+${gain} puntos`}
 else{button.classList.add('wrong');headline.textContent='¡Incorrecto!';detail.textContent=`Era ${card.answer_name}`}
 feedback.append(headline,detail);sfx(ok);stats();
 const token=epoch;advanceTimer=setTimeout(()=>{if(token===epoch)nextRound()},2000);
}
export async function nextRound(){if(busy||!answered||!current)return;busy=true;index++;const token=epoch;try{await render(token)}catch(e){if(token===epoch)error(e)}}
$('playAgain').addEventListener('click',startGame);$('retryBtn').addEventListener('click',()=>{broken.clear();startGame()});
// Synthesized chiptune: no downloads or third-party audio. Starts on a user gesture.
let audioCtx,master,musicTimer,soundEnabled=true,noteIndex=0;
function tone(freq,when,length,volume=.08,type='square'){
 const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type=type;osc.frequency.value=freq;
 gain.gain.setValueAtTime(0,when);gain.gain.linearRampToValueAtTime(volume,when+.01);
 gain.gain.exponentialRampToValueAtTime(.001,when+length);osc.connect(gain);gain.connect(master);osc.start(when);osc.stop(when+length+.02);
}
function music(){
 if(!audioCtx||audioCtx.state!=='running'||!soundEnabled||document.hidden)return;
 const melody=[523.25,659.25,783.99,659.25,587.33,698.46,880,698.46,659.25,783.99,987.77,783.99,587.33,698.46,783.99,392];
 const t=audioCtx.currentTime;tone(melody[noteIndex%16],t,.21,.025,'triangle');
 if(noteIndex%2===0)tone([130.81,146.83,164.81,98][Math.floor(noteIndex/4)%4],t,.35,.035,'triangle');noteIndex++;
}
async function enableAudio(){
 if(!soundEnabled)return;
 try{if(!audioCtx){audioCtx=new(window.AudioContext||window.webkitAudioContext)();master=audioCtx.createGain();master.gain.value=.65;master.connect(audioCtx.destination)}
 await audioCtx.resume();if(!musicTimer){music();musicTimer=setInterval(music,250)}}catch(e){console.warn('Audio no disponible',e.message)}
}
function sfx(ok){
 if(!soundEnabled||!audioCtx||audioCtx.state!=='running')return;
 const t=audioCtx.currentTime;(ok?[523.25,659.25,1046.5]:[220,164.81,110]).forEach((f,i)=>tone(f,t+i*.1,.18,.12,ok?'square':'sawtooth'));
}
$('soundBtn').addEventListener('click',()=>{
 soundEnabled=!soundEnabled;$('soundBtn').textContent=soundEnabled?'♫ Sonido':'♫ Mudo';
 $('soundBtn').setAttribute('aria-pressed',String(soundEnabled));$('soundBtn').setAttribute('aria-label',soundEnabled?'Silenciar música y efectos':'Activar música y efectos');
 if(master)master.gain.value=soundEnabled?.65:0;if(soundEnabled)enableAudio();
});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#soundBtn'))enableAudio()});
document.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')enableAudio()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){audioCtx?.suspend()}else if(audioCtx&&soundEnabled){enableAudio()}});
startGame();
