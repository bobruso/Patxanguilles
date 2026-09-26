# Brief — Import de convocatoria con equipos (Rojos/Negros)

## Objetivo
Al pegar una convocatoria con encabezados de equipo («Negros 🖤» / «Rojos ❤️») y
pulsar «Detectar convocatoria» en *Apuntar resultado*, cada jugador debe quedar
marcado solo en su equipo, y no en los dos como hasta ahora.

## Contrato
- Reconocer encabezados negro/rojo en singular o plural, sin distinguir
  mayúsculas, con emojis, dos puntos, guiones o puntos, y en cualquier orden.
- Mantener el emparejamiento exacto actual (insensible a acentos y formato).
- Soportar el formato real del usuario (viñetas «. Nombre») y también nombres
  numerados.
- Los nombres desconocidos o parecidos no se marcan solos; solo se avisan.
- Duplicados y conflictos (mismo jugador en los dos bloques) resueltos con aviso:
  nunca marcado en ambos equipos; se conserva la primera aparición.
- Sin encabezados se mantiene el comportamiento anterior (misma detección en los
  dos equipos hasta corregir a mano) y se respeta la exclusión desde «Reservas».
- Vale para Fútbol 7 y Fútbol Sala.
- Volver a detectar o limpiar no deja selecciones antiguas.

## Alcance
- `index.html`: `parseResultCallup` más dos ayudantes locales.
- Pruebas dirigidas nuevas en `tests/`.
- Sin backend, sin guardado, sin tocar el flujo de entrenador ni el OCR de
  imagen, sin subir versión.

## Criterios de aceptación
1. La convocatoria de ejemplo del usuario marca 7 negros y 7 rojos correctos.
2. Encabezados invertidos y variantes de formato dan el mismo resultado.
3. Convocatoria sin encabezados sigue comportándose como antes.
4. Desconocidos, parecidos, reservas y conflictos avisan sin auto-seleccionar.
5. Reimportar y limpiar dejan el formulario sin restos.
6. Modo FS solo marca los nombres que existen en la plantilla FS.
