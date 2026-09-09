(() => {
  'use strict';

  function rng(seed){
    let state=(Number(seed)||1)>>>0;
    return ()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};
  }

  window.PatxGameRegistry.register('reaction', ({ container, config = {}, seed = 1, onFinish }) => {
    const random=rng(seed);
    const minWait=Number(config.min_wait_ms||1600);
    const maxWait=Number(config.max_wait_ms||4200);
    const falseStartScore=Number(config.max_reaction_ms||2500);
    const waitMs=Math.round(minWait+random()*Math.max(0,maxWait-minWait));
    const x=18+random()*64;
    const y=23+random()*52;

    let state='ready',gameStart=0,goAt=0,timer=0,finished=false;

    container.innerHTML=`
      <div class="game-surface reaction-ball-surface" tabindex="0" aria-label="Juego de reacción con balón">
        <div class="game-kicker">REACCIÓN</div>
        <div class="reaction-ball-head">
          <div class="game-big" data-main>ESPERA</div>
          <div class="round-counter">1 TOQUE</div>
        </div>
        <div class="reaction-field" data-field>
          <div class="reaction-wait-mark" data-wait>NO TOQUES</div>
          <button type="button" class="reaction-football" data-reaction-ball aria-label="Toca el balón" hidden>⚽</button>
        </div>
        <div class="game-help" data-help>En cualquier momento aparecerá un balón. Tócalo lo más rápido posible.</div>
      </div>`;

    const surface=container.querySelector('.reaction-ball-surface');
    const field=container.querySelector('[data-field]');
    const main=container.querySelector('[data-main]');
    const help=container.querySelector('[data-help]');
    const wait=container.querySelector('[data-wait]');
    const ball=container.querySelector('[data-reaction-ball]');

    function finish(payload){
      if(finished)return;
      finished=true;clearTimeout(timer);state='finished';
      onFinish(payload);
    }

    function signalGo(){
      if(state!=='waiting')return;
      state='go';goAt=performance.now();
      surface.classList.add('reaction-ball-go');
      main.textContent='¡BALÓN!';
      wait.hidden=true;
      ball.hidden=false;
      ball.style.left=`${x}%`;ball.style.top=`${y}%`;
      help.textContent='¡Tócalo!';
    }

    function begin(){
      gameStart=performance.now();state='waiting';
      main.textContent='ESPERA';
      timer=setTimeout(signalGo,waitMs);
      surface.focus({preventScroll:true});
    }

    function falseStart(){
      if(state!=='waiting'||finished)return;
      const duration=performance.now()-gameStart;
      surface.classList.add('reaction-ball-false');
      main.textContent='¡ANTES!';
      wait.textContent='SALIDA FALSA';
      help.textContent='Has tocado antes de que apareciera el balón.';
      finish({score:falseStartScore,duration,metadata:{false_start:true,wait_ms:waitMs}});
    }

    function press(event){
      if(finished)return;
      if(state==='waiting'){
        event.preventDefault();
        falseStart();
        return;
      }
      if(state!=='go')return;
      const target=event.target.closest('[data-reaction-ball]');
      if(!target)return;
      event.preventDefault();
      const now=performance.now();
      const reactionMs=now-goAt;
      const duration=now-gameStart;
      target.classList.add('is-hit');
      main.textContent=`${Math.round(reactionMs)} ms`;
      help.textContent='Tiempo de reacción al balón.';
      finish({score:reactionMs,duration,metadata:{false_start:false,wait_ms:waitMs,reaction_ms:Math.round(reactionMs),target_x:Number(x.toFixed(2)),target_y:Number(y.toFixed(2))}});
    }

    field.addEventListener('pointerdown',press,{passive:false});
    surface.addEventListener('pointerdown',event=>{
      if(state==='waiting'&&!event.target.closest('[data-field]')) falseStart();
    });

    return{
      start:begin,
      destroy(){finished=true;clearTimeout(timer);field.removeEventListener('pointerdown',press);}
    };
  });
})();