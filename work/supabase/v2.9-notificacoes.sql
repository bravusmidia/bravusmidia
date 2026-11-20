-- =====================================================================
-- Bravus Work v2.9 — NOTIFICAÇÕES NO CELULAR (mesmo com o app fechado)
--  • Lembrete em qualquer item (tabela reminders)
--  • Reuniões avisam toda a equipe 20 min antes
--  • Push automático: cada aviso novo vai direto para o celular
-- Cole no Supabase → SQL Editor → Run. Pode rodar mais de uma vez.
-- Depois publique a função send-push (Verify JWT desligado). Não precisa de secrets.
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ---------- LEMBRETES EM QUALQUER ITEM ----------
create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null default my_agency() references agencies(id),
  item_type text not null default 'avulso',          -- cliente | reuniao | tarefa | cobranca | conteudo | avulso
  item_id uuid, title text not null check (length(title) <= 200), body text, route text,
  remind_at timestamptz not null, users uuid[] not null default '{}',
  created_by uuid references profiles(id) default auth.uid(),
  sent boolean default false, created_at timestamptz default now()
);
create index if not exists reminders_due on reminders (remind_at) where not sent;
alter table reminders enable row level security;
drop policy if exists rm_sel on reminders;
create policy rm_sel on reminders for select using (agency_id = my_agency() and is_team());
drop policy if exists rm_ins on reminders;
create policy rm_ins on reminders for insert with check (agency_id = my_agency() and is_team());
drop policy if exists rm_upd on reminders;
create policy rm_upd on reminders for update using (agency_id = my_agency() and is_team());
drop policy if exists rm_del on reminders;
create policy rm_del on reminders for delete using (agency_id = my_agency() and (created_by = auth.uid() or exists (select 1 from profiles where id = auth.uid() and role = 'admin')));
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'reminders') then
    alter publication supabase_realtime add table reminders;
  end if;
end $$;

-- ---------- REUNIÕES: aviso padrão 20 min antes ----------
alter table tasks alter column remind_min set default 10;
update tasks set remind_min = 20 where kind = 'reuniao' and not is_template and coalesce(remind_min, 30) = 30 and status = 'pendente';

-- ---------- LEMBRETES DE TAREFAS E REUNIÕES (servidor) ----------
-- Reuniões e compromissos marcados por alguém avisam TODA a equipe; rotina automática avisa só o responsável.
-- A chave é a mesma do app, então ninguém recebe o mesmo aviso duas vezes.
create or replace function bw_task_alerts() returns void
language plpgsql security definer set search_path = public as $$
declare r record; p record; nowl timestamp := now() at time zone 'America/Sao_Paulo'; ts timestamp; who text; quem text; tt text; rm int;
begin
  for r in select t.*, c.name cname from tasks t left join clients c on c.id = t.client_id
           where not t.is_template and t.status not in ('feito','cancelada','remarcada','noshow')
             and t.date between nowl::date and nowl::date + 1 and t.time ~ '^\d{2}:\d{2}$' loop
    rm := coalesce(r.remind_min, 10);
    ts := (r.date + r.time::time) - make_interval(mins => rm);
    continue when not (nowl >= ts and nowl < ts + interval '15 minutes');
    who := coalesce(nullif(r.company,''), r.cname, nullif(r.contact_name,''), r.title);
    quem := coalesce((select split_part(name,' ',1) from profiles where id = r.assignee), 'equipe');
    for p in select id from profiles where agency_id = r.agency_id and role in ('admin','comercial')
               and (id = r.assignee or r.kind = 'reuniao' or r.template_id is null) loop
      tt := case when r.kind = 'reuniao' then
                   case when p.id = r.assignee then '📅 Você tem reunião às '||r.time else '📅 Reunião de '||quem||' às '||r.time end
                   || case when rm > 0 then ' (em '||rm||' min)' else '' end
                 when r.kind = 'ligacao' then case when p.id = r.assignee then 'Chegou o horário das ligações' else 'Ligações de '||quem||' às '||r.time end
                 else case when p.id = r.assignee then 'Lembrete das '||r.time else 'Compromisso de '||quem||' às '||r.time end end;
      perform bw_notify(p.id, r.agency_id, tt, case when r.kind = 'reuniao' then who else r.title end, 'tarefa',
                        'task:'||r.id||r.date::text||r.time, case when r.kind = 'reuniao' then 'reunioes' else 'agenda' end);
    end loop;
  end loop;
end $$;

create or replace function bw_reminder_alerts() returns void
language plpgsql security definer set search_path = public as $$
declare r record; u uuid;
begin
  for r in select * from reminders where not sent and remind_at <= now() for update skip locked loop
    if now() - r.remind_at < interval '6 hours' then
      foreach u in array r.users loop
        perform bw_notify(u, r.agency_id, '🔔 '||r.title,
          coalesce(r.body||' · ','')||'Lembrete das '||to_char(r.remind_at at time zone 'America/Sao_Paulo','HH24:MI'),
          'tarefa', 'rem:'||r.id, coalesce(r.route,'alertas'));
      end loop;
    end if;
    update reminders set sent = true where id = r.id;
  end loop;
end $$;

-- ---------- PUSH AUTOMÁTICO: todo aviso novo chama a função send-push ----------
-- Tabela privada (sem regras de acesso = só o servidor lê). O segredo é gerado aqui mesmo,
-- e as chaves VAPID são geradas pela função send-push na primeira chamada. Ninguém copia segredo.
create table if not exists push_config (
  id int primary key default 1 check (id = 1),
  hook_secret text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  vapid_public text, vapid_private text, subject text default 'mailto:bravusmidiaoficial@gmail.com'
);
alter table push_config enable row level security;
insert into push_config(id) values (1) on conflict do nothing;

-- o app pede só a chave PÚBLICA (a privada nunca sai do servidor)
create or replace function bw_vapid_public() returns text
language sql security definer stable set search_path = public as $$ select vapid_public from push_config where id = 1 $$;
revoke all on function bw_vapid_public() from public, anon;
grant execute on function bw_vapid_public() to authenticated;

create or replace function bw_push_hook() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://widrjidmnzhkaofaraov.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type','application/json',
      'x-webhook-secret', (select hook_secret from push_config where id = 1)),
    body := jsonb_build_object('record', jsonb_build_object('user_id', new.user_id, 'title', new.title, 'body', new.body, 'key', new.key, 'route', new.route)));
  return new;
exception when others then return new;  -- nunca trava o app se o push falhar
end $$;
drop trigger if exists bw_push on notifications;
create trigger bw_push after insert on notifications for each row execute function bw_push_hook();

-- ---------- AGENDAMENTOS (rodam sozinhos no servidor) ----------
select cron.unschedule(jobname) from cron.job where jobname in ('bw-tasks','bw-reminders','bw-daily');
select cron.schedule('bw-tasks',     '* * * * *',  'select bw_task_alerts()');      -- a cada minuto
select cron.schedule('bw-reminders', '* * * * *',  'select bw_reminder_alerts()');  -- a cada minuto
select cron.schedule('bw-daily',     '0 11 * * *', 'select bw_daily_alerts()');     -- 08:00 em Fortaleza
