-- Bravus Work v3.6 — reforço de segurança (pode rodar mais de uma vez)
-- 1) Funções internas de alerta não podem ser chamadas de fora.
--    A chave pública (anon) fica no navegador; sem este bloqueio, qualquer pessoa
--    poderia criar avisos/push falsos para a equipe chamando bw_notify pela API.
--    Os agendamentos (pg_cron) rodam como "postgres" e continuam funcionando.
do $$
declare f text;
begin
  foreach f in array array[
    'public.bw_notify(uuid,uuid,text,text,text,text,text)',
    'public.bw_daily_alerts()',
    'public.bw_task_alerts()',
    'public.bw_reminder_alerts()'
  ] loop
    if to_regprocedure(f) is not null then
      execute format('revoke execute on function %s from public, anon, authenticated', f);
    end if;
  end loop;
end $$;

-- 2) Membro não pode trocar o próprio cargo nem mudar de agência pelo perfil.
drop policy if exists pr_upd_self on profiles;
create policy pr_upd_self on profiles for update using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from profiles p where p.id = auth.uid())
    and agency_id is not distinct from (select p.agency_id from profiles p where p.id = auth.uid())
  );

-- 3) Conferência: tudo deve vir "false" (ninguém de fora executa as funções internas)
select
  has_function_privilege('anon', 'public.bw_notify(uuid,uuid,text,text,text,text,text)', 'execute') as anon_bw_notify,
  has_function_privilege('authenticated', 'public.bw_notify(uuid,uuid,text,text,text,text,text)', 'execute') as auth_bw_notify,
  has_function_privilege('anon', 'public.bw_task_alerts()', 'execute') as anon_task_alerts,
  has_function_privilege('anon', 'public.bw_daily_alerts()', 'execute') as anon_daily_alerts;
