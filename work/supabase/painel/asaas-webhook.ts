// BRAVUS WORK — asaas-webhook (versão para colar no painel do Supabase)
// O Asaas chama este endereço quando um pagamento é confirmado, vence ou é estornado.
// Secret necessário: ASAAS_WEBHOOK_TOKEN (o mesmo "token de autenticação" cadastrado no webhook do Asaas)
// IMPORTANTE: nas configurações desta função, DESLIGUE "Verify JWT" (o Asaas não faz login).
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

Deno.serve(async (req) => {
  const tok = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
  if (!tok || req.headers.get("asaas-access-token") !== tok) return json({ error: "unauthorized" }, 401);
  const ev = await req.json();
  const p = ev.payment ?? {};
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  let { data: inv } = await db.from("invoices").select("*, clients(name)").eq("asaas_id", p.id ?? "").maybeSingle();
  if (!inv && p.externalReference) ({ data: inv } = await db.from("invoices").select("*, clients(name)").eq("id", p.externalReference).maybeSingle());
  if (!inv) return json({ ok: true, ignored: true }); // cobrança feita fora do Bravus Work

  const notify = async (title: string, body: string, type: string, key: string) => {
    const { data: ps } = await db.from("profiles").select("id").eq("agency_id", inv.agency_id).eq("role", "admin");
    for (const x of ps ?? []) await db.from("notifications").upsert(
      { user_id: x.id, agency_id: inv.agency_id, title, body, type, key, route: "financeiro" }, { onConflict: "user_id,key", ignoreDuplicates: true });
  };

  if (["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED", "PAYMENT_RECEIVED_IN_CASH"].includes(ev.event)) {
    await db.from("invoices").update({ status: "pago", paid_at: (p.paymentDate ?? p.confirmedDate ?? new Date().toISOString()).slice(0, 10),
      method: p.billingType ?? "Asaas", confirmed_by: "Asaas", asaas_id: p.id }).eq("id", inv.id);
    await db.from("activity").insert({ agency_id: inv.agency_id, action: `Pagamento confirmado pelo Asaas: ${brl(Number(p.value))}`, client_id: inv.client_id });
    await notify("Pagamento recebido 💰", `${inv.clients?.name} — ${brl(Number(p.value))}`, "pago", `paid:${inv.id}`);
  } else if (ev.event === "PAYMENT_OVERDUE") {
    await notify("Pagamento vencido", `${inv.clients?.name} — ${brl(Number(p.value))}`, "alerta", `overdue:${inv.id}`);
  } else if (ev.event === "PAYMENT_DELETED") {
    await db.from("invoices").update({ status: "cancelado" }).eq("id", inv.id);
  } else if (ev.event === "PAYMENT_REFUNDED") {
    await db.from("invoices").update({ status: "pendente", paid_at: null }).eq("id", inv.id);
    await notify("Pagamento estornado", `${inv.clients?.name} — ${brl(Number(p.value))}`, "alerta", `refund:${inv.id}`);
  }
  return json({ ok: true });
});
