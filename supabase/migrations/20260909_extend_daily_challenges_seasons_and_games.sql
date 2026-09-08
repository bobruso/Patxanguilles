-- Retos diarios phase 2: monthly seasons, history, previous results and five new games.

create table if not exists public.game_seasons (
  id uuid primary key default gen_random_uuid(),
  season_key text not null unique,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'active' check (status in ('active','closed')),
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

alter table public.game_seasons enable row level security;
revoke all on public.game_seasons from anon, authenticated;
grant all on public.game_seasons to service_role;

insert into public.game_definitions (id,name,description,category,scoring_direction,unit,default_attempts,config,active,sort_order)
values
  ('speed-tap','Speed Tap','Toca la pantalla tantas veces como puedas antes de que termine el tiempo.','speed','higher','taps',2,'{"duration_ms":5000,"max_taps":120}'::jsonb,true,40),
  ('color-reflex','Color Reflex','Responde al color correcto lo más rápido posible durante ocho rondas.','reflex','higher','points',2,'{"rounds":8,"round_timeout_ms":2200,"max_score":8000}'::jsonb,true,50),
  ('quick-maths','Quick Maths','Resuelve diez operaciones sencillas antes de que se agote el tiempo.','logic','higher','points',2,'{"questions":10,"question_timeout_ms":5000,"max_score":10000}'::jsonb,true,60),
  ('grid-memory','Grid Memory','Memoriza las casillas iluminadas y repítelas sin equivocarte.','memory','higher','level',2,'{"start_cells":3,"max_level":8}'::jsonb,true,70),
  ('sequence','Secuencia','Memoriza y repite una secuencia cada vez más larga.','memory','higher','level',2,'{"start_length":3,"max_level":8}'::jsonb,true,80)
on conflict (id) do update set
  name=excluded.name,description=excluded.description,category=excluded.category,
  scoring_direction=excluded.scoring_direction,unit=excluded.unit,
  default_attempts=excluded.default_attempts,config=excluded.config,
  active=excluded.active,sort_order=excluded.sort_order,updated_at=now();

create or replace function public.get_current_game_season()
returns table(season_id uuid,season_key text,season_name text,starts_on date,ends_on date)
language plpgsql security definer set search_path=public as $$
declare
  v_today date := (now() at time zone 'Europe/Madrid')::date;
  v_start date := date_trunc('month',v_today::timestamp)::date;
  v_end date := (date_trunc('month',v_today::timestamp)+interval '1 month - 1 day')::date;
  v_key text := to_char(v_start,'YYYY-MM');
  v_row public.game_seasons%rowtype;
begin
  if auth.uid() is null then raise exception 'Necesitas iniciar sesión'; end if;
  insert into public.game_seasons(season_key,name,starts_on,ends_on,status)
  values(v_key,'Temporada '||to_char(v_start,'MM/YYYY'),v_start,v_end,'active')
  on conflict do nothing;
  update public.game_seasons gs set status='closed'
  where gs.status='active' and gs.ends_on<v_today;
  select gs.* into v_row from public.game_seasons gs where gs.season_key=v_key;
  return query select v_row.id,v_row.season_key,v_row.name,v_row.starts_on,v_row.ends_on;
end;
$$;
revoke all on function public.get_current_game_season() from public,anon;
grant execute on function public.get_current_game_season() to authenticated;

create or replace function public.get_season_leaderboard()
returns table(rank bigint,player_id bigint,nickname text,photo_url text,points bigint,days_played bigint,wins bigint,podiums bigint)
language sql security definer set search_path=public as $$
with me as (
  select p.player_id from public.profiles p where p.id=auth.uid()
), season as (
  select * from public.get_current_game_season()
), best as (
  select ga.challenge_id,ga.player_id,gd.scoring_direction,
    case when gd.scoring_direction='lower' then min(ga.score) else max(ga.score) end best_score
  from public.game_attempts ga
  join public.daily_challenges dc on dc.id=ga.challenge_id
  join public.game_definitions gd on gd.id=dc.game_id
  cross join season s
  where ga.status='completed' and dc.challenge_date between s.starts_on and s.ends_on
  group by ga.challenge_id,ga.player_id,gd.scoring_direction
), ranked as (
  select b.*,rank() over(partition by b.challenge_id order by case when b.scoring_direction='lower' then b.best_score else -b.best_score end asc) daily_rank
  from best b
), scored as (
  select r.*,case r.daily_rank when 1 then 10 when 2 then 8 when 3 then 7 when 4 then 6 when 5 then 5 when 6 then 4 when 7 then 3 when 8 then 2 else 1 end::bigint daily_points
  from ranked r
), totals as (
  select s.player_id,sum(s.daily_points)::bigint points,count(*)::bigint days_played,
    count(*) filter(where s.daily_rank=1)::bigint wins,
    count(*) filter(where s.daily_rank<=3)::bigint podiums
  from scored s group by s.player_id
)
select rank() over(order by t.points desc,t.wins desc,t.podiums desc,t.days_played desc,pl.nickname asc),
  t.player_id,pl.nickname,pl.photo_url,t.points,t.days_played,t.wins,t.podiums
from totals t join public.players pl on pl.id=t.player_id
where exists(select 1 from me where player_id is not null)
order by 1,pl.nickname;
$$;
revoke all on function public.get_season_leaderboard() from public,anon;
grant execute on function public.get_season_leaderboard() to authenticated;

create or replace function public.get_game_leaderboard_for_date(p_date date)
returns table(rank bigint,player_id bigint,nickname text,photo_url text,best_score double precision,attempts bigint,game_id text,game_name text,unit text,scoring_direction text)
language sql security definer set search_path=public as $$
with me as (
  select p.player_id from public.profiles p where p.id=auth.uid()
), target as (
  select dc.id challenge_id,dc.game_id,gd.name game_name,gd.unit,gd.scoring_direction
  from public.daily_challenges dc join public.game_definitions gd on gd.id=dc.game_id
  where dc.challenge_date=p_date limit 1
), best as (
  select ga.player_id,case when t.scoring_direction='lower' then min(ga.score) else max(ga.score) end best_score,
    count(*)::bigint attempts,t.game_id,t.game_name,t.unit,t.scoring_direction
  from public.game_attempts ga cross join target t
  where ga.challenge_id=t.challenge_id and ga.status='completed'
  group by ga.player_id,t.game_id,t.game_name,t.unit,t.scoring_direction
)
select rank() over(order by case when b.scoring_direction='lower' then b.best_score else -b.best_score end asc),
  b.player_id,pl.nickname,pl.photo_url,b.best_score,b.attempts,b.game_id,b.game_name,b.unit,b.scoring_direction
from best b join public.players pl on pl.id=b.player_id
where exists(select 1 from me where player_id is not null)
order by 1,pl.nickname;
$$;
revoke all on function public.get_game_leaderboard_for_date(date) from public,anon;
grant execute on function public.get_game_leaderboard_for_date(date) to authenticated;

create or replace function public.get_challenge_history(p_limit integer default 14)
returns table(challenge_date date,game_id text,game_name text,unit text,scoring_direction text,participants bigint,my_best_score double precision,my_rank bigint,winner_nickname text,winner_score double precision)
language sql security definer set search_path=public as $$
with me as (
  select p.player_id from public.profiles p where p.id=auth.uid()
), best as (
  select dc.id challenge_id,dc.challenge_date,dc.game_id,gd.name game_name,gd.unit,gd.scoring_direction,ga.player_id,
    case when gd.scoring_direction='lower' then min(ga.score) else max(ga.score) end best_score
  from public.daily_challenges dc join public.game_definitions gd on gd.id=dc.game_id
  left join public.game_attempts ga on ga.challenge_id=dc.id and ga.status='completed'
  group by dc.id,dc.challenge_date,dc.game_id,gd.name,gd.unit,gd.scoring_direction,ga.player_id
), ranked as (
  select b.*,case when b.player_id is null then null else rank() over(partition by b.challenge_id order by case when b.scoring_direction='lower' then b.best_score else -b.best_score end asc nulls last) end player_rank
  from best b
), agg as (
  select r.challenge_id,max(r.challenge_date) challenge_date,max(r.game_id) game_id,max(r.game_name) game_name,max(r.unit) unit,max(r.scoring_direction) scoring_direction,
    count(r.player_id)::bigint participants,
    max(r.best_score) filter(where r.player_id=(select player_id from me)) my_best_score,
    max(r.player_rank) filter(where r.player_id=(select player_id from me)) my_rank,
    max(pl.nickname) filter(where r.player_rank=1) winner_nickname,
    max(r.best_score) filter(where r.player_rank=1) winner_score
  from ranked r left join public.players pl on pl.id=r.player_id group by r.challenge_id
)
select a.challenge_date,a.game_id,a.game_name,a.unit,a.scoring_direction,a.participants,a.my_best_score,a.my_rank,a.winner_nickname,a.winner_score
from agg a where exists(select 1 from me where player_id is not null)
order by a.challenge_date desc limit greatest(1,least(coalesce(p_limit,14),60));
$$;
revoke all on function public.get_challenge_history(integer) from public,anon;
grant execute on function public.get_challenge_history(integer) to authenticated;

create or replace function public.finish_daily_game_attempt(p_attempt_id uuid,p_score double precision,p_duration_ms integer,p_metadata jsonb default '{}'::jsonb)
returns table(status text,score double precision,attempts_remaining integer,best_score double precision)
language plpgsql security definer set search_path=public as $$
declare
  v_player_id bigint; v_attempt public.game_attempts%rowtype; v_game_id text; v_direction text;
  v_config jsonb; v_max_attempts integer; v_server_elapsed integer; v_expected double precision;
  v_valid boolean:=true; v_remaining integer; v_best double precision; v_false_start boolean:=false;
  v_rounds integer; v_correct integer; v_reaction_sum integer;
begin
  select p.player_id into v_player_id from public.profiles p where p.id=auth.uid();
  if v_player_id is null then raise exception 'Necesitas una cuenta vinculada a un jugador'; end if;
  select * into v_attempt from public.game_attempts where id=p_attempt_id and player_id=v_player_id for update;
  if v_attempt.id is null then raise exception 'Intento no encontrado'; end if;
  if v_attempt.status<>'started' then raise exception 'Este intento ya está cerrado'; end if;
  select dc.game_id,gd.scoring_direction,(gd.config||dc.config),dc.max_attempts into v_game_id,v_direction,v_config,v_max_attempts
  from public.daily_challenges dc join public.game_definitions gd on gd.id=dc.game_id where dc.id=v_attempt.challenge_id;
  if p_duration_ms is null or p_duration_ms<0 or p_duration_ms>120000 then v_valid:=false; end if;
  if p_score is null or p_score::text in ('NaN','Infinity','-Infinity') then v_valid:=false; end if;
  v_server_elapsed:=floor(extract(epoch from(now()-v_attempt.started_at))*1000)::integer;
  if p_duration_ms>v_server_elapsed+1500 then v_valid:=false; end if;
  if v_game_id='stop-seven' then
    v_expected:=abs(p_duration_ms-coalesce((v_config->>'target_ms')::integer,7000));
    if abs(p_score-v_expected)>3 or p_duration_ms>coalesce((v_config->>'max_duration_ms')::integer,14000) then v_valid:=false; end if;
  elsif v_game_id='reaction' then
    v_false_start:=coalesce((p_metadata->>'false_start')::boolean,false);
    if v_false_start then if abs(p_score-coalesce((v_config->>'max_reaction_ms')::integer,2500))>1 then v_valid:=false; end if;
    else if p_score<80 or p_score>coalesce((v_config->>'max_reaction_ms')::integer,2500) or p_duration_ms<p_score then v_valid:=false; end if; end if;
  elsif v_game_id='center-hit' then
    if p_score<0 or p_score>coalesce((v_config->>'max_error')::integer,1000) then v_valid:=false; end if;
  elsif v_game_id='speed-tap' then
    if p_score<0 or p_score>coalesce((v_config->>'max_taps')::integer,120) or p_score<>floor(p_score) or p_duration_ms<4300 or p_duration_ms>7500 then v_valid:=false; end if;
  elsif v_game_id='color-reflex' then
    v_rounds:=coalesce((v_config->>'rounds')::integer,8); v_correct:=coalesce((p_metadata->>'correct')::integer,-1); v_reaction_sum:=coalesce((p_metadata->>'reaction_sum_ms')::integer,-1);
    if v_correct<0 or v_correct>v_rounds or v_reaction_sum<0 then v_valid:=false; end if;
    v_expected:=greatest(v_correct*1000-v_reaction_sum,0);
    if abs(p_score-v_expected)>1 or p_score>coalesce((v_config->>'max_score')::integer,8000) then v_valid:=false; end if;
  elsif v_game_id='quick-maths' then
    v_correct:=coalesce((p_metadata->>'correct')::integer,-1);
    if v_correct<0 or v_correct>coalesce((v_config->>'questions')::integer,10) or p_score<0 or p_score>coalesce((v_config->>'max_score')::integer,10000) then v_valid:=false; end if;
  elsif v_game_id='grid-memory' or v_game_id='sequence' then
    if p_score<0 or p_score>coalesce((v_config->>'max_level')::integer,8) or p_score<>floor(p_score) then v_valid:=false; end if;
  else v_valid:=false; end if;
  update public.game_attempts set status=case when v_valid then 'completed' else 'invalid' end,completed_at=now(),score=case when v_valid then p_score else null end,duration_ms=p_duration_ms,metadata=coalesce(p_metadata,'{}'::jsonb) where id=p_attempt_id;
  select greatest(v_max_attempts-count(*),0)::integer into v_remaining from public.game_attempts where challenge_id=v_attempt.challenge_id and player_id=v_player_id;
  select case when v_direction='lower' then min(ga.score) else max(ga.score) end into v_best from public.game_attempts ga where ga.challenge_id=v_attempt.challenge_id and ga.player_id=v_player_id and ga.status='completed';
  return query select case when v_valid then 'completed' else 'invalid' end,case when v_valid then p_score else null end,v_remaining,v_best;
end;
$$;
revoke all on function public.finish_daily_game_attempt(uuid,double precision,integer,jsonb) from public,anon;
grant execute on function public.finish_daily_game_attempt(uuid,double precision,integer,jsonb) to authenticated;
