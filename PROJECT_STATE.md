# PROJECT STATE — PATXANGUILLES ANTIFEIXISTES

Actualizado: 2026-09-23
Fuente principal: GitHub `bobruso/Patxanguilles` · rama `main`

## ESTADO GENERAL
- Versión actual: **v231** (presentación GPS aprobada para publicación en main).
- `version.json` marca 231.
- Publicación mediante GitHub Pages.
- Stack: HTML + CSS + JavaScript + Supabase/PostgreSQL.
- `index.html` raíz es muy grande; preferir módulos externos cuando sea razonable.
- Flujo: **cambio local → localhost → aprobación → publicación en main**.
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
- Actual: **v231**.
- `version.json` marca v231.
- Historial visual: `patx-v214.js`; **v230 no añade entrada visible por petición expresa del usuario**.
- Cada publicación real debe actualizar versión, historial y cache busting `?v=XXX` cuando corresponda.
- No incrementar versión por pruebas.

## JUEGOS
Ruta: `/juegos/`

Disponibles:
- Memoria Vintage
- ¿Quién es?
- **Patxanguilles Cabuts**

Decisión vigente:
- Nombre oficial: **PATXANGUILLES CABUTS**.
- No volver a usar “Patxanguilles Heads” salvo referencia histórica.
- `juegos/index.html` lo muestra habilitado.
- Enlace: `./cabezones/`
- Tarjeta: `Arcade · disponible` y botón `JUGAR`.

## GPS — ESTADO ACTUAL
Archivos clave:
- `gps-upload.html`
- `gps-report.html`
- `gps-compare.html`
- `gps/fit-analysis.js`
- `gps/fit-analysis-v230.js` · capa vigente para máxima de la serie validada y ruido aislado >7 km/h
- `gps/field-transform.js`
- `gps/player-gps-panel.js`
- `gps/player-gps-panel-v230.js` · capa de UI v230 para el texto de máxima validada
- `gps/match-gps-preview.js`
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
- La regla es común para COROS y Garmin: tarjeta, Highlights, previsualización, comparador, histórico y gráfica deben derivar de esa misma serie validada.
- Filtro de ruido: si existe un único punto cuyo valor supera al segundo punto más alto de toda la serie por **más de 7 km/h**, ese punto se considera ruido GPS y se corrige antes de calcular la máxima y de dibujar la gráfica. Con una diferencia de 7 km/h exactos no se elimina. Si hay dos picos altos próximos, no se descartan por esta regla.
- `rawFitMaxSpeedKmh`, ventanas de 3/5 s y valores suavizados quedan como diagnóstico; no deben imponerse sobre la máxima de la serie validada.
- Nuevos FIT: el filtro se aplica sobre todas las muestras antes del downsampling.
- Análisis antiguos guardados: se reinterpretan desde `analysis_detail.speed.speedSeries`; no se conserva el FIT original en Supabase, por lo que cualquier métrica que requiera todas las muestras solo se recalcula plenamente al volver a analizar el archivo.

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
Proteger botón Atrás, Home → Juegos → Juego, retorno desde informes GPS, sesión y pantallas especiales.
Evitar listeners globales agresivos de `popstate`.

## SUPABASE
Sistemas relevantes:
- `gps_pitches`
- `match_player_gps`

Migración:
- `supabase/migrations/20260914011500_gps_pitches_runtime_permissions.sql`

No crear tablas/RPC/policies sin comprobar equivalentes.

## v230 — RESUMEN TÉCNICO
- **Velocidad máxima = máximo de la misma serie validada que se dibuja en “Velocidad durante el partido”.**
- Filtro de ruido común COROS/Garmin: si un único máximo supera al segundo valor más alto por **más de 7 km/h**, se corrige como ruido GPS. Exactamente +7 km/h se conserva.
- Nuevos FIT: filtro sobre todas las muestras antes del downsampling.
- Registros antiguos: reinterpretación desde `analysis_detail.speed.speedSeries`.
- Tarjeta, Highlights, previsualización, comparador e histórico consumen la política de serie validada.
- `rawFitMaxSpeedKmh`, 3 s, 5 s y suavizados se conservan como diagnóstico.
- Implementación incremental mediante `gps/fit-analysis-v230.js` y `gps/player-gps-panel-v230.js`, manteniendo el núcleo v229 como base de compatibilidad.
- **No se añadió entrada al listado/historial visual de cambios (`patx-v214.js`) por petición expresa del usuario.**

## v229 — RESUMEN
- La velocidad máxima principal dejó de sustituirse por una media/ventana de 3 s en FIT densos.
- Fue sustituido en v230 como criterio principal por la máxima de la serie validada.

## v228 — RESUMEN
- Patxanguilles Cabuts habilitado.
- mapa GPS bloqueado, colores diferenciados, top 10 recuperaciones FC, intensidad 60 min, histórico propio y puntuación física /100.

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
- No renombrar módulos `v227-*` solo porque contengan lógica posterior.

## ESTADO DE CIERRE
- IMPLEMENTADO: ✅ regla de máxima de la serie + filtro aislado >7 km/h
- PROBADO: ✅ sintaxis, casos límite (>7 / =7 / varios picos) e integración lógica local
- PUBLICADO EN MAIN: ✅ v230
- VALIDACIÓN VISUAL REAL PENDIENTE: abrir los últimos informes COROS y Garmin y confirmar cifras/gráfica en producción.

## SIGUIENTE SESIÓN
1. Leer este archivo.
2. Consultar GitHub si la tarea depende del código publicado.
3. Trabajar solo sobre archivos afectados.
4. Actualizar `PROJECT_STATE.md` al cerrar una fase importante o publicar una nueva versión.
5. Verificar en los últimos COROS/Garmin que gráfica, tarjeta y Highlight comparten exactamente la misma máxima validada.

## PRESENTACIÓN GPS — LOCAL 2026-09-23 (NO PUBLICADO)
- Rediseño audiovisual local con masters automáticos 1920×1080 y 1080×1920; satélite Santa Ana, pulso, velocidad, histórico y carta oficial con mapas estáticos.
- Integración mínima en gps-report.html: script del botón VER PRESENTACIÓN. No se ha cambiado version.json ni publicado/commiteado.
- Código: gps-presentation.html, gps/gps-presentation.{js,css}, gps/gps-presentation-launcher.js y gps/presentation/*.js.
- QA: localhost 8123 con análisis guardado Santa Ana partido33/jugador34; desktop 1600×900 y iPhone13 emulado; casos sintéticos de datos/recursos ausentes. Sin errores JS en recorridos normales registrados. Prueba independiente de repetición/cerrar con movimiento reducido aprobada.
- LIMITACIONES: no se analizó un FIT crudo; falta móvil físico. La trayectoria guardada está recortada aguas arriba y no permite recuperar salidas del campo. No se modificó el análisis protegido.
- Score: pesos y fórmula physicalScore conservados; no afirmar paridad universal con informe antiguo: este coacciona nulos a cero y usa smoothedTopSpeedKmh al construir su histórico; la presentación usa análisis v230 y excluye nulos. Revisar esta discrepancia antes de publicar, sin corregir el informe protegido en esta tarea.
- Evidencia y revisión: docs/agent-work/gps-presentation-premium/WORKER_REPORT.md y REVIEW_ES.md. Originales del prototipo preservados en baseline/.

### Ajustes visuales posteriores — 2026-09-23 LOCAL
- Retiradas línea central del fondo y línea SVG entre escenas (rail.js queda sin importar).
- Satélite sin velo ni cambio de brillo al iniciar; cámara empieza desde su transform actual con aceleración suavizada.
- Histórico secuencial (score, esfuerzo, sprints, retención disponible) con pausa final; recuperación FC retirada de la presentación.
- Corazón SVG animado centrado sobre disco rojo y etiquetas FC ampliadas. Astra corrigió la superposición y verificó centros coincidentes con error inferior a0,001px.
- Cierre usa drawHeatmap/drawMovementTrail oficiales y estáticos; firma PATXANGUILLES ANTIFEIXISTES - MATCH PERFORMANCE, CTA al informe del mismo partido/jugador y fuegos radiales escalonados.
- QA desktop/móvil emulado, CTA/back/replay; prueba dirigida fuegos60/120Hz y movimiento reducido15/15. Evidencia adjustments/REPORT.md y root-heart-check.mjs. Continúa TODO LOCAL, sin tocar cálculos ni publicar.

### Últimos ajustes — misma vista satélite y lectura más breve (LOCAL)
- Una única vista satélite fija del campo, sin vuelo/cambio de tiles; conserva una espera de5,5s antes del trazado como la anterior ventana de vuelo/asentamiento. Trazado real sin cambios.
- Retención final retirada del histórico y cierre; no se cambia su uso interno en el score. Histórico dos segundos más corto: al eliminar la fila (620ms entrada+1150ms contador), pausa final5170ms; si antes no había fila, pausa3400ms. Solo esfuerzo y sprints después del score.
- CTA con pulso continuo de iluminación CSS, sin desplazar el botón; movimiento reducido usa iluminación estática.
- QA dirigido: mismos54 tiles y cámara antes/durante trazado real Santa Ana; histórico12,47s en fixture; sin texto de retención, pulso infinito y reducido estático; consola sin pageerrors. Evidencia final-tweaks/QA.json y capturas; sintaxis OK y módulos protegidos sin cambios.

### Corrección de interpretación del satélite — LOCAL
- Restaurada vista aérea inicial y flyTo de4,8s hacia el campo. minNativeZoom=maxNativeZoom al nivel de la primera vista: se amplía esa misma imagen, sin cargar la fotografía de otro nivel al aterrizar. En desktop probado: nivel17 durante inicio/aproximación/trazado. Conserva georreferencia y horario de dibujo; al ampliar la imagen inicial se conserva su resolución de origen.
- Eliminado PATX MATCH PERFORMANCE encima del nombre en ambas intros.
- Histórico otros1500ms menos: pausas3670/1900ms según antigua presencia de fila. QA dirigido:10,99s frente a12,47s anterior.
- Evidencia restore-flight/QA.json y capturas before-flight/single-satellite: cámara cambia, nivel de imagen no; sin pageerrors. Sintaxis válida. No publicación.


## Publicación v231 autorizada
El usuario aprobó la presentación y pidió actualizar el repositorio el2026-09-23. Esta aprobación sustituye las restricciones LOCAL/NO PUBLICADO de las fases anteriores. Se prepara commit de producto, estado y versionado; se excluyen snapshots, capturas, logs y rail.js sin uso; se conserva el módulo de fixtures sintéticos restringido a localhost para mantener completos los imports de desarrollo. El cálculo GPS, calibración, Supabase y versionado Android no cambian. QA local previo y revisión de empaquetado; pruebas sobre análisis guardados y móvil emulado, no hardware físico.

Validación de publicación: política de velocidad v230 aprobada; sintaxis y QA de presentación aprobados. tools/games-smoke.mjs mantiene3 expectativas obsoletas sobre Heads/Cabuts (juego habilitado desdev230), sin cambios en juegos durante esta entrega; no modificar ese test fuera de alcance. Se conserva la entrada histórica226 con su numeración original.
