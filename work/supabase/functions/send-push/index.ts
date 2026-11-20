// BRAVUS NOTIFY v2.9 — envia push para celular/computador quando uma notificação é criada.
// Chamado pelo gatilho bw_push (tabela notifications, INSERT) com o header x-webhook-secret.
// As chaves VAPID e o segredo ficam na tabela privada push_config (sem secrets manuais):
// na primeira chamada a função gera as chaves VAPID sozinha e guarda lá.
// Publicar com "Verify JWT" DESLIGADO.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
// chave de serviço: a antiga (SUPABASE_SERVICE_ROLE_KEY) ou a nova (SUPABASE_SECRET_KEYS)
const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || (() => { try { const j = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}"); return j.default || Object.values(j)[0]; } catch { return ""; } })();
const db = createClient(Deno.env.get("SUPABASE_URL")!, svcKey as string, { auth: { persistSession: false } });

async function config() {
  const { data: c, error } = await db.from("push_config").select("*").eq("id", 1).single();
  if (error || !c) throw new Error("push_config ausente: rode o SQL v2.9");
  if (!c.vapid_public || !c.vapid_private) {
    const k = webpush.generateVAPIDKeys();
    await db.from("push_config").update({ vapid_public: k.publicKey, vapid_private: k.privateKey }).eq("id", 1);
    c.vapid_public = k.publicKey; c.vapid_private = k.privateKey;
  }
  return c;
}

Deno.serve(async req => {
  try {
    const c = await config();
    if (req.headers.get("x-webhook-secret") !== c.hook_secret) return json({ ok: true, ready: true });
    webpush.setVapidDetails(c.subject || "mailto:bravusmidiaoficial@gmail.com", c.vapid_public, c.vapid_private);
    const { record: n } = await req.json();
    if (!n?.user_id) return json({ ok: true });
    const { data: subs } = await db.from("push_subs").select("*").eq("user_id", n.user_id);
    let sent = 0;
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(s.subscription, JSON.stringify({ title: n.title, body: n.body, key: n.key, route: n.route }), { TTL: 3600, urgency: "high" });
        sent++;
      } catch (e: any) { if (e.statusCode === 404 || e.statusCode === 410) await db.from("push_subs").delete().eq("id", s.id); }
    }
    return json({ ok: true, sent });
  } catch (e: any) { return json({ error: e.message }, 500); }
});
