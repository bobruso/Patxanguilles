(() => {
  'use strict';

  const resultPanel=document.getElementById('resultPanel');
  const resultLabel=document.getElementById('resultLabel');
  const resultScore=document.getElementById('resultScore');
  const resultScoreButton=document.getElementById('resultScoreButton');
  const playButton=document.getElementById('playButton');
  const gameStage=document.getElementById('gameStage');
  const hero=document.getElementById('heroName');
  if(!resultPanel||!resultLabel)return;

  const copy={
    'Reacción':['Espera a que aparezca un balón en una posición aleatoria y tócalo antes que nadie.',['No toques mientras el campo esté esperando.','Cuando aparezca el balón, localízalo y tócalo lo más rápido posible.','Tocar antes de tiempo cuenta como salida falsa.'],'Gana quien tarde menos milisegundos en tocar el balón.'],
    'Clava el centro':['Detén la barra dentro de la zona central tantas veces seguidas como puedas.',['La barra rebota de lado a lado.','Toca cuando esté dentro de la zona central.','Cada acierto acelera la barra; el primer fallo termina la racha.'],'Gana la racha más larga de centros acertados.'],
    'Color Reflex':['No leas la palabra: responde al color de la tinta. Cada ronda te deja menos tiempo.',['Mira la palabra central, pero ignora lo que pone.','Fíjate únicamente en el COLOR con el que está escrita.','Pulsa la respuesta que representa ese color. Un fallo o agotar el tiempo termina la partida.'],'Gana quien encadene más respuestas correctas; a partir de la ronda 10 siempre hay al menos 2 segundos.'],
    'Quick Maths':['Resuelve operaciones cada vez más difíciles sin equivocarte.',['Resuelve la operación que aparece.','Elige una de las cuatro respuestas antes de que acabe el tiempo.','Cada acierto aumenta la dificultad. El primer fallo termina la partida.'],'Gana quien consiga la racha más larga de operaciones correctas.'],
    'Grid Memory':['Memoriza patrones que crecen desde 4×4 hasta cuadrículas mucho mayores.',['Memoriza todas las casillas iluminadas.','Cuando desaparezcan, toca exactamente esas casillas.','La cuadrícula y los patrones se vuelven más complejos. Un error termina la partida.'],'Gana el nivel más alto completado.'],
    'Secuencia':['Observa y repite patrones cada vez más largos en una cuadrícula que va creciendo.',['Observa el patrón completo sin tocar.','Repítelo respetando exactamente el mismo orden.','Cada nivel aumenta pasos y, progresivamente, filas y columnas. Un error termina la partida.'],'Gana el nivel más alto completado.'],
    'Trivial futbolero':['Responde 10 preguntas de fútbol. Tienes 15 segundos para cada una y la rapidez también puntúa.',['Responde las 10 preguntas: fallar una no termina la partida.','Cada acierto vale entre 250 y 1000 puntos según lo rápido que respondas.','Después de cada respuesta verás claramente la solución: correcta en verde y las otras en rojo.'],'Gana quien consiga más puntos sumando aciertos y velocidad. Máximo: 10.000 puntos.'],
    'Cups':['Sigue el vaso que esconde la bola. Cada ronda se complica y solo tienes una vida.',['Memoriza en qué vaso está la bola.','Sigue los vasos mientras se mezclan.','Elige el vaso correcto. Si fallas una vez, la partida termina.'],'Gana quien encadene más aciertos seguidos.'],
    'Memory Cards':['Encuentra parejas de cromos de fútbol vintage en una cuadrícula ampliada.',['Destapa dos cromos cada vez.','Si son iguales quedan descubiertos; si no, vuelven a taparse.','Completa las 12 parejas lo más rápido posible.'],'Gana quien complete las 12 parejas en menos tiempo.'],
    'Tower Stack':['Construye una torre sin límite visual: la cámara sube contigo mientras colocas bloques.',['El bloque móvil cruza la pantalla.','Toca para colocarlo sobre el bloque anterior.','La parte que quede fuera se recorta; si no hay solapamiento, termina la partida. La cámara sigue la parte alta de la torre.'],'Gana quien coloque más bloques.'],
    'Zig Zag':['Avanza por un camino de curvas suaves que empieza fácil y se acelera progresivamente.',['La pieza avanza sola por el camino.','Cada toque cambia el sentido de giro.','Las curvas y la velocidad aumentan poco a poco. Salirse del camino termina la partida.'],'Gana quien avance más lejos sin salirse.']
  };
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const demoId=new URLSearchParams(location.search).get('demo')||'';

  function applyCopy(){
    if(!hero)return;
    const item=copy[hero.textContent.trim()];if(!item)return;
    const description=document.getElementById('heroDescription'),steps=document.getElementById('instructionSteps'),score=document.getElementById('scoringHint');
    if(description)description.textContent=item[0];
    if(steps)steps.innerHTML=item[1].map((text,i)=>`<div class="instruction-step"><span>${i+1}</span><p>${esc(text)}</p></div>`).join('');
    if(score)score.textContent=item[2];
  }

  function normalizeDemoResult(){
    if(!resultScore||resultPanel.hidden||resultScore.textContent==='NO VÁLIDO')return;
    if(!['center-hit','quick-maths'].includes(demoId))return;
    const match=resultScore.textContent.match(/-?\d+(?:[.,]\d+)?/);if(!match)return;
    const n=Math.max(0,Math.round(Number(match[0].replace(',','.'))||0));
    const wanted=demoId==='center-hit'?`Racha ${n}`:`${n} acierto${n===1?'':'s'}`;
    if(resultScore.textContent!==wanted)resultScore.textContent=wanted;
  }

  let lastFeedbackKey='';
  function vibrate(pattern){try{if(navigator.vibrate)navigator.vibrate(pattern);}catch(_) {}}
  function updatePracticeNudge(){
    const visible=!resultPanel.hidden;
    const isPractice=visible&&resultLabel.textContent.includes('PRÁCTICA');
    resultScoreButton?.classList.toggle('result-score-button-ready',isPractice&&!resultScoreButton.hidden);
    playButton?.classList.toggle('score-ready-after-practice',isPractice&&!playButton.hidden&&!playButton.disabled);
    normalizeDemoResult();
  }

  const resultObserver=new MutationObserver(updatePracticeNudge);
  resultObserver.observe(resultPanel,{subtree:true,childList:true,attributes:true,characterData:true,attributeFilter:['hidden','class']});
  if(hero)new MutationObserver(applyCopy).observe(hero,{subtree:true,childList:true,characterData:true});

  const stageObserver=new MutationObserver(mutations=>{
    for(const mutation of mutations){
      if(mutation.type!=='attributes'||mutation.attributeName!=='class')continue;
      const el=mutation.target,key=`${el.className}|${Date.now()>>8}`;
      if(key===lastFeedbackKey)continue;
      if(el.classList?.contains('is-correct')||el.classList?.contains('is-match')||el.classList?.contains('success')){lastFeedbackKey=key;vibrate(12);}
      else if(el.classList?.contains('is-wrong')||el.classList?.contains('fail')){lastFeedbackKey=key;vibrate([18,28,18]);}
    }
  });
  if(gameStage)stageObserver.observe(gameStage,{subtree:true,attributes:true,attributeFilter:['class']});

  document.addEventListener('pointerdown',event=>{
    if(event.target.closest('.action-button,.small-action,.answer-option,.color-option,.memory-cell,.sequence-pad,.hl-actions button,.trivia-answers button'))vibrate(6);
  },{passive:true});

  updatePracticeNudge();applyCopy();setTimeout(applyCopy,300);setTimeout(applyCopy,900);
})();