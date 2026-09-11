# Publicación de cartas de jugadores en GitHub Pages

Estado: migración puntual completada para 24 cartas activas y automatización futura desplegada. `publish-player-card` v2 y `generate-player-card` v15 están activos con verificación JWT; `GITHUB_TOKEN` está configurado en Supabase.

## Flujo actual verificado

1. `index.html` carga `players` desde Supabase y transforma `players.card_url` en `db.players[name].card`.
2. El jugador abre «Crear carta» desde el perfil. El navegador envía un `FormData` a la Edge Function `generate-player-card` con `player_id`, selfie, nombre, apodo, altura, peso y posición.
3. La respuesta contiene `generation_id`, `card_url`, `attempts_used` y `remaining`. El primer intento se guarda automáticamente llamando de nuevo a la misma función con `action=save`; los intentos posteriores sólo se guardan cuando el usuario pulsa «Guardar carta».
4. La función `get_card_generation_usage(p_player_id)` informa de intentos y estado de procesamiento.
5. El código fuente desplegado de `generate-player-card` v13 ya se recuperó en `supabase/functions/generate-player-card/index.ts`. Usa `card_generations.image_url`, el bucket `player-photos` y OpenAI `gpt-image-2`.
6. Antes de la migración, `players.card_url` apuntaba a objetos del bucket público `player-photos`, con dos familias de rutas:
   - `generated/{player_id}/card-{generation_id}.png`
   - `cards/{player_id}/{timestamp}.png` para reemplazos manuales del administrador.
7. Tras la migración, las 24 cartas activas apuntan a `https://patxanguillesantifeixistes.es/player-cards/...`; los originales permanecen en Supabase para rollback.

### Consumidores de `players.card_url`

- Álbum integrado de temporada: `renderCardAlbum`, 9 cartas por página.
- Álbum independiente: `album.html`, 9 cartas por página.
- Perfil y previsualización/edición de la carta.
- Draft de entrenador: precarga las cartas de todos los jugadores seleccionados al entrar en estado `drafting` y muestra la carta del fichaje.
- Presentación final de alineación del modo entrenador: hasta 7 cartas.
- Bienvenida especial del jugador: usa carta y, si no existe, foto.

No se encontraron consumidores independientes con otra columna de carta: el punto de compatibilidad es `players.card_url`. Cambiar ese campo a una URL de GitHub Pages permite que las vistas actuales sigan funcionando sin alterar su diseño ni gameplay.

## Arquitectura propuesta

Mantener `generate-player-card` para generación y almacenamiento temporal. Añadir una operación backend de publicación, idealmente una Edge Function privada `publish-player-card`, llamada por el backend después de aceptar una generación, no directamente por un navegador anónimo.

Ruta canónica propuesta:

```text
player-cards/{card_id}.jpg
```

Las cartas generadas usan la clave primaria estable `generation_id`; las administrativas, que no tienen generación, usan `player_id` con prefijo explícito. No se usan apodos, nombres ni timestamps públicos. Cada generación tiene una ruta inmutable; repetir la publicación usa exactamente la misma ruta y no crea duplicados.

URL pública:

```text
https://patxanguillesantifeixistes.es/player-cards/{card_id}.jpg
```

### Estados de publicación

Añadir a la fila de generación existente, una vez confirmado su nombre real:

- `publication_status`: `generated | publishing | published | publication_error`.
- `publication_path`: ruta relativa estable en GitHub.
- `publication_url`: URL pública confirmada.
- `publication_sha256`: hash de los bytes validados.
- `github_blob_sha`: SHA devuelto por GitHub Contents API.
- `publication_attempts`: contador de intentos.
- `publication_error`: último error sanitizado.
- `publication_started_at` y `published_at`.

Restricciones recomendadas: `publication_status` con `CHECK`, `publication_path` único cuando no sea nulo y una transición atómica a `publishing` para impedir dos workers simultáneos. No aplicar esta migración hasta confirmar la tabla real y sus políticas RLS.

### Proceso seguro e idempotente

1. Recibir `card_id` en un canal backend autenticado.
2. Verificar autorización antes de usar privilegios de servicio:
   - opción preferida con la arquitectura actual: `generate-player-card`, tras validar `action=save`, invoca internamente al publicador con una secret key específica; o
   - usuario autenticado con JWT real y comprobación de propiedad/rol de administrador.
   - no aceptar sólo la publishable key como autorización para publicar.
3. Cargar la generación por `card_id`, obtener su `player_id` y comprobar que es la generación guardada/aceptada para ese jugador.
4. Bloquear la fila o hacer una actualización condicional `generated|publication_error -> publishing`. Si ya está `published` y GitHub conserva el mismo hash, devolver éxito sin escribir.
5. Descargar el objeto temporal desde Supabase con el cliente de backend.
6. Validar tamaño máximo, firma mágica real, MIME, dimensiones decodificables y hash SHA-256. Rechazar HTML, SVG y formatos no permitidos aunque la extensión diga imagen.
7. Normalizar a JPEG sólo si el runtime dispone de una implementación probada dentro de sus límites. En la primera versión es más seguro exigir/salvar JPEG o conservar una extensión validada que introducir una conversión pesada. La ruta y Content-Type deben coincidir.
8. Consultar `GET /repos/bobruso/Patxanguilles/contents/player-cards/{card_id}.jpg?ref=main`:
   - si existe con el mismo contenido, continuar sin crear commit;
   - si existe con contenido diferente, tratarlo como conflicto y no sobrescribir silenciosamente;
   - si no existe, crear con `PUT /repos/.../contents/...`, bytes en Base64 y un mensaje de commit determinista.
9. Verificar la respuesta de GitHub y después hacer `HEAD` a la URL pública de Pages hasta obtener `200` (con reintentos acotados y backoff). La existencia en Contents API no garantiza que Pages ya se haya desplegado.
10. En una sola actualización de base de datos, escribir `players.card_url=publication_url` y marcar la generación `published`, guardando hashes y timestamps. Si falla antes de este punto, la URL anterior de `players` permanece intacta.
11. Ante error, pasar a `publication_error` y conservar el original de Supabase. Un reintento retoma la misma ruta.

La GitHub Contents API exige contenido Base64 y permiso de repositorio `Contents: write`; para actualizar un archivo existente también exige su blob `sha`. Las escrituras sobre la misma ruta deben serializarse para evitar conflictos.

## Secrets que debe configurar el propietario

En Supabase Dashboard → Edge Functions → Secrets, o mediante `supabase secrets set`:

```text
GITHUB_TOKEN=<fine-grained token o token de instalación de GitHub App>
```

Permisos mínimos del token: acceso únicamente al repositorio `bobruso/Patxanguilles` y `Contents: Read and write`. No conceder `Workflows: write`, administración ni acceso a otros repositorios. Nunca añadir el token a `index.html`, variables públicas, commits o respuestas/logs de la función. A largo plazo, una GitHub App de instalación limitada al repositorio facilita rotación y tokens de corta duración.

Las credenciales propias de Supabase disponibles por defecto en Edge Functions deben seguir siendo secretos de backend. No crear una variable personalizada que empiece por `SUPABASE_`.

## Álbum y egress

Los dos álbumes cumplen el objetivo principal:

- consultan metadatos de todas las cartas, pero crean elementos `<img>` sólo para el `slice` de la página visible (máximo 9);
- al cambiar de página vacían/reemplazan el contenido anterior, por lo que no mantienen todas las páginas montadas;
- no usan `new Image()` ni `Promise.all()` para descargar todo el catálogo;
- `album-v212.js` espera únicamente el fondo y las imágenes ya presentes en la página actual;
- no se precarga la página siguiente.

El álbum integrado ya usa `loading="lazy"`. El independiente queda también marcado como lazy sin cambiar su aspecto. Consultar `card_url` para todas las filas transfiere sólo texto pequeño; no descarga los bytes de las imágenes.

### Precarga intencionada del draft

`preloadCoachDraftCards` crea una cola con las cartas de los jugadores seleccionados y las descarga con dos workers al entrar en el draft. Se conserva sin cambios: esta precarga es necesaria para que la generación posterior del vídeo de alineaciones sea inmediata.

## Orden de implantación recomendado

1. Descargar y versionar en el repositorio `generate-player-card` y sus migraciones actuales.
2. Confirmar tabla de generaciones, propietario/autorización real, bucket y campo temporal.
3. Crear la migración de estados y RLS; ejecutar advisors.
4. Implementar y probar el publicador con una carta de prueba y token de alcance mínimo.
5. Integrarlo en `action=save`, manteniendo fallback a Supabase y sin borrar originales.
6. Verificar álbum, perfil, draft, alineación y bienvenida con una URL de Pages.
7. Sólo después planificar una migración masiva y, en una fase separada con aprobación explícita, una política de limpieza de temporales.

## Riesgos abiertos

- El token fine-grained caduca según el plazo elegido en GitHub. Debe rotarse antes de su vencimiento para que la publicación automática no se interrumpa.
- Un commit por carta es adecuado para el volumen actual, pero no para lotes grandes; una migración masiva debería agrupar cambios con Git Data API o un workflow controlado.
- GitHub Pages tiene latencia de despliegue y caché: no actualizar `players.card_url` hasta confirmar la URL pública.
- La rama protegida puede rechazar escrituras directas; en ese caso se necesita una rama/bot y workflow de publicación, no más permisos en el token.
- `players.card_url` es actualmente legible públicamente. Las cartas publicadas en Pages también serán públicas.
- La autenticación actual de `generate-player-card` desde el frontend usa la publishable key como bearer, no un JWT de usuario. La futura publicación no debe heredar esa señal como autorización suficiente.
