-- Bravus Work v1.4: reuniões com clientes e leads
alter table tasks add column if not exists contact_name text;
alter table tasks add column if not exists company text;
alter table tasks add column if not exists phone text;
alter table tasks add column if not exists meet_type text;
alter table tasks add column if not exists meet_format text;
alter table tasks add column if not exists outcome text;
