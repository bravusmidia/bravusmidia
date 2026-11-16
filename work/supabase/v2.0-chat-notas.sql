-- Bravus Work v2.0: anotações no chat, confirmação de leitura e financeiro visível para a equipe
alter table messages add column if not exists pinned boolean default false;
alter table profiles add column if not exists chat_seen_at timestamptz;
create or replace function public.can_finance() returns boolean language sql stable security definer set search_path = public as $$ select is_team() $$;
