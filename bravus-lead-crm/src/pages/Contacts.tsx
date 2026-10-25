import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Users, FileUp, Fingerprint, PhoneCall, MessageCircle, ShieldCheck, ShieldOff, AlertTriangle, Copy, Inbox, Trash2 } from 'lucide-react';
import { db, type Row } from '../lib/backend';
import { useApp } from '../lib/session';
import { normalizePhone } from '../lib/phone';
import { dateTime, num } from '../lib/format';
import { downloadText, toCSV } from '../lib/csv';
import { Alert, Badge, Button, Card, DataTable, Field, Input, Modal, PageHeader, Select, Spinner, Stat, useAction } from '../components/ui';

export default function Contacts() {
  const app = useApp();
  const { run } = useAction();
  const [d, setD] = useState<{ leads: Row[]; imports: Row[]; convs: Row[]; sup: Row[] } | null>(null);
  const [seg, setSeg] = useState('');
  const [supOpen, setSupOpen] = useState(false);
  const [supPhone, setSupPhone] = useState('');
  const load = () => Promise.all([
    db.list('leads', { eq: { org_id: app.orgId } }), db.list('imports', { eq: { org_id: app.orgId }, order: ['created_at', false] }),
    db.list('conversations', { eq: { org_id: app.orgId } }), db.list('suppression_list', { eq: { org_id: app.orgId }, order: ['created_at', false] }),
  ]).then(([leads, imports, convs, sup]) => setD({ leads, imports, convs, sup }));
  useEffect(() => { load().catch(() => {}); }, [app.orgId]); // eslint-disable-line

  const inv = useMemo(() => {
    if (!d) return null;
    const leads = d.leads.filter((l) => !l.archived_at);
    const phones = new Map<string, number>();
    for (const l of leads) if (l.phone_e164) phones.set(l.phone_e164, (phones.get(l.phone_e164) ?? 0) + 1);
    const dupIds = new Set(leads.filter((l) => l.phone_e164 && (phones.get(l.phone_e164) ?? 0) > 1).map((l) => l.id));
    const convPhones = new Set(d.convs.filter((c) => c.last_inbound_at).map((c) => c.phone_e164));
    const supPhones = new Set(d.sup.map((s) => s.phone_e164));
    const incomplete = (l: Row) => !l.phone_e164 && !l.email || !l.company && !l.segment;
    const segs: Record<string, (l: Row) => boolean> = {
      imported: (l) => !!l.import_id || l.source === 'Importação',
      valid: (l) => !!l.phone_valid, invalid: (l) => !!l.phone_original && !l.phone_valid,
      whatsapp: (l) => !!l.whatsapp, consent: (l) => l.consent_status === 'granted',
      optout: (l) => l.opted_out || supPhones.has(l.phone_e164), incomplete, dup: (l) => dupIds.has(l.id),
      conversed: (l) => convPhones.has(l.phone_e164),
    };
    return {
      leads, segs,
      total: leads.length, imported: leads.filter(segs.imported).length, unique: new Set(leads.map((l) => l.phone_e164 || l.email || l.id)).size,
      valid: leads.filter(segs.valid).length, invalid: leads.filter(segs.invalid).length, whatsapp: leads.filter(segs.whatsapp).length,
      consent: leads.filter(segs.consent).length, optout: leads.filter(segs.optout).length, incomplete: leads.filter(incomplete).length,
      dup: dupIds.size, conversed: leads.filter(segs.conversed).length,
    };
  }, [d]);
  if (!d || !inv) return <Spinner />;
  const rows = seg ? inv.leads.filter(inv.segs[seg]) : inv.leads;
  const S = (k: string, label: string, v: number, tone: string, icon: any, hint?: string) => <Stat label={label} value={num(v)} hint={hint} tone={tone} icon={icon} onClick={() => setSeg(seg === k ? '' : k)} />;

  return (
    <div>
      <PageHeader title="Inventário de contatos" subtitle="Contagens separadas e honestas da sua base de contatos." actions={<>
        <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={() => downloadText('contatos.csv', toCSV(rows, [{ key: 'full_name', label: 'Nome' }, { key: 'company', label: 'Empresa' }, { key: 'phone_e164', label: 'Telefone' }, { key: 'email', label: 'E-mail' }, { key: 'consent_status', label: 'Consentimento' }, { key: 'opted_out', label: 'Opt-out' }]))}>Exportar segmento</Button>
        <Link to="/importacoes"><Button icon={<FileUp className="h-4 w-4" />}>Importar contatos</Button></Link>
      </>} />
      <Alert tone="info" className="mb-4">Número válido ≠ número com WhatsApp. O CRM só afirma que existe WhatsApp quando a pessoa <b>conversou</b> com seu número oficial pela API. Clique em um card para filtrar.</Alert>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {S('', 'Contatos no CRM', inv.total, 'blue', <Users className="h-4 w-4" />)}
        {S('imported', 'Importados', inv.imported, 'indigo', <FileUp className="h-4 w-4" />)}
        <Stat label="Únicos após deduplicação" value={num(inv.unique)} tone="cyan" icon={<Fingerprint className="h-4 w-4" />} />
        {S('valid', 'Telefones válidos', inv.valid, 'green', <PhoneCall className="h-4 w-4" />, 'Formato correto (não prova WhatsApp)')}
        {S('invalid', 'Telefones inválidos', inv.invalid, 'red', <AlertTriangle className="h-4 w-4" />)}
        {S('whatsapp', 'Com WhatsApp informado', inv.whatsapp, 'sky', <MessageCircle className="h-4 w-4" />, 'Informado no cadastro')}
        {S('conversed', 'Conversaram pela API oficial', inv.conversed, 'green', <Inbox className="h-4 w-4" />, 'Confirmado pelo WhatsApp')}
        {S('consent', 'Com consentimento', inv.consent, 'green', <ShieldCheck className="h-4 w-4" />, 'Opt-in documentado')}
        {S('optout', 'Opt-out', inv.optout, 'slate', <ShieldOff className="h-4 w-4" />)}
        {S('dup', 'Duplicados', inv.dup, 'amber', <Copy className="h-4 w-4" />, 'Mesmo telefone')}
        {S('incomplete', 'Dados incompletos', inv.incomplete, 'amber', <AlertTriangle className="h-4 w-4" />)}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card title={<span>Contatos {seg && <Badge tone="blue" className="ml-2">filtro ativo</Badge>}</span>} action={seg && <Button size="sm" variant="ghost" onClick={() => setSeg('')}>Limpar filtro</Button>} pad={false}>
          <DataTable rows={rows} cols={[
            { key: 'full_name', label: 'Nome', render: (l) => <Link className="font-medium text-brand-600" to={`/leads?id=${l.id}`}>{l.full_name}</Link> },
            { key: 'phone_e164', label: 'Telefone', render: (l) => l.phone_e164 ?? <span className="text-red-500">{l.phone_original ?? '—'}</span> },
            { key: 'consent_status', label: 'Consentimento', render: (l) => <Badge tone={l.opted_out ? 'slate' : l.consent_status === 'granted' ? 'green' : 'amber'}>{l.opted_out ? 'Opt-out' : l.consent_status === 'granted' ? 'Concedido' : 'Não documentado'}</Badge> },
            { key: 'source', label: 'Origem', hideSm: true },
          ]} />
        </Card>
        <div className="space-y-4">
          <Card title="Lista de supressão" action={app.can.write && <Button size="sm" variant="secondary" onClick={() => setSupOpen(true)}>Adicionar</Button>}>
            <p className="mb-2 text-xs text-ink-soft">Números que pediram para não receber mensagens. Nenhum envio sai para eles.</p>
            <div className="max-h-64 space-y-1 overflow-y-auto">{d.sup.map((s) => <div key={s.id} className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1.5 text-sm dark:bg-white/5"><span>{s.phone_e164} <span className="text-xs text-ink-soft">· {s.source ?? s.reason}</span></span>
              {app.can.admin && <button className="text-ink-soft hover:text-red-600" aria-label="Remover" onClick={() => run(() => db.remove('suppression_list', s.id), 'Removido da supressão').then(load)}><Trash2 className="h-3.5 w-3.5" /></button>}</div>)}
              {d.sup.length === 0 && <p className="text-sm text-ink-soft">Vazia.</p>}</div>
          </Card>
          <Card title="Histórico de importações">
            {d.imports.slice(0, 8).map((i) => <div key={i.id} className="border-b border-line py-2 text-sm last:border-0 dark:border-white/10"><div className="font-medium">{i.file_name}</div><div className="text-xs text-ink-soft">{dateTime(i.created_at)} · {i.total_rows} linhas · {i.inserted} novos · {i.updated} atualizados · {i.rejected} rejeitados</div></div>)}
            {d.imports.length === 0 && <p className="text-sm text-ink-soft">Nenhuma importação ainda.</p>}
          </Card>
        </div>
      </div>
      <Modal open={supOpen} onClose={() => setSupOpen(false)} title="Adicionar à lista de supressão" footer={<Button onClick={() => run(async () => { const p = normalizePhone(supPhone); if (!p.e164) throw new Error('Telefone inválido'); await db.insert('suppression_list', { org_id: app.orgId, phone_e164: p.e164, reason: 'opt_out', source: 'manual' }); }, 'Número bloqueado para envios').then((r) => { if (r !== undefined) { setSupOpen(false); setSupPhone(''); load(); } })}>Adicionar</Button>}>
        <Field label="Telefone"><Input value={supPhone} onChange={(e) => setSupPhone(e.target.value)} placeholder="(85) 99999-9999" /></Field>
      </Modal>
    </div>
  );
}
