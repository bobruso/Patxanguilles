-- Transitional account rollout security.
-- Anonymous legacy policies remain untouched so the current no-account flow keeps working.
-- Authenticated-but-unlinked accounts cannot mutate match data.

-- MATCHES
drop policy if exists "Authenticated insertar matches" on public.matches;
drop policy if exists "Authenticated modificar matches" on public.matches;
drop policy if exists "Authenticated eliminar matches" on public.matches;

create policy "Authenticated vinculados insertar matches"
on public.matches for insert to authenticated
with check (
  exists (select 1 from public.profiles p where p.id=auth.uid() and (p.player_id is not null or p.role='admin'))
);

create policy "Authenticated vinculados modificar matches"
on public.matches for update to authenticated
using (
  exists (select 1 from public.profiles p where p.id=auth.uid() and (p.player_id is not null or p.role='admin'))
)
with check (
  exists (select 1 from public.profiles p where p.id=auth.uid() and (p.player_id is not null or p.role='admin'))
);

create policy "Solo admin eliminar matches"
on public.matches for delete to authenticated
using (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
);

-- MATCH EVENTS
drop policy if exists "Authenticated insertar match_events" on public.match_events;
drop policy if exists "Authenticated modificar match_events" on public.match_events;
drop policy if exists "Authenticated eliminar match_events" on public.match_events;

create policy "Authenticated vinculados insertar match_events"
on public.match_events for insert to authenticated
with check (
  exists (select 1 from public.profiles p where p.id=auth.uid() and (p.player_id is not null or p.role='admin'))
);

create policy "Authenticated vinculados modificar match_events"
on public.match_events for update to authenticated
using (
  exists (select 1 from public.profiles p where p.id=auth.uid() and (p.player_id is not null or p.role='admin'))
)
with check (
  exists (select 1 from public.profiles p where p.id=auth.uid() and (p.player_id is not null or p.role='admin'))
);

create policy "Authenticated vinculados eliminar match_events"
on public.match_events for delete to authenticated
using (
  exists (select 1 from public.profiles p where p.id=auth.uid() and (p.player_id is not null or p.role='admin'))
);

-- MATCH PLAYERS
drop policy if exists "Authenticated insertar match_players" on public.match_players;
drop policy if exists "Authenticated modificar match_players" on public.match_players;
drop policy if exists "Authenticated eliminar match_players" on public.match_players;

create policy "Authenticated vinculados insertar match_players"
on public.match_players for insert to authenticated
with check (
  exists (select 1 from public.profiles p where p.id=auth.uid() and (p.player_id is not null or p.role='admin'))
);

create policy "Authenticated vinculados modificar match_players"
on public.match_players for update to authenticated
using (
  exists (select 1 from public.profiles p where p.id=auth.uid() and (p.player_id is not null or p.role='admin'))
)
with check (
  exists (select 1 from public.profiles p where p.id=auth.uid() and (p.player_id is not null or p.role='admin'))
);

create policy "Authenticated vinculados eliminar match_players"
on public.match_players for delete to authenticated
using (
  exists (select 1 from public.profiles p where p.id=auth.uid() and (p.player_id is not null or p.role='admin'))
);

-- MATCH PLAYER GPS
drop policy if exists "Authenticated insertar match_player_gps" on public.match_player_gps;
drop policy if exists "Authenticated modificar match_player_gps" on public.match_player_gps;
drop policy if exists "Authenticated eliminar match_player_gps" on public.match_player_gps;

create policy "Authenticated vinculados insertar match_player_gps"
on public.match_player_gps for insert to authenticated
with check (
  exists (select 1 from public.profiles p where p.id=auth.uid() and (p.player_id is not null or p.role='admin'))
);

create policy "Authenticated vinculados modificar match_player_gps"
on public.match_player_gps for update to authenticated
using (
  exists (select 1 from public.profiles p where p.id=auth.uid() and (p.player_id is not null or p.role='admin'))
)
with check (
  exists (select 1 from public.profiles p where p.id=auth.uid() and (p.player_id is not null or p.role='admin'))
);

create policy "Solo admin eliminar match_player_gps"
on public.match_player_gps for delete to authenticated
using (
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
);
