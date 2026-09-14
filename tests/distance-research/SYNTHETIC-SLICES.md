# Cortes de diagnóstico sintético

Errores calculados con las semillas reservadas. No representan la exactitud del partido real.

## Ruido moderado y correlacionado

σ = 0.5 o 1 m; τ = 3 o 15 s; todos los muestreos; excluye el caso adversarial de 0.5 m. Igual peso por celda.

| Método | MAPE movimiento % | Estacionario m/min |
|---|---:|---:|
| raw | 22.17 | 21.84 |
| temporal-3s | 19.03 | 11.83 |
| temporal-5s | 20.44 | 8.83 |
| rdp-1m | 18.11 | 10.96 |
| rdp-2m | 18.01 | 4.04 |
| sed-1m | 16.97 | 13.76 |
| sed-2m | 13.20 | 6.31 |
| anchor-1.5m | 15.52 | 7.62 |
| adaptive-12s | 21.98 | 15.23 |
| multiscale-0.01 | 18.45 | 2.51 |

## Sin ruido, muestreo denso

| Escenario | Método | Verdad m | Medido m | Sesgo m |
|---|---|---:|---:|---:|
| straight100 | raw | 100.00 | 100.00 | 0.00 |
| straight100 | temporal-3s | 100.00 | 100.00 | 0.00 |
| straight100 | temporal-5s | 100.00 | 100.00 | 0.00 |
| straight100 | rdp-1m | 100.00 | 100.00 | 0.00 |
| straight100 | sed-1m | 100.00 | 100.00 | 0.00 |
| straight100 | anchor-1.5m | 100.00 | 100.00 | 0.00 |
| straight100 | rdp-2m | 100.00 | 100.00 | 0.00 |
| straight100 | sed-2m | 100.00 | 100.00 | 0.00 |
| straight100 | adaptive-12s | 100.00 | 100.00 | 0.00 |
| straight100 | multiscale-0.01 | 100.00 | 100.00 | 0.00 |
| slow04 | raw | 40.00 | 40.00 | 0.00 |
| slow04 | temporal-3s | 40.00 | 40.00 | 0.00 |
| slow04 | temporal-5s | 40.00 | 40.00 | 0.00 |
| slow04 | rdp-1m | 40.00 | 40.00 | 0.00 |
| slow04 | sed-1m | 40.00 | 40.00 | 0.00 |
| slow04 | anchor-1.5m | 40.00 | 40.00 | 0.00 |
| slow04 | rdp-2m | 40.00 | 40.00 | 0.00 |
| slow04 | sed-2m | 40.00 | 40.00 | 0.00 |
| slow04 | adaptive-12s | 40.00 | 40.00 | 0.00 |
| slow04 | multiscale-0.01 | 40.00 | 40.00 | 0.00 |
| stationary | raw | 0.00 | 0.00 | 0.00 |
| stationary | temporal-3s | 0.00 | 0.00 | 0.00 |
| stationary | temporal-5s | 0.00 | 0.00 | 0.00 |
| stationary | rdp-1m | 0.00 | 0.00 | 0.00 |
| stationary | sed-1m | 0.00 | 0.00 | 0.00 |
| stationary | anchor-1.5m | 0.00 | 0.00 | 0.00 |
| stationary | rdp-2m | 0.00 | 0.00 | 0.00 |
| stationary | sed-2m | 0.00 | 0.00 | 0.00 |
| stationary | adaptive-12s | 0.00 | 0.00 | 0.00 |
| stationary | multiscale-0.01 | 0.00 | 0.00 | 0.00 |
| zigzag | raw | 84.85 | 84.85 | 0.00 |
| zigzag | temporal-3s | 84.85 | 63.03 | -21.83 |
| zigzag | temporal-5s | 84.85 | 61.65 | -23.20 |
| zigzag | rdp-1m | 84.85 | 84.85 | 0.00 |
| zigzag | sed-1m | 84.85 | 84.85 | 0.00 |
| zigzag | anchor-1.5m | 84.85 | 84.85 | 0.00 |
| zigzag | rdp-2m | 84.85 | 81.61 | -3.24 |
| zigzag | sed-2m | 84.85 | 81.61 | -3.24 |
| zigzag | adaptive-12s | 84.85 | 84.85 | 0.00 |
| zigzag | multiscale-0.01 | 84.85 | 84.85 | 0.00 |
| shuttle5 | raw | 100.00 | 80.00 | -20.00 |
| shuttle5 | temporal-3s | 100.00 | 36.33 | -63.67 |
| shuttle5 | temporal-5s | 100.00 | 6.34 | -93.66 |
| shuttle5 | rdp-1m | 100.00 | 8.00 | -92.00 |
| shuttle5 | sed-1m | 100.00 | 80.00 | -20.00 |
| shuttle5 | anchor-1.5m | 100.00 | 80.00 | -20.00 |
| shuttle5 | rdp-2m | 100.00 | 8.00 | -92.00 |
| shuttle5 | sed-2m | 100.00 | 80.00 | -20.00 |
| shuttle5 | adaptive-12s | 100.00 | 80.00 | -20.00 |
| shuttle5 | multiscale-0.01 | 100.00 | 8.00 | -92.00 |
| circle10 | raw | 62.83 | 62.80 | -0.03 |
| circle10 | temporal-3s | 62.83 | 62.50 | -0.33 |
| circle10 | temporal-5s | 62.83 | 62.07 | -0.76 |
| circle10 | rdp-1m | 62.83 | 61.21 | -1.62 |
| circle10 | sed-1m | 62.83 | 61.21 | -1.62 |
| circle10 | anchor-1.5m | 62.83 | 62.72 | -0.11 |
| circle10 | rdp-2m | 62.83 | 61.21 | -1.62 |
| circle10 | sed-2m | 62.83 | 61.21 | -1.62 |
| circle10 | adaptive-12s | 62.83 | 62.80 | -0.03 |
| circle10 | multiscale-0.01 | 62.83 | 61.21 | -1.62 |
| sprint-brake-turn | raw | 68.00 | 68.00 | 0.00 |
| sprint-brake-turn | temporal-3s | 68.00 | 64.01 | -3.99 |
| sprint-brake-turn | temporal-5s | 68.00 | 61.12 | -6.88 |
| sprint-brake-turn | rdp-1m | 68.00 | 68.00 | 0.00 |
| sprint-brake-turn | sed-1m | 68.00 | 68.00 | 0.00 |
| sprint-brake-turn | anchor-1.5m | 68.00 | 68.00 | 0.00 |
| sprint-brake-turn | rdp-2m | 68.00 | 68.00 | 0.00 |
| sprint-brake-turn | sed-2m | 68.00 | 68.00 | 0.00 |
| sprint-brake-turn | adaptive-12s | 68.00 | 68.00 | 0.00 |
| sprint-brake-turn | multiscale-0.01 | 68.00 | 68.00 | 0.00 |
| missing-slow04 | raw | 33.20 | 33.20 | 0.00 |
| missing-slow04 | temporal-3s | 33.20 | 33.20 | 0.00 |
| missing-slow04 | temporal-5s | 33.20 | 33.20 | 0.00 |
| missing-slow04 | rdp-1m | 33.20 | 33.20 | 0.00 |
| missing-slow04 | sed-1m | 33.20 | 33.20 | 0.00 |
| missing-slow04 | anchor-1.5m | 33.20 | 33.20 | 0.00 |
| missing-slow04 | rdp-2m | 33.20 | 33.20 | 0.00 |
| missing-slow04 | sed-2m | 33.20 | 33.20 | 0.00 |
| missing-slow04 | adaptive-12s | 33.20 | 33.20 | 0.00 |
| missing-slow04 | multiscale-0.01 | 33.20 | 33.20 | 0.00 |
| micro-shuttle05 | raw | 20.00 | 20.00 | 0.00 |
| micro-shuttle05 | temporal-3s | 20.00 | 3.58 | -16.42 |
| micro-shuttle05 | temporal-5s | 20.00 | 2.38 | -17.62 |
| micro-shuttle05 | rdp-1m | 20.00 | 0.00 | -20.00 |
| micro-shuttle05 | sed-1m | 20.00 | 0.00 | -20.00 |
| micro-shuttle05 | anchor-1.5m | 20.00 | 0.00 | -20.00 |
| micro-shuttle05 | rdp-2m | 20.00 | 0.00 | -20.00 |
| micro-shuttle05 | sed-2m | 20.00 | 0.00 | -20.00 |
| micro-shuttle05 | adaptive-12s | 20.00 | 2.00 | -18.00 |
| micro-shuttle05 | multiscale-0.01 | 20.00 | 0.00 | -20.00 |
