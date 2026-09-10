# Importador de cromos vintage

Importa las entradas de la categoría **Álbum Vintage** de Odio Eterno al Fútbol Moderno a la tabla `public.vintage_cards` de Supabase.

## 1. Probar sin escribir

```bash
cd tools/vintage-importer
npm install
npm run dry
```

El comando anterior solo procesa la primera página y muestra una muestra JSON. No escribe nada en Supabase.

También puedes limitar todavía más la prueba:

```bash
node import-vintage.mjs --dry-run --from=1 --to=1 --limit=3
```

## 2. Importar en Supabase

Define estas variables solo en tu entorno local/servidor. **No subas nunca una secret key al repositorio ni al navegador.**

```bash
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

También admite temporalmente una `SUPABASE_SERVICE_ROLE_KEY` antigua si el proyecto todavía la utiliza.

Después:

```bash
npm run import
```

Por defecto recorre las páginas 1–71. Se puede hacer por tramos:

```bash
node import-vintage.mjs --from=1 --to=10
node import-vintage.mjs --from=11 --to=20
```

El importador hace `upsert` por `slug`, así que repetir una importación actualiza los registros existentes en lugar de duplicarlos.

## 3. Copia de seguridad automática de todas las imágenes

El catálogo de Supabase conserva `source_image_url`, pero actualmente las imágenes siguen alojadas en la web de origen. Para conservar una copia independiente puedes descargar automáticamente todos los cromos.

Primero prueba con solo 5 imágenes:

```bash
npm run download:test
```

Si funciona, descarga el catálogo completo:

```bash
npm run download
```

Se creará:

```text
vintage-download/
  originals/     # imágenes originales, sin recomprimir
  manifest.json  # URL de origen, archivo local, peso y SHA-256
  failed.json    # descargas que hayan fallado
```

El descargador está preparado para **reanudar**: si se corta Internet o cierras la consola, vuelve a ejecutar `npm run download` y saltará los archivos que ya estén descargados. Hace varios reintentos, limita la concurrencia para no golpear el servidor y guarda cada archivo primero como `.part` para no considerar válidas descargas incompletas.

Opciones útiles:

```bash
node download-vintage-images.mjs --limit=20
node download-vintage-images.mjs --concurrency=2
node download-vintage-images.mjs --output=D:\\Backup\\Patxanguilles-cromos
node download-vintage-images.mjs --overwrite
```

Para una copia de seguridad real conviene guardar **primero los originales**. La compresión para la web se puede hacer después sobre una segunda copia, sin destruir este archivo maestro.

## Campos principales

- `title`: título de la entrada.
- `player_name`: nombre mostrado en la ficha.
- `nationality`.
- `position`.
- `active_years`.
- `honors`.
- `individual_distinctions`.
- `source_url`.
- `source_image_url`: URL original del cromo.
- `parse_status`: `ready` o `needs_review`.

`local_image_url`, `quiz_image_url` y `name_mask` quedan preparados para la siguiente fase: copiar/servir imágenes y ocultar el nombre para el juego **¿Quién es?**.

## Buenas prácticas

El importador y el descargador incorporan pausas/reintentos para no hacer peticiones agresivas. Antes de republicar masivamente las imágenes desde un almacenamiento propio, conviene contar con los permisos correspondientes; para copia de seguridad, conserva también el `manifest.json` con las URLs originales.
