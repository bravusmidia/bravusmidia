-- Bravus Work v2.6: tempo online de cada pessoa (conta para sempre, visível para toda a equipe)
create table if not exists online_time (
  agency_id uuid not null default my_agency() references agencies(id),
  user_id uuid not null references profiles(id) on delete cascade,
  day date not null,
  seconds int not null default 0,
  primary key (user_id, day)
);
alter table online_time enable row level security;
drop policy if exists ot_sel on online_time;
create policy ot_sel on online_time for select using (agency_id = my_agency() and is_team());
-- ninguém escreve direto na tabela: só pela função abaixo (cada um soma no próprio tempo, no máximo 90 s por vez)
create or replace function public.bw_add_time(p_seconds int) returns int language plpgsql security definer set search_path = public as $$
declare d date := (now() at time zone 'America/Sao_Paulo')::date; s int := greatest(0, least(coalesce(p_seconds, 0), 90)); r int;
begin
  if auth.uid() is null or my_agency() is null then return 0; end if;
  insert into online_time (agency_id, user_id, day, seconds) values (my_agency(), auth.uid(), d, s)
  on conflict (user_id, day) do update set seconds = online_time.seconds + excluded.seconds returning seconds into r;
  update profiles set last_seen = now() where id = auth.uid();
  return r;
end $$;
revoke all on function public.bw_add_time(int) from public, anon;
grant execute on function public.bw_add_time(int) to authenticated;
grant select on online_time to authenticated;
