// Utilidades compartilhadas pelas Edge Functions do Bravus Lead.
// Segredos (tokens da Meta, service role) ficam APENAS em variáveis de ambiente das funções.
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.118.0';

export const GRAPH_VERSION = Deno.env.get('GRAPH_API_VERSION') ?? 'v26.0';
export const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? 'https://www.bravusmidia.com.br,http://localhost:5173')
  .split(',').map((s) => s.trim());

export function cors(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

export function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });
}

export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
}

/** Valida o JWT do usuário e devolve o id dele. */
export async function requireUser(req: Request, db: SupabaseClient): Promise<string> {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Não autenticado');
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Sessão inválida ou expirada');
  return data.user.id;
}

export async function requireRole(db: SupabaseClient, orgId: string, userId: string, roles: string[]) {
  const { data } = await db.from('memberships').select('role').eq('org_id', orgId).eq('user_id', userId).eq('active', true).maybeSingle();
  if (!data || !roles.includes(data.role)) throw new HttpError(403, 'Sem permissão para esta ação');
  return data.role as string;
}

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message); }
}

export function metaToken(): string {
  const t = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  if (!t) throw new HttpError(503, 'Integração não configurada: falta o token de acesso da Meta nos secrets.');
  return t;
}

/** Comparação em tempo constante. */
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function hmacSha256Hex(secret: string, payload: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Palavras que indicam pedido para parar de receber mensagens. */
const OPT_OUT = ['parar', 'pare', 'sair', 'stop', 'cancelar', 'descadastrar', 'remover', 'nao quero', 'não quero',
  'nao quero mais', 'não quero mais', 'parar promoções', 'parar promocoes', 'stop promotions', 'nao me mande mais', 'não me mande mais'];

export function isOptOut(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = text.trim().toLowerCase().replace(/[.!]+$/g, '');
  return OPT_OUT.includes(t);
}
