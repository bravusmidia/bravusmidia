import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { demoDb } from './demo';

export type Row = Record<string, any>;
export type Mode = 'supabase' | 'demo' | 'unconfigured';

const CFG_KEY = 'bravus.lead.supabase';
const MODE_KEY = 'bravus.lead.mode';

export function getConfig(): { url: string; key: string } | null {
  const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (envUrl && envKey) return { url: envUrl, key: envKey };
  try {
    const raw = localStorage.getItem(CFG_KEY);
    if (raw) { const c = JSON.parse(raw); if (c?.url && c?.key) return c; }
  } catch { /* storage indisponível */ }
  return null;
}

export function saveConfig(url: string, key: string) {
  const u = url.trim().replace(/\/+$/, '');
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(u)) throw new Error('URL inválida. Use o formato https://SEU-PROJETO.supabase.co');
  if (key.trim().length < 20) throw new Error('Chave anon inválida.');
  if (/service_role/i.test(atobSafe(key.split('.')[1] ?? ''))) throw new Error('Esta é a chave SERVICE ROLE (secreta). Use a chave anon/public.');
  localStorage.setItem(CFG_KEY, JSON.stringify({ url: u, key: key.trim() }));
  localStorage.removeItem(MODE_KEY);
}
function atobSafe(s: string) { try { return atob(s.replace(/-/g, '+').replace(/_/g, '/')); } catch { return ''; } }

export function clearConfig() { localStorage.removeItem(CFG_KEY); }

export function getMode(): Mode {
  try { if (localStorage.getItem(MODE_KEY) === 'demo') return 'demo'; } catch { /* */ }
  return getConfig() ? 'supabase' : 'unconfigured';
}
export function setDemo(on: boolean) { on ? localStorage.setItem(MODE_KEY, 'demo') : localStorage.removeItem(MODE_KEY); }

let _sb: SupabaseClient | null = null;
export function sb(): SupabaseClient {
  if (_sb) return _sb;
  const c = getConfig();
  if (!c) throw new Error('Supabase não configurado');
  _sb = createClient(c.url, c.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } });
  return _sb;
}

export interface ListOpts {
  eq?: Record<string, any>;
  is?: Record<string, null>;
  order?: [string, boolean?];
  limit?: number;
  select?: string;
  gte?: Record<string, any>;
}

export interface Db {
  list(table: string, o?: ListOpts): Promise<Row[]>;
  get(table: string, id: string): Promise<Row | null>;
  insert(table: string, row: Row | Row[]): Promise<Row[]>;
  update(table: string, id: string, patch: Row): Promise<Row>;
  remove(table: string, id: string): Promise<void>;
  rpc(name: string, args?: Row): Promise<any>;
  invoke(fn: string, body: Row): Promise<any>;
}

function friendly(e: any): Error {
  const msg: string = e?.message ?? String(e);
  if (/row-level security/i.test(msg)) return new Error('Você não tem permissão para esta ação.');
  if (/duplicate key/i.test(msg)) return new Error('Registro duplicado.');
  if (/JWT|expired/i.test(msg)) return new Error('Sua sessão expirou. Entre novamente.');
  return new Error(msg);
}

const supaDb: Db = {
  async list(table, o = {}) {
    let q: any = sb().from(table).select(o.select ?? '*');
    for (const [k, v] of Object.entries(o.eq ?? {})) q = q.eq(k, v);
    for (const [k, v] of Object.entries(o.is ?? {})) q = q.is(k, v);
    for (const [k, v] of Object.entries(o.gte ?? {})) q = q.gte(k, v);
    if (o.order) q = q.order(o.order[0], { ascending: o.order[1] ?? true });
    q = q.limit(o.limit ?? 5000);
    const { data, error } = await q;
    if (error) throw friendly(error);
    return data ?? [];
  },
  async get(table, id) {
    const { data, error } = await sb().from(table).select('*').eq('id', id).maybeSingle();
    if (error) throw friendly(error);
    return data;
  },
  async insert(table, row) {
    const { data, error } = await sb().from(table).insert(row as any).select('*');
    if (error) throw friendly(error);
    return data ?? [];
  },
  async update(table, id, patch) {
    const { data, error } = await sb().from(table).update(patch).eq('id', id).select('*').maybeSingle();
    if (error) throw friendly(error);
    if (!data) throw new Error('Você não tem permissão para alterar este registro.');
    return data;
  },
  async remove(table, id) {
    const { error, count } = await sb().from(table).delete({ count: 'exact' }).eq('id', id);
    if (error) throw friendly(error);
    if (count === 0) throw new Error('Você não tem permissão para excluir este registro.');
  },
  async rpc(name, args) {
    const { data, error } = await sb().rpc(name, args ?? {});
    if (error) throw friendly(error);
    return data;
  },
  async invoke(fn, body) {
    const { data, error } = await sb().functions.invoke(fn, { body });
    if (error) {
      let detail: any = null;
      try { detail = await (error as any).context?.json(); } catch { /* */ }
      if (detail) return detail;
      throw new Error(/Failed to send|fetch/i.test(error.message) ? 'Função do servidor não publicada ou indisponível. Veja Integrações → passo a passo.' : error.message);
    }
    return data;
  },
};

export const db: Db = new Proxy({} as Db, {
  get(_t, prop: keyof Db) {
    const impl = getMode() === 'demo' ? demoDb : supaDb;
    return (impl as any)[prop];
  },
});
