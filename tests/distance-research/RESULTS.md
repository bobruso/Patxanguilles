# Resultados numéricos reproducibles

Unidades: metros salvo indicación. Diferencia = Garmin − COROS. Raw aquí excluye huecos explícitos. Los sintéticos no son ground truth del partido.

## full

| Método | COROS m | Garmin m | Δ m | Δ/COROS % | Retenido C % | Retenido G % |
|---|---:|---:|---:|---:|---:|---:|
| raw | 1273.57 | 1384.33 | 110.77 | 8.70 | 100.00 | 100.00 |
| temporal-3s | 1204.74 | 1218.70 | 13.96 | 1.16 | 94.60 | 88.03 |
| temporal-5s | 1128.85 | 1121.66 | -7.19 | -0.64 | 88.64 | 81.02 |
| linear-1Hz | 1273.57 | 1384.33 | 110.77 | 8.70 | 100.00 | 100.00 |
| pchip-knots-1Hz | 1273.57 | 1390.18 | 116.61 | 9.16 | 100.00 | 100.42 |
| rdp-1m | 1240.70 | 1354.31 | 113.62 | 9.16 | 97.42 | 97.83 |
| rdp-2m | 1214.61 | 1298.50 | 83.89 | 6.91 | 95.37 | 93.80 |
| sed-1m | 1248.95 | 1367.94 | 119.00 | 9.53 | 98.07 | 98.82 |
| sed-2m | 1225.99 | 1324.01 | 98.03 | 8.00 | 96.26 | 95.64 |
| anchor-1.5m | 1219.70 | 1338.67 | 118.97 | 9.75 | 95.77 | 96.70 |
| vw-1m | 1214.42 | 1314.95 | 100.53 | 8.28 | 95.36 | 94.99 |
| adaptive-12s | 1273.57 | 1384.33 | 110.77 | 8.70 | 100.00 | 100.00 |
| hybrid-12s | 1273.57 | 1384.33 | 110.77 | 8.70 | 100.00 | 100.00 |
| kalman-s1-a2 | 1303.53 | 1392.81 | 89.28 | 6.85 | 102.35 | 100.61 |
| multiscale-0.01 | 1259.44 | 1384.33 | 124.90 | 9.92 | 98.89 | 100.00 |
| noise-adaptive | 1273.57 | 1384.33 | 110.77 | 8.70 | 100.00 | 100.00 |

## common

| Método | COROS m | Garmin m | Δ m | Δ/COROS % | Retenido C % | Retenido G % |
|---|---:|---:|---:|---:|---:|---:|
| raw | 1272.58 | 1370.22 | 97.64 | 7.67 | 100.00 | 100.00 |
| temporal-3s | 1203.71 | 1204.55 | 0.84 | 0.07 | 94.59 | 87.91 |
| temporal-5s | 1127.64 | 1107.58 | -20.05 | -1.78 | 88.61 | 80.83 |
| linear-1Hz | 1272.58 | 1370.22 | 97.64 | 7.67 | 100.00 | 100.00 |
| pchip-knots-1Hz | 1272.58 | 1376.27 | 103.69 | 8.15 | 100.00 | 100.44 |
| rdp-1m | 1238.32 | 1340.66 | 102.34 | 8.26 | 97.31 | 97.84 |
| rdp-2m | 1212.24 | 1284.85 | 72.61 | 5.99 | 95.26 | 93.77 |
| sed-1m | 1247.49 | 1353.43 | 105.94 | 8.49 | 98.03 | 98.77 |
| sed-2m | 1224.53 | 1310.36 | 85.83 | 7.01 | 96.22 | 95.63 |
| anchor-1.5m | 1218.62 | 1324.55 | 105.94 | 8.69 | 95.76 | 96.67 |
| vw-1m | 1212.96 | 1300.84 | 87.88 | 7.24 | 95.32 | 94.94 |
| adaptive-12s | 1272.58 | 1370.22 | 97.64 | 7.67 | 100.00 | 100.00 |
| hybrid-12s | 1272.58 | 1370.22 | 97.64 | 7.67 | 100.00 | 100.00 |
| kalman-s1-a2 | 1302.55 | 1378.50 | 75.95 | 5.83 | 102.36 | 100.60 |
| multiscale-0.01 | 1258.44 | 1370.22 | 111.77 | 8.88 | 98.89 | 100.00 |
| noise-adaptive | 1272.58 | 1370.22 | 97.64 | 7.67 | 100.00 | 100.00 |

## common-observed

| Método | COROS m | Garmin m | Δ m | Δ/COROS % | Retenido C % | Retenido G % |
|---|---:|---:|---:|---:|---:|---:|
| raw | 1272.58 | 1342.38 | 69.80 | 5.49 | 100.00 | 100.00 |
| temporal-3s | 1203.71 | 1182.81 | -20.90 | -1.74 | 94.59 | 88.11 |
| temporal-5s | 1127.64 | 1087.52 | -40.12 | -3.56 | 88.61 | 81.01 |
| linear-1Hz | 1272.58 | 1342.38 | 69.80 | 5.49 | 100.00 | 100.00 |
| pchip-knots-1Hz | 1272.58 | 1349.01 | 76.43 | 6.01 | 100.00 | 100.49 |
| rdp-1m | 1238.32 | 1304.79 | 66.46 | 5.37 | 97.31 | 97.20 |
| rdp-2m | 1212.24 | 1239.57 | 27.34 | 2.25 | 95.26 | 92.34 |
| sed-1m | 1247.49 | 1327.43 | 79.94 | 6.41 | 98.03 | 98.89 |
| sed-2m | 1224.53 | 1284.27 | 59.74 | 4.88 | 96.22 | 95.67 |
| anchor-1.5m | 1218.62 | 1300.78 | 82.16 | 6.74 | 95.76 | 96.90 |
| vw-1m | 1212.96 | 1278.52 | 65.56 | 5.40 | 95.32 | 95.24 |
| adaptive-12s | 1272.58 | 1342.38 | 69.80 | 5.49 | 100.00 | 100.00 |
| hybrid-12s | 1272.58 | 1342.38 | 69.80 | 5.49 | 100.00 | 100.00 |
| kalman-s1-a2 | 1302.55 | 1350.67 | 48.12 | 3.69 | 102.36 | 100.62 |
| multiscale-0.01 | 1258.44 | 1342.38 | 83.94 | 6.67 | 98.89 | 100.00 |
| noise-adaptive | 1272.58 | 1342.38 | 69.80 | 5.49 | 100.00 | 100.00 |

## Sintéticos: holdout

MAPE: media de errores absolutos porcentuales de movimientos, con igual peso por escenario × ruido × muestreo. Estacionario separado; nunca dividir por cero. Peor limpio incluye aliasing de Smart Recording.

| Método | MAPE movimiento % | Sesgo % | Quieto m/min | Peor limpio % | Caminata MAPE % | Fútbol MAPE % | Sensibilidad sampling % |
|---|---:|---:|---:|---:|---:|---:|---:|
| raw | 94.09 | 83.39 | 66.41 | 97.50 | 208.95 | 39.32 | 97.35 |
| temporal-3s | 39.95 | 14.16 | 30.24 | 97.50 | 73.74 | 25.79 | 17.39 |
| temporal-5s | 32.31 | -1.25 | 21.49 | 97.50 | 45.89 | 28.10 | 7.65 |
| linear-1Hz | 89.01 | 76.63 | 62.93 | 97.50 | 195.18 | 38.34 | 97.35 |
| pchip-knots-1Hz | 94.64 | 84.06 | 66.66 | 97.50 | 210.36 | 39.49 | 96.46 |
| rdp-1m | 87.51 | 69.87 | 57.52 | 100.00 | 185.29 | 39.31 | 82.17 |
| rdp-2m | 76.12 | 50.06 | 44.87 | 100.00 | 147.77 | 38.19 | 63.65 |
| sed-1m | 90.27 | 77.08 | 61.44 | 100.00 | 196.42 | 38.17 | 89.56 |
| sed-2m | 81.30 | 63.18 | 52.00 | 100.00 | 168.87 | 35.91 | 75.51 |
| anchor-1.5m | 83.91 | 67.72 | 53.89 | 100.00 | 178.39 | 36.65 | 78.44 |
| vw-1m | 77.14 | 51.00 | 41.60 | 100.00 | 150.27 | 39.72 | 58.30 |
| adaptive-12s | 94.35 | 81.15 | 61.71 | 97.50 | 208.95 | 39.03 | 94.38 |
| hybrid-12s | 94.03 | 83.32 | 61.71 | 97.50 | 208.95 | 39.18 | 97.14 |
| kalman-s1-a2 | 80.14 | 68.24 | 58.08 | 97.17 | 177.42 | 34.28 | 69.60 |
| multiscale-0.01 | 88.29 | 61.04 | 56.11 | 100.00 | 171.63 | 43.16 | 83.00 |
| noise-adaptive | 94.09 | 83.39 | 63.06 | 97.50 | 208.95 | 39.32 | 97.35 |

## Geometría del FIT completo

Desviación temporal respecto al GPS original, que contiene ruido; no es error respecto a trayectoria física. Giros ≥45°, lados ≥0.25 m; correspondencia uno a uno ±2 s y ±30°.

| Método | Dispositivo | RMS m | Máximo m | Giros conservados % | P10 retención local 10s |
|---|---|---:|---:|---:|---:|
| raw | COROS | 0.00 | 0.00 | 100.00 | 1.00 |
| raw | GARMIN | 0.00 | 0.00 | 100.00 | 1.00 |
| temporal-3s | COROS | 0.46 | 1.89 | 58.33 | 0.89 |
| temporal-3s | GARMIN | 0.66 | 2.28 | 43.10 | 0.76 |
| temporal-5s | COROS | 0.93 | 4.02 | 41.67 | 0.79 |
| temporal-5s | GARMIN | 1.14 | 3.72 | 28.74 | 0.67 |
| linear-1Hz | COROS | 0.00 | 0.00 | 100.00 | 1.00 |
| linear-1Hz | GARMIN | 0.00 | 0.00 | 95.98 | 1.00 |
| pchip-knots-1Hz | COROS | 0.00 | 0.00 | 100.00 | 1.00 |
| pchip-knots-1Hz | GARMIN | 0.00 | 0.00 | 71.26 | 0.97 |
| rdp-1m | COROS | 1.44 | 9.09 | 31.67 | 0.85 |
| rdp-1m | GARMIN | 1.20 | 6.09 | 65.52 | 0.87 |
| rdp-2m | COROS | 1.95 | 9.09 | 10.00 | 0.82 |
| rdp-2m | GARMIN | 2.58 | 13.36 | 40.23 | 0.73 |
| sed-1m | COROS | 0.41 | 1.00 | 51.67 | 0.93 |
| sed-1m | GARMIN | 0.37 | 0.99 | 79.31 | 0.94 |
| sed-2m | COROS | 0.73 | 1.95 | 30.00 | 0.88 |
| sed-2m | GARMIN | 0.84 | 1.98 | 47.70 | 0.73 |
| anchor-1.5m | COROS | 0.53 | 2.64 | 50.00 | 0.84 |
| anchor-1.5m | GARMIN | 0.62 | 4.15 | 56.90 | 0.83 |
| vw-1m | COROS | 1.09 | 6.16 | 45.00 | 0.81 |
| vw-1m | GARMIN | 0.86 | 6.42 | 61.49 | 0.74 |
| adaptive-12s | COROS | 0.00 | 0.00 | 100.00 | 1.00 |
| adaptive-12s | GARMIN | 0.00 | 0.00 | 100.00 | 1.00 |
| hybrid-12s | COROS | 0.00 | 0.00 | 100.00 | 1.00 |
| hybrid-12s | GARMIN | 0.00 | 0.00 | 100.00 | 1.00 |
| kalman-s1-a2 | COROS | 0.20 | 0.85 | 90.00 | 0.99 |
| kalman-s1-a2 | GARMIN | 0.20 | 0.97 | 87.93 | 0.97 |
| multiscale-0.01 | COROS | 0.89 | 7.42 | 70.00 | 0.97 |
| multiscale-0.01 | GARMIN | 0.00 | 0.00 | 100.00 | 1.00 |
| noise-adaptive | COROS | 0.00 | 0.00 | 100.00 | 1.00 |
| noise-adaptive | GARMIN | 0.00 | 0.00 | 100.00 | 1.00 |

## COROS downsampling, fase 0

| Sampling | Método | Distancia m | Δ original % |
|---|---|---:|---:|
| original | raw | 1273.57 | 0.00 |
| original | temporal-3s | 1204.74 | 0.00 |
| original | rdp-1m | 1240.70 | 0.00 |
| original | anchor-1.5m | 1219.70 | 0.00 |
| original | multiscale-0.01 | 1259.44 | 0.00 |
| every2 | raw | 1252.85 | -1.63 |
| every2 | temporal-3s | 1153.57 | -4.25 |
| every2 | rdp-1m | 1230.77 | -0.80 |
| every2 | anchor-1.5m | 1222.81 | 0.26 |
| every2 | multiscale-0.01 | 1234.57 | -1.97 |
| every3 | raw | 1222.49 | -4.01 |
| every3 | temporal-3s | 1105.66 | -8.22 |
| every3 | rdp-1m | 1207.30 | -2.69 |
| every3 | anchor-1.5m | 1204.52 | -1.24 |
| every3 | multiscale-0.01 | 1219.00 | -3.21 |
| every4 | raw | 1182.03 | -7.19 |
| every4 | temporal-3s | 1060.41 | -11.98 |
| every4 | rdp-1m | 1174.60 | -5.33 |
| every4 | anchor-1.5m | 1175.18 | -3.65 |
| every4 | multiscale-0.01 | 1167.90 | -7.27 |
| every5 | raw | 1120.87 | -11.99 |
| every5 | temporal-3s | 1015.19 | -15.73 |
| every5 | rdp-1m | 1115.64 | -10.08 |
| every5 | anchor-1.5m | 1115.85 | -8.51 |
| every5 | multiscale-0.01 | 1110.73 | -11.81 |
| garmin-like | raw | 1239.04 | -2.71 |
| garmin-like | temporal-3s | 1139.89 | -5.38 |
| garmin-like | rdp-1m | 1217.93 | -1.84 |
| garmin-like | anchor-1.5m | 1203.54 | -1.32 |
| garmin-like | multiscale-0.01 | 1236.08 | -1.85 |
