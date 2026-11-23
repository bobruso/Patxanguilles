/* ==========================================================================
   PATXANGUILLES · ACCESO RÁPIDO A CONVOCATORIAS DE WHATSAPP
   --------------------------------------------------------------------------
   Módulo local (v236, pendiente de aprobación y publicación).

   Objetivo: copiar una convocatoria de WhatsApp → pulsar la tarjeta de Home →
   elegir Algoritmo o Sala Draft → resultado automático.

   Reutiliza, sin duplicar:
   - scanCallupParticipantLines() / parseCallupEntries() de index.html
     (numeración, reservas, normalización, tildes, erratas cercanas).
   - El algoritmo vigente: makeTeams() (en F7 lo envuelve patx-v214.js y usa
     la RPC generate_teams con p_players + p_context; en FS usa el algoritmo
     local). No hay fallback local silencioso para F7.
   - El Modo Entrenador: createCoachRoom() / RPC create_coach_room y su
     pantalla de identidad/sala ya existentes.

   Invitados: se añaden al contexto de la convocatoria con nivel «medio»
   usando `reserves`, que es el mecanismo que el algoritmo F7 ya envía como
   p_context y que FS valora en su score local. No se crea ningún registro en
   Supabase desde este módulo ni se modifica el roster.
   ========================================================================== */
(() => {
  'use strict';

  let quickAnalysis = null;
  let quickPlan = null;
  let quickBusy = false;

  /* ------------------------------------------------------------------ */
  /* Utilidades DOM mínimas                                              */
  /* ------------------------------------------------------------------ */
  const el = id => document.getElementById(id);
  const setText = (id, value) => { const node = el(id); if (node) node.textContent = String(value ?? ''); };
  const setHtml = (id, value) => { const node = el(id); if (node) node.innerHTML = String(value ?? ''); };
  const safe = value => (typeof escapeHtml === 'function' ? escapeHtml(value) : String(value ?? ''));
  const notify = message => { if (typeof toast === 'function') toast(message); };
  const activeScreen = () => document.querySelector('.screen.active')?.id || '';

  /* ------------------------------------------------------------------ */
  /* Detección de nombres y modalidad                                    */
  /* ------------------------------------------------------------------ */
  function rosterForBothModes() {
    const f7 = (typeof F7 !== 'undefined' && Array.isArray(F7)) ? F7 : [];
    const fs = (typeof FS !== 'undefined' && Array.isArray(FS)) ? FS : [];
    return [...new Set([...f7, ...fs])];
  }

  const modeLabel = mode => (mode === 'fs' ? 'Fútbol Sala' : 'Fútbol 7');
  const teamSizeForMode = mode => (mode === 'fs' ? 5 : 7);
  const neededForMode = mode => (mode === 'fs' ? 10 : 14);

  /* Palabras que delatan cabeceras, fechas o texto explicativo. Nunca
     deberían contarse como jugadores. */
  const CALLLUP_STOP_WORDS = /(^|\s)(convocatoria|convocatorias|partido|partidos|fecha|hora|campo|pista|jornada|temporada|equipo|equipos|contra|vs|f7|f5|fs|futbol|fútbol|futsal|sala|precio|precios|cena|cerveza|cervezas|comida|confirmar|confirma|confirmado|asistencia|lista|entreno|entrenamiento|reserva|reservas|rojos?|negros?|arbitro|árbitro|aviso|importante|recordatorio|vestuario|domingo|lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(\s|$)/i;

  /* ¿Esta línea puede ser el nombre de una persona? Se usa solo en el acceso
     rápido; los importadores antiguos mantienen su comportamiento.
     Es deliberadamente permisiva: cualquier nombre desconocido debe poder
     participar. Solo rechaza números, horas, enlaces y símbolos de cabecera,
     ignorando además las anotaciones finales entre paréntesis para contar
     palabras («Javi (Xavi)»). */
  function looksLikePersonName(value) {
    const s = String(value || '').trim();
    if (!s || s.length > 40) return false;
    if (/[0-9]/.test(s)) return false;
    if (/https?:\/\/|www\.|@/i.test(s)) return false;
    if (/[:;<>\[\]{}_=+*|\\/]/.test(s)) return false;
    if (!/[A-Za-zÁÉÍÓÚÜÑÀÈÌÒÙÇáéíóúüñàèìòùç]/.test(s)) return false;
    /* Para validar se ignoran las anotaciones finales entre paréntesis. */
    const core = s.replace(/\s*\([^()]*\)\s*$/, '').trim() || s;
    const words = core.split(/\s+/).filter(Boolean);
    if (!words.length || words.length > 3) return false;
    if (CALLLUP_STOP_WORDS.test(core)) return false;
    if (!/[A-Za-zÁÉÍÓÚÜÑÀÈÌÒÙÇáéíóúüñàèìòùç]/.test(core)) return false;
    return true;
  }

  function analyze(rawText) {
    const text = String(rawText || '');
    const roster = rosterForBothModes();
    const opts = {
      extendedReserveHeaders: true,
      acceptParticipantName: looksLikePersonName,
      acceptUnnumberedName: looksLikePersonName
    };

    let parsed = { entries: [], skipped: [], participantLines: [] };
    try {
      if (typeof parseCallupEntries === 'function') {
        parsed = parseCallupEntries(text, roster, opts) || parsed;
      }
    } catch (err) {
      console.error('[WhatsApp quick] No se pudo analizar la convocatoria', err);
    }

    const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
    const skipped = Array.isArray(parsed.skipped) ? parsed.skipped : [];
    const count = entries.length;
    const mode = count === 14 ? 'f7' : count === 10 ? 'fs' : null;
    const guests = entries.filter(entry => entry.type !== 'known');
    const ambiguous = guests
      .filter(entry => entry.suggestion)
      .map(entry => ({ name: entry.name, suggestion: entry.suggestion }));
    const warnings = [];

    if (!count) {
      warnings.push('No he reconocido ningún jugador. Revisa que la convocatoria tenga los nombres, uno por línea o numerados.');
    } else if (!mode) {
      warnings.push(`He detectado ${count} titular${count === 1 ? '' : 'es'}. Para crear equipos hacen falta exactamente 14 (Fútbol 7) o 10 (Fútbol Sala).`);
    }
    if (skipped.length) {
      const sample = skipped.slice(0, 4).map(item => `«${item}»`).join(', ');
      warnings.push(`He ignorado ${skipped.length} línea${skipped.length === 1 ? '' : 's'} que no parec${skipped.length === 1 ? 'e' : 'cen'} un nombre: ${sample}${skipped.length > 4 ? '…' : ''}.`);
    }

    return {
      text,
      count,
      mode,
      modeLabel: mode ? modeLabel(mode) : null,
      teamSize: mode ? teamSizeForMode(mode) : null,
      needed: mode ? neededForMode(mode) : null,
      valid: !!mode,
      entries,
      guests,
      known: entries.filter(entry => entry.type === 'known').map(entry => entry.name),
      ambiguous,
      warnings,
      skipped
    };
  }

  function buildPlan(analysis) {
    if (!analysis || !analysis.valid) return null;
    const guestEntries = analysis.entries.filter(entry => entry.type !== 'known');
    return {
      mode: analysis.mode,
      count: analysis.count,
      names: analysis.entries.map(entry => entry.name),
      guests: guestEntries.map(entry => entry.name),
      /* El algoritmo F7 ya envía `reserves` como p_context y FS ya valora
         las reservas: el nivel interno de un invitado equivale a la
         valoración local 6. */
      reserves: guestEntries.map(entry => ({ name: entry.name, level: 'medio' })),
      ambiguous: analysis.ambiguous.slice()
    };
  }

  /* ------------------------------------------------------------------ */
  /* Pantalla 1 · pegado y análisis                                      */
  /* ------------------------------------------------------------------ */
  function setNote(message, tone) {
    const box = el('whatsappQuickClipboardNote');
    if (!box) return;
    if (!message) {
      box.style.display = 'none';
      box.textContent = '';
      box.className = 'whatsapp-quick-note';
      return;
    }
    box.style.display = '';
    box.className = 'whatsapp-quick-note' + (tone ? ' ' + tone : '');
    box.textContent = message;
  }

  function setMethodStatus(message, tone) {
    const box = el('whatsappMethodStatus');
    if (!box) return;
    if (!message) {
      box.style.display = 'none';
      box.textContent = '';
      box.className = 'whatsapp-method-status';
      return;
    }
    box.style.display = '';
    box.className = 'whatsapp-method-status' + (tone ? ' ' + tone : '');
    box.textContent = message;
  }

  function focusQuickText() {
    const textarea = el('whatsappQuickText');
    if (!textarea) return;
    setTimeout(() => {
      try {
        textarea.focus();
        textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (_) {}
    }, 90);
  }

  function clipboardReadAvailable() {
    return !!(navigator.clipboard && typeof navigator.clipboard.readText === 'function');
  }

  function readClipboardText() {
    if (!clipboardReadAvailable()) return Promise.reject(new Error('portapapeles-no-disponible'));
    try {
      const result = navigator.clipboard.readText();
      return result && typeof result.then === 'function'
        ? result
        : Promise.reject(new Error('portapapeles-sin-promesa'));
    } catch (err) {
      return Promise.reject(err);
    }
  }

  function renderQuickReview(analysis) {
    const review = el('whatsappQuickReview');
    if (!review) return;
    if (!analysis || !analysis.count) {
      review.style.display = 'none';
      return;
    }
    review.style.display = '';
    setText('whatsappQuickReviewTitle', analysis.valid ? '✓ Convocatoria válida' : 'Revisa la convocatoria');
    /* El nivel asignado a los invitados es información interna del algoritmo:
       no se muestra en ninguna pantalla. */
    setText('whatsappQuickSummary', analysis.valid
      ? `${analysis.count} titulares · ${analysis.modeLabel}`
      : `${analysis.count} titular${analysis.count === 1 ? '' : 'es'} detectado${analysis.count === 1 ? '' : 's'} · hacen falta 14 (F7) o 10 (FS)`);

    setHtml('whatsappQuickDetected', analysis.entries.map((entry, index) => {
      const tag = entry.type === 'guest'
        ? '<span class="callup-tag guest">Invitado</span>'
        : entry.type === 'uncertain'
          ? `<span class="callup-tag uncertain">¿Quizá ${safe(entry.suggestion)}?</span>`
          : '<span class="callup-tag ok">✓</span>';
      return `<div class="coach-callup-name"><b>${index + 1}.</b><span>${safe(entry.name)}</span>${tag}</div>`;
    }).join(''));

    const warning = el('whatsappQuickWarning');
    if (warning) {
      const messages = analysis.warnings.slice();
      if (analysis.ambiguous.length) {
        messages.push('🔎 ' + analysis.ambiguous
          .map(item => `${item.name} se parece a ${item.suggestion}`)
          .join(', ') + '. Se conserva el nombre escrito y se cuenta como invitado.');
      }
      warning.style.display = messages.length ? '' : 'none';
      warning.innerHTML = messages.map(message => safe(message)).join('<br>');
    }
  }

  function analyzeWhatsAppQuick() {
    const textarea = el('whatsappQuickText');
    const text = textarea ? textarea.value : '';
    if (!String(text).trim()) {
      setNote('Pega primero el texto de la convocatoria.', 'warn');
      focusQuickText();
      return null;
    }
    const analysis = analyze(text);
    quickAnalysis = analysis;
    quickPlan = buildPlan(analysis);
    renderQuickReview(analysis);
    setNote('', null);
    if (!analysis.valid) {
      setNote(analysis.count
        ? `Todavía no se pueden crear equipos: necesito 14 titulares (Fútbol 7) o 10 (Fútbol Sala) y hay ${analysis.count}. Corrige el texto y vuelve a analizar.`
        : 'No he reconocido ningún jugador. Corrige el texto y vuelve a analizar.', 'warn');
      return analysis;
    }
    showMethodScreen(analysis);
    return analysis;
  }

  function resetWhatsAppQuick() {
    quickAnalysis = null;
    quickPlan = null;
    const textarea = el('whatsappQuickText');
    if (textarea) textarea.value = '';
    const review = el('whatsappQuickReview');
    if (review) review.style.display = 'none';
    setNote('', null);
    focusQuickText();
  }

  function leaveWhatsAppQuick() {
    setNote('', null);
    if (history.length > 1) history.back();
    else show('home');
  }

  let quickOpening = false;

  function openWhatsAppQuick() {
    if (quickOpening) return;
    quickOpening = true;

    /* Se entra desde Home: estado limpio. La pantalla de pegado solo se
       muestra si el portapapeles no trae una convocatoria válida. */
    quickAnalysis = null;
    quickPlan = null;
    quickBusy = false;
    const textarea = el('whatsappQuickText');
    if (textarea) textarea.value = '';
    const review = el('whatsappQuickReview');
    if (review) review.style.display = 'none';
    setMethodStatus('', null);
    setNote('', null);

    /* Lectura dentro del gesto del usuario. En Android WebView puede no
       existir o rechazar el permiso: en ese caso se ofrece el pegado manual
       y no se pide ningún permiso nativo nuevo. */
    const pending = readClipboardText();
    let settled = false;
    let abandoned = false;
    let slowTimer = null;

    const release = () => {
      if (settled) return false;
      settled = true;
      quickOpening = false;
      if (slowTimer) { clearTimeout(slowTimer); slowTimer = null; }
      return true;
    };

    /* Red de seguridad si el navegador deja la lectura colgada. */
    slowTimer = setTimeout(() => {
      if (settled) return;
      abandoned = true;
      quickOpening = false;
      show('whatsappQuick');
      setNote('No he podido leer el portapapeles automáticamente. Pega la convocatoria aquí abajo (solo la primera vez).', 'warn');
      focusQuickText();
    }, 3500);

    pending.then(text => {
      if (settled) return;
      release();
      const screen = activeScreen();
      if (screen !== 'home' && screen !== 'whatsappQuick') return;
      const raw = String(text || '');
      /* Si la pantalla de pegado ya se mostró por lentitud, no se navega por
         sorpresa: se rellena el texto y el usuario decide. */
      if (abandoned) {
        if (textarea && raw && !textarea.value) textarea.value = raw;
        return;
      }

      const analysis = raw.trim() ? analyze(raw) : null;

      /* Convocatoria válida: directamente a la elección de método, sin pasar
         visualmente por la pantalla de pegado. */
      if (analysis && analysis.valid) {
        quickAnalysis = analysis;
        quickPlan = buildPlan(analysis);
        renderQuickReview(analysis);
        if (textarea) textarea.value = raw;
        history.pushState(screenHistoryState('whatsappQuick'), '', '#pegar-convocatoria');
        showMethodScreen(analysis);
        return;
      }

      if (textarea && raw) textarea.value = raw;
      show('whatsappQuick');
      if (analysis && analysis.count) {
        quickAnalysis = analysis;
        quickPlan = buildPlan(analysis);
        renderQuickReview(analysis);
        setNote(`He leído el portapapeles, pero todavía no se pueden crear equipos: necesito 14 titulares (Fútbol 7) o 10 (Fútbol Sala) y hay ${analysis.count}. Corrige el texto y vuelve a analizar.`, 'warn');
      } else {
        setNote(raw.trim()
          ? 'El portapapeles no contiene una convocatoria reconocible. Revisa o pega el texto aquí abajo.'
          : 'El portapapeles está vacío o no contiene texto. Pega la convocatoria aquí abajo.', 'warn');
        focusQuickText();
      }
    }).catch(err => {
      if (settled) return;
      release();
      const screen = activeScreen();
      if (screen !== 'home' && screen !== 'whatsappQuick') return;
      if (abandoned) return;
      console.warn('[WhatsApp quick] No se pudo leer el portapapeles', err && err.message ? err.message : err);
      show('whatsappQuick');
      setNote('Este navegador no permite leer el portapapeles automáticamente. Pega el texto aquí abajo (solo la primera vez).', 'warn');
      focusQuickText();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Pantalla 2 · elección de método                                     */
  /* ------------------------------------------------------------------ */
  function showMethodScreen(analysis) {
    const plan = quickPlan || buildPlan(analysis);
    if (!plan) return;
    quickPlan = plan;
    /* Solo se indica la modalidad y el número de titulares. Los invitados y
       el nivel interno que recibe el algoritmo no se muestran. */
    setText('whatsappMethodSubtitle', `${plan.count} titulares · ${analysis.modeLabel} · ${analysis.teamSize} contra ${analysis.teamSize}`);
    setMethodStatus('', null);
    setBusy(false);
    show('whatsappMethod');
  }

  function setBusy(busy) {
    quickBusy = !!busy;
    ['whatsappAlgorithmBtn', 'whatsappDraftBtn'].forEach(id => {
      const button = el(id);
      if (button) button.disabled = !!busy;
    });
  }

  function applyPlanToGlobals(plan) {
    /* Variables globales del flujo vigente de alineaciones. */
    game = plan.mode;
    selected = [...plan.names];
    reserves = plan.reserves.map(item => ({ name: item.name, level: item.level }));
    pendingSwap = null;
    lineupCreationMethod = 'algorithm';
    /* Solo memoria local: permite abrir la ficha o pintar el campo sin
       insertar nada en Supabase. Mismo tratamiento que las reservas. */
    if (typeof ensurePlayers === 'function') ensurePlayers(plan.guests);
  }

  async function startWhatsAppAlgorithm() {
    if (quickBusy) return;
    const plan = quickPlan;
    if (!plan) { notify('Analiza primero la convocatoria'); return; }
    setBusy(true);
    setMethodStatus('Preparando los equipos…');
    try {
      applyPlanToGlobals(plan);
      await makeTeams();
      if (!el('results')?.classList.contains('active')) {
        /* En F7 patx-v214.js vuelve a la selección si falla la RPC: aquí se
           informa y se permite reintentar sin inventar equipos. */
        setMethodStatus('No se han podido generar los equipos. El servicio de alineaciones no ha respondido; vuelve a intentarlo.', 'error');
        show('whatsappMethod', { replace: true });
      }
    } catch (err) {
      console.error('[WhatsApp quick] Algoritmo automático', err);
      setMethodStatus('No se han podido generar los equipos: ' + (err && err.message ? err.message : 'error inesperado') + '. Vuelve a intentarlo.', 'error');
      show('whatsappMethod', { replace: true });
    } finally {
      setBusy(false);
      if (el('results')?.classList.contains('active')) setMethodStatus('', null);
    }
  }

  async function startWhatsAppDraft() {
    if (quickBusy) return;
    const plan = quickPlan;
    if (!plan) { notify('Analiza primero la convocatoria'); return; }
    setBusy(true);
    setMethodStatus('Creando la sala del Modo Entrenador…');
    try {
      game = plan.mode;
      lineupCreationMethod = 'coach';
      coachSelectedParticipants = [...plan.names];
      coachGuestPlayers = [...plan.guests];
      coachCallupConfirmed = true;
      coachParsedCallup = (quickAnalysis && Array.isArray(quickAnalysis.entries))
        ? quickAnalysis.entries.map(entry => Object.assign(
            { name: entry.name, type: entry.type },
            entry.suggestion ? { suggestion: entry.suggestion } : {}
          ))
        : plan.names.map(name => ({ name, type: plan.guests.includes(name) ? 'guest' : 'known' }));
      if (typeof ensurePlayers === 'function') ensurePlayers(plan.guests);

      await createCoachRoom();

      const landed = el('coachIdentity')?.classList.contains('active')
        || el('coachRoom')?.classList.contains('active');
      if (!landed) {
        setMethodStatus('No se ha podido crear la sala. Vuelve a intentarlo.', 'error');
        show('whatsappMethod', { replace: true });
      }
    } catch (err) {
      console.error('[WhatsApp quick] Sala Draft', err);
      setMethodStatus('No se ha podido crear la sala: ' + (err && err.message ? err.message : 'error inesperado') + '. Vuelve a intentarlo.', 'error');
      show('whatsappMethod', { replace: true });
    } finally {
      setBusy(false);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Instalación                                                         */
  /* ------------------------------------------------------------------ */
  function install() {
    const card = el('homeWhatsAppBtn');
    if (card && !card.dataset.patxQuickBound) {
      card.dataset.patxQuickBound = '1';
      card.addEventListener('click', openWhatsAppQuick);
    }
  }

  window.PatxQuickCallup = {
    analyze,
    buildPlan,
    looksLikePersonName,
    get currentAnalysis() { return quickAnalysis; },
    get currentPlan() { return quickPlan; }
  };
  window.openWhatsAppQuick = openWhatsAppQuick;
  window.leaveWhatsAppQuick = leaveWhatsAppQuick;
  window.analyzeWhatsAppQuick = analyzeWhatsAppQuick;
  window.resetWhatsAppQuick = resetWhatsAppQuick;
  window.focusWhatsAppQuickText = focusQuickText;
  window.startWhatsAppAlgorithm = startWhatsAppAlgorithm;
  window.startWhatsAppDraft = startWhatsAppDraft;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
