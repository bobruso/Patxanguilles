"""Optional static research figure. Reads aggregate outputs only; never reads GPS coordinates."""
import csv
import json
from pathlib import Path
import sys
import os
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / '.python-libs'))
os.environ.setdefault('MPLCONFIGDIR', str(ROOT / '.mpl-cache'))
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parent
RESULTS = ROOT / 'results'
def read(name):
    with (RESULTS / name).open(encoding='utf-8-sig', newline='') as file:
        return list(csv.DictReader(file))
paired = read('paired.csv')
synthetic = read('synthetic-cells.csv')
sampling = read('coros-downsampling.csv')
plt.rcParams.update({'font.size': 10, 'axes.spines.top': False, 'axes.spines.right': False})
fig, axes = plt.subplots(2, 2, figsize=(13, 9), constrained_layout=True)
ax = axes[0, 0]
scales = [r for r in paired if r['family'] == 'rdp' and r['window'] == 'common']
for device, color in [('corosM', '#27648a'), ('garminM', '#be622a')]:
    ax.plot([float(r['parameter']) for r in scales], [float(r[device]) for r in scales], 'o-', label=device[:-1].upper(), color=color)
ax.set(title='Longitud multiescala: ventana común', xlabel='Tolerancia RDP (m)', ylabel='Distancia (m)')
ax.legend()
ax = axes[0, 1]
ids = ['raw', 'temporal-3s', 'temporal-5s', 'rdp-1m', 'sed-1m', 'anchor-1.5m']
rows = [next(r for r in synthetic if r['split']=='holdout' and r['sigma']=='0' and r['sampling']=='dense' and r['scenario']=='shuttle5' and r['method']==m) for m in ids]
ax.bar(range(len(rows)), [float(r['distanceM']) for r in rows], color='#555555')
ax.axhline(100, color='#be622a', linestyle='--', label='Verdad: 100 m')
ax.set_xticks(range(len(rows)), ids, rotation=25, ha='right')
ax.set(title='Ida y vuelta de 5 m, sin ruido, 1 Hz', ylabel='Distancia (m)')
ax.legend()
ax = axes[1, 0]
for m in ['raw', 'temporal-3s', 'rdp-1m', 'sed-1m']:
    rows = [r for r in sampling if r['method']==m and r['phaseSec']=='0' and r['sampling'] in ['original','every2','every3','every4','every5']]
    ax.plot([1,2,3,4,5], [float(r['deltaPct']) for r in rows], 'o-', label=m)
ax.set(title='COROS: pérdida al reducir muestreo', xlabel='Intervalo nominal (s)', ylabel='Cambio respecto al original (%)')
ax.legend()
ax = axes[1, 1]
for window, label in [('common','Misma ventana'), ('common-observed','Misma ventana y cobertura')]:
    rows=[next(r for r in paired if r['window']==window and r['method']==f'temporal-{w}s') for w in range(1,7)]
    ax.plot(range(1,7), [float(r['relativeToCorosPct']) for r in rows], 'o-', label=label)
ax.axhline(0, color='#999999', linewidth=1)
ax.set(title='La coincidencia depende de la cobertura', xlabel='Anchura total del promedio temporal (s)', ylabel='(Garmin − COROS) / COROS (%)')
ax.legend()
fig.savefig(RESULTS / 'research-overview.png', dpi=160)
plt.close(fig)

# Human-readable extra slices separate stress conditions from less noisy conditions.
methods=['raw','temporal-3s','temporal-5s','rdp-1m','rdp-2m','sed-1m','sed-2m','anchor-1.5m','adaptive-12s','multiscale-0.01']
lines=['# Cortes de diagnóstico sintético', '', 'Errores calculados con las semillas reservadas. No representan la exactitud del partido real.', '',
       '## Ruido moderado y correlacionado', '', 'σ = 0.5 o 1 m; τ = 3 o 15 s; todos los muestreos; excluye el caso adversarial de 0.5 m. Igual peso por celda.', '',
       '| Método | MAPE movimiento % | Estacionario m/min |', '|---|---:|---:|']
for m in methods:
    rows=[r for r in synthetic if r['split']=='holdout' and r['method']==m and r['sigma'] in ['0.5','1'] and r['tau'] in ['3','15'] and r['scenario']!='micro-shuttle05']
    moving=[float(r['mapePct']) for r in rows if float(r['truthM'])>0]
    still=[float(r['stationaryMPerMin']) for r in rows if r['scenario']=='stationary']
    lines.append(f'| {m} | {sum(moving)/len(moving):.2f} | {sum(still)/len(still):.2f} |')
lines += ['', '## Sin ruido, muestreo denso', '', '| Escenario | Método | Verdad m | Medido m | Sesgo m |', '|---|---|---:|---:|---:|']
for r in synthetic:
    if r['split']=='holdout' and r['sigma']=='0' and r['sampling']=='dense' and r['method'] in methods:
        lines.append(f"| {r['scenario']} | {r['method']} | {float(r['truthM']):.2f} | {float(r['distanceM']):.2f} | {float(r['biasM']):.2f} |")
(ROOT/'SYNTHETIC-SLICES.md').write_text('\n'.join(lines)+'\n', encoding='utf-8')
print(RESULTS / 'research-overview.png')
