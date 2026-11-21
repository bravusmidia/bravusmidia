-- BRAVUS WORK v2.9.1 · remove qualquer conexão com o Asaas
-- Rode uma vez no Supabase: SQL Editor → New query → cole tudo → Run.

-- 1) Cobranças que vieram do Asaas viram mensalidades normais (status e valores ficam como estão)
update invoices
   set description = 'Mensalidade ' || to_char(due_date, 'MM/YYYY')
 where description ilike '%asaas%';
update invoices set method = 'Pix' where method ilike '%asaas%';

-- 2) Apaga as colunas do Asaas
alter table invoices drop column if exists asaas_id;
alter table clients  drop column if exists asaas_customer_id;

-- 3) Remove agendamentos e funções do banco ligados ao Asaas (se existirem)
do $$
declare r record;
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    for r in select jobid from cron.job where command ilike '%asaas%' or jobname ilike '%asaas%' loop
      perform cron.unschedule(r.jobid);
    end loop;
  end if;
  for r in select p.oid::regprocedure as f from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and (p.proname ilike '%asaas%' or p.prosrc ilike '%asaas%') loop
    execute 'drop function if exists ' || r.f || ' cascade';
  end loop;
end $$;

-- 4) Limpa chaves do Asaas salvas nos Ajustes (se houver)
update settings set data = data - 'asaas' - 'asaas_key' - 'asaas_api_key' - 'asaas_webhook_token' - 'asaas_env'
 where data::text ilike '%asaas%';

-- 5) Conferência: tudo deve voltar 0
select (select count(*) from invoices where description ilike '%asaas%') as cobrancas_asaas,
       (select count(*) from settings where data::text ilike '%asaas%')   as ajustes_asaas;
