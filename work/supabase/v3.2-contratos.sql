-- Bravus Work v3.2: Contratos e Propostas (modelos editáveis → PDF)
-- Supabase: SQL Editor → New query → cole → Run. (Sem isto o app guarda os documentos só neste aparelho.)
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null default my_agency() references agencies(id),
  kind text not null check (kind in ('contrato','proposta')),
  client_id uuid references clients(id) on delete set null,
  title text,
  data jsonb not null default '{}'::jsonb,
  created_by uuid default auth.uid() references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.documents enable row level security;
drop policy if exists documents_sel on public.documents;
create policy documents_sel on public.documents for select using (agency_id = my_agency() and is_team());
drop policy if exists documents_ins on public.documents;
create policy documents_ins on public.documents for insert with check (agency_id = my_agency() and is_team());
drop policy if exists documents_upd on public.documents;
create policy documents_upd on public.documents for update using (agency_id = my_agency() and is_team()) with check (agency_id = my_agency() and is_team());
drop policy if exists documents_del on public.documents;
create policy documents_del on public.documents for delete using (agency_id = my_agency() and is_admin());
grant select, insert, update, delete on public.documents to authenticated;
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'documents') then
    alter publication supabase_realtime add table public.documents;
  end if;
end $$;
