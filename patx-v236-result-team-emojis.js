(()=>{
  'use strict';

  const RED_MARKS=[
    '🔴','🟥','❤','♥','❣','💔','💢','💥','🩸','♦','🔺','🔻','🛑','⛔','❌','⭕','🚩','❗','‼','⁉','💯','🔥','🌹','🍎','🍓','🍒','🌶'
  ];
  const BLACK_MARKS=[
    '⚫','⬛','🖤','♠','♣','▪','◼','◾','🏴','⚑','🎱','💣','🕳','🕶','🎩'
  ];

  function emojiOnlyTeam(line){
    const source=String(line||'')
      .replace(/[\u200B-\u200D\uFEFF\uFE0E\uFE0F]/g,'')
      .replace(/\s+/g,'');
    if(!source)return null;

    const consume=(marks,team)=>{
      let rest=source,found=false;
      for(const mark of marks){
        if(rest.includes(mark))found=true;
        rest=rest.split(mark).join('');
      }
      return found&&!rest?team:null;
    };

    return consume(RED_MARKS,'red')||consume(BLACK_MARKS,'black');
  }

  function installTeamHeaderPatch(){
    if(window.__patxResultTeamEmojiV236)return;
    const original=window.resultCallupTeamKey;
    if(typeof original!=='function')return;

    window.__patxResultTeamEmojiV236=true;
    window.resultCallupTeamKey=function(line){
      return emojiOnlyTeam(line)||original(line);
    };
  }

  function injectHistoryV236(){
    const history=document.querySelector('#changeHistory .history-wrap');
    const header=history?.querySelector('.history-header');
    if(!history||!header||history.querySelector('[data-history-version="236"]'))return;

    const versionLabel=header.querySelector('.history-version');
    if(versionLabel)versionLabel.textContent='VERSIÓN v236';

    header.insertAdjacentHTML('afterend',`<section class="history-change-section" data-history-version="236"><div class="history-section-number">236</div><div class="history-section-content"><h2>Convocatorias por colores al añadir resultados</h2><ul><li>Los bloques de Rojos y Negros también se reconocen cuando el encabezado contiene únicamente emojis o símbolos del color del equipo.</li><li>Se admiten, entre otros, círculos, cuadrados, corazones, palos de cartas, banderas y otros marcadores habituales rojos o negros.</li><li>La detección por texto «Rojos/Negros» sigue funcionando igual y el OCR de convocatorias permanece separado.</li></ul></div></section>`);
  }

  function boot(){
    installTeamHeaderPatch();
    injectHistoryV236();
    setTimeout(injectHistoryV236,0);
  }

  window.PatxResultTeamEmojiV236={teamKey:emojiOnlyTeam,install:installTeamHeaderPatch};

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
