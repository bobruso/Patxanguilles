-- Patxanguilles: identidad de cuentas ligada a players.
-- Aplicada inicialmente al proyecto Supabase el 2026-09-08.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists player_id bigint references public.players(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists profiles_player_id_unique
  on public.profiles(player_id)
  where player_id is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('user','admin'));
  end if;
end $$;

create table if not exists public.player_account_invites (
  id uuid primary key default gen_random_uuid(),
  player_id bigint not null references public.players(id) on delete cascade,
  code_hash bytea not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists player_account_invites_player_idx
  on public.player_account_invites(player_id);
create index if not exists player_account_invites_active_idx
  on public.player_account_invites(player_id, expires_at)
  where used_at is null;

alter table public.player_account_invites enable row level security;
revoke all on public.player_account_invites from anon, authenticated;

create or replace function public.current_player_id()
returns bigint
language sql
stable
security definer
set search_path = public, auth
as $$
  select p.player_id
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce((
    select p.role = 'admin'
    from public.profiles p
    where p.id = auth.uid()
    limit 1
  ), false);
$$;

revoke all on function public.current_player_id() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.current_player_id() to authenticated;
grant execute on function public.is_admin() to authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), ''),
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

create or replace function public.admin_create_player_invite(
  p_player_id bigint,
  p_valid_hours integer default 168
)
returns table(invite_code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_code text;
  v_expires timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede generar invitaciones';
  end if;

  if p_valid_hours < 1 or p_valid_hours > 720 then
    raise exception 'La validez debe estar entre 1 y 720 horas';
  end if;

  if not exists (select 1 from public.players where id = p_player_id) then
    raise exception 'Jugador no encontrado';
  end if;

  if exists (select 1 from public.profiles where player_id = p_player_id) then
    raise exception 'Este jugador ya tiene una cuenta vinculada';
  end if;

  update public.player_account_invites
  set used_at = now()
  where player_id = p_player_id
    and used_at is null;

  v_code := lpad((floor(random() * 1000000))::integer::text, 6, '0');
  v_expires := now() + make_interval(hours => p_valid_hours);

  insert into public.player_account_invites(
    player_id, code_hash, expires_at, created_by
  ) values (
    p_player_id,
    digest(v_code, 'sha256'),
    v_expires,
    auth.uid()
  );

  return query select v_code, v_expires;
end;
$$;

revoke all on function public.admin_create_player_invite(bigint, integer) from public;
grant execute on function public.admin_create_player_invite(bigint, integer) to authenticated;

create or replace function public.claim_player_profile(
  p_player_id bigint,
  p_invite_code text
)
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid;
  v_invite public.player_account_invites%rowtype;
  v_profile public.profiles%rowtype;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Debes iniciar sesión antes de vincular tu jugador';
  end if;

  if p_invite_code is null or length(trim(p_invite_code)) <> 6 then
    raise exception 'Código de invitación no válido';
  end if;

  if exists (select 1 from public.profiles where id = v_uid and player_id is not null) then
    raise exception 'Esta cuenta ya está vinculada a un jugador';
  end if;

  if exists (select 1 from public.profiles where player_id = p_player_id and id <> v_uid) then
    raise exception 'Este jugador ya tiene una cuenta vinculada';
  end if;

  select * into v_invite
  from public.player_account_invites
  where player_id = p_player_id
    and used_at is null
    and expires_at > now()
    and code_hash = digest(trim(p_invite_code), 'sha256')
  order by created_at desc
  limit 1
  for update;

  if v_invite.id is null then
    raise exception 'Código incorrecto, caducado o ya utilizado';
  end if;

  insert into public.profiles(id, display_name, role, player_id, updated_at)
  select v_uid, pl.nickname, 'user', pl.id, now()
  from public.players pl
  where pl.id = p_player_id
  on conflict (id) do update
    set player_id = excluded.player_id,
        display_name = excluded.display_name,
        updated_at = now()
  returning * into v_profile;

  update public.player_account_invites
  set used_at = now(), used_by = v_uid
  where id = v_invite.id;

  return v_profile;
end;
$$;

revoke all on function public.claim_player_profile(bigint, text) from public;
grant execute on function public.claim_player_profile(bigint, text) to authenticated;

create or replace function public.list_claimable_players()
returns table(id bigint, nickname text, photo_url text)
language sql
stable
security definer
set search_path = public, auth
as $$
  select distinct pl.id, pl.nickname, pl.photo_url
  from public.players pl
  join public.player_account_invites i on i.player_id = pl.id
  left join public.profiles pr on pr.player_id = pl.id
  where i.used_at is null
    and i.expires_at > now()
    and pr.id is null
  order by pl.nickname;
$$;

revoke all on function public.list_claimable_players() from public;
grant execute on function public.list_claimable_players() to anon, authenticated;

create or replace function public.get_my_account()
returns table(
  user_id uuid,
  player_id bigint,
  display_name text,
  role text,
  player_nickname text,
  player_full_name text,
  player_photo_url text,
  player_card_url text
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select pr.id, pr.player_id, pr.display_name, pr.role,
         pl.nickname, pl.full_name, pl.photo_url, pl.card_url
  from public.profiles pr
  left join public.players pl on pl.id = pr.player_id
  where pr.id = auth.uid();
$$;

revoke all on function public.get_my_account() from public;
grant execute on function public.get_my_account() to authenticated;

drop policy if exists "Admin puede ver perfiles" on public.profiles;
create policy "Admin puede ver perfiles"
on public.profiles for select
to authenticated
using (public.is_admin());
