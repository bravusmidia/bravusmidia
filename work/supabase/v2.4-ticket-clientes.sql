-- Bravus Work v2.5: ticket do cliente (ouro / prata / bronze). Vazio = automático pelo valor do contrato.
alter table clients add column if not exists tier text check (tier in ('ouro', 'prata', 'bronze'));
