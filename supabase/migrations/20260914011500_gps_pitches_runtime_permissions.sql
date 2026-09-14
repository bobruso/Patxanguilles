-- Patxanguilles v227
-- Permite que la lectura runtime de gps_pitches evalúe las policies que usan
-- public.is_admin(), sin otorgar permisos de administración ni escritura.

grant select on table public.gps_pitches to anon, authenticated;

do $$
begin
  if to_regprocedure('public.is_admin()') is not null then
    execute 'grant execute on function public.is_admin() to anon, authenticated';
  end if;
end
$$;
