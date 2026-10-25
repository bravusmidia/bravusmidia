// Envia UMA mensagem para UM contato pela API oficial (sem disparo em massa).
// Todas as regras (janela 24h, opt-in, opt-out, limites, modelo aprovado) são validadas aqui no servidor.
import { adminClient, cors, GRAPH, HttpError, json, metaToken, requireRole, requireUser } from '../_shared/common.ts';
import { decideSend } from '../_shared/policy.ts';

const db = adminClient();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, { error: 'Método não permitido' }, 405);
  try {
    const userId = await requireUser(req, db);
    const input = await req.json().catch(() => ({}));
    const kind = input.kind === 'template' ? 'template' : 'text';
    const text = typeof input.text === 'string' ? input.text.trim().slice(0, 4096) : '';
    const variables: string[] = Array.isArray(input.variables) ? input.variables.map((v: unknown) => String(v).slice(0, 500)).slice(0, 10) : [];
    if (kind === 'text' && !text) throw new HttpError(400, 'Mensagem vazia');

    // destino: conversa existente ou lead
    let conv: any = null; let lead: any = null;
    if (input.conversation_id) {
      const { data } = await db.from('conversations').select('*').eq('id', input.conversation_id).maybeSingle();
      conv = data;
    }
    const leadId = input.lead_id ?? conv?.lead_id;
    if (leadId) {
      const { data } = await db.from('leads').select('id, org_id, phone_e164, consent_status, opted_out, full_name').eq('id', leadId).maybeSingle();
      lead = data;
    }
    const orgId = conv?.org_id ?? lead?.org_id;
    if (!orgId) throw new HttpError(404, 'Contato não encontrado');
    await requireRole(db, orgId, userId, ['owner', 'admin', 'manager', 'seller']);
    const phone = conv?.phone_e164 ?? lead?.phone_e164;
    if (!phone) throw new HttpError(400, 'Contato sem telefone válido');

    const [{ data: org }, { data: integ }, { data: sup }] = await Promise.all([
      db.from('organizations').select('settings').eq('id', orgId).single(),
      db.from('integrations').select('*').eq('org_id', orgId).eq('provider', 'whatsapp_cloud').maybeSingle(),
      db.from('suppression_list').select('id').eq('org_id', orgId).eq('phone_e164', phone).maybeSingle(),
    ]);
    const limits = { max_per_minute: 20, max_per_day: 200, quiet_start: '21:00', quiet_end: '08:00', ...(org?.settings?.whatsapp ?? {}) };

    let template: any = null;
    if (kind === 'template') {
      const { data } = await db.from('message_templates').select('*').eq('org_id', orgId).eq('name', input.template_name ?? '')
        .eq('language', input.language ?? 'pt_BR').maybeSingle();
      template = data;
    }

    const now = new Date();
    const minuteAgo = new Date(now.getTime() - 60_000).toISOString();
    const dayStart = new Date(now.getTime() - 24 * 3600_000).toISOString();
    const [{ count: lastMinute }, { count: today }, lastTpl] = await Promise.all([
      db.from('messages').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('direction', 'outbound').gte('created_at', minuteAgo),
      db.from('messages').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('direction', 'outbound').not('template_name', 'is', null).gte('created_at', dayStart),
      conv ? db.from('messages').select('created_at').eq('conversation_id', conv.id).eq('direction', 'outbound').not('template_name', 'is', null)
        .order('created_at', { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    const lastTplAt = (lastTpl as any).data?.created_at ?? null;
    const repliedAfter = lastTplAt && conv?.last_inbound_at && conv.last_inbound_at > lastTplAt;

    const localHour = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Fortaleza', hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
    const decision = decideSend({
      kind, now, lastInboundAt: conv?.last_inbound_at ?? null, suppressed: !!sup || !!lead?.opted_out,
      consentStatus: lead?.consent_status ?? 'unknown', integrationMode: integ?.mode ?? 'disabled',
      template: template ? { status: template.status, category: template.category } : null,
      sentLastMinuteOrg: lastMinute ?? 0, templatesTodayOrg: today ?? 0,
      lastTemplateToContactAt: repliedAfter ? null : lastTplAt, limits, localHour,
    });
    if (!decision.allowed) return json(req, { ok: false, code: decision.code, error: decision.reason }, 422);

    if (!conv) {
      const waId = phone.replace(/\D/g, '');
      const { data } = await db.from('conversations').upsert({ org_id: orgId, wa_id: waId, phone_e164: phone, lead_id: lead?.id, contact_name: lead?.full_name },
        { onConflict: 'org_id,wa_id' }).select('*').single();
      conv = data;
    }

    const base = { org_id: orgId, conversation_id: conv.id, direction: 'outbound', type: kind, body: kind === 'text' ? text : renderTemplate(template?.body, variables), template_name: kind === 'template' ? template.name : null, sent_by: userId };

    // Modo demonstração: NÃO envia nada e registra isso claramente.
    if (integ.mode === 'demo') {
      await db.from('messages').insert({ ...base, status: 'failed', error_code: 'DEMO', error_message: 'Modo demonstração: a mensagem NÃO foi enviada ao WhatsApp.' });
      return json(req, { ok: false, demo: true, error: 'Modo demonstração: nada foi enviado ao WhatsApp.' }, 200);
    }

    const payload = kind === 'text'
      ? { messaging_product: 'whatsapp', recipient_type: 'individual', to: phone.replace('+', ''), type: 'text', text: { body: text, preview_url: false } }
      : { messaging_product: 'whatsapp', to: phone.replace('+', ''), type: 'template', template: { name: template.name, language: { code: template.language },
          components: variables.length ? [{ type: 'body', parameters: variables.map((v) => ({ type: 'text', text: v })) }] : undefined } };

    const res = await fetch(`${GRAPH}/${integ.phone_number_id}/messages`, {
      method: 'POST', headers: { Authorization: `Bearer ${metaToken()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = out?.error ?? {};
      await db.from('messages').insert({ ...base, status: 'failed', error_code: String(err.code ?? res.status), error_message: err.message ?? 'Falha na API da Meta' });
      await db.from('integrations').update({ last_error: `${err.code ?? res.status}: ${err.message ?? 'erro'}`, last_checked_at: now.toISOString() }).eq('id', integ.id);
      if (lead?.id) await db.rpc('run_automations', { p_org: orgId, p_trigger: 'integration_error', p_lead: lead.id, p_event_key: `int_err:${now.getTime()}`, p_ctx: { message: err.message ?? 'Falha no envio' } });
      return json(req, { ok: false, code: 'meta_error', error: `A Meta recusou o envio: ${err.message ?? res.status}` }, 502);
    }
    const wamid = out?.messages?.[0]?.id ?? null;
    // "queued" = aceito pela Meta; entregue/lido chegam depois pelo webhook.
    await db.from('messages').insert({ ...base, wa_message_id: wamid, status: 'queued' });
    return json(req, { ok: true, status: 'queued', wa_message_id: wamid });
  } catch (e) {
    const err = e as HttpError;
    return json(req, { ok: false, error: err.message ?? 'Erro interno' }, err.status ?? 500);
  }
});

function renderTemplate(body: string | null | undefined, vars: string[]) {
  if (!body) return null;
  return body.replace(/\{\{(\d+)\}\}/g, (_, n) => vars[Number(n) - 1] ?? `{{${n}}}`);
}
