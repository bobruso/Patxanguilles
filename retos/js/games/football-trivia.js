(() => {
  'use strict';

  window.PatxGameRegistry.register('football-trivia', ({ container, config = {}, attemptId = null, onFinish }) => {
    const service = window.PatxChallengeService;
    const timeoutMs = Number(config.question_timeout_ms || 15000);
    const wanted = Math.min(10, Number(config.questions || 10));
    const maxPerCorrect = Number(config.points_max_per_correct || 1000);
    const minPerCorrect = Number(config.points_min_per_correct || 250);

    const demoQuestions = [
      {question_id:-1,question:'¿Quién marcó el gol de la victoria en la final del Mundial de 2014?',answers:['Miroslav Klose','André Schürrle','Thomas Müller','Mario Götze'],category:'Mundial',difficulty:'media',correct_index:3},
      {question_id:-2,question:'¿Cuál fue la primera selección africana en alcanzar unas semifinales de un Mundial?',answers:['Senegal','Marruecos','Camerún','Ghana'],category:'Mundial',difficulty:'media',correct_index:1},
      {question_id:-3,question:'¿Quién marcó el gol de oro de la final de la Eurocopa de 1996?',answers:['Jürgen Klinsmann','Matthias Sammer','Andreas Möller','Oliver Bierhoff'],category:'Eurocopa',difficulty:'media',correct_index:3},
      {question_id:-4,question:'¿En qué estadio se disputó la famosa final de Champions de 2005 entre Liverpool y Milan?',answers:['Wembley','Estadio Olímpico Atatürk','Olímpico de Roma','Luzhniki'],category:'Champions',difficulty:'media',correct_index:1},
      {question_id:-5,question:'¿Contra qué equipo ganó el Manchester City su primera Champions en 2023?',answers:['Inter de Milán','Bayern de Múnich','AC Milan','Real Madrid'],category:'Champions',difficulty:'media',correct_index:0},
      {question_id:-6,question:'¿Qué club inglés fue el primero en ganar la Copa de Europa?',answers:['Aston Villa','Manchester United','Nottingham Forest','Liverpool'],category:'Historia',difficulty:'media',correct_index:1},
      {question_id:-7,question:'¿Quién ejecutó el famoso penalti a lo Panenka en la final de la Eurocopa de 1976?',answers:['Uli Hoeneß','Franz Beckenbauer','Antonín Panenka','Zdeněk Nehoda'],category:'Historia',difficulty:'media',correct_index:2},
      {question_id:-8,question:'¿Qué dorsal hizo especialmente famoso Johan Cruyff?',answers:['9','10','7','14'],category:'Jugadores',difficulty:'media',correct_index:3},
      {question_id:-9,question:'¿Qué selección representó Pavel Nedvěd?',answers:['Austria','Polonia','Eslovaquia','República Checa'],category:'Jugadores',difficulty:'media',correct_index:3},
      {question_id:-10,question:'¿Quién entrenaba al Porto campeón de Europa en 2004?',answers:['José Mourinho','Luiz Felipe Scolari','Carlo Ancelotti','André Villas-Boas'],category:'Champions',difficulty:'media',correct_index:0}
    ];

    let questions = [];
    let index = 0;
    let correctCount = 0;
    let totalScore = 0;
    let startedAt = 0;
    let questionStartedAt = 0;
    let timeout = 0;
    let raf = 0;
    let finished = false;
    let locked = true;

    container.innerHTML = `
      <div class="trivia-surface scored-trivia-surface">
        <div class="trivia-top">
          <span data-progress>Preparando…</span>
          <span data-category></span>
        </div>
        <div class="trivia-score-row">
          <span class="trivia-score-pill" data-correct>ACIERTOS · 0 / ${wanted}</span>
          <span class="trivia-score-pill strong" data-score>0 PTS</span>
          <span class="trivia-score-pill timer" data-seconds>15.0 s</span>
        </div>
        <div class="trivia-timer"><div data-timer></div></div>
        <div class="trivia-question" data-question>Cargando preguntas…</div>
        <div class="trivia-answers" data-answers></div>
        <div class="trivia-feedback" data-feedback aria-live="assertive"></div>
        <div class="trivia-help" data-help>${attemptId ? 'Cada respuesta se corrige en el servidor.' : 'Práctica · no puntúa.'}</div>
      </div>`;

    const progress = container.querySelector('[data-progress]');
    const category = container.querySelector('[data-category]');
    const correctEl = container.querySelector('[data-correct]');
    const scoreEl = container.querySelector('[data-score]');
    const secondsEl = container.querySelector('[data-seconds]');
    const timerBar = container.querySelector('[data-timer]');
    const questionEl = container.querySelector('[data-question]');
    const answersEl = container.querySelector('[data-answers]');
    const feedbackEl = container.querySelector('[data-feedback]');
    const help = container.querySelector('[data-help]');

    const esc = value => String(value ?? '')
      .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

    function clearTimers(){ clearTimeout(timeout); cancelAnimationFrame(raf); }

    function pointsFor(responseMs){
      const clamped = Math.max(0, Math.min(timeoutMs, Number(responseMs)||0));
      const range = Math.max(0, maxPerCorrect-minPerCorrect);
      return Math.max(minPerCorrect, maxPerCorrect-Math.floor((clamped/timeoutMs)*range));
    }

    function tick(now){
      if (finished || locked) return;
      const elapsed = now-questionStartedAt;
      const remainingMs = Math.max(0, timeoutMs-elapsed);
      timerBar.style.transform = `scaleX(${Math.max(0,remainingMs/timeoutMs)})`;
      secondsEl.textContent = `${(remainingMs/1000).toFixed(1)} s`;
      if (remainingMs > 0) raf = requestAnimationFrame(tick);
    }

    function setFeedback(type,title,sub=''){
      feedbackEl.className = `trivia-feedback show ${type}`;
      feedbackEl.innerHTML = `<strong>${esc(title)}</strong>${sub?`<span>${esc(sub)}</span>`:''}`;
    }

    function clearFeedback(){
      feedbackEl.className='trivia-feedback';
      feedbackEl.innerHTML='';
    }

    function paintAnswers(chosenIndex,correctIndex){
      [...answersEl.querySelectorAll('button')].forEach((btn,i)=>{
        btn.disabled=true;
        btn.classList.remove('right','wrong','selected');
        if(i===Number(correctIndex)) btn.classList.add('right');
        else btn.classList.add('wrong');
        if(i===chosenIndex) btn.classList.add('selected');
      });
    }

    function updateScoreboard(){
      correctEl.textContent=`ACIERTOS · ${correctCount} / ${wanted}`;
      scoreEl.textContent=`${Math.round(totalScore)} PTS`;
    }

    function finish(){
      if(finished)return;
      finished=true;
      locked=true;
      clearTimers();
      questionEl.textContent=`${correctCount} de ${wanted} correctas`;
      answersEl.innerHTML='';
      setFeedback(correctCount===wanted?'correct':'neutral','TRIVIAL COMPLETADO',`${Math.round(totalScore)} puntos`);
      help.textContent='La puntuación combina aciertos y velocidad de respuesta.';
      setTimeout(()=>onFinish({
        score:attemptId?0:totalScore,
        duration:performance.now()-startedAt,
        metadata:{correct_count:correctCount,total_score:Math.round(totalScore),questions:wanted}
      }),650);
    }

    function next(){
      index+=1;
      if(index>=questions.length || index>=wanted)return setTimeout(finish,450);
      setTimeout(renderQuestion,850);
    }

    async function resolveOfficial(q,answerIndex,responseMs){
      try{
        const result=await service.answerTriviaQuestion(attemptId,q.question_id,answerIndex,responseMs);
        if(!result)throw new Error('No se pudo corregir la respuesta.');
        const isCorrect=Boolean(result.correct);
        correctCount=Number(result.correct_count)||0;
        totalScore=Number(result.total_score)||0;
        paintAnswers(answerIndex,result.correct_index);
        updateScoreboard();
        if(isCorrect){
          setFeedback('correct','¡CORRECTO!',`+${Number(result.points_awarded)||0} puntos`);
          help.textContent='La respuesta correcta está en verde.';
        }else{
          setFeedback(answerIndex<0?'timeout':'wrong',answerIndex<0?'¡TIEMPO!':'¡FALLO!','0 puntos');
          help.textContent='La respuesta correcta está en verde; las demás, en rojo.';
        }
        if(result.finished)return setTimeout(finish,1250);
        next();
      }catch(error){
        console.error('[Trivial] Error corrigiendo respuesta',error);
        help.textContent='No se pudo corregir por conexión. Reintentando…';
        setTimeout(()=>{if(!finished)resolveOfficial(q,answerIndex,responseMs);},900);
      }
    }

    function resolveDemo(q,answerIndex,responseMs){
      const correctIndex=Number(q.correct_index);
      const isCorrect=answerIndex===correctIndex && responseMs<=timeoutMs;
      const awarded=isCorrect?pointsFor(responseMs):0;
      if(isCorrect)correctCount+=1;
      totalScore+=awarded;
      paintAnswers(answerIndex,correctIndex);
      updateScoreboard();
      if(isCorrect){
        setFeedback('correct','¡CORRECTO!',`+${awarded} puntos`);
        help.textContent='Más rapidez = más puntos.';
      }else{
        setFeedback(answerIndex<0?'timeout':'wrong',answerIndex<0?'¡TIEMPO!':'¡FALLO!','0 puntos');
        help.textContent='La respuesta correcta está en verde; las demás, en rojo.';
      }
      next();
    }

    function answer(answerIndex){
      if(locked||finished)return;
      locked=true;
      clearTimers();
      const q=questions[index];
      const responseMs=Math.max(0,Math.min(timeoutMs,Math.round(performance.now()-questionStartedAt)));
      if(attemptId)resolveOfficial(q,Number(answerIndex),responseMs);
      else resolveDemo(q,Number(answerIndex),responseMs);
    }

    function renderQuestion(){
      if(finished)return;
      locked=false;
      clearFeedback();
      const q=questions[index];
      progress.textContent=`Pregunta ${index+1} / ${wanted}`;
      category.textContent=`${q.category||'Fútbol'} · ${q.difficulty||'media'}`;
      questionEl.textContent=q.question;
      const opts=Array.isArray(q.answers)?q.answers:[];
      answersEl.innerHTML=opts.map((text,i)=>`<button type="button" data-answer="${i}"><span>${String.fromCharCode(65+i)}</span><b>${esc(text)}</b></button>`).join('');
      help.textContent='Tienes 15 segundos. Acertar rápido da más puntos.';
      timerBar.style.transform='scaleX(1)';
      secondsEl.textContent='15.0 s';
      questionStartedAt=performance.now();
      raf=requestAnimationFrame(tick);
      timeout=setTimeout(()=>answer(-1),timeoutMs);
    }

    function press(event){
      const button=event.target.closest('[data-answer]');
      if(!button||button.disabled)return;
      event.preventDefault();
      answer(Number(button.dataset.answer));
    }

    answersEl.addEventListener('pointerdown',press,{passive:false});

    async function load(){
      try{
        questions=attemptId?await service.getTriviaQuestions(attemptId):demoQuestions.slice(0,wanted);
        if(!Array.isArray(questions)||questions.length<wanted)throw new Error('No hay suficientes preguntas disponibles.');
        questions=questions.slice(0,wanted);
        index=0;correctCount=0;totalScore=0;updateScoreboard();renderQuestion();
      }catch(error){
        locked=true;
        questionEl.textContent='No se pudieron cargar las preguntas';
        answersEl.innerHTML='';
        help.textContent=error.message||'Error de conexión.';
      }
    }

    return{
      start(){startedAt=performance.now();load();},
      destroy(){finished=true;clearTimers();answersEl.removeEventListener('pointerdown',press);}
    };
  });
})();