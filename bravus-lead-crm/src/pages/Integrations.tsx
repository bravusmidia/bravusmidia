import { useEffect, useState } from 'react';
import { RefreshCw, PlugZap, Copy, CheckCircle2, CircleDashed } from 'lucide-react';
import { db, getConfig, type Row } from '../lib/backend';
import { useApp, useRows } from '../lib/session';
import { dateTime } from '../lib/format';
import { Alert, Badge, Button, Card, DataTable, Field, Input, PageHeader, Select, useAction } from '../components/ui';

export default function Integrations() {
  const app = useApp();
  const { run, busy, push } = useAction();
  const [integ, setInteg] = useState<Row | null>(null);
  const [f, setF] = useState<Row>({});
  const [check, setCheck] = useState<Row | null>(null);
  const { rows: templates, reload: reloadT } = useRows('message_templates', { order: ['name'] });
  const load = async () => { const [i] = await db.list('integrations', { eq: { org_id: app.orgId } }); setInteg(i ?? null); setF(i ?? {}); };
  useEffect(() => { load().catch(() => {}); }, [app.orgId]); // eslint-disable-line
  const cfg = getConfig();
  const webhook = cfg ? `${cfg.url}/functions/v1/whatsapp-webhook` : 'https://SEU-PROJETO.supabase.co/functions/v1/whatsapp-webhook';
  const copy = (t: string) => navigator.clipboard?.writeText(t).then(() => push('ok', 'Copiado'));

  const steps: [boolean, string][] = [
    [!!integ?.waba_id && !!integ?.phone_number_id, 'IDs da conta (WABA ID e Phone Number ID) informados abaixo'],
    [integ?.status === 'connected', 'Conexão verificada com a Meta (token configurado nos secrets do servidor)'],
    [templates.some((t) => t.status === 'APPROVED'), 'Pelo menos um modelo de mensagem aprovado e sincronizado'],
    [integ?.mode === 'live', 'Modo REAL ativado'],
  ];

  return (
    <div>
      <PageHeader title="Integrações" subtitle="WhatsApp Business Platform (API oficial da Meta — Cloud API)." />
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          <Card title={<span className="flex items-center gap-2"><PlugZap className="h-4 w-4 text-emerald-500" />WhatsApp — API oficial</span>} action={integ && <Badge tone={integ.mode === 'live' ? 'green' : integ.mode === 'demo' ? 'amber' : 'slate'} dot>{integ.mode === 'live' ? 'Modo real' : integ.mode === 'demo' ? 'Demonstração' : 'Desativado'}</Badge>}>
            <div className="mb-4 space-y-1.5">{steps.map(([ok, s], i) => <div key={i} className="flex items-center gap-2 text-sm">{ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <CircleDashed className="h-4 w-4 text-ink-soft" />}{s}</div>)}</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="WhatsApp Business Account ID (WABA ID)"><Input value={f.waba_id ?? ''} onChange={(e) => setF({ ...f, waba_id: e.target.value.replace(/\D/g, '') })} disabled={!app.can.admin} /></Field>
              <Field label="Phone Number ID"><Input value={f.phone_number_id ?? ''} onChange={(e) => setF({ ...f, phone_number_id: e.target.value.replace(/\D/g, '') })} disabled={!app.can.admin} /></Field>
              <Field label="Modo" hint="Demonstração nunca envia nada. Real só funciona com a conexão verificada.">
                <Select value={f.mode ?? 'disabled'} disabled={!app.can.admin} onChange={(e) => setF({ ...f, mode: e.target.value })} options={[{ value: 'disabled', label: 'Desativado' }, { value: 'demo', label: 'Demonstração (sem envio)' }, { value: 'live', label: 'Real (envia pela Meta)' }]} />
              </Field>
              <Field label="Número exibido"><Input value={integ?.display_phone ?? '—'} disabled /></Field>
            </div>
            {f.mode === 'live' && integ?.status !== 'connected' && <Alert tone="warn" className="mt-3">Verifique a conexão antes de ativar o modo real.</Alert>}
            {integ?.last_error && <Alert tone="error" className="mt-3">Último erro: {integ.last_error} ({dateTime(integ.last_checked_at)})</Alert>}
            {app.can.admin && <div className="mt-4 flex flex-wrap gap-2">
              <Button loading={busy} onClick={() => run(async () => {
                if (f.mode === 'live' && integ?.status !== 'connected') throw new Error('Verifique a conexão antes de ativar o modo real.');
                await db.update('integrations', integ!.id, { waba_id: f.waba_id || null, phone_number_id: f.phone_number_id || null, mode: f.mode });
              }, 'Integração salva').then(load)}>Salvar</Button>
              <Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />} loading={busy} onClick={() => run(async () => { const r = await db.invoke('whatsapp-admin', { action: 'check', org_id: app.orgId }); setCheck(r); if (!r?.ok) throw new Error(r?.error ?? 'Falha'); }, 'Conectado à Meta').then(load)}>Verificar conexão</Button>
              <Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />} loading={busy} onClick={() => run(async () => { const r = await db.invoke('whatsapp-admin', { action: 'sync_templates', org_id: app.orgId }); if (!r?.ok) throw new Error(r?.error ?? 'Falha'); return r; }, 'Modelos sincronizados').then(reloadT)}>Sincronizar modelos</Button>
            </div>}
            {check?.details && <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-sm dark:bg-white/5">{Object.entries(check.details).map(([k, v]) => <div key={k}><div className="text-[11px] text-ink-soft">{k.replace(/_/g, ' ')}</div><div className="font-medium">{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}</div></div>)}</div>}
          </Card>
          <Card title="Modelos de mensagem (templates)" pad={false}>
            <DataTable rows={templates} empty={<p className="p-4 text-sm text-ink-soft">Crie modelos no WhatsApp Manager, aguarde a aprovação da Meta e clique em “Sincronizar modelos”.</p>} cols={[
              { key: 'name', label: 'Nome', render: (t) => <span className="font-mono text-xs">{t.name}</span> },
              { key: 'category', label: 'Categoria', render: (t) => <Badge tone={t.category === 'MARKETING' ? 'violet' : 'blue'}>{t.category}</Badge> },
              { key: 'status', label: 'Status', render: (t) => <Badge tone={t.status === 'APPROVED' ? 'green' : t.status === 'REJECTED' ? 'red' : 'amber'}>{t.status}</Badge> },
              { key: 'body', label: 'Texto', render: (t) => <span className="line-clamp-2 text-xs text-ink-soft">{t.body}</span> },
            ]} />
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Regras que o CRM aplica sempre">
            <ul className="space-y-2 text-sm">
              {[
                'Mensagem livre só dentro da janela de 24h após o contato escrever.',
                'Fora da janela: somente modelo aprovado pela Meta + consentimento (opt-in) registrado.',
                'Opt-out automático quando o contato escreve PARAR, SAIR, STOP, CANCELAR…',
                'Lista de supressão bloqueia qualquer envio.',
                'Sem disparo em massa: um contato por vez, enviado por uma pessoa.',
                'Limites de segurança por minuto e por dia + horário de silêncio para marketing.',
                'Não reenvia modelo para quem não respondeu nas últimas 24h.',
                'Nada de WhatsApp Web, QR code ou extensões não oficiais.',
                'Token da Meta fica só no servidor, nunca no navegador.',
              ].map((t) => <li key={t} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{t}</li>)}
            </ul>
            <p className="mt-3 text-xs text-ink-soft">Esses controles reduzem muito o risco, mas nenhuma ferramenta garante que um número nunca será restringido — a Meta avalia a qualidade (denúncias e bloqueios) de cada envio.</p>
          </Card>
          <Card title="Passo a passo de conexão">
            <ol className="list-decimal space-y-2 pl-4 text-sm">
              <li>Em <b>developers.facebook.com</b>, crie um app do tipo <i>Business</i> e adicione o produto <b>WhatsApp</b>.</li>
              <li>Em WhatsApp → Configuração da API, adicione e verifique o número da Bravus. Copie o <b>Phone Number ID</b> e o <b>WABA ID</b> para os campos ao lado.</li>
              <li>No Business Manager, crie um <b>usuário do sistema</b> e gere um token permanente com as permissões <code>whatsapp_business_messaging</code> e <code>whatsapp_business_management</code>.</li>
              <li>No terminal do Supabase: <code className="break-all">supabase secrets set WHATSAPP_ACCESS_TOKEN=… WHATSAPP_APP_SECRET=… WHATSAPP_VERIFY_TOKEN=…</code></li>
              <li>Publique as funções (veja o guia no GitHub) e, em WhatsApp → Configuração → Webhook, use a URL abaixo e o mesmo Verify Token. Assine o campo <b>messages</b>.</li>
              <li>Clique em <b>Verificar conexão</b>, <b>Sincronizar modelos</b> e só então ative o <b>modo real</b>.</li>
            </ol>
            <Field label="URL do webhook" className="mt-3"><div className="flex gap-2"><Input readOnly value={webhook} className="font-mono text-xs" /><Button variant="secondary" onClick={() => copy(webhook)} icon={<Copy className="h-4 w-4" />} aria-label="Copiar" /></div></Field>
            <Alert tone="warn" className="mt-3">Um número usado na API oficial deixa de funcionar no app WhatsApp Business comum, a menos que você use o recurso de coexistência oferecido pela Meta. Avalie antes de migrar o número principal.</Alert>
          </Card>
        </div>
      </div>
    </div>
  );
}

