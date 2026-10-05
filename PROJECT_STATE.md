# PROJECT STATE — PATXANGUILLES ANTIFEIXISTES

Actualizado: 2026-10-05
Fuente principal: GitHub `bobruso/Patxanguilles` · rama `main`

## ESTADO GENERAL
- Versión publicada actual: **v236**.
- `version.json` marca 236.
- Publicación mediante GitHub Pages.
- Stack: HTML + CSS + JavaScript + Supabase/PostgreSQL.
- `index.html` raíz es muy grande; preferir módulos externos cuando sea razonable.
- Flujo normal: **cambio local → localhost → aprobación → publicación en main**.
- No usar force push ni limpiar/resetear repos locales sin autorización.

## FUENTES DE VERDAD
1. Código actual en GitHub o archivos actuales.
2. `PROJECT_STATE.md`.
3. Conversaciones del Proyecto.
4. Memoria general.

Distinguir siempre:
- PUBLICADO EN GITHUB
- LOCAL / EN PRUEBAS
- PREPARADO PERO NO PUBLICADO

## VERSIONADO
- Actual: **v236**.
- `version.json` marca v236.
- El historial visual incluye v236. v235 y v230 no añadieron entrada visible por petición expresa del usuario.
- Cada publicación real debe actualizar versión y revisar historial/cache busting `?v=XXX` cuando corresponda.
- No incrementar versión por pruebas.

## AÑADIR RESULTADO — CONVOCATORIAS
- Desde v233, el pegado de texto puede separar automáticamente Rojos y Negros cuando existen encabezados escritos (`Rojos`, `Negros`, `Equipo Rojo`, etc.).
- Desde **v236**, también se reconocen encabezados formados únicamente por emojis/símbolos claramente rojos o negros.
- Ejemplos válidos: `🔴🔴🔴` / `⚫️⚫️⚫️`, `❤️❤️❤️` / `🖤🖤🖤`, cuadrados, palos de cartas, banderas y otros marcadores habituales incluidos en la capa v236.
- Las líneas de cabecera del partido, fecha/hora y nombres no se interpretan como encabezados de equipo.
- Una mezcla rojo+negro en la misma línea no se asigna automáticamente.
- Archivo: `patx-v236-result-team-emojis.js`.
- `patx-update.js` carga esa capa con `?v=236`.
- Prueba dirigida: `tests/v236-result-team-emojis.test.mjs`.
- No mezclar esta importación de texto con el OCR de imagen `resultCallupImage`.

## JUEGOS
Ruta: `/juegos/`.

Disponibles:
- Memoria Vintage
- ¿Quién es?
- **Patxanguilles Cabuts**

Decisión vigente:
- Nombre oficial: **PATXANGUILLES CABUTS**.
- No volver a usar “Patxanguilles Heads” salvo referencia histórica.
- `juegos/index.html` lo muestra habilitado.
- Enlace: `./cabezones/`.

## FÚTBOL 7 — ALINEACIONES
- La generación automática F7 se resuelve en Supabase mediante `generate_teams`.
- El frontend solicita la primera alineación y también las alternativas de «Probar otra alineación» al backend; F7 no debe caer silenciosamente al algoritmo local si falla la RPC.
- Criterios visibles y mantenidos: posiciones y rendimiento histórico de victorias con corrección por tamaño de muestra.
- Las alternativas deben evitar repetir la misma partición cuando exista otra opción suficientemente equilibrada.
- Plantilla F7 activa excluye temporalmente a **Cordo, Erika, Jorgito y Oskar**. Sus registros se conservan en Supabase con `football7=false` y pueden reactivarse si vuelven a jugar.
- César y Toni son porteros; cuando coinciden, deben quedar separados uno por equipo.
- `patx-v214.js` contiene la capa de integración vigente para roster F7 y generación remota.

## GPS — ESTADO ACTUAL
Archivos clave:
- `gps-upload.html`
- `gps-report.html`
- `gps-presentation.html`
- `gps-compare.html`
- `gps/fit-analysis.js`
- `gps/fit-analysis-v230.js` · capa vigente para máxima de la serie validada y ruido aislado >7 km/h
- `gps/field-transform.js`
- `gps/player-gps-panel.js`
- `gps/player-gps-panel-v230.js` · capa UI vigente para la máxima validada
- `gps/match-gps-preview.js`
- `gps/report-overlay.js`
- `gps/gps-presentation.js`
- `gps/gps-presentation.css`
- `gps/gps-presentation-launcher.js`
- `gps/presentation/*.js`
- `gps/v227-report-enhancements.js`
- `gps/v227-gps-enhancements.css`
- `gps/v227-compare-enhancements.js`

Nota: algunos archivos conservan nombre `v227` aunque contienen mejoras posteriores. No renombrarlos sin necesidad.

### Campo calibrado
- Usa `gps_pitches` en Supabase.
- Santa Ana debe usar calibración real si está disponible.
- Evitar guardar autoajustes silenciosos cuando debería existir campo calibrado.
- `field-transform.js` incluye `unproject()` para reconstruir recorrido sobre mapa real.

### Velocidad
- Decisión vigente desde v230: **Velocidad máxima = pico máximo validado de la misma serie que se dibuja en “Velocidad durante el partido”**.
- Regla común COROS/Garmin: tarjeta, Highlights, previsualización, comparador, histórico y gráfica deben derivar de esa misma serie validada.
- Filtro de ruido: si existe un único punto cuyo valor supera al segundo punto más alto de toda la serie por **más de 7 km/h**, se considera ruido GPS y se corrige antes de calcular la máxima y dibujar la gráfica. Con diferencia exacta de 7 km/h se conserva. Si hay dos picos altos próximos, no se descartan por esta regla.
- `rawFitMaxSpeedKmh`, ventanas de 3/5 s y suavizados quedan como diagnóstico; no deben imponerse sobre la máxima principal.
- Nuevos FIT: el filtro se aplica sobre todas las muestras antes del downsampling.
- Análisis antiguos guardados: se reinterpretan desde `analysis_detail.speed.speedSeries`; no se conserva el FIT original en Supabase.

### Zonas
- Z1: 0–2 km/h
- Z2: 2–7 km/h
- Z3: 7–13 km/h
- Z4: 13–18 km/h
- Z5: ≥18 km/h
- Alta intensidad común: >13 km/h.
- Referencia absoluta alta: 18 km/h.
- Sprints relativos: umbral personalizado.

### Informe GPS
- Mapa satélite de campo real.
- Vista bloqueada: rueda/scroll no hace zoom.
- Colores diferenciados en ocupación, intensidad y zonas FC.
- Recuperación FC: solo las **10 ventanas más destacadas**.
- Intensidad 60 min: gráfico de barras dobles, referencia inicial = 100%.
- Comparativa histórica del mismo jugador usa FIT anteriores, excluye partido actual y compara contra media histórica.
- Incluye **PUNTUACIÓN PARTIDO /100**; aproximadamente 70/100 representa su partido medio histórico.
- Es una nota física/comparativa, no técnica ni de resultado.

### Presentación GPS
- **PUBLICADA desde v231**.
- Presentación audiovisual automática adaptada a horizontal y vertical.
- Escenas: aproximación satélite al campo, recorrido, FC, velocidad/sprints, histórico y cierre con carta/mapas oficiales.
- No modifica cálculos GPS; consume el análisis vigente.
- `gps-report.html` incorpora «VER PRESENTACIÓN» mediante `gps/gps-presentation-launcher.js`.
- Desde v232, la X y «VER ANÁLISIS COMPLETO» regresan al informe correspondiente sin crear rebotes de historial.
- Si la presentación se abrió desde el informe embebido, conserva el informe como contexto de retorno; en navegación del mismo contexto/WebView vuelve al informe existente.
- Una apertura directa de `gps-presentation.html` sustituye la presentación por el informe al salir para no dejar la presentación detrás en el historial.

### Navegación informe/presentación — v232
Flujo esperado:
`Ficha partido → Análisis GPS → Presentación → Análisis GPS → Ficha partido`.

- `gps-report.html` ya no usa un `history.back()` ciego en «← PARTIDO» cuando está embebido: envía `patx-gps-close-report` al padre.
- `gps/report-overlay.js` sigue siendo la pieza canónica que cierra el overlay y deja visible la ficha del partido; no se añadió un listener global nuevo de `popstate`.
- El botón Atrás de Android/WebView, después de volver de la presentación al análisis, no debe reabrir la presentación.
- No cambiar esta navegación por un `history.back()` genérico sin revisar overlay + WebView/APK.

### Comparador GPS
- Separar métricas absolutas e individualizadas.
- Los sprints relativos no deben decidir automáticamente un “ganador”.
- Para carga entre jugadores, priorizar métricas comunes.
- La velocidad máxima comparable debe usar el pico máximo validado de la misma serie de velocidad que se muestra en el informe.

## FRECUENCIA CARDÍACA
- Referencia Patx: `208 - 0.7 × edad`.
- No cambiar a `220 - edad` solo porque otra herramienta lo use.
- Recuperación FC no debe presentarse como diagnóstico médico.

## FOTOS VS OCR
Dos sistemas separados:
- Fotos normales: input `matchPhoto`.
- OCR de convocatorias: input `resultCallupImage`.

Regla crítica: **Una foto normal NUNCA debe entrar en el OCR F7.**
Archivo de aislamiento: `patx-v227-photo-routing.js`.

## NAVEGACIÓN / ANDROID
- Proteger botón Atrás, Home → Juegos → Juego, retorno desde informes GPS, sesión y pantallas especiales.
- Evitar listeners globales agresivos de `popstate`.
- Para GPS, conservar el mecanismo overlay de `gps/report-overlay.js` y el flujo explícito de v232.

## SUPABASE
Sistemas relevantes:
- `gps_pitches`
- `match_player_gps`
- `generate_teams` · generación remota de alineaciones F7

Migración publicada en repositorio:
- `supabase/migrations/20260914011500_gps_pitches_runtime_permissions.sql`

No crear tablas/RPC/policies sin comprobar equivalentes.

## NO TOCAR / REGRESIONES
- No mezclar fotos y OCR.
- No volver a mezclar una máxima tomada de una fuente distinta de la serie que se dibuja en el informe.
- No eliminar picos salvo la regla explícita de ruido: un único máximo >7 km/h por encima del segundo valor más alto.
- Exactamente +7 km/h se conserva.
- Mantener pico FIT, 3 s/5 s y valores suavizados solo como diagnóstico.
- No comparar injustamente sprints personalizados.
- No romper calibración Santa Ana.
- No refactor general por tareas pequeñas.
- No tocar navegación Android global sin probar Atrás.
- No convertir el retorno GPS v232 de nuevo en `history.back()` ciego.
- No renombrar módulos `v227-*` solo porque contengan lógica posterior.
- En F7, no reintroducir fallback local silencioso para crear equipos o probar otra alineación.
- En importación de resultado, conservar compatibilidad con encabezados escritos y no interpretar líneas mixtas rojo/negro como un equipo.

## ÚLTIMA PUBLICACIÓN — v236
- «Añadir resultado» reconoce encabezados de equipo basados solo en emojis/símbolos rojos y negros, además de los encabezados escritos existentes.
- Ejemplo real validado: `🔴🔴🔴` con Héctor, Benja, Àlex, Nelo, Jota, Datxu y César; `⚫️⚫️⚫️` con Jorge, Xavi, Pau, Rico, Guillem, Ernest y Germán → **14/14, 7/7**.
- Corazones `❤️/🖤` y otros marcadores habituales también cubiertos.
- El cambio vive en `patx-v236-result-team-emojis.js`; `patx-update.js` carga la capa con cache busting `?v=236`.
- PROBADO: sintaxis del módulo, clasificación de marcadores, compatibilidad con encabezados por texto, rechazo de mezclas rojo/negro e integración con el parser de convocatoria actual.
- PUBLICADO EN MAIN: ✅ autorizado por el usuario el 2026-10-05.
- HISTORIAL VISUAL: entrada v236 incluida.

## PUBLICACIÓN ANTERIOR — v235
- Plantilla F7 activa actualizada: Cordo, Erika, Jorgito y Oskar quedan fuera de selección, entrenador, convocatorias y clasificación; sus registros siguen conservados en Supabase.
- Generación F7 consolidada en Supabase tanto para la primera alineación como para «Probar otra alineación».
- Se mantienen posiciones e histórico de victorias corregido por muestra y se evita repetir la misma partición cuando existe una alternativa equilibrada.
- César y Toni quedan separados cuando ambos actúan como porteros en la misma convocatoria.
- PROBADO: sintaxis JS, harness de integración, generaciones inicial/alternativa en PostgreSQL y permisos de acceso al backend.
- PUBLICADO EN MAIN: ✅ autorizado por el usuario el 2026-10-05.
- HISTORIAL VISUAL: sin entrada v235 por petición expresa del usuario.

## PUBLICACIÓN ANTERIOR — v234
- Balance visual de temporada: victorias, empates, porcentajes y goles por modalidad, solo partidos finalizados.
- Visible encima de Últimos partidos y en Calendario, incluida la entrada móvil.
- Verificados cálculos y sintaxis; navegador a 1280, 390 y 320 px sin desbordamientos.
- Commit y push a main autorizados por el usuario el 2026-09-26.

## SIGUIENTE SESIÓN
1. Leer este archivo y consultar `main` antes de tocar código.
2. Validar en uso real el pegado de una convocatoria con encabezados solo de emojis rojos/negros en «Añadir resultado».
3. Validar en uso real una convocatoria F7 con «Hacer equipos» y varias pulsaciones de «Probar otra alineación».
4. Confirmar que Cordo, Erika, Jorgito y Oskar no aparecen en selección, entrenador ni clasificación F7.
5. Mantener la política de velocidad v230 y las protecciones de fotos/OCR, Santa Ana, comparador GPS y navegación v232.
