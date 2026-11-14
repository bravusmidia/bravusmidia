// TáFeito — Edge Function "tafeito-push" (Supabase)
// Manda a notificação para o celular/PC mesmo com o app fechado.
// GET  ?chave=1  -> devolve a chave pública (gera as chaves na primeira vez)
// POST (chamado pelo banco) -> { alvo, titulo, corpo, tag }
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info, x-tafeito-segredo",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

async function config() {
  const { data, error } = await sb.from("mok_push_cfg").select("*").eq("id", 1).single();
  if (error) throw error;
  if (data.vapid_pub && data.vapid_priv) return data;
  const k = webpush.generateVAPIDKeys();
  await sb.from("mok_push_cfg").update({ vapid_pub: k.publicKey, vapid_priv: k.privateKey }).eq("id", 1).is("vapid_pub", null);
  const r = await sb.from("mok_push_cfg").select("*").eq("id", 1).single();
  if (r.error) throw r.error;
  return r.data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const c = await config();
    if (req.method === "GET") return json({ chave: c.vapid_pub });
    if (!c.segredo || req.headers.get("x-tafeito-segredo") !== c.segredo) return json({ erro: "não autorizado" }, 401);

    const { alvo, titulo, corpo, tag } = await req.json();
    if (!alvo) return json({ erro: "sem alvo" }, 400);
    webpush.setVapidDetails("https://www.bravusmidia.com.br/tafeito/", c.vapid_pub, c.vapid_priv);

    const { data: subs, error } = await sb.from("mok_push").select("*").eq("alvo", alvo);
    if (error) throw error;
    const payload = JSON.stringify({ titulo, corpo, tag });
    let enviados = 0;
    await Promise.all((subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400, urgency: "high" });
        enviados++;
      } catch (e) {
        const st = (e as { statusCode?: number }).statusCode;
        if (st === 404 || st === 410) await sb.from("mok_push").delete().eq("endpoint", s.endpoint);
        else console.error("push falhou", st, (e as { body?: string }).body ?? String(e));
      }
    }));
    return json({ enviados, total: subs?.length ?? 0 });
  } catch (e) {
    console.error(e);
    return json({ erro: String((e as Error).message ?? e) }, 500);
  }
});
