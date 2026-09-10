const $=id=>document.getElementById(id);
const URL='https://cnnhstlguewrxjihhlqc.supabase.co',KEY='sb_publishable_uWEwYEMkAe3YkeAzX7ACAg_0aEYHmM6';
let client,pending=null,saving=false,view=0,lastFocus;
function sb(){if(!client){if(!window.supabase)throw Error('No se pudo cargar la conexión. Recarga la página.');client=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}})}return client}
function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n}
function explain(e){return e?.message==='AUTH_REQUIRED'?'Entra con tu cuenta para ver el ranking.':e?.message||'No se pudo conectar. Inténtalo de nuevo.'}
export function resetRanking(){pending=null;saving=false;$('ranking').classList.remove('open');$('saveStatus').textContent='';$('saveScore').hidden=true}
export function finishRanking(result){pending={...result};save()}
async function save(){
 const result=pending;if(!result||saving)return;saving=true;$('saveScore').hidden=true;
 try{
  const {data:{session},error}=await sb().auth.getSession();if(error)throw error;
  if(!session){if(pending===result){$('saveStatus').textContent='Entra con tu cuenta para guardar esta partida.';$('saveScore').hidden=false;$('saveScore').textContent='Entrar y guardar'}return}
  if(pending===result)$('saveStatus').textContent='Guardando resultado…';
  const {error:failure}=await sb().rpc('submit_quien_es_score',result);if(failure)throw failure;
  if(pending===result){result.saved=true;$('saveStatus').textContent='Resultado guardado en el ranking.'}
 }catch(e){if(pending===result){$('saveStatus').textContent=explain(e);$('saveScore').hidden=false;$('saveScore').textContent='Reintentar guardado'}}
 finally{if(pending===result)saving=false}
}
async function loadPlayers(token){
 const response=await fetch(`${URL}/functions/v1/account-auth`,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({action:'registered_players'})});
 const data=await response.json();if(!response.ok||data.ok!==true)throw Error(data.error||'No se pudieron cargar los jugadores.');
 if(token!==view)return;
 $('rankingPlayer').replaceChildren(...(data.players||[]).map(p=>{const o=node('option',p.nickname);o.value=p.id;return o}));
}
async function loadRanking(){
 const token=++view;$('rankingList').textContent='Cargando…';$('rankingLogin').hidden=true;
 try{
  const {data:{session},error}=await sb().auth.getSession();if(error)throw error;if(token!==view)return;
  if(!session){$('rankingList').textContent='Usa tu cuenta de Patxanguilles, la misma que en Memoria Vintage.';$('rankingLogin').hidden=false;await loadPlayers(token);return}
  const {data,error:failure}=await sb().rpc('get_quien_es_leaderboard',{p_limit:50});if(failure)throw failure;if(token!==view)return;
  $('rankingList').replaceChildren();
  if(!data?.length){$('rankingList').textContent='Todavía no hay resultados. ¡Estrena el ranking!';return}
  for(const r of data){
   const row=node('div',undefined,'rank-row');row.append(node('b',String(r.rank_position),'rank-num'));
   const avatar=node('img',undefined,'rank-avatar');avatar.alt='';
   if(r.photo_url&&/^https?:\/\//i.test(r.photo_url))avatar.src=r.photo_url;else avatar.hidden=true;
   avatar.addEventListener('error',()=>{avatar.style.visibility='hidden'});
   const info=node('div',undefined,'rank-name');info.append(node('div',r.nickname||'Jugador'));
   info.append(node('div',`${r.best_correct}/10 aciertos · ${new Date(r.record_created_at).toLocaleDateString('es-ES')}`,'rank-meta'));
   row.append(avatar,info,node('b',`${Number(r.best_points).toLocaleString('es-ES')} pts`,'rank-points'));$('rankingList').append(row);
  }
 }catch(e){if(token===view)$('rankingList').textContent=explain(e)}
}
function openRanking(){lastFocus=document.activeElement;$('ranking').classList.add('open');$('closeRanking').focus();loadRanking()}
function closeRanking(){view++;$('ranking').classList.remove('open');lastFocus?.focus()}
$('viewRanking').addEventListener('click',openRanking);$('closeRanking').addEventListener('click',closeRanking);
$('refreshRanking').addEventListener('click',loadRanking);
$('ranking').addEventListener('click',e=>{if(e.target===$('ranking'))closeRanking()});
$('ranking').addEventListener('keydown',e=>{if(e.key==='Escape')closeRanking()});
$('saveScore').addEventListener('click',async()=>{try{const {data:{session}}=await sb().auth.getSession();if(session)await save();else openRanking()}catch(e){$('saveStatus').textContent=explain(e)}});
$('rankingLogin').addEventListener('submit',async e=>{
 e.preventDefault();const button=$('rankingLoginBtn');button.disabled=true;$('rankingAuthStatus').textContent='Entrando…';
 try{
  const response=await fetch(`${URL}/functions/v1/account-auth`,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({action:'login',player_id:Number($('rankingPlayer').value),password:$('rankingPassword').value})});
  const data=await response.json();if(!response.ok||data.ok!==true)throw Error(data.error||'No se pudo iniciar sesión.');
  const {error}=await sb().auth.setSession({access_token:data.session.access_token,refresh_token:data.session.refresh_token});if(error)throw error;
  $('rankingPassword').value='';$('rankingAuthStatus').textContent='';
  if(pending&&!pending.saved)await save();await loadRanking();
 }catch(e){$('rankingAuthStatus').textContent=explain(e)}finally{button.disabled=false}
});
