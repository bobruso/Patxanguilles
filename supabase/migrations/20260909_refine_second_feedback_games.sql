-- Segunda ronda de feedback de minijuegos.
-- Desactiva los cuatro juegos descartados y alinea las configuraciones
-- de los ocho juegos retocados con sus nuevas mecánicas.

update public.game_definitions
set active=false
where id in ('orbit-pins','rhythm-tap','flash-count','swipe-sort');

update public.game_definitions
set description='Regatea con el balón y esquiva entradas cada vez más rápidas.',
    config=config||'{"lanes":3,"max_score":60,"start_interval_ms":950,"min_interval_ms":300}'::jsonb
where id='lane-rush';

update public.game_definitions
set description='Chuta cuando la portería móvil quede alineada; cada nivel es más rápido y estrecho.',
    config=config||'{"max_level":15}'::jsonb
where id='drop-zone';

update public.game_definitions
set description='Encuentra la figura exactamente igual entre polígonos cada vez más complejos.',
    config=config||'{"rounds":14,"round_timeout_ms":2500,"max_score":14000}'::jsonb
where id='shape-gate';

update public.game_definitions
set description='Guía la serpiente con swipe, pad, flechas o WASD.',
    config=config||'{"duration_ms":20000,"max_score":50}'::jsonb
where id='snake-sprint';

update public.game_definitions
set description='Encuentra la diferencia mínima en cuadrículas cada vez mayores.',
    config=config||'{"rounds":15,"round_timeout_ms":3000,"max_score":15000}'::jsonb
where id='odd-one';

update public.game_definitions
set description='Mantén la bola sobre un balancín que se va haciendo más pequeño.',
    unit='time_ms',
    scoring_direction='higher',
    config=config||'{"duration_ms":30000,"max_score":30000,"level_ms":4000}'::jsonb
where id='balance';

update public.game_definitions
set description='Haz coincidir el anillo: cada ronda acelera y reduce el margen válido.',
    config=config||'{"rounds":12,"max_score":12000}'::jsonb
where id='target-lock';

update public.game_definitions
set description='Arkanoid con balón de fútbol: devuelve la pelota y rompe todos los bloques.',
    config=config||'{"duration_ms":45000,"max_score":30}'::jsonb
where id='catch-drop';