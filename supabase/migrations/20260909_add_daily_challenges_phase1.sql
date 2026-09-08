-- Reto del día · Phase 1
-- Catálogo, reto diario, intentos, ranking y tres juegos iniciales.

create table if not exists public.game_definitions (
  id text primary key,
  name text not null,
  description text not null default '',
  category text not null,
  scoring_direction text not null check (scoring_direction in ('lower','higher')),
  unit text not null,
  default_attempts smallint not null default 2 check (default_attempts between 1 and 10),
  config jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge_date date not null unique,
  game_id text not null references public.game_definitions(id),
  max_attempts smallint not null check (max_attempts between 1 and 10),
  config jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.game_attempts (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.daily_challenges(id) on delete cascade,
  player_id bigint not null references public.players(id) on delete cascade,
  attempt_no smallint not null check (attempt_no between 1 and 20),
  status text not null default 'started' check (status in ('started','completed','abandoned','invalid')),
  seed bigint not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  score double precision,
  duration_ms integer,
  metadata jsonb not null default '{}'::jsonb,
  unique (challenge_id, player_id, attempt_no)
);

create index if not exists game_attempts_challenge_player_idx
  on public.game_attempts(challenge_id, player_id, started_at desc);
create index if not exists game_attempts_completed_idx
  on public.game_attempts(challenge_id, status, score)
  where status = 'completed';

insert into public.game_definitions
  (id,name,description,category,scoring_direction,unit,default_attempts,config,sort_order)
values
  ('stop-seven','Stop 7','Pulsa para iniciar el cronómetro y vuelve a pulsar lo más cerca posible de 7,000 segundos.','timing','lower','ms_error',2,'{"target_ms":7000,"max_duration_ms":14000}'::jsonb,10),
  ('reaction','Reacción','Espera la señal y pulsa tan rápido como puedas. Si te adelantas, el intento cuenta.','reflex','lower','ms',2,'{"min_wait_ms":1600,"max_wait_ms":4200,"max_reaction_ms":2500}'::jsonb,20),
  ('center-hit','Clava el centro','Detén el marcador móvil exactamente en el centro de la barra.','precision','lower','error',2,'{"speed":0.72,"max_error":1000}'::jsonb,30)
on conflict (id) do update set
  name=excluded.name,
  description=excluded.description,
  category=excluded.category,
  scoring_direction=excluded.scoring_direction,
  unit=excluded.unit,
  default_attempts=excluded.default_attempts,
  config=excluded.config,
  sort_order=excluded.sort_order,
  active=true,
  updated_at=now();

alter table public.game_definitions enable row level security;
alter table public.daily_challenges enable row level security;
alter table public.game_attempts enable row level security;

drop policy if exists "Retos catalogo autenticado" on public.game_definitions;
create policy "Retos catalogo autenticado" on public.game_definitions
  for select to authenticated using (true);

drop policy if exists "Retos diarios autenticado" on public.daily_challenges;
create policy "Retos diarios autenticado" on public.daily_challenges
  for select to authenticated using (true);

drop policy if exists "Intentos propios lectura" on public.game_attempts;
create policy "Intentos propios lectura" on public.game_attempts
  for select to authenticated
  using (
    player_id=(select p.player_id from public.profiles p where p.id=auth.uid())
    or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
  );

revoke insert,update,delete on public.game_definitions from anon,authenticated;
revoke insert,update,delete on public.daily_challenges from anon,authenticated;
revoke insert,update,delete on public.game_attempts from anon,authenticated;
grant select on public.game_definitions,public.daily_challenges,public.game_attempts to authenticated;

create or replace function public.get_or_create_daily_challenge()
returns table(
  challenge_id uuid,
  challenge_date date,
  game_id text,
  game_name text,
  description text,
  scoring_direction text,
  unit text,
  max_attempts integer,
  config jsonb,
  attempts_used integer,
  attempts_remaining integer,
  best_score double precision
)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_player_id bigint;
  v_date date := (now() at time zone 'Europe/Madrid')::date;
  v_game_count integer;
  v_offset integer;
  v_game_id text;
  v_challenge_id uuid;
begin
  select p.player_id into v_player_id from public.profiles p where p.id=auth.uid();
  if v_player_id is null then raise exception 'Necesitas una cuenta vinculada a un jugador'; end if;

  select count(*) into v_game_count from public.game_definitions where active=true;
  if v_game_count=0 then raise exception 'No hay juegos activos'; end if;

  select dc.id into v_challenge_id from public.daily_challenges dc where dc.challenge_date=v_date;

  if v_challenge_id is null then
    v_offset := (((v_date-date '2026-09-09') % v_game_count)+v_game_count) % v_game_count;
    select gd.id into v_game_id
    from public.game_definitions gd
    where gd.active=true
    order by gd.sort_order,gd.id
    offset v_offset limit 1;

    insert into public.daily_challenges(challenge_date,game_id,max_attempts)
    select v_date,gd.id,gd.default_attempts
    from public.game_definitions gd where gd.id=v_game_id
    on conflict on constraint daily_challenges_challenge_date_key do nothing;
  end if;

  return query
  select dc.id,dc.challenge_date,gd.id,gd.name,gd.description,gd.scoring_direction,gd.unit,
         dc.max_attempts::integer,(gd.config||dc.config),count(ga.id)::integer,
         greatest(dc.max_attempts-count(ga.id),0)::integer,
         case when gd.scoring_direction='lower' then min(ga.score) else max(ga.score) end
  from public.daily_challenges dc
  join public.game_definitions gd on gd.id=dc.game_id
  left join public.game_attempts ga on ga.challenge_id=dc.id and ga.player_id=v_player_id
  where dc.challenge_date=v_date
  group by dc.id,dc.challenge_date,gd.id,gd.name,gd.description,gd.scoring_direction,gd.unit,dc.max_attempts,gd.config,dc.config;
end;
$$;

create or replace function public.start_daily_game_attempt()
returns table(attempt_id uuid,attempt_no integer,game_id text,seed bigint,config jsonb,attempts_remaining integer)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_player_id bigint;
  v_challenge_id uuid;
  v_game_id text;
  v_config jsonb;
  v_max_attempts integer;
  v_used integer;
  v_attempt_id uuid;
  v_attempt_no integer;
  v_seed bigint;
begin
  select p.player_id into v_player_id from public.profiles p where p.id=auth.uid();
  if v_player_id is null then raise exception 'Necesitas una cuenta vinculada a un jugador'; end if;

  select c.challenge_id into v_challenge_id from public.get_or_create_daily_challenge() c limit 1;
  perform pg_advisory_xact_lock(hashtext(v_challenge_id::text),v_player_id::integer);

  select dc.game_id,(gd.config||dc.config),dc.max_attempts
  into v_game_id,v_config,v_max_attempts
  from public.daily_challenges dc
  join public.game_definitions gd on gd.id=dc.game_id
  where dc.id=v_challenge_id and dc.status='active';

  if v_game_id is null then raise exception 'El reto de hoy no está disponible'; end if;

  select count(*) into v_used from public.game_attempts ga
  where ga.challenge_id=v_challenge_id and ga.player_id=v_player_id;
  if v_used>=v_max_attempts then raise exception 'No te quedan intentos hoy'; end if;

  v_attempt_no:=v_used+1;
  v_seed:=floor(random()*2147483647)::bigint;
  insert into public.game_attempts(challenge_id,player_id,attempt_no,seed)
  values(v_challenge_id,v_player_id,v_attempt_no,v_seed)
  returning id into v_attempt_id;

  return query select v_attempt_id,v_attempt_no,v_game_id,v_seed,v_config,(v_max_attempts-v_attempt_no);
end;
$$;

create or replace function public.finish_daily_game_attempt(
  p_attempt_id uuid,
  p_score double precision,
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
begin
  select p.player_id into v_player_id from public.profiles p where p.id=auth.uid();
  if v_player_id is null then raise exception 'Necesitas una cuenta vinculada a un jugador'; end if;

  select * into v_attempt from public.game_attempts
  where id=p_attempt_id and player_id=v_player_id for update;
  if v_attempt.id is null then raise exception 'Intento no encontrado'; end if;
  if v_attempt.status<>'started' then raise exception 'Este intento ya está cerrado'; end if;

  select dc.game_id,gd.scoring_direction,(gd.config||dc.config),dc.max_attempts
  into v_game_id,v_direction,v_config,v_max_attempts
  from public.daily_challenges dc join public.game_definitions gd on gd.id=dc.game_id
  where dc.id=v_attempt.challenge_id;

  if p_duration_ms is null or p_duration_ms<0 or p_duration_ms>30000 then v_valid:=false; end if;
  if p_score is null or p_score::text in ('NaN','Infinity','-Infinity') then v_valid:=false; end if;

  v_server_elapsed:=floor(extract(epoch from(now()-v_attempt.started_at))*1000)::integer;
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
  end if;

  update public.game_attempts
  set status=case when v_valid then 'completed' else 'invalid' end,
      completed_at=now(),
      score=case when v_valid then p_score else null end,
      duration_ms=p_duration_ms,
      metadata=coalesce(p_metadata,'{}'::jsonb)
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

create or replace function public.get_daily_game_leaderboard()
returns table(rank bigint,player_id bigint,nickname text,photo_url text,best_score double precision,attempts integer)
language sql
security definer
set search_path=public
as $$
  with today as(
    select dc.id,gd.scoring_direction
    from public.daily_challenges dc join public.game_definitions gd on gd.id=dc.game_id
    where dc.challenge_date=(now() at time zone 'Europe/Madrid')::date
  ), ranked_attempts as(
    select ga.player_id,ga.score,ga.completed_at,
      row_number() over(partition by ga.player_id order by
        case when t.scoring_direction='lower' then ga.score end asc nulls last,
        case when t.scoring_direction='higher' then ga.score end desc nulls last,
        ga.completed_at asc) as rn,
      count(*) over(partition by ga.player_id)::integer as attempts
    from public.game_attempts ga join today t on t.id=ga.challenge_id
    where ga.status='completed'
  ), best as(select * from ranked_attempts where rn=1)
  select row_number() over(order by
           case when t.scoring_direction='lower' then b.score end asc nulls last,
           case when t.scoring_direction='higher' then b.score end desc nulls last,
           b.completed_at asc),
         b.player_id,p.nickname,p.photo_url,b.score,b.attempts
  from best b join public.players p on p.id=b.player_id cross join today t
  order by 1;
$$;

revoke all on function public.get_or_create_daily_challenge() from public,anon;
revoke all on function public.start_daily_game_attempt() from public,anon;
revoke all on function public.finish_daily_game_attempt(uuid,double precision,integer,jsonb) from public,anon;
revoke all on function public.get_daily_game_leaderboard() from public,anon;
grant execute on function public.get_or_create_daily_challenge() to authenticated;
grant execute on function public.start_daily_game_attempt() to authenticated;
grant execute on function public.finish_daily_game_attempt(uuid,double precision,integer,jsonb) to authenticated;
grant execute on function public.get_daily_game_leaderboard() to authenticated;
