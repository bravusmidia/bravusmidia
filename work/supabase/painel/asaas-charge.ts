// BRAVUS WORK — asaas-charge (versão para colar no painel do Supabase)
// Cria no Asaas a cobrança (Pix/boleto/cartão) de uma mensalidade do Bravus Work.
// Secrets necessários: ASAAS_API_KEY, ASAAS_ENV ("production" ou "sandbox")
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const BASE = Deno.env.get("ASAAS_ENV") === "sandbox" ? "https://api-sandbox.asaas.com/v3" : "https://api.asaas.com/v3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const key = Deno.env.get("ASAAS_API_KEY");
    if (!key) return json({ error: "Falta o secret ASAAS_API_KEY no Supabase." }, 400);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: u } = await db.auth.getUser(token);
    if (!u?.user) return json({ error: "Faça login novamente." }, 401);
    const { data: me } = await db.from("profiles").select("*").eq("id", u.user.id).single();
    if (!me || me.role !== "admin") return json({ error: "Apenas o administrador gera cobranças." }, 403);

    const { invoice_id } = await req.json();
    const { data: inv } = await db.from("invoices").select("*, clients(*)").eq("id", invoice_id).eq("agency_id", me.agency_id).single();
    if (!inv) return json({ error: "Cobrança não encontrada." }, 404);
    if (inv.asaas_id) return json({ ok: true, invoiceUrl: inv.payment_url, already: true });
    if (!inv.clients?.asaas_customer_id) return json({ error: "Preencha o ID do cliente no Asaas (cus_...) no cadastro do cliente." }, 400);

    const r = await fetch(`${BASE}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", access_token: key, "User-Agent": "BravusWork" },
      body: JSON.stringify({ customer: inv.clients.asaas_customer_id, billingType: "UNDEFINED", value: Number(inv.amount),
        dueDate: inv.due_date, description: inv.description ?? "Mensalidade Bravus Mídia", externalReference: inv.id }),
    });
    const j = await r.json();
    if (!r.ok) return json({ error: j.errors?.[0]?.description ?? "O Asaas recusou a cobrança." }, 400);
    await db.from("invoices").update({ asaas_id: j.id, payment_url: j.invoiceUrl }).eq("id", inv.id);
    await db.from("activity").insert({ agency_id: me.agency_id, user_id: me.id, action: `Gerou cobrança no Asaas: R$ ${Number(inv.amount).toFixed(2)}`, client_id: inv.client_id });
    return json({ ok: true, invoiceUrl: j.invoiceUrl });
  } catch (e) { return json({ error: (e as Error).message }, 500); }
});
