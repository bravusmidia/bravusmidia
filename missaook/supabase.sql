-- =====================================================================
-- MISSÃO OK — Banco de dados (Supabase)
-- Cole TUDO no Supabase > SQL Editor > New query e clique em RUN.
-- Pode rodar de novo sem problema (não apaga nada).
-- =====================================================================
create extension if not exists pgcrypto with schema extensions;

-- ---------- TABELAS ----------
create table if not exists public.mok_config (
  id int primary key default 1 check (id = 1),
  familia text not null default substr(md5(random()::text), 1, 8),
  semeado boolean not null default false
);
insert into public.mok_config (id) values (1) on conflict (id) do nothing;

create table if not exists public.mok_filhos (
  id text primary key,
  nome text not null,
  ordem int not null default 1,
  horas_pc numeric not null default 2,
  horas_cel numeric not null default 2,
  premio_extra text not null default '',
  exigir_aprovacao boolean not null default false,
  criado_em timestamptz not null default now()
);
insert into public.mok_filhos (id, nome, ordem) values
  ('henrique', 'Henrique', 1),
  ('lorenzo',  'Lorenzo',  2)
on conflict (id) do nothing;

create table if not exists public.mok_perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  papel text not null check (papel in ('pai','filho')),
  filho_id text references public.mok_filhos(id) on delete cascade,
  nome text not null default '',
  visto_em timestamptz
);

create table if not exists public.mok_tarefas (
  id text primary key,
  filho_id text not null references public.mok_filhos(id) on delete cascade,
  titulo text not null,
  icone text not null default '',
  categoria text not null default 'casa' check (categoria in ('casa','estudo','trabalho')),
  descricao text not null default '',
  recorrencia text not null default 'diaria' check (recorrencia in ('diaria','unica')),
  dias jsonb not null default '[]'::jsonb,
  data_unica date,
  horario text not null default '',
  foto boolean not null default true,
  obrigatoria boolean not null default true,
  xp int not null default 10,
  valor numeric(10,2) not null default 0,
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.mok_registros (
  id text primary key,
  filho_id text not null references public.mok_filhos(id) on delete cascade,
  tarefa_id text not null,
  data date not null,
  categoria text not null default 'casa',
  foto_antes text, foto_antes_em timestamptz,
  foto_depois text, foto_depois_em timestamptz,
  status text not null default 'pendente' check (status in ('pendente','feita','aprovada','reprovada')),
  feito_em timestamptz,
  obs text not null default '',
  xp int not null default 0,
  valor numeric(10,2) not null default 0,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.mok_pedidos (
  id text primary key,
  filho_id text not null references public.mok_filhos(id) on delete cascade,
  area text not null,
  mensagem text not null default '',
  status text not null default 'pendente' check (status in ('pendente','aprovado','negado')),
  criado_em timestamptz not null default now(),
  respondido_em timestamptz,
  expira_em timestamptz
);

create table if not exists public.mok_missoes (
  id text primary key,
  filho_id text not null references public.mok_filhos(id) on delete cascade,
  titulo text not null,
  descricao text not null default '',
  icone text not null default '🏆',
  tipo text not null default 'total' check (tipo in ('total','categoria','sequencia','dias')),
  meta int not null default 10,
  categoria text not null default '',
  premio text not null default '',
  valor numeric(10,2) not null default 0,
  xp int not null default 50,
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.mok_resgates (
  id text primary key,
  filho_id text not null references public.mok_filhos(id) on delete cascade,
  missao_id text not null,
  titulo text not null default '',
  premio text not null default '',
  valor numeric(10,2) not null default 0,
  xp int not null default 0,
  criado_em timestamptz not null default now()
);

create table if not exists public.mok_pagamentos (
  id text primary key,
  filho_id text not null references public.mok_filhos(id) on delete cascade,
  valor numeric(10,2) not null default 0,
  obs text not null default '',
  criado_em timestamptz not null default now()
);

create table if not exists public.mok_mensagens (
  id text primary key,
  filho_id text not null references public.mok_filhos(id) on delete cascade,
  autor text not null,
  texto text not null check (char_length(texto) between 1 and 1000),
  lido boolean not null default false,
  criado_em timestamptz not null default now()
);

-- ---------- FUNÇÕES DE SEGURANÇA ----------
create or replace function public.mok_is_pai() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from mok_perfis where id = auth.uid() and papel = 'pai');
$$;

create or replace function public.mok_meu_filho() returns text
language sql stable security definer set search_path = public as $$
  select filho_id from mok_perfis where id = auth.uid() and papel = 'filho' limit 1;
$$;

create or replace function public.mok_is_membro() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from mok_perfis where id = auth.uid());
$$;

create or replace function public.mok_pode_ver(fid text) returns boolean
language sql stable security definer set search_path = public as $$
  select mok_is_pai() or (fid is not null and fid = mok_meu_filho());
$$;

-- o filho só edita uma área quando o pai autorizou (e ainda não expirou)
create or replace function public.mok_tem_permissao(a text, fid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from mok_pedidos
    where area = a and filho_id = fid and status = 'aprovado' and expira_em > now());
$$;

-- tela de login (antes de entrar): nomes dos filhos e código da família
create or replace function public.mok_inicio() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'tem_pai', exists (select 1 from mok_perfis where papel = 'pai'),
    'familia', (select familia from mok_config where id = 1),
    'filhos', coalesce((select json_agg(json_build_object('id', id, 'nome', nome) order by ordem) from mok_filhos), '[]'::json),
    'com_acesso', coalesce((select json_agg(filho_id) from mok_perfis where papel = 'filho'), '[]'::json)
  );
$$;

create or replace function public.mok_registrar_pai(p_nome text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Faça login primeiro.'; end if;
  if exists (select 1 from mok_perfis where papel = 'pai' and id <> auth.uid()) then
    raise exception 'Já existe um pai cadastrado neste app.';
  end if;
  insert into mok_perfis (id, papel, nome) values (auth.uid(), 'pai', coalesce(nullif(p_nome,''), 'Pai'))
  on conflict (id) do update set papel = 'pai', filho_id = null, nome = excluded.nome;
end $$;

create or replace function public.mok_vincular_filho(p_user uuid, p_filho text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not mok_is_pai() then raise exception 'Somente o pai pode criar acessos.'; end if;
  delete from mok_perfis where filho_id = p_filho and id <> p_user;
  insert into mok_perfis (id, papel, filho_id, nome)
  values (p_user, 'filho', p_filho, (select nome from mok_filhos where id = p_filho))
  on conflict (id) do update set papel = 'filho', filho_id = excluded.filho_id, nome = excluded.nome;
end $$;

create or replace function public.mok_trocar_pin(p_filho text, p_pin text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare v uuid;
begin
  if not mok_is_pai() then raise exception 'Somente o pai pode trocar o PIN.'; end if;
  if char_length(p_pin) < 6 then raise exception 'O PIN precisa ter pelo menos 6 dígitos.'; end if;
  select id into v from mok_perfis where filho_id = p_filho limit 1;
  if v is null then raise exception 'Esse filho ainda não tem acesso criado.'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_pin, extensions.gen_salt('bf')) where id = v;
end $$;

create or replace function public.mok_ping() returns void
language sql security definer set search_path = public as $$
  update mok_perfis set visto_em = now() where id = auth.uid();
$$;

revoke all on function public.mok_inicio() from public;
grant execute on function public.mok_inicio() to anon, authenticated;
grant execute on function public.mok_registrar_pai(text), public.mok_vincular_filho(uuid, text),
  public.mok_trocar_pin(text, text), public.mok_ping() to authenticated;

-- ---------- REGRAS (o filho não consegue burlar) ----------
create or replace function public.mok_reg_guarda() returns trigger
language plpgsql security definer set search_path = public as $$
declare t mok_tarefas%rowtype;
begin
  select * into t from mok_tarefas where id = new.tarefa_id;
  if t.id is null then raise exception 'Tarefa não encontrada.'; end if;
  new.filho_id := t.filho_id;
  new.categoria := t.categoria;
  if not mok_is_pai() then
    if new.filho_id is distinct from mok_meu_filho() then raise exception 'Essa tarefa é de outra pessoa.'; end if;
    new.xp := t.xp; new.valor := t.valor;
    if new.status = 'aprovada' then raise exception 'Só o pai pode aprovar.'; end if;
    if tg_op = 'UPDATE' then
      if old.status = 'aprovada' then raise exception 'Tarefa já aprovada pelo pai.'; end if;
      if new.status = 'reprovada' and old.status <> 'reprovada' then raise exception 'Só o pai pode reprovar.'; end if;
    elsif new.status = 'reprovada' then raise exception 'Só o pai pode reprovar.';
    end if;
    if new.status = 'feita' and t.foto and (new.foto_antes is null or new.foto_depois is null) then
      raise exception 'Precisa da foto ANTES e da foto DEPOIS.';
    end if;
  end if;
  new.atualizado_em := now();
  return new;
end $$;
drop trigger if exists mok_reg_guarda on public.mok_registros;
create trigger mok_reg_guarda before insert or update on public.mok_registros
  for each row execute function public.mok_reg_guarda();

create or replace function public.mok_resgate_guarda() returns trigger
language plpgsql security definer set search_path = public as $$
declare m mok_missoes%rowtype;
begin
  select * into m from mok_missoes where id = new.missao_id;
  if m.id is null then raise exception 'Missão não encontrada.'; end if;
  new.filho_id := m.filho_id;
  if not mok_is_pai() then
    if m.filho_id is distinct from mok_meu_filho() then raise exception 'Missão de outra pessoa.'; end if;
    new.valor := m.valor; new.xp := m.xp; new.titulo := m.titulo; new.premio := m.premio;
    if exists (select 1 from mok_resgates where missao_id = new.missao_id) then
      raise exception 'Essa missão já foi resgatada.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists mok_resgate_guarda on public.mok_resgates;
create trigger mok_resgate_guarda before insert on public.mok_resgates
  for each row execute function public.mok_resgate_guarda();

create or replace function public.mok_msg_guarda() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if mok_is_pai() then
    if tg_op = 'INSERT' then new.autor := 'pai'; end if;
  else
    if tg_op = 'INSERT' then
      new.filho_id := mok_meu_filho(); new.autor := mok_meu_filho();
    else
      new.texto := old.texto; new.autor := old.autor; new.filho_id := old.filho_id;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists mok_msg_guarda on public.mok_mensagens;
create trigger mok_msg_guarda before insert or update on public.mok_mensagens
  for each row execute function public.mok_msg_guarda();

-- ---------- PERMISSÕES DA API ----------
grant select, insert, update, delete on
  public.mok_config, public.mok_filhos, public.mok_perfis, public.mok_tarefas, public.mok_registros,
  public.mok_pedidos, public.mok_missoes, public.mok_resgates, public.mok_pagamentos, public.mok_mensagens
to authenticated;

-- ---------- RLS ----------
alter table public.mok_config     enable row level security;
alter table public.mok_filhos     enable row level security;
alter table public.mok_perfis     enable row level security;
alter table public.mok_tarefas    enable row level security;
alter table public.mok_registros  enable row level security;
alter table public.mok_pedidos    enable row level security;
alter table public.mok_missoes    enable row level security;
alter table public.mok_resgates   enable row level security;
alter table public.mok_pagamentos enable row level security;
alter table public.mok_mensagens  enable row level security;

-- config
drop policy if exists mok_config_ler on public.mok_config;
create policy mok_config_ler on public.mok_config for select to authenticated using (mok_is_membro());
drop policy if exists mok_config_upd on public.mok_config;
create policy mok_config_upd on public.mok_config for update to authenticated using (mok_is_pai()) with check (mok_is_pai());
drop policy if exists mok_config_ins on public.mok_config;
create policy mok_config_ins on public.mok_config for insert to authenticated with check (mok_is_pai());

-- filhos
drop policy if exists mok_filhos_ler on public.mok_filhos;
create policy mok_filhos_ler on public.mok_filhos for select to authenticated using (mok_is_membro());
drop policy if exists mok_filhos_ins on public.mok_filhos;
create policy mok_filhos_ins on public.mok_filhos for insert to authenticated with check (mok_is_pai());
drop policy if exists mok_filhos_upd on public.mok_filhos;
create policy mok_filhos_upd on public.mok_filhos for update to authenticated
  using (mok_is_pai() or (id = mok_meu_filho() and (mok_tem_permissao('premios', id) or mok_tem_permissao('perfil', id))))
  with check (mok_is_pai() or (id = mok_meu_filho() and (mok_tem_permissao('premios', id) or mok_tem_permissao('perfil', id))));
drop policy if exists mok_filhos_del on public.mok_filhos;
create policy mok_filhos_del on public.mok_filhos for delete to authenticated using (mok_is_pai());

-- perfis (só leitura; mudanças via funções)
drop policy if exists mok_perfis_ler on public.mok_perfis;
create policy mok_perfis_ler on public.mok_perfis for select to authenticated using (mok_is_membro());

-- tarefas
drop policy if exists mok_tarefas_ler on public.mok_tarefas;
create policy mok_tarefas_ler on public.mok_tarefas for select to authenticated using (mok_pode_ver(filho_id));
drop policy if exists mok_tarefas_ins on public.mok_tarefas;
create policy mok_tarefas_ins on public.mok_tarefas for insert to authenticated
  with check (mok_is_pai() or (filho_id = mok_meu_filho() and mok_tem_permissao('tarefas', filho_id)));
drop policy if exists mok_tarefas_upd on public.mok_tarefas;
create policy mok_tarefas_upd on public.mok_tarefas for update to authenticated
  using (mok_is_pai() or (filho_id = mok_meu_filho() and mok_tem_permissao('tarefas', filho_id)))
  with check (mok_is_pai() or (filho_id = mok_meu_filho() and mok_tem_permissao('tarefas', filho_id)));
drop policy if exists mok_tarefas_del on public.mok_tarefas;
create policy mok_tarefas_del on public.mok_tarefas for delete to authenticated using (mok_is_pai());

-- registros (fotos/conclusão)
drop policy if exists mok_reg_ler on public.mok_registros;
create policy mok_reg_ler on public.mok_registros for select to authenticated using (mok_pode_ver(filho_id));
drop policy if exists mok_reg_ins on public.mok_registros;
create policy mok_reg_ins on public.mok_registros for insert to authenticated with check (mok_pode_ver(filho_id));
drop policy if exists mok_reg_upd on public.mok_registros;
create policy mok_reg_upd on public.mok_registros for update to authenticated using (mok_pode_ver(filho_id)) with check (mok_pode_ver(filho_id));
drop policy if exists mok_reg_del on public.mok_registros;
create policy mok_reg_del on public.mok_registros for delete to authenticated using (mok_is_pai());

-- pedidos de permissão
drop policy if exists mok_ped_ler on public.mok_pedidos;
create policy mok_ped_ler on public.mok_pedidos for select to authenticated using (mok_pode_ver(filho_id));
drop policy if exists mok_ped_ins on public.mok_pedidos;
create policy mok_ped_ins on public.mok_pedidos for insert to authenticated
  with check (mok_is_pai() or (filho_id = mok_meu_filho() and status = 'pendente'));
drop policy if exists mok_ped_upd on public.mok_pedidos;
create policy mok_ped_upd on public.mok_pedidos for update to authenticated using (mok_is_pai()) with check (mok_is_pai());
drop policy if exists mok_ped_del on public.mok_pedidos;
create policy mok_ped_del on public.mok_pedidos for delete to authenticated using (mok_is_pai());

-- missões
drop policy if exists mok_mis_ler on public.mok_missoes;
create policy mok_mis_ler on public.mok_missoes for select to authenticated using (mok_pode_ver(filho_id));
drop policy if exists mok_mis_ins on public.mok_missoes;
create policy mok_mis_ins on public.mok_missoes for insert to authenticated
  with check (mok_is_pai() or (filho_id = mok_meu_filho() and mok_tem_permissao('missoes', filho_id)));
drop policy if exists mok_mis_upd on public.mok_missoes;
create policy mok_mis_upd on public.mok_missoes for update to authenticated
  using (mok_is_pai() or (filho_id = mok_meu_filho() and mok_tem_permissao('missoes', filho_id)))
  with check (mok_is_pai() or (filho_id = mok_meu_filho() and mok_tem_permissao('missoes', filho_id)));
drop policy if exists mok_mis_del on public.mok_missoes;
create policy mok_mis_del on public.mok_missoes for delete to authenticated using (mok_is_pai());

-- resgates de prêmios
drop policy if exists mok_res_ler on public.mok_resgates;
create policy mok_res_ler on public.mok_resgates for select to authenticated using (mok_pode_ver(filho_id));
drop policy if exists mok_res_ins on public.mok_resgates;
create policy mok_res_ins on public.mok_resgates for insert to authenticated with check (mok_pode_ver(filho_id));
drop policy if exists mok_res_del on public.mok_resgates;
create policy mok_res_del on public.mok_resgates for delete to authenticated using (mok_is_pai());

-- pagamentos (só o pai)
drop policy if exists mok_pag_ler on public.mok_pagamentos;
create policy mok_pag_ler on public.mok_pagamentos for select to authenticated using (mok_pode_ver(filho_id));
drop policy if exists mok_pag_esc on public.mok_pagamentos;
create policy mok_pag_esc on public.mok_pagamentos for all to authenticated using (mok_is_pai()) with check (mok_is_pai());

-- chat
drop policy if exists mok_msg_ler on public.mok_mensagens;
create policy mok_msg_ler on public.mok_mensagens for select to authenticated using (mok_pode_ver(filho_id));
drop policy if exists mok_msg_ins on public.mok_mensagens;
create policy mok_msg_ins on public.mok_mensagens for insert to authenticated with check (mok_is_membro());
drop policy if exists mok_msg_upd on public.mok_mensagens;
create policy mok_msg_upd on public.mok_mensagens for update to authenticated using (mok_pode_ver(filho_id)) with check (mok_pode_ver(filho_id));
drop policy if exists mok_msg_del on public.mok_mensagens;
create policy mok_msg_del on public.mok_mensagens for delete to authenticated using (mok_is_pai());

-- ---------- FOTOS (Storage) ----------
insert into storage.buckets (id, name, public) values ('mok-fotos', 'mok-fotos', true)
on conflict (id) do nothing;
drop policy if exists "mok fotos enviar" on storage.objects;
create policy "mok fotos enviar" on storage.objects for insert to authenticated
  with check (bucket_id = 'mok-fotos' and public.mok_is_membro());
drop policy if exists "mok fotos ler" on storage.objects;
create policy "mok fotos ler" on storage.objects for select using (bucket_id = 'mok-fotos');
drop policy if exists "mok fotos apagar" on storage.objects;
create policy "mok fotos apagar" on storage.objects for delete to authenticated
  using (bucket_id = 'mok-fotos' and public.mok_is_pai());

-- ---------- TEMPO REAL ----------
do $$
declare t text;
begin
  foreach t in array array['mok_filhos','mok_tarefas','mok_registros','mok_pedidos','mok_missoes','mok_resgates','mok_pagamentos','mok_mensagens','mok_config']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- Pronto! Agora abra o app e crie a conta do Pai.
