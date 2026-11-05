-- =====================================================================
-- BRAVUS LEAD CRM — instalação DENTRO do projeto Supabase do Bravus Work
-- Tudo do CRM fica no schema separado "crm": não mexe em nenhuma tabela
-- do Bravus Work (schema "public"). Os logins (Authentication) são os mesmos.
-- Rode UMA vez no SQL Editor do projeto "bravusmidia Work".
-- =====================================================================
create schema if not exists crm;
grant usage on schema crm to authenticated, service_role;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;
set search_path = crm, public, extensions;

-- =====================================================================
-- BRAVUS LEAD CRM — Schema principal
-- PostgreSQL / Supabase. Rode na ordem dos arquivos em supabase/migrations.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
do $$ begin
  create type app_role as enum ('owner','admin','manager','seller','viewer');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Organizações, perfis e equipe
-- ---------------------------------------------------------------------
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  settings jsonb not null default jsonb_build_object(
    'inactivity', jsonb_build_object('attention',3,'priority',7,'review',15,'requalify',30),
    'whatsapp', jsonb_build_object('max_per_minute',20,'max_per_day',200,'quiet_start','21:00','quiet_end','08:00'),
    'currency','BRL'
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email citext,
  phone text,
  avatar_url text,
  theme text not null default 'system' check (theme in ('light','dark','system')),
  current_org_id uuid references organizations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null default 'seller',
  job_title text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create index if not exists memberships_user_idx on memberships(user_id);

create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  email citext not null,
  role app_role not null default 'seller',
  job_title text,
  invited_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (role <> 'owner')
);
create unique index if not exists invitations_open_uniq on invitations(org_id, email) where accepted_at is null and revoked_at is null;

-- ---------------------------------------------------------------------
-- Funções auxiliares de autorização (security definer, search_path fixo)
-- ---------------------------------------------------------------------
create or replace function crm.is_member(p_org uuid)
returns boolean language sql stable security definer set search_path = crm, public, extensions as $$
  select exists (select 1 from memberships m where m.org_id = p_org and m.user_id = auth.uid() and m.active);
$$;

create or replace function crm.has_role(p_org uuid, p_roles app_role[])
returns boolean language sql stable security definer set search_path = crm, public, extensions as $$
  select exists (select 1 from memberships m where m.org_id = p_org and m.user_id = auth.uid() and m.active and m.role = any(p_roles));
$$;

-- pode escrever dados comerciais (todos menos viewer)
create or replace function crm.can_write(p_org uuid)
returns boolean language sql stable security definer set search_path = crm, public, extensions as $$
  select crm.has_role(p_org, array['owner','admin','manager','seller']::app_role[]);
$$;

create or replace function crm.is_admin(p_org uuid)
returns boolean language sql stable security definer set search_path = crm, public, extensions as $$
  select crm.has_role(p_org, array['owner','admin']::app_role[]);
$$;

create or replace function crm.is_manager(p_org uuid)
returns boolean language sql stable security definer set search_path = crm, public, extensions as $$
  select crm.has_role(p_org, array['owner','admin','manager']::app_role[]);
$$;

-- ---------------------------------------------------------------------
-- Funil e serviços
-- ---------------------------------------------------------------------
create table if not exists pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  position int not null,
  color text not null default 'blue',
  kind text not null default 'open' check (kind in ('open','waiting','won','lost','nurture')),
  probability int not null default 10 check (probability between 0 and 100),
  entry_criteria text,
  exit_criteria text,
  created_at timestamptz not null default now()
);
create index if not exists stages_org_idx on pipeline_stages(org_id, position);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  setup_price numeric(12,2) not null default 0 check (setup_price >= 0),
  monthly_price numeric(12,2) not null default 0 check (monthly_price >= 0),
  recurring boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Leads
-- ---------------------------------------------------------------------
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 160),
  company text,
  phone_original text,
  phone_e164 text check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  phone_valid boolean not null default false,
  whatsapp text,
  email citext check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  website text,
  instagram text,
  facebook text,
  city text,
  state text,
  segment text,
  service_id uuid references services(id) on delete set null,
  source text,
  campaign text,
  entered_at date not null default current_date,
  stage_id uuid references pipeline_stages(id) on delete set null,
  owner_id uuid references auth.users(id) on delete set null,
  temperature text check (temperature in ('frio','morno','quente')),
  potential_value numeric(12,2) not null default 0 check (potential_value >= 0),
  probability int check (probability between 0 and 100),
  next_action text,
  next_follow_up_at timestamptz,
  last_interaction_at timestamptz,
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  last_attempt_at timestamptz,
  waiting_on text check (waiting_on in ('team','lead')),
  consent_status text not null default 'unknown' check (consent_status in ('unknown','granted','revoked')),
  consent_source text,
  consent_at timestamptz,
  opted_out boolean not null default false,
  notes text,
  tags text[] not null default '{}',
  lost_reason text,
  won_at timestamptz,
  lost_at timestamptz,
  import_id uuid,
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists leads_org_idx on leads(org_id) where archived_at is null;
create index if not exists leads_stage_idx on leads(org_id, stage_id);
create index if not exists leads_phone_idx on leads(org_id, phone_e164);
create index if not exists leads_email_idx on leads(org_id, email);
create index if not exists leads_owner_idx on leads(org_id, owner_id);
create index if not exists leads_followup_idx on leads(org_id, next_follow_up_at);
create index if not exists leads_tags_idx on leads using gin(tags);

-- histórico de etapas
create table if not exists stage_history (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  from_stage uuid references pipeline_stages(id) on delete set null,
  to_stage uuid references pipeline_stages(id) on delete set null,
  changed_by uuid default auth.uid(),
  changed_at timestamptz not null default now()
);
create index if not exists stage_history_lead_idx on stage_history(lead_id, changed_at desc);

-- ---------------------------------------------------------------------
-- Atividades e tarefas (follow-up)
-- ---------------------------------------------------------------------
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  type text not null check (type in ('note','call','message','meeting','email','proposal','stage','system','attempt')),
  direction text check (direction in ('inbound','outbound')),
  summary text not null,
  occurred_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists activities_lead_idx on activities(lead_id, occurred_at desc);
create index if not exists activities_org_idx on activities(org_id, occurred_at desc);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  assignee_id uuid references auth.users(id) on delete set null,
  type text not null default 'follow_up' check (type in ('call','message','meeting','proposal','review','follow_up','qualification')),
  title text not null,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  due_at timestamptz not null,
  status text not null default 'open' check (status in ('open','done','canceled')),
  result text,
  notes text,
  completed_at timestamptz,
  source text not null default 'manual',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_due_idx on tasks(org_id, status, due_at);
create index if not exists tasks_lead_idx on tasks(lead_id);

-- ---------------------------------------------------------------------
-- Prospecção
-- ---------------------------------------------------------------------
create table if not exists prospects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  company text not null,
  niche text,
  discovery_channel text,
  contact_name text,
  phone_original text,
  phone_e164 text,
  email citext,
  instagram text,
  city text,
  service_id uuid references services(id) on delete set null,
  owner_id uuid references auth.users(id) on delete set null,
  status text not null default 'not_contacted' check (status in ('not_contacted','in_progress','waiting','qualified','closed','future')),
  approached_at timestamptz,
  cadence_step int not null default 0,
  result text,
  next_action text,
  next_action_at timestamptz,
  notes text,
  lead_id uuid references leads(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists prospects_org_idx on prospects(org_id, status);

-- ---------------------------------------------------------------------
-- Clientes, propostas, vendas e pagamentos
-- ---------------------------------------------------------------------
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  name text not null,
  company text,
  phone_e164 text,
  email citext,
  document text,
  city text,
  owner_id uuid references auth.users(id) on delete set null,
  status text not null default 'active' check (status in ('active','paused','churned')),
  started_at date not null default current_date,
  churned_at date,
  churn_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists clients_org_idx on clients(org_id, status);

create table if not exists proposals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  title text not null,
  items jsonb not null default '[]'::jsonb,
  setup_total numeric(12,2) not null default 0,
  monthly_total numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0 check (discount >= 0),
  valid_until date,
  conditions text,
  notes text,
  status text not null default 'draft' check (status in ('draft','sent','negotiating','accepted','rejected','expired')),
  version int not null default 1,
  owner_id uuid references auth.users(id) on delete set null default auth.uid(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists proposal_revisions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  proposal_id uuid not null references proposals(id) on delete cascade,
  version int not null,
  snapshot jsonb not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  proposal_id uuid references proposals(id) on delete set null,
  service_id uuid references services(id) on delete set null,
  description text,
  setup_value numeric(12,2) not null default 0 check (setup_value >= 0),
  monthly_value numeric(12,2) not null default 0 check (monthly_value >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  duration_months int check (duration_months is null or duration_months > 0),
  closed_at date not null default current_date,
  start_date date,
  renewal_date date,
  contract_status text not null default 'pending' check (contract_status in ('pending','signed','active','ended','canceled')),
  owner_id uuid references auth.users(id) on delete set null default auth.uid(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sales_org_idx on sales(org_id, closed_at);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  sale_id uuid references sales(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  description text,
  amount numeric(12,2) not null check (amount > 0),
  due_date date not null,
  status text not null default 'pending' check (status in ('pending','paid','overdue','canceled')),
  paid_at date,
  method text,
  confirmed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (status <> 'paid' or (paid_at is not null and confirmed_by is not null))
);
create index if not exists payments_org_idx on payments(org_id, due_date);

-- ---------------------------------------------------------------------
-- WhatsApp: consentimentos, supressão, conversas, mensagens, modelos
-- ---------------------------------------------------------------------
create table if not exists consents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  channel text not null default 'whatsapp',
  purpose text not null default 'marketing' check (purpose in ('marketing','utility','all')),
  status text not null check (status in ('granted','revoked')),
  source text not null,
  evidence text,
  recorded_by uuid default auth.uid(),
  recorded_at timestamptz not null default now()
);
create index if not exists consents_lead_idx on consents(lead_id, recorded_at desc);

create table if not exists suppression_list (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  phone_e164 text not null,
  reason text not null default 'opt_out',
  source text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (org_id, phone_e164)
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  wa_id text not null,
  phone_e164 text not null,
  contact_name text,
  status text not null default 'open' check (status in ('open','pending','closed')),
  assigned_to uuid references auth.users(id) on delete set null,
  automation_paused boolean not null default true,
  unread_count int not null default 0,
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  last_message_preview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, wa_id)
);
create index if not exists conversations_org_idx on conversations(org_id, updated_at desc);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound')),
  wa_message_id text,
  type text not null default 'text',
  body text,
  template_name text,
  status text not null default 'received' check (status in ('received','queued','sent','delivered','read','failed')),
  error_code text,
  error_message text,
  sent_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  status_updated_at timestamptz
);
create unique index if not exists messages_wamid_uniq on messages(org_id, wa_message_id) where wa_message_id is not null;
create index if not exists messages_conv_idx on messages(conversation_id, created_at);

create table if not exists message_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  language text not null default 'pt_BR',
  category text not null check (category in ('MARKETING','UTILITY','AUTHENTICATION')),
  status text not null default 'PENDING',
  body text,
  variables int not null default 0,
  meta_id text,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (org_id, name, language)
);

-- integração: só dados NÃO secretos. Tokens ficam nos secrets das Edge Functions.
create table if not exists integrations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  provider text not null check (provider in ('whatsapp_cloud')),
  mode text not null default 'disabled' check (mode in ('disabled','demo','live')),
  phone_number_id text,
  waba_id text,
  display_phone text,
  status text not null default 'not_configured',
  last_checked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, provider)
);

create table if not exists webhook_events (
  id text primary key,
  org_id uuid references organizations(id) on delete cascade,
  kind text not null,
  received_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Arquivos e importações
-- ---------------------------------------------------------------------
create table if not exists imports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  file_name text not null,
  file_type text,
  strategy text not null,
  total_rows int not null default 0,
  inserted int not null default 0,
  updated int not null default 0,
  skipped int not null default 0,
  rejected int not null default 0,
  duplicates int not null default 0,
  errors jsonb not null default '[]'::jsonb,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists import_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  mapping jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  name text not null,
  mime_type text,
  size_bytes bigint,
  storage_path text not null,
  uploaded_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Automações, notificações e auditoria
-- ---------------------------------------------------------------------
create table if not exists automations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  trigger text not null check (trigger in ('lead_created','stage_changed','proposal_sent','sale_won','message_received','opt_out','task_overdue','integration_error')),
  conditions jsonb not null default '{}'::jsonb,
  action text not null check (action in ('create_task','notify_admins','notify_owner','update_last_interaction','suppress_contact','create_client')),
  params jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  simulate boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists automation_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  automation_id uuid not null references automations(id) on delete cascade,
  event_key text not null,
  outcome text not null check (outcome in ('executed','simulated','skipped','error')),
  detail text,
  created_at timestamptz not null default now(),
  unique (automation_id, event_key)
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications(user_id, read_at, created_at desc);

create table if not exists audit_logs (
  id bigint generated always as identity primary key,
  org_id uuid references organizations(id) on delete cascade,
  actor_id uuid,
  table_name text not null,
  record_id uuid,
  action text not null,
  changes jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_org_idx on audit_logs(org_id, created_at desc);


-- =====================================================================
-- BRAVUS LEAD CRM — Regras de negócio, gatilhos, automações e RLS
-- =====================================================================

-- ---------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------
create or replace function crm.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$ declare t text; begin
  foreach t in array array['organizations','profiles','leads','tasks','prospects','clients','proposals','sales','conversations','integrations'] loop
    execute format('drop trigger if exists trg_touch_%1$s on %1$s; create trigger trg_touch_%1$s before update on %1$s for each row execute function crm.touch_updated_at();', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Auditoria genérica (guarda só os campos alterados)
-- ---------------------------------------------------------------------
create or replace function crm.audit_row()
returns trigger language plpgsql security definer set search_path = crm, public, extensions as $$
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
    execute format('drop trigger if exists trg_audit_%1$s on %1$s; create trigger trg_audit_%1$s after insert or update or delete on %1$s for each row execute function crm.audit_row();', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Motor de automações (idempotente: 1 execução por automação+evento)
-- ---------------------------------------------------------------------
create or replace function crm.run_automations(p_org uuid, p_trigger text, p_lead uuid, p_event_key text, p_ctx jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = crm, public, extensions as $$
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
revoke execute on function crm.run_automations(uuid,text,uuid,text,jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Leads: transições controladas do funil + histórico + automações
-- ---------------------------------------------------------------------
create or replace function crm.leads_before_write()
returns trigger language plpgsql security definer set search_path = crm, public, extensions as $$
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
create trigger trg_leads_before before insert or update on leads for each row execute function crm.leads_before_write();

create or replace function crm.leads_after_write()
returns trigger language plpgsql security definer set search_path = crm, public, extensions as $$
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
create trigger trg_leads_after after insert or update on leads for each row execute function crm.leads_after_write();

-- atividade/tarefa atualiza "última interação"
create or replace function crm.activity_touch_lead()
returns trigger language plpgsql security definer set search_path = crm, public, extensions as $$
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
create trigger trg_activity_touch after insert on activities for each row execute function crm.activity_touch_lead();

create or replace function crm.tasks_before_write()
returns trigger language plpgsql as $$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then new.completed_at := now(); end if;
  if new.status <> 'done' then new.completed_at := null; end if;
  return new;
end $$;
drop trigger if exists trg_tasks_before on tasks;
create trigger trg_tasks_before before insert or update on tasks for each row execute function crm.tasks_before_write();

-- proposta enviada → automações + revisão
create or replace function crm.proposals_after_write()
returns trigger language plpgsql security definer set search_path = crm, public, extensions as $$
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
  when (pg_trigger_depth() < 2) execute function crm.proposals_after_write();

-- venda registrada → automações (ex.: criar cliente)
create or replace function crm.sales_after_insert()
returns trigger language plpgsql security definer set search_path = crm, public, extensions as $$
begin
  if new.lead_id is not null then
    insert into activities(org_id, lead_id, type, summary) values (new.org_id, new.lead_id, 'system', 'Venda registrada');
    perform run_automations(new.org_id, 'sale_won', new.lead_id, 'sale_won:'||new.id);
  end if;
  return new;
end $$;
drop trigger if exists trg_sales_after on sales;
create trigger trg_sales_after after insert on sales for each row execute function crm.sales_after_insert();

-- supressão → automações de opt-out + bloqueio no lead
create or replace function crm.suppression_after_insert()
returns trigger language plpgsql security definer set search_path = crm, public, extensions as $$
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
create trigger trg_suppression_after after insert on suppression_list for each row execute function crm.suppression_after_insert();

-- consentimento → reflete no lead
create or replace function crm.consents_after_insert()
returns trigger language plpgsql security definer set search_path = crm, public, extensions as $$
begin
  update leads set consent_status = new.status, consent_source = new.source, consent_at = new.recorded_at,
                   opted_out = (new.status = 'revoked')
   where id = new.lead_id and (consent_at is null or consent_at <= new.recorded_at);
  return new;
end $$;
drop trigger if exists trg_consents_after on consents;
create trigger trg_consents_after after insert on consents for each row
  when (pg_trigger_depth() < 2) execute function crm.consents_after_insert();

-- mensagem recebida → atualiza lead e dispara automações
create or replace function crm.messages_after_insert()
returns trigger language plpgsql security definer set search_path = crm, public, extensions as $$
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
create trigger trg_messages_after after insert on messages for each row execute function crm.messages_after_insert();

-- ---------------------------------------------------------------------
-- Proteção da equipe: ninguém vira "owner" pela interface e sempre resta 1 owner
-- ---------------------------------------------------------------------
create or replace function crm.memberships_guard()
returns trigger language plpgsql security definer set search_path = crm, public, extensions as $$
begin
  if current_setting('bravus.bootstrap', true) = 'on' then return coalesce(new, old); end if;
  if tg_op in ('INSERT','UPDATE') and new.role = 'owner' and (tg_op = 'INSERT' or old.role <> 'owner') then
    raise exception 'O papel de proprietário não pode ser atribuído pela interface.';
  end if;
  if tg_op in ('UPDATE','DELETE') and old.role = 'owner' then
    if not crm.has_role(old.org_id, array['owner']::app_role[]) then raise exception 'Somente o proprietário pode alterar outro proprietário.'; end if;
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
create trigger trg_memberships_guard before insert or update or delete on memberships for each row execute function crm.memberships_guard();

-- ---------------------------------------------------------------------
-- Novo usuário → perfil
-- ---------------------------------------------------------------------
create or replace function crm.handle_new_user()
returns trigger language plpgsql security definer set search_path = crm, public, extensions as $$
begin
  insert into profiles(id, full_name, email) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created_crm on auth.users;
create trigger on_auth_user_created_crm after insert on auth.users for each row execute function crm.handle_new_user();

-- ---------------------------------------------------------------------
-- Dados padrão de uma organização nova
-- ---------------------------------------------------------------------
create or replace function crm.seed_org_defaults(p_org uuid)
returns void language plpgsql security definer set search_path = crm, public, extensions as $$
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
revoke execute on function crm.seed_org_defaults(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- RPCs chamadas pelo app
-- ---------------------------------------------------------------------
create or replace function crm.create_organization(p_name text)
returns uuid language plpgsql security definer set search_path = crm, public, extensions as $$
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
create or replace function crm.accept_invitations()
returns int language plpgsql security definer set search_path = crm, public, extensions as $$
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
create or replace function crm.scan_overdue_tasks(p_org uuid)
returns int language plpgsql security definer set search_path = crm, public, extensions as $$
declare t record; n int := 0;
begin
  if not crm.is_member(p_org) then raise exception 'Sem acesso'; end if;
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
create or replace function crm.convert_prospect(p_prospect uuid)
returns uuid language plpgsql security definer set search_path = crm, public, extensions as $$
declare p prospects%rowtype; v_lead uuid; v_stage uuid;
begin
  select * into p from prospects where id = p_prospect;
  if p.id is null or not crm.can_write(p.org_id) then raise exception 'Sem acesso'; end if;
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
drop policy if exists org_select on organizations; create policy org_select on organizations for select using (crm.is_member(id));
drop policy if exists org_update on organizations; create policy org_update on organizations for update using (crm.is_admin(id)) with check (crm.is_admin(id));

-- profiles: o próprio usuário + colegas da mesma organização (só leitura)
drop policy if exists profiles_self on profiles; create policy profiles_self on profiles for select using (
  id = auth.uid() or exists (select 1 from memberships a join memberships b on a.org_id = b.org_id where a.user_id = auth.uid() and a.active and b.user_id = profiles.id));
drop policy if exists profiles_update on profiles; create policy profiles_update on profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- memberships / invitations (gestão de equipe: owner/admin)
drop policy if exists mem_select on memberships; create policy mem_select on memberships for select using (crm.is_member(org_id) or user_id = auth.uid());
drop policy if exists mem_update on memberships; create policy mem_update on memberships for update using (crm.is_admin(org_id)) with check (crm.is_admin(org_id));
drop policy if exists mem_delete on memberships; create policy mem_delete on memberships for delete using (crm.is_admin(org_id));
drop policy if exists inv_all on invitations; create policy inv_all on invitations for all using (crm.is_admin(org_id)) with check (crm.is_admin(org_id));

-- tabelas comerciais padrão: membros leem, quem vende escreve, gerente+ exclui
do $$ declare t text; begin
  foreach t in array array['leads','activities','tasks','prospects','clients','proposals','sales','imports','import_templates','files'] loop
    execute format($f$
      drop policy if exists %1$s_sel on %1$I; create policy %1$s_sel on %1$I for select using (crm.is_member(org_id));
      drop policy if exists %1$s_ins on %1$I; create policy %1$s_ins on %1$I for insert with check (crm.can_write(org_id));
      drop policy if exists %1$s_upd on %1$I; create policy %1$s_upd on %1$I for update using (crm.can_write(org_id)) with check (crm.can_write(org_id));
      drop policy if exists %1$s_del on %1$I; create policy %1$s_del on %1$I for delete using (crm.is_manager(org_id));
    $f$, t);
  end loop;
end $$;

-- configuração (gerente+ escreve)
do $$ declare t text; begin
  foreach t in array array['pipeline_stages','services','automations','message_templates'] loop
    execute format($f$
      drop policy if exists %1$s_sel on %1$I; create policy %1$s_sel on %1$I for select using (crm.is_member(org_id));
      drop policy if exists %1$s_wr on %1$I; create policy %1$s_wr on %1$I for all using (crm.is_manager(org_id)) with check (crm.is_manager(org_id));
    $f$, t);
  end loop;
end $$;

-- pagamentos: confirmação de recebimento só por gerente+
drop policy if exists payments_sel on payments; create policy payments_sel on payments for select using (crm.is_member(org_id));
drop policy if exists payments_wr on payments; create policy payments_wr on payments for all using (crm.is_manager(org_id)) with check (crm.is_manager(org_id));

-- somente leitura para o app (escritos por gatilhos / funções)
drop policy if exists sh_sel on stage_history; create policy sh_sel on stage_history for select using (crm.is_member(org_id));
drop policy if exists pr_sel on proposal_revisions; create policy pr_sel on proposal_revisions for select using (crm.is_member(org_id));
drop policy if exists ar_sel on automation_runs; create policy ar_sel on automation_runs for select using (crm.is_member(org_id));
drop policy if exists audit_sel on audit_logs; create policy audit_sel on audit_logs for select using (crm.is_admin(org_id));
-- webhook_events: sem política = sem acesso pelo app (apenas service role)

-- consentimentos: registro apenas por inserção (histórico imutável)
drop policy if exists cons_sel on consents; create policy cons_sel on consents for select using (crm.is_member(org_id));
drop policy if exists cons_ins on consents; create policy cons_ins on consents for insert with check (crm.can_write(org_id) and recorded_by = auth.uid());

-- supressão: qualquer vendedor adiciona; só admin remove
drop policy if exists sup_sel on suppression_list; create policy sup_sel on suppression_list for select using (crm.is_member(org_id));
drop policy if exists sup_ins on suppression_list; create policy sup_ins on suppression_list for insert with check (crm.can_write(org_id));
drop policy if exists sup_del on suppression_list; create policy sup_del on suppression_list for delete using (crm.is_admin(org_id));

-- WhatsApp: mensagens só entram pela Edge Function (service role)
drop policy if exists conv_sel on conversations; create policy conv_sel on conversations for select using (crm.is_member(org_id));
drop policy if exists conv_upd on conversations; create policy conv_upd on conversations for update using (crm.can_write(org_id)) with check (crm.can_write(org_id));
drop policy if exists msg_sel on messages; create policy msg_sel on messages for select using (crm.is_member(org_id));

drop policy if exists int_sel on integrations; create policy int_sel on integrations for select using (crm.is_member(org_id));
drop policy if exists int_upd on integrations; create policy int_upd on integrations for update using (crm.is_admin(org_id)) with check (crm.is_admin(org_id));

drop policy if exists notif_sel on notifications; create policy notif_sel on notifications for select using (user_id = auth.uid());
drop policy if exists notif_upd on notifications; create policy notif_upd on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists notif_del on notifications; create policy notif_del on notifications for delete using (user_id = auth.uid());

-- privilégios mínimos para anônimos
revoke all on all tables in schema crm from anon;
grant execute on function crm.create_organization(text), crm.accept_invitations(), crm.scan_overdue_tasks(uuid), crm.convert_prospect(uuid) to authenticated;
revoke execute on function crm.create_organization(text), crm.accept_invitations(), crm.scan_overdue_tasks(uuid), crm.convert_prospect(uuid) from anon;

-- ---------------------------------------------------------------------
-- Storage privado para arquivos (caminho: <org_id>/<arquivo>)
-- ---------------------------------------------------------------------
insert into storage.buckets(id, name, public, file_size_limit)
values ('crm-files','crm-files', false, 20971520)
on conflict (id) do nothing;

drop policy if exists crm_files_read on storage.objects;
create policy crm_files_read on storage.objects for select to authenticated
  using (bucket_id = 'crm-files' and crm.is_member(((storage.foldername(name))[1])::uuid));
drop policy if exists crm_files_write on storage.objects;
create policy crm_files_write on storage.objects for insert to authenticated
  with check (bucket_id = 'crm-files' and crm.can_write(((storage.foldername(name))[1])::uuid));
drop policy if exists crm_files_delete on storage.objects;
create policy crm_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'crm-files' and crm.is_manager(((storage.foldername(name))[1])::uuid));

-- ---------------------------------------------------------------------
-- Tempo real para caixa de entrada e notificações
-- ---------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table messages, conversations, notifications;
exception when others then null; end $$;

-- Edge Functions (service role) podem disparar automações
grant execute on function crm.run_automations(uuid,text,uuid,text,jsonb) to service_role;


-- =====================================================================
-- Permissões do schema crm (no public o Supabase faz isso sozinho)
-- =====================================================================
grant all on all tables in schema crm to authenticated, service_role;
grant all on all sequences in schema crm to authenticated, service_role;
alter default privileges in schema crm grant all on tables to authenticated, service_role;
alter default privileges in schema crm grant all on sequences to authenticated, service_role;

-- Usuários que já existem (Andrade e Priscila) ganham o perfil do CRM
insert into crm.profiles(id, full_name, email)
select id, coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email,'@',1)), email from auth.users
on conflict (id) do nothing;

-- Libera o schema crm para a API (o mesmo que Settings → API → Exposed schemas)
alter role authenticator set pgrst.db_schemas = 'public, graphql_public, crm';
notify pgrst, 'reload config';
notify pgrst, 'reload schema';

select 'CRM instalado no schema crm' as resultado;
