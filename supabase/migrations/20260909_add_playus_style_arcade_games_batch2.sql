-- Second Playus-style batch. Six original microgame mechanics.

insert into public.game_definitions (id,name,description,category,scoring_direction,unit,default_attempts,config,active,sort_order)
values
  ('arrow-rush','Arrow Rush','Responde a la dirección correcta antes de que cambie la señal.','reflex','higher','points',2,'{"rounds":16,"round_timeout_ms":1400,"max_score":16000}'::jsonb,true,160),
  ('drop-zone','Drop Zone','Suelta la bola en el momento exacto para atravesar cada hueco.','precision','higher','level',2,'{"levels":10,"max_level":10}'::jsonb,true,170),
  ('orbit-pins','Orbit Pins','Lanza clavijas a un objetivo giratorio sin tocar las que ya están puestas.','precision','higher','pins',2,'{"pins":14,"max_score":14}'::jsonb,true,180),
  ('rhythm-tap','Rhythm Tap','Toca siguiendo el pulso con la mayor precisión posible.','timing','higher','points',2,'{"beats":12,"interval_ms":700,"max_score":12000}'::jsonb,true,190),
  ('shape-gate','Shape Gate','Elige rápidamente la figura que encaja en la puerta.','reflex','higher','points',2,'{"rounds":12,"round_timeout_ms":1800,"max_score":12000}'::jsonb,true,200),
  ('snake-sprint','Snake Sprint','Guía la serpiente, recoge puntos y evita chocar durante veinte segundos.','arcade','higher','points',2,'{"duration_ms":20000,"max_score":50}'::jsonb,true,210)
on conflict (id) do update set
  name=excluded.name,description=excluded.description,category=excluded.category,
  scoring_direction=excluded.scoring_direction,unit=excluded.unit,
  default_attempts=excluded.default_attempts,config=excluded.config,
  active=excluded.active,sort_order=excluded.sort_order,updated_at=now();

-- finish_arcade_game_attempt was extended in the applied Supabase migration
-- to validate these IDs: arrow-rush, drop-zone, orbit-pins, rhythm-tap,
-- shape-gate and snake-sprint, while retaining the previous arcade games.
-- The live function checks auth.uid(), player ownership, attempt status,
-- elapsed time, score ranges and game-specific metadata consistency.