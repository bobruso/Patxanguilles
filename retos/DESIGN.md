# Diseño y UX — Reto del día

## Principio

Los minijuegos deben sentirse como una sola app móvil, no como una colección de prototipos web. La referencia de producto son las apps de microjuegos diarios: una mecánica protagonista, poco texto durante la acción, colores fuertes, controles grandes y feedback inmediato. La identidad visual y los assets son propios de Patxanguilles.

## Flujo obligatorio

1. Se presenta el juego del día.
2. Se explica en tres pasos concretos cómo se juega.
3. Se explica explícitamente qué resultado gana.
4. `PROBAR JUEGO` permite práctica ilimitada y no guarda ni consume intentos.
5. `JUGAR POR PUNTOS` abre una confirmación indicando los intentos restantes.
6. Al confirmar, el intento oficial queda iniciado/consumido en servidor.
7. Antes de la mecánica aparece una cuenta atrás `3 · 2 · 1 · ¡YA!`.
8. El HUD muestra siempre `PRÁCTICA · NO PUNTÚA` o `INTENTO OFICIAL · PUNTÚA`.
9. El resultado de práctica ofrece repetir o pasar al intento oficial.
10. Tras practicar, `JUGAR POR PUNTOS` gana protagonismo visual como siguiente acción natural.
11. El resultado oficial se guarda y actualiza ranking/historial.

## Regla de práctica

La práctica no debe revelar el contenido exacto del intento oficial. Los juegos deterministas usan una semilla local aleatoria para practicar y una semilla de servidor para el intento real. El trivial usa preguntas demo durante la práctica y preguntas de servidor en el intento oficial.

## Diseño visual

- Base de marca: morado Patxanguilles/minijuegos, blanco y amarillo como CTA competitivo.
- Cada categoría tiene un gradiente propio: timing, reflejos, precisión, velocidad, lógica, memoria, fútbol/trivial y arcade.
- Tarjetas redondeadas y controles grandes, pensados primero para móvil.
- Botones con profundidad visual y respuesta táctil al pulsar.
- El área de juego debe ser la pieza visual dominante.
- Durante la partida se reduce el texto al mínimo necesario.
- Acertar debe producir feedback visual inequívoco; fallar también.
- Los juegos de varias rondas deben mostrar progreso o ronda cuando aporte claridad.
- Los juegos contrarreloj deben hacer visible el tiempo mediante barra, reloj o ambos si no perjudica la mecánica.
- Los juegos de memoria deben diferenciar claramente `OBSERVA/MEMORIZA` de `TU TURNO/REPITE`.
- Los Canvas arcade usan el mismo lenguaje: fondos morados, elementos protagonistas claros y colores de acento amarillo, rosa, azul o menta.
- Evitar UI oscura genérica dentro de los juegos salvo cuando la mecánica lo necesite.
- No copiar logos, personajes, assets, pantallas o composición exacta de otras apps.

## Feedback

- Correcto: verde/menta y una microanimación breve.
- Error: rosa/rojo y feedback visible antes de pasar a la siguiente ronda.
- `PERFECTO`, `BIEN`, `CERCA`, `FALLO` se usan cuando la puntuación depende de precisión.
- En móviles compatibles puede usarse `navigator.vibrate` de forma muy sutil. La interfaz nunca depende de la vibración para comunicar el resultado.
- No añadir sonidos globales por defecto; cualquier capa de audio se decidirá aparte.

## Accesibilidad y claridad

- Controles con Pointer Events cuando sea necesario para móvil/ratón.
- Estados oficiales y de práctica escritos, no indicados solo mediante color.
- Objetivos y puntuación explicados antes del primer intento.
- Cuenta atrás universal para evitar inicios accidentales.
- Respetar `prefers-reduced-motion`.
- Botones táctiles amplios y alto contraste.
- Nunca exigir vibración, audio o hover para entender un juego.

## Control técnico

`/retos/dev-check.html` es una herramienta local de smoke test. No inicia partidas, no llama a Supabase y no consume intentos. Debe comprobar que los 27 juegos activos:

- cargan sus scripts;
- quedan registrados en `PatxGameRegistry`;
- pueden crear una instancia válida;
- exponen `start()` y `destroy()` mediante el contrato común.

Debe ejecutarse después de cambios amplios en los módulos de juegos.

## Criterio de calidad

Antes de activar definitivamente un juego debe superar estas preguntas:

- ¿Se entiende en menos de 10 segundos leyendo las instrucciones?
- ¿La acción principal es evidente sin tener que leer durante la partida?
- ¿El feedback de acierto/fallo es inmediato e inequívoco?
- ¿Es divertido después de repetirlo varias veces?
- ¿La puntuación permite comparar jugadores de forma clara?

Si falla una de ellas: `RETOCAR` o `FUERA`.
