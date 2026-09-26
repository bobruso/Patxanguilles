# PROJECT STATE — PATXANGUILLES ANTIFEIXISTES

Actualizado: 2026-09-26
Fuente principal: GitHub `bobruso/Patxanguilles` · rama `main`

## ESTADO GENERAL
- Versión publicada actual: **v233**.
- `version.json` marca 233.
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
- Actual: **v233**.
- `version.json` marca v233.
- Historial visual: `patx-v214.js` incluye v233; **v230 no añade entrada visible por petición expresa del usuario**.
- Cada publicación real debe actualizar versión, historial y cache busting `?v=XXX` cuando corresponda.
- No incrementar versión por pruebas.

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

Migración:
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

## ÚLTIMA PUBLICACIÓN — v233
- Convocatorias por equipos: detección automática de Rojos/Negros al pegar texto.
- Probado con el ejemplo de 14 jugadores, pruebas automatizadas y navegador; validado por el usuario.
- Commit y push a main autorizados por el usuario el 2026-09-26.

## PUBLICACIÓN ANTERIOR — v232
- IMPLEMENTADO: ✅ navegación explícita presentación → análisis → ficha de partido.
- ARCHIVOS DE PRODUCTO: `gps/gps-presentation.js`, `gps/gps-presentation-launcher.js`, `gps-report.html`, `gps-presentation.html`.
- VERSIONADO/HISTORIAL: `version.json`, `patx-v214.js`, `PROJECT_STATE.md`.
- PROBADO ANTES DE PUBLICAR: ✅ revisión de rutas, sintaxis/lógica y harness dirigido de navegación; la presentación v231 ya tenía QA desktop y móvil emulado.
- PUBLICADO EN MAIN: ✅ v232 el 2026-09-23.
- PENDIENTE DE VALIDACIÓN REAL: probar en producción la X de presentación, «VER ANÁLISIS COMPLETO», «← PARTIDO» y Atrás físico en APK/WebView.

## SIGUIENTE SESIÓN
1. Leer este archivo y consultar `main` antes de tocar código.
2. Validar en dispositivo real el flujo GPS v232, especialmente Atrás en APK/WebView.
3. Si aparece una regresión de navegación, revisar primero `gps/gps-presentation.js`, `gps-report.html` y `gps/report-overlay.js`; no añadir `popstate` global sin necesidad.
4. Mantener la política de velocidad v230 y las protecciones de fotos/OCR, Santa Ana y comparador GPS.
