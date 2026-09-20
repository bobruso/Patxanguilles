import{mountPlayerGpsPanel as baseMount,playerGpsPanelHtml as baseHtml,redrawPlayerGpsPanel}from'./player-gps-panel.js?v=229-base';
export{redrawPlayerGpsPanel};
const OLD='mejor fuente disponible en el FIT',NEW='pico máximo validado de la serie de velocidad';
export function playerGpsPanelHtml(...args){return baseHtml(...args).replace(OLD,NEW).replace('media máxima sostenida durante 3 s',NEW)}
export function mountPlayerGpsPanel(container,analysis,options={}){const panel=baseMount(container,analysis,options);if(panel){for(const stat of panel.querySelectorAll('.patx-gps-stat')){if(stat.querySelector('span')?.textContent?.trim()==='Velocidad máxima'){const small=stat.querySelector('small');if(small)small.textContent=NEW;break}}}return panel}
