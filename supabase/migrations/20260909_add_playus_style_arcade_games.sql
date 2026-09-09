-- Retos diarios: nueva tanda de microjuegos estilo Playus.
-- Los minijuegos futboleros experimentales quedan desactivados; se conserva football-trivia.

update public.game_definitions
set active = case when id = 'football-trivia' then true else false end
where id in ('keep-up','penalties','goalkeeper','top-bins','var-offside','spot-ball','perfect-pass','free-kick','football-trivia');

insert into public.game_definitions (id,name,description,category,scoring_direction,unit,default_attempts,config,active,sort_order)
values
  ('higher-lower','Higher or Lower','Decide si el siguiente número será mayor o menor. Diez rondas rápidas.','logic','higher','correct',2,'{"rounds":10,"min_value":1,"max_value":99,"round_timeout_ms":3500}'::jsonb,true,90),
  ('cups','Cups','Sigue la bola mientras se mezclan los vasos y elige dónde está escondida.','memory','higher','correct',2,'{"rounds":6,"cups":3,"base_shuffle_ms":2400,"min_shuffle_ms":1100}'::jsonb,true,100),
  ('memory-cards','Memory Cards','Encuentra las ocho parejas lo más rápido posible.','memory','lower','time_ms',2,'{"pairs":8,"timeout_ms":30000,"max_score":60000}'::jsonb,true,110),
  ('tower-stack','Tower Stack','Deja caer cada bloque sobre el anterior y construye la torre más alta posible.','precision','higher','level',2,'{"max_level":25,"start_speed":0.55,"speed_step":0.035}'::jsonb,true,120),
  ('zig-zag','Zig Zag','Cambia de dirección con cada toque y mantente dentro del camino.','arcade','higher','points',2,'{"max_score":40,"step_ms":150,"speed_step":0.9}'::jsonb,true,130),
  ('lane-rush','Lane Rush','Cambia de carril para esquivar obstáculos cada vez más rápidos.','arcade','higher','points',2,'{"lanes":3,"max_score":40,"start_interval_ms":900,"min_interval_ms":360}'::jsonb,true,140)
on conflict (id) do update set
  name=excluded.name,description=excluded.description,category=excluded.category,
  scoring_direction=excluded.scoring_direction,unit=excluded.unit,
  default_attempts=excluded.default_attempts,config=excluded.config,
  active=excluded.active,sort_order=excluded.sort_order,updated_at=now();

create or replace function public.finish_arcade_game_attempt(
  p_attempt_id uuid,p_score double precision,p_duration_ms integer,p_metadata jsonb default '{}'::jsonb
)
returns table(status text,score double precision,attempts_remaining integer,best_score double precision)
language plpgsql security definer set search_path=public as $$
declare
  v_player_id bigint;v_attempt public.game_attempts%rowtype;v_game_id text;v_direction text;v_config jsonb;
  v_max_attempts integer;v_server_elapsed integer;v_valid boolean:=true;v_remaining integer;v_best double precision;
  v_expected double precision;v_value integer;v_completed boolean;
begin
  select p.player_id into v_player_id from public.profiles p where p.id=auth.uid();
  if v_player_id is null then raise exception 'Necesitas una cuenta vinculada a un jugador'; end if;
  select * into v_attempt from public.game_attempts where id=p_attempt_id and player_id=v_player_id for update;
  if v_attempt.id is null then raise exception 'Intento no encontrado'; end if;
  if v_attempt.status<>'started' then raise exception 'Este intento ya está cerrado'; end if;
  select dc.game_id,gd.scoring_direction,(gd.config||dc.config),dc.max_attempts into v_game_id,v_direction,v_config,v_max_attempts
  from public.daily_challenges dc join public.game_definitions gd on gd.id=dc.game_id where dc.id=v_attempt.challenge_id;
  if v_game_id not in ('higher-lower','cups','memory-cards','tower-stack','zig-zag','lane-rush') then raise exception 'Este intento no pertenece a un juego arcade'; end if;
  if p_duration_ms is null or p_duration_ms<0 or p_duration_ms>120000 then v_valid:=false; end if;
  if p_score is null or p_score::text in ('NaN','Infinity','-Infinity') then v_valid:=false; end if;
  v_server_elapsed:=floor(extract(epoch from(now()-v_attempt.started_at))*1000)::integer;
  if p_duration_ms>v_server_elapsed+1500 then v_valid:=false; end if;
  if v_game_id='higher-lower' then
    v_value:=coalesce((p_metadata->>'correct')::integer,-1);v_expected:=v_value;
    if v_value<0 or v_value>coalesce((v_config->>'rounds')::integer,10) or abs(p_score-v_expected)>0.1 then v_valid:=false; end if;
  elsif v_game_id='cups' then
    v_value:=coalesce((p_metadata->>'correct')::integer,-1);v_expected:=v_value;
    if v_value<0 or v_value>coalesce((v_config->>'rounds')::integer,6) or abs(p_score-v_expected)>0.1 then v_valid:=false; end if;
  elsif v_game_id='memory-cards' then
    v_value:=coalesce((p_metadata->>'matches')::integer,-1);v_completed:=coalesce((p_metadata->>'completed')::boolean,false);
    if v_value<0 or v_value>coalesce((v_config->>'pairs')::integer,8) then v_valid:=false; end if;
    if v_completed then
      if v_value<>coalesce((v_config->>'pairs')::integer,8) or p_duration_ms<2500 or p_duration_ms>coalesce((v_config->>'timeout_ms')::integer,30000)+1500 then v_valid:=false; end if;
      v_expected:=p_duration_ms;
    else v_expected:=coalesce((v_config->>'max_score')::integer,60000)-(v_value*1000); end if;
    if abs(p_score-v_expected)>3 then v_valid:=false; end if;
  elsif v_game_id='tower-stack' then
    v_value:=coalesce((p_metadata->>'level')::integer,-1);v_expected:=v_value;
    if v_value<0 or v_value>coalesce((v_config->>'max_level')::integer,25) or abs(p_score-v_expected)>0.1 then v_valid:=false; end if;
  elsif v_game_id='zig-zag' then
    v_value:=coalesce((p_metadata->>'points')::integer,-1);v_expected:=v_value;
    if v_value<0 or v_value>coalesce((v_config->>'max_score')::integer,40) or abs(p_score-v_expected)>0.1 then v_valid:=false; end if;
  elsif v_game_id='lane-rush' then
    v_value:=coalesce((p_metadata->>'points')::integer,-1);v_expected:=v_value;
    if v_value<0 or v_value>coalesce((v_config->>'max_score')::integer,40) or abs(p_score-v_expected)>0.1 then v_valid:=false; end if;
  end if;
  update public.game_attempts set status=case when v_valid then 'completed' else 'invalid' end,completed_at=now(),score=case when v_valid then p_score else null end,duration_ms=p_duration_ms,metadata=coalesce(p_metadata,'{}'::jsonb) where id=p_attempt_id;
  select greatest(v_max_attempts-count(*),0)::integer into v_remaining from public.game_attempts where challenge_id=v_attempt.challenge_id and player_id=v_player_id;
  select case when v_direction='lower' then min(ga.score) else max(ga.score) end into v_best from public.game_attempts ga where ga.challenge_id=v_attempt.challenge_id and ga.player_id=v_player_id and ga.status='completed';
  return query select case when v_valid then 'completed' else 'invalid' end,case when v_valid then p_score else null end,v_remaining,v_best;
end;
$$;
revoke all on function public.finish_arcade_game_attempt(uuid,double precision,integer,jsonb) from public,anon;
grant execute on function public.finish_arcade_game_attempt(uuid,double precision,integer,jsonb) to authenticated;
