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

-- ---------- v1.2: LEMBRETE DA TAREFA NO CELULAR DO FILHO (mesmo com o app fechado) ----------
-- A cada minuto o banco olha as tarefas com horário. Na hora certa manda "⏰ Hora de..." para o filho.
-- Se 30 minutos depois ainda não estiver feita, manda "⚠️ Ainda falta..." para o filho e avisa o pai.
create extension if not exists pg_cron;

alter table public.mok_tarefas add column if not exists aviso_antes int not null default 30;

create table if not exists public.mok_push_lembrete_log (
  chave text primary key,
  criado_em timestamptz not null default now()
);
alter table public.mok_push_lembrete_log enable row level security;
revoke all on public.mok_push_lembrete_log from anon, authenticated;

create or replace function public.mok_push_lembretes() returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  agora timestamp := now() at time zone 'America/Fortaleza';
  dia date := (now() at time zone 'America/Fortaleza')::date;
  dsem int := extract(dow from (now() at time zone 'America/Fortaleza'))::int;
  t record; rid text; hora timestamp; nome text;
begin
  for t in
    select * from mok_tarefas
    where ativa and horario ~ '^\d{2}:\d{2}$'
      and (
        (recorrencia = 'diaria' and (criado_em at time zone 'America/Fortaleza')::date <= dia
          and (jsonb_array_length(dias) = 0 or dias @> to_jsonb(dsem)))
        or (recorrencia = 'unica' and coalesce(data_unica, (criado_em at time zone 'America/Fortaleza')::date) <= dia)
      )
  loop
    rid := case when t.recorrencia = 'unica' then t.id || '_u' else t.id || '_' || to_char(dia, 'YYYY-MM-DD') end;
    if exists (select 1 from mok_registros where id = rid and status in ('feita', 'aprovada')) then continue; end if;
    hora := dia + t.horario::time;

    -- aviso antes da hora (padrão 30 min)
    if coalesce(t.aviso_antes, 0) > 0 and agora >= hora - make_interval(mins => t.aviso_antes) and agora < hora - make_interval(mins => t.aviso_antes) + interval '10 minutes' and agora < hora then
      insert into mok_push_lembrete_log (chave) values (rid || '@' || dia || '@antes') on conflict do nothing;
      if found then
        perform mok_push_enviar(t.filho_id, '⏳ Em ' || t.aviso_antes || ' min: ' || t.titulo, 'Às ' || t.horario || '. Já vai se preparando!', 'lembrete');
      end if;
    end if;

    -- na hora (aceita até 10 min de atraso do relógio do servidor)
    if agora >= hora and agora < hora + interval '10 minutes' then
      insert into mok_push_lembrete_log (chave) values (rid || '@' || dia || '@hora') on conflict do nothing;
      if found then
        perform mok_push_enviar(t.filho_id, '⏰ Hora de: ' || t.titulo,
          case when t.foto then 'Tire a foto ANTES, faça e tire a foto DEPOIS.' else 'Faça e marque como feita.' end, 'lembrete');
      end if;
    end if;

    -- 30 minutos depois, se ainda não fez
    if agora >= hora + interval '30 minutes' and agora < hora + interval '40 minutes' then
      insert into mok_push_lembrete_log (chave) values (rid || '@' || dia || '@atraso') on conflict do nothing;
      if found then
        select f.nome into nome from mok_filhos f where f.id = t.filho_id;
        perform mok_push_enviar(t.filho_id, '⚠️ Ainda falta: ' || t.titulo, 'Era para as ' || t.horario || '. Faça agora e marque no TáFeito.', 'lembrete');
        perform mok_push_enviar('pai', '⚠️ ' || coalesce(nome, 'Filho') || ' ainda não fez', t.titulo || ' (era ' || t.horario || ')', 'atraso');
      end if;
    end if;
  end loop;
  delete from mok_push_lembrete_log where criado_em < now() - interval '3 days';
end $$;
revoke all on function public.mok_push_lembretes() from public, anon, authenticated;

do $$ begin
  if exists (select 1 from cron.job where jobname = 'tafeito-lembretes') then perform cron.unschedule('tafeito-lembretes'); end if;
  perform cron.schedule('tafeito-lembretes', '* * * * *', 'select public.mok_push_lembretes()');
end $$;

-- =====================================================================
-- v1.3: JOGO SÓ COM TUDO FEITO · ÁREA DE ESTUDO (PROVAS) · "CIENTE" · TEMPO ONLINE
-- =====================================================================

-- jogo/PC/celular só liberam com TODAS as tarefas do dia (inclusive as opcionais e os trabalhos do dia)
alter table public.mok_filhos add column if not exists exigir_todas boolean not null default true;

-- ---------- PROVAS ----------
create table if not exists public.mok_provas (
  id text primary key,
  filho_id text not null references public.mok_filhos(id) on delete cascade,
  materia text not null check (char_length(materia) between 1 and 80),
  conteudo text not null default '',
  data date not null,
  horario text not null default '08:00' check (horario ~ '^\d{2}:\d{2}$'),
  criado_por text not null default '',
  criado_em timestamptz not null default now()
);

-- "Ciente": cada clique fica gravado. Ninguém edita nem apaga (nem o filho, nem o pai).
create table if not exists public.mok_cientes (
  id bigint generated always as identity primary key,
  filho_id text not null,
  prova_id text not null,
  materia text not null default '',
  etapa text not null check (etapa in ('semana','2d','1d','2h','lista')),
  criado_em timestamptz not null default now()
);

-- tempo online: segundos por dia, calculados pelo relógio do servidor
create table if not exists public.mok_uso (
  perfil uuid not null references auth.users(id) on delete cascade,
  filho_id text,
  dia date not null,
  segundos int not null default 0,
  primary key (perfil, dia)
);
alter table public.mok_perfis add column if not exists entrou_em timestamptz;
alter table public.mok_perfis add column if not exists tempo_total int not null default 0;

create or replace function public.mok_prova_guarda() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not mok_is_pai() then
    if tg_op = 'INSERT' then new.filho_id := mok_meu_filho();
    elsif new.filho_id is distinct from old.filho_id then raise exception 'Não pode mudar o dono da prova.';
    end if;
  end if;
  if tg_op = 'INSERT' then
    new.criado_por := case when mok_is_pai() then 'pai' else coalesce(mok_meu_filho(), '') end;
    new.criado_em := now();
  else
    new.criado_por := old.criado_por; new.criado_em := old.criado_em;
  end if;
  return new;
end $$;
drop trigger if exists mok_prova_guarda on public.mok_provas;
create trigger mok_prova_guarda before insert or update on public.mok_provas
  for each row execute function public.mok_prova_guarda();

-- o filho toca em "Ciente": o banco grava (hora do servidor) e devolve quantas vezes ele já confirmou
create or replace function public.mok_ciente(p_prova text, p_etapa text) returns int
language plpgsql security definer set search_path = public as $$
declare pr mok_provas%rowtype; n int;
begin
  select * into pr from mok_provas where id = p_prova;
  if pr.id is null then raise exception 'Prova não encontrada.'; end if;
  if mok_meu_filho() is distinct from pr.filho_id then raise exception 'Só o dono da prova marca ciente.'; end if;
  if p_etapa not in ('semana','2d','1d','2h','lista') then raise exception 'Alerta inválido.'; end if;
  insert into mok_cientes (filho_id, prova_id, materia, etapa) values (pr.filho_id, pr.id, pr.materia, p_etapa);
  select count(*) into n from mok_cientes where filho_id = pr.filho_id;
  return n;
end $$;
revoke all on function public.mok_ciente(text, text) from public, anon;
grant execute on function public.mok_ciente(text, text) to authenticated;

-- ping a cada minuto com o app aberto: soma o tempo real que passou (no máximo 90 s por ping)
-- e marca a hora de entrada quando o app foi aberto de novo (mais de 3 min sem ping)
create or replace function public.mok_ping() returns void
language plpgsql security definer set search_path = public as $$
declare p mok_perfis%rowtype; seg int := 0; v_dia date := (now() at time zone 'America/Fortaleza')::date;
begin
  select * into p from mok_perfis where id = auth.uid();
  if p.id is null then return; end if;
  if p.visto_em is not null and now() - p.visto_em <= interval '3 minutes' then
    seg := least(90, greatest(0, extract(epoch from now() - p.visto_em)::int));
  end if;
  update mok_perfis set visto_em = now(), tempo_total = tempo_total + seg,
    entrou_em = case when p.visto_em is null or now() - p.visto_em > interval '3 minutes' then now() else coalesce(entrou_em, now()) end
   where id = p.id;
  insert into mok_uso (perfil, filho_id, dia, segundos) values (p.id, p.filho_id, v_dia, seg)
  on conflict (perfil, dia) do update set segundos = mok_uso.segundos + excluded.segundos;
end $$;
grant execute on function public.mok_ping() to authenticated;

grant select, insert, update, delete on public.mok_provas to authenticated;
grant select on public.mok_cientes, public.mok_uso to authenticated;
revoke insert, update, delete on public.mok_cientes, public.mok_uso from authenticated, anon;

alter table public.mok_provas  enable row level security;
alter table public.mok_cientes enable row level security;
alter table public.mok_uso     enable row level security;

drop policy if exists mok_prv_ler on public.mok_provas;
create policy mok_prv_ler on public.mok_provas for select to authenticated using (mok_pode_ver(filho_id));
drop policy if exists mok_prv_ins on public.mok_provas;
create policy mok_prv_ins on public.mok_provas for insert to authenticated with check (mok_pode_ver(filho_id));
drop policy if exists mok_prv_upd on public.mok_provas;
create policy mok_prv_upd on public.mok_provas for update to authenticated using (mok_pode_ver(filho_id)) with check (mok_pode_ver(filho_id));
drop policy if exists mok_prv_del on public.mok_provas;
create policy mok_prv_del on public.mok_provas for delete to authenticated using (mok_pode_ver(filho_id));

drop policy if exists mok_cie_ler on public.mok_cientes;
create policy mok_cie_ler on public.mok_cientes for select to authenticated using (mok_pode_ver(filho_id));
drop policy if exists mok_uso_ler on public.mok_uso;
create policy mok_uso_ler on public.mok_uso for select to authenticated using (mok_is_pai() or perfil = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['mok_provas','mok_cientes']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------- AVISOS: qualquer atualização chega no celular do filho ----------
create or replace function public.mok_push_gatilho2() returns trigger
language plpgsql security definer set search_path = public as $$
declare nome text; quando text; r record;
begin
  if current_setting('tafeito.silencio', true) = '1' then return null; end if;
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  if tg_table_name <> 'mok_filhos' then select f.nome into nome from mok_filhos f where f.id = r.filho_id; end if;
  if tg_table_name = 'mok_tarefas' then
    if tg_op = 'UPDATE' and (old.titulo, old.horario, old.dias, old.descricao, old.ativa, old.itens, old.valor, old.recorrencia, old.data_unica, old.obrigatoria)
        is distinct from (new.titulo, new.horario, new.dias, new.descricao, new.ativa, new.itens, new.valor, new.recorrencia, new.data_unica, new.obrigatoria) then
      perform mok_push_enviar(new.filho_id, case when not new.ativa then '⏸️ Tarefa pausada: ' else '✏️ Tarefa alterada: ' end || new.titulo,
        case when new.horario <> '' then 'Horário: ' || new.horario else 'Veja no app' end, 'tar');
    elsif tg_op = 'DELETE' then
      perform mok_push_enviar(old.filho_id, '🗑️ Tarefa removida: ' || old.titulo, 'Abra o TáFeito', 'tar');
    end if;
  elsif tg_table_name = 'mok_missoes' then
    if tg_op = 'INSERT' then perform mok_push_enviar(new.filho_id, '🎯 Nova missão: ' || new.titulo, coalesce(nullif(new.premio, ''), 'Veja no app'), 'mis');
    elsif tg_op = 'UPDATE' and (old.titulo, old.meta, old.premio, old.valor, old.ativa) is distinct from (new.titulo, new.meta, new.premio, new.valor, new.ativa) then
      perform mok_push_enviar(new.filho_id, '🎯 Missão alterada: ' || new.titulo, coalesce(nullif(new.premio, ''), 'Veja no app'), 'mis');
    end if;
  elsif tg_table_name = 'mok_filhos' then
    if (old.horas_pc, old.horas_cel, old.premio_extra, old.exigir_aprovacao, old.exigir_todas)
        is distinct from (new.horas_pc, new.horas_cel, new.premio_extra, new.exigir_aprovacao, new.exigir_todas) then
      perform mok_push_enviar(new.id, '🏆 Prêmios atualizados', '💻 ' || new.horas_pc || 'h · 📱 ' || new.horas_cel || 'h', 'mis');
    end if;
  elsif tg_table_name = 'mok_pagamentos' then
    perform mok_push_enviar(new.filho_id, '💸 Pagamento recebido', 'R$ ' || replace(to_char(new.valor, 'FM999990.00'), '.', ','), 'pag');
  elsif tg_table_name = 'mok_provas' then
    quando := coalesce(to_char(r.data, 'DD/MM') || ' às ' || r.horario, 'data ainda não definida');
    if tg_op = 'INSERT' then
      if new.criado_por = 'pai' then perform mok_push_enviar(new.filho_id, '📚 Nova prova: ' || new.materia, quando, 'prova');
      else perform mok_push_enviar('pai', '📚 ' || coalesce(nome, 'Filho') || ' marcou prova', new.materia || ' · ' || quando, 'prova'); end if;
      perform mok_push_enviar(new.filho_id, '📅 Prova salva: ' || new.materia, case when new.data is null then 'Defina a data no app para receber os lembretes.' else 'Vou te lembrar 2 dias, 1 dia e 2 horas antes.' end, 'prova');
    elsif tg_op = 'UPDATE' and (old.materia, old.data, old.horario, old.instituicao) is distinct from (new.materia, new.data, new.horario) then
      perform mok_push_enviar(new.filho_id, '✏️ Prova alterada: ' || new.materia, quando, 'prova');
      perform mok_push_enviar('pai', '✏️ Prova de ' || coalesce(nome, 'filho') || ' alterada', new.materia || ' · ' || quando, 'prova');
    elsif tg_op = 'DELETE' then
      perform mok_push_enviar(old.filho_id, '🗑️ Prova removida: ' || old.materia, quando, 'prova');
      perform mok_push_enviar('pai', '🗑️ Prova de ' || coalesce(nome, 'filho') || ' removida', old.materia || ' · ' || quando, 'prova');
    end if;
  elsif tg_table_name = 'mok_cientes' then
    perform mok_push_enviar('pai', '👍 ' || coalesce(nome, 'Filho') || ' ciente da prova', new.materia, 'ciente');
  end if;
  return null;
end $$;

drop trigger if exists mok_push_tar2 on public.mok_tarefas;
create trigger mok_push_tar2 after update or delete on public.mok_tarefas for each row execute function public.mok_push_gatilho2();
drop trigger if exists mok_push_mis on public.mok_missoes;
create trigger mok_push_mis after insert or update on public.mok_missoes for each row execute function public.mok_push_gatilho2();
drop trigger if exists mok_push_fil on public.mok_filhos;
create trigger mok_push_fil after update on public.mok_filhos for each row execute function public.mok_push_gatilho2();
drop trigger if exists mok_push_pag on public.mok_pagamentos;
create trigger mok_push_pag after insert on public.mok_pagamentos for each row execute function public.mok_push_gatilho2();
drop trigger if exists mok_push_prv on public.mok_provas;
create trigger mok_push_prv after insert or update or delete on public.mok_provas for each row execute function public.mok_push_gatilho2();
drop trigger if exists mok_push_cie on public.mok_cientes;
create trigger mok_push_cie after insert on public.mok_cientes for each row execute function public.mok_push_gatilho2();

-- ---------- LEMBRETE DAS PROVAS (mesmo com o app fechado): 2 dias, 1 dia e 2 horas antes ----------
create or replace function public.mok_push_provas() returns void
language plpgsql security definer set search_path = public, extensions as $$
declare p record; dh timestamptz; et record; quando text;
begin
  for p in select * from mok_provas where data >= (now() at time zone 'America/Fortaleza')::date - 1 loop
    dh := (p.data + p.horario::time) at time zone 'America/Fortaleza';
    if dh <= now() then continue; end if;
    quando := to_char(p.data, 'DD/MM') || ' às ' || p.horario;
    for et in select * from (values ('2d', interval '2 days', interval '1 day', '📚 Prova em 2 dias: '),
                                    ('1d', interval '1 day', interval '2 hours', '⚠️ Prova AMANHÃ: '),
                                    ('2h', interval '2 hours', interval '0', '🚨 Prova em 2 HORAS: ')) v(cod, antes, ate, tit) loop
      if now() >= dh - et.antes and now() < dh - et.ate and p.criado_em <= dh - et.antes + interval '5 minutes' then
        insert into mok_push_lembrete_log (chave) values ('prova@' || p.id || '@' || et.cod || '@' || p.data || p.horario) on conflict do nothing;
        if found then
          perform mok_push_enviar(p.filho_id, et.tit || p.materia, quando || ' · abra o TáFeito e toque em Ciente', 'prova');
        end if;
      end if;
    end loop;
  end loop;
end $$;
revoke all on function public.mok_push_provas() from public, anon, authenticated;

do $$ begin
  if exists (select 1 from cron.job where jobname = 'tafeito-provas') then perform cron.unschedule('tafeito-provas'); end if;
  perform cron.schedule('tafeito-provas', '* * * * *', 'select public.mok_push_provas()');
end $$;

-- =====================================================================
-- v1.5: IMPORTAR PROVAS DE ARQUIVO/FOTO · PROVA SEM DATA · INSTITUIÇÃO
-- =====================================================================
alter table public.mok_provas alter column data drop not null;
alter table public.mok_provas add column if not exists instituicao text not null default '';
alter table public.mok_provas add column if not exists site text not null default '';

-- salva várias provas de uma vez e manda UM aviso só (em vez de um por prova)
create or replace function public.mok_importar_provas(p_filho text, p_itens jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare it jsonb; n int := 0; nome text; com_data int := 0;
begin
  if not mok_pode_ver(p_filho) then raise exception 'Sem permissão para esse filho.'; end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) > 300 then raise exception 'Lista inválida (máx. 300).'; end if;
  perform set_config('tafeito.silencio', '1', true);
  for it in select * from jsonb_array_elements(p_itens) loop
    if coalesce(trim(it->>'materia'), '') = '' then continue; end if;
    insert into mok_provas (id, filho_id, materia, instituicao, site, conteudo, data, horario)
    values (coalesce(nullif(it->>'id', ''), gen_random_uuid()::text), p_filho, left(trim(it->>'materia'), 80),
      left(coalesce(it->>'instituicao', ''), 80), case when coalesce(it->>'site', '') ~ '^https?://' then left(it->>'site', 300) else '' end,
      left(coalesce(it->>'conteudo', ''), 500),
      nullif(it->>'data', '')::date,
      case when coalesce(it->>'horario', '') ~ '^\d{2}:\d{2}$' then it->>'horario' else '08:00' end)
    on conflict (id) do nothing;
    if found then n := n + 1; if nullif(it->>'data', '') is not null then com_data := com_data + 1; end if; end if;
  end loop;
  perform set_config('tafeito.silencio', '0', true);
  select f.nome into nome from mok_filhos f where f.id = p_filho;
  if n > 0 then
    perform mok_push_enviar(p_filho, '📥 ' || n || ' provas no calendário', com_data || ' com data · ' || (n - com_data) || ' sem data (defina no app)', 'prova');
    if not mok_is_pai() then perform mok_push_enviar('pai', '📥 ' || coalesce(nome, 'Filho') || ' importou ' || n || ' provas', com_data || ' com data', 'prova'); end if;
  end if;
  return n;
end $$;
revoke all on function public.mok_importar_provas(text, jsonb) from public, anon;
grant execute on function public.mok_importar_provas(text, jsonb) to authenticated;

-- =====================================================================
-- v1.6: FOTO DE PERFIL · MASCOTE PERSONALIZADO · WHATSAPP
-- =====================================================================
alter table public.mok_filhos add column if not exists foto text not null default '';
alter table public.mok_filhos add column if not exists mascote jsonb not null default '{}'::jsonb;
alter table public.mok_filhos add column if not exists whatsapp text not null default '';
alter table public.mok_config add column if not exists foto_pai text not null default '';
alter table public.mok_config add column if not exists whatsapp_pai text not null default '5585991225865';

-- cada um altera SÓ o próprio perfil (foto, mascote, WhatsApp). O filho não mexe no do pai nem no do irmão.
create or replace function public.mok_meu_perfil(p_foto text, p_mascote jsonb, p_whatsapp text) returns void
language plpgsql security definer set search_path = public as $$
declare f text := mok_meu_filho();
begin
  if p_foto is not null and p_foto <> '' and p_foto !~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/mok-fotos/' then
    raise exception 'Foto inválida.';
  end if;
  if p_mascote is not null and (jsonb_typeof(p_mascote) <> 'object' or octet_length(p_mascote::text) > 3000) then raise exception 'Mascote inválido.'; end if;
  p_whatsapp := nullif(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g'), '');
  if mok_is_pai() then
    update mok_config set foto_pai = coalesce(p_foto, foto_pai), whatsapp_pai = coalesce(p_whatsapp, whatsapp_pai) where id = 1;
  elsif f is not null then
    update mok_filhos set foto = coalesce(p_foto, foto), mascote = coalesce(p_mascote, mascote), whatsapp = coalesce(p_whatsapp, whatsapp) where id = f;
  else raise exception 'Perfil não encontrado.';
  end if;
end $$;
revoke all on function public.mok_meu_perfil(text, jsonb, text) from public, anon;
grant execute on function public.mok_meu_perfil(text, jsonb, text) to authenticated;

-- =====================================================================
-- v1.7: TESTE DE LEMBRETE · AVISO AO PAI (login e alterações do filho) · PERMISSÕES DA FUNÇÃO DE AVISOS
-- =====================================================================
grant usage on schema public to service_role;
grant select, insert, update, delete on public.mok_push_cfg, public.mok_push, public.mok_push_lembrete_log to service_role;

create table if not exists public.mok_testes (
  id bigint generated always as identity primary key,
  alvo text not null,
  quando timestamptz not null,
  enviado_em timestamptz,
  criado_em timestamptz not null default now()
);
alter table public.mok_testes enable row level security;
revoke all on public.mok_testes from anon, authenticated;

create or replace function public.mok_meu_alvo() returns text
language sql stable security definer set search_path = public as $$
  select case when papel = 'pai' then 'pai' else filho_id end from mok_perfis where id = auth.uid();
$$;

-- agenda um aviso de teste no celular de quem pediu (chega mesmo com o app fechado)
create or replace function public.mok_agendar_teste(p_quando timestamptz) returns json
language plpgsql security definer set search_path = public as $$
declare a text := mok_meu_alvo(); n int;
begin
  if a is null then raise exception 'Perfil não encontrado.'; end if;
  if p_quando < now() - interval '1 minute' or p_quando > now() + interval '30 days' then raise exception 'Escolha uma hora entre agora e os próximos 30 dias.'; end if;
  if (select count(*) from mok_testes where alvo = a and enviado_em is null) >= 5 then raise exception 'Já existem 5 testes agendados. Espere chegarem.'; end if;
  insert into mok_testes (alvo, quando) values (a, p_quando);
  select count(*) into n from mok_push where alvo = a;
  return json_build_object('aparelhos', n, 'quando', p_quando);
end $$;
revoke all on function public.mok_agendar_teste(timestamptz) from public, anon;
grant execute on function public.mok_agendar_teste(timestamptz) to authenticated;

-- quantos aparelhos de quem pergunta estão prontos para receber aviso + testes pendentes
create or replace function public.mok_status_avisos() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'aparelhos', (select count(*) from mok_push where alvo = mok_meu_alvo()),
    'servidor', (select base is not null from mok_push_cfg where id = 1),
    'testes', coalesce((select json_agg(json_build_object('quando', quando, 'enviado_em', enviado_em) order by quando desc)
       from (select * from mok_testes where alvo = mok_meu_alvo() order by quando desc limit 5) t), '[]'::json));
$$;
grant execute on function public.mok_status_avisos() to authenticated;

-- ping: avisa o pai quando o filho ENTRA no app (nova sessão)
create or replace function public.mok_ping() returns void
language plpgsql security definer set search_path = public as $$
declare p mok_perfis%rowtype; seg int := 0; v_dia date := (now() at time zone 'America/Fortaleza')::date; novo boolean;
begin
  select * into p from mok_perfis where id = auth.uid();
  if p.id is null then return; end if;
  novo := p.visto_em is null or now() - p.visto_em > interval '3 minutes';
  if not novo then seg := least(90, greatest(0, extract(epoch from now() - p.visto_em)::int)); end if;
  update mok_perfis set visto_em = now(), tempo_total = tempo_total + seg,
    entrou_em = case when novo then now() else coalesce(entrou_em, now()) end where id = p.id;
  insert into mok_uso (perfil, filho_id, dia, segundos) values (p.id, p.filho_id, v_dia, seg)
  on conflict (perfil, dia) do update set segundos = mok_uso.segundos + excluded.segundos;
  if novo and p.papel = 'filho' then
    perform mok_push_enviar('pai', '🟢 ' || p.nome || ' entrou no app', to_char(now() at time zone 'America/Fortaleza', 'HH24:MI'), 'login');
  end if;
end $$;

-- o pai é avisado de tudo que o filho adiciona ou muda
create or replace function public.mok_push_pai_filho() returns trigger
language plpgsql security definer set search_path = public as $$
declare nome text; r record; t text;
begin
  if current_setting('tafeito.silencio', true) = '1' or mok_is_pai() or auth.uid() is null then return null; end if;
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  if tg_table_name = 'mok_filhos' then nome := r.nome; else select f.nome into nome from mok_filhos f where f.id = r.filho_id; end if;
  nome := coalesce(nome, 'Filho');
  if tg_table_name = 'mok_filhos' then
    if (old.foto, old.mascote, old.whatsapp, old.nome) is not distinct from (new.foto, new.mascote, new.whatsapp, new.nome) then return null; end if;
    t := '👤 ' || nome || ' atualizou o perfil';
  elsif tg_table_name = 'mok_tarefas' then t := (case tg_op when 'INSERT' then '➕ ' || nome || ' criou a tarefa ' else '✏️ ' || nome || ' alterou a tarefa ' end) || r.titulo;
  elsif tg_table_name = 'mok_missoes' then t := (case tg_op when 'INSERT' then '➕ ' || nome || ' criou a missão ' else '✏️ ' || nome || ' alterou a missão ' end) || r.titulo;
  elsif tg_table_name = 'mok_resgates' then t := '🏅 ' || nome || ' resgatou: ' || r.titulo;
  end if;
  if t is not null then perform mok_push_enviar('pai', t, 'Abra o TáFeito', 'filho'); end if;
  return null;
end $$;
drop trigger if exists mok_pai_tar on public.mok_tarefas;
create trigger mok_pai_tar after insert or update on public.mok_tarefas for each row execute function public.mok_push_pai_filho();
drop trigger if exists mok_pai_mis on public.mok_missoes;
create trigger mok_pai_mis after insert or update on public.mok_missoes for each row execute function public.mok_push_pai_filho();
drop trigger if exists mok_pai_res on public.mok_resgates;
create trigger mok_pai_res after insert on public.mok_resgates for each row execute function public.mok_push_pai_filho();
drop trigger if exists mok_pai_fil on public.mok_filhos;
create trigger mok_pai_fil after update on public.mok_filhos for each row execute function public.mok_push_pai_filho();

-- a cada minuto: envia os testes agendados (junto com os lembretes de prova)
create or replace function public.mok_push_testes() returns void
language plpgsql security definer set search_path = public as $$
declare t record;
begin
  for t in select * from mok_testes where enviado_em is null and quando <= now() order by quando limit 50 loop
    update mok_testes set enviado_em = now() where id = t.id;
    perform mok_push_enviar(t.alvo, '✅ Teste de lembrete funcionou!', 'Seu celular recebe os avisos do TáFeito mesmo com o app fechado. Provas: 2 dias, 1 dia e 2 horas antes.', 'teste');
  end loop;
  delete from mok_testes where enviado_em < now() - interval '7 days';
end $$;
revoke all on function public.mok_push_testes() from public, anon, authenticated;
do $$ begin
  if exists (select 1 from cron.job where jobname = 'tafeito-testes') then perform cron.unschedule('tafeito-testes'); end if;
  perform cron.schedule('tafeito-testes', '* * * * *', 'select public.mok_push_testes()');
end $$;


-- v1.8: CONECTORES (login do Notion guardado no servidor, só a função lê)
create table if not exists public.mok_conectores (
  perfil uuid not null references auth.users(id) on delete cascade,
  tipo text not null,
  token text not null,
  nome text not null default '',
  conta text not null default '',
  criado_em timestamptz not null default now(),
  primary key (perfil, tipo)
);
alter table public.mok_conectores enable row level security;
revoke all on public.mok_conectores from anon, authenticated;
grant select, insert, update, delete on public.mok_conectores to service_role;

-- v1.8: CENTRAL DE NOTIFICAÇÕES (todo aviso fica guardado e aparece no sininho do app)
create table if not exists public.mok_avisos (
  id bigint generated always as identity primary key,
  alvo text not null,
  titulo text not null,
  corpo text not null default '',
  tag text not null default '',
  lido boolean not null default false,
  criado_em timestamptz not null default now()
);
create index if not exists mok_avisos_alvo on public.mok_avisos (alvo, criado_em desc);
alter table public.mok_avisos enable row level security;
revoke all on public.mok_avisos from anon, authenticated;
grant select on public.mok_avisos to authenticated;
drop policy if exists mok_avisos_ler on public.mok_avisos;
create policy mok_avisos_ler on public.mok_avisos for select to authenticated using (alvo = mok_meu_alvo());
create or replace function public.mok_avisos_lidos() returns void
language sql security definer set search_path = public as $$
  update mok_avisos set lido = true where alvo = mok_meu_alvo() and not lido;
$$;
grant execute on function public.mok_avisos_lidos() to authenticated;
do $$ begin
  begin execute 'alter publication supabase_realtime add table public.mok_avisos'; exception when duplicate_object then null; end;
end $$;

-- todo aviso: guarda na central do app E manda para o celular (mesmo com o app fechado)
create or replace function public.mok_push_enviar(p_alvo text, p_titulo text, p_corpo text, p_tag text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare c mok_push_cfg%rowtype;
begin
  begin
    insert into mok_avisos (alvo, titulo, corpo, tag) values (p_alvo, left(coalesce(p_titulo, ''), 200), left(coalesce(p_corpo, ''), 500), coalesce(p_tag, ''));
    delete from mok_avisos where criado_em < now() - interval '60 days';
  exception when others then null;
  end;
  select * into c from mok_push_cfg where id = 1;
  if c.base is null or not exists (select 1 from mok_push where alvo = p_alvo) then return; end if;
  perform net.http_post(
    url := c.base || '/functions/v1/tafeito-push',
    body := jsonb_build_object('alvo', p_alvo, 'titulo', p_titulo, 'corpo', coalesce(p_corpo, ''), 'tag', p_tag),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-tafeito-segredo', c.segredo));
exception when others then null;
end $$;
revoke all on function public.mok_push_enviar(text, text, text, text) from public, anon, authenticated;

-- Pronto! Agora abra o app e crie a conta do Pai.
