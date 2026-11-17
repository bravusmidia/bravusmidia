-- Bravus Work v2.8.0: etapas do andamento pós-reunião (proposta, contrato, pagamento, onboarding, operação)
-- Opcional: o app já funciona sem isto (guarda as etapas num campo existente). Rodando, fica num campo próprio.
-- Supabase: SQL Editor → New query → cole → Run.
alter table public.tasks add column if not exists pipeline jsonb default '{}'::jsonb;
