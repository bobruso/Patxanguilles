# Migración de imágenes de Memoria Vintage a GitHub Pages

Fecha: 2026-09-11

## Resultado

Memoria Vintage ya no utiliza `source_image_url`, WordPress ni Supabase Storage para cargar los cromos durante el juego. El catálogo maestro sigue siendo la tabla `vintage_cards`; sus registros se cruzan en runtime con `juegos/memory-vintage-assets.json`, un manifiesto local generado a partir de archivos JPEG realmente validados.

La URL de cada imagen se construye con la convención estable:

`./vintage-cards/reveal/{slug}-{id.substring(0,8)}.jpg`

## Cobertura

- Registros habilitados en `vintage_cards`: 704
- Reveal existentes inicialmente: 692
- Reveal inicialmente usados por Quién es: 573
- Reveal iniciales adicionales aprovechables solo por Memoria: 119
- Imágenes nuevas migradas desde `source_image_url`: 4
- Total final validado y disponible para Memoria: 696
- Reveal finales adicionales a Quién es: 123
- Archivos inválidos, duplicados, colisiones o reveals sin correspondencia: 0
- Registros sin copia recuperable: 8

Las cuatro imágenes incorporadas fueron José Eulogio Gárate, Juan Cruz Sol, Luís Edmundo Pereira y Sándor Kocsis. Se descargaron una sola vez desde `source_image_url`, se corrigió la orientación EXIF si procedía y se convirtieron a JPEG progresivo optimizado con calidad 88. Sus tamaños finales están entre 63.947 y 146.181 bytes.

## Ocho fuentes no recuperables

Estos archivos devuelven HTTP 404 tanto mediante la URL almacenada como mediante la URL que actualmente expone el post de WordPress. También se comprobaron las variantes Unicode NFC, NFD, sin diacríticos y los tamaños derivados publicados por WordPress.

- `73a07133-2a2a-4274-9fe0-de7671bccfa2` · Gonzalo Arguiñano · `gonzalo-arguinano-73a07133.jpg`
- `31b8546b-b751-422c-afda-8e1d58df8429` · Iván de la Peña · `ivan-de-la-pena-31b8546b.jpg`
- `ca654dc5-fba2-4410-806e-3e62d795649e` · Juan Manuel Peña · `juan-manuel-pena-ca654dc5.jpg`
- `d7583da1-cd25-42a3-9aef-65477dd4c7fe` · Miguel Ángel Lotina · `lotina-d7583da1.jpg`
- `52c5d37b-2cc8-4e72-b553-fc2b921726df` · Miguel Muñoz · `miguel-munoz-52c5d37b.jpg`
- `b236ff51-be73-45d8-a00f-f6c2440b2553` · Francisco Liaño · `paco-liano-b236ff51.jpg`
- `7026e6dd-9bf2-4b12-a3d0-31d6df80a92c` · Santiago Cañizares · `santiago-canizares-7026e6dd.jpg`
- `7b66f8f6-8ab6-439e-99bf-c300b5e89659` · Víctor Muñoz · `victor-munoz-7b66f8f6.jpg`

El manifiesto excluye estos ocho registros para que el juego no provoque 404 al comprobar candidatos. `source_image_url` y `local_image_url` se conservan sin cambios en Supabase.

## Dependencias runtime eliminadas

- Peticiones a `odioeternoalfutbolmoderno.es/wp-json/...` para calcular orientación.
- Uso de `vintage_cards.source_image_url` como `src` de los cromos.
- Cualquier URL de Supabase Storage para las imágenes de Memoria.
- Requisito de `raw_meta.wp_post_id` para admitir un registro en el catálogo.

La orientación se obtiene del manifiesto local y se vuelve a comprobar usando las dimensiones naturales del reveal antes de seleccionar una carta.

## Verificación local

- Auditoría de 704 registros contra todos los reveal: superada; 696/704 disponibles y 8 fallos de origen documentados.
- Smoke test estático de juegos: superado.
- Smoke test real en navegador, escritorio: dos partidas, 10 parejas, imágenes locales, cero errores de consola, cero 404 y cero peticiones prohibidas.
- Smoke test real en navegador, móvil: dos partidas, 6 parejas, imágenes locales, cero errores de consola, cero 404 y cero peticiones prohibidas.
- Carta no incluida en `quien-es-data.json`: encontrada en el catálogo runtime, cargada y validada por el mismo flujo de selección.

Los informes detallados generados durante la migración quedan en `tmp/memory-vintage-migration-report.md`, `tmp/memory-vintage-mapping.csv` y `tmp/memory-vintage-downloads.json`.
