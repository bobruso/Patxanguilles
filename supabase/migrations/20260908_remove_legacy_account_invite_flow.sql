-- The first account prototype used pre-generated manual invitations.
-- It has been superseded by the self-service request -> Telegram code -> verified registration flow.

drop function if exists public.admin_create_player_invite(bigint,integer);
drop function if exists public.claim_player_profile(bigint,text);
drop function if exists public.list_claimable_players();
drop table if exists public.player_account_invites;
