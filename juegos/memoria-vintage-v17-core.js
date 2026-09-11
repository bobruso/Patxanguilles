const SUPABASE_URL='https://cnnhstlguewrxjihhlqc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_uWEwYEMkAe3YkeAzX7ACAg_0aEYHmM6';
const ACCOUNT_AUTH_URL=`${SUPABASE_URL}/functions/v1/account-auth`;
let PAIRS=10;
let difficultyMode='hard';
function setModeForDevice(){
  difficultyMode=isMobile()?'easy':'hard';
  PAIRS=isMobile()?6:10;
}


let soundEnabled=localStorage.getItem('memorySound')!=='off';
let audioCtx=null,tensionTimer=null,tensionStep=0,tensionGain=null;

function ensureAudio(){
  if(!soundEnabled)return null;
  if(!audioCtx){
    const Ctx=window.AudioContext||window.webkitAudioContext;
    if(!Ctx)return null;
    audioCtx=new Ctx();
  }
  if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
  return audioCtx;
}

function tone(freq,duration=.1,volume=.08,type='sine',when=0){
  const ctx=ensureAudio();
  if(!ctx)return;
  const o=ctx.createOscillator();
  const g=ctx.createGain();
  o.type=type;
  o.frequency.setValueAtTime(freq,ctx.currentTime+when);
  g.gain.setValueAtTime(0.0001,ctx.currentTime+when);
  g.gain.exponentialRampToValueAtTime(Math.max(.0001,volume),ctx.currentTime+when+.01);
  g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+when+duration);
  o.connect(g);g.connect(ctx.destination);
  o.start(ctx.currentTime+when);
  o.stop(ctx.currentTime+when+duration+.03);
}

function playMatchSfx(){
  if(!soundEnabled)return;
  tone(523.25,.09,.07,'triangle',0);
  tone(659.25,.11,.065,'triangle',.075);
  tone(783.99,.16,.06,'triangle',.15);
}

function playVictorySfx(){
  if(!soundEnabled)return;
  const notes=[
    [392,.18,0],[523.25,.18,.16],[659.25,.18,.32],
    [783.99,.24,.48],[1046.5,.55,.64]
  ];
  notes.forEach(([f,d,w])=>tone(f,d,.075,'triangle',w));
  tone(261.63,.75,.035,'sine',.64);
  tone(392,.75,.035,'sine',.64);
}

function tensionPulse(){
  if(!soundEnabled||finished)return;
  const ctx=ensureAudio();
  if(!ctx)return;

  // Pulso grave y discreto, tipo cuenta atrás / tensión.
  const seq=[110,110,123.47,110,98,110,123.47,130.81];
  const f=seq[tensionStep%seq.length];
  tensionStep++;
  tone(f,.18,.022,'triangle',0);
  if(tensionStep%4===0)tone(f*2,.09,.010,'sine',.02);
}

function startTensionMusic(){
  stopTensionMusic();
  if(!soundEnabled)return;
  ensureAudio();
  tensionStep=0;
  tensionPulse();
  tensionTimer=setInterval(tensionPulse,520);
}

function stopTensionMusic(){
  if(tensionTimer){
    clearInterval(tensionTimer);
    tensionTimer=null;
  }
}

function updateSoundButton(){
  const b=document.getElementById('soundBtn');
  if(b){
    b.textContent=soundEnabled?'🔊':'🔇';
    b.title=soundEnabled?'Desactivar sonido':'Activar sonido';
  }
}

function toggleSound(){
  soundEnabled=!soundEnabled;
  localStorage.setItem('memorySound',soundEnabled?'on':'off');
  updateSoundButton();
  if(soundEnabled){
    ensureAudio();
    if(startedAt&&!finished)startTensionMusic();
    tone(660,.08,.045,'triangle');
  }else{
    stopTensionMusic();
    if(audioCtx&&audioCtx.state==='running')audioCtx.suspend().catch(()=>{});
  }
}

function exitToGames(){
  stopTensionMusic();
  location.href='./';
}

const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}
});

let session=null,profile=null;
let catalogCards=[],pools={portrait:[],landscape:[]},catalogLoaded=false;
let deck=[],currentOrientation='portrait';
let firstCard=null,secondCard=null,locked=false,finished=false;
let matched=0,moves=0,errors=0,startedAt=null,timerId=null;
let registrationState=null;
let previousIds=new Set(JSON.parse(sessionStorage.getItem('memoryPreviousCards')||'[]'));

const LOADING_PHRASES=[
  'Buscando cromos entre cajas que nadie abre desde 1997…',
  'Quitando polvo al álbum sin estornudar encima…',
  'Comprobando que ningún cromo esté pegado con celo…',
  'Barajando como un señor de bar con mucho oficio…',
  'Descartando cromos que han pedido la baja médica…',
  'Consultando al VAR si dos cromos son realmente iguales…',
  'Rebuscando en un cajón lleno de entradas viejas…',
  'Alineando cromos sin necesidad de entrenador titulado…',
  'Preparando el álbum con métodos científicamente dudosos…',
  'Esperando a que cargue el lateral derecho del 94…',
  'Comprobando que no aparezca Romário tres veces seguidas…',
  'Sacudiendo el álbum para que caigan los cromos buenos…'
];
function randomLoadingPhrase(){
  return LOADING_PHRASES[Math.floor(Math.random()*LOADING_PHRASES.length)];
}

function isMobile(){return matchMedia('(max-width:700px), (orientation:portrait)').matches}
function shuffle(input){const a=[...input];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function formatTime(ms){const sec=Math.max(0,Math.floor(ms/1000));const tenths=Math.floor((ms%1000)/100);return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}.${tenths}`}
function formatRecordDate(value){
  if(!value)return 'Fecha desconocida';
  return new Date(value).toLocaleString('es-ES',{
    day:'2-digit',month:'2-digit',year:'numeric',
    hour:'2-digit',minute:'2-digit'
  });
}
function updateStats(){pairsStat.textContent=`${matched}/${PAIRS}`;timeStat.textContent=formatTime(startedAt?Date.now()-startedAt:0)}
function startClock(){if(startedAt)return;startedAt=Date.now();timerId=setInterval(updateStats,100)}
function stopClock(){if(timerId){clearInterval(timerId);timerId=null}}

function openDifficulty(){setModeForDevice();newGame()}
function chooseDifficulty(mode){
  setModeForDevice();
  difficultyOverlay.classList.remove('open');
  ensureAudio();
  startTensionMusic();
  newGame();
}
async function accountAction(action,payload={}){
  const r=await fetch(ACCOUNT_AUTH_URL,{
    method:'POST',
    headers:{apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},
    body:JSON.stringify({action,...payload})
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok||data?.ok!==true)throw new Error(data?.error||`Error ${r.status}`);
  return data;
}
async function hydrateSession(){
  const {data}=await sb.auth.getSession();
  session=data?.session||null;
  if(!session)return false;
  const {data:p,error}=await sb.from('profiles').select('id,display_name,player_id,role').eq('id',session.user.id).maybeSingle();
  if(error||!p){await sb.auth.signOut();session=null;return false}
  profile=p;
  playerChip.textContent=p.display_name||'Jugador';
  playerChip.style.display='block';
  adminRankingBtn.style.display=p.role==='admin'?'block':'none';
  return true;
}
async function loadAuthPlayers(){
  authStatus.textContent='Cargando jugadores…';
  const [reg,av]=await Promise.all([accountAction('registered_players'),accountAction('available_players')]);
  loginPlayer.innerHTML=(reg.players||[]).map(p=>`<option value="${p.id}">${esc(p.nickname)}</option>`).join('');
  registerPlayer.innerHTML=(av.players||[]).map(p=>`<option value="${p.id}">${esc(p.nickname)}</option>`).join('');
  authStatus.textContent='';
}
function showAuthTab(which){
  loginPane.style.display=which==='login'?'block':'none';
  registerPane.style.display=which==='register'?'block':'none';
  loginTab.classList.toggle('active',which==='login');registerTab.classList.toggle('active',which==='register');authStatus.textContent='';
}
async function doLogin(){
  try{
    authStatus.textContent='Entrando…';
    const data=await accountAction('login',{player_id:Number(loginPlayer.value),password:loginPassword.value});
    await sb.auth.setSession({access_token:data.session.access_token,refresh_token:data.session.refresh_token});
    if(!(await hydrateSession()))throw new Error('No se pudo cargar el perfil');
    authOverlay.classList.remove('open');setModeForDevice();difficultyOverlay.classList.remove('open');newGame();
  }catch(e){authStatus.textContent=e.message}
}
async function requestRegistration(){
  try{
    const player_id=Number(registerPlayer.value),password=registerPassword.value;
    if(!password)throw new Error('Escribe una contraseña');
    authStatus.textContent='Enviando solicitud…';
    const data=await accountAction('request_registration',{player_id});
    registrationState={player_id,password,request_id:data.request_id};
    registerStep1.style.display='none';registerStep2.style.display='block';
    authStatus.textContent=data.message||'Solicitud enviada.';
  }catch(e){authStatus.textContent=e.message}
}
async function completeRegistration(){
  try{
    if(!registrationState)throw new Error('Solicitud no válida');
    authStatus.textContent='Validando código…';
    const data=await accountAction('complete_registration',{
      player_id:registrationState.player_id,request_id:registrationState.request_id,
      code:registerCode.value.trim(),password:registrationState.password
    });
    if(data.signed_in&&data.session){
      await sb.auth.setSession({access_token:data.session.access_token,refresh_token:data.session.refresh_token});
      if(!(await hydrateSession()))throw new Error('Cuenta creada, pero no se pudo cargar el perfil');
      authOverlay.classList.remove('open');setModeForDevice();difficultyOverlay.classList.remove('open');newGame();
    }else{
      authStatus.textContent='Cuenta creada. Entra con tu jugador y contraseña.';
      resetRegistration();showAuthTab('login');await loadAuthPlayers();
    }
  }catch(e){authStatus.textContent=e.message}
}
function resetRegistration(){registrationState=null;registerCode.value='';registerStep1.style.display='block';registerStep2.style.display='none'}

function localRevealUrl(card){
  return `./vintage-cards/reveal/${card.slug}-${String(card.id).slice(0,8)}.jpg`;
}

function inspectImage(url,timeout=7000){
  return new Promise(resolve=>{
    const img=new Image();let done=false;
    const finish=result=>{if(done)return;done=true;clearTimeout(t);resolve(result)}
    const t=setTimeout(()=>finish(null),timeout);
    img.onload=()=>finish(img.naturalWidth>0&&img.naturalHeight>0&&img.naturalWidth!==img.naturalHeight
      ?(img.naturalHeight>img.naturalWidth?'portrait':'landscape')
      :null);
    img.onerror=()=>finish(null);
    img.src=url;
  });
}

async function loadCatalog(){
  if(catalogLoaded)return;
  const [{data,error},manifestResponse]=await Promise.all([
    sb.from('vintage_cards').select('id,slug,player_name').eq('enabled',true).eq('parse_status','ready'),
    fetch('./memory-vintage-assets.json',{cache:'no-cache'})
  ]);
  if(error)throw error;
  if(!manifestResponse.ok)throw new Error(`No se pudo cargar el manifiesto local de cromos (${manifestResponse.status}).`);
  const manifest=await manifestResponse.json();
  const orientationById=new Map((manifest.assets||[]).map(asset=>[String(asset.id),asset.orientation]));
  catalogCards=(data||[])
    .filter(c=>c.id&&c.slug&&c.player_name&&['portrait','landscape'].includes(orientationById.get(String(c.id))))
    .map(c=>({...c,orientation:orientationById.get(String(c.id)),image_url:localRevealUrl(c)}));
  pools={portrait:[],landscape:[]};
  for(const card of catalogCards)pools[card.orientation].push(card);
  catalogLoaded=true;
}

async function selectHealthyCards(orientation){
  const base=shuffle(pools[orientation].filter(c=>!previousIds.has(String(c.id))));
  const fallback=shuffle(pools[orientation].filter(c=>previousIds.has(String(c.id))));
  const candidates=[...base,...fallback];
  const good=[];
  for(let i=0;i<candidates.length&&good.length<PAIRS;i+=8){
    const batch=candidates.slice(i,i+8);
    const checks=await Promise.all(batch.map(async card=>({card,orientation:await inspectImage(card.image_url)})));
    for(const result of checks){
      if(result.orientation===orientation&&good.length<PAIRS)good.push(result.card);
    }
  }
  if(good.length<PAIRS)throw new Error(`No hay suficientes cromos ${orientation==='portrait'?'verticales':'horizontales'} con imagen local disponible.`);
  return good;
}

