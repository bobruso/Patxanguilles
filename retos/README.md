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

## Arquitectura

- `js/core/game-registry.js`: registro/fábrica de juegos.
- `js/services/challenge-service.js`: acceso a RPC de Supabase.
- `js/games/*.js`: implementación independiente de cada juego.
- `game_definitions`: catálogo y configuración.
- `daily_challenges`: juego asignado a cada fecha.
- `game_attempts`: intentos iniciados/completados/inválidos.
- `game_seasons`: temporadas mensuales.

Los resultados reales se validan y guardan mediante RPC de Supabase; el navegador no inserta intentos directamente.