# Investigación de distancia Patxanguilles

Investigación aislada. No importa ni modifica el engine, la UI, Supabase, persistencia, velocidad, sprints o detección de dispositivos. No realiza commit, push ni llamadas a servicios con los FIT.

## Ejecutar

Desde la raíz del repositorio, con Node >=20:

```powershell
npm ci --prefix tests/distance-research --cache tests/distance-research/.npm-cache --ignore-scripts
node tests/distance-research/compare-distance-methods.mjs
node --test tests/distance-research/research.test.mjs
```

Los FIT se leen desde `tests/COROS_PACE_4.FIT` y `tests/GARMIN_FORERUNNER_165.fit`. Las rutas se resuelven respecto al script, no al directorio de ejecución. Dependencias fijadas en `package-lock.json`: fit-file-parser 5.0.2 y SDK oficial Garmin 21.214.0. La segunda lectura verifica CRC y compara todos los registros en los campos usados.

Gráfico y cortes sintéticos opcionales, con Python y Matplotlib:

```powershell
python -m pip install matplotlib==3.10.8 --target tests/distance-research/.python-libs
python tests/distance-research/plot-results.py
```

El gráfico no es necesario para calcular las métricas. Puede cambiar ligeramente de aspecto según las fuentes y dependencias de Python.

## Entregables

- `REPORT.md`: diagnóstico, interpretación, bibliografía, decisión y propuesta futura.
- `RESULTS.md`: tablas numéricas generadas automáticamente.
- `SYNTHETIC-SLICES.md`: cortes por escenario, sin ruido y con ruido moderado; generado por el script de gráficos.
- `results/paired.csv`: todas las configuraciones, actividad completa, intervalo común y cobertura común.
- `results/synthetic-cells.csv`: errores por escenario, muestreo, ruido y conjunto de semillas; cada fila promedia 3 semillas y conserva el peor error absoluto entre ellas.
- `results/synthetic-summary.csv`: métricas separadas de movimiento, estacionario, sesgo, muestreo y distorsión adicional.
- `results/geometry.csv`: desplazamiento temporal, giros y retención local de los FIT.
- `results/auxiliary-fit.csv`: acumulado FIT e integración de velocidad, con su cobertura.
- `results/coros-downsampling.csv`: muestreo reducido y sensibilidad a fase para todos los métodos.
- `results/garmin-interpolation.csv`: mallas de 0.25, 0.5, 1 y 2 s, lineal y PCHIP, con/sin nudos originales.
- `results/intervals.csv`: cinco intervalos seleccionados automáticamente y todos los métodos.
- `results/sensitivity.csv`: cambios de distancia y pendientes frente al parámetro.
- `results/boundary-context.csv`: recortar antes o después de filtrar.
- `results/metadata.json`: ventana relativa exacta, cobertura, inventario de campos y mensajes, hashes y verificación de parsers.
- `results/summary.json`: resumen estructurado de las tablas.
- `results/research-overview.png`: figura estática de cuatro paneles, sin coordenadas.

## Convenciones

`raw` significa suma de cuerdas GPS dentro de tramos observados, sin unir huecos explícitos. El valor histórico que une puntos válidos se registra por separado como `legacyBridgedRawM`. Todos los métodos mantienen extremos de cada tramo; por tanto, ni siquiera un supuesto estacionario se colapsa a distancia cero automáticamente.

Los tiempos exportados son segundos relativos al primer registro del par. No se exportan posiciones, números de serie, valores de perfil personal, ni fechas absolutas. El inventario registra nombres de campos y recuentos, no sus valores. Los CSV de sintéticos contienen longitudes y errores, no tracks reales.

`common` iguala el tiempo, pero no la disponibilidad de GPS. `common-observed` utiliza la intersección de cobertura GPS. Primero se filtran tramos completos y luego se recortan; `boundary-context.csv` cuantifica la convención inversa. No se interpola entre tramos separados.

Cada método está definido en `methods.mjs`. Para añadir otro, registrar `{id, family, param, run}` en `configurations()`. La función recibe un tramo con posiciones en metros y tiempo en segundos y devuelve una polilínea temporal ordenada, sin mutar la entrada. Los campos `speed` son auxiliares de investigación y no alteran las métricas de velocidad de producción.

## Interpretar los scores

El score exploratorio general es `MAPE movimiento + estacionario m/min + peor error limpio %`, equivalente a penalizar una unidad por 1 punto porcentual o 1 m/min. Son pesos convencionales, no una medida física ni una probabilidad.

El segundo score excluye ruido blanco y el micro-shuttle adversarial, y usa `MAPE correlacionado + estacionario correlacionado m/min + peor error adicional limpio denso`. Este último descuenta el error que ya tenía el muestreo raw. El indicador `eligible` aplica límites exploratorios de 10%, 2 m/min y 5 puntos adicionales, respectivamente. Ningún candidato los cumple. Estos límites no sustituyen la lectura por escenarios ni son requisitos de producto aceptados.

No se utiliza la diferencia Garmin–COROS en ningún score sintético. Las semillas reservadas evalúan otras realizaciones del mismo modelo, no otros deportes, entornos ni dispositivos. El estudio es exploratorio: no es un ensayo preregistrado ni una validación externa.

## Límites del harness

El límite experimental de continuidad es 10 s, además del corte obligatorio ante cualquier registro sin coordenadas. Mantiene todas las cuerdas Garmin de hasta 7 s. No identifica silenciosamente un dropout sin registro explícito: en ese caso haría falta información adicional o una política de calidad. Para datasets nuevos se deben validar tiempo, coordenadas, proyección y pausas antes de reutilizarlo. En estos FIT los eventos sólo delimitan inicio/fin; no hay pausas intermedias.

La proyección local plana se ha contrastado con Haversine sobre ambos FIT (tolerancia total 2 cm). No está diseñada para recorridos continentales. Los tests requieren haber generado `results/summary.json`; los resultados entregados ya lo incluyen.
