// Webhook oficial da WhatsApp Cloud API (Meta).
// GET  → verificação do endpoint (hub.challenge)
// POST → mensagens recebidas e status de entrega, com verificação de assinatura X-Hub-Signature-256.
// Publique com: supabase functions deploy whatsapp-webhook --no-verify-jwt
import { adminClient, hmacSha256Hex, isOptOut, safeEqual } from '../_shared/common.ts';

const db = adminClient();

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const verify = Deno.env.get('WHATSAPP_VERIFY_TOKEN') ?? '';
    if (url.searchParams.get('hub.mode') === 'subscribe' && verify && safeEqual(url.searchParams.get('hub.verify_token') ?? '', verify)) {
      return new Response(url.searchParams.get('hub.challenge') ?? '', { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const raw = await req.text();
  if (raw.length > 1_000_000) return new Response('Payload too large', { status: 413 });

  const secret = Deno.env.get('WHATSAPP_APP_SECRET');
  const header = req.headers.get('x-hub-signature-256') ?? '';
  if (!secret) return new Response('Not configured', { status: 503 });
  const expected = 'sha256=' + (await hmacSha256Hex(secret, raw));
  if (!safeEqual(header, expected)) return new Response('Invalid signature', { status: 401 });

  let body: any;
  try { body = JSON.parse(raw); } catch { return new Response('Bad JSON', { status: 400 }); }

  try {
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'messages') continue;
        await handleValue(change.value);
      }
    }
  } catch (e) {
    console.error('webhook error', (e as Error).message); // sem dados pessoais no log
    // 200 evita reenvio infinito; o erro fica registrado na integração
  }
  return new Response('EVENT_RECEIVED', { status: 200 });
});

async function handleValue(value: any) {
  const phoneNumberId = value?.metadata?.phone_number_id;
  if (!phoneNumberId) return;
  const { data: integ } = await db.from('integrations').select('org_id, mode')
    .eq('provider', 'whatsapp_cloud').eq('phone_number_id', phoneNumberId).maybeSingle();
  if (!integ || integ.mode === 'disabled') return;
  const orgId = integ.org_id as string;

  const names: Record<string, string> = {};
  for (const c of value.contacts ?? []) names[c.wa_id] = c.profile?.name;

  for (const m of value.messages ?? []) {
    if (!(await firstTime(`msg:${m.id}`, orgId, 'message'))) continue;
    const waId = String(m.from);
    const phone = '+' + waId.replace(/\D/g, '');
    const text = m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? null;

    const conv = await ensureConversation(orgId, waId, phone, names[waId]);
    await db.from('messages').insert({
      org_id: orgId, conversation_id: conv.id, direction: 'inbound', wa_message_id: m.id,
      type: m.type ?? 'text', body: text, status: 'received',
      created_at: m.timestamp ? new Date(Number(m.timestamp) * 1000).toISOString() : new Date().toISOString(),
    });

    if (isOptOut(text)) {
      await db.from('suppression_list').upsert(
        { org_id: orgId, phone_e164: phone, reason: 'opt_out', source: 'mensagem no WhatsApp', created_by: null },
        { onConflict: 'org_id,phone_e164', ignoreDuplicates: true });
    }
  }

  for (const s of value.statuses ?? []) {
    const key = `st:${s.id}:${s.status}`;
    if (!(await firstTime(key, orgId, 'status'))) continue;
    const map: Record<string, string> = { sent: 'sent', delivered: 'delivered', read: 'read', failed: 'failed' };
    const status = map[s.status];
    if (!status) continue;
    const err = s.errors?.[0];
    await db.from('messages').update({
      status, status_updated_at: new Date().toISOString(),
      error_code: err ? String(err.code) : null, error_message: err ? (err.title ?? err.message ?? null) : null,
    }).eq('org_id', orgId).eq('wa_message_id', s.id);
  }
}

async function firstTime(id: string, orgId: string, kind: string) {
  const { error } = await db.from('webhook_events').insert({ id, org_id: orgId, kind });
  return !error; // conflito de chave = evento repetido (idempotência)
}

async function ensureConversation(orgId: string, waId: string, phone: string, name?: string) {
  const { data: found } = await db.from('conversations').select('id, lead_id').eq('org_id', orgId).eq('wa_id', waId).maybeSingle();
  if (found) {
    if (!found.lead_id) {
      const leadId = await ensureLead(orgId, phone, name);
      await db.from('conversations').update({ lead_id: leadId }).eq('id', found.id);
    }
    return found;
  }
  const leadId = await ensureLead(orgId, phone, name);
  const { data } = await db.from('conversations')
    .insert({ org_id: orgId, wa_id: waId, phone_e164: phone, contact_name: name ?? null, lead_id: leadId })
    .select('id, lead_id').single();
  return data!;
}

async function ensureLead(orgId: string, phone: string, name?: string): Promise<string> {
  const { data: lead } = await db.from('leads').select('id').eq('org_id', orgId).eq('phone_e164', phone)
    .is('archived_at', null).limit(1).maybeSingle();
  if (lead) return lead.id;
  const { data: stage } = await db.from('pipeline_stages').select('id').eq('org_id', orgId).order('position').limit(1).maybeSingle();
  // Mensagem recebida abre a janela de atendimento, mas NÃO é consentimento de marketing.
  const { data } = await db.from('leads').insert({
    org_id: orgId, full_name: name || phone, phone_original: phone, phone_e164: phone, phone_valid: true, whatsapp: phone,
    source: 'WhatsApp (entrada)', stage_id: stage?.id ?? null, consent_status: 'unknown', created_by: null,
  }).select('id').single();
  return data!.id;
}
