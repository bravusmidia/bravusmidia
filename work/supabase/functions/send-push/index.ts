// BRAVUS NOTIFY — envia push para celular/computador quando uma notificação é criada.
// Disparado por Database Webhook (tabela notifications, INSERT) com header x-webhook-secret.
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...), PUSH_WEBHOOK_SECRET
// Publicar com: supabase functions deploy send-push --no-verify-jwt
import webpush from "npm:web-push@3.6.7";
import { json, admin } from "../_shared/util.ts";

webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT")!, Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);

Deno.serve(async req => {
  if (req.headers.get("x-webhook-secret") !== Deno.env.get("PUSH_WEBHOOK_SECRET")) return json({ error: "unauthorized" }, 401);
  const { record: n } = await req.json();
  if (!n?.user_id) return json({ ok: true });
  const db = admin();
  const { data: subs } = await db.from("push_subs").select("*").eq("user_id", n.user_id);
  let sent = 0;
  for (const s of subs ?? []) {
    try { await webpush.sendNotification(s.subscription, JSON.stringify({ title: n.title, body: n.body, key: n.key, route: n.route })); sent++; }
    catch (e: any) { if (e.statusCode === 404 || e.statusCode === 410) await db.from("push_subs").delete().eq("id", s.id); }
  }
  return json({ ok: true, sent });
});
