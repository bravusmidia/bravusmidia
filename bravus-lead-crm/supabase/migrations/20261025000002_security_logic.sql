-- =====================================================================
-- BRAVUS LEAD CRM — Regras de negócio, gatilhos, automações e RLS
-- =====================================================================

-- ---------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$ declare t text; begin
  foreach t in array array['organizations','profiles','leads','tasks','prospects','clients','proposals','sales','conversations','integrations'] loop
    execute format('drop trigger if exists trg_touch_%1$s on %1$s; create trigger trg_touch_%1$s before update on %1$s for each row execute function public.touch_updated_at();', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Auditoria genérica (guarda só os campos alterados)
-- ---------------------------------------------------------------------
create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_changes jsonb; v_org uuid; v_id uuid;
begin
  if tg_op = 'DELETE' then
    v_org := old.org_id; v_id := old.id; v_changes := to_jsonb(old);
  elsif tg_op = 'INSERT' then
    v_org := new.org_id; v_id := new.id; v_changes := to_jsonb(new);
  else
    v_org := new.org_id; v_id := new.id;
    select jsonb_object_agg(n.key, jsonb_build_object('de', o.value, 'para', n.value)) into v_changes
      from jsonb_each(to_jsonb(new)) n join jsonb_each(to_jsonb(old)) o using (key)
     where n.value is distinct from o.value and n.key not in ('updated_at');
    if v_changes is null then return new; end if;
  end if;
  insert into audit_logs(org_id, actor_id, table_name, record_id, action, changes)
  values (v_org, auth.uid(), tg_table_name, v_id, lower(tg_op), v_changes);
  return coalesce(new, old);
end $$;

do $$ declare t text; begin
  foreach t in array array['leads','clients','sales','payments','proposals','memberships','invitations','consents','suppression_list','integrations','automations','pipeline_stages','services'] loop
    execute format('drop trigger if exists trg_audit_%1$s on %1$s; create trigger trg_audit_%1$s after insert or update or delete on %1$s for each row execute function public.audit_row();', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Motor de automações (idempotente: 1 execução por automação+evento)
-- ---------------------------------------------------------------------
create or replace function public.run_automations(p_org uuid, p_trigger text, p_lead uuid, p_event_key text, p_ctx jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare a record; v_lead leads%rowtype; v_outcome text; v_detail text; v_due timestamptz;
begin
  if p_lead is not null then select * into v_lead from leads where id = p_lead; end if;
  for a in select * from automations where org_id = p_org and trigger = p_trigger and active loop
    -- condições simples
    if a.conditions ? 'stage_kind' and coalesce(p_ctx->>'stage_kind','') <> a.conditions->>'stage_kind' then continue; end if;
    if a.conditions ? 'stage_id' and coalesce(p_ctx->>'stage_id','') <> a.conditions->>'stage_id' then continue; end if;
    if a.conditions ? 'source' and coalesce(v_lead.source,'') <> a.conditions->>'source' then continue; end if;

    -- idempotência
    begin
      insert into automation_runs(org_id, automation_id, event_key, outcome) values (p_org, a.id, p_event_key, 'skipped');
    exception when unique_violation then continue; end;

    v_outcome := case when a.simulate then 'simulated' else 'executed' end;
    v_detail := a.action;
    begin
      if not a.simulate then
        if a.action = 'create_task' and p_lead is not null then
          v_due := now() + make_interval(days => coalesce((a.params->>'days')::int, 1));
          insert into tasks(org_id, lead_id, assignee_id, type, title, priority, due_at, source, created_by)
          values (p_org, p_lead, v_lead.owner_id, coalesce(a.params->>'type','follow_up'),
                  coalesce(a.params->>'title', a.name), coalesce(a.params->>'priority','normal'), v_due, 'automation', null);
        elsif a.action = 'notify_admins' then
          insert into notifications(org_id, user_id, title, body, link)
          select p_org, m.user_id, a.name, coalesce(p_ctx->>'message', v_lead.full_name), case when p_lead is not null then '/leads?id='||p_lead end
            from memberships m where m.org_id = p_org and m.active and m.role in ('owner','admin');
        elsif a.action = 'notify_owner' and v_lead.owner_id is not null then
          insert into notifications(org_id, user_id, title, body, link)
          values (p_org, v_lead.owner_id, a.name, v_lead.full_name, '/leads?id='||p_lead);
        elsif a.action = 'update_last_interaction' and p_lead is not null then
          update leads set last_interaction_at = now() where id = p_lead;
        elsif a.action = 'suppress_contact' and v_lead.phone_e164 is not null then
          insert into suppression_list(org_id, phone_e164, reason, source, created_by)
          values (p_org, v_lead.phone_e164, 'opt_out', 'automacao', null) on conflict do nothing;
          update leads set opted_out = true, consent_status = 'revoked' where id = p_lead;
        elsif a.action = 'create_client' and p_lead is not null then
          if not exists (select 1 from clients where lead_id = p_lead) then
            insert into clients(org_id, lead_id, name, company, phone_e164, email, city, owner_id)
            values (p_org, p_lead, v_lead.full_name, v_lead.company, v_lead.phone_e164, v_lead.email, v_lead.city, v_lead.owner_id);
          end if;
        end if;
      end if;
    exception when others then v_outcome := 'error'; v_detail := sqlerrm; end;
    update automation_runs set outcome = v_outcome, detail = v_detail where automation_id = a.id and event_key = p_event_key;
  end loop;
end $$;
revoke execute on function public.run_automations(uuid,text,uuid,text,jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Leads: transições controladas do funil + histórico + automações
-- ---------------------------------------------------------------------
create or replace function public.leads_before_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_kind text;
begin
  if new.stage_id is not null and (tg_op = 'INSERT' or new.stage_id is distinct from old.stage_id) then
    select kind into v_kind from pipeline_stages where id = new.stage_id and org_id = new.org_id;
    if v_kind is null then raise exception 'Etapa inválida para esta organização'; end if;
    if v_kind = 'won' then
      if not exists (select 1 from sales s where s.lead_id = new.id and s.service_id is not null
                       and (s.setup_value + s.monthly_value) > 0) then
        raise exception 'Para marcar como venda ganha, registre antes a venda (serviço, valor e data de fechamento).';
      end if;
      new.won_at := coalesce(new.won_at, now()); new.lost_at := null;
    elsif v_kind = 'lost' then
      if coalesce(trim(new.lost_reason),'') = '' then
        raise exception 'Informe o motivo da perda para mover o lead para Fechado — perdido.';
      end if;
      new.lost_at := coalesce(new.lost_at, now()); new.won_at := null;
    else
      new.won_at := null; new.lost_at := null;
    end if;
    if v_kind = 'waiting' then new.waiting_on := 'lead'; end if;
  end if;
  if new.opted_out then new.consent_status := 'revoked'; end if;
  return new;
end $$;
drop trigger if exists trg_leads_before on leads;
create trigger trg_leads_before before insert or update on leads for each row execute function public.leads_before_write();

create or replace function public.leads_after_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_kind text;
begin
  if tg_op = 'INSERT' then
    perform run_automations(new.org_id, 'lead_created', new.id, 'lead_created:'||new.id);
  end if;
  if tg_op = 'UPDATE' and new.stage_id is distinct from old.stage_id then
    insert into stage_history(org_id, lead_id, from_stage, to_stage) values (new.org_id, new.id, old.stage_id, new.stage_id);
    insert into activities(org_id, lead_id, type, summary)
      select new.org_id, new.id, 'stage', 'Etapa alterada para: '||s.name from pipeline_stages s where s.id = new.stage_id;
    select kind into v_kind from pipeline_stages where id = new.stage_id;
    perform run_automations(new.org_id, 'stage_changed', new.id, 'stage:'||new.id||':'||coalesce(new.stage_id::text,'')||':'||extract(epoch from now())::bigint,
      jsonb_build_object('stage_id', new.stage_id, 'stage_kind', v_kind));
  end if;
  if tg_op = 'UPDATE' and new.opted_out and not old.opted_out and new.phone_e164 is not null then
    insert into suppression_list(org_id, phone_e164, reason, source) values (new.org_id, new.phone_e164, 'opt_out', 'cadastro do lead')
    on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists trg_leads_after on leads;
create trigger trg_leads_after after insert or update on leads for each row execute function public.leads_after_write();

-- atividade/tarefa atualiza "última interação"
create or replace function public.activity_touch_lead()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.lead_id is not null and new.type not in ('system','stage') then
    update leads set last_interaction_at = greatest(coalesce(last_interaction_at, new.occurred_at), new.occurred_at),
      last_attempt_at = case when new.type in ('call','message','email','attempt') and coalesce(new.direction,'outbound') = 'outbound'
                             then greatest(coalesce(last_attempt_at, new.occurred_at), new.occurred_at) else last_attempt_at end
     where id = new.lead_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_activity_touch on activities;
create trigger trg_activity_touch after insert on activities for each row execute function public.activity_touch_lead();

create or replace function public.tasks_before_write()
returns trigger language plpgsql as $$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then new.completed_at := now(); end if;
  if new.status <> 'done' then new.completed_at := null; end if;
  return new;
end $$;
drop trigger if exists trg_tasks_before on tasks;
create trigger trg_tasks_before before insert or update on tasks for each row execute function public.tasks_before_write();

-- proposta enviada → automações + revisão
create or replace function public.proposals_after_write()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and (new.items, new.setup_total, new.monthly_total, new.discount, new.conditions) is distinct from
                          (old.items, old.setup_total, old.monthly_total, old.discount, old.conditions) then
    insert into proposal_revisions(org_id, proposal_id, version, snapshot) values (old.org_id, old.id, old.version, to_jsonb(old));
    update proposals set version = old.version + 1 where id = new.id;
  end if;
  if new.status = 'sent' and (tg_op = 'INSERT' or old.status <> 'sent') then
    update proposals set sent_at = coalesce(sent_at, now()) where id = new.id;
    if new.lead_id is not null then
      insert into activities(org_id, lead_id, type, direction, summary) values (new.org_id, new.lead_id, 'proposal', 'outbound', 'Proposta enviada: '||new.title);
      perform run_automations(new.org_id, 'proposal_sent', new.lead_id, 'proposal_sent:'||new.id);
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_proposals_after on proposals;
create trigger trg_proposals_after after insert or update on proposals for each row
  when (pg_trigger_depth() < 2) execute function public.proposals_after_write();

-- venda registrada → automações (ex.: criar cliente)
create or replace function public.sales_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.lead_id is not null then
    insert into activities(org_id, lead_id, type, summary) values (new.org_id, new.lead_id, 'system', 'Venda registrada');
    perform run_automations(new.org_id, 'sale_won', new.lead_id, 'sale_won:'||new.id);
  end if;
  return new;
end $$;
drop trigger if exists trg_sales_after on sales;
create trigger trg_sales_after after insert on sales for each row execute function public.sales_after_insert();

-- supressão → automações de opt-out + bloqueio no lead
create or replace function public.suppression_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_lead uuid;
begin
  for v_lead in select id from leads where org_id = new.org_id and phone_e164 = new.phone_e164 loop
    update leads set opted_out = true, consent_status = 'revoked' where id = v_lead and not opted_out;
    if not exists (select 1 from consents where lead_id = v_lead and status = 'revoked' and recorded_at > now() - interval '1 minute') then
      insert into consents(org_id, lead_id, status, purpose, source, evidence, recorded_by)
        values (new.org_id, v_lead, 'revoked', 'all', coalesce(new.source,'lista de supressão'), new.reason, new.created_by);
    end if;
    perform run_automations(new.org_id, 'opt_out', v_lead, 'opt_out:'||new.id);
  end loop;
  return new;
end $$;
drop trigger if exists trg_suppression_after on suppression_list;
create trigger trg_suppression_after after insert on suppression_list for each row execute function public.suppression_after_insert();

-- consentimento → reflete no lead
create or replace function public.consents_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update leads set consent_status = new.status, consent_source = new.source, consent_at = new.recorded_at,
                   opted_out = (new.status = 'revoked')
   where id = new.lead_id and (consent_at is null or consent_at <= new.recorded_at);
  return new;
end $$;
drop trigger if exists trg_consents_after on consents;
create trigger trg_consents_after after insert on consents for each row
  when (pg_trigger_depth() < 2) execute function public.consents_after_insert();

-- mensagem recebida → atualiza lead e dispara automações
create or replace function public.messages_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_lead uuid;
begin
  select lead_id into v_lead from conversations where id = new.conversation_id;
  if new.direction = 'inbound' then
    update conversations set last_inbound_at = new.created_at, unread_count = unread_count + 1,
           last_message_preview = left(coalesce(new.body, '['||new.type||']'), 140), updated_at = now()
     where id = new.conversation_id;
    if v_lead is not null then
      update leads set last_inbound_at = new.created_at, last_interaction_at = new.created_at, waiting_on = 'team' where id = v_lead;
      perform run_automations(new.org_id, 'message_received', v_lead, 'msg:'||new.id);
    end if;
  else
    update conversations set last_outbound_at = new.created_at, last_message_preview = left(coalesce(new.body, new.template_name, ''), 140), updated_at = now()
     where id = new.conversation_id;
    if v_lead is not null then
      update leads set last_outbound_at = new.created_at, last_interaction_at = new.created_at, last_attempt_at = new.created_at, waiting_on = 'lead' where id = v_lead;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_messages_after on messages;
create trigger trg_messages_after after insert on messages for each row execute function public.messages_after_insert();

-- ---------------------------------------------------------------------
-- Proteção da equipe: ninguém vira "owner" pela interface e sempre resta 1 owner
-- ---------------------------------------------------------------------
create or replace function public.memberships_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if current_setting('bravus.bootstrap', true) = 'on' then return coalesce(new, old); end if;
  if tg_op in ('INSERT','UPDATE') and new.role = 'owner' and (tg_op = 'INSERT' or old.role <> 'owner') then
    raise exception 'O papel de proprietário não pode ser atribuído pela interface.';
  end if;
  if tg_op in ('UPDATE','DELETE') and old.role = 'owner' then
    if not public.has_role(old.org_id, array['owner']::app_role[]) then raise exception 'Somente o proprietário pode alterar outro proprietário.'; end if;
    if (tg_op = 'DELETE' or new.role <> 'owner' or not new.active)
       and (select count(*) from memberships where org_id = old.org_id and role = 'owner' and active) <= 1 then
      raise exception 'A organização precisa de pelo menos um proprietário ativo.';
    end if;
  end if;
  if tg_op = 'UPDATE' and new.user_id = auth.uid() and new.role <> old.role then
    raise exception 'Você não pode alterar o seu próprio papel.';
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists trg_memberships_guard on memberships;
create trigger trg_memberships_guard before insert or update or delete on memberships for each row execute function public.memberships_guard();

-- ---------------------------------------------------------------------
-- Novo usuário → perfil
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id, full_name, email) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Dados padrão de uma organização nova
-- ---------------------------------------------------------------------
create or replace function public.seed_org_defaults(p_org uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_won uuid;
begin
  insert into pipeline_stages(org_id, name, position, color, kind, probability) values
    (p_org,'Novo lead',1,'blue','open',5),
    (p_org,'Prospecção iniciada',2,'blue','open',5),
    (p_org,'Primeiro contato realizado',3,'sky','open',10),
    (p_org,'Aguardando resposta do lead',4,'amber','waiting',10),
    (p_org,'Lead respondeu',5,'sky','open',20),
    (p_org,'Qualificação',6,'cyan','open',25),
    (p_org,'Qualificado',7,'cyan','open',35),
    (p_org,'Reunião ou diagnóstico agendado',8,'indigo','open',45),
    (p_org,'Proposta em preparação',9,'indigo','open',50),
    (p_org,'Proposta enviada',10,'blue','open',60),
    (p_org,'Negociação',11,'violet','open',75),
    (p_org,'Fechado — ganho',12,'green','won',100),
    (p_org,'Fechado — perdido',13,'red','lost',0),
    (p_org,'Nutrição futura',14,'slate','nurture',5);

  insert into services(org_id, name, setup_price, monthly_price, recurring) values
    (p_org,'Gestão de Tráfego Pago',0,0,true),
    (p_org,'Criação de Sites',0,0,false),
    (p_org,'Landing Pages',0,0,false),
    (p_org,'Social Media',0,0,true),
    (p_org,'Branding e Identidade Visual',0,0,false),
    (p_org,'Consultoria de Marketing',0,0,false),
    (p_org,'Automações',0,0,true),
    (p_org,'Mentoria em Marketing Digital',0,0,false);

  select id into v_won from pipeline_stages where org_id = p_org and kind = 'won' limit 1;

  insert into automations(org_id, name, trigger, conditions, action, params) values
    (p_org,'Qualificar lead novo','lead_created','{}','create_task','{"type":"qualification","title":"Qualificar lead novo","days":0,"priority":"high"}'),
    (p_org,'Acompanhar proposta enviada','proposal_sent','{}','create_task','{"type":"follow_up","title":"Acompanhar proposta enviada","days":2,"priority":"high"}'),
    (p_org,'Lead respondeu — avisar responsável','message_received','{}','notify_owner','{}'),
    (p_org,'Venda fechada — criar cliente','sale_won','{}','create_client','{}'),
    (p_org,'Venda fechada — avisar administradores','sale_won','{}','notify_admins','{"message":"Nova venda registrada"}'),
    (p_org,'Opt-out — avisar administradores','opt_out','{}','notify_admins','{"message":"Contato pediu para não receber mensagens"}'),
    (p_org,'Tarefa vencida — avisar responsável','task_overdue','{}','notify_owner','{}'),
    (p_org,'Falha na integração — avisar administradores','integration_error','{}','notify_admins','{"message":"Falha na integração do WhatsApp"}');

  insert into integrations(org_id, provider, mode, status) values (p_org,'whatsapp_cloud','disabled','not_configured')
  on conflict do nothing;
end $$;
revoke execute on function public.seed_org_defaults(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- RPCs chamadas pelo app
-- ---------------------------------------------------------------------
create or replace function public.create_organization(p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  if auth.uid() is null then raise exception 'Não autenticado'; end if;
  if exists (select 1 from memberships where user_id = auth.uid() and role = 'owner') then
    raise exception 'Você já é proprietário de uma organização.';
  end if;
  insert into organizations(name) values (trim(p_name)) returning id into v_org;
  perform set_config('bravus.bootstrap','on', true);
  insert into memberships(org_id, user_id, role, job_title) values (v_org, auth.uid(), 'owner', 'Proprietário');
  perform set_config('bravus.bootstrap','off', true);
  perform seed_org_defaults(v_org);
  update profiles set current_org_id = v_org where id = auth.uid();
  return v_org;
end $$;

-- aceita convites pendentes do e-mail confirmado do usuário logado
create or replace function public.accept_invitations()
returns int language plpgsql security definer set search_path = public as $$
declare v_email citext; v_confirmed timestamptz; r record; n int := 0;
begin
  select email, email_confirmed_at into v_email, v_confirmed from auth.users where id = auth.uid();
  if v_email is null or v_confirmed is null then return 0; end if;
  for r in select * from invitations where email = v_email and accepted_at is null and revoked_at is null loop
    insert into memberships(org_id, user_id, role, job_title) values (r.org_id, auth.uid(), r.role, r.job_title)
    on conflict (org_id, user_id) do update set active = true, role = excluded.role;
    update invitations set accepted_at = now() where id = r.id;
    update profiles set current_org_id = coalesce(current_org_id, r.org_id) where id = auth.uid();
    n := n + 1;
  end loop;
  return n;
end $$;

-- verifica tarefas vencidas e dispara alertas (idempotente por tarefa)
create or replace function public.scan_overdue_tasks(p_org uuid)
returns int language plpgsql security definer set search_path = public as $$
declare t record; n int := 0;
begin
  if not public.is_member(p_org) then raise exception 'Sem acesso'; end if;
  for t in select * from tasks where org_id = p_org and status = 'open' and due_at < now() limit 500 loop
    if t.assignee_id is not null and not exists (select 1 from notifications where user_id = t.assignee_id and link = '/follow-ups?task='||t.id) then
      insert into notifications(org_id, user_id, title, body, link) values (p_org, t.assignee_id, 'Tarefa vencida', t.title, '/follow-ups?task='||t.id);
    end if;
    if t.lead_id is not null then perform run_automations(p_org, 'task_overdue', t.lead_id, 'overdue:'||t.id); end if;
    n := n + 1;
  end loop;
  return n;
end $$;

-- converte prospecção em lead (sem duplicar)
create or replace function public.convert_prospect(p_prospect uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare p prospects%rowtype; v_lead uuid; v_stage uuid;
begin
  select * into p from prospects where id = p_prospect;
  if p.id is null or not public.can_write(p.org_id) then raise exception 'Sem acesso'; end if;
  if p.lead_id is not null then return p.lead_id; end if;
  if p.phone_e164 is not null then
    select id into v_lead from leads where org_id = p.org_id and phone_e164 = p.phone_e164 and archived_at is null limit 1;
  end if;
  if v_lead is null then
    select id into v_stage from pipeline_stages where org_id = p.org_id order by position limit 1;
    insert into leads(org_id, full_name, company, phone_original, phone_e164, phone_valid, email, instagram, city, segment, service_id, owner_id, source, stage_id, notes)
    values (p.org_id, coalesce(p.contact_name, p.company), p.company, p.phone_original, p.phone_e164, p.phone_e164 is not null, p.email, p.instagram, p.city, p.niche, p.service_id, p.owner_id, 'Prospecção ativa', v_stage, p.notes)
    returning id into v_lead;
  end if;
  update prospects set lead_id = v_lead, status = 'qualified' where id = p_prospect;
  return v_lead;
end $$;

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
do $$ declare t text; begin
  foreach t in array array['organizations','profiles','memberships','invitations','pipeline_stages','services','leads','stage_history',
    'activities','tasks','prospects','clients','proposals','proposal_revisions','sales','payments','consents','suppression_list',
    'conversations','messages','message_templates','integrations','webhook_events','imports','import_templates','files',
    'automations','automation_runs','notifications','audit_logs'] loop
    execute format('alter table %I enable row level security;', t);
  end loop;
end $$;

-- organizations
drop policy if exists org_select on organizations; create policy org_select on organizations for select using (public.is_member(id));
drop policy if exists org_update on organizations; create policy org_update on organizations for update using (public.is_admin(id)) with check (public.is_admin(id));

-- profiles: o próprio usuário + colegas da mesma organização (só leitura)
drop policy if exists profiles_self on profiles; create policy profiles_self on profiles for select using (
  id = auth.uid() or exists (select 1 from memberships a join memberships b on a.org_id = b.org_id where a.user_id = auth.uid() and a.active and b.user_id = profiles.id));
drop policy if exists profiles_update on profiles; create policy profiles_update on profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- memberships / invitations (gestão de equipe: owner/admin)
drop policy if exists mem_select on memberships; create policy mem_select on memberships for select using (public.is_member(org_id) or user_id = auth.uid());
drop policy if exists mem_update on memberships; create policy mem_update on memberships for update using (public.is_admin(org_id)) with check (public.is_admin(org_id));
drop policy if exists mem_delete on memberships; create policy mem_delete on memberships for delete using (public.is_admin(org_id));
drop policy if exists inv_all on invitations; create policy inv_all on invitations for all using (public.is_admin(org_id)) with check (public.is_admin(org_id));

-- tabelas comerciais padrão: membros leem, quem vende escreve, gerente+ exclui
do $$ declare t text; begin
  foreach t in array array['leads','activities','tasks','prospects','clients','proposals','sales','imports','import_templates','files'] loop
    execute format($f$
      drop policy if exists %1$s_sel on %1$I; create policy %1$s_sel on %1$I for select using (public.is_member(org_id));
      drop policy if exists %1$s_ins on %1$I; create policy %1$s_ins on %1$I for insert with check (public.can_write(org_id));
      drop policy if exists %1$s_upd on %1$I; create policy %1$s_upd on %1$I for update using (public.can_write(org_id)) with check (public.can_write(org_id));
      drop policy if exists %1$s_del on %1$I; create policy %1$s_del on %1$I for delete using (public.is_manager(org_id));
    $f$, t);
  end loop;
end $$;

-- configuração (gerente+ escreve)
do $$ declare t text; begin
  foreach t in array array['pipeline_stages','services','automations','message_templates'] loop
    execute format($f$
      drop policy if exists %1$s_sel on %1$I; create policy %1$s_sel on %1$I for select using (public.is_member(org_id));
      drop policy if exists %1$s_wr on %1$I; create policy %1$s_wr on %1$I for all using (public.is_manager(org_id)) with check (public.is_manager(org_id));
    $f$, t);
  end loop;
end $$;

-- pagamentos: confirmação de recebimento só por gerente+
drop policy if exists payments_sel on payments; create policy payments_sel on payments for select using (public.is_member(org_id));
drop policy if exists payments_wr on payments; create policy payments_wr on payments for all using (public.is_manager(org_id)) with check (public.is_manager(org_id));

-- somente leitura para o app (escritos por gatilhos / funções)
drop policy if exists sh_sel on stage_history; create policy sh_sel on stage_history for select using (public.is_member(org_id));
drop policy if exists pr_sel on proposal_revisions; create policy pr_sel on proposal_revisions for select using (public.is_member(org_id));
drop policy if exists ar_sel on automation_runs; create policy ar_sel on automation_runs for select using (public.is_member(org_id));
drop policy if exists audit_sel on audit_logs; create policy audit_sel on audit_logs for select using (public.is_admin(org_id));
-- webhook_events: sem política = sem acesso pelo app (apenas service role)

-- consentimentos: registro apenas por inserção (histórico imutável)
drop policy if exists cons_sel on consents; create policy cons_sel on consents for select using (public.is_member(org_id));
drop policy if exists cons_ins on consents; create policy cons_ins on consents for insert with check (public.can_write(org_id) and recorded_by = auth.uid());

-- supressão: qualquer vendedor adiciona; só admin remove
drop policy if exists sup_sel on suppression_list; create policy sup_sel on suppression_list for select using (public.is_member(org_id));
drop policy if exists sup_ins on suppression_list; create policy sup_ins on suppression_list for insert with check (public.can_write(org_id));
drop policy if exists sup_del on suppression_list; create policy sup_del on suppression_list for delete using (public.is_admin(org_id));

-- WhatsApp: mensagens só entram pela Edge Function (service role)
drop policy if exists conv_sel on conversations; create policy conv_sel on conversations for select using (public.is_member(org_id));
drop policy if exists conv_upd on conversations; create policy conv_upd on conversations for update using (public.can_write(org_id)) with check (public.can_write(org_id));
drop policy if exists msg_sel on messages; create policy msg_sel on messages for select using (public.is_member(org_id));

drop policy if exists int_sel on integrations; create policy int_sel on integrations for select using (public.is_member(org_id));
drop policy if exists int_upd on integrations; create policy int_upd on integrations for update using (public.is_admin(org_id)) with check (public.is_admin(org_id));

drop policy if exists notif_sel on notifications; create policy notif_sel on notifications for select using (user_id = auth.uid());
drop policy if exists notif_upd on notifications; create policy notif_upd on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists notif_del on notifications; create policy notif_del on notifications for delete using (user_id = auth.uid());

-- privilégios mínimos para anônimos
revoke all on all tables in schema public from anon;
grant execute on function public.create_organization(text), public.accept_invitations(), public.scan_overdue_tasks(uuid), public.convert_prospect(uuid) to authenticated;
revoke execute on function public.create_organization(text), public.accept_invitations(), public.scan_overdue_tasks(uuid), public.convert_prospect(uuid) from anon;

-- ---------------------------------------------------------------------
-- Storage privado para arquivos (caminho: <org_id>/<arquivo>)
-- ---------------------------------------------------------------------
insert into storage.buckets(id, name, public, file_size_limit)
values ('crm-files','crm-files', false, 20971520)
on conflict (id) do nothing;

drop policy if exists crm_files_read on storage.objects;
create policy crm_files_read on storage.objects for select to authenticated
  using (bucket_id = 'crm-files' and public.is_member(((storage.foldername(name))[1])::uuid));
drop policy if exists crm_files_write on storage.objects;
create policy crm_files_write on storage.objects for insert to authenticated
  with check (bucket_id = 'crm-files' and public.can_write(((storage.foldername(name))[1])::uuid));
drop policy if exists crm_files_delete on storage.objects;
create policy crm_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'crm-files' and public.is_manager(((storage.foldername(name))[1])::uuid));

-- ---------------------------------------------------------------------
-- Tempo real para caixa de entrada e notificações
-- ---------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table messages, conversations, notifications;
exception when others then null; end $$;

-- Edge Functions (service role) podem disparar automações
grant execute on function public.run_automations(uuid,text,uuid,text,jsonb) to service_role;
