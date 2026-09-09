(() => {
  'use strict';

  const copy={
    'Reacción':{
      description:'Espera a que aparezca un balón en una posición aleatoria y tócalo antes que nadie.',
      steps:['No toques mientras el campo esté esperando.','Cuando aparezca el balón, localízalo y tócalo lo más rápido posible.','Tocar antes de tiempo cuenta como salida falsa.'],
      score:'Gana quien tarde menos milisegundos en tocar el balón.'
    },
    'Clava el centro':{
      description:'Detén la barra dentro de la zona central tantas veces seguidas como puedas.',
      steps:['La barra rebota de lado a lado.','Toca cuando esté dentro de la zona central.','Cada acierto acelera la barra; el primer fallo termina la racha.'],
      score:'Gana la racha más larga de centros acertados.'
    },
    'Color Reflex':{
      description:'No leas la palabra: responde al color de la tinta. Cada ronda te deja menos tiempo.',
      steps:['Mira la palabra central, pero ignora lo que pone.','Fíjate únicamente en el COLOR con el que está escrita.','Pulsa la respuesta que representa ese color. Un fallo o agotar el tiempo termina la partida.'],
      score:'Gana quien encadene más respuestas correctas; a partir de la ronda 10 siempre hay al menos 2 segundos.'
    },
    'Quick Maths':{
      description:'Resuelve operaciones cada vez más difíciles sin equivocarte.',
      steps:['Resuelve la operación que aparece.','Elige una de las cuatro respuestas antes de que acabe el tiempo.','Cada acierto aumenta la dificultad. El primer fallo termina la partida.'],
      score:'Gana quien consiga la racha más larga de operaciones correctas.'
    },
    'Grid Memory':{
      description:'Memoriza patrones que crecen desde 4×4 hasta cuadrículas mucho mayores.',
      steps:['Memoriza todas las casillas iluminadas.','Cuando desaparezcan, toca exactamente esas casillas.','La cuadrícula y los patrones se vuelven más complejos. Un error termina la partida.'],
      score:'Gana el nivel más alto completado.'
    },
    'Secuencia':{
      description:'Observa y repite patrones cada vez más largos en una cuadrícula que va creciendo.',
      steps:['Observa el patrón completo sin tocar.','Repítelo respetando exactamente el mismo orden.','Cada nivel aumenta pasos y, progresivamente, filas y columnas. Un error termina la partida.'],
      score:'Gana el nivel más alto completado.'
    },
    'Trivial futbolero':{
      description:'Responde preguntas de fútbol hasta que falles. El tiempo baja progresivamente hasta 5 segundos.',
      steps:['Elige una de las cuatro respuestas.','Si aciertas, pasas inmediatamente a otra pregunta y aumenta tu racha.','El primer fallo o quedarte sin tiempo termina la partida. El límite baja de 9 s hasta un mínimo de 5 s.'],
      score:'Gana quien consiga la racha más larga de respuestas correctas.'
    },
    'Cups':{
      description:'Sigue el vaso que esconde la bola. Cada ronda se complica y solo tienes una vida.',
      steps:['Memoriza en qué vaso está la bola.','Sigue los vasos mientras se mezclan.','Elige el vaso correcto. Si fallas una vez, la partida termina.'],
      score:'Gana quien encadene más aciertos seguidos.'
    },
    'Memory Cards':{
      description:'Encuentra parejas de cromos de fútbol vintage en una cuadrícula ampliada.',
      steps:['Destapa dos cromos cada vez.','Si son iguales quedan descubiertos; si no, vuelven a taparse.','Completa las 12 parejas lo más rápido posible.'],
      score:'Gana quien complete las 12 parejas en menos tiempo.'
    },
    'Tower Stack':{
      description:'Construye una torre sin límite visual: la cámara sube contigo mientras colocas bloques.',
      steps:['El bloque móvil cruza la pantalla.','Toca para colocarlo sobre el bloque anterior.','La parte que quede fuera se recorta; si no hay solapamiento, termina la partida. La cámara sigue la parte alta de la torre.'],
      score:'Gana quien coloque más bloques.'
    },
    'Zig Zag':{
      description:'Avanza por un camino de curvas suaves que empieza fácil y se acelera progresivamente.',
      steps:['La pieza avanza sola por el camino.','Cada toque cambia el sentido de giro.','Las curvas y la velocidad aumentan poco a poco. Salirse del camino termina la partida.'],
      score:'Gana quien avance más lejos sin salirse.'
    }
  };

  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const hero=document.getElementById('heroName');
  if(!hero)return;

  function apply(){
    const item=copy[hero.textContent.trim()];
    if(!item)return;
    const description=document.getElementById('heroDescription');
    const steps=document.getElementById('instructionSteps');
    const score=document.getElementById('scoringHint');
    if(description)description.textContent=item.description;
    if(steps)steps.innerHTML=item.steps.map((text,i)=>`<div class="instruction-step"><span>${i+1}</span><p>${esc(text)}</p></div>`).join('');
    if(score)score.textContent=item.score;
  }

  new MutationObserver(apply).observe(hero,{childList:true,subtree:true,characterData:true});
  queueMicrotask(apply);
  setTimeout(apply,250);
  setTimeout(apply,900);
})();