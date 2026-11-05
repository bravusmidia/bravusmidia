// BRAVUS ADS MONITOR — sincroniza contas e campanhas pela Meta Marketing API (oficial).
// Secrets: META_ACCESS_TOKEN (token de Usuário do Sistema do Business Manager, permissão ads_read)
//          META_API_VERSION (opcional, ex.: v23.0)
import { cors, json, caller, notify } from "../_shared/util.ts";

const V = Deno.env.get("META_API_VERSION") ?? "v23.0";
const TOKEN = Deno.env.get("META_ACCESS_TOKEN") ?? "";
const G = (path: string, params: Record<string, string>) => {
  const u = new URL(`https://graph.facebook.com/${V}/${path}`);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  return fetch(u, { headers: { Authorization: `Bearer ${TOKEN}` } }).then(async r => {
    const j = await r.json(); if (j.error) throw new Error(j.error.message); return j;
  });
};
const ACC_STATUS: Record<number, string> = { 1: "ativa", 2: "desativada", 3: "pagamento pendente", 7: "em análise de risco", 8: "acerto pendente", 9: "período de carência", 100: "encerramento pendente", 101: "encerrada" };
const LEAD = ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead", "onsite_web_lead"];
const CONV = ["purchase", "offsite_conversion.fb_pixel_purchase", "onsite_web_purchase"];
const sumAct = (acts: any[] = [], types: string[]) => acts.filter(a => types.includes(a.action_type)).reduce((s, a) => s + Number(a.value || 0), 0);

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (!TOKEN) return json({ error: "Configure o secret META_ACCESS_TOKEN no Supabase." }, 400);
    const { db, profile } = await caller(req);
    const { data: clients } = await db.from("clients").select("*").eq("agency_id", profile.agency_id).not("ad_account_id", "is", null);
    let accounts = 0, campaigns = 0; const errors: string[] = [];
    for (const c of clients ?? []) {
      const act = String(c.ad_account_id).startsWith("act_") ? c.ad_account_id : `act_${c.ad_account_id}`;
      try {
        const a = await G(act, { fields: "name,account_status,disable_reason,currency,amount_spent,spend_cap,balance,is_prepay_account,funding_source_details" });
        // Saldo: somente o que a Meta informa. Pré-pago: texto do saldo disponível; limite de gastos: limite − gasto.
        let bal: number | null = null, src: string | null = null;
        const disp: string = a.funding_source_details?.display_string ?? "";
        const m = disp.match(/([\d.]+,\d{2})/);
        if (a.is_prepay_account && m) { bal = Number(m[1].replace(/\./g, "").replace(",", ".")); src = "Meta · saldo pré-pago"; }
        else if (Number(a.spend_cap) > 0) { bal = (Number(a.spend_cap) - Number(a.amount_spent)) / 100; src = "Meta · restante do limite"; }
        const st = ACC_STATUS[a.account_status] ?? `status ${a.account_status}`;
        await db.from("clients").update({ ad_account_status: a.account_status === 1 ? "ativa" : st, ad_balance: bal, ad_balance_source: src, ad_synced_at: new Date().toISOString() }).eq("id", c.id);
        if (a.account_status !== 1) await notify(db, c.agency_id, ["admin", "comercial"], "Conta de anúncios com alerta", `${c.name}: ${st}`, "alerta", `meta:${c.id}:${a.account_status}:${new Date().toISOString().slice(0, 10)}`, "campanhas");
        accounts++;

        const cs = await G(`${act}/campaigns`, {
          fields: "id,name,effective_status,daily_budget,insights.date_preset(last_30d){spend,reach,impressions,clicks,actions}",
          limit: "100", effective_status: JSON.stringify(["ACTIVE", "PAUSED", "CAMPAIGN_PAUSED", "ADSET_PAUSED", "WITH_ISSUES", "DISAPPROVED", "PENDING_REVIEW", "IN_PROCESS"]),
        });
        for (const k of cs.data ?? []) {
          const ins = k.insights?.data?.[0] ?? {};
          const es: string = k.effective_status;
          const status = es === "ACTIVE" ? "ativa" : /PAUSED/.test(es) ? "pausada" : /ISSUES|DISAPPROVED/.test(es) ? "problema" : "ativa";
          const row = { agency_id: c.agency_id, client_id: c.id, meta_id: k.id, name: k.name, status, source: "meta", period: "Últimos 30 dias",
            daily_budget: k.daily_budget ? Number(k.daily_budget) / 100 : null, spend: Number(ins.spend || 0), reach: Number(ins.reach || 0),
            impressions: Number(ins.impressions || 0), clicks: Number(ins.clicks || 0), leads: sumAct(ins.actions, LEAD), conversions: sumAct(ins.actions, CONV), updated_at: new Date().toISOString() };
          const { data: prev } = await db.from("campaigns").select("status").eq("meta_id", k.id).maybeSingle();
          await db.from("campaigns").upsert(row, { onConflict: "meta_id" });
          if (status === "problema" && prev?.status !== "problema") await notify(db, c.agency_id, ["admin", "comercial"], "Campanha com problema", `${c.name} — ${k.name}`, "alerta", `metac:${k.id}:${es}`, "campanhas");
          if (prev && prev.status === "ativa" && status === "pausada") await notify(db, c.agency_id, ["admin"], "Campanha pausada", `${c.name} — ${k.name}`, "info", `metap:${k.id}:${new Date().toISOString().slice(0, 10)}`, "campanhas");
          campaigns++;
        }
      } catch (e) { errors.push(`${c.name}: ${(e as Error).message}`); }
    }
    return json({ ok: true, accounts, campaigns, errors });
  } catch (e) { return json({ error: (e as Error).message }, 401); }
});
