drop policy if exists "Authenticated subir fotos jugadores" on storage.objects;
drop policy if exists "Authenticated actualizar fotos jugadores" on storage.objects;
drop policy if exists "Authenticated borrar fotos jugadores" on storage.objects;

create policy "Authenticated vinculados subir player photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'player-photos'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.player_id is not null or p.role = 'admin')
  )
);

create policy "Authenticated vinculados actualizar player photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'player-photos'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.player_id is not null or p.role = 'admin')
  )
)
with check (
  bucket_id = 'player-photos'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.player_id is not null or p.role = 'admin')
  )
);

create policy "Solo admin borrar player photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'player-photos'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);
