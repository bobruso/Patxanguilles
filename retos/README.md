# Reto del día — Patxanguilles

Módulo independiente de minijuegos diarios. Requiere una cuenta Patxanguilles vinculada a `players.id` para jugar en modo real.

## Estado actual de la criba

El catálogo competitivo vigente tiene **22 juegos activos**.

### Aprobados por Jorge

1. `stop-seven` — Stop 7
2. `speed-tap` — Speed Tap
3. `arrow-rush` — Arrow Rush

### Retocados y pendientes de segunda valoración

1. `reaction` — Reacción
2. `center-hit` — Clava el centro
3. `color-reflex` — Color Reflex
4. `quick-maths` — Quick Maths
5. `grid-memory` — Grid Memory
6. `sequence` — Secuencia
7. `football-trivia` — Trivial futbolero
8. `cups` — Cups
9. `memory-cards` — Memory Cards
10. `tower-stack` — Tower Stack
11. `zig-zag` — Zig Zag
12. `lane-rush` — Lane Rush
13. `drop-zone` — Drop Zone
14. `shape-gate` — Shape Gate
15. `snake-sprint` — Snake Sprint
16. `odd-one` — Odd One
17. `balance` — Balance
18. `target-lock` — Target Lock
19. `catch-drop` — Catch Drop

## Cambios principales tras feedback

- Reacción: aparece un balón en posición aleatoria y gana el menor tiempo hasta tocarlo.
- Clava el centro: racha infinita hasta fallo; la barra acelera con cada acierto.
- Color Reflex: efecto Stroop real; hay que responder al color de la tinta, no a la palabra; racha hasta fallo y tiempo decreciente con suelo de 2 s.
- Quick Maths: racha hasta fallo con operaciones cada vez más difíciles.
- Grid Memory: cuadrículas crecientes y patrones más complejos.
- Secuencia: patrones y cuadrícula crecientes, con colores más simples.
- Trivial futbolero: 10 preguntas, 15 s cada una; fallo no termina. Cada acierto vale 250–1000 puntos según velocidad, máximo 10.000.
- Cups: una vida; la primera equivocación termina.
- Memory Cards: 12 parejas de cromos de fútbol vintage.
- Tower Stack: la cámara acompaña la parte superior de la torre.
- Zig Zag: inicio fácil, curvas suaves y velocidad/dificultad progresivas.
- Lane Rush: jugador con balón sobre césped, tres carriles y defensas haciendo entradas; velocidad creciente.
- Drop Zone: balón de fútbol y portería móvil con red; cada nivel acelera y estrecha la portería.
- Shape Gate: polígonos irregulares con más vértices y diferencias progresivamente más sutiles.
- Snake Sprint: swipe/D-pad en móvil y flechas/WASD en PC.
- Odd One: cuadrículas 3×3 hasta 6×6 con símbolos cada vez más parecidos.
- Balance: balancín con pelota; se acorta cada 4 s y gana quien aguanta más tiempo.
- Target Lock: cada ronda aumenta velocidad y reduce el margen válido.
- Catch Drop: rehecho como Arkanoid con balón de fútbol.

## Descartados / inactivos

Hay **13 juegos inactivos** en Supabase.

### Descartados durante la criba general

- `higher-lower` — Higher or Lower
- `orbit-pins` — Orbit Pins
- `rhythm-tap` — Rhythm Tap
- `flash-count` — Flash Count
- `swipe-sort` — Swipe Sort

### Juegos de fútbol descartados anteriormente

- `keep-up`
- `penalties`
- `goalkeeper`
- `top-bins`
- `var-offside`
- `spot-ball`
- `perfect-pass`
- `free-kick`

El código puede quedar archivado para reutilizar ideas, pero estos juegos no forman parte de la rotación diaria.

## Flujo del juego diario

Antes de cualquier intento oficial, la pantalla explica el juego con tres pasos y muestra cómo se calcula la clasificación.

Hay dos acciones claramente separadas:

- `PROBAR JUEGO`: práctica ilimitada, no crea `game_attempt`, no consume intentos y no guarda resultado.
- `JUGAR POR PUNTOS`: abre una confirmación explícita; solo tras confirmar se crea el intento oficial en servidor.

La confirmación recuerda cuántos intentos quedan y que cerrar o recargar después de iniciar no devuelve el intento.

La práctica usa una semilla distinta de la partida oficial para no revelar una secuencia competitiva. En el Trivial, la práctica usa un pequeño banco independiente del reto oficial.

Todos los juegos tienen 2 intentos oficiales diarios por defecto. La clasificación usa únicamente resultados oficiales.

## Diseño

La interfaz utiliza una tarjeta protagonista para el juego del día, colores por familia de juego, tipografía grande, superficies claras y controles táctiles grandes. Las referencias de producto son apps de microjuegos sociales como Playus, pero los layouts, estilos y assets de Patxanguilles son propios.

Paletas dinámicas:

- tiempo: violeta/amarillo;
- reflejos: coral/naranja;
- precisión: azul/cian;
- velocidad: naranja/amarillo;
- lógica: azul;
- memoria: violeta/magenta;
- arcade: rosa/violeta;
- trivial de fútbol: verde/amarillo.

## Modo demo y laboratorio ADMIN

El modo demo por URL no consume intentos ni guarda resultados: `/retos/?demo=<id>`.

El laboratorio está en `/retos/admin-games.html`, exige rol `admin` y lista únicamente los 22 juegos activos. Permite marcar `OK / RETOCAR / FUERA`, escribir una nota y copiar un resumen de feedback.

`/retos/dev-check.html` comprueba que los 22 módulos activos cargan, se registran y cumplen el contrato básico del motor sin iniciar partidas ni tocar Supabase.

## Clasificaciones

La clasificación diaria usa el mejor intento oficial de cada jugador. La temporada es mensual y convierte la posición diaria en puntos: 10, 8, 7, 6, 5, 4, 3, 2 y 1 punto para el resto de participantes. Nunca se suman directamente puntuaciones incompatibles entre juegos.

## Datos e historial

La pantalla muestra reto y clasificación de hoy, clasificación mensual, último reto anterior e historial con ganador, participantes y resultado personal.

## Trivial editable

El banco se administra en `/retos/admin-trivia.html` y exige rol `admin`. El navegador del jugador no recibe la respuesta correcta antes de contestar. Cada intento oficial contiene 10 preguntas y Supabase corrige cada respuesta, calcula los puntos por velocidad y cierra la puntuación final en servidor.

## Arquitectura

- `js/core/game-registry.js`: registro/fábrica de juegos.
- `js/services/challenge-service.js`: acceso a RPC de Supabase.
- `js/games/*.js`: implementación independiente de cada juego.
- `admin-trivia.html` + `js/trivia-admin.js`: banco editable de preguntas.
- `game_definitions`: catálogo y configuración.
- `daily_challenges`: juego asignado a cada fecha.
- `game_attempts`: intentos iniciados/completados/inválidos.
- `game_seasons`: temporadas mensuales.
- `trivia_questions`: banco editable de preguntas.

Los juegos arcade usan `finish_arcade_game_attempt`; Trivial usa su corrección específica en servidor y los juegos básicos conservan su validador original.

## Pendiente — Patxanguilles Heads

Crear más adelante un juego permanente separado de `Reto del día`, inspirado en el concepto de fútbol arcade 1v1 de cabezones, pero con diseño, físicas, HUD y assets propios de Patxanguilles.

Primera fase prevista: `/juegos/cabezones/`, jugador vs CPU, 2 jugadores locales, cabezas PNG de los Patxanguilles sobre cuerpos comunes, controles PC/móvil, físicas de balón/portería y marcador. Si el prototipo resulta divertido, segunda fase con salas privadas 1v1 online, revancha, estadísticas, liga y torneos.
