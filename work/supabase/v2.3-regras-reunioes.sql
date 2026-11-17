-- Bravus Work v2.4: regra de horário das reuniões para membros + só o admin exclui clientes
-- Rode uma vez no Supabase: SQL Editor → New query → cole tudo → Run.

-- 1) Feriados (nacionais + Ceará + Fortaleza), iguais aos do app
create or replace function public.bw_is_holiday(d date) returns boolean language plpgsql immutable as $$
declare y int := extract(year from d); a int; b int; c int; dd int; e int; f int; g int; h int; i int; k int; l int; m int; easter date; md text := to_char(d, 'MM-DD');
begin
  if md in ('01-01','03-19','03-25','04-13','04-21','05-01','08-15','09-07','10-12','11-02','11-15','11-20','12-25') then return true; end if;
  a := y % 19; b := y / 100; c := y % 100; dd := b / 4; e := b % 4; f := (b + 8) / 25; g := (b - f + 1) / 3;
  h := (19 * a + b - dd - g + 15) % 30; i := c / 4; k := c % 4; l := (32 + 2 * e + 2 * i - h - k) % 7; m := (a + 11 * h + 22 * l) / 451;
  easter := make_date(y, (h + l - 7 * m + 114) / 31, ((h + l - 7 * m + 114) % 31) + 1);
  return d in (easter - 48, easter - 47, easter - 2, easter + 60);
end $$;

-- 2) Membro (não admin): segunda a sexta só a partir das 18:30; sábado, domingo e feriado em qualquer horário. Admin é livre.
create or replace function public.bw_meet_rule() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind is distinct from 'reuniao' or is_admin() or new.date is null or new.time is null then return new; end if;
  if tg_op = 'UPDATE' and new.date is not distinct from old.date and new.time is not distinct from old.time then return new; end if;
  if extract(isodow from new.date) between 1 and 5 and not bw_is_holiday(new.date) and new.time < '18:30' then
    raise exception 'Horário fora da regra: de segunda a sexta, reuniões a partir das 18:30 (fim de semana e feriado: qualquer horário).';
  end if;
  return new;
end $$;
drop trigger if exists bw_meet_rule on tasks;
create trigger bw_meet_rule before insert or update on tasks for each row execute function public.bw_meet_rule();

-- 3) Só o administrador exclui clientes (e as cobranças)
drop policy if exists clients_del on clients;
create policy clients_del on clients for delete using (agency_id = my_agency() and is_admin());
