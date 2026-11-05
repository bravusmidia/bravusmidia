#!/usr/bin/env python3
"""Converte o backup (pg_dump em SQL puro, com COPY) do antigo projeto Supabase "bravus-lead"
em um SQL de importação para o schema "crm" do projeto do Bravus Work.

- Usuários são ligados pelo E-MAIL (o id do login muda de um projeto para outro).
- Gatilhos do CRM ficam desligados durante a importação (não duplica histórico/automação).
- Perfis antigos atualizam os perfis já existentes (mesmo e-mail).
Uso: python3 backup_para_sql.py backup.sql[.gz] saida.sql
"""
import sys, gzip, re, os, collections
HERE = os.path.dirname(os.path.abspath(__file__))

def opener(p):
    with open(p, 'rb') as f: magic = f.read(2)
    return gzip.open(p, 'rt', encoding='utf-8', errors='replace') if magic == b'\x1f\x8b' else open(p, encoding='utf-8', errors='replace')

ESC = {'b': '\b', 'f': '\f', 'n': '\n', 'r': '\r', 't': '\t', 'v': '\v', '\\': '\\'}
def unescape(s):
    if s == r'\N': return None
    out, i = [], 0
    while i < len(s):
        ch = s[i]
        if ch == '\\' and i + 1 < len(s):
            n = s[i + 1]
            if n in ESC: out.append(ESC[n]); i += 2; continue
            m = re.match(r'[0-7]{1,3}', s[i + 1:])
            if m: out.append(chr(int(m.group(), 8))); i += 1 + len(m.group()); continue
            m = re.match(r'x[0-9a-fA-F]{1,2}', s[i + 1:])
            if m: out.append(chr(int(m.group()[1:], 16))); i += 1 + len(m.group()); continue
            out.append(n); i += 2; continue
        out.append(ch); i += 1
    return ''.join(out)

def read_copies(path):
    data = collections.OrderedDict(); cur = None
    for line in opener(path):
        if cur is None:
            m = re.match(r'COPY\s+"?(\w+)"?\."?(\w+)"?\s*\((.*?)\)\s+FROM stdin;', line)
            if m:
                cur = (m.group(1), m.group(2)); cols = [c.strip().strip('"') for c in m.group(3).split(',')]
                data[cur] = {'cols': cols, 'rows': []}
            continue
        if line.rstrip('\n') == '\\.': cur = None; continue
        data[cur]['rows'].append([unescape(v) for v in line.rstrip('\n').split('\t')])
    return data

def lit(v): return "'" + v.replace("'", "''") + "'"

def main(src, dst):
    types = collections.defaultdict(dict); notnull = collections.defaultdict(set)
    for l in open(os.path.join(HERE, 'crm_cols.tsv'), encoding='utf-8'):
        t, c, ty, nn = l.rstrip('\n').split('\t'); types[t][c] = ty
        if nn == 't': notnull[t].add(c)
    deps = collections.defaultdict(set)
    for l in open(os.path.join(HERE, 'crm_fks.tsv'), encoding='utf-8'):
        a, b = l.rstrip('\n').split('\t')
        if a != b: deps[a].add(b)
    data = read_copies(src)
    users = {}
    if ('auth', 'users') in data:
        d = data[('auth', 'users')]; ii, ie = d['cols'].index('id'), d['cols'].index('email')
        users = {r[ii]: r[ie] for r in d['rows'] if r[ie]}
    tables = {t: d for (s, t), d in data.items() if s == 'public' and t in types and d['rows']}
    skipped = sorted(t for (s, t), d in data.items() if s == 'public' and t not in types and d['rows'])
    # ordem respeitando as chaves estrangeiras
    order, seen = [], set()
    def visit(t, stack=()):
        if t in seen or t in stack: return
        for d in sorted(deps[t]): visit(d, stack + (t,))
        seen.add(t); order.append(t)
    for t in sorted(types): visit(t)
    order = [t for t in order if t in tables and t != 'profiles']
    uref = lambda e: f"(select id from auth.users where lower(email) = lower({lit(e)}) limit 1)"
    out = ["-- Importação dos dados do antigo projeto bravus-lead para o schema crm (gerado automaticamente)",
           f"-- Usuários encontrados no backup: {', '.join(sorted(set(users.values()))) or 'nenhum'}",
           "begin;", "set local search_path = crm, public, extensions;"]
    out += [f"alter table crm.{t} disable trigger user;" for t in order]
    stats = []
    for t in order:
        d = tables[t]; cols = [c for c in d['cols'] if c in types[t]]; idx = [d['cols'].index(c) for c in cols]
        n = 0
        for r in d['rows']:
            vals, conds = [], []
            for c, i in zip(cols, idx):
                v = r[i]; ty = types[t][c]
                if v is None: vals.append('null'); continue
                if ty == 'uuid' and v in users:
                    vals.append(uref(users[v]))
                    if c in notnull[t]: conds.append(f"exists (select 1 from auth.users where lower(email) = lower({lit(users[v])}))")
                    continue
                vals.append(f"{lit(v)}::{ty}")
            colsql = ', '.join('"' + c + '"' for c in cols)
            if conds:
                out.append(f"insert into crm.{t} ({colsql}) overriding system value select {', '.join(vals)} where {' and '.join(conds)} on conflict do nothing;")
            else:
                out.append(f"insert into crm.{t} ({colsql}) overriding system value values ({', '.join(vals)}) on conflict do nothing;")
            n += 1
        stats.append(f"{t}: {n}")
    if ('public', 'profiles') in data:
        d = data[('public', 'profiles')]; c = d['cols']
        for r in d['rows']:
            row = dict(zip(c, r)); e = row.get('email')
            if not e: continue
            sets = [f"{k} = {lit(row[k])}::{types['profiles'][k]}" for k in ('full_name', 'phone', 'avatar_url', 'theme', 'current_org_id') if k in row and row[k] is not None and k in types['profiles']]
            if sets: out.append(f"update crm.profiles set {', '.join(sets)} where lower(email) = lower({lit(e)});")
    out += [f"alter table crm.{t} enable trigger user;" for t in order]
    out.append("update crm.profiles p set current_org_id = (select m.org_id from crm.memberships m where m.user_id = p.id and m.active order by m.created_at limit 1) where current_org_id is null;")
    out.append("""do $$ declare r record; begin
  for r in select c.relname t, a.attname col from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'crm' and a.attidentity <> '' loop
    execute format('select setval(pg_get_serial_sequence(%L, %L), coalesce((select max(%I) from crm.%I), 0) + 1, false)', 'crm.' || r.t, r.col, r.col, r.t);
  end loop; end $$;""")
    out += ["commit;", "select 'Dados do CRM importados' as resultado;"]
    open(dst, 'w', encoding='utf-8').write('\n'.join(out) + '\n')
    print('\n'.join(stats)); print('usuarios:', sorted(set(users.values())))
    if skipped: print('tabelas ignoradas (não existem no CRM):', skipped)

if __name__ == '__main__': main(sys.argv[1], sys.argv[2])
