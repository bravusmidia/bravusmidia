-- Bravus Work v2.8.1: reuniões liberadas em qualquer horário para todos (inclusive membros)
drop trigger if exists bw_meet_rule on tasks;
drop function if exists public.bw_meet_rule();
