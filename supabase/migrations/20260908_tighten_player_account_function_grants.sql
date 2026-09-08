-- Endurece permisos de las RPC de identidad.
-- Supabase puede dejar grants explícitos a anon/authenticated al crear funciones públicas.

revoke execute on function public.admin_create_player_invite(bigint, integer) from anon;
revoke execute on function public.claim_player_profile(bigint, text) from anon;
revoke execute on function public.current_player_id() from anon;
revoke execute on function public.get_my_account() from anon;
revoke execute on function public.is_admin() from anon;
revoke execute on function public.handle_new_auth_user() from anon, authenticated;

grant execute on function public.admin_create_player_invite(bigint, integer) to authenticated;
grant execute on function public.claim_player_profile(bigint, text) to authenticated;
grant execute on function public.current_player_id() to authenticated;
grant execute on function public.get_my_account() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- Esta función es pública de forma intencionada: solo devuelve id, apodo y foto
-- de jugadores que disponen de una invitación activa. Nunca devuelve el código ni su hash.
grant execute on function public.list_claimable_players() to anon, authenticated;
