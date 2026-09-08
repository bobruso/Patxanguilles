(() => {
  'use strict';

  window.PatxGameRegistry.register('memory-cards', ({ container, config = {}, seed = 1, onFinish }) => {
    const pairs=Number(config.pairs||8);
    const timeoutMs=Number(config.timeout_ms||30000);
    const maxScore=Number(config.max_score||60000);
    let state=Number(seed)||1;
    let startedAt=0,finished=false,matches=0,lock=false,first=null,second=null,raf=0;

    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}
    const deck=[];
    for(let i=0;i<pairs;i++){deck.push(i,i);}
    for(let i=deck.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}

    container.innerHTML=`
      <div class="game-surface cards-surface">
        <div class="game-kicker">MEMORY CARDS</div>
        <div class="round-counter" data-time>30.0 s</div>
        <div class="cards-grid">
          ${deck.map((v,i)=>`<button type="button" class="memory-card" data-card="${i}" data-value="${v}" aria-label="Carta ${i+1}"><span class="card-back">?</span><span class="card-face">${String.fromCharCode(65+v)}</span></button>`).join('')}
        </div>
        <div class="game-help" data-help>Encuentra las ${pairs} parejas.</div>
      </div>`;

    const cards=[...container.querySelectorAll('[data-card]')];
    const timeEl=container.querySelector('[data-time]');
    const helpEl=container.querySelector('[data-help]');

    function end(completed){
      if(finished)return;
      finished=true;cancelAnimationFrame(raf);
      cards.forEach(c=>c.disabled=true);
      const duration=Math.min(timeoutMs,performance.now()-startedAt);
      const score=completed?duration:maxScore-(matches*1000);
      helpEl.textContent=completed?'¡Todas las parejas!':'Tiempo agotado';
      onFinish({score,duration,metadata:{matches,completed}});
    }

    function tick(now){
      if(finished)return;
      const elapsed=now-startedAt;
      const remain=Math.max(0,timeoutMs-elapsed);
      timeEl.textContent=`${(remain/1000).toFixed(1)} s`;
      if(remain<=0)return end(false);
      raf=requestAnimationFrame(tick);
    }

    function hidePair(){
      [first,second].forEach(c=>c?.classList.remove('is-open'));
      first=second=null;lock=false;
    }

    function press(e){
      const card=e.target.closest('[data-card]');
      if(!card||finished||lock||card.classList.contains('is-open')||card.classList.contains('is-match'))return;
      card.classList.add('is-open');
      if(!first){first=card;return;}
      second=card;lock=true;
      if(first.dataset.value===second.dataset.value){
        first.classList.add('is-match');second.classList.add('is-match');
        first=second=null;lock=false;matches++;
        helpEl.textContent=`${matches} / ${pairs} parejas`;
        if(matches>=pairs)setTimeout(()=>end(true),180);
      }else{
        setTimeout(hidePair,520);
      }
    }

    container.addEventListener('pointerdown',press);
    return{start(){startedAt=performance.now();raf=requestAnimationFrame(tick);},destroy(){finished=true;cancelAnimationFrame(raf);container.removeEventListener('pointerdown',press);}};
  });
})();