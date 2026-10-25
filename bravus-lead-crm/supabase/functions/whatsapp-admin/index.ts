// Ações administrativas da integração: verificar conexão e sincronizar modelos aprovados.
import { adminClient, cors, GRAPH, HttpError, json, metaToken, requireRole, requireUser } from '../_shared/common.ts';

const db = adminClient();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  try {
    const userId = await requireUser(req, db);
    const { action, org_id } = await req.json();
    await requireRole(db, org_id, userId, ['owner', 'admin']);
    const { data: integ } = await db.from('integrations').select('*').eq('org_id', org_id).eq('provider', 'whatsapp_cloud').single();
    if (!integ?.phone_number_id || !integ?.waba_id) throw new HttpError(400, 'Informe o Phone Number ID e o WABA ID em Integrações.');
    const headers = { Authorization: `Bearer ${metaToken()}` };

    if (action === 'check') {
      const r = await fetch(`${GRAPH}/${integ.phone_number_id}?fields=display_phone_number,verified_name,quality_rating,code_verification_status,name_status,whatsapp_business_manager_messaging_limit`, { headers });
      const d = await r.json();
      const ok = r.ok && !d.error;
      await db.from('integrations').update({
        status: ok ? 'connected' : 'error', display_phone: d.display_phone_number ?? integ.display_phone,
        last_checked_at: new Date().toISOString(), last_error: ok ? null : (d.error?.message ?? 'Falha'),
      }).eq('id', integ.id);
      return json(req, { ok, details: ok ? {
        numero: d.display_phone_number, nome_verificado: d.verified_name, qualidade: d.quality_rating,
        status_nome: d.name_status, limite_mensagens: d.whatsapp_business_manager_messaging_limit ?? null,
      } : null, error: ok ? null : d.error?.message });
    }

    if (action === 'sync_templates') {
      const r = await fetch(`${GRAPH}/${integ.waba_id}/message_templates?fields=name,language,category,status,components,id&limit=200`, { headers });
      const d = await r.json();
      if (!r.ok) throw new HttpError(502, d.error?.message ?? 'Falha ao buscar modelos');
      const rows = (d.data ?? []).map((t: any) => {
        const body = t.components?.find((c: any) => c.type === 'BODY')?.text ?? null;
        return { org_id, name: t.name, language: t.language, category: t.category, status: t.status, meta_id: t.id,
          body, variables: (body?.match(/\{\{\d+\}\}/g) ?? []).length, synced_at: new Date().toISOString() };
      });
      if (rows.length) await db.from('message_templates').upsert(rows, { onConflict: 'org_id,name,language' });
      return json(req, { ok: true, total: rows.length });
    }
    throw new HttpError(400, 'Ação inválida');
  } catch (e) {
    const err = e as HttpError;
    return json(req, { ok: false, error: err.message }, err.status ?? 500);
  }
});
