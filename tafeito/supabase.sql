-- =====================================================================
-- TáFeito — Banco de dados (Supabase)
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

-- ---------- v1.1: ITENS PARA MARCAR UM POR UM (ex.: 3 lixeiras) ----------
alter table public.mok_tarefas   add column if not exists itens jsonb not null default '[]'::jsonb;
alter table public.mok_registros add column if not exists itens_feitos jsonb not null default '[]'::jsonb;
update public.mok_tarefas
   set itens = '["Lixeira da cozinha","Lixeira do banheiro","Lixeira do quarto"]'::jsonb,
       descricao = 'Esvaziar as 3 lixeiras e colocar saco novo. Marque cada uma.'
 where titulo ilike '%lixo%' and itens = '[]'::jsonb;

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
    if new.status = 'feita' and jsonb_array_length(coalesce(t.itens, '[]'::jsonb)) > 0
       and (select count(distinct x) from jsonb_array_elements_text(coalesce(new.itens_feitos, '[]'::jsonb)) x)
           < jsonb_array_length(t.itens) then
      raise exception 'Marque todos os itens antes de concluir.';
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

-- ---------- CONTAS SEM CONFIGURAR NADA NO SUPABASE ----------
-- Cria usuário já confirmado (não precisa de e-mail de confirmação nem mexer em Authentication)
create or replace function public.mok_criar_usuario(p_email text, p_senha text) returns uuid
language plpgsql security definer set search_path = public, extensions, auth as $$
declare v uuid;
begin
  select id into v from auth.users where email = lower(p_email) limit 1;
  if v is not null then
    update auth.users set encrypted_password = extensions.crypt(p_senha, extensions.gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now() where id = v;
    return v;
  end if;
  v := gen_random_uuid();
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token)
  values ('00000000-0000-0000-0000-000000000000', v, 'authenticated', 'authenticated', lower(p_email),
    extensions.crypt(p_senha, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v, v::text,
    jsonb_build_object('sub', v::text, 'email', lower(p_email), 'email_verified', true), 'email', now(), now(), now());
  return v;
end $$;
revoke all on function public.mok_criar_usuario(text, text) from public, anon, authenticated;

-- Conta do Pai: só funciona enquanto ainda não existe um pai cadastrado
create or replace function public.mok_criar_pai(p_nome text, p_email text, p_senha text) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if exists (select 1 from mok_perfis where papel = 'pai') then raise exception 'Já existe um pai cadastrado neste app.'; end if;
  if p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-mail inválido.'; end if;
  if char_length(p_senha) < 6 then raise exception 'A senha precisa ter pelo menos 6 caracteres.'; end if;
  v := mok_criar_usuario(p_email, p_senha);
  insert into mok_perfis (id, papel, nome) values (v, 'pai', coalesce(nullif(p_nome, ''), 'Pai'))
  on conflict (id) do update set papel = 'pai', filho_id = null, nome = excluded.nome;
end $$;
revoke all on function public.mok_criar_pai(text, text, text) from public;
grant execute on function public.mok_criar_pai(text, text, text) to anon, authenticated;

-- Acesso do filho com PIN (só o pai)
create or replace function public.mok_criar_acesso_filho(p_filho text, p_pin text) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid; fam text;
begin
  if not mok_is_pai() then raise exception 'Somente o pai pode criar acessos.'; end if;
  if p_pin !~ '^[0-9]{6,12}$' then raise exception 'O PIN precisa ter de 6 a 12 números.'; end if;
  if not exists (select 1 from mok_filhos where id = p_filho) then raise exception 'Filho não encontrado.'; end if;
  select familia into fam from mok_config where id = 1;
  v := mok_criar_usuario(p_filho || '.' || fam || '@missaook.app', p_pin);
  delete from mok_perfis where filho_id = p_filho and id <> v;
  insert into mok_perfis (id, papel, filho_id, nome) values (v, 'filho', p_filho, (select nome from mok_filhos where id = p_filho))
  on conflict (id) do update set papel = 'filho', filho_id = excluded.filho_id, nome = excluded.nome;
end $$;
revoke all on function public.mok_criar_acesso_filho(text, text) from public, anon;
grant execute on function public.mok_criar_acesso_filho(text, text) to authenticated;

-- ---------- v1.1: NOTIFICAÇÃO PUSH (chega com o app fechado) ----------
create extension if not exists pg_net with schema extensions;

create table if not exists public.mok_push_cfg (
  id int primary key default 1 check (id = 1),
  base text,
  segredo text not null default encode(extensions.gen_random_bytes(24), 'hex'),
  vapid_pub text,
  vapid_priv text
);
insert into public.mok_push_cfg (id) values (1) on conflict (id) do nothing;
alter table public.mok_push_cfg enable row level security;
revoke all on public.mok_push_cfg from anon, authenticated;

create table if not exists public.mok_push (
  endpoint text primary key,
  perfil uuid references auth.users(id) on delete cascade,
  alvo text not null,
  p256dh text not null,
  auth text not null,
  criado_em timestamptz not null default now()
);
alter table public.mok_push enable row level security;
revoke all on public.mok_push from anon, authenticated;

-- o app salva o aparelho de quem ativou as notificações
create or replace function public.mok_push_salvar(p_endpoint text, p_p256dh text, p_auth text, p_base text) returns void
language plpgsql security definer set search_path = public as $$
declare a text;
begin
  select case when papel = 'pai' then 'pai' else filho_id end into a from mok_perfis where id = auth.uid();
  if a is null then raise exception 'Perfil não encontrado.'; end if;
  insert into mok_push (endpoint, perfil, alvo, p256dh, auth) values (p_endpoint, auth.uid(), a, p_p256dh, p_auth)
  on conflict (endpoint) do update set perfil = excluded.perfil, alvo = excluded.alvo, p256dh = excluded.p256dh, auth = excluded.auth;
  if p_base ~ '^https://[a-z0-9]+\.supabase\.co$' then update mok_push_cfg set base = p_base where id = 1; end if;
end $$;
revoke all on function public.mok_push_salvar(text, text, text, text) from public, anon;
grant execute on function public.mok_push_salvar(text, text, text, text) to authenticated;

create or replace function public.mok_push_enviar(p_alvo text, p_titulo text, p_corpo text, p_tag text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare c mok_push_cfg%rowtype;
begin
  select * into c from mok_push_cfg where id = 1;
  if c.base is null or not exists (select 1 from mok_push where alvo = p_alvo) then return; end if;
  perform net.http_post(
    url := c.base || '/functions/v1/tafeito-push',
    body := jsonb_build_object('alvo', p_alvo, 'titulo', p_titulo, 'corpo', coalesce(p_corpo, ''), 'tag', p_tag),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-tafeito-segredo', c.segredo));
exception when others then null; -- aviso nunca trava o app
end $$;
revoke all on function public.mok_push_enviar(text, text, text, text) from public, anon, authenticated;

create or replace function public.mok_push_gatilho() returns trigger
language plpgsql security definer set search_path = public as $$
declare nome text; tit text;
begin
  if tg_table_name = 'mok_registros' then
    select titulo into tit from mok_tarefas where id = new.tarefa_id;
    select f.nome into nome from mok_filhos f where f.id = new.filho_id;
    if tg_op = 'UPDATE' and old.status = new.status then return null; end if;
    if new.status = 'feita' then perform mok_push_enviar('pai', '✅ ' || coalesce(nome, 'Filho') || ' concluiu', coalesce(tit, 'tarefa'), 'reg');
    elsif new.status = 'aprovada' then perform mok_push_enviar(new.filho_id, '⭐ Tarefa aprovada pelo pai', coalesce(tit, 'tarefa'), 'reg');
    elsif new.status = 'reprovada' then perform mok_push_enviar(new.filho_id, '🔁 O pai pediu para refazer', coalesce(tit, 'tarefa') || case when new.obs <> '' then ': ' || new.obs else '' end, 'reg');
    end if;
  elsif tg_table_name = 'mok_mensagens' then
    if new.autor = 'pai' then perform mok_push_enviar(new.filho_id, '💬 Pai', new.texto, 'msg');
    else
      select f.nome into nome from mok_filhos f where f.id = new.filho_id;
      perform mok_push_enviar('pai', '💬 ' || coalesce(nome, 'Filho'), new.texto, 'msg');
    end if;
  elsif tg_table_name = 'mok_pedidos' then
    select f.nome into nome from mok_filhos f where f.id = new.filho_id;
    if tg_op = 'INSERT' and new.status = 'pendente' then
      perform mok_push_enviar('pai', '🔐 Pedido de ' || coalesce(nome, 'filho'), coalesce(nullif(new.mensagem, ''), 'Quer permissão para ajustar algo'), 'ped');
    elsif tg_op = 'UPDATE' and old.status = 'pendente' and new.status <> 'pendente' then
      perform mok_push_enviar(new.filho_id, case when new.status = 'aprovado' then '✅ Pedido aprovado!' else '❌ Pedido negado' end, 'Abra o TáFeito', 'ped');
    end if;
  elsif tg_table_name = 'mok_tarefas' then
    if tg_op = 'INSERT' and new.ativa then perform mok_push_enviar(new.filho_id, '📋 Nova tarefa: ' || new.titulo, case when new.horario <> '' then 'Horário: ' || new.horario else 'Veja no app' end, 'tar'); end if;
  end if;
  return null;
end $$;

drop trigger if exists mok_push_reg on public.mok_registros;
create trigger mok_push_reg after insert or update on public.mok_registros for each row execute function public.mok_push_gatilho();
drop trigger if exists mok_push_msg on public.mok_mensagens;
create trigger mok_push_msg after insert on public.mok_mensagens for each row execute function public.mok_push_gatilho();
drop trigger if exists mok_push_ped on public.mok_pedidos;
create trigger mok_push_ped after insert or update on public.mok_pedidos for each row execute function public.mok_push_gatilho();
drop trigger if exists mok_push_tar on public.mok_tarefas;
create trigger mok_push_tar after insert on public.mok_tarefas for each row execute function public.mok_push_gatilho();

-- Pronto! Agora abra o app e crie a conta do Pai.
