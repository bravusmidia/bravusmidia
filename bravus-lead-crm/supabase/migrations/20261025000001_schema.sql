-- =====================================================================
-- BRAVUS LEAD CRM — Schema principal
-- PostgreSQL / Supabase. Rode na ordem dos arquivos em supabase/migrations.
-- =====================================================================

create extension if not exists pgcrypto;
create extension if not exists citext;

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
create or replace function public.is_member(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships m where m.org_id = p_org and m.user_id = auth.uid() and m.active);
$$;

create or replace function public.has_role(p_org uuid, p_roles app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships m where m.org_id = p_org and m.user_id = auth.uid() and m.active and m.role = any(p_roles));
$$;

-- pode escrever dados comerciais (todos menos viewer)
create or replace function public.can_write(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(p_org, array['owner','admin','manager','seller']::app_role[]);
$$;

create or replace function public.is_admin(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(p_org, array['owner','admin']::app_role[]);
$$;

create or replace function public.is_manager(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(p_org, array['owner','admin','manager']::app_role[]);
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
