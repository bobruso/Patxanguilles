-- Trivial futbolero: 10 preguntas, 15 segundos por pregunta y puntuación por acierto + velocidad.

update public.game_definitions
set description='Responde 10 preguntas de fútbol. Cada acierto suma más cuanto más rápido respondas.',
    scoring_direction='higher',
    unit='points',
    config='{"questions":10,"question_timeout_ms":15000,"max_score":10000,"points_max_per_correct":1000,"points_min_per_correct":250}'::jsonb,
    updated_at=now()
where id='football-trivia';

create or replace function public._ensure_trivia_question_ids(p_challenge_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_ids jsonb;
  v_date date;
  v_count integer;
  v_config jsonb;
begin
  select dc.challenge_date,(gd.config||dc.config),coalesce(((gd.config||dc.config)->>'questions')::integer,10)
    into v_date,v_config,v_count
  from public.daily_challenges dc
  join public.game_definitions gd on gd.id=dc.game_id
  where dc.id=p_challenge_id and dc.game_id='football-trivia'
  for update of dc;

  if v_date is null then raise exception 'Reto de trivial no encontrado'; end if;
  v_count:=greatest(1,least(v_count,10));
  v_ids:=v_config->'question_ids';

  if jsonb_typeof(v_ids)='array' and jsonb_array_length(v_ids)=v_count then return v_ids; end if;

  select jsonb_agg(s.id order by s.sort_key) into v_ids
  from (
    select tq.id,md5(v_date::text||':'||tq.id::text) sort_key
    from public.trivia_questions tq
    where tq.active=true and tq.difficulty in ('media','dificil')
    order by sort_key
    limit v_count
  ) s;

  if v_ids is null or jsonb_array_length(v_ids)<v_count then
    raise exception 'No hay suficientes preguntas de dificultad media/alta para el trivial';
  end if;

  update public.daily_challenges
  set config=jsonb_set(coalesce(config,'{}'::jsonb),'{question_ids}',v_ids,true)
  where id=p_challenge_id;
  return v_ids;
end;
$$;

revoke all on function public._ensure_trivia_question_ids(uuid) from public,anon;

drop function if exists public.answer_trivia_question(uuid,bigint,integer,integer);

create function public.answer_trivia_question(
  p_attempt_id uuid,
  p_question_id bigint,
  p_answer_index integer,
  p_response_ms integer
)
returns table(
  correct boolean,
  correct_index integer,
  answered integer,
  correct_count integer,
  points_awarded integer,
  total_score integer,
  finished boolean
)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_player_id bigint;
  v_attempt public.game_attempts%rowtype;
  v_config jsonb;
  v_ids jsonb;
  v_expected_qid bigint;
  v_answered integer;
  v_correct_count integer;
  v_total_score integer;
  v_correct_index integer;
  v_correct boolean;
  v_finished boolean;
  v_metadata jsonb;
  v_timeout integer;
  v_max_points integer;
  v_min_points integer;
  v_points integer:=0;
  v_total_questions integer;
  v_response integer;
begin
  select p.player_id into v_player_id from public.profiles p where p.id=auth.uid();
  if v_player_id is null then raise exception 'Necesitas una cuenta vinculada a un jugador'; end if;

  select * into v_attempt
  from public.game_attempts
  where id=p_attempt_id and player_id=v_player_id
  for update;

  if v_attempt.id is null then raise exception 'Intento no encontrado'; end if;
  if v_attempt.status<>'started' then raise exception 'Este intento ya está cerrado'; end if;

  select (gd.config||dc.config) into v_config
  from public.daily_challenges dc
  join public.game_definitions gd on gd.id=dc.game_id
  where dc.id=v_attempt.challenge_id and dc.game_id='football-trivia';
  if v_config is null then raise exception 'Este intento no pertenece al trivial'; end if;

  v_ids:=public._ensure_trivia_question_ids(v_attempt.challenge_id);
  v_total_questions:=least(10,jsonb_array_length(v_ids));
  v_metadata:=coalesce(v_attempt.metadata,'{}'::jsonb);
  v_answered:=coalesce((v_metadata->>'trivia_answered')::integer,0);
  v_correct_count:=coalesce((v_metadata->>'trivia_correct_count')::integer,0);
  v_total_score:=coalesce((v_metadata->>'trivia_total_score')::integer,0);

  if coalesce((v_metadata->>'trivia_last_question_id')::bigint,-1)=p_question_id then
    return query select
      coalesce((v_metadata->>'trivia_last_correct')::boolean,false),
      coalesce((v_metadata->>'trivia_last_correct_index')::integer,-1),
      v_answered,v_correct_count,
      coalesce((v_metadata->>'trivia_last_points')::integer,0),
      v_total_score,
      coalesce((v_metadata->>'trivia_finished')::boolean,false);
    return;
  end if;

  if coalesce((v_metadata->>'trivia_finished')::boolean,false) then raise exception 'El trivial ya ha terminado'; end if;
  if v_answered>=v_total_questions then raise exception 'No quedan preguntas'; end if;

  v_expected_qid:=(v_ids->>v_answered)::bigint;
  if p_question_id<>v_expected_qid then raise exception 'Pregunta fuera de orden'; end if;
  if p_answer_index not between -1 and 3 then raise exception 'Respuesta no válida'; end if;
  if p_response_ms is null or p_response_ms<0 then raise exception 'Tiempo de respuesta no válido'; end if;

  v_timeout:=coalesce((v_config->>'question_timeout_ms')::integer,15000);
  v_max_points:=coalesce((v_config->>'points_max_per_correct')::integer,1000);
  v_min_points:=coalesce((v_config->>'points_min_per_correct')::integer,250);
  v_response:=least(p_response_ms,v_timeout);

  select tq.correct_index into v_correct_index
  from public.trivia_questions tq
  where tq.id=v_expected_qid and tq.active=true;
  if v_correct_index is null then raise exception 'Pregunta no disponible'; end if;

  v_correct:=(p_answer_index=v_correct_index and p_response_ms<=v_timeout);
  if v_correct then
    v_points:=greatest(v_min_points,v_max_points-floor((v_response::numeric/v_timeout::numeric)*(v_max_points-v_min_points))::integer);
    v_correct_count:=v_correct_count+1;
    v_total_score:=v_total_score+v_points;
  end if;

  v_answered:=v_answered+1;
  v_finished:=(v_answered>=v_total_questions);

  v_metadata:=v_metadata||jsonb_build_object(
    'trivia_answered',v_answered,
    'trivia_correct_count',v_correct_count,
    'trivia_total_score',v_total_score,
    'trivia_finished',v_finished,
    'trivia_last_question_id',v_expected_qid,
    'trivia_last_correct',v_correct,
    'trivia_last_correct_index',v_correct_index,
    'trivia_last_points',v_points,
    'trivia_last_response_ms',v_response,
    'trivia_last_answer_at',now()
  );

  update public.game_attempts set metadata=v_metadata where id=p_attempt_id;
  return query select v_correct,v_correct_index,v_answered,v_correct_count,v_points,v_total_score,v_finished;
end;
$$;

revoke all on function public.answer_trivia_question(uuid,bigint,integer,integer) from public,anon;
grant execute on function public.answer_trivia_question(uuid,bigint,integer,integer) to authenticated;

create or replace function public.finish_trivia_game_attempt(
  p_attempt_id uuid,
  p_duration_ms integer,
  p_metadata jsonb default '{}'::jsonb
)
returns table(status text,score double precision,attempts_remaining integer,best_score double precision)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_player_id bigint;
  v_attempt public.game_attempts%rowtype;
  v_config jsonb;
  v_max_attempts integer;
  v_remaining integer;
  v_best double precision;
  v_server_elapsed integer;
  v_valid boolean:=true;
  v_answered integer;
  v_correct_count integer;
  v_total_score integer;
  v_finished boolean;
  v_questions integer;
begin
  select p.player_id into v_player_id from public.profiles p where p.id=auth.uid();
  if v_player_id is null then raise exception 'Necesitas una cuenta vinculada a un jugador'; end if;

  select * into v_attempt
  from public.game_attempts
  where id=p_attempt_id and player_id=v_player_id
  for update;

  if v_attempt.id is null then raise exception 'Intento no encontrado'; end if;
  if v_attempt.status<>'started' then raise exception 'Este intento ya está cerrado'; end if;

  select (gd.config||dc.config),dc.max_attempts into v_config,v_max_attempts
  from public.daily_challenges dc
  join public.game_definitions gd on gd.id=dc.game_id
  where dc.id=v_attempt.challenge_id and dc.game_id='football-trivia';
  if v_config is null then raise exception 'Este intento no pertenece al trivial'; end if;

  v_questions:=least(10,coalesce((v_config->>'questions')::integer,10));
  v_answered:=coalesce((v_attempt.metadata->>'trivia_answered')::integer,0);
  v_correct_count:=coalesce((v_attempt.metadata->>'trivia_correct_count')::integer,0);
  v_total_score:=coalesce((v_attempt.metadata->>'trivia_total_score')::integer,0);
  v_finished:=coalesce((v_attempt.metadata->>'trivia_finished')::boolean,false);

  if not v_finished or v_answered<>v_questions then v_valid:=false; end if;
  if v_correct_count<0 or v_correct_count>v_questions then v_valid:=false; end if;
  if v_total_score<0 or v_total_score>coalesce((v_config->>'max_score')::integer,10000) then v_valid:=false; end if;
  if p_duration_ms is null or p_duration_ms<0 or p_duration_ms>240000 then v_valid:=false; end if;

  v_server_elapsed:=floor(extract(epoch from(now()-v_attempt.started_at))*1000)::integer;
  if p_duration_ms>v_server_elapsed+2500 then v_valid:=false; end if;

  update public.game_attempts
  set status=case when v_valid then 'completed' else 'invalid' end,
      completed_at=now(),
      score=case when v_valid then v_total_score::double precision else null end,
      duration_ms=p_duration_ms,
      metadata=coalesce(v_attempt.metadata,'{}'::jsonb)||jsonb_build_object(
        'server_score',v_total_score,'server_correct',v_correct_count,'server_questions',v_questions
      )
  where id=p_attempt_id;

  select greatest(v_max_attempts-count(*),0)::integer into v_remaining
  from public.game_attempts
  where challenge_id=v_attempt.challenge_id and player_id=v_player_id;

  select max(ga.score) into v_best
  from public.game_attempts ga
  where ga.challenge_id=v_attempt.challenge_id and ga.player_id=v_player_id and ga.status='completed';

  return query select
    case when v_valid then 'completed' else 'invalid' end,
    case when v_valid then v_total_score::double precision else null end,
    v_remaining,v_best;
end;
$$;

revoke all on function public.finish_trivia_game_attempt(uuid,integer,jsonb) from public,anon;
grant execute on function public.finish_trivia_game_attempt(uuid,integer,jsonb) to authenticated;
