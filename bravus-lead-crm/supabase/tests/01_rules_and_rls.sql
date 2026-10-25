-- Testes de regras de negócio e RLS. Rodar em banco de teste (veja docs/TESTES.md).
\set ON_ERROR_STOP 1
create or replace function pg_temp.expect_error(p_sql text, p_hint text) returns void language plpgsql as $$
begin
  begin execute p_sql; exception when others then raise notice 'OK (bloqueado): % -> %', p_hint, sqlerrm; return; end;
  raise exception 'FALHOU: deveria ter bloqueado: %', p_hint;
end $$;
create or replace function pg_temp.ok(p_cond boolean, p_hint text) returns void language plpgsql as $$
begin if not p_cond then raise exception 'FALHOU: %', p_hint; end if; raise notice 'OK: %', p_hint; end $$;

insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-0000-0000-00000000000a','andrade@bravus.test',now()),
 ('00000000-0000-0000-0000-00000000000b','priscila@bravus.test',now()),
 ('00000000-0000-0000-0000-00000000000c','intruso@outra.test',now());

-- dono cria a organização
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public.create_organization('Bravus Mídia') as org \gset
select pg_temp.ok((select count(*) from pipeline_stages) = 14, '14 etapas padrão criadas');
select pg_temp.ok((select count(*) from automations) = 8, '8 automações padrão');
select pg_temp.expect_error($$select public.create_organization('Outra')$$, 'dono não cria segunda organização');

-- convite para a funcionária
insert into invitations(org_id,email,role,job_title) values (:'org','priscila@bravus.test','seller','Comercial');
select pg_temp.expect_error(format($$insert into invitations(org_id,email,role) values (%L,'x@y.z','owner')$$, :'org'), 'convite como proprietário');

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.ok(public.accept_invitations() = 1, 'funcionária aceitou convite');
select pg_temp.ok((select role from memberships where user_id = auth.uid()) = 'seller', 'funcionária entrou como vendedora');
update memberships set role='admin' where user_id = auth.uid();
select pg_temp.ok((select count(*) from memberships where role='admin') = 0, 'nenhum admin criado pela vendedora');

-- lead criado pela vendedora
insert into leads(org_id, full_name, company, phone_original, phone_e164, phone_valid, stage_id)
  select :'org', 'João Teste', 'Padaria Sol', '(85) 99999-0000', '+5585999990000', true, id from pipeline_stages where position = 1
  returning id as lead \gset
select pg_temp.ok((select count(*) from tasks where lead_id = :'lead' and source='automation') = 1, 'automação criou tarefa de qualificação');
select pg_temp.ok((select count(*) from automation_runs) >= 1, 'execução registrada no log');

-- transições controladas
select pg_temp.expect_error(format($$update leads set stage_id = (select id from pipeline_stages where kind='won') where id=%L$$, :'lead'), 'ganho sem venda registrada');
select pg_temp.expect_error(format($$update leads set stage_id = (select id from pipeline_stages where kind='lost') where id=%L$$, :'lead'), 'perdido sem motivo');
update leads set stage_id = (select id from pipeline_stages where kind='waiting') where id = :'lead';
select pg_temp.ok((select waiting_on from leads where id=:'lead') = 'lead', 'etapa de espera marca aguardando o lead');
select pg_temp.ok((select count(*) from stage_history where lead_id=:'lead') = 1, 'histórico de etapa registrado');

insert into sales(org_id, lead_id, service_id, monthly_value, closed_at)
  select :'org', :'lead', id, 1500, current_date from services where name = 'Gestão de Tráfego Pago';
update leads set stage_id = (select id from pipeline_stages where kind='won') where id = :'lead';
select pg_temp.ok((select won_at is not null from leads where id=:'lead'), 'venda ganha com registro de venda');
select pg_temp.ok((select count(*) from clients where lead_id=:'lead') = 1, 'cliente criado automaticamente na venda');

-- pagamento: vendedora não confirma recebimento
select pg_temp.expect_error(format($$insert into payments(org_id, amount, due_date, status, paid_at, confirmed_by) values (%L, 100, current_date, 'paid', current_date, auth.uid())$$, :'org'), 'vendedora confirmando pagamento');

-- opt-out: consentimento revogado bloqueia e vai para supressão
insert into consents(org_id, lead_id, status, source) values (:'org', :'lead', 'revoked', 'pediu por telefone');
select pg_temp.ok((select opted_out from leads where id=:'lead'), 'lead marcado como opt-out');
select pg_temp.ok((select count(*) from suppression_list where phone_e164='+5585999990000') = 1, 'número na lista de supressão');
delete from suppression_list;
select pg_temp.ok((select count(*) from suppression_list) = 1, 'vendedora não remove supressão');
select pg_temp.ok((select count(*) from audit_logs) = 0, 'vendedora não lê auditoria');

-- intruso de outra empresa não vê nada
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select pg_temp.ok((select count(*) from leads) = 0, 'intruso não vê leads');
select pg_temp.ok((select count(*) from clients) = 0, 'intruso não vê clientes');
select pg_temp.expect_error(format($$insert into leads(org_id, full_name) values (%L, 'hack')$$, :'org'), 'intruso inserindo lead');
update leads set full_name = 'hack';
reset role;
select pg_temp.ok((select count(*) from leads where full_name='hack') = 0, 'intruso não altera leads');

-- dono lê auditoria e não pode ser removido sendo o único
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.ok((select count(*) from audit_logs) > 0, 'dono lê auditoria');
select pg_temp.expect_error($$update memberships set active=false where role='owner'$$, 'remover único proprietário');
reset role;
\echo 'TODOS OS TESTES PASSARAM'
