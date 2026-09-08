(() => {
  'use strict';

  const auth = window.PatxAuth;
  const db = auth.getClient();
  const $ = id => document.getElementById(id);
  const els = {
    identity:$('identity'), form:$('triviaForm'), id:$('questionId'), question:$('question'),
    answers:[0,1,2,3].map(i=>$(`answer${i}`)), correct:[0,1,2,3].map(i=>$(`correct${i}`)),
    category:$('category'), difficulty:$('difficulty'), explanation:$('explanation'), active:$('active'),
    save:$('saveButton'), reset:$('resetButton'), remove:$('deleteButton'), status:$('status'),
    list:$('questionList'), search:$('search'), filter:$('filterCategory'), counter:$('counter')
  };

  let questions = [];

  function esc(value){return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}
  function setStatus(message,error=false){els.status.textContent=message||'';els.status.classList.toggle('error',error);els.status.hidden=!message;}

  async function rpc(name,args){
    const {data,error}=await db.rpc(name,args);
    if(error) throw error;
    return data;
  }

  function resetForm(){
    els.id.value='';els.question.value='';els.answers.forEach(a=>a.value='');els.correct.forEach((r,i)=>r.checked=i===0);
    els.category.value='Fútbol internacional';els.difficulty.value='media';els.explanation.value='';els.active.checked=true;
    els.remove.hidden=true;els.save.textContent='GUARDAR PREGUNTA';setStatus('');
  }

  function editQuestion(id){
    const q=questions.find(item=>Number(item.id)===Number(id));if(!q)return;
    els.id.value=q.id;els.question.value=q.question||'';
    const answers=Array.isArray(q.answers)?q.answers:[];els.answers.forEach((a,i)=>a.value=answers[i]||'');
    els.correct.forEach((r,i)=>r.checked=Number(q.correct_index)===i);
    els.category.value=q.category||'Fútbol internacional';els.difficulty.value=q.difficulty||'media';
    els.explanation.value=q.explanation||'';els.active.checked=Boolean(q.active);els.remove.hidden=false;els.save.textContent='ACTUALIZAR PREGUNTA';
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function render(){
    const term=els.search.value.trim().toLowerCase();
    const cat=els.filter.value;
    const rows=questions.filter(q=>(!term||`${q.question} ${q.category}`.toLowerCase().includes(term))&&(!cat||q.category===cat));
    els.counter.textContent=`${rows.length} / ${questions.length}`;
    if(!rows.length){els.list.innerHTML='<div class="empty">No hay preguntas con ese filtro.</div>';return;}
    els.list.innerHTML=rows.map(q=>`<article class="question-card ${q.active?'':'inactive'}" data-id="${q.id}">
      <div class="q-top"><div class="q-text">${esc(q.question)}</div><div>#${q.id}</div></div>
      <div class="badges"><span class="badge ${q.active?'active':''}">${q.active?'ACTIVA':'INACTIVA'}</span><span class="badge">${esc(q.category)}</span><span class="badge">${esc(q.difficulty)}</span></div>
      <div class="q-meta">Correcta: ${esc((Array.isArray(q.answers)?q.answers:[])[Number(q.correct_index)]||'—')}</div>
    </article>`).join('');
    els.list.querySelectorAll('[data-id]').forEach(card=>card.addEventListener('click',()=>editQuestion(card.dataset.id)));
  }

  async function load(){
    setStatus('Cargando preguntas…');
    questions=await rpc('admin_list_trivia_questions');
    const categories=[...new Set(questions.map(q=>q.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
    els.filter.innerHTML='<option value="">Todas las categorías</option>'+categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
    render();setStatus('');
  }

  async function save(event){
    event.preventDefault();setStatus('');
    const answers=els.answers.map(a=>a.value.trim());
    if(!els.question.value.trim()||answers.some(a=>!a)){setStatus('Completa la pregunta y las cuatro respuestas.',true);return;}
    const correct=els.correct.findIndex(r=>r.checked);
    els.save.disabled=true;
    try{
      await rpc('admin_upsert_trivia_question',{
        p_id:els.id.value?Number(els.id.value):null,
        p_question:els.question.value.trim(),p_answers:answers,p_correct_index:correct,
        p_category:els.category.value.trim()||'Fútbol internacional',p_difficulty:els.difficulty.value,
        p_explanation:els.explanation.value.trim()||null,p_active:els.active.checked
      });
      resetForm();await load();setStatus('Pregunta guardada.');
    }catch(error){setStatus(error.message||'No se pudo guardar.',true);}finally{els.save.disabled=false;}
  }

  async function remove(){
    const id=Number(els.id.value);if(!id)return;
    if(!window.confirm('¿Eliminar esta pregunta definitivamente?'))return;
    try{await rpc('admin_delete_trivia_question',{p_id:id});resetForm();await load();setStatus('Pregunta eliminada.');}
    catch(error){setStatus(error.message||'No se pudo eliminar.',true);}
  }

  async function init(){
    const state=await auth.requireAdmin({returnTo:location.href});if(!state)return;
    els.identity.textContent=`ADMIN · ${state.nickname||'Patxanguilles'}`;
    els.form.addEventListener('submit',save);els.reset.addEventListener('click',resetForm);els.remove.addEventListener('click',remove);
    els.search.addEventListener('input',render);els.filter.addEventListener('change',render);
    resetForm();await load();
  }

  init().catch(error=>setStatus(error.message||'No se pudo abrir el administrador.',true));
})();