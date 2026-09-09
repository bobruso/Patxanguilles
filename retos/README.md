# Reto del día — Patxanguilles

Módulo independiente de minijuegos diarios. Requiere una cuenta Patxanguilles vinculada a `players.id` para jugar en modo real.

## Juegos activos

1. `stop-seven` — Stop 7
2. `reaction` — Reacción
3. `center-hit` — Clava el centro
4. `speed-tap` — Speed Tap
5. `color-reflex` — Color Reflex
6. `quick-maths` — Quick Maths
7. `grid-memory` — Grid Memory
8. `sequence` — Secuencia
9. `football-trivia` — Trivial futbolero
10. `higher-lower` — Higher or Lower
11. `cups` — Cups
12. `memory-cards` — Memory Cards
13. `tower-stack` — Tower Stack
14. `zig-zag` — Zig Zag
15. `lane-rush` — Lane Rush
16. `arrow-rush` — Arrow Rush
17. `drop-zone` — Drop Zone
18. `orbit-pins` — Orbit Pins
19. `rhythm-tap` — Rhythm Tap
20. `shape-gate` — Shape Gate
21. `snake-sprint` — Snake Sprint
22. `odd-one` — Odd One
23. `flash-count` — Flash Count
24. `balance` — Balance
25. `target-lock` — Target Lock
26. `swipe-sort` — Swipe Sort
27. `catch-drop` — Catch Drop

Todos los juegos tienen 2 intentos diarios por defecto. El intento se consume en servidor al pulsar JUGAR; cerrar o recargar la página no lo restaura.

## Descartados de la rotación

Tras probarlos se desactivaron `keep-up`, `penalties`, `goalkeeper`, `top-bins`, `var-offside`, `spot-ball`, `perfect-pass` y `free-kick`. El código queda archivado, pero no se carga desde `retos/index.html` ni aparece en la rotación diaria.

El único juego de temática fútbol que permanece activo es `football-trivia`.

## Modo demo

El modo demo no consume intentos ni guarda resultados. Formato: `/retos/?demo=<id>`.

Todos los IDs de la lista de juegos activos están disponibles en modo demo.

## Clasificaciones

La clasificación diaria usa el mejor intento de cada jugador. La temporada es mensual y convierte la posición diaria en puntos: 10, 8, 7, 6, 5, 4, 3, 2 y 1 punto para el resto de participantes. Nunca se suman directamente puntuaciones incompatibles entre juegos.

## Datos e historial

La pantalla muestra reto y clasificación de hoy, clasificación mensual, último reto anterior e historial con ganador, participantes y resultado personal.

## Trivial editable

El banco se administra en `/retos/admin-trivia.html` y exige rol `admin`. El navegador del jugador no recibe `correct_index`; Supabase fija las cinco preguntas de ese día y calcula la puntuación final en servidor.

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

Los juegos de las tandas arcade usan `finish_arcade_game_attempt`; Trivial usa su corrección específica en servidor y los juegos básicos conservan su validador original.

## Pendiente — Patxanguilles Heads

Crear más adelante un juego permanente separado de `Reto del día`, inspirado en el concepto de fútbol arcade 1v1 de cabezones, pero con diseño, físicas, HUD y assets propios de Patxanguilles.

Primera fase prevista: `/juegos/cabezones/`, jugador vs CPU, 2 jugadores locales, cabezas PNG de los Patxanguilles sobre cuerpos comunes, controles PC/móvil, físicas de balón/portería y marcador. Si el prototipo resulta divertido, segunda fase con salas privadas 1v1 online, revancha, estadísticas, liga y torneos.
