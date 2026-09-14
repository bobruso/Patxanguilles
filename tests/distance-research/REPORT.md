# Patxanguilles Normalized Distance: investigación experimental

## Dictamen

**No modificar producción con un nuevo normalizador de distancia a partir de esta evidencia.** Se han ejecutado 81 configuraciones sobre los dos FIT simultáneos y una batería sintética con trayectoria conocida. Ningún método ha demostrado simultáneamente eliminación suficiente de drift, conservación de desplazamientos cortos y estabilidad ante muestreo irregular.

Existe una opción interesante para continuar investigando: simplificación con distancia euclídea síncrona, que limita la desviación en cada instante. Conserva mejor las idas y vueltas que la simplificación espacial ordinaria, pero no resuelve por sí sola el ruido estacionario ni la discrepancia entre relojes. No se recomienda presentarla todavía como una distancia normalizada validada.

**Confianza alta** en que la coincidencia numérica de dos relojes no valida una distancia. **Confianza media** en mantener provisionalmente la política actual de fuente por calidad de grabación. **Confianza baja** en cualquier estimación del error físico de este partido: no existe referencia externa.

Los resultados y la reproducción se describen en `README.md`, `RESULTS.md` y los CSV de `results/`. Los archivos FIT locales son las fuentes primarias de todas las cifras del partido; los hashes del inventario identifican las entradas exactas. Los informes no contienen coordenadas ni valores de perfil personal.

## 1. Diagnóstico

### Los números de partida se reproducen, pero representan conceptos diferentes

| Magnitud | COROS | Garmin |
|---|---:|---:|
| Registros | 868 | 451 |
| Registros con GPS | 816 | 451 |
| Duración de sesión FIT, s | 866.920 | 876.524 |
| Tiempo entre primer y último registro, s | 867 | 876 |
| Distancia de sesión FIT, m | 1278.70 | 1359.71 |
| Último menos primer acumulado FIT, m | 1278.70 | 1358.99 |
| GPS uniendo todos los puntos válidos, m | 1278.58 | 1384.33 |
| GPS sin puentes sobre coordenadas ausentes, m | 1273.57 | 1384.33 |

Garmin empieza con 0.72 m ya acumulados. Por eso restar el primer registro produce 1358.99 m, mientras la sesión informa 1359.71 m. Ambas cifras son válidas bajo definiciones distintas; no hay que intercambiarlas al recortar períodos.

El engine actual filtra los puntos sin coordenadas antes de sumar segmentos. Así conecta los extremos de cinco huecos interiores de COROS, añadiendo unos **5.01 m de cuerdas**. No conocemos el recorrido durante esos huecos. El estudio los separa y tampoco asigna distancia a los huecos inicial y final. Esta observación se documenta sin cambiar el engine.

Los 52 registros sin coordenadas forman siete rachas. La suma de 51 s del diagnóstico anterior cuenta incrementos asociados a registros ausentes. Para distancia, los tramos no observados abarcan también sus límites entre puntos válidos: la actividad completa tiene 810 s de cuerdas observables de 867 s. No es correcto equiparar automáticamente esos 51 s con toda la pérdida de cobertura.

### Qué puede explicar la discrepancia

Hay tres componentes distinguibles: ventanas de grabación diferentes; cobertura GPS diferente; y trayectorias/medidas del dispositivo diferentes durante el tiempo comparable. El par no permite repartir el tercer componente entre error de posición, filtrado propietario, movimiento de muñeca y muestreo.

El ruido posicional puede inflar longitudes; las cuerdas entre muestras separadas pueden recortar curvas. La correlación temporal del error importa, por lo que el número de puntos o una desviación posicional aislada no predicen el sesgo. Esta distinción está desarrollada por Ranacher y colaboradores [1]. Los ensayos deportivos también encuentran degradación ante recorridos complejos y cambios rápidos de dirección [2, 3]. Esos trabajos apoyan el diagnóstico general, pero no calibran estos dos relojes de muñeca.

No es defendible concluir que Garmin sobreestima exactamente un 5–6%, ni que COROS es la referencia correcta. En el intervalo de mayor velocidad seleccionado, COROS tiene más distancia geométrica que Garmin; en otros intervalos sucede lo contrario.

## 2. Tiempo, cobertura y definición experimental

Se fija `t = 0` en el primer registro COROS. COROS abarca `[0, 867]`; Garmin `[3, 879]`. La **ventana común de registros es `[3, 867]`, 864 s**. Es exacta a la resolución de sus timestamps; no implica sincronización física subsegundo. Los totales fraccionarios de sesión no proporcionan por sí mismos posiciones en límites subsegundo.

Se publican tres comparaciones:

1. **Full:** actividad completa de cada reloj.
2. **Common:** mismos límites temporales, conservando los huecos propios de cada reloj.
3. **Common-observed:** intersección temporal de los tramos con GPS de ambos: **808 s**. No representa la distancia de todo el partido.

| Raw sin puentes | COROS m | Garmin m | Garmin − COROS m | Diferencia / COROS |
|---|---:|---:|---:|---:|
| Full | 1273.57 | 1384.33 | 110.77 | 8.70% |
| Common | 1272.58 | 1370.22 | 97.64 | 7.67% |
| Common-observed | 1272.58 | 1342.38 | 69.80 | 5.49% |

Garmin acumula 27.84 m GPS en los períodos de la ventana común que no tienen cobertura COROS. No podemos llamarlos movimiento verdadero ni jitter. Simplemente no tienen comparación pareada equivalente.

Se emplean metros en un plano local, contrastados con Haversine. Se corta ante cualquier coordenada ausente, tiempo no creciente o intervalo mayor de 10 s. Los intervalos Garmin de hasta 7 s permanecen como cuerdas observadas; no se afirma conocer sus curvas internas. Los límites de ventana se obtienen por interpolación lineal dentro de una cuerda existente, nunca entre tramos separados.

Los métodos procesan cada tramo completo y después se recortan las ventanas. Esto conserva contexto y evita convertir cada ventana en una actividad nueva. También se evalúa la alternativa de recortar primero. **RDP 2 m en Garmin cambia 27.81 m sobre la cobertura común según el orden de esas operaciones.** La simplificación puede redistribuir longitud entre intervalos sin conservar su cronología local. Esa sensibilidad es una limitación sustancial, no una mejora de exactitud.

## 3. Métodos y supuestos

| Familia | Configuraciones ejecutadas | Qué aporta / principal limitación |
|---|---|---|
| A. Promedio temporal | Anchura total 1, 2, 3, 4, 5, 6 s | Reduce oscilación y también movimientos físicos rápidos. |
| B. Resampling | Lineal, lineal conservando nudos y PCHIP; variantes temporales 2–5 s a 1 Hz | Permite una malla común; no recupera información perdida. |
| C. RDP | 0.25–5 m, incluyendo 1.2, 1.5, 1.6 y 1.8 m | Acota desviación espacial, pero puede borrar recorridos repetidos sobre la misma línea. |
| C. Visvalingam–Whyatt | Raíz del área: 0.5, 1, 1.5, 2, 3, 5 m | El área triangular no mide importancia física de una ida y vuelta. |
| D. Multiescala | Pendiente relativa máxima 0.005, 0.01, 0.02 por metro | Busca dos pasos consecutivos de estabilización por tramo, sin comparar relojes. |
| E. Adaptativo geométrico | Ventanas 10, 12, 15 s | Muy conservador; puede no detectar drift o confundir micromovimiento. |
| F. Kalman | σ medida 0.5, 1, 2, 3 m; aceleración 1, 2, 4 m/s² | Modelo de velocidad constante entre actualizaciones, sensible a frenadas y giros. |
| G. Ruido adaptativo | Mediana radial en ventanas de bajo movimiento, con abstención | No consigue suficientes ventanas fiables en estos FIT. |
| H. Campos FIT | Inventario binario y lectura independiente SDK | Aporta contexto; no aparece una referencia independiente de posición. |
| I. GPS + velocidad | Adaptativo con veto si falta velocidad o supera 0.2 m/s | Evita algunos falsos estacionarios; hereda dependencia del fabricante. |
| J. Anchor espacial | 0.25–5 m, misma malla de sensibilidad que RDP | Acumula progreso hasta cruzar umbral, conservando el extremo residual. |
| Adicional: SED | 0.25–5 m | Acota error a igual tiempo y conserva mejor retrocesos; no identifica ruido. |

El promedio temporal integra exactamente la polilínea interpolada en una ventana centrada de anchura total W, truncada en los extremos del tramo, y mantiene esos extremos. No es una media de N puntos: esa definición trataría de forma distinta la densidad de muestras. La versión base evalúa la trayectoria filtrada en los timestamps originales; la variante lineal-temporal usa una malla común de 1 s. Ninguna reproduce por definición el smoothing previo de ~3/~5 s cuya implementación no está disponible.

PCHIP es interpolación cúbica por coordenada, con pendientes que preservan monotonía [4]. Esto no garantiza longitud física correcta ni invariancia frente a rotar los ejes. RDP y Visvalingam–Whyatt son técnicas de simplificación geométrica [5, 6], no estimadores de ruido. SED incorpora el tiempo en la noción de error [7]; aquí se utiliza una implementación top-down con interpolación lineal del segmento candidato.

El adaptativo exige duración suficiente, desplazamiento neto ≤0.75 m, radio respecto al centro ≤1.5 m, net/path ≤0.12 y baja consistencia direccional. Conserva los extremos del bloque en vez de imponer distancia cero. La versión híbrida exige además velocidad disponible ≤0.2 m/s en todo el bloque. Son hipótesis experimentales, no umbrales calibrados de inmovilidad.

El estimador de ruido requiere tres ventanas no solapadas de al menos 12 s, dentro de ventanas nominales de 15 s, con velocidad ≤0.15 m/s y muy poco progreso. Convierte mediana radial a σ bajo una hipótesis gaussiana isotrópica y se abstiene si no hay evidencia suficiente. Correlación, ventanas seleccionadas por posición y velocidad propietaria sesgan esa estimación. **No debe confundirse su salida con precisión GNSS certificada.**

Kalman reduce error cuadrático del estado bajo hipótesis de proceso y medición [8], no necesariamente error de longitud acumulada. Se ensaya un filtro causal x/y con posición y velocidad, covarianza inicial de velocidad alta, ruido de aceleración discreto y reinicio en cada hueco. La conservación del extremo final es explícita. No es un filtro RTS, IMM ni Kalman robusto: esos métodos no han sido ensayados numéricamente aquí.

Alpha-beta comparte buena parte de los supuestos de movimiento y las dificultades de ganancia/latencia; no añade una observación independiente. Savitzky–Golay ajusta polinomios localmente y exige cuidado con el muestreo irregular [9]: puede conservar tendencias suaves, pero sus ventanas cruzan discontinuidades de velocidad/dirección. Penalizar variación total de posición tiende a crear mesetas; penalizar velocidad favorece tramos lineales. No se ensayan estas variantes adicionalmente: necesitarían justificar una regularización que separe ruido de maniobras. No se afirma que sean universalmente inferiores a los filtros implementados.

## 4. Sintéticos: referencia conocida y pruebas de estrés

Se generan nueve escenarios: recta de 100 m, caminata de 0.4 m/s durante 100 s, estacionario de 100 s, zig-zag, veinte tramos alternos de 5 m, círculo de radio 10 m, sprint con frenada y giro, caminata con bloques ausentes y micro-shuttle de 0.5 m. El último es un caso adversarial adicional, no una representación estadística de todo un partido.

Cada escenario usa muestreo de 1 s, irregular `[1,1,3,2,5,1,2,4]` y una variante irregular desfasada medio segundo. El ruido tiene σ por eje de 0.5, 1, 2 o 3 m, independiente o correlacionado con tiempos de 3 y 15 s. Se añade también la versión sin ruido. La correlación se genera en una malla latente de 0.25 s; la misma realización se observa a distintas frecuencias.

Se utilizan semillas 1–3 y semillas reservadas 101–103: **2106 evaluaciones de escenario/muestreo/ruido/semilla; 170586 aplicaciones de método; 56862 filas agregadas de tres semillas**. La reserva comprueba realizaciones distintas del mismo modelo; no constituye validación externa ni preregistro. Los parámetros se barren en regiones, no se ajustan a la distancia del par real.

La referencia sintética es la longitud analítica durante los tramos observables. En la caminata con huecos, la verdad completa es 40 m, pero la cobertura densa evaluada contiene 33.2 m. No se premia reconstruir los 6.8 m ausentes. En Smart Recording la verdad incluye los giros físicos entre muestras de un tramo continuo, para medir precisamente su pérdida por muestreo.

### Un contraejemplo decisivo sin ruido

| Método | Recta, verdad 100 m | Caminata, verdad 40 m | Zig-zag, verdad 84.85 m | Ida/vuelta, verdad 100 m |
|---|---:|---:|---:|---:|
| Raw 1 Hz | 100.00 | 40.00 | 84.85 | 80.00 |
| Temporal 3 s | 100.00 | 40.00 | 63.03 | 36.33 |
| Temporal 5 s | 100.00 | 40.00 | 61.65 | 6.34 |
| RDP 1 m | 100.00 | 40.00 | 84.85 | 8.00 |
| VW 1 m | 100.00 | 40.00 | 84.85 | 0.00 |
| SED 1 m | 100.00 | 40.00 | 84.85 | 80.00 |

Las vueltas ocurren cada 2.5 s. El muestreo a 1 Hz ya pierde 20 m porque algunos extremos están entre muestras. RDP pierde todavía más: muchos puntos de retorno permanecen dentro del segmento espacial seleccionado aunque sean recorridos diferentes en el tiempo. La distancia Hausdorff puede ser pequeña mientras desaparece casi todo el recorrido. SED conserva aquí los 80 m observados, sin pretender recuperar los 20 m ausentes.

### Ruido moderado y correlacionado

Este corte usa σ 0.5/1 m, correlación 3/15 s, los tres muestreos y excluye el micro-shuttle. MAPE promedia el error absoluto porcentual por escenario/muestreo/ruido; el estacionario se evalúa aparte.

| Método | MAPE movimiento | Distancia estacionaria m/min |
|---|---:|---:|
| Raw | 22.17% | 21.84 |
| Temporal 3 s | 19.03% | 11.83 |
| Temporal 5 s | 20.44% | 8.83 |
| RDP 1 m | 18.11% | 10.96 |
| RDP 2 m | 18.01% | 4.04 |
| SED 1 m | 16.97% | 13.76 |
| SED 2 m | 13.20% | 6.31 |
| Anchor 1.5 m | 15.52% | 7.62 |
| Adaptativo 12 s | 21.98% | 15.23 |
| Multiescala 0.01 | 18.45% | 2.51 |

La batería completa, que añade σ 2/3 m, ruido blanco y el caso adversarial, tiene errores mayores; se publica íntegra en `RESULTS.md`. No deben usarse esos MAPE como margen de error de un partido real. El ruido es isotrópico, estacionario y artificial: no modela multitrayecto concreto, filtrado interno, obstrucción del cuerpo, sesgo anisótropo, recepción de satélites ni vibración de muñeca.

El ranking depende de los pesos. El score general favorece incluso VW 5 m, que destruye recorridos de fútbol. El score alternativo descuenta el error ya introducido por muestreo y separa los escenarios adversariales. **Ninguna clasificación escalar basta para elegir un algoritmo**; deben coexistir controles de deriva estacionaria, geometría y movimientos cortos. No pasa ningún candidato los límites exploratorios del segundo score. Es una constatación sobre estas pruebas, no una demostración de imposibilidad de cualquier algoritmo imaginable.

## 5. Resultados reales y geometría

Todos los resultados siguientes utilizan la ventana común de 864 s. Las tablas full y common-observed completas están en `RESULTS.md`.

| Método | COROS m | Garmin m | Δ/COROS | Interpretación |
|---|---:|---:|---:|---|
| Raw sin puentes | 1272.58 | 1370.22 | +7.67% | Referencia geométrica observada |
| Temporal 3 s | 1203.71 | 1204.55 | +0.07% | Coincide, pero recorta geometría |
| Temporal 5 s | 1127.64 | 1107.58 | −1.78% | Mayor pérdida de movimiento |
| Lineal 1 Hz + temporal 3 s | 1203.71 | 1224.20 | +1.70% | Cambia la malla de salida y el resultado |
| Lineal 1 Hz + temporal 5 s | 1127.64 | 1130.03 | +0.21% | Nueva coincidencia, tampoco validación |
| RDP 1 m | 1238.32 | 1340.66 | +8.26% | Conserva longitud global, falla en retrocesos |
| RDP 2 m | 1212.24 | 1284.85 | +5.99% | Mayor simplificación y sensibilidad a límites |
| SED 1 m | 1247.49 | 1353.43 | +8.49% | Mejor control temporal, poco acuerdo |
| SED 2 m | 1224.53 | 1310.36 | +7.01% | No normaliza de forma suficiente |
| Anchor 1.5 m | 1218.62 | 1324.55 | +8.69% | Acumula progreso lento, no elimina todo drift |
| Adaptativo / híbrido 12 s | 1272.58 | 1370.22 | +7.67% | Se abstienen en el FIT |
| Kalman σ1, a2 | 1302.55 | 1378.50 | +5.83% | Incluso añade longitud |
| Multiescala 0.01 | 1258.44 | 1370.22 | +8.88% | Selección distinta por tramo/calidad |

El temporal de 3 s retiene 94.59% del raw COROS y 87.91% del Garmin. Los giros emparejados con el original bajan a 58.3% y 43.1%; a 5 s bajan a 41.7% y 28.7%. Parte de esos giros originales puede ser ruido; por eso se complementa esta métrica con la evidencia sintética.

La métrica de giros exige ángulo ≥45°, lados ≥0.25 m y emparejamiento uno a uno dentro de ±2 s y ±30°. Se añaden RMS y máximo del desplazamiento a igual tiempo, preservación de extremos y retención por ventanas de 10 s. El máximo temporal ofrece una cota conservadora bajo la correspondencia temporal fijada; no se presenta como la distancia Fréchet óptima.

SED 1 m mantiene desviación temporal máxima inferior a 1 m en ambos FIT, mientras RDP 1 m llega a 9.09 m en COROS: su garantía espacial no garantiza la ubicación del jugador en cada instante. Esto explica por qué una buena apariencia de mapa no valida un cálculo de distancia o una atribución local.

Al igualar la cobertura, el temporal 3 s pasa de +0.07% a **−1.74%**; el de 5 s queda en **−3.56%**. La intersección aparente depende de la definición de tiempo y cobertura. No se intenta reproducir a fuerza las referencias anteriores de 1142/1143 m.

## 6. Multiescala y sensibilidad

| Escala RDP | COROS common m | Garmin common m | Δ/COROS |
|---|---:|---:|---:|
| Raw | 1272.58 | 1370.22 | +7.67% |
| 0.5 m | 1256.11 | 1359.94 | +8.27% |
| 1 m | 1238.32 | 1340.66 | +8.26% |
| 1.5 m | 1223.57 | 1306.64 | +6.79% |
| 2 m | 1212.24 | 1284.85 | +5.99% |
| 2.5 m | 1204.93 | 1256.34 | +4.27% |
| 3 m | 1171.76 | 1230.15 | +4.98% |
| 4 m | 1146.57 | 1167.18 | +1.80% |
| 5 m | 1087.71 | 1131.35 | +4.01% |

No aparece una meseta común amplia que justifique una escala física universal. La diferencia tampoco disminuye monótonamente. Las pendientes y pasos finos están en `sensitivity.csv`: subir RDP 1.5→1.6 m cambia la cobertura común unos −2.20 m COROS y −0.30 m Garmin, pero cambios mayores pueden eliminar grupos completos de vértices.

El selector multiescala busca dos pendientes pequeñas consecutivas, relativas a la longitud raw y al incremento de escala. Si no encuentra meseta, devuelve raw. No utiliza el otro reloj. Con pendiente 0.01 deja Garmin sin simplificar y reduce COROS: el desacuerdo de la ventana común crece a 8.88%. Una meseta también puede aparecer porque el movimiento real ya se ha borrado, como enseña el shuttle. Por tanto se recomienda usar la curva multiescala como **diagnóstico de sensibilidad**, no como selector automático de una verdad.

## 7. Muestreo y geometría no recuperable

| Muestreo COROS, fase 0 | Raw full m | Cambio raw | Temporal 3 s m | RDP 1 m m |
|---|---:|---:|---:|---:|
| Original | 1273.57 | 0.00% | 1204.74 | 1240.70 |
| Cada 2 s | 1252.85 | −1.63% | 1153.57 | 1230.77 |
| Cada 3 s | 1222.49 | −4.01% | 1105.66 | 1207.30 |
| Cada 4 s | 1182.03 | −7.19% | 1060.41 | 1174.60 |
| Cada 5 s | 1120.87 | −11.99% | 1015.19 | 1115.64 |
| Patrón temporal Garmin | 1239.04 | −2.71% | 1139.89 | 1217.93 |

Las variantes de fase están disponibles para cada método. El patrón Garmin usa su secuencia real de intervalos sobre COROS, pero no reproduce la política de grabar en respuesta al movimiento. Se conserva cada extremo y cada hueco. Son pérdidas respecto al track COROS observado, no errores físicos conocidos.

**Reducir los puntos COROS reduce su longitud; por sí solo no explica que Garmin tenga más longitud.** No se puede calcular qué porcentaje exacto de los 69.80 m pareados procede del muestreo: faltan las posiciones originales de Garmin a mayor frecuencia y un modelo del error de cada receptor.

En Garmin, la interpolación lineal a 1 Hz conserva exactamente 1384.33 m full porque añade puntos sobre las mismas cuerdas y los tiempos FIT están en segundos enteros. A 2 s, si se descartan nudos originales, cae a 1311.97 m; si se conservan, sigue en 1384.33 m. PCHIP con nudos originales da 1390.18 m a 1 Hz y 1395.81 m a 0.25 s: la curvatura modelada añade longitud, sin evidencia de que represente el movimiento perdido.

Hay una limitación identificable sin modelos estadísticos: dos posiciones iguales separadas 2 s son compatibles tanto con inmovilidad como con ir 5 m y volver. Cualquier cálculo que sólo vea esos extremos devuelve la misma respuesta a ambas trayectorias. Ninguna interpolación puede garantizar acertar en las dos. Esa ambigüedad también puede existir entre desplazamiento lento y drift correlacionado.

## 8. Campos FIT, ruido y fusión

Ambos archivos pasan CRC y lectura con el SDK oficial; los 1319 registros coinciden entre parsers en timestamps, disponibilidad y valores de coordenadas, velocidad y distancia. Se distinguen campos realmente serializados de expansiones del SDK: por ejemplo, el SDK puede exponer enhancedSpeed derivado de speed, pero COROS no serializa ese campo como observación independiente [10].

| Campo de registro utilizable | COROS | Garmin |
|---|---:|---:|
| Coordenadas | 816 | 451 |
| Distance | 868 | 451 |
| Speed | 864 | 0 |
| Enhanced speed serializado | 0 | 451 |
| Cadence | 0 | 451; 317 valores cero |
| Enhanced altitude | 0 | 451 |
| GPS accuracy / covarianza posicional | No disponible | No disponible |
| Mensajes públicos de acelerómetro o GPS metadata | No disponibles | No disponibles |

COROS tiene estadísticas de cadencia en sesión, pero no cadencia por registro; no sirven para localizar inmovilidad. La cadencia cero de Garmin es demasiado frecuente para tratarla automáticamente como reposo físico. Ambos tienen dos eventos timer, inicio y fin; las vueltas y sesiones no añaden observaciones de posición de mayor frecuencia. El timestamp final del lap Garmin coincide con su inicio en ambos decoders; se usa la ventana de registros, no ese lap para alinear.

Garmin también incluye mensajes privados desconocidos para el perfil público, entre ellos 881 mensajes número 233 y campos de registro 107/135/136/143. Se inventarían significados si se interpretaran como acelerometría o precisión. El inventario preserva sus identificadores y recuentos, pero no se usan en el algoritmo. La ausencia de un campo público utilizable no demuestra ausencia de sensores internos en el reloj.

La integración trapezoidal de velocidad produce **1585.92 m COROS** sobre 863 s con velocidad disponible y **1553.94 m Garmin** sobre 876 s. No coincide con 1278.70/1359.71 m de sesión. Un pico de velocidad útil y validado no implica que la señal sirva para integrar toda la distancia. No se modifica ninguna métrica de velocidad de producción.

El estimador conservador de ruido encuentra **cero ventanas candidatas** en ambos FIT. Eso no significa σ=0: significa **no identificable con estos criterios y campos**. El híbrido se abstiene. Sus ablations sintéticas con velocidad ideal, suavizada/reducida un 10% y ausente están en `speed-ablation.csv`; la velocidad ideal es un control favorable, no una propiedad atribuida a un fabricante.

## 9. Intervalos de fútbol

Se seleccionan ventanas de 12 s a partir del COROS raw, sin usar la distancia filtrada: mayor velocidad media disponible, menor combinación de recorrido y dispersión, ritmo próximo a 0.4 m/s, más giros y mayor rectitud con desplazamiento suficiente. Son etiquetas heurísticas y pueden solaparse.

| Intervalo relativo | Descripción | Raw C/G m | Temporal 3 s C/G m | Temporal 5 s C/G m |
|---|---|---:|---:|---:|
| 547–559 s | Alta velocidad | 49.93 / 39.60 | 45.73 / 35.70 | 41.25 / 33.07 |
| 601–613 s | Aparente reposo | 3.51 / 5.46 | 2.82 / 3.73 | 2.19 / 2.86 |
| 595–607 s | Movimiento lento | 4.74 / 7.15 | 4.54 / 6.46 | 4.69 / 6.22 |
| 27–39 s | Varios giros | 7.46 / 11.85 | 6.92 / 10.17 | 6.60 / 9.23 |
| 556–568 s | Relativamente recto | 16.43 / 18.87 | 17.04 / 17.86 | 17.41 / 17.24 |

El incremento local del tramo recto al suavizar COROS muestra que un filtro puede desplazar movimiento entre ventanas. No todos los cambios locales son eliminación de distancia. El aparente reposo tiene velocidad COROS media de ~0.58 m/s; podría ser movimiento pequeño o desacuerdo entre señales. No se utiliza como reposo confirmado para calibrar ruido.

## 10. Recomendación, riesgos y siguiente validación

### Métodos descartados para sustituir producción ahora

- **Temporal fuerte:** aproxima totales, pero elimina gran parte de las idas y vueltas conocidas.
- **RDP / VW como normalizador:** sus garantías geométricas no protegen longitud recorrida ni cronología; el fallo collinear es grave.
- **Meseta automática:** no hay escala física demostrada y la abstención puede cambiar la definición entre tracks.
- **Kalman ensayado:** necesita covarianzas justificadas, puede añadir longitud y no elimina la ambigüedad de muestreo.
- **Anchor universal:** conserva rectas lentas, pero no distingue drift de movimiento local ni protege todas las excursiones bajo umbral.
- **Adaptive / noise / hybrid:** la versión prudente no modifica estos FIT; relajarla sin referencia invita a repetir el borrado de fútbol real.
- **Interpolación como recuperación:** sólo inserta una hipótesis entre observaciones, lineal o curva.

### Estrategia prudente

Mantener por ahora la política existente: GPS para grabación densa y distancia FIT para Smart Recording, con su diferencia reconocida. Esa política tampoco queda validada como verdad ni como distancia intercambiable entre jugadores. Es una decisión provisional que evita adoptar un filtro con fallos demostrados; este par no prueba que sea óptima.

En una fase futura, separar **distancia reportada por el dispositivo**, **longitud GPS observada** y **diagnóstico multiescala**, con cobertura, intervalos de muestreo, fuente y versión. No publicar un “intervalo de confianza” derivado de varias escalas: sería una banda de sensibilidad algorítmica sin cobertura probabilística demostrada. Revisar el puenteo de huecos como cambio específico de definición, distinto de normalizar fabricantes, y sólo después de autorizar cambios en producción.

### Candidato para continuar investigando

SED en la región 1–2 m es un candidato de representación temporal conservadora, no un normalizador listo. El interés procede de los sintéticos y de su cota temporal, no de conseguir que COROS y Garmin coincidan. Para evaluarlo como distancia se necesita una señal de reposo independiente o suficiente referencia externa para justificar una adaptación por calidad; actualmente ninguna está disponible de forma homogénea.

Una arquitectura futura podría construir tramos observados y métricas de cobertura comunes, y derivar por separado distanceTrack, speedTrack y visualTrack. distanceTrack no debe modificar el track de velocidad validado ni el mapa. Si no hay evidencia para el ruido, abstenerse de clasificar reposo; si falta geometría, no inventar distancia. El nombre del fabricante no participa en la elección del filtro.

### Evidencia necesaria antes de integrar

Recoger varios participantes, días, superficies y modelos, intercambiando muñecas y repitiendo con grabación densa cuando sea posible. Añadir tramos de reposo instruido, caminata de 0.4 m/s, shuttles de 1/2/5/10 m, curvas y sprints con giros sobre recorridos medidos. Vídeo sincronizado o una referencia óptica/RTK permitiría evaluar posición y tiempo, además del recorrido planificado.

Separar sesiones completas de desarrollo y validación, no sólo semillas. Fijar criterios de pérdida máxima en movimiento lento y shuttles, distancia residual estacionaria, estabilidad ante fases de muestreo y tolerancia de comparación entre dispositivos antes de evaluar el conjunto reservado. La decisión debe considerar error por tipo de movimiento, no sólo el promedio de un partido.

**RECOMMENDATION:** conservar producción y ampliar validación externa; usar multiescala como diagnóstico y SED como candidato experimental.

**CONFIDENCE:** alta en rechazar la coincidencia como validación; media en la decisión provisional; baja para exactitud física del partido y umbrales universales.

**SHOULD WE MODIFY PRODUCTION? NO.**

**PROPOSED ALGORITHM:** ninguno aprobado para normalizar hoy. Propuesta de investigación: tramos observados sin puentes + cobertura explícita + simplificación síncrona 1–2 m evaluada por calidad, con abstención ante ruido no identificable.

**REASONS:** información perdida por muestreo; falta de referencia externa; fallos demostrados de movimiento corto; dependencia de cobertura y límites; covarianza GPS desconocida.

## Referencias

Las cifras propias provienen de los dos FIT locales identificados por hash en `results/metadata.json` y de los escenarios reproducibles en `synthetic.mjs`. No se atribuyen a bibliografía externa.

1. Ranacher, P. et al. *Why GPS makes distances bigger than they are*. International Journal of Geographical Information Science, 30(2), 316–333, 2016; preprint 2015. [Texto de autores](https://arxiv.org/html/1504.04504). Sesgo de medida y autocorrelación; no calibración de estos dispositivos.
2. Portas, M. D. et al. *The validity and reliability of 1-Hz and 5-Hz global positioning systems for linear, multidirectional, and soccer-specific activities*, 2010. [Resumen del estudio](https://pubmed.ncbi.nlm.nih.gov/21266730/). Sistemas y condiciones anteriores a estos relojes.
3. *Rapid Directional Change Degrades GPS Distance Measurement Validity during Intermittent Intensity Running*, 2014. [Artículo](https://pmc.ncbi.nlm.nih.gov/articles/PMC3986049/). Evidencia sobre cambios de dirección; no trasladar su error numérico a este par.
4. SciPy. [PchipInterpolator](https://docs.scipy.org/doc/scipy/reference/generated/scipy.interpolate.PchipInterpolator.html). Definición de pendientes y limitación de overshoot; consulta septiembre de 2026. La implementación experimental es JavaScript, no una llamada a SciPy.
5. Douglas, D. H. y Peucker, T. K. *Algorithms for the Reduction of the Number of Points Required to Represent a Digitized Line or its Caricature*, 1973. [Publicación original](https://doi.org/10.3138/FM57-6770-U75U-7727).
6. Visvalingam, M. y Whyatt, J. D. *Line generalisation by repeated elimination of points*, 1993. [Artículo en repositorio de Hull](https://hull-repository.worktribe.com/preview/376364/000870493786962263.pdf).
7. Meratnia, N. y de By, R. A. *Spatiotemporal compression techniques for moving point objects*, 2004. [Registro de autores, Universidad de Twente](https://research.utwente.nl/en/publications/spatiotemporal-compression-techniques-for-moving-point-objects/).
8. Welch, G. y Bishop, G. *An Introduction to the Kalman Filter*, TR 95-041, revisión 2006. [Informe técnico](https://www.cs.unc.edu/~welch/media/pdf/kalman_intro.pdf).
9. SciPy. [savgol_filter](https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.savgol_filter.html). Ajuste polinómico y parámetros; consulta septiembre de 2026.
10. Garmin. [Official FIT JavaScript SDK](https://github.com/garmin/fit-javascript-sdk). Integridad, lectura, campos desconocidos y expansión de componentes. Versión ejecutada 21.214.0, fijada en package-lock.
