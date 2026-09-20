# PROJECT STATE — PATXANGUILLES ANTIFEIXISTES

Actualizado: 2026-09-20
Fuente principal: GitHub `bobruso/Patxanguilles` · rama `main`

## ESTADO GENERAL
- Versión publicada actual: **v229**.
- `version.json` en `main` marca 229.
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
- Actual: **v229**.
- `version.json` contiene el resumen v229.
- Historial visual: `patx-v214.js`.
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
- La versión nueva del juego ya fue subida al repositorio por el usuario.

## GPS — ESTADO ACTUAL
Archivos clave:
- `gps-upload.html`
- `gps-report.html`
- `gps-compare.html`
- `gps/fit-analysis.js`
- `gps/field-transform.js`
- `gps/player-gps-panel.js`
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
- Decisión vigente desde v229: **Velocidad máxima = pico máximo registrado en el FIT del dispositivo**, tanto COROS como Garmin.
- `rawFitMaxSpeedKmh` es la fuente principal cuando está disponible, independientemente de que el FIT sea `dense-gps` o `smart-recording`.
- La velocidad GPS raw, la velocidad suavizada y la ventana de 3 s se conservan como diagnóstico/fallback; no deben sustituir la velocidad máxima principal cuando el FIT aporta su pico.
- Los análisis guardados antes de v229 se reinterpretan al cargarse usando `analysis_detail.gpsEngine.metrics.rawFitMaxSpeedKmh` cuando existe; no hace falta volver a subir el FIT para ver la máxima correcta.
- No mezclar “velocidad máxima” con “mejor velocidad sostenida 3 s”.

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
- Comparativa histórica del mismo jugador:
  - usa FIT anteriores;
  - excluye partido actual;
  - compara contra media histórica;
  - distancia, alta intensidad, sprints, FC, velocidad, fatiga/retención y presencia atacante cuando hay datos;
  - genera titular automático;
  - si no hay FIT anteriores, la sección no aparece.
- Incluye **PUNTUACIÓN PARTIDO /100**.
- Aproximadamente 70/100 representa su partido medio histórico.
- Es una nota física/comparativa, no técnica ni de resultado.

### Comparador GPS
- Separar métricas absolutas e individualizadas.
- Los sprints relativos no deben decidir automáticamente un “ganador”.
- Para carga entre jugadores, priorizar métricas comunes.
- La velocidad máxima comparable debe usar el pico FIT del dispositivo cuando esté disponible.

## FRECUENCIA CARDÍACA
- Referencia Patx: `208 - 0.7 × edad`.
- No cambiar a `220 - edad` solo porque otra herramienta lo use.
- Recuperación FC no debe presentarse como diagnóstico médico.

## FOTOS VS OCR
Dos sistemas separados:

Fotos normales:
- input `matchPhoto`
- JPG/PNG/WebP
- permite añadir fotos a partidos ya cerrados.

OCR:
- input `resultCallupImage`
- solo convocatorias Patxanguilles.

Regla crítica:
**Una foto normal NUNCA debe entrar en el OCR F7.**

Archivo de aislamiento:
- `patx-v227-photo-routing.js`

Si reaparece el error de formato F7, buscar primero el mensaje literal en `patx-v213.js` y revisar listeners/visibilidad de `resultCallupImage`.

## NAVEGACIÓN / ANDROID
Proteger:
- botón Atrás;
- Home → Juegos → Juego;
- retorno desde informes GPS;
- sesión;
- pantallas especiales.

Evitar listeners globales agresivos de `popstate`.

## SUPABASE
Sistemas relevantes:
- `gps_pitches`
- `match_player_gps`

Migración:
- `supabase/migrations/20260914011500_gps_pitches_runtime_permissions.sql`

No crear tablas/RPC/policies sin comprobar equivalentes.

## ARCHIVOS CLAVE
Raíz:
- `index.html`
- `version.json`
- `patx-v212.js`
- `patx-v213.js`
- `patx-v214.js`
- `patx-v227-photo-routing.js`

Juegos:
- `juegos/index.html`
- `juegos/cabezones/`

GPS:
- `gps-report.html`
- `gps-upload.html`
- `gps-compare.html`
- carpeta `gps/`

## v229 — RESUMEN
- La velocidad máxima principal deja de sustituirse por una media/ventana de 3 s en FIT densos.
- COROS y Garmin usan el **pico máximo registrado en el FIT** cuando está disponible.
- Los análisis COROS ya guardados pueden mostrar el pico FIT correcto al cargarse sin volver a subir el archivo.
- Previsualizaciones e informes cargados desde Supabase reinterpretan la velocidad máxima con `rawFitMaxSpeedKmh` cuando está disponible.

## v228 — RESUMEN
- Heads → **Patxanguilles Cabuts**
- Cabuts habilitado desde Juegos
- mapa GPS bloqueado
- colores diferenciados
- top 10 recuperaciones FC
- intensidad 60 min con barras dobles
- comparación de FIT contra histórico propio
- puntuación física global /100

## NO TOCAR / REGRESIONES
- No mezclar fotos y OCR.
- No sustituir el pico FIT de velocidad máxima por una ventana de 3 s cuando el FIT aporta su máximo.
- Mantener 3 s/GPS raw como diagnóstico o fallback, no como máxima principal si existe `rawFitMaxSpeedKmh`.
- No comparar injustamente sprints personalizados.
- No romper calibración Santa Ana.
- No refactor general por tareas pequeñas.
- No tocar navegación Android global sin probar Atrás.
- No publicar a `main` antes de prueba local y aprobación.
- No renombrar módulos `v227-*` solo porque contengan lógica posterior.

## ESTADO DE CIERRE
- IMPLEMENTADO: ✅
- PROBADO: ✅ política FIT peak + sintaxis
- PUBLICADO EN MAIN: ✅ v229

## SIGUIENTE SESIÓN
1. Leer este archivo.
2. Consultar GitHub si la tarea depende del código publicado.
3. Trabajar solo sobre archivos afectados.
4. Actualizar `PROJECT_STATE.md` al cerrar una fase importante o publicar una nueva versión.
