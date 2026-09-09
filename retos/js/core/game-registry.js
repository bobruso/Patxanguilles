(() => {
  'use strict';

  const factories = new Map();

  function register(id, factory) {
    if (!id || typeof factory !== 'function') throw new Error('Registro de juego no válido');
    factories.set(String(id), factory);
  }

  function normalizeOptions(id, options = {}) {
    const out={...options,config:{...(options.config||{})}};
    const c=out.config;
    const atLeast=(key,value)=>{c[key]=Math.max(value,Number(c[key])||0);};
    if(id==='grid-memory'){atLeast('max_level',20);atLeast('max_grid_size',8);}
    if(id==='sequence'){atLeast('max_level',20);atLeast('max_grid_size',5);}
    if(id==='memory-cards'){atLeast('pairs',12);atLeast('timeout_ms',90000);atLeast('max_score',120000);}
    if(id==='tower-stack')atLeast('max_level',50);
    if(id==='zig-zag')atLeast('max_score',120);
    if(id==='lane-rush'){atLeast('max_score',60);atLeast('start_interval_ms',950);c.min_interval_ms=300;}
    if(id==='drop-zone')atLeast('max_level',15);
    if(id==='shape-gate'){atLeast('rounds',14);atLeast('round_timeout_ms',2500);atLeast('max_score',14000);}
    if(id==='odd-one'){atLeast('rounds',15);atLeast('round_timeout_ms',3000);atLeast('max_score',15000);}
    if(id==='balance'){atLeast('duration_ms',30000);atLeast('max_score',30000);atLeast('level_ms',4000);}
    if(id==='target-lock'){atLeast('rounds',12);atLeast('max_score',12000);}
    if(id==='catch-drop'){atLeast('duration_ms',45000);atLeast('max_score',30);}
    if(id==='football-trivia'){
      c.questions=10;
      c.question_timeout_ms=15000;
      c.max_score=10000;
      c.points_max_per_correct=1000;
      c.points_min_per_correct=250;
      delete c.start_timeout_ms;
      delete c.min_timeout_ms;
      delete c.timeout_decrement_ms;
    }
    return out;
  }

  function create(id, options) {
    const key=String(id);
    const factory = factories.get(key);
    if (!factory) throw new Error(`Juego no disponible: ${id}`);
    const game = factory(normalizeOptions(key,options||{}));
    if (!game || typeof game.start !== 'function' || typeof game.destroy !== 'function') {
      throw new Error(`Contrato de juego no válido: ${id}`);
    }
    return game;
  }

  function has(id) {
    return factories.has(String(id));
  }

  window.PatxGameRegistry = Object.freeze({ register, create, has });
})();