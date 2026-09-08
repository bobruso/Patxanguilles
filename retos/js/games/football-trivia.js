(() => {
  'use strict';

  window.PatxGameRegistry.register('football-trivia', ({ container, config = {}, attemptId = null, onFinish }) => {
    const service = window.PatxChallengeService;
    const timeoutMs = Number(config.question_timeout_ms || 8000);
    const wanted = Number(config.questions || 5);
    const demoQuestions = [
      {question_id:-1,question:'¿Qué selección ganó el Mundial de 2010?',answers:['España','Alemania','Países Bajos','Brasil'],category:'Mundiales',difficulty:'fácil',correct_index:0},
      {question_id:-2,question:'¿A qué distancia está el punto de penalti?',answers:['9 m','10 m','11 m','12 m'],category:'Reglamento',difficulty:'media',correct_index:2},
      {question_id:-3,question:'¿Quién marcó el gol de la final del Mundial de 2010?',answers:['Villa','Xavi','Iniesta','Torres'],category:'Mundiales',difficulty:'fácil',correct_index:2},
      {question_id:-4,question:'¿Qué selección ganó el Mundial de 2022?',answers:['Francia','Argentina','Croacia','Brasil'],category:'Mundiales',difficulty:'fácil',correct_index:1},
      {question_id:-5,question:'¿Cuántos jugadores tiene cada equipo al inicio de un partido de fútbol 11?',answers:['9','10','11','12'],category:'Reglamento',difficulty:'fácil',correct_index:2}
    ];

    let questions = [], index = 0, responses = [], startedAt = 0, questionStartedAt = 0;
    let timeout = 0, raf = 0, finished = false, locked = false, demoScore = 0;

    container.innerHTML = `
      <div class="trivia-surface">
        <div class="trivia-top"><span data-progress>Preparando…</span><span data-category></span></div>
        <div class="trivia-timer"><div data-timer></div></div>
        <div class="trivia-question" data-question>Cargando preguntas…</div>
        <div class="trivia-answers" data-answers></div>
        <div class="trivia-help" data-help>${attemptId ? 'La solución se corrige en el servidor.' : 'Demo local.'}</div>
      </div>`;

    const progress = container.querySelector('[data-progress]');
    const category = container.querySelector('[data-category]');
    const timerBar = container.querySelector('[data-timer]');
    const questionEl = container.querySelector('[data-question]');
    const answersEl = container.querySelector('[data-answers]');
    const help = container.querySelector('[data-help]');

    function clearTimers(){ clearTimeout(timeout); cancelAnimationFrame(raf); }

    function tick(now){
      if (finished || locked) return;
      const elapsed = now - questionStartedAt;
      const remaining = Math.max(0, 1 - elapsed / timeoutMs);
      timerBar.style.transform = `scaleX(${remaining})`;
      if (remaining > 0) raf = requestAnimationFrame(tick);
    }

    function scoreDemo(q, answerIndex, responseMs){
      if (answerIndex !== Number(q.correct_index)) return 0;
      return Math.max(200, 1000 - Math.min(800, Math.floor(responseMs / 10)));
    }

    function finish(){
      if (finished) return;
      finished = true;
      locked = true;
      clearTimers();
      questionEl.textContent = 'Resultado registrando…';
      answersEl.innerHTML = '';
      help.textContent = attemptId ? 'Supabase está corrigiendo tus respuestas.' : `Puntuación demo: ${demoScore} pts`;
      onFinish({
        score: attemptId ? 0 : demoScore,
        duration: performance.now() - startedAt,
        metadata: { answers: responses }
      });
    }

    function next(){
      index += 1;
      if (index >= questions.length) return setTimeout(finish, 300);
      setTimeout(renderQuestion, 280);
    }

    function answer(answerIndex){
      if (locked || finished) return;
      locked = true;
      clearTimers();
      const q = questions[index];
      const responseMs = Math.max(0, Math.min(timeoutMs, Math.round(performance.now() - questionStartedAt)));
      responses.push({ question_id:Number(q.question_id), answer_index:Number(answerIndex), response_ms:responseMs });
      if (!attemptId) demoScore += scoreDemo(q, Number(answerIndex), responseMs);
      [...answersEl.querySelectorAll('button')].forEach((btn,i)=>{
        btn.disabled = true;
        if (i === answerIndex) btn.classList.add('selected');
        if (!attemptId && i === Number(q.correct_index)) btn.classList.add('right');
        if (!attemptId && i === answerIndex && i !== Number(q.correct_index)) btn.classList.add('wrong');
      });
      help.textContent = answerIndex < 0 ? 'Tiempo agotado.' : attemptId ? 'Respuesta registrada.' : answerIndex === Number(q.correct_index) ? 'Correcto.' : 'Incorrecto.';
      next();
    }

    function renderQuestion(){
      if (finished) return;
      locked = false;
      const q = questions[index];
      progress.textContent = `Pregunta ${index + 1} / ${questions.length}`;
      category.textContent = `${q.category || 'Fútbol'} · ${q.difficulty || ''}`;
      questionEl.textContent = q.question;
      const opts = Array.isArray(q.answers) ? q.answers : [];
      answersEl.innerHTML = opts.map((text,i)=>`<button type="button" data-answer="${i}"><span>${String.fromCharCode(65+i)}</span>${String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}</button>`).join('');
      help.textContent = attemptId ? 'Elige una respuesta antes de que se agote el tiempo.' : 'Modo demo.';
      timerBar.style.transform = 'scaleX(1)';
      questionStartedAt = performance.now();
      raf = requestAnimationFrame(tick);
      timeout = setTimeout(()=>answer(-1), timeoutMs);
    }

    function press(event){
      const button = event.target.closest('[data-answer]');
      if (!button) return;
      answer(Number(button.dataset.answer));
    }
    answersEl.addEventListener('click', press);

    async function load(){
      try{
        questions = attemptId ? await service.getTriviaQuestions(attemptId) : demoQuestions.slice(0,wanted);
        if (!Array.isArray(questions) || !questions.length) throw new Error('No hay preguntas disponibles.');
        index = 0;
        renderQuestion();
      }catch(error){
        locked = true;
        questionEl.textContent = 'No se pudieron cargar las preguntas';
        answersEl.innerHTML = '';
        help.textContent = error.message || 'Error de conexión.';
      }
    }

    return {
      start(){ startedAt = performance.now(); load(); },
      destroy(){ finished = true; clearTimers(); answersEl.removeEventListener('click', press); }
    };
  });
})();