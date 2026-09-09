(() => {
  'use strict';

  window.PatxGameRegistry.register('memory-cards', ({ container, config = {}, seed = 1, onFinish }) => {
    const pairs=Math.min(Number(config.pairs||12),12);
    const timeoutMs=Number(config.timeout_ms||90000);
    const maxScore=Number(config.max_score||120000);
    const source='Odio Eterno al Fútbol Moderno · Álbum Vintage';
    const footballCards=[
      ['Abelardo','https://odioeternoalfutbolmoderno.es/wp-content/uploads/2023/12/Abelardo.jpeg'],
      ['Júlio César','https://odioeternoalfutbolmoderno.es/wp-content/uploads/2023/12/Julio-Cesar.jpeg'],
      ['Geremi','https://odioeternoalfutbolmoderno.es/wp-content/uploads/2023/11/Geremi.jpeg'],
      ['Canito','https://odioeternoalfutbolmoderno.es/wp-content/uploads/2023/11/Canito.jpeg'],
      ['Jesús Castro','https://odioeternoalfutbolmoderno.es/wp-content/uploads/2023/10/Jesus-Castro.png'],
      ['Adelardo','https://odioeternoalfutbolmoderno.es/wp-content/uploads/2023/10/Adelardo.png'],
      ['Chino Losada','https://odioeternoalfutbolmoderno.es/wp-content/uploads/2023/10/Chino-Losada.jpeg'],
      ['Rufete','https://odioeternoalfutbolmoderno.es/wp-content/uploads/2022/10/Rufete.jpeg'],
      ['Tente Sánchez','https://odioeternoalfutbolmoderno.es/wp-content/uploads/2021/09/Tente-Sanchez.jpg'],
      ['Walid Regragui','https://odioeternoalfutbolmoderno.es/wp-content/uploads/2023/11/Walid-Regragui.jpeg'],
      ['Juan Sánchez','https://odioeternoalfutbolmoderno.es/wp-content/uploads/2023/11/Juan-Sanchez.jpeg'],
      ['Avelino Riopedre','https://odioeternoalfutbolmoderno.es/wp-content/uploads/2023/10/Avelino-Riopedre.jpeg']
    ].slice(0,pairs);

    let state=Number(seed)||1,startedAt=0,finished=false,matches=0,lock=false,first=null,second=null,raf=0;
    function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}
    const deck=[];for(let i=0;i<pairs;i++)deck.push(i,i);
    for(let i=deck.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}

    function cardFace(v){
      const [name,url]=footballCards[v]||[`Cromo ${v+1}`,''];
      return `<span class="card-face vintage-card-face"><img src="${url}" alt="${name}" loading="eager" referrerpolicy="no-referrer" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="vintage-card-fallback" hidden>${name}</span></span>`;
    }

    container.innerHTML=`
      <div class="game-surface cards-surface football-memory-surface">
        <div class="game-kicker">MEMORY CARDS</div>
        <div class="memory-cards-head"><div class="round-counter" data-time>${(timeoutMs/1000).toFixed(0)} s</div><div class="round-counter" data-matches>0 / ${pairs} parejas</div></div>
        <div class="cards-grid football-cards-grid" data-grid>${deck.map((v,i)=>`<button type="button" class="memory-card football-memory-card" data-card="${i}" data-value="${v}" aria-label="Cromo ${i+1}"><span class="card-back football-card-back"><span>⚽</span><b>PATX</b></span>${cardFace(v)}</button>`).join('')}</div>
        <div class="game-help" data-help>Encuentra las ${pairs} parejas de cromos.</div>
        <div class="vintage-source">Cromos: ${source}</div>
      </div>`;

    const grid=container.querySelector('[data-grid]'),cards=[...container.querySelectorAll('[data-card]')],timeEl=container.querySelector('[data-time]'),matchesEl=container.querySelector('[data-matches]'),helpEl=container.querySelector('[data-help]');
    const cols=pairs>=11?6:pairs>=8?4:3;grid.style.setProperty('--memory-cols',String(cols));

    function end(completed){
      if(finished)return;finished=true;cancelAnimationFrame(raf);cards.forEach(c=>c.disabled=true);
      const duration=Math.min(timeoutMs,performance.now()-startedAt);
      const score=completed?duration:maxScore-(matches*2500);
      helpEl.textContent=completed?`¡${pairs} parejas completadas!`:`Tiempo: ${matches} / ${pairs} parejas.`;
      onFinish({score,duration,metadata:{matches,completed,pairs,source:'odio-eterno-al-futbol-moderno'}});
    }
    function tick(now){
      if(finished)return;const elapsed=now-startedAt,remain=Math.max(0,timeoutMs-elapsed);timeEl.textContent=`${(remain/1000).toFixed(1)} s`;if(remain<=0)return end(false);raf=requestAnimationFrame(tick);
    }
    function hidePair(){[first,second].forEach(c=>c?.classList.remove('is-open'));first=second=null;lock=false;}
    function press(e){
      const card=e.target.closest('[data-card]');if(!card||finished||lock||card.classList.contains('is-open')||card.classList.contains('is-match'))return;
      e.preventDefault();card.classList.add('is-open');
      if(!first){first=card;return;}
      second=card;lock=true;
      if(first.dataset.value===second.dataset.value){
        first.classList.add('is-match');second.classList.add('is-match');first=second=null;lock=false;matches++;matchesEl.textContent=`${matches} / ${pairs} parejas`;helpEl.textContent='¡Pareja!';if(matches>=pairs)setTimeout(()=>end(true),240);
      }else{helpEl.textContent='No coinciden.';setTimeout(hidePair,650);}
    }
    container.addEventListener('pointerdown',press,{passive:false});
    return{start(){startedAt=performance.now();raf=requestAnimationFrame(tick);},destroy(){finished=true;cancelAnimationFrame(raf);container.removeEventListener('pointerdown',press);}};
  });
})();