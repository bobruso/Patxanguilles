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

El script incorpora pausa entre peticiones y reintentos ante respuestas 429/5xx. Antes de republicar masivamente las imágenes, conviene contar con permiso del sitio de origen y decidir si se usarán sus URLs originales o copias autorizadas en Storage.
