drop policy if exists "Authenticated modificar players" on public.players;
drop policy if exists "Authenticated insertar players" on public.players;
drop policy if exists "Authenticated eliminar players" on public.players;

create policy "Authenticated vinculados modificar players"
on public.players
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (p.player_id is not null or p.role = 'admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (p.player_id is not null or p.role = 'admin')
  )
);

create policy "Authenticated vinculados insertar players"
on public.players
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (p.player_id is not null or p.role = 'admin')
  )
);

create policy "Solo admin eliminar players"
on public.players
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);
