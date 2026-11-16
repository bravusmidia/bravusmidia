-- Bravus Work v1.9: administrador define a senha de um membro da equipe
create or replace function public.admin_set_password(target uuid, new_password text) returns void
language plpgsql security definer set search_path = public, extensions, auth as $$
begin
  if not is_admin() then raise exception 'Somente o administrador pode alterar senhas'; end if;
  if length(coalesce(new_password, '')) < 6 then raise exception 'A senha precisa ter pelo menos 6 caracteres'; end if;
  if not exists (select 1 from public.profiles where id = target and agency_id = my_agency()) then raise exception 'Membro não encontrado'; end if;
  update auth.users set encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')), updated_at = now() where id = target;
end $$;
revoke all on function public.admin_set_password(uuid, text) from public, anon;
grant execute on function public.admin_set_password(uuid, text) to authenticated;
-- Só administrador cadastra e altera clientes
drop policy if exists clients_ins on clients; drop policy if exists clients_upd on clients;
create policy clients_ins on clients for insert with check (agency_id = my_agency() and is_admin());
create policy clients_upd on clients for update using (agency_id = my_agency() and is_admin());
-- Equipe pode ler os ajustes (metas, motivos, horários); só admin altera
drop policy if exists st_sel on settings;
create policy st_sel on settings for select using (agency_id = my_agency() and is_team());
