# Migración de imágenes de Supabase Storage

Fecha: 2026-09-11
Proyecto: `Patxanguilles` (`cnnhstlguewrxjihhlqc`)
Bucket: `player-photos`

## Estado de ejecución

La auditoría, el backup y la migración de los activos actuales están completos. Las 24 cartas activas se publicaron en GitHub Pages y sus URLs se actualizaron en producción; las 24 fotos web se sustituyeron por derivados ligeros en rutas nuevas de Supabase. No se borró ni sobrescribió ningún objeto original.

## Antes

- Objetos: **87**.
- Tamaño: **194.043.787 bytes** (185,05 MiB).
- Peso medio: **2.230.388 bytes**.
- URLs activas del bucket: 24 fotos de jugador, 24 cartas y 3 fotos de partido únicas.
- Formatos: 41 JPEG y 46 PNG.

Clasificación completa: `tmp/storage-migration/object-classification.csv`.

| Clasificación | Objetos |
|---|---:|
| Foto web de jugador activa | 24 |
| Foto web de partido activa | 3 |
| Carta generada activa | 19 |
| Carta generada histórica | 16 |
| Carta administrativa activa | 5 |
| Temporales/huérfanos | 20 |

El flujo real de generación no usa `players.photo_url` como entrada de IA: recibe una selfie nueva por `FormData`, descarga `card-assets/master-card.png`, genera mediante OpenAI y guarda el resultado en `player-photos/generated/{player_id}/card-{generation_id}`. Por tanto, las fotos activas de perfil son FOTO WEB, no FOTO FUENTE del generador actual.

## Backup

- Ruta local: `backup/player-photos-before-migration/`.
- Manifest: `backup/player-photos-before-migration/manifest.json`.
- Objetos: **87/87**.
- Suma: **194.043.787/194.043.787 bytes**.
- SHA-256: **87/87**.
- Integridad: todas las imágenes son decodificables y tienen dimensiones registradas.

## Preparación local

| Tipo | Archivos | Bytes originales | Bytes preparados | Ahorro | Reducción |
|---|---:|---:|---:|---:|---:|
| Fotos web JPEG Q80, máx. 1600 px | 24 | 35.170.902 | 4.715.566 | 30.455.336 | 86,59% |
| Cartas JPEG Q84 | 24 | 63.750.434 | 12.926.957 | 50.823.477 | 79,72% |

Las 24 cartas activas son completamente opacas; ninguna necesitó PNG. Las cartas generadas usan `player-cards/generation-{generation_id}.jpg`. Las administrativas, sin generación, usan `player-cards/player-{player_id}.jpg`.

## Después — ejecutado

- Fotos web optimizadas y activadas: **24/24**; 4.715.566 bytes frente a 35.170.902 bytes (**86,59% menos** por descarga completa del conjunto activo).
- Cartas activas publicadas en GitHub Pages: **24/24**; todas verificadas por HTTP, tamaño y SHA-256.
- URLs activas de carta en GitHub Pages: **24**; URLs activas de carta restantes en Supabase: **0**.
- Tráfico normal de cartas retirado de Supabase: **60,80 MiB** por descarga completa del conjunto activo original.
- Generaciones activas marcadas como `published`: **19**; generaciones históricas conservadas como `generated`: **16**.
- Storage después de la migración: **111 objetos**, 198.759.353 bytes. El incremento de 24 objetos/4.715.566 bytes corresponde a los derivados de foto web.
- Objetos originales preservados: **87/87**, comprobados por nombre tras la migración; backup local íntegro disponible.
- Fallos de publicación o verificación: **0**.

Quedarán sin migrar 16 generaciones históricas, 20 objetos temporales/huérfanos y 3 fotos activas de partido. Las históricas se conservan por trazabilidad; los huérfanos requieren una autorización de limpieza separada; las fotos de partido están fuera de este alcance y ya son ligeras.

## Código y migraciones preparados

- `docs/edge-function-snapshots/generate-player-card-v13.ts`: snapshot exacto de la versión desplegada antes de modificarla.
- `supabase/functions/generate-player-card/index.ts`: fuente recuperada y adaptada para generar JPEG opaco con compresión 84, guardar temporalmente en Supabase e invocar el publicador al guardar.
- `supabase/functions/publish-player-card/index.ts`: publicación backend idempotente, bloqueo condicional, validación de firma/dimensiones, conversión con `magick-wasm`, GitHub Contents API, verificación byte a byte en Pages, actualización transaccional y estado recuperable.
- `supabase/migrations/20260911030833_card_publication_pipeline.sql`: campos de publicación, restricciones, índices y RPC transaccional con permisos exclusivos para `service_role`.
- `tools/backup-storage-bucket.mjs`: backup con tamaño, SHA-256 e integridad.
- `tools/prepare-storage-migration.mjs`: preparación determinista de fotos y cartas.
- `tools/optimize-storage-images.mjs`: utilidad de comparación Q88/Q84/Q80.

## Secretos manuales

Solo hace falta configurar un secreto nuevo en Supabase Edge Functions:

```text
GITHUB_TOKEN
```

Debe ser un token fine-grained limitado exclusivamente a `bobruso/Patxanguilles`, con permiso **Contents: Read and write**. No necesita `Workflows`, `Administration` ni acceso a otros repositorios. Propietario, repositorio, rama, dominio, prefijo y versión de API son configuración pública fija en la función, no secretos.

## Flujo futuro

1. `generate-player-card` genera JPEG Q84 y conserva el archivo temporal en Supabase.
2. Al aceptar/guardar, invoca `publish-player-card` con la credencial interna `service_role`; el navegador nunca recibe el token de GitHub.
3. El publicador reclama `generated|publication_error → publishing` mediante actualización condicional.
4. Valida y normaliza la imagen, usa la ruta inmutable `generation-{id}.jpg` y evita commits si el contenido ya coincide.
5. Comprueba que GitHub Pages devuelve exactamente el SHA-256 publicado.
6. La RPC actualiza de forma atómica `players.card_url` y la generación a `published`.
7. Si GitHub o la base fallan, conserva el original y la URL anterior. Si el jugador aún no tenía carta, el generador activa temporalmente la URL de Supabase como fallback.

## Consumidores

Álbum, perfil, draft, presentación de alineaciones y bienvenida leen únicamente `players.card_url`; no requieren cambios de arquitectura. La precarga `preloadCoachDraftCards` se conserva deliberadamente sin cambios porque alimenta la generación inmediata del vídeo de alineaciones. El álbum mantiene su paginación actual de nueve cartas.

## Validaciones finales

Completado: publicación y hash de 24 cartas, migración de esquema, actualización transaccional de 24 URLs, metadatos de 19 generaciones, creación/verificación de 24 derivados web, inventario de Storage y advisors.

La automatización futura también quedó activada tras la autorización específica del propietario:

1. `GITHUB_TOKEN` configurado manualmente en Supabase con alcance limitado al repositorio.
2. `publish-player-card` v2 desplegado y activo con `verify_jwt=true`.
3. `generate-player-card` v15 desplegado y activo con `verify_jwt=true`; genera JPEG opaco Q84 y publica al guardar.
4. Prueba idempotente realizada con la generación 22: respuesta HTTP 200, URL esperada de Pages, cero intentos de publicación añadidos y ningún consumo de OpenAI.
5. El código fuente leído de ambas funciones desplegadas coincide exactamente con los archivos versionados.

La prueba real de extremo a extremo se ejecutó después con Pau (jugador 32):

- OpenAI generó la generación 40 como JPEG; consumió el primer intento y dejó dos disponibles.
- El token escribió `player-cards/generation-40.jpg` en GitHub; GitHub Pages sirve 350.095 bytes con SHA-256 `d35e123876fa21d1e9b0154c3c98004afd8efe894ef7a7d88c67eaa6a6de009f`.
- Pages tardó más que la ventana inicial de 54 segundos. El fallback preservó correctamente la carta anterior, el reintento no consumió OpenAI y finalizó la generación como `published`.
- La carta administrativa original de Pau se restauró como carta visible después de validar el circuito; la generación 40 queda como evidencia histórica publicada.
- Storage queda en **112 objetos** y **199.133.985 bytes** al conservar también el JPEG temporal de la prueba, conforme a la regla de no borrar originales.
- La espera de Pages se amplió de 8 a 10 reintentos (máximo 82,5 segundos), por debajo del timeout de petición de 150 segundos documentado por Supabase.

Los advisors no atribuyen avisos nuevos a `complete_card_publication`. Mantienen avisos preexistentes del proyecto sobre funciones `SECURITY DEFINER`, políticas RLS, claves foráneas sin índice y protección de contraseñas filtradas; deben tratarse en una revisión de seguridad separada.

## Rollback

1. Restaurar `players.photo_url` y `players.card_url` usando `tmp/storage-migration/player-url-snapshot.csv`.
2. Mantener los objetos originales en Supabase; no se necesita re-subir nada.
3. Replegar `docs/edge-function-snapshots/generate-player-card-v13.ts` como `index.ts` si el publicador causa problemas.
4. Desactivar `publish-player-card` o dejar de invocarla.
5. Las cartas añadidas a GitHub pueden permanecer sin ser referenciadas; su eliminación sería un cambio posterior independiente.

No se eliminará ningún objeto de Supabase durante esta tarea.
