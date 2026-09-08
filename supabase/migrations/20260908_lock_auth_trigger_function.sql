-- La función del trigger de auth no debe ser invocable como RPC desde el cliente.
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
