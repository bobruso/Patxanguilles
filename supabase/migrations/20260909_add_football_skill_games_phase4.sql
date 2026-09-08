-- Phase 4: football memory / drawn-path skill games.

insert into public.game_definitions(id,name,description,category,scoring_direction,unit,default_attempts,config,active,sort_order)
values
('spot-ball','Spot the Ball','Memoriza dónde estaba el balón y señala su posición cuando desaparezca.','football','lower','error',2,'{"reveal_ms":1800,"max_error":1000}'::jsonb,true,150),
('perfect-pass','Pase perfecto','Dibuja la trayectoria del pase hasta tu compañero evitando a los defensas.','football','higher','points',2,'{"rounds":3,"max_score":3000}'::jsonb,true,160),
('free-kick','Falta directa','Traza el golpeo de la falta, supera la barrera y busca la escuadra.','football','higher','points',2,'{"shots":3,"max_score":3000}'::jsonb,true,170)
on conflict(id) do update set name=excluded.name,description=excluded.description,category=excluded.category,scoring_direction=excluded.scoring_direction,unit=excluded.unit,default_attempts=excluded.default_attempts,config=excluded.config,active=excluded.active,sort_order=excluded.sort_order,updated_at=now();

create or replace function public.finish_football_skill_attempt(p_attempt_id uuid,p_score double precision,p_duration_ms integer,p_metadata jsonb default '{}'::jsonb)
returns table(status text,score double precision,attempts_remaining integer,best_score double precision)
language plpgsql security definer set search_path=public as $$
declare
  v_player_id bigint;v_attempt public.game_attempts%rowtype;v_game_id text;v_direction text;v_config jsonb;v_max_attempts integer;v_server_elapsed integer;v_valid boolean:=true;v_remaining integer;v_best double precision;v_count integer;
begin
  select p.player_id into v_player_id from public.profiles p where p.id=auth.uid();
  if v_player_id is null then raise exception 'Necesitas una cuenta vinculada a un jugador'; end if;
  select * into v_attempt from public.game_attempts where id=p_attempt_id and player_id=v_player_id for update;
  if v_attempt.id is null then raise exception 'Intento no encontrado'; end if;
  if v_attempt.status<>'started' then raise exception 'Este intento ya está cerrado'; end if;
  select dc.game_id,gd.scoring_direction,(gd.config || dc.config),dc.max_attempts into v_game_id,v_direction,v_config,v_max_attempts from public.daily_challenges dc join public.game_definitions gd on gd.id=dc.game_id where dc.id=v_attempt.challenge_id;
  if v_game_id not in ('spot-ball','perfect-pass','free-kick') then raise exception 'Este intento no pertenece a un juego de habilidad compatible'; end if;
  if p_duration_ms is null or p_duration_ms<0 or p_duration_ms>60000 then v_valid:=false; end if;
  if p_score is null or p_score::text in ('NaN','Infinity','-Infinity') then v_valid:=false; end if;
  v_server_elapsed:=floor(extract(epoch from (now()-v_attempt.started_at))*1000)::integer;
  if p_duration_ms>v_server_elapsed+1500 then v_valid:=false; end if;
  if v_game_id='spot-ball' then
    if p_score<0 or p_score>coalesce((v_config->>'max_error')::integer,1000) then v_valid:=false; end if;
    if p_duration_ms<coalesce((v_config->>'reveal_ms')::integer,1800)-250 then v_valid:=false; end if;
  elsif v_game_id='perfect-pass' then
    v_count:=coalesce((p_metadata->>'rounds')::integer,-1);
    if v_count<>coalesce((v_config->>'rounds')::integer,3) then v_valid:=false; end if;
    if p_score<0 or p_score>coalesce((v_config->>'max_score')::integer,3000) or p_score<>floor(p_score) then v_valid:=false; end if;
  elsif v_game_id='free-kick' then
    v_count:=coalesce((p_metadata->>'shots')::integer,-1);
    if v_count<>coalesce((v_config->>'shots')::integer,3) then v_valid:=false; end if;
    if p_score<0 or p_score>coalesce((v_config->>'max_score')::integer,3000) or p_score<>floor(p_score) then v_valid:=false; end if;
  end if;
  update public.game_attempts set status=case when v_valid then 'completed' else 'invalid' end,completed_at=now(),score=case when v_valid then p_score else null end,duration_ms=p_duration_ms,metadata=coalesce(p_metadata,'{}'::jsonb) where id=p_attempt_id;
  select greatest(v_max_attempts-count(*),0)::integer into v_remaining from public.game_attempts where challenge_id=v_attempt.challenge_id and player_id=v_player_id;
  select case when v_direction='lower' then min(ga.score) else max(ga.score) end into v_best from public.game_attempts ga where ga.challenge_id=v_attempt.challenge_id and ga.player_id=v_player_id and ga.status='completed';
  return query select case when v_valid then 'completed' else 'invalid' end,case when v_valid then p_score else null end,v_remaining,v_best;
end; $$;
revoke all on function public.finish_football_skill_attempt(uuid,double precision,integer,jsonb) from public,anon;
grant execute on function public.finish_football_skill_attempt(uuid,double precision,integer,jsonb) to authenticated;
