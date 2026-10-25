import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, LogIn, LogOut, Briefcase, Repeat, PauseCircle } from 'lucide-react';
import { db, type Row } from '../lib/backend';
import { useApp, useRows } from '../lib/session';
import { normalizePhone, formatPhone, whatsappLink } from '../lib/phone';
import { brl, date, num, todayISO } from '../lib/format';
import { seriesByMonth } from '../lib/metrics';
import { Badge, Button, Card, DataTable, Field, Input, Modal, PageHeader, SearchInput, Select, Spinner, Stat, Tabs, Textarea, useAction } from '../components/ui';
import { Bars } from '../components/charts';

export const C_STATUS: Record<string, [string, string]> = { active: ['Ativo', 'green'], paused: ['Pausado', 'amber'], churned: ['Saiu (cancelou)', 'red'] };

export default function Clients() {
  const app = useApp();
  const [params, setParams] = useSearchParams();
  const { rows, loading, reload } = useRows('clients', { order: ['started_at', false] });
  const { rows: sales } = useRows('sales');
  const [tab, setTab] = useState(params.get('f') === 'churned' ? 'churned' : 'active');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<Row | null>(null);
  useEffect(() => { const id = params.get('id'); if (id && rows.length) setEdit(rows.find((r) => r.id === id) ?? null); }, [params, rows]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const mrrOf = (c: Row) => sales.filter((s) => s.client_id === c.id && ['active', 'signed', 'pending'].includes(s.contract_status)).reduce((a, s) => a + Number(s.monthly_value), 0);
  const list = useMemo(() => rows.filter((c) => (tab === 'all' || c.status === tab) && (!q || `${c.name} ${c.company ?? ''}`.toLowerCase().includes(q.toLowerCase()))), [rows, tab, q]);
  const inOut = seriesByMonth(rows, 'started_at').map((x, i) => ({ name: x.name, entraram: x.value, sairam: seriesByMonth(rows.filter((c) => c.churned_at), 'churned_at')[i].value, value: 0 }));

  return (
    <div>
      <PageHeader title="Clientes" subtitle="Quem entrou, quem está ativo e quem saiu." actions={app.can.write && <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEdit({})}>Novo cliente</Button>} />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Clientes ativos" value={num(rows.filter((c) => c.status === 'active').length)} tone="green" icon={<Briefcase className="h-4 w-4" />} />
        <Stat label="Entraram este mês" value={num(rows.filter((c) => c.started_at >= monthStart).length)} tone="green" icon={<LogIn className="h-4 w-4" />} />
        <Stat label="Saíram este mês" value={num(rows.filter((c) => c.churned_at && c.churned_at >= monthStart).length)} tone="red" icon={<LogOut className="h-4 w-4" />} />
        <Stat label="Pausados" value={num(rows.filter((c) => c.status === 'paused').length)} tone="amber" icon={<PauseCircle className="h-4 w-4" />} />
        <Stat label="MRR dos ativos" value={brl(rows.filter((c) => c.status === 'active').reduce((a, c) => a + mrrOf(c), 0))} tone="blue" icon={<Repeat className="h-4 w-4" />} />
      </div>
      <Card title="Entradas × saídas por mês" className="mb-5"><Bars data={inOut} height={200} keys={[{ key: 'entraram', name: 'Entraram', color: '#10B981' }, { key: 'sairam', name: 'Saíram', color: '#EF4444' }]} /></Card>
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'active', label: 'Ativos', count: rows.filter((c) => c.status === 'active').length }, { value: 'paused', label: 'Pausados', count: rows.filter((c) => c.status === 'paused').length }, { value: 'churned', label: 'Saíram', count: rows.filter((c) => c.status === 'churned').length }, { value: 'all', label: 'Todos' }]} />
      <Card pad={false}>
        <div className="border-b border-line p-3 dark:border-white/10"><SearchInput value={q} onChange={setQ} /></div>
        {loading ? <Spinner /> : <DataTable rows={list} onRow={(c) => setEdit(c)} cols={[
          { key: 'name', label: 'Cliente', render: (c) => <div><div className="font-medium">{c.name}</div><div className="text-xs text-ink-soft">{c.company}</div></div> },
          { key: 'status', label: 'Situação', render: (c) => <Badge tone={C_STATUS[c.status][1]} dot>{C_STATUS[c.status][0]}</Badge> },
          { key: 'started_at', label: 'Entrou em', render: (c) => date(c.started_at) },
          { key: 'churned_at', label: 'Saiu em', render: (c) => (c.churned_at ? <span title={c.churn_reason}>{date(c.churned_at)}</span> : '—') },
          { key: 'mrr', label: 'Mensalidade', sort: mrrOf, render: (c) => brl(mrrOf(c)) },
          { key: 'phone', label: 'Telefone', hideSm: true, render: (c) => formatPhone(c.phone_e164) || '—' },
          { key: 'owner', label: 'Responsável', hideSm: true, render: (c) => app.memberName(c.owner_id) },
        ]} />}
      </Card>
      {edit && <ClientForm c={edit} sales={sales.filter((s) => s.client_id === edit.id)} onClose={() => { setEdit(null); if (params.get('id')) setParams({}); }} onSaved={reload} />}
    </div>
  );
}

function ClientForm({ c, sales, onClose, onSaved }: { c: Row; sales: Row[]; onClose: () => void; onSaved: () => void }) {
  const app = useApp();
  const { run, busy } = useAction();
  const [f, setF] = useState<Row>({ status: 'active', started_at: todayISO(), owner_id: app.userId, ...c, phone: c.phone_e164 ?? '' });
  const set = (k: string) => (e: any) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = () => run(async () => {
    if (!f.name?.trim()) throw new Error('Informe o nome.');
    if (f.status === 'churned' && (!f.churned_at || !f.churn_reason)) throw new Error('Para registrar a saída, informe a data e o motivo.');
    const ph = normalizePhone(f.phone);
    const row = { name: f.name.trim(), company: f.company || null, phone_e164: ph.e164, email: f.email || null, document: f.document || null, city: f.city || null, owner_id: f.owner_id || null,
      status: f.status, started_at: f.started_at, churned_at: f.status === 'churned' ? f.churned_at : null, churn_reason: f.status === 'churned' ? f.churn_reason : null, notes: f.notes || null };
    if (c.id) await db.update('clients', c.id, row); else await db.insert('clients', { ...row, org_id: app.orgId });
  }, 'Cliente salvo').then((r) => { if (r !== undefined) { onSaved(); onClose(); } });
  const wa = whatsappLink(c.phone_e164);
  return (
    <Modal open onClose={onClose} title={c.id ? c.name : 'Novo cliente'} wide footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={busy} disabled={!app.can.write} onClick={save}>Salvar</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome" required><Input value={f.name ?? ''} onChange={set('name')} /></Field>
        <Field label="Empresa"><Input value={f.company ?? ''} onChange={set('company')} /></Field>
        <Field label="Telefone"><Input value={f.phone ?? ''} onChange={set('phone')} /></Field>
        <Field label="E-mail"><Input value={f.email ?? ''} onChange={set('email')} /></Field>
        <Field label="CPF/CNPJ"><Input value={f.document ?? ''} onChange={set('document')} /></Field>
        <Field label="Cidade"><Input value={f.city ?? ''} onChange={set('city')} /></Field>
        <Field label="Responsável"><Select value={f.owner_id ?? ''} onChange={set('owner_id')} placeholder="—" options={app.members.map((m) => ({ value: m.user_id, label: app.memberName(m.user_id) }))} /></Field>
        <Field label="Situação"><Select value={f.status} onChange={set('status')} options={Object.entries(C_STATUS).map(([v, [l]]) => ({ value: v, label: l }))} /></Field>
        <Field label="Entrou em"><Input type="date" value={f.started_at ?? ''} onChange={set('started_at')} /></Field>
        {f.status === 'churned' && <><Field label="Saiu em" required><Input type="date" value={f.churned_at ?? ''} onChange={set('churned_at')} /></Field>
          <Field label="Motivo da saída" required className="sm:col-span-2"><Select value={f.churn_reason ?? ''} onChange={set('churn_reason')} placeholder="Selecione" options={['Corte de orçamento', 'Resultados abaixo do esperado', 'Fechou o negócio', 'Levou para agência concorrente', 'Assumiu internamente', 'Fim do projeto', 'Outro'].map((v) => ({ value: v, label: v }))} /></Field></>}
        <Field label="Observações" className="sm:col-span-2"><Textarea value={f.notes ?? ''} onChange={set('notes')} /></Field>
      </div>
      {sales.length > 0 && <div className="mt-4"><div className="mb-1 text-xs font-semibold text-ink-soft">Contratos</div>{sales.map((s) => <div key={s.id} className="flex justify-between border-b border-line py-1.5 text-sm dark:border-white/10"><span>{app.services.find((x) => x.id === s.service_id)?.name}</span><span>{brl(s.monthly_value)}/mês · {brl(s.setup_value)} implantação</span></div>)}</div>}
      {wa && <a className="mt-3 inline-block text-xs text-brand-600 underline" href={wa} target="_blank" rel="noopener noreferrer">Abrir conversa no WhatsApp</a>}
    </Modal>
  );
}
