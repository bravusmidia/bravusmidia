-- Bravus Work v2.2: ticket (baixo / médio / alto) em cada reunião
alter table tasks add column if not exists ticket text check (ticket in ('baixo', 'medio', 'alto'));
