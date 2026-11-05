// BRAVUS WORK — asaas-webhook (versão para colar no painel do Supabase)
// O Asaas chama este endereço a cada novidade nas cobranças (criada, paga, vencida, estornada).
// Funciona também para cobranças feitas direto no Asaas (assinaturas), ligando ao cliente do app pelo nome.
// Secrets: ASAAS_WEBHOOK_TOKEN (igual ao token do webhook no Asaas), ASAAS_API_KEY, ASAAS_ENV
// IMPORTANTE: nas configurações desta função, DESLIGUE "Verify JWT" (o Asaas não faz login).
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const BASE = Deno.env.get("ASAAS_ENV") === "sandbox" ? "https://api-sandbox.asaas.com/v3" : "https://api.asaas.com/v3";
const KEY = Deno.env.get("ASAAS_API_KEY") ?? "";
const norm = (s = "") => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const PAID = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH", "DUNNING_RECEIVED"];
const CANCEL = ["REFUNDED", "DELETED", "REFUND_REQUESTED", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE"];

Deno.serve(async (req) => {
  const tok = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
  if (!tok || req.headers.get("asaas-access-token") !== tok) return json({ error: "unauthorized" }, 401);
  const ev = await req.json();
  const p = ev.payment;
  if (!p?.id) return json({ ok: true, ignored: "sem cobrança" });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  // 1) acha a cobrança no app (pelo id do Asaas ou pela referência), senão acha o cliente
  let { data: inv } = await db.from("invoices").select("*").eq("asaas_id", p.id).maybeSingle();
  if (!inv && p.externalReference) ({ data: inv } = await db.from("invoices").select("*").eq("id", p.externalReference).maybeSingle());
  let client: any = null;
  if (inv) ({ data: client } = await db.from("clients").select("*").eq("id", inv.client_id).maybeSingle());
  if (!client) ({ data: client } = await db.from("clients").select("*").eq("asaas_customer_id", p.customer).maybeSingle());
  if (!client && KEY) {
    // cliente ainda não ligado: busca o nome no Asaas e liga pelo nome da empresa
    const r = await fetch(`${BASE}/customers/${p.customer}`, { headers: { access_token: KEY, "User-Agent": "BravusWork" } });
    if (r.ok) {
      const cu = await r.json();
      const company = cu.name?.includes("|") ? cu.name.split("|").slice(1).join("|") : cu.name;
      const cands = [company, cu.company, cu.name].filter(Boolean).map(norm).filter((x: string) => x.length >= 4);
      const { data: cls } = await db.from("clients").select("*");
      client = cls?.find((c) => cands.includes(norm(c.name))) ?? cls?.find((c) => { const m = norm(c.name); return m.length >= 4 && cands.some((n) => m.includes(n) || n.includes(m)); }) ?? null;
      if (client) await db.from("clients").update({ asaas_customer_id: p.customer }).eq("id", client.id);
    }
  }
  if (!client) return json({ ok: true, ignored: "cliente não encontrado no Bravus Work" });

  // 2) grava/atualiza a cobrança espelhando o Asaas
  const row = {
    agency_id: client.agency_id, client_id: client.id, amount: Number(p.value), due_date: p.dueDate,
    description: p.description?.slice(0, 120) || "Cobrança Asaas", asaas_id: p.id, payment_url: p.invoiceUrl ?? null, method: p.billingType ?? null,
    status: PAID.includes(p.status) ? "pago" : CANCEL.includes(p.status) || ev.event === "PAYMENT_DELETED" ? "cancelado" : "pendente",
    paid_at: PAID.includes(p.status) ? (p.clientPaymentDate ?? p.paymentDate ?? p.confirmedDate ?? new Date().toISOString().slice(0, 10)) : null,
    confirmed_by: PAID.includes(p.status) ? "Asaas" : null,
  };
  const wasPaid = inv?.status === "pago";
  if (inv) await db.from("invoices").update(row).eq("id", inv.id);
  else await db.from("invoices").insert(row);

  // 3) avisos no app
  const notify = async (title: string, body: string, type: string, key: string) => {
    const { data: ps } = await db.from("profiles").select("id").eq("agency_id", client.agency_id).eq("role", "admin");
    for (const x of ps ?? []) await db.from("notifications").upsert(
      { user_id: x.id, agency_id: client.agency_id, title, body, type, key, route: "financeiro" }, { onConflict: "user_id,key", ignoreDuplicates: true });
  };
  if (row.status === "pago" && !wasPaid) {
    await db.from("activity").insert({ agency_id: client.agency_id, action: `Pagamento confirmado pelo Asaas: ${brl(Number(p.value))}`, client_id: client.id });
    await notify("Pagamento recebido 💰", `${client.name} — ${brl(Number(p.value))}`, "pago", `paid:asaas:${p.id}`);
  } else if (ev.event === "PAYMENT_OVERDUE") {
    await notify("Pagamento vencido", `${client.name} — ${brl(Number(p.value))}`, "alerta", `overdue:asaas:${p.id}`);
  } else if (ev.event === "PAYMENT_REFUNDED") {
    await notify("Pagamento estornado", `${client.name} — ${brl(Number(p.value))}`, "alerta", `refund:asaas:${p.id}`);
  }
  return json({ ok: true });
});
