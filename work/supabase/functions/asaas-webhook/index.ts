// BRAVUS BILLING — recebe os avisos do Asaas e dá baixa automática (pagamento confirmado pelo Asaas).
// Secret: ASAAS_WEBHOOK_TOKEN (o mesmo "Token de autenticação" cadastrado no webhook do Asaas)
// Publicar com: supabase functions deploy asaas-webhook --no-verify-jwt
import { json, admin, notify } from "../_shared/util.ts";

Deno.serve(async req => {
  const tok = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
  if (!tok || req.headers.get("asaas-access-token") !== tok) return json({ error: "unauthorized" }, 401);
  const ev = await req.json(); const p = ev.payment ?? {};
  const db = admin();
  let { data: inv } = await db.from("invoices").select("*, clients(name)").eq("asaas_id", p.id).maybeSingle();
  if (!inv && p.externalReference) ({ data: inv } = await db.from("invoices").select("*, clients(name)").eq("id", p.externalReference).maybeSingle());
  if (!inv) return json({ ok: true, ignored: true });
  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  if (["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED", "PAYMENT_RECEIVED_IN_CASH"].includes(ev.event)) {
    await db.from("invoices").update({ status: "pago", paid_at: (p.paymentDate ?? p.confirmedDate ?? new Date().toISOString()).slice(0, 10), method: p.billingType ?? "Asaas", confirmed_by: "Asaas", asaas_id: p.id }).eq("id", inv.id);
    await db.from("activity").insert({ agency_id: inv.agency_id, action: `Pagamento confirmado pelo Asaas: ${brl(Number(p.value))}`, client_id: inv.client_id });
    await notify(db, inv.agency_id, ["admin"], "Pagamento recebido 💰", `${inv.clients?.name} — ${brl(Number(p.value))}`, "pago", `paid:${inv.id}`, "financeiro");
  } else if (ev.event === "PAYMENT_OVERDUE") {
    await notify(db, inv.agency_id, ["admin"], "Pagamento vencido", `${inv.clients?.name} — ${brl(Number(p.value))}`, "alerta", `overdue:${inv.id}`, "financeiro");
  } else if (["PAYMENT_DELETED", "PAYMENT_REFUNDED"].includes(ev.event)) {
    await db.from("invoices").update({ status: ev.event === "PAYMENT_DELETED" ? "cancelado" : "pendente" }).eq("id", inv.id);
  }
  return json({ ok: true });
});
