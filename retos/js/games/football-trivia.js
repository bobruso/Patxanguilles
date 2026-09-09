(() => {
  'use strict';

  window.PatxGameRegistry.register('football-trivia', ({ container, config = {}, attemptId = null, onFinish }) => {
    const service = window.PatxChallengeService;
    const startTimeoutMs = Number(config.start_timeout_ms || 9000);
    const minTimeoutMs = Number(config.min_timeout_ms || 5000);
    const decrementMs = Number(config.timeout_decrement_ms || 400);

    // Banco de práctica separado del reto oficial: permite aprender la mecánica
    // sin revelar la secuencia diaria ni enviar soluciones del intento real al cliente.
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
      {question_id:-10,question:'¿Quién entrenaba al Porto campeón de Europa en 2004?',answers:['José Mourinho','Luiz Felipe Scolari','Carlo Ancelotti','André Villas-Boas'],category:'Champions',difficulty:'media',correct_index:0},
      {question_id:-11,question:'¿Desde cuál de estas reanudaciones no puede existir fuera de juego directamente?',answers:['Balón a tierra','Saque de esquina','Tiro libre directo','Tiro libre indirecto'],category:'Reglas',difficulty:'media',correct_index:1},
      {question_id:-12,question:'¿Qué club ha ganado más Copas Libertadores?',answers:['Peñarol','River Plate','Boca Juniors','Independiente'],category:'Libertadores',difficulty:'media',correct_index:3}
    ];

    let questions = [], index = 0, streak = 0, startedAt = 0, questionStartedAt = 0;
    let timeout = 0, raf = 0, finished = false, locked = false;
    let currentTimeoutMs = startTimeoutMs;

    container.innerHTML = `
      <div class="trivia-surface streak-trivia-surface">
        <div class="trivia-top">
          <span data-progress>Preparando…</span>
          <span data-category></span>
        </div>
        <div class="trivia-streak-row">
          <span class="trivia-streak" data-streak>RACHA · 0</span>
          <span class="trivia-seconds" data-seconds>${(startTimeoutMs/1000).toFixed(1)} s</span>
        </div>
        <div class="trivia-timer"><div data-timer></div></div>
        <div class="trivia-question" data-question>Cargando preguntas…</div>
        <div class="trivia-answers" data-answers></div>
        <div class="trivia-help" data-help>${attemptId ? 'Una respuesta incorrecta termina el intento.' : 'Práctica · una respuesta incorrecta termina la racha.'}</div>
      </div>`;

    const progress = container.querySelector('[data-progress]');
    const category = container.querySelector('[data-category]');
    const streakEl = container.querySelector('[data-streak]');
    const secondsEl = container.querySelector('[data-seconds]');
    const timerBar = container.querySelector('[data-timer]');
    const questionEl = container.querySelector('[data-question]');
    const answersEl = container.querySelector('[data-answers]');
    const help = container.querySelector('[data-help]');

    const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
    function timeoutFor(roundIndex){ return Math.max(minTimeoutMs, startTimeoutMs - roundIndex * decrementMs); }
    function clearTimers(){ clearTimeout(timeout); cancelAnimationFrame(raf); }

    function tick(now){
      if (finished || locked) return;
      const elapsed = now - questionStartedAt;
      const remainingMs = Math.max(0, currentTimeoutMs - elapsed);
      timerBar.style.transform = `scaleX(${Math.max(0, remainingMs/currentTimeoutMs)})`;
      secondsEl.textContent = `${(remainingMs/1000).toFixed(1)} s`;
      if (remainingMs > 0) raf = requestAnimationFrame(tick);
    }

    function paintAnswer(chosenIndex, correctIndex){
      [...answersEl.querySelectorAll('button')].forEach((btn,i)=>{
        btn.disabled = true;
        if (i === chosenIndex) btn.classList.add('selected');
        if (i === Number(correctIndex)) btn.classList.add('right');
        if (chosenIndex >= 0 && i === chosenIndex && i !== Number(correctIndex)) btn.classList.add('wrong');
      });
    }

    function finish(finalStreak = streak, reason = 'fail'){
      if (finished) return;
      finished = true;
      locked = true;
      clearTimers();
      streak = Number(finalStreak) || 0;
      streakEl.textContent = `RACHA · ${streak}`;
      setTimeout(()=>{
        if (finished) {
          questionEl.textContent = streak === 0 ? 'Racha terminada' : `Racha de ${streak}`;
          answersEl.innerHTML = '';
          help.textContent = reason === 'complete' ? 'Has completado todas las preguntas disponibles.' : 'El primer fallo termina la partida.';
          onFinish({score:attemptId ? 0 : streak,duration:performance.now()-startedAt,metadata:{streak,reason}});
        }
      }, 380);
    }

    function advance(nextTimeout){
      index += 1;
      if (index >= questions.length) return finish(streak,'complete');
      currentTimeoutMs = Number(nextTimeout) || timeoutFor(index);
      setTimeout(renderQuestion, 430);
    }

    async function resolveOfficial(q, answerIndex, responseMs){
      try{
        const result = await service.answerTriviaQuestion(attemptId, q.question_id, answerIndex, responseMs);
        if (!result) throw new Error('No se pudo corregir la respuesta.');
        const correct = Boolean(result.correct);
        streak = Number(result.streak) || 0;
        streakEl.textContent = `RACHA · ${streak}`;
        paintAnswer(answerIndex, result.correct_index);
        if (!correct) {
          help.textContent = answerIndex < 0 ? `Tiempo agotado · racha final ${streak}` : `Incorrecto · racha final ${streak}`;
          return setTimeout(()=>finish(streak,'fail'), 760);
        }
        help.textContent = `¡Correcto! Racha ${streak}`;
        if (result.finished) return setTimeout(()=>finish(streak,'complete'), 650);
        advance(result.next_timeout_ms);
      }catch(error){
        console.error('[Trivial] Error corrigiendo respuesta', error);
        help.textContent = 'No se pudo corregir por conexión. Reintentando…';
        setTimeout(()=>{
          if (!finished) resolveOfficial(q,answerIndex,responseMs);
        },900);
      }
    }

    function resolveDemo(q, answerIndex){
      const correctIndex = Number(q.correct_index);
      const correct = answerIndex === correctIndex;
      paintAnswer(answerIndex, correctIndex);
      if (!correct) {
        help.textContent = answerIndex < 0 ? `Tiempo agotado · racha final ${streak}` : `Incorrecto · racha final ${streak}`;
        return setTimeout(()=>finish(streak,'fail'), 700);
      }
      streak += 1;
      streakEl.textContent = `RACHA · ${streak}`;
      help.textContent = `¡Correcto! Racha ${streak}`;
      advance(timeoutFor(index+1));
    }

    function answer(answerIndex){
      if (locked || finished) return;
      locked = true;
      clearTimers();
      const q = questions[index];
      const responseMs = Math.max(0, Math.min(currentTimeoutMs, Math.round(performance.now()-questionStartedAt)));
      if (attemptId) resolveOfficial(q,Number(answerIndex),responseMs);
      else resolveDemo(q,Number(answerIndex));
    }

    function renderQuestion(){
      if (finished) return;
      locked = false;
      const q = questions[index];
      progress.textContent = `Pregunta ${index+1} · sigue hasta fallar`;
      category.textContent = `${q.category || 'Fútbol'} · ${q.difficulty || 'media'}`;
      streakEl.textContent = `RACHA · ${streak}`;
      questionEl.textContent = q.question;
      const opts = Array.isArray(q.answers) ? q.answers : [];
      answersEl.innerHTML = opts.map((text,i)=>`<button type="button" data-answer="${i}"><span>${String.fromCharCode(65+i)}</span><b>${esc(text)}</b></button>`).join('');
      help.textContent = currentTimeoutMs <= minTimeoutMs ? 'Tienes 5 segundos. El tiempo ya no bajará más.' : `Tienes ${(currentTimeoutMs/1000).toFixed(1)} segundos.`;
      timerBar.style.transform = 'scaleX(1)';
      secondsEl.textContent = `${(currentTimeoutMs/1000).toFixed(1)} s`;
      questionStartedAt = performance.now();
      raf = requestAnimationFrame(tick);
      timeout = setTimeout(()=>answer(-1),currentTimeoutMs);
    }

    function press(event){
      const button = event.target.closest('[data-answer]');
      if (!button || button.disabled) return;
      event.preventDefault();
      answer(Number(button.dataset.answer));
    }
    answersEl.addEventListener('pointerdown',press,{passive:false});

    async function load(){
      try{
        questions = attemptId ? await service.getTriviaQuestions(attemptId) : demoQuestions.slice();
        if (!Array.isArray(questions) || !questions.length) throw new Error('No hay preguntas disponibles.');
        index = 0; streak = 0; currentTimeoutMs = timeoutFor(0);
        renderQuestion();
      }catch(error){
        locked = true;
        questionEl.textContent = 'No se pudieron cargar las preguntas';
        answersEl.innerHTML = '';
        help.textContent = error.message || 'Error de conexión.';
      }
    }

    return {
      start(){ startedAt=performance.now(); load(); },
      destroy(){ finished=true; clearTimers(); answersEl.removeEventListener('pointerdown',press); }
    };
  });
})();