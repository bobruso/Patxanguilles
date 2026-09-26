# Report — Import de convocatoria con equipos (Rojos/Negros)

## Estado
Implementado y verificado en local (sin commit, sin publicar, sin subir versión).

## Cambios
- `index.html`
  - `resultCallupTeamKey()` (línea 10357): detecta encabezados de equipo.
  - `parseResultCallupText()` (línea 10371): separa nombres por equipo, aplica
    reservas, duplicados y conflictos, y mantiene el modo legado sin encabezados.
    Expone `total` (jugadores únicos detectados antes de recortar) y filtra
    `unassigned` a los nombres que no acaban en ningún equipo (línea 10446).
  - `parseResultCallup()` (línea 10451): pinta cada lista en su equipo y redacta
    el estado con reparto, avisos y recordatorio de corrección manual.
    El aviso usa `detectedTotal` (línea 10457), no el tamaño de la lista ya
    recortada.
- `tests/result-callup-import.test.mjs`: ejecuta el código real de `index.html`
  en un sandbox con DOM mínimo (extrae las funciones del archivo, no copias).
- `tests/result-callup-import-ui.mjs`: misma comprobación en Chromium real.
- Evidencia: `docs/agent-work/result-team-import/ui-check.json` y `ui-check.png`.

## Comportamiento
- Con encabezados: cada nombre exacto se marca solo en su equipo; el estado dice
  «He detectado N de M jugadores: X en Rojos y Y en Negros».
- Sin encabezados: se mantiene el reparto antiguo (misma lista en ambos equipos)
  y el recorte al número necesario; el estado sigue contando **todo** lo
  detectado (p. ej. «16 de 14» con aviso de «jugadores de más») aunque las
  casillas solo marquen los necesarios.
- Desconocidos y parecidos se avisan («Nombre → ¿Parecido?») y no se marcan.
- Mismo jugador en los dos bloques: se queda en el primero y se avisa.
- Repetidos dentro de un bloque: uno solo, con aviso.
- Un nombre visto antes del primer encabezado solo se avisa como «sin asignar»
  si no aparece después dentro de un equipo.
- Todo lo posterior a «Reservas» se ignora.
- Reimportar y «Limpiar» repintan ambas listas desde cero (sin restos).

## Verificación
| Comando | Resultado |
| --- | --- |
| `node tests/result-callup-import.test.mjs` | pasa: muestra, encabezados invertidos, variantes, legado numerado, legado 16>14 (recorte + aviso «16 de 14»), legado con puntos, desconocidos/parecidos/reservas, duplicados/conflicto, sin-equipo y reasignado, reimportar/limpiar y FS |
| `node tests/result-callup-import-ui.mjs` | pasa en Chromium headless sobre `index.html`: 7 rojos y 7 negros reales en el DOM, estado visible y «Limpiar» deja 0 marcados |
| `node tests/v230-speed-policy.test.mjs` | pasa (sin cambios de GPS) |
| `node tests/football-gps-engine.test.mjs` | pasa (sin cambios de GPS) |
| `node tests/real-fit-regression.test.mjs` | falla por dependencia ausente en `%TEMP%\patx-fit-validation` (`fit-file-parser`), ajena a este cambio |

El test de UI se ejecutó fuera del sandbox porque Chromium necesita lanzar un
proceso; el resultado es el mismo comando registrado arriba. No se volvió a
lanzar en la pasada de corrección (la muestra no tiene sobrantes, duplicados ni
nombres sin equipo, así que su estado no cambia); solo se re-ejecutó el test
unitario dirigido.

### Ciclo rojo/verde de la corrección
Con las dos regresiones nuevas y el código antiguo restaurado a propósito:
`legado: el aviso cuenta los 16 detectados` falla con «He detectado 14 de 14
jugadores», y `sin falso aviso de nombre sin asignar` falla con «sin asignar:
Julio». Con las correcciones aplicadas, el mismo test pasa.

### Fin de línea
`index.html` quedó con 137 líneas sueltas LF (las insertadas) sobre CRLF; se
normalizaron a CRLF a nivel de bytes (sin BOM, sin tocar el resto del archivo).
Los archivos nuevos (`tests/result-callup-import*.mjs`, este informe y el brief)
también se pasaron a CRLF para seguir la convención del repositorio.

## Limitaciones y decisiones
- El modo con encabezados no recorta al número necesario: si se pegan más
  jugadores de los que corresponden, se marcan todos y el estado avisa. Se
  prefirió no descartar nombres en silencio.
- Los encabezados admiten «Equipo/Los/Las» y adornos, pero no una línea que
  mezcle título y nombres («Negros: Julio, Xavi»): esa línea se trata como texto
  no reconocido y se avisa, sin marcar nada.
- No se tocó `patx-v212.js` (OCR de imagen), que ya asignaba por equipos con
  `window.renderChecks`; solo se comprobó que no sobrescribe el import de texto.
- El texto del estado se escribe con `textContent`, así que el contenido pegado
  no se interpreta como HTML.

## Pendiente para Astra
- Revisión y aceptación del bundle; decisión sobre incluir `tests/*.mjs` de este
  cambio en algún flujo de CI (hoy no hay workflow de tests de `tests/`).
