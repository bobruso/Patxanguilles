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
10. El resultado oficial se guarda y actualiza ranking/historial.

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
- Evitar UI oscura genérica dentro de los juegos salvo cuando la mecánica lo necesite.
- No copiar logos, personajes, assets, pantallas o composición exacta de otras apps.

## Accesibilidad y claridad

- Controles con Pointer Events cuando sea necesario para móvil/ratón.
- Estados oficiales y de práctica escritos, no indicados solo mediante color.
- Objetivos y puntuación explicados antes del primer intento.
- Cuenta atrás universal para evitar inicios accidentales.
- Respetar `prefers-reduced-motion`.
- Botones táctiles amplios y alto contraste.

## Criterio de calidad

Antes de activar definitivamente un juego debe superar tres preguntas:

- ¿Se entiende en menos de 10 segundos leyendo las instrucciones?
- ¿Es divertido después de repetirlo varias veces?
- ¿La puntuación permite comparar jugadores de forma clara?

Si falla una de las tres: `RETOCAR` o `FUERA`.