-- Bravus Work v3.4: página pública de horários livres (horarios.html)
-- Devolve SOMENTE datas e horários ocupados + configuração de blocos. Nunca nomes, telefones ou empresas.
create or replace function public.bw_public_slots(p_days int default 7)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  s settings%rowtype;
  d0 date := (now() at time zone 'America/Fortaleza')::date;
  n int := least(greatest(coalesce(p_days, 7), 1), 14);
begin
  select * into s from settings where id = 'main' order by agency_id limit 1;
  if not found or coalesce((s.data->'avail'->>'public')::boolean, true) = false then
    return jsonb_build_object('off', true);
  end if;
  return jsonb_build_object(
    'name',  coalesce(s.data->>'agency_name', 'Bravus Mídia'),
    'start', coalesce(nullif(s.data->>'meetings_start', ''), '18:30'),
    'end',   coalesce(nullif(s.data->>'meetings_end', ''), '21:30'),
    'slot',  coalesce(nullif(s.data->>'meet_slot', '')::int, 60),
    'closed', coalesce(s.data->'avail'->'closed', '{}'::jsonb),
    'extra',  coalesce(s.data->'avail'->'extra', '{}'::jsonb),
    'today', d0,
    'busy', coalesce((
      select jsonb_agg(jsonb_build_object('d', t.date, 't', t.time) order by t.date, t.time)
      from tasks t
      where t.agency_id = s.agency_id and t.kind = 'reuniao' and not coalesce(t.is_template, false)
        and coalesce(t.status, 'pendente') not in ('cancelada', 'remarcada', 'noshow')
        and t.time is not null and t.date between d0 and d0 + n
    ), '[]'::jsonb)
  );
end $$;

revoke all on function public.bw_public_slots(int) from public;
grant execute on function public.bw_public_slots(int) to anon, authenticated;
