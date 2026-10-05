import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const here=path.dirname(fileURLToPath(import.meta.url));
const code=readFileSync(path.join(here,'..','patx-v236-result-team-emojis.js'),'utf8');
const listeners={};
const history={querySelector(){return null}};
const document={
  readyState:'loading',
  addEventListener(name,fn){listeners[name]=fn},
  querySelector(sel){return sel==='#changeHistory .history-wrap'?history:null;}
};
const window={
  resultCallupTeamKey(line){
    const source=String(line||'').trim();
    if(/^rojos?$/i.test(source))return 'red';
    if(/^negros?$/i.test(source))return 'black';
    return null;
  }
};
const context={window,document,setTimeout(fn){fn();},console};
vm.createContext(context);
vm.runInContext(code,context);
listeners.DOMContentLoaded();

const key=window.resultCallupTeamKey;
for(const value of ['🔴🔴🔴','🟥 🟥','❤️❤️','♥️♥️','♦️♦️','🚩🚩','❗❗','🔥🔥']){
  assert.equal(key(value),'red',`${value} debe ser rojo`);
}
for(const value of ['⚫️⚫️⚫️','⬛⬛','🖤🖤','♠️♠️','♣️♣️','🏴🏴','🎱🎱','💣💣']){
  assert.equal(key(value),'black',`${value} debe ser negro`);
}
assert.equal(key('Rojos'),'red','conserva encabezados por texto');
assert.equal(key('Negros'),'black','conserva encabezados por texto');
assert.equal(key('🔴⚫'),null,'una mezcla de colores no se asigna automáticamente');
assert.equal(key('F7 Santa Ana 20:30'),null,'la cabecera del partido no es equipo');
assert.equal(key('Héctor'),null,'un nombre no es encabezado');

console.log('v236 result team emojis: passed');
