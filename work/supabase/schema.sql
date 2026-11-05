-- =====================================================================
-- BRAVUS WORK v1.0 — Banco de dados (Supabase / PostgreSQL)
-- Rode este arquivo inteiro em: Supabase > SQL Editor > New query > Run
-- Segurança: Row Level Security (RLS) em TODAS as tabelas.
-- Multi-agência: toda linha pertence a uma agência (agency_id).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- AGÊNCIAS (multi-tenant) ----------
create table if not exists agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  max_clients int not null default 20,
  created_at timestamptz default now()
);

-- ---------- PERFIS (1 por usuário do Supabase Auth) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  agency_id uuid references agencies(id),
  name text not null default 'Usuário',
  email text,
  role text not null default 'comercial' check (role in ('admin','comercial','cliente')),
  client_id uuid, -- preenchido só para login de cliente (Bravus Client, próxima etapa)
  color text default '#2f7bff',
  last_seen timestamptz,
  created_at timestamptz default now()
);

-- Funções auxiliares (security definer evita recursão nas políticas)
create or replace function my_agency() returns uuid
language sql stable security definer set search_path = public as
$$ select agency_id from profiles where id = auth.uid() $$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists(select 1 from profiles where id = auth.uid() and role = 'admin') $$;

create or replace function is_team() returns boolean
language sql stable security definer set search_path = public as
$$ select exists(select 1 from profiles where id = auth.uid() and role in ('admin','comercial')) $$;

-- (plpgsql: só é validada quando usada, por isso pode vir antes da tabela settings)
create or replace function can_finance() returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  if is_admin() then return true; end if;
  return is_team() and coalesce((select (data->>'priscila_finance')::boolean from settings where agency_id = my_agency() and id = 'main'), false);
end $$;

-- ---------- CONFIGURAÇÕES ----------
create table if not exists settings (
  agency_id uuid not null default my_agency() references agencies(id),
  id text not null default 'main',
  data jsonb not null default '{}'::jsonb,
  primary key (agency_id, id)
);

-- ---------- CLIENTES ----------
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null default my_agency() references agencies(id),
  name text not null, contact text, phone text, whatsapp text, email text, instagram text,
  segment text, services text[] default '{}',
  contract_value numeric(12,2) default 0, start_date date, due_day int check (due_day between 1 and 31),
  owner uuid references profiles(id), op_status text default 'ativo',
  ad_account_id text, ad_balance numeric(12,2), ad_balance_source text, ad_account_status text, ad_synced_at timestamptz,
  asaas_customer_id text, notes text,
  created_at timestamptz default now()
);

-- ---------- COBRANÇAS / MENSALIDADES ----------
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null default my_agency() references agencies(id),
  client_id uuid references clients(id) on delete cascade,
  description text, amount numeric(12,2) not null, due_date date not null,
  status text not null default 'pendente' check (status in ('pendente','pago','cancelado')),
  paid_at date, method text, confirmed_by text,
  asaas_id text unique, payment_url text,
  created_at timestamptz default now()
);

-- ---------- DESPESAS ----------
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null default my_agency() references agencies(id),
  description text not null, category text, amount numeric(12,2) not null, date date not null,
  created_at timestamptz default now()
);

-- ---------- CAMPANHAS ----------
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null default my_agency() references agencies(id),
  client_id uuid references clients(id) on delete cascade,
  meta_id text unique, name text not null,
  status text default 'ativa', daily_budget numeric(12,2),
  spend numeric(12,2) default 0, reach bigint default 0, impressions bigint default 0,
  clicks bigint default 0, leads bigint default 0, conversions bigint default 0,
  source text default 'manual', period text, updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- ---------- TAREFAS (Daily / Weekend / reuniões / ligações) ----------
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null default my_agency() references agencies(id),
  title text not null, description text, assignee uuid references profiles(id),
  date date, time text, priority text default 'media', kind text default 'tarefa',
  category text, client_id uuid references clients(id) on delete set null,
  status text default 'pendente', done_at timestamptz,
  goal int, count int default 0, remind_min int default 10,
  is_template boolean default false, days int[], template_id uuid,
  created_at timestamptz default now()
);

-- ---------- CALENDÁRIO EDITORIAL ----------
create table if not exists content (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null default my_agency() references agencies(id),
  client_id uuid references clients(id) on delete set null,
  title text not null, channel text, date date, assignee uuid references profiles(id),
  status text default 'ideia', notes text,
  created_at timestamptz default now()
);

-- ---------- CHAT INTERNO ----------
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null default my_agency() references agencies(id),
  user_id uuid references profiles(id), text text not null check (length(text) <= 4000),
  created_at timestamptz default now()
);

-- ---------- NOTIFICAÇÕES ----------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null default my_agency() references agencies(id),
  user_id uuid references profiles(id) on delete cascade,
  title text not null, body text, type text default 'info', key text not null, route text,
  read boolean default false, created_at timestamptz default now(),
  unique (user_id, key)
);

-- ---------- HISTÓRICO DE ATIVIDADES ----------
create table if not exists activity (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null default my_agency() references agencies(id),
  user_id uuid references profiles(id), action text not null, client_id uuid,
  created_at timestamptz default now()
);

-- ---------- PUSH (celular / computador) ----------
create table if not exists push_subs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null default my_agency() references agencies(id),
  user_id uuid references profiles(id) on delete cascade,
  endpoint text unique not null, subscription jsonb not null,
  created_at timestamptz default now()
);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table agencies enable row level security;
alter table profiles enable row level security;
alter table settings enable row level security;
alter table clients enable row level security;
alter table invoices enable row level security;
alter table expenses enable row level security;
alter table campaigns enable row level security;
alter table tasks enable row level security;
alter table content enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;
alter table activity enable row level security;
alter table push_subs enable row level security;

drop policy if exists ag_sel on agencies;
create policy ag_sel on agencies for select using (id = my_agency());

drop policy if exists pr_sel on profiles;
create policy pr_sel on profiles for select using (agency_id = my_agency());
drop policy if exists pr_upd_self on profiles;
create policy pr_upd_self on profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));
drop policy if exists pr_upd_admin on profiles;
create policy pr_upd_admin on profiles for update using (is_admin() and agency_id = my_agency());

drop policy if exists st_sel on settings;
create policy st_sel on settings for select using (agency_id = my_agency() and is_team());
drop policy if exists st_all on settings;
create policy st_all on settings for all using (agency_id = my_agency() and is_admin()) with check (agency_id = my_agency() and is_admin());

-- Equipe (admin + comercial) trabalha em clientes, campanhas, tarefas, conteúdo, chat
do $$ declare t text; begin
  foreach t in array array['clients','campaigns','tasks','content','messages','activity'] loop
    execute format('drop policy if exists %1$s_sel on %1$s; drop policy if exists %1$s_ins on %1$s; drop policy if exists %1$s_upd on %1$s', t);
    execute format('create policy %1$s_sel on %1$s for select using (agency_id = my_agency() and is_team())', t);
    execute format('create policy %1$s_ins on %1$s for insert with check (agency_id = my_agency() and is_team())', t);
    execute format('create policy %1$s_upd on %1$s for update using (agency_id = my_agency() and is_team())', t);
  end loop;
end $$;
-- Excluir: só admin (exceto as próprias tarefas/conteúdo)
drop policy if exists clients_del on clients;
create policy clients_del on clients for delete using (agency_id = my_agency() and is_admin());
drop policy if exists campaigns_del on campaigns;
create policy campaigns_del on campaigns for delete using (agency_id = my_agency() and is_admin());
drop policy if exists tasks_del on tasks;
create policy tasks_del on tasks for delete using (agency_id = my_agency() and (is_admin() or assignee = auth.uid()));
drop policy if exists content_del on content;
create policy content_del on content for delete using (agency_id = my_agency() and is_team());
drop policy if exists messages_del on messages;
create policy messages_del on messages for delete using (agency_id = my_agency() and (is_admin() or user_id = auth.uid()));

-- Financeiro: só admin (ou Priscila se o admin liberar em Ajustes)
drop policy if exists inv_sel on invoices;
create policy inv_sel on invoices for select using (agency_id = my_agency() and can_finance());
drop policy if exists inv_all on invoices;
create policy inv_all on invoices for all using (agency_id = my_agency() and is_admin()) with check (agency_id = my_agency() and is_admin());
drop policy if exists exp_sel on expenses;
create policy exp_sel on expenses for select using (agency_id = my_agency() and can_finance());
drop policy if exists exp_all on expenses;
create policy exp_all on expenses for all using (agency_id = my_agency() and is_admin()) with check (agency_id = my_agency() and is_admin());

-- Notificações: cada um vê só as suas; equipe pode avisar a equipe
drop policy if exists nt_sel on notifications;
create policy nt_sel on notifications for select using (user_id = auth.uid());
drop policy if exists nt_upd on notifications;
create policy nt_upd on notifications for update using (user_id = auth.uid());
drop policy if exists nt_del on notifications;
create policy nt_del on notifications for delete using (user_id = auth.uid());
drop policy if exists nt_ins on notifications;
create policy nt_ins on notifications for insert with check (agency_id = my_agency() and is_team()
  and user_id in (select id from profiles where agency_id = my_agency()));

drop policy if exists ps_all on push_subs;
create policy ps_all on push_subs for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Tempo real (chat, presença, alertas)
do $$ declare t text; begin
  foreach t in array array['messages','notifications','profiles','tasks','clients','campaigns','invoices','content'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = t) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;

-- =====================================================================
-- ALERTAS AUTOMÁTICOS NO SERVIDOR (funcionam mesmo com o app fechado)
-- Agende com pg_cron (Database > Extensions > pg_cron) — ver README.
-- =====================================================================
create or replace function bw_notify(p_user uuid, p_agency uuid, p_title text, p_body text, p_type text, p_key text, p_route text)
returns void language sql security definer set search_path = public as $$
  insert into notifications(user_id, agency_id, title, body, type, key, route)
  values (p_user, p_agency, p_title, p_body, p_type, p_key, p_route)
  on conflict (user_id, key) do nothing;
$$;

create or replace function bw_daily_alerts() returns void
language plpgsql security definer set search_path = public as $$
declare r record; d date := (now() at time zone 'America/Sao_Paulo')::date; offs int[]; diff int;
begin
  for r in select p.*, s.data from profiles p left join settings s on s.agency_id = p.agency_id and s.id='main'
           where p.role in ('admin','comercial') loop
    perform bw_notify(r.id, r.agency_id, 'Bom dia, '||split_part(r.name,' ',1)||'!',
      'Você tem '||(select count(*) from tasks t where t.assignee=r.id and t.date=d and not t.is_template and t.status<>'feito')||' tarefas hoje. Confira sua programação.',
      'rotina', 'morning:'||d, 'agenda');
  end loop;
  -- Lembretes de cobrança (padrão: -5,-2,0,+1,+5,+10 dias)
  for r in select i.*, c.name cname from invoices i join clients c on c.id=i.client_id where i.status='pendente' loop
    select coalesce(array(select jsonb_array_elements_text(data->'reminder_offsets')::int), array[-5,-2,0,1,5,10])
      into offs from settings where agency_id=r.agency_id and id='main';
    offs := coalesce(offs, array[-5,-2,0,1,5,10]);
    diff := d - r.due_date;
    if diff = any(offs) then
      perform bw_notify(p.id, r.agency_id,
        case when diff<0 then 'Cobrança vence em '||(-diff)||' dia(s)' when diff=0 then 'Cobrança vence hoje' else 'Pagamento atrasado há '||diff||' dia(s)' end,
        r.cname||' — R$ '||to_char(r.amount,'FM999G999D00'), case when diff>0 then 'alerta' else 'financeiro' end,
        'inv:'||r.id||':'||diff, 'financeiro')
      from profiles p where p.agency_id=r.agency_id and p.role='admin';
    end if;
  end loop;
end $$;

create or replace function bw_task_alerts() returns void
language plpgsql security definer set search_path = public as $$
declare r record; nowl timestamp := now() at time zone 'America/Sao_Paulo'; ts timestamp;
begin
  for r in select * from tasks where not is_template and status<>'feito' and date = nowl::date and time ~ '^\d{2}:\d{2}$' loop
    ts := (r.date + r.time::time) - make_interval(mins => coalesce(r.remind_min,10));
    if nowl >= ts and nowl < ts + interval '15 minutes' then
      perform bw_notify(r.assignee, r.agency_id,
        case r.kind when 'reuniao' then 'Reunião às '||r.time when 'ligacao' then 'Chegou o horário das ligações' else 'Lembrete: '||r.time end,
        r.title, 'tarefa', 'task:'||r.id, 'agenda');
    end if;
  end loop;
end $$;

-- Cria perfil automaticamente quando um usuário é criado no Auth
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id, email, name) values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();
