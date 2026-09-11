alter table public.card_generations
  add column if not exists publication_status text,
  add column if not exists publication_path text,
  add column if not exists publication_url text,
  add column if not exists publication_sha256 text,
  add column if not exists github_blob_sha text,
  add column if not exists publication_attempts integer not null default 0,
  add column if not exists publication_error text,
  add column if not exists publication_started_at timestamptz,
  add column if not exists published_at timestamptz;

update public.card_generations
set publication_status = 'generated'
where status = 'completed'
  and image_url is not null
  and publication_status is null;

alter table public.card_generations
  drop constraint if exists card_generations_publication_status_check,
  add constraint card_generations_publication_status_check
    check (publication_status is null or publication_status = any (array[
      'generated'::text,
      'publishing'::text,
      'published'::text,
      'publication_error'::text
    ])),
  drop constraint if exists card_generations_publication_attempts_check,
  add constraint card_generations_publication_attempts_check
    check (publication_attempts >= 0),
  drop constraint if exists card_generations_publication_sha256_check,
  add constraint card_generations_publication_sha256_check
    check (publication_sha256 is null or publication_sha256 ~ '^[0-9a-f]{64}$');

create unique index if not exists card_generations_publication_path_uidx
  on public.card_generations (publication_path)
  where publication_path is not null;

create index if not exists card_generations_publication_status_idx
  on public.card_generations (publication_status)
  where publication_status in ('generated', 'publishing', 'publication_error');

create or replace function public.complete_card_publication(
  p_generation_id bigint,
  p_publication_path text,
  p_publication_url text,
  p_publication_sha256 text,
  p_github_blob_sha text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_player_id bigint;
begin
  update public.card_generations
  set publication_status = 'published',
      publication_path = p_publication_path,
      publication_url = p_publication_url,
      publication_sha256 = p_publication_sha256,
      github_blob_sha = p_github_blob_sha,
      publication_error = null,
      published_at = now()
  where id = p_generation_id
    and publication_status = 'publishing'
  returning player_id into v_player_id;

  if v_player_id is null then
    raise exception 'Generation % is not in publishing state', p_generation_id;
  end if;

  update public.players
  set card_url = p_publication_url
  where id = v_player_id;

  if not found then
    raise exception 'Player % does not exist', v_player_id;
  end if;
end;
$$;

revoke all on function public.complete_card_publication(bigint, text, text, text, text) from public;
revoke all on function public.complete_card_publication(bigint, text, text, text, text) from anon;
revoke all on function public.complete_card_publication(bigint, text, text, text, text) from authenticated;
grant execute on function public.complete_card_publication(bigint, text, text, text, text) to service_role;
