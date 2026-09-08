(() => {
  'use strict';

  const factories = new Map();

  function register(id, factory) {
    if (!id || typeof factory !== 'function') throw new Error('Registro de juego no válido');
    factories.set(String(id), factory);
  }

  function create(id, options) {
    const factory = factories.get(String(id));
    if (!factory) throw new Error(`Juego no disponible: ${id}`);
    const game = factory(options || {});
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