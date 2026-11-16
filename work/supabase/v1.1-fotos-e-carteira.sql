-- Bravus Work v1.1: foto de perfil + controle de clientes online/offline
alter table profiles add column if not exists avatar_url text;
alter table clients add column if not exists end_date date;
alter table clients add column if not exists end_reason text;
