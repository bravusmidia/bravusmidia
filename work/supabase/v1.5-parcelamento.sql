-- Bravus Work v1.5: mensalidade parcelada em até 2x
alter table clients add column if not exists installments int default 1;
alter table clients add column if not exists due_day2 int;
