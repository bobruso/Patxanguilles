-- Phase 3: football-themed daily minigames.

insert into public.game_definitions(id,name,description,category,scoring_direction,unit,default_attempts,config,active,sort_order)
values
('keep-up','Que no caiga','Mantén el balón en el aire tocándolo antes de que caiga.','football','higher','touches',2,'{"max_touches":200,"max_duration_ms":30000,"gravity":1650,"impulse":-620}'::jsonb,true,90),
('penalties','Penaltis','Cinco lanzamientos. Apunta dentro de la portería y busca la máxima precisión.','football','higher','points',2,'{"shots":5,"max_score":5000}'::jsonb,true,100),
('goalkeeper','Portero','Lee el disparo y lánzate a la zona correcta antes de que llegue el balón.','football','higher','saves',2,'{"shots":5,"max_score":5,"reaction_ms":850}'::jsonb,true,110),
('top-bins','A la escuadra','Cinco tiros a objetivos pequeños dentro de la portería. Cuanto más preciso, más puntos.','football','higher','points',2,'{"shots":5,"max_score":5000}'::jsonb,true,120),
('var-offside','VAR','Decide rápidamente si la jugada es fuera de juego o posición legal.','football','higher','correct',2,'{"rounds":8,"max_score":8,"round_timeout_ms":4500}'::jsonb,true,130)
on conflict(id) do update set
 name=excluded.name,description=excluded.description,category=excluded.category,
 scoring_direction=excluded.scoring_direction,unit=excluded.unit,default_attempts=excluded.default_attempts,
 config=excluded.config,active=excluded.active,sort_order=excluded.sort_order,updated_at=now();

create or replace function public.finish_daily_game_attempt(
  p_attempt_id uuid,
  p_score double precision,
  p_duration_ms integer,
  p_metadata jsonb default '{}'::jsonb
)
returns table(status text, score double precision, attempts_remaining integer, best_score double precision)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_player_id bigint;
  v_attempt public.game_attempts%rowtype;
  v_game_id text;
  v_direction text;
  v_config jsonb;
  v_max_attempts integer;
  v_server_elapsed integer;
  v_expected double precision;
  v_valid boolean:=true;
  v_remaining integer;
  v_best double precision;
  v_false_start boolean:=false;
  v_rounds integer;
  v_correct integer;
  v_reaction_sum integer;
  v_shots integer;
begin
  select p.player_id into v_player_id from public.profiles p where p.id=auth.uid();
  if v_player_id is null then raise exception 'Necesitas una cuenta vinculada a un jugador'; end if;

  select * into v_attempt from public.game_attempts where id=p_attempt_id and player_id=v_player_id for update;
  if v_attempt.id is null then raise exception 'Intento no encontrado'; end if;
  if v_attempt.status<>'started' then raise exception 'Este intento ya está cerrado'; end if;

  select dc.game_id,gd.scoring_direction,(gd.config || dc.config),dc.max_attempts
    into v_game_id,v_direction,v_config,v_max_attempts
  from public.daily_challenges dc join public.game_definitions gd on gd.id=dc.game_id
  where dc.id=v_attempt.challenge_id;

  if p_duration_ms is null or p_duration_ms<0 or p_duration_ms>120000 then v_valid:=false; end if;
  if p_score is null or p_score::text in ('NaN','Infinity','-Infinity') then v_valid:=false; end if;
  v_server_elapsed:=floor(extract(epoch from (now()-v_attempt.started_at))*1000)::integer;
  if p_duration_ms>v_server_elapsed+1500 then v_valid:=false; end if;

  if v_game_id='stop-seven' then
    v_expected:=abs(p_duration_ms-coalesce((v_config->>'target_ms')::integer,7000));
    if abs(p_score-v_expected)>3 or p_duration_ms>coalesce((v_config->>'max_duration_ms')::integer,14000) then v_valid:=false; end if;
  elsif v_game_id='reaction' then
    v_false_start:=coalesce((p_metadata->>'false_start')::boolean,false);
    if v_false_start then
      if abs(p_score-coalesce((v_config->>'max_reaction_ms')::integer,2500))>1 then v_valid:=false; end if;
    else
      if p_score<80 or p_score>coalesce((v_config->>'max_reaction_ms')::integer,2500) then v_valid:=false; end if;
      if p_duration_ms<p_score then v_valid:=false; end if;
    end if;
  elsif v_game_id='center-hit' then
    if p_score<0 or p_score>coalesce((v_config->>'max_error')::integer,1000) then v_valid:=false; end if;
  elsif v_game_id='speed-tap' then
    if p_score<0 or p_score>coalesce((v_config->>'max_taps')::integer,120) or p_score<>floor(p_score) then v_valid:=false; end if;
    if p_duration_ms<4300 or p_duration_ms>7500 then v_valid:=false; end if;
  elsif v_game_id='color-reflex' then
    v_rounds:=coalesce((v_config->>'rounds')::integer,8);
    v_correct:=coalesce((p_metadata->>'correct')::integer,-1);
    v_reaction_sum:=coalesce((p_metadata->>'reaction_sum_ms')::integer,-1);
    if v_correct<0 or v_correct>v_rounds or v_reaction_sum<0 then v_valid:=false; end if;
    v_expected:=greatest(v_correct*1000-v_reaction_sum,0);
    if abs(p_score-v_expected)>1 or p_score>coalesce((v_config->>'max_score')::integer,8000) then v_valid:=false; end if;
  elsif v_game_id='quick-maths' then
    v_correct:=coalesce((p_metadata->>'correct')::integer,-1);
    if v_correct<0 or v_correct>coalesce((v_config->>'questions')::integer,10) then v_valid:=false; end if;
    if p_score<0 or p_score>coalesce((v_config->>'max_score')::integer,10000) then v_valid:=false; end if;
  elsif v_game_id='grid-memory' then
    if p_score<0 or p_score>coalesce((v_config->>'max_level')::integer,8) or p_score<>floor(p_score) then v_valid:=false; end if;
  elsif v_game_id='sequence' then
    if p_score<0 or p_score>coalesce((v_config->>'max_level')::integer,8) or p_score<>floor(p_score) then v_valid:=false; end if;
  elsif v_game_id='keep-up' then
    if p_score<0 or p_score>coalesce((v_config->>'max_touches')::integer,200) or p_score<>floor(p_score) then v_valid:=false; end if;
    if p_duration_ms>coalesce((v_config->>'max_duration_ms')::integer,30000)+2000 then v_valid:=false; end if;
    if p_metadata ? 'touches' and coalesce((p_metadata->>'touches')::integer,-1)<>p_score::integer then v_valid:=false; end if;
  elsif v_game_id='penalties' then
    v_shots:=coalesce((p_metadata->>'shots')::integer,-1);
    if v_shots<>coalesce((v_config->>'shots')::integer,5) then v_valid:=false; end if;
    if p_score<0 or p_score>coalesce((v_config->>'max_score')::integer,5000) or p_score<>floor(p_score) then v_valid:=false; end if;
  elsif v_game_id='goalkeeper' then
    v_shots:=coalesce((p_metadata->>'shots')::integer,-1);
    if v_shots<>coalesce((v_config->>'shots')::integer,5) then v_valid:=false; end if;
    if p_score<0 or p_score>coalesce((v_config->>'max_score')::integer,5) or p_score<>floor(p_score) then v_valid:=false; end if;
    if p_metadata ? 'saves' and coalesce((p_metadata->>'saves')::integer,-1)<>p_score::integer then v_valid:=false; end if;
  elsif v_game_id='top-bins' then
    v_shots:=coalesce((p_metadata->>'shots')::integer,-1);
    if v_shots<>coalesce((v_config->>'shots')::integer,5) then v_valid:=false; end if;
    if p_score<0 or p_score>coalesce((v_config->>'max_score')::integer,5000) or p_score<>floor(p_score) then v_valid:=false; end if;
  elsif v_game_id='var-offside' then
    v_rounds:=coalesce((v_config->>'rounds')::integer,8);
    v_correct:=coalesce((p_metadata->>'correct')::integer,-1);
    if v_correct<0 or v_correct>v_rounds or p_score<>floor(p_score) or p_score<>v_correct then v_valid:=false; end if;
  else
    v_valid:=false;
  end if;

  update public.game_attempts
  set status=case when v_valid then 'completed' else 'invalid' end,
      completed_at=now(),score=case when v_valid then p_score else null end,
      duration_ms=p_duration_ms,metadata=coalesce(p_metadata,'{}'::jsonb)
  where id=p_attempt_id;

  select greatest(v_max_attempts-count(*),0)::integer into v_remaining
  from public.game_attempts where challenge_id=v_attempt.challenge_id and player_id=v_player_id;

  select case when v_direction='lower' then min(ga.score) else max(ga.score) end into v_best
  from public.game_attempts ga
  where ga.challenge_id=v_attempt.challenge_id and ga.player_id=v_player_id and ga.status='completed';

  return query select case when v_valid then 'completed' else 'invalid' end,
                      case when v_valid then p_score else null end,
                      v_remaining,v_best;
end;
$$;
