(() => {
  'use strict';
  window.PatxGameRegistry.register('arrow-rush', ({container,config={},seed=1,onFinish}) => {
    const rounds=Number(config.rounds||16), timeoutMs=Number(config.round_timeout_ms||1400);
    const dirs=[['up','↑'],['right','→'],['down','↓'],['left','←']];
    let state=Number(seed)||1, round=0, correct=0, reactionSum=0, target=null, roundAt=0, startedAt=0, timer=0, finished=false;
    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}
    container.innerHTML=`<div class="game-surface arrow-surface"><div class="game-kicker">ARROW RUSH</div><div class="round-counter" data-round></div><div class="arrow-cue" data-cue>↑</div><div class="arrow-pad">${dirs.map(([k,s])=>`<button type="button" data-dir="${k}">${s}</button>`).join('')}</div><div class="game-help" data-help>Responde a la dirección correcta.</div><div class="hl-score" data-score>0 aciertos</div></div>`;
    const cue=container.querySelector('[data-cue]'),roundEl=container.querySelector('[data-round]'),help=container.querySelector('[data-help]'),scoreEl=container.querySelector('[data-score]');
    const buttons=[...container.querySelectorAll('[data-dir]')];
    function finish(){if(finished)return;finished=true;clearTimeout(timer);buttons.forEach(b=>b.disabled=true);const score=Math.max(correct*1000-Math.round(reactionSum),0);onFinish({score,duration:performance.now()-startedAt,metadata:{correct,reaction_sum_ms:Math.round(reactionSum),rounds}});}
    function next(){if(finished)return;if(round>=rounds)return finish();target=dirs[Math.floor(rnd()*dirs.length)];cue.textContent=target[1];roundEl.textContent=`Ronda ${round+1} / ${rounds}`;help.textContent='Pulsa la misma dirección';buttons.forEach(b=>b.disabled=false);roundAt=performance.now();clearTimeout(timer);timer=setTimeout(()=>resolve(null),timeoutMs);}
    function resolve(choice){if(finished||buttons.every(b=>b.disabled))return;clearTimeout(timer);buttons.forEach(b=>b.disabled=true);const rt=performance.now()-roundAt;if(choice===target[0]){correct++;reactionSum+=Math.min(rt,999);help.textContent='¡Bien!';}else help.textContent=choice===null?'Tiempo agotado':'Dirección incorrecta';scoreEl.textContent=`${correct} acierto${correct===1?'':'s'}`;round++;setTimeout(next,260);}
    function press(e){const b=e.target.closest('[data-dir]');if(b)resolve(b.dataset.dir);}
    container.addEventListener('pointerdown',press);
    return{start(){startedAt=performance.now();next();},destroy(){finished=true;clearTimeout(timer);container.removeEventListener('pointerdown',press);}};
  });
})();