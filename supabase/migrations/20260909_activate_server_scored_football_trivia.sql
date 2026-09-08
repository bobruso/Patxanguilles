-- Server-selected daily trivia set and server-side scoring.

create or replace function public._ensure_trivia_question_ids(p_challenge_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_ids jsonb; v_date date; v_count integer; v_config jsonb;
begin
  select dc.challenge_date,(gd.config || dc.config),coalesce((gd.config->>'questions')::integer,5)
    into v_date,v_config,v_count
  from public.daily_challenges dc join public.game_definitions gd on gd.id=dc.game_id
  where dc.id=p_challenge_id and dc.game_id='football-trivia' for update of dc;
  if v_date is null then raise exception 'Reto de trivial no encontrado'; end if;
  v_ids:=v_config->'question_ids';
  if jsonb_typeof(v_ids)='array' and jsonb_array_length(v_ids)=v_count then return v_ids; end if;
  select jsonb_agg(s.id order by s.sort_key) into v_ids
  from (select tq.id,md5(v_date::text||':'||tq.id::text) sort_key from public.trivia_questions tq where tq.active=true order by sort_key limit v_count) s;
  if v_ids is null or jsonb_array_length(v_ids)<v_count then raise exception 'No hay suficientes preguntas activas para el trivial'; end if;
  update public.daily_challenges set config=jsonb_set(coalesce(config,'{}'::jsonb),'{question_ids}',v_ids,true) where id=p_challenge_id;
  return v_ids;
end; $$;
revoke all on function public._ensure_trivia_question_ids(uuid) from public,anon,authenticated;

create or replace function public.get_trivia_questions_for_attempt(p_attempt_id uuid)
returns table(question_order integer,question_id bigint,question text,answers jsonb,category text,difficulty text)
language plpgsql security definer set search_path=public as $$
declare v_player_id bigint; v_challenge_id uuid; v_ids jsonb;
begin
  select p.player_id into v_player_id from public.profiles p where p.id=auth.uid();
  if v_player_id is null then raise exception 'Necesitas una cuenta vinculada a un jugador'; end if;
  select ga.challenge_id into v_challenge_id from public.game_attempts ga join public.daily_challenges dc on dc.id=ga.challenge_id where ga.id=p_attempt_id and ga.player_id=v_player_id and ga.status='started' and dc.game_id='football-trivia';
  if v_challenge_id is null then raise exception 'Intento de trivial no encontrado'; end if;
  v_ids:=public._ensure_trivia_question_ids(v_challenge_id);
  return query select ord::integer,tq.id,tq.question,tq.answers,tq.category,tq.difficulty
  from jsonb_array_elements_text(v_ids) with ordinality as x(id_text,ord)
  join public.trivia_questions tq on tq.id=x.id_text::bigint order by ord;
end; $$;
revoke all on function public.get_trivia_questions_for_attempt(uuid) from public,anon;
grant execute on function public.get_trivia_questions_for_attempt(uuid) to authenticated;

create or replace function public.finish_trivia_game_attempt(p_attempt_id uuid,p_duration_ms integer,p_metadata jsonb default '{}'::jsonb)
returns table(status text,score double precision,attempts_remaining integer,best_score double precision)
language plpgsql security definer set search_path=public as $$
declare
  v_player_id bigint; v_attempt public.game_attempts%rowtype; v_config jsonb; v_ids jsonb; v_answers jsonb; v_item jsonb;
  v_qid bigint; v_correct_index integer; v_answer_index integer; v_response_ms integer; v_timeout integer; v_qcount integer;
  v_score integer:=0; v_correct integer:=0; v_valid boolean:=true; v_server_elapsed integer; v_max_attempts integer; v_remaining integer; v_best double precision;
begin
  select p.player_id into v_player_id from public.profiles p where p.id=auth.uid();
  if v_player_id is null then raise exception 'Necesitas una cuenta vinculada a un jugador'; end if;
  select * into v_attempt from public.game_attempts where id=p_attempt_id and player_id=v_player_id for update;
  if v_attempt.id is null then raise exception 'Intento no encontrado'; end if;
  if v_attempt.status<>'started' then raise exception 'Este intento ya está cerrado'; end if;
  select (gd.config || dc.config),dc.max_attempts into v_config,v_max_attempts from public.daily_challenges dc join public.game_definitions gd on gd.id=dc.game_id where dc.id=v_attempt.challenge_id and dc.game_id='football-trivia';
  if v_config is null then raise exception 'Este intento no pertenece al trivial'; end if;
  v_ids:=public._ensure_trivia_question_ids(v_attempt.challenge_id); v_qcount:=jsonb_array_length(v_ids); v_timeout:=coalesce((v_config->>'question_timeout_ms')::integer,8000); v_answers:=p_metadata->'answers';
  if jsonb_typeof(v_answers)<>'array' or jsonb_array_length(v_answers)<>v_qcount then v_valid:=false; end if;
  if p_duration_ms is null or p_duration_ms<0 or p_duration_ms>v_qcount*(v_timeout+2500) then v_valid:=false; end if;
  v_server_elapsed:=floor(extract(epoch from (now()-v_attempt.started_at))*1000)::integer;
  if p_duration_ms>v_server_elapsed+1500 then v_valid:=false; end if;
  if v_valid then
    for v_qid in select value::bigint from jsonb_array_elements_text(v_ids) loop
      v_item:=null;
      select elem into v_item from jsonb_array_elements(v_answers) elem where elem->>'question_id'=v_qid::text limit 1;
      if v_item is null or coalesce(v_item->>'answer_index','') !~ '^-?[0-9]+$' or coalesce(v_item->>'response_ms','') !~ '^[0-9]+$' then v_valid:=false; exit; end if;
      v_answer_index:=(v_item->>'answer_index')::integer; v_response_ms:=(v_item->>'response_ms')::integer;
      if v_answer_index not between -1 and 3 or v_response_ms<0 or v_response_ms>v_timeout then v_valid:=false; exit; end if;
      select tq.correct_index into v_correct_index from public.trivia_questions tq where tq.id=v_qid;
      if v_correct_index is null then v_valid:=false; exit; end if;
      if v_answer_index=v_correct_index then v_correct:=v_correct+1; v_score:=v_score+greatest(200,1000-least(800,floor(v_response_ms/10.0)::integer)); end if;
    end loop;
  end if;
  update public.game_attempts set status=case when v_valid then 'completed' else 'invalid' end,completed_at=now(),score=case when v_valid then v_score::double precision else null end,duration_ms=p_duration_ms,metadata=coalesce(p_metadata,'{}'::jsonb)||jsonb_build_object('server_correct',v_correct,'server_score',v_score) where id=p_attempt_id;
  select greatest(v_max_attempts-count(*),0)::integer into v_remaining from public.game_attempts where challenge_id=v_attempt.challenge_id and player_id=v_player_id;
  select max(ga.score) into v_best from public.game_attempts ga where ga.challenge_id=v_attempt.challenge_id and ga.player_id=v_player_id and ga.status='completed';
  return query select case when v_valid then 'completed' else 'invalid' end,case when v_valid then v_score::double precision else null end,v_remaining,v_best;
end; $$;
revoke all on function public.finish_trivia_game_attempt(uuid,integer,jsonb) from public,anon;
grant execute on function public.finish_trivia_game_attempt(uuid,integer,jsonb) to authenticated;

update public.game_definitions set active=true,updated_at=now() where id='football-trivia';
