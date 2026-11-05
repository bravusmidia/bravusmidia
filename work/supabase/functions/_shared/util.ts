// Utilidades compartilhadas das Edge Functions do Bravus Work
import { createClient } from "npm:@supabase/supabase-js@2";

export const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
export const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

// Cliente com chave de serviço (só existe no servidor, nunca no app)
export const admin = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

// Confere quem está chamando: precisa ser da equipe (admin/comercial)
export async function caller(req: Request, needAdmin = false) {
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const db = admin();
  const { data: u, error } = await db.auth.getUser(token);
  if (error || !u.user) throw new Error("Não autenticado");
  const { data: p } = await db.from("profiles").select("*").eq("id", u.user.id).single();
  if (!p || !["admin", "comercial"].includes(p.role)) throw new Error("Sem permissão");
  if (needAdmin && p.role !== "admin") throw new Error("Apenas o administrador");
  return { db, profile: p };
}

export async function notify(db: ReturnType<typeof admin>, agency: string, roles: string[], title: string, body: string, type: string, key: string, route: string) {
  const { data: ps } = await db.from("profiles").select("id").eq("agency_id", agency).in("role", roles);
  for (const p of ps ?? []) {
    await db.from("notifications").upsert({ user_id: p.id, agency_id: agency, title, body, type, key, route }, { onConflict: "user_id,key", ignoreDuplicates: true });
  }
}
