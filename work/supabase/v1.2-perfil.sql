-- Bravus Work v1.2: perfil completo da equipe (cargo, nascimento, WhatsApp, detalhes)
alter table profiles add column if not exists title text;
alter table profiles add column if not exists birth_date date;
alter table profiles add column if not exists phone text;
alter table profiles add column if not exists bio text;
