// BRAVUS BILLING — cria a cobrança no Asaas (API oficial) a partir de uma cobrança do Bravus Work.
// Secrets: ASAAS_API_KEY, ASAAS_ENV ("sandbox" para testes | "production")
import { cors, json, caller } from "../_shared/util.ts";
const BASE = Deno.env.get("ASAAS_ENV") === "production" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const key = Deno.env.get("ASAAS_API_KEY"); if (!key) return json({ error: "Configure o secret ASAAS_API_KEY no Supabase." }, 400);
    const { db, profile } = await caller(req, true);
    const { invoice_id } = await req.json();
    const { data: inv } = await db.from("invoices").select("*, clients(*)").eq("id", invoice_id).eq("agency_id", profile.agency_id).single();
    if (!inv) return json({ error: "Cobrança não encontrada" }, 404);
    if (inv.asaas_id) return json({ ok: true, invoiceUrl: inv.payment_url, already: true });
    if (!inv.clients?.asaas_customer_id) return json({ error: "Informe o ID do cliente no Asaas (cus_...) no cadastro do cliente." }, 400);
    const r = await fetch(`${BASE}/payments`, {
      method: "POST", headers: { "Content-Type": "application/json", access_token: key, "User-Agent": "BravusWork" },
      body: JSON.stringify({ customer: inv.clients.asaas_customer_id, billingType: "UNDEFINED", value: Number(inv.amount), dueDate: inv.due_date, description: inv.description ?? "Mensalidade Bravus Mídia", externalReference: inv.id }),
    });
    const j = await r.json();
    if (!r.ok) return json({ error: j.errors?.[0]?.description ?? "Erro no Asaas" }, 400);
    await db.from("invoices").update({ asaas_id: j.id, payment_url: j.invoiceUrl }).eq("id", inv.id);
    return json({ ok: true, invoiceUrl: j.invoiceUrl });
  } catch (e) { return json({ error: (e as Error).message }, 401); }
});
