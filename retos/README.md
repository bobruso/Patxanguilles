# Reto del día — Patxanguilles

Módulo independiente de minijuegos diarios. Requiere una cuenta Patxanguilles vinculada a `players.id` para jugar en modo real.

## Juegos activos

1. `stop-seven` — Stop 7 — menor error gana.
2. `reaction` — Reacción — menor tiempo gana.
3. `center-hit` — Clava el centro — menor error gana.
4. `speed-tap` — Speed Tap — más toques gana.
5. `color-reflex` — Color Reflex — más puntos gana.
6. `quick-maths` — Quick Maths — más puntos gana.
7. `grid-memory` — Grid Memory — mayor nivel gana.
8. `sequence` — Secuencia — mayor nivel gana.
9. `keep-up` — Que no caiga — más toques gana.
10. `penalties` — Penaltis — más puntos gana.
11. `goalkeeper` — Portero — más paradas gana.
12. `top-bins` — A la escuadra — más puntos gana.
13. `var-offside` — VAR — más decisiones correctas gana.
14. `football-trivia` — Trivial futbolero — cinco preguntas, puntuación calculada por el servidor.

Todos los juegos tienen 2 intentos diarios por defecto. El intento se consume en servidor al pulsar JUGAR; cerrar o recargar la página no lo restaura.

## Modo demo

El modo demo no consume intentos ni guarda resultados:

- `/retos/?demo=stop-seven`
- `/retos/?demo=reaction`
- `/retos/?demo=center-hit`
- `/retos/?demo=speed-tap`
- `/retos/?demo=color-reflex`
- `/retos/?demo=quick-maths`
- `/retos/?demo=grid-memory`
- `/retos/?demo=sequence`
- `/retos/?demo=keep-up`
- `/retos/?demo=penalties`
- `/retos/?demo=goalkeeper`
- `/retos/?demo=top-bins`
- `/retos/?demo=var-offside`
- `/retos/?demo=football-trivia`

## Clasificaciones

La clasificación diaria usa el mejor intento de cada jugador.

La temporada es mensual y convierte la posición diaria en puntos:

- 1º: 10
- 2º: 8
- 3º: 7
- 4º: 6
- 5º: 5
- 6º: 4
- 7º: 3
- 8º: 2
- resto de participantes: 1

Nunca se suman directamente puntuaciones incompatibles entre juegos.

## Datos e historial

La pantalla muestra:

- reto y clasificación de hoy;
- clasificación mensual;
- último reto anterior;
- historial de retos con ganador, participantes y resultado personal.

## Trivial editable

El banco se administra en `/retos/admin-trivia.html` y exige rol `admin`.

Cada pregunta contiene:

- enunciado;
- cuatro respuestas;
- respuesta correcta;
- categoría;
- dificultad;
- explicación opcional;
- activa/inactiva.

El navegador del jugador no recibe `correct_index`. Cuando el trivial sale como reto diario, Supabase fija cinco IDs de preguntas en `daily_challenges.config.question_ids`; por tanto todos los jugadores reciben el mismo conjunto. La puntuación se calcula en `finish_trivia_game_attempt`, no en el navegador.

Puntuación por pregunta correcta: hasta 1000 puntos, bajando con el tiempo de respuesta hasta un mínimo de 200. Respuesta incorrecta o sin respuesta: 0.

## Arquitectura

- `js/core/game-registry.js`: registro/fábrica de juegos.
- `js/services/challenge-service.js`: acceso a RPC de Supabase.
- `js/games/*.js`: implementación independiente de cada juego.
- `admin-trivia.html` + `js/trivia-admin.js`: gestión del banco de preguntas.
- `game_definitions`: catálogo y configuración.
- `daily_challenges`: juego asignado a cada fecha.
- `game_attempts`: intentos iniciados/completados/inválidos.
- `game_seasons`: temporadas mensuales.
- `trivia_questions`: banco editable de preguntas.

Los resultados reales se validan y guardan mediante RPC de Supabase; el navegador no inserta intentos directamente.

## Juegos de fútbol

`Que no caiga` usa física simple en tiempo real y Pointer Events. `Penaltis`, `Portero` y `A la escuadra` trabajan sobre una portería interactiva común. `VAR` es una simplificación deliberada del fuera de juego para convertirlo en un reto corto de decisión rápida, no un simulador completo del reglamento IFAB.
