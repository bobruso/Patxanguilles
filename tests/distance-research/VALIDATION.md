# Validación

- 14 archivos numéricos/Markdown reproducidos byte a byte con las mismas entradas y versiones.
- CRC válido y acuerdo registro a registro entre fit-file-parser y SDK Garmin en ambos FIT.
- 12 tests experimentales pasan; también las dos suites existentes del engine y FIT reales (32 aserciones existentes).
- Hashes de cuatro archivos de producción idénticos antes/después del harness.
- Figura revisada visualmente: ejes, unidades, leyendas y cuatro paneles legibles.
- Los cambios anteriores de producción se han conservado; no se ha hecho commit ni push.

Esta validación comprueba implementación y reproducibilidad, no exactitud física de los FIT.
