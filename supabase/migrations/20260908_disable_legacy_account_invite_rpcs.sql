-- The account flow now starts when a player requests registration.
-- Legacy manually-generated invite RPCs are kept in the database for rollback/history,
-- but client roles must not be able to invoke them.

revoke execute on function public.list_claimable_players() from anon, authenticated;
revoke execute on function public.claim_player_profile(bigint,text) from anon, authenticated;
revoke execute on function public.admin_create_player_invite(bigint,integer) from anon, authenticated;
