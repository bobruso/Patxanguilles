-- Third Playus-style batch. Six additional original microgames.

insert into public.game_definitions (id,name,description,category,scoring_direction,unit,default_attempts,config,active,sort_order)
values
  ('odd-one','Odd One','Encuentra el símbolo diferente antes de que se acabe el tiempo.','reflex','higher','points',2,'{"rounds":12,"round_timeout_ms":1800,"max_score":12000}'::jsonb,true,220),
  ('flash-count','Flash Count','Cuenta cuántos destellos aparecen y responde rápido.','memory','higher','points',2,'{"rounds":8,"min_count":2,"max_count":8,"max_score":8000}'::jsonb,true,230),
  ('balance','Balance','Mantén la aguja dentro de la zona segura durante doce segundos.','precision','higher','points',2,'{"duration_ms":12000,"max_score":12000}'::jsonb,true,240),
  ('target-lock','Target Lock','Pulsa cuando el anillo móvil coincida con el objetivo.','timing','higher','points',2,'{"rounds":10,"max_score":10000}'::jsonb,true,250),
  ('swipe-sort','Swipe Sort','Desliza cada tarjeta hacia el lado correcto siguiendo la regla.','reflex','higher','points',2,'{"rounds":16,"round_timeout_ms":1800,"max_score":16000}'::jsonb,true,260),
  ('catch-drop','Catch Drop','Mueve la cesta y atrapa tantos objetos como puedas antes de que termine el tiempo.','arcade','higher','points',2,'{"duration_ms":18000,"max_score":50}'::jsonb,true,270)
on conflict (id) do update set
  name=excluded.name,description=excluded.description,category=excluded.category,
  scoring_direction=excluded.scoring_direction,unit=excluded.unit,
  default_attempts=excluded.default_attempts,config=excluded.config,
  active=excluded.active,sort_order=excluded.sort_order,updated_at=now();

create or replace function public.finish_arcade_game_attempt(p_attempt_id uuid,p_score double precision,p_duration_ms integer,p_metadata jsonb default '{}'::jsonb)
returns table(status text,score double precision,attempts_remaining integer,best_score double precision)
language plpgsql security definer set search_path=public as $$
declare
  v_player_id bigint; v_attempt public.game_attempts%rowtype; v_game_id text; v_direction text; v_config jsonb; v_max_attempts integer;
  v_server_elapsed integer; v_valid boolean:=true; v_remaining integer; v_best double precision; v_expected double precision;
  v_value integer; v_completed boolean; v_correct integer; v_reaction_sum integer; v_error_sum integer;
begin
  select p.player_id into v_player_id from public.profiles p where p.id=auth.uid();
  if v_player_id is null then raise exception 'Necesitas una cuenta vinculada a un jugador'; end if;
  select * into v_attempt from public.game_attempts where id=p_attempt_id and player_id=v_player_id for update;
  if v_attempt.id is null then raise exception 'Intento no encontrado'; end if;
  if v_attempt.status<>'started' then raise exception 'Este intento ya está cerrado'; end if;
  select dc.game_id,gd.scoring_direction,(gd.config||dc.config),dc.max_attempts into v_game_id,v_direction,v_config,v_max_attempts
  from public.daily_challenges dc join public.game_definitions gd on gd.id=dc.game_id where dc.id=v_attempt.challenge_id;
  if v_game_id not in ('higher-lower','cups','memory-cards','tower-stack','zig-zag','lane-rush','arrow-rush','drop-zone','orbit-pins','rhythm-tap','shape-gate','snake-sprint','odd-one','flash-count','balance','target-lock','swipe-sort','catch-drop') then raise exception 'Este intento no pertenece a un juego arcade'; end if;
  if p_duration_ms is null or p_duration_ms<0 or p_duration_ms>120000 then v_valid:=false; end if;
  if p_score is null or p_score::text in ('NaN','Infinity','-Infinity') then v_valid:=false; end if;
  v_server_elapsed:=floor(extract(epoch from(now()-v_attempt.started_at))*1000)::integer;
  if p_duration_ms>v_server_elapsed+1500 then v_valid:=false; end if;

  if v_game_id in ('higher-lower','cups') then
    v_value:=coalesce((p_metadata->>'correct')::integer,-1); v_expected:=v_value;
    if v_value<0 or v_value>coalesce((v_config->>'rounds')::integer,10) or abs(p_score-v_expected)>0.1 then v_valid:=false; end if;
  elsif v_game_id='memory-cards' then
    v_value:=coalesce((p_metadata->>'matches')::integer,-1); v_completed:=coalesce((p_metadata->>'completed')::boolean,false);
    if v_value<0 or v_value>coalesce((v_config->>'pairs')::integer,8) then v_valid:=false; end if;
    if v_completed then v_expected:=p_duration_ms; else v_expected:=coalesce((v_config->>'max_score')::integer,60000)-(v_value*1000); end if;
    if abs(p_score-v_expected)>3 then v_valid:=false; end if;
  elsif v_game_id in ('tower-stack','drop-zone') then
    v_value:=coalesce((p_metadata->>'level')::integer,-1); v_expected:=v_value;
    if v_value<0 or v_value>coalesce((v_config->>'max_level')::integer,25) or abs(p_score-v_expected)>0.1 then v_valid:=false; end if;
  elsif v_game_id in ('zig-zag','lane-rush','snake-sprint','catch-drop') then
    v_value:=coalesce((p_metadata->>'points')::integer,-1); v_expected:=v_value;
    if v_value<0 or v_value>coalesce((v_config->>'max_score')::integer,50) or abs(p_score-v_expected)>0.1 then v_valid:=false; end if;
  elsif v_game_id in ('arrow-rush','shape-gate','odd-one','flash-count','swipe-sort') then
    v_correct:=coalesce((p_metadata->>'correct')::integer,-1); v_reaction_sum:=coalesce((p_metadata->>'reaction_sum_ms')::integer,-1);
    if v_correct<0 or v_correct>coalesce((v_config->>'rounds')::integer,16) or v_reaction_sum<0 then v_valid:=false; end if;
    v_expected:=greatest(v_correct*1000-v_reaction_sum,0);
    if abs(p_score-v_expected)>2 or p_score>coalesce((v_config->>'max_score')::integer,16000) then v_valid:=false; end if;
  elsif v_game_id='orbit-pins' then
    v_value:=coalesce((p_metadata->>'pins')::integer,-1); v_expected:=v_value;
    if v_value<0 or v_value>coalesce((v_config->>'max_score')::integer,14) or abs(p_score-v_expected)>0.1 then v_valid:=false; end if;
  elsif v_game_id='rhythm-tap' then
    v_value:=coalesce((p_metadata->>'taps')::integer,-1); v_error_sum:=coalesce((p_metadata->>'error_sum_ms')::integer,-1);
    if v_value<0 or v_value>coalesce((v_config->>'beats')::integer,12) or v_error_sum<0 then v_valid:=false; end if;
    v_expected:=greatest(coalesce((v_config->>'max_score')::integer,12000)-v_error_sum,0);
    if abs(p_score-v_expected)>2 then v_valid:=false; end if;
  elsif v_game_id='balance' then
    v_value:=coalesce((p_metadata->>'in_zone_ms')::integer,-1); v_expected:=v_value;
    if v_value<0 or v_value>coalesce((v_config->>'max_score')::integer,12000) or abs(p_score-v_expected)>2 then v_valid:=false; end if;
  elsif v_game_id='target-lock' then
    v_value:=coalesce((p_metadata->>'points')::integer,-1); v_expected:=v_value;
    if v_value<0 or v_value>coalesce((v_config->>'max_score')::integer,10000) or abs(p_score-v_expected)>0.1 then v_valid:=false; end if;
  end if;

  update public.game_attempts set status=case when v_valid then 'completed' else 'invalid' end,completed_at=now(),score=case when v_valid then p_score else null end,duration_ms=p_duration_ms,metadata=coalesce(p_metadata,'{}'::jsonb) where id=p_attempt_id;
  select greatest(v_max_attempts-count(*),0)::integer into v_remaining from public.game_attempts where challenge_id=v_attempt.challenge_id and player_id=v_player_id;
  select case when v_direction='lower' then min(ga.score) else max(ga.score) end into v_best from public.game_attempts ga where ga.challenge_id=v_attempt.challenge_id and ga.player_id=v_player_id and ga.status='completed';
  return query select case when v_valid then 'completed' else 'invalid' end,case when v_valid then p_score else null end,v_remaining,v_best;
end;
$$;
revoke all on function public.finish_arcade_game_attempt(uuid,double precision,integer,jsonb) from public,anon;
grant execute on function public.finish_arcade_game_attempt(uuid,double precision,integer,jsonb) to authenticated;