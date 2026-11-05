// BRAVUS WORK — asaas-sync (versão para colar no painel do Supabase)
// Espelha o Asaas no Bravus Work: liga cada cliente do Asaas ao cliente do app (pelo nome),
// completa WhatsApp/e-mail/valor/vencimento que estiverem vazios e traz as cobranças (pagas e em aberto).
// Secrets necessários: ASAAS_API_KEY, ASAAS_ENV ("production" ou "sandbox")
// Nas configurações desta função, DESLIGUE "Verify JWT" (a própria função confere se é o administrador).
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const BASE = Deno.env.get("ASAAS_ENV") === "sandbox" ? "https://api-sandbox.asaas.com/v3" : "https://api.asaas.com/v3";
const KEY = Deno.env.get("ASAAS_API_KEY") ?? "";

async function asaas(path: string) {
  const r = await fetch(`${BASE}${path}`, { headers: { access_token: KEY, "User-Agent": "BravusWork" } });
  const j = await r.json();
  if (!r.ok) throw new Error(j.errors?.[0]?.description ?? `Asaas respondeu ${r.status}`);
  return j;
}
async function all(path: string) {
  const out: any[] = []; let offset = 0;
  for (let i = 0; i < 20; i++) {
    const j = await asaas(`${path}${path.includes("?") ? "&" : "?"}limit=100&offset=${offset}`);
    out.push(...(j.data ?? [])); if (!j.hasMore) break; offset += 100;
  }
  return out;
}
const norm = (s = "") => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
// "Tatiane Thais | Amese" -> empresa "Amese", contato "Tatiane Thais"
const split = (name = "") => name.includes("|") ? { contact: name.split("|")[0].trim(), company: name.split("|").slice(1).join("|").trim() } : { contact: "", company: name.trim() };
export function matchClient(clients: any[], cust: any) {
  const byId = clients.find((c) => c.asaas_customer_id === cust.id); if (byId) return byId;
  const { company } = split(cust.name); const cands = [company, cust.company, cust.name].filter(Boolean).map(norm).filter((x) => x.length >= 4);
  for (const n of cands) { const c = clients.find((c) => norm(c.name) === n); if (c) return c; }
  for (const n of cands) { const c = clients.find((c) => { const m = norm(c.name); return m.length >= 4 && (m.includes(n) || n.includes(m)); }); if (c) return c; }
  return null;
}
const PAID = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH", "DUNNING_RECEIVED"];
const CANCEL = ["REFUNDED", "DELETED", "REFUND_REQUESTED", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE"];
export const invoiceFromPayment = (p: any) => ({
  amount: Number(p.value), due_date: p.dueDate, description: p.description?.slice(0, 120) || "Cobrança Asaas",
  status: PAID.includes(p.status) ? "pago" : CANCEL.includes(p.status) ? "cancelado" : "pendente",
  paid_at: PAID.includes(p.status) ? (p.clientPaymentDate ?? p.paymentDate ?? p.confirmedDate ?? p.dueDate) : null,
  method: p.billingType ?? null, confirmed_by: PAID.includes(p.status) ? "Asaas" : null, asaas_id: p.id, payment_url: p.invoiceUrl ?? null,
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (!KEY) return json({ error: "Falta o secret ASAAS_API_KEY no Supabase." }, 400);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: u } = await db.auth.getUser(token);
    if (!u?.user) return json({ error: "Faça login novamente." }, 401);
    const { data: me } = await db.from("profiles").select("*").eq("id", u.user.id).single();
    if (!me || me.role !== "admin") return json({ error: "Apenas o administrador sincroniza o Asaas." }, 403);
    const ag = me.agency_id;

    const { data: clients } = await db.from("clients").select("*").eq("agency_id", ag);
    const custs = await all("/customers");
    const linked: string[] = [], unmatched: string[] = [];
    const custToClient = new Map<string, any>();
    for (const cu of custs) {
      if (cu.deleted) continue;
      const c = matchClient(clients ?? [], cu);
      if (!c) { unmatched.push(cu.name); continue; }
      custToClient.set(cu.id, c);
      const patch: Record<string, unknown> = {};
      if (c.asaas_customer_id !== cu.id) patch.asaas_customer_id = cu.id;
      const { contact } = split(cu.name);
      if (!c.contact && contact) patch.contact = contact;
      if (!c.whatsapp && (cu.mobilePhone || cu.phone)) patch.whatsapp = cu.mobilePhone || cu.phone;
      if (!c.email && cu.email) patch.email = cu.email;
      const subs = await all(`/subscriptions?customer=${cu.id}&status=ACTIVE`);
      if (subs[0]) {
        if (!Number(c.contract_value)) patch.contract_value = subs.reduce((a, s) => a + Number(s.value), 0);
        if (!c.due_day && subs[0].nextDueDate) patch.due_day = Number(String(subs[0].nextDueDate).slice(8, 10));
      }
      if (Object.keys(patch).length) { await db.from("clients").update(patch).eq("id", c.id); Object.assign(c, patch); }
      linked.push(c.name);
    }

    // Cobranças: em aberto/vencidas + as dos últimos 120 dias
    const since = new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 10);
    const pays = [...await all(`/payments?dueDate%5Bge%5D=${since}`), ...await all(`/payments?status=OVERDUE`)];
    const seen = new Set<string>(); let created = 0, updated = 0;
    for (const p of pays) {
      if (seen.has(p.id)) continue; seen.add(p.id);
      const c = custToClient.get(p.customer); if (!c) continue;
      const row = { ...invoiceFromPayment(p), agency_id: ag, client_id: c.id };
      const { data: ex } = await db.from("invoices").select("id,status").eq("asaas_id", p.id).maybeSingle();
      if (ex) { await db.from("invoices").update(row).eq("id", ex.id); updated++; }
      else {
        // evita duplicar mensalidade criada no app para o mesmo cliente/vencimento/valor
        const { data: twin } = await db.from("invoices").select("id").eq("client_id", c.id).eq("due_date", p.dueDate).eq("amount", Number(p.value)).is("asaas_id", null).maybeSingle();
        if (twin) { await db.from("invoices").update(row).eq("id", twin.id); updated++; }
        else { await db.from("invoices").insert(row); created++; }
      }
    }
    await db.from("activity").insert({ agency_id: ag, user_id: me.id, action: `Sincronizou o Asaas: ${linked.length} clientes ligados, ${created} cobranças novas, ${updated} atualizadas` });
    return json({ ok: true, linked: linked.length, unmatched, created, updated });
  } catch (e) { return json({ error: (e as Error).message }, 500); }
});
