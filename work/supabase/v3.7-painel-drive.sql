-- Bravus Work v3.7: painel no Google Drive
-- A planilha (Apps Script) lê as métricas que o app do admin grava em settings.data.metrics,
-- usando uma CHAVE secreta própria. Sem a chave, nada sai. Pode rodar mais de uma vez.
create table if not exists public.bw_private (id int primary key default 1, metrics_key text not null);
alter table public.bw_private enable row level security;   -- sem políticas: ninguém lê pela API
revoke all on public.bw_private from anon, authenticated;
insert into public.bw_private (id, metrics_key) values (1, encode(extensions.gen_random_bytes(24), 'hex'))
  on conflict (id) do nothing;

create or replace function public.bw_metrics(p_key text)
returns jsonb language plpgsql security definer stable set search_path = public as $$
declare k text; m jsonb;
begin
  select metrics_key into k from bw_private where id = 1;
  if k is null or p_key is null or length(p_key) < 32 or p_key <> k then
    raise exception 'chave inválida' using errcode = '28000';
  end if;
  select s.data->'metrics' into m from settings s where s.id = 'main' order by s.agency_id limit 1;
  return coalesce(m, '{}'::jsonb);
end $$;
revoke all on function public.bw_metrics(text) from public;
grant execute on function public.bw_metrics(text) to anon, authenticated;

-- link da planilha no botão "Painel no Drive" (Reuniões)
update public.settings set data = data || jsonb_build_object('sheet_url', 'https://docs.google.com/spreadsheets/d/1ecAVA942Ac1fw9_8rmMDhiqMVRBNoBxFa7-XfHcIe5c/edit') where id = 'main';

-- mostra a chave UMA vez para colar no Apps Script da planilha (Propriedades do script → BW_KEY)
select metrics_key from public.bw_private where id = 1;
