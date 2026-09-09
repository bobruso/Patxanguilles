(() => {
  'use strict';

  const games = [
    ['stop-seven','Stop 7','timing','Detén el cronómetro lo más cerca posible de 7 segundos.'],
    ['reaction','Reacción','reflex','Espera a que aparezca el balón y tócalo lo más rápido posible.'],
    ['center-hit','Clava el centro','precision','Encadena centros acertados mientras la barra acelera.'],
    ['speed-tap','Speed Tap','speed','Haz tantos toques como puedas durante cinco segundos.'],
    ['color-reflex','Color Reflex','reflex','Ignora la palabra y responde al color real de la tinta.'],
    ['quick-maths','Quick Maths','logic','Resuelve operaciones cada vez más difíciles hasta fallar.'],
    ['grid-memory','Grid Memory','memory','Memoriza patrones en cuadrículas que crecen de tamaño.'],
    ['sequence','Secuencia','memory','Observa y repite secuencias cada vez más largas y complejas.'],
    ['football-trivia','Trivial futbolero','football','10 preguntas, 15 segundos cada una: aciertos y velocidad suman puntos.'],
    ['cups','Cups','memory','Sigue la bola y encadena aciertos; un fallo termina la partida.'],
    ['memory-cards','Memory Cards','memory','Encuentra 12 parejas de cromos vintage en el menor tiempo posible.'],
    ['tower-stack','Tower Stack','precision','Construye la torre más alta mientras la cámara sube contigo.'],
    ['zig-zag','Zig Zag','arcade','Sigue un camino de curvas que aumenta progresivamente de dificultad.'],
    ['lane-rush','Lane Rush','arcade','Cambia de carril y esquiva obstáculos.'],
    ['arrow-rush','Arrow Rush','reflex','Responde a la dirección que aparece antes de que cambie.'],
    ['drop-zone','Drop Zone','precision','Suelta la bola justo cuando esté alineada con el hueco.'],
    ['orbit-pins','Orbit Pins','precision','Lanza clavijas al objetivo giratorio sin chocar.'],
    ['rhythm-tap','Rhythm Tap','timing','Toca siguiendo el pulso con la mayor precisión posible.'],
    ['shape-gate','Shape Gate','reflex','Elige rápidamente la figura que coincide con el objetivo.'],
    ['snake-sprint','Snake Sprint','arcade','Guía la serpiente, recoge puntos y evita chocar.'],
    ['odd-one','Odd One','reflex','Encuentra el único símbolo diferente.'],
    ['flash-count','Flash Count','memory','Cuenta los destellos y responde cuántos has visto.'],
    ['balance','Balance','precision','Mantén la aguja dentro de la zona segura.'],
    ['target-lock','Target Lock','timing','Toca cuando el anillo coincida con el objetivo.'],
    ['swipe-sort','Swipe Sort','reflex','Clasifica cada número con un gesto rápido izquierda/derecha.'],
    ['catch-drop','Catch Drop','arcade','Mueve la cesta y atrapa los objetos que caen.']
  ].map(([id,name,category,description],index)=>({id,name,category,description,index:index+1}));

  const categoryNames = {
    timing:'TIEMPO', reflex:'REFLEJOS', precision:'PRECISIÓN', speed:'VELOCIDAD',
    logic:'LÓGICA', memory:'MEMORIA', football:'FÚTBOL', arcade:'ARCADE'
  };
  const STORAGE_KEY = 'patx_admin_game_feedback_v1';
  const $ = id => document.getElementById(id);
  const els = {
    identity:$('identity'), search:$('search'), category:$('categoryFilter'), status:$('statusFilter'),
    grid:$('gamesGrid'), visible:$('visibleCount'), feedback:$('feedbackCount'), copy:$('copySummary'), toast:$('toast')
  };
  let feedback = loadFeedback();

  function esc(value){return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}
  function loadFeedback(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{};}catch(_){return {};}}
  function saveFeedback(){localStorage.setItem(STORAGE_KEY,JSON.stringify(feedback));updateCounts();}
  function toast(message){els.toast.textContent=message;els.toast.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>els.toast.classList.remove('show'),1500);}
  function gameState(id){return feedback[id]?.status||'';}

  function updateCounts(visible){
    const valued=games.filter(g=>gameState(g.id)).length;
    els.feedback.textContent=`${valued} valorado${valued===1?'':'s'}`;
    if(Array.isArray(visible)) els.visible.textContent=`${visible.length} juego${visible.length===1?'':'s'}`;
  }

  function matchesFilters(game){
    const term=els.search.value.trim().toLowerCase();
    const category=els.category.value;
    const status=els.status.value;
    const state=gameState(game.id);
    if(term && !`${game.name} ${game.id} ${game.description} ${categoryNames[game.category]}`.toLowerCase().includes(term)) return false;
    if(category && game.category!==category) return false;
    if(status==='sin-valorar' && state) return false;
    if(status && status!=='sin-valorar' && state!==status) return false;
    return true;
  }

  function cardHtml(game){
    const state=gameState(game.id);
    const note=feedback[game.id]?.note||'';
    return `<article class="game-card" data-game="${esc(game.id)}" data-category="${esc(game.category)}">
      <div class="game-top"><span class="game-number">#${String(game.index).padStart(2,'0')}</span><span class="category">${esc(categoryNames[game.category]||game.category)}</span></div>
      <div class="game-name">${esc(game.name)}</div>
      <div class="game-desc">${esc(game.description)}</div>
      <a class="demo-button" href="./?demo=${encodeURIComponent(game.id)}" target="_blank" rel="noopener">PROBAR DEMO ↗</a>
      <div class="feedback-label">TU VALORACIÓN</div>
      <div class="feedback-buttons">
        <button class="feedback-btn ${state==='ok'?'active':''}" type="button" data-status="ok">✓ OK</button>
        <button class="feedback-btn ${state==='retocar'?'active':''}" type="button" data-status="retocar">~ RETOCAR</button>
        <button class="feedback-btn ${state==='fuera'?'active':''}" type="button" data-status="fuera">× FUERA</button>
      </div>
      <textarea class="feedback-note" data-note placeholder="Nota opcional: qué cambiarías…">${esc(note)}</textarea>
    </article>`;
  }

  function render(){
    const visible=games.filter(matchesFilters);
    els.grid.innerHTML=visible.length?visible.map(cardHtml).join(''):'<div class="empty">No hay juegos con estos filtros.</div>';
    els.grid.querySelectorAll('.game-card').forEach(card=>{
      const id=card.dataset.game;
      card.querySelectorAll('[data-status]').forEach(btn=>btn.addEventListener('click',()=>{
        const selected=btn.dataset.status;
        const current=gameState(id);
        feedback[id]={...(feedback[id]||{}),status:current===selected?'':selected};
        if(!feedback[id].status && !feedback[id].note) delete feedback[id];
        saveFeedback();render();
      }));
      const note=card.querySelector('[data-note]');
      note.addEventListener('input',()=>{
        feedback[id]={...(feedback[id]||{}),note:note.value};
        if(!feedback[id].status && !feedback[id].note.trim()) delete feedback[id];
        saveFeedback();
      });
    });
    updateCounts(visible);
  }

  function summaryText(){
    const labels={ok:'OK',retocar:'RETOCAR',fuera:'FUERA'};
    const lines=['FEEDBACK MINIJUEGOS PATXANGUILLES',''];
    ['ok','retocar','fuera'].forEach(status=>{
      const rows=games.filter(g=>gameState(g.id)===status);
      lines.push(`${labels[status]} (${rows.length})`);
      if(!rows.length) lines.push('- Ninguno');
      rows.forEach(g=>{
        const note=(feedback[g.id]?.note||'').trim();
        lines.push(`- ${g.name}${note?`: ${note}`:''}`);
      });
      lines.push('');
    });
    const pending=games.filter(g=>!gameState(g.id));
    lines.push(`SIN VALORAR (${pending.length})`);
    if(pending.length) lines.push(pending.map(g=>g.name).join(', '));
    lines.push('','DESCARTADO PREVIAMENTE','- Higher or Lower');
    return lines.join('\n');
  }

  async function copySummary(){
    const text=summaryText();
    try{await navigator.clipboard.writeText(text);toast('Feedback copiado');}
    catch(_){
      const area=document.createElement('textarea');area.value=text;document.body.appendChild(area);area.select();document.execCommand('copy');area.remove();toast('Feedback copiado');
    }
  }

  async function init(){
    const state=await window.PatxAuth.requireAdmin({returnTo:location.href});
    if(!state)return;
    els.identity.textContent=`ADMIN · ${state.nickname||'Patxanguilles'}`;
    const cats=[...new Set(games.map(g=>g.category))];
    els.category.innerHTML='<option value="">Todas las categorías</option>'+cats.map(c=>`<option value="${c}">${categoryNames[c]||c}</option>`).join('');
    els.search.addEventListener('input',render);els.category.addEventListener('change',render);els.status.addEventListener('change',render);els.copy.addEventListener('click',copySummary);
    render();
  }

  init().catch(error=>{console.error(error);els.grid.innerHTML=`<div class="empty">${esc(error.message||'No se pudo abrir el laboratorio.')}</div>`;});
})();