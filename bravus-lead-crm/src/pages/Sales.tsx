import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Printer, Wallet, Repeat, Banknote, Clock } from 'lucide-react';
import { db, type Row } from '../lib/backend';
import { useApp, useRows } from '../lib/session';
import { brl, brl2, date, todayISO } from '../lib/format';
import { saleTotal } from '../lib/metrics';
import { Alert, Badge, Button, Card, DataTable, Field, Input, Modal, PageHeader, Select, Spinner, Stat, Tabs, Textarea, useAction } from '../components/ui';

const PROP: Record<string, [string, string]> = { draft: ['Rascunho', 'slate'], sent: ['Enviada', 'blue'], negotiating: ['Em negociação', 'violet'], accepted: ['Aceita', 'green'], rejected: ['Recusada', 'red'], expired: ['Expirada', 'amber'] };
const CONTRACT: Record<string, [string, string]> = { pending: ['Aguardando assinatura', 'amber'], signed: ['Assinado', 'blue'], active: ['Ativo', 'green'], ended: ['Encerrado', 'slate'], canceled: ['Cancelado', 'red'] };
const PAY: Record<string, [string, string]> = { pending: ['A receber', 'amber'], paid: ['Recebido', 'green'], overdue: ['Atrasado', 'red'], canceled: ['Cancelado', 'slate'] };

export default function Sales() {
  const app = useApp();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('propostas');
  const props = useRows('proposals', { order: ['created_at', false] });
  const sales = useRows('sales', { order: ['closed_at', false] });
  const pays = useRows('payments', { order: ['due_date', true] });
  const { rows: leads } = useRows('leads');
  const { rows: clients } = useRows('clients');
  const [editP, setEditP] = useState<Row | null>(null);
  const [editS, setEditS] = useState<Row | null>(null);
  const [editPay, setEditPay] = useState<Row | null>(null);
  useEffect(() => { if (params.get('novo') === 'proposta') { setEditP({}); setParams({}); } }, [params]); // eslint-disable-line

  const leadName = (id?: string) => leads.find((l) => l.id === id)?.full_name;
  const clientName = (id?: string) => clients.find((c) => c.id === id)?.name;
  const svc = (id?: string) => app.services.find((s) => s.id === id)?.name ?? '—';
  const month = new Date().toISOString().slice(0, 7);
  const today = todayISO();

  return (
    <div>
      <PageHeader title="Propostas e vendas" subtitle="Oportunidades, contratos e recebimentos — cada número no seu lugar." actions={<>
        {tab === 'propostas' && app.can.write && <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditP({})}>Nova proposta</Button>}
        {tab === 'vendas' && app.can.write && <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditS({})}>Registrar venda</Button>}
        {tab === 'recebimentos' && app.can.manage && <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditPay({})}>Novo recebimento</Button>}
      </>} />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Receita contratada (mês)" value={brl(sales.rows.filter((s) => s.closed_at?.startsWith(month) && s.contract_status !== 'canceled').reduce((a, s) => a + saleTotal(s), 0))} tone="blue" icon={<Wallet className="h-4 w-4" />} hint="Valor dos contratos fechados" />
        <Stat label="Recorrente mensal (MRR)" value={brl(sales.rows.filter((s) => ['pending', 'signed', 'active'].includes(s.contract_status)).reduce((a, s) => a + Number(s.monthly_value), 0))} tone="cyan" icon={<Repeat className="h-4 w-4" />} />
        <Stat label="Recebido (mês)" value={brl(pays.rows.filter((p) => p.status === 'paid' && p.paid_at?.startsWith(month)).reduce((a, p) => a + Number(p.amount), 0))} tone="green" icon={<Banknote className="h-4 w-4" />} hint="Só pagamentos confirmados" />
        <Stat label="A receber" value={brl(pays.rows.filter((p) => p.status === 'pending' || p.status === 'overdue').reduce((a, p) => a + Number(p.amount), 0))} tone="amber" icon={<Clock className="h-4 w-4" />} hint={`${pays.rows.filter((p) => p.status === 'pending' && p.due_date < today).length} vencidos`} />
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'propostas', label: 'Propostas', count: props.rows.length }, { value: 'vendas', label: 'Vendas e contratos', count: sales.rows.length }, { value: 'recebimentos', label: 'Recebimentos', count: pays.rows.length }]} />

      {tab === 'propostas' && <Card pad={false}>{props.loading ? <Spinner /> : <DataTable rows={props.rows} onRow={setEditP} cols={[
        { key: 'title', label: 'Proposta', render: (p) => <div><div className="font-medium">{p.title}</div><div className="text-xs text-ink-soft">{leadName(p.lead_id) ?? clientName(p.client_id) ?? '—'} · v{p.version}</div></div> },
        { key: 'status', label: 'Status', render: (p) => <Badge tone={PROP[p.status][1]} dot>{PROP[p.status][0]}</Badge> },
        { key: 'setup_total', label: 'Implantação', render: (p) => brl(p.setup_total) },
        { key: 'monthly_total', label: 'Mensal', render: (p) => brl(p.monthly_total) },
        { key: 'valid_until', label: 'Validade', render: (p) => <span className={p.valid_until && p.valid_until < today && ['sent', 'negotiating'].includes(p.status) ? 'text-red-600' : ''}>{date(p.valid_until)}</span> },
        { key: 'owner', label: 'Responsável', hideSm: true, render: (p) => app.memberName(p.owner_id) },
      ]} />}</Card>}

      {tab === 'vendas' && <Card pad={false}>{sales.loading ? <Spinner /> : <DataTable rows={sales.rows} onRow={setEditS} cols={[
        { key: 'who', label: 'Cliente / lead', render: (s) => <div className="font-medium">{clientName(s.client_id) ?? leadName(s.lead_id) ?? '—'}</div> },
        { key: 'service', label: 'Serviço', render: (s) => svc(s.service_id) },
        { key: 'setup_value', label: 'Implantação', render: (s) => brl(s.setup_value) },
        { key: 'monthly_value', label: 'Mensal', render: (s) => brl(s.monthly_value) },
        { key: 'total', label: 'Total contratado', sort: saleTotal, render: (s) => <b>{brl(saleTotal(s))}</b> },
        { key: 'contract_status', label: 'Contrato', render: (s) => <Badge tone={CONTRACT[s.contract_status][1]}>{CONTRACT[s.contract_status][0]}</Badge> },
        { key: 'closed_at', label: 'Fechada em', render: (s) => date(s.closed_at) },
        { key: 'renewal_date', label: 'Renovação', hideSm: true, render: (s) => date(s.renewal_date) },
      ]} />}</Card>}

      {tab === 'recebimentos' && <>
        <Alert tone="info" className="mb-3">Recebimentos só contam como “recebido” quando um gerente confirma o pagamento. O CRM não confirma pagamentos sozinho.</Alert>
        <Card pad={false}>{pays.loading ? <Spinner /> : <DataTable rows={pays.rows} onRow={(p) => app.can.manage && setEditPay(p)} cols={[
          { key: 'who', label: 'Cliente', render: (p) => clientName(p.client_id) ?? '—' },
          { key: 'description', label: 'Descrição' },
          { key: 'amount', label: 'Valor', render: (p) => brl2(p.amount), sort: (p) => Number(p.amount) },
          { key: 'due_date', label: 'Vencimento', render: (p) => <span className={p.status === 'pending' && p.due_date < today ? 'font-medium text-red-600' : ''}>{date(p.due_date)}</span> },
          { key: 'status', label: 'Status', render: (p) => { const st = p.status === 'pending' && p.due_date < today ? 'overdue' : p.status; return <Badge tone={PAY[st][1]} dot>{PAY[st][0]}</Badge>; } },
          { key: 'paid_at', label: 'Pago em', render: (p) => date(p.paid_at) },
        ]} />}</Card>
      </>}

      {editP && <ProposalForm p={editP} leads={leads} clients={clients} onClose={() => setEditP(null)} onSaved={props.reload} />}
      {editS && <SaleForm s={editS} leads={leads} clients={clients} onClose={() => setEditS(null)} onSaved={() => { sales.reload(); pays.reload(); }} />}
      {editPay && <PaymentForm p={editPay} sales={sales.rows} clients={clients} onClose={() => setEditPay(null)} onSaved={pays.reload} />}
    </div>
  );
}

function ProposalForm({ p, leads, clients, onClose, onSaved }: { p: Row; leads: Row[]; clients: Row[]; onClose: () => void; onSaved: () => void }) {
  const app = useApp();
  const { run, busy } = useAction();
  const valid = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);
  const [f, setF] = useState<Row>({ title: '', status: 'draft', valid_until: valid, discount: 0, conditions: 'Pagamento mensal via PIX ou boleto. Verba de anúncios paga diretamente à plataforma.', items: [], ...p });
  const [revs, setRevs] = useState<Row[]>([]);
  useEffect(() => { if (p.id) db.list('proposal_revisions', { eq: { proposal_id: p.id }, order: ['version', false] }).then(setRevs).catch(() => {}); }, [p.id]);
  const set = (k: string) => (e: any) => setF((x) => ({ ...x, [k]: e.target.value }));
  const items: Row[] = f.items ?? [];
  const setItem = (i: number, k: string, v: any) => setF((x) => ({ ...x, items: items.map((it, j) => (j === i ? { ...it, [k]: v } : it)) }));
  const totals = useMemo(() => ({ setup: items.reduce((a, i) => a + Number(i.setup || 0) * Number(i.qty || 1), 0), monthly: items.reduce((a, i) => a + Number(i.monthly || 0) * Number(i.qty || 1), 0) }), [items]);
  const save = () => run(async () => {
    if (!f.title?.trim()) throw new Error('Dê um título à proposta.');
    if (!items.length) throw new Error('Adicione pelo menos um item.');
    if (!f.lead_id && !f.client_id) throw new Error('Vincule a proposta a um lead ou cliente.');
    const row = { title: f.title.trim(), lead_id: f.lead_id || null, client_id: f.client_id || null, items, setup_total: totals.setup, monthly_total: totals.monthly, discount: Number(f.discount || 0), valid_until: f.valid_until || null, conditions: f.conditions || null, notes: f.notes || null, status: f.status };
    if (p.id) await db.update('proposals', p.id, row); else await db.insert('proposals', { ...row, org_id: app.orgId, owner_id: app.userId });
  }, 'Proposta salva').then((r) => { if (r !== undefined) { onSaved(); onClose(); } });

  const print = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const who = leads.find((l) => l.id === f.lead_id) ?? clients.find((c) => c.id === f.client_id);
    const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);
    w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(f.title)}</title><style>body{font-family:Inter,Arial,sans-serif;color:#1E293B;max-width:760px;margin:40px auto;padding:0 24px}h1{color:#101828;margin:0}header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #2563EB;padding-bottom:16px;margin-bottom:24px}.b{font-weight:800;letter-spacing:.1em;color:#101828}.b span{color:#2563EB}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{text-align:left;padding:10px;border-bottom:1px solid #E2E8F0}th{background:#F8FAFC;font-size:12px;color:#64748B}.t{font-size:18px;font-weight:700}small{color:#64748B}</style></head><body>
      <header><div><div class="b">BRAVUS <span>MÍDIA</span></div><small>Proposta comercial · versão ${esc(f.version ?? 1)}</small></div><small>${new Date().toLocaleDateString('pt-BR')}</small></header>
      <h1>${esc(f.title)}</h1><p>Para: <b>${esc(who?.full_name ?? who?.name ?? '')}</b> ${esc(who?.company ?? '')}</p>
      <table><thead><tr><th>Serviço</th><th>Qtd.</th><th>Implantação</th><th>Mensal</th></tr></thead><tbody>${items.map((i) => `<tr><td>${esc(i.service)}${i.description ? `<br><small>${esc(i.description)}</small>` : ''}</td><td>${esc(i.qty || 1)}</td><td>${brl2(Number(i.setup || 0) * Number(i.qty || 1))}</td><td>${brl2(Number(i.monthly || 0) * Number(i.qty || 1))}</td></tr>`).join('')}</tbody></table>
      <p class="t">Implantação: ${brl2(totals.setup - Number(f.discount || 0))} ${Number(f.discount) ? `<small>(desconto de ${brl2(f.discount)})</small>` : ''}<br>Mensalidade: ${brl2(totals.monthly)}</p>
      <p><b>Condições:</b> ${esc(f.conditions)}</p><p><b>Validade:</b> ${f.valid_until ? new Date(f.valid_until + 'T12:00').toLocaleDateString('pt-BR') : '—'}</p>
      <p style="margin-top:48px"><small>Bravus Mídia · Marketing Digital · @bravusmidia</small></p></body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  return (
    <Modal open onClose={onClose} title={p.id ? `Proposta: ${p.title}` : 'Nova proposta'} wide footer={<>
      {p.id && <Button variant="ghost" className="mr-auto" icon={<Printer className="h-4 w-4" />} onClick={print}>Imprimir / PDF</Button>}
      <Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={busy} disabled={!app.can.write} onClick={save}>Salvar</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Título" required className="sm:col-span-2"><Input value={f.title} onChange={set('title')} placeholder="Ex.: Gestão de tráfego — Clínica Sorriso" /></Field>
        <Field label="Lead"><Select value={f.lead_id ?? ''} onChange={set('lead_id')} placeholder="—" options={leads.filter((l) => !l.archived_at).map((l) => ({ value: l.id, label: `${l.full_name}${l.company ? ' — ' + l.company : ''}` }))} /></Field>
        <Field label="ou Cliente"><Select value={f.client_id ?? ''} onChange={set('client_id')} placeholder="—" options={clients.map((c) => ({ value: c.id, label: c.name }))} /></Field>
        <Field label="Status"><Select value={f.status} onChange={set('status')} options={Object.entries(PROP).map(([v, [l]]) => ({ value: v, label: l }))} /></Field>
        <Field label="Validade"><Input type="date" value={f.valid_until ?? ''} onChange={set('valid_until')} /></Field>
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between"><span className="text-xs font-semibold text-ink-soft">Itens</span>
          <Select className="h-8 w-56 text-xs" value="" onChange={(e) => { const s = app.services.find((x) => x.id === e.target.value); if (s) setF((x) => ({ ...x, items: [...items, { service: s.name, service_id: s.id, qty: 1, setup: s.setup_price, monthly: s.monthly_price }] })); }} placeholder="+ Adicionar serviço" options={app.services.filter((s) => s.active).map((s) => ({ value: s.id, label: s.name }))} />
        </div>
        {items.map((it, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-line p-2 sm:grid-cols-[1fr_70px_110px_110px_32px] dark:border-white/10">
            <Input className="col-span-2 h-8 sm:col-span-1" value={it.service} onChange={(e) => setItem(i, 'service', e.target.value)} />
            <Input className="h-8" type="number" min={1} value={it.qty} onChange={(e) => setItem(i, 'qty', e.target.value)} title="Quantidade" />
            <Input className="h-8" type="number" min={0} value={it.setup} onChange={(e) => setItem(i, 'setup', e.target.value)} placeholder="Implantação" title="Implantação" />
            <Input className="h-8" type="number" min={0} value={it.monthly} onChange={(e) => setItem(i, 'monthly', e.target.value)} placeholder="Mensal" title="Mensal" />
            <button onClick={() => setF((x) => ({ ...x, items: items.filter((_, j) => j !== i) }))} className="text-ink-soft hover:text-red-600" aria-label="Remover"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-end gap-4 text-sm"><Field label="Desconto (R$)"><Input className="h-8 w-28" type="number" min={0} value={f.discount} onChange={set('discount')} /></Field>
          <span>Implantação: <b>{brl2(totals.setup - Number(f.discount || 0))}</b></span><span>Mensal: <b>{brl2(totals.monthly)}</b></span></div>
      </div>
      <Field label="Condições" className="mt-3"><Textarea value={f.conditions ?? ''} onChange={set('conditions')} /></Field>
      <Field label="Observações internas" className="mt-3"><Textarea value={f.notes ?? ''} onChange={set('notes')} /></Field>
      {revs.length > 0 && <div className="mt-4"><div className="text-xs font-semibold text-ink-soft">Revisões anteriores</div>{revs.map((r) => <div key={r.id} className="text-xs text-ink-soft">v{r.version} · {date(r.created_at)} · {brl(r.snapshot?.setup_total)} + {brl(r.snapshot?.monthly_total)}/mês</div>)}</div>}
    </Modal>
  );
}

function SaleForm({ s, leads, clients, onClose, onSaved }: { s: Row; leads: Row[]; clients: Row[]; onClose: () => void; onSaved: () => void }) {
  const app = useApp();
  const { run, busy } = useAction();
  const [f, setF] = useState<Row>({ contract_status: 'pending', closed_at: todayISO(), setup_value: 0, monthly_value: 0, discount: 0, ...s });
  const [genPay, setGenPay] = useState(false);
  const set = (k: string) => (e: any) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = () => run(async () => {
    if (!f.service_id) throw new Error('Selecione o serviço.');
    if (!f.client_id && !f.lead_id) throw new Error('Vincule a um cliente ou lead.');
    const row = { lead_id: f.lead_id || null, client_id: f.client_id || null, service_id: f.service_id, setup_value: Number(f.setup_value || 0), monthly_value: Number(f.monthly_value || 0), discount: Number(f.discount || 0),
      duration_months: f.duration_months ? Number(f.duration_months) : null, closed_at: f.closed_at, start_date: f.start_date || null, renewal_date: f.renewal_date || null, contract_status: f.contract_status, notes: f.notes || null };
    const saved = s.id ? await db.update('sales', s.id, row) : (await db.insert('sales', { ...row, org_id: app.orgId, owner_id: app.userId }))[0];
    if (genPay && app.can.manage && row.monthly_value > 0) {
      const start = new Date((row.start_date ?? row.closed_at) + 'T12:00');
      const n = row.duration_months ?? 1;
      await db.insert('payments', Array.from({ length: n }).map((_, i) => ({ org_id: app.orgId, sale_id: saved.id, client_id: row.client_id, description: `Mensalidade ${i + 1}/${n}`, amount: row.monthly_value, due_date: new Date(start.getFullYear(), start.getMonth() + i, start.getDate()).toISOString().slice(0, 10), status: 'pending' })));
    }
  }, 'Venda salva').then((r) => { if (r !== undefined) { onSaved(); onClose(); } });
  return (
    <Modal open onClose={onClose} title={s.id ? 'Editar venda / contrato' : 'Registrar venda'} wide footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={busy} disabled={!app.can.write} onClick={save}>Salvar</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Cliente"><Select value={f.client_id ?? ''} onChange={set('client_id')} placeholder="—" options={clients.map((c) => ({ value: c.id, label: c.name }))} /></Field>
        <Field label="ou Lead"><Select value={f.lead_id ?? ''} onChange={set('lead_id')} placeholder="—" options={leads.map((l) => ({ value: l.id, label: l.full_name }))} /></Field>
        <Field label="Serviço" required><Select value={f.service_id ?? ''} onChange={set('service_id')} placeholder="Selecione" options={app.services.map((x) => ({ value: x.id, label: x.name }))} /></Field>
        <Field label="Status do contrato"><Select value={f.contract_status} onChange={set('contract_status')} options={Object.entries(CONTRACT).map(([v, [l]]) => ({ value: v, label: l }))} /></Field>
        <Field label="Implantação (R$)"><Input type="number" min={0} value={f.setup_value} onChange={set('setup_value')} /></Field>
        <Field label="Mensalidade (R$)"><Input type="number" min={0} value={f.monthly_value} onChange={set('monthly_value')} /></Field>
        <Field label="Desconto (R$)"><Input type="number" min={0} value={f.discount} onChange={set('discount')} /></Field>
        <Field label="Duração (meses)"><Input type="number" min={1} value={f.duration_months ?? ''} onChange={set('duration_months')} /></Field>
        <Field label="Data de fechamento"><Input type="date" value={f.closed_at ?? ''} onChange={set('closed_at')} /></Field>
        <Field label="Início"><Input type="date" value={f.start_date ?? ''} onChange={set('start_date')} /></Field>
        <Field label="Renovação"><Input type="date" value={f.renewal_date ?? ''} onChange={set('renewal_date')} /></Field>
        <Field label="Observações" className="sm:col-span-2"><Textarea value={f.notes ?? ''} onChange={set('notes')} /></Field>
      </div>
      {app.can.manage && !s.id && <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={genPay} onChange={(e) => setGenPay(e.target.checked)} /> Gerar parcelas “a receber” das mensalidades</label>}
      {f.lead_id && !s.id && <p className="mt-2 text-xs text-ink-soft">Dica: para também mover o lead para “Fechado — ganho”, use o funil — lá a venda é registrada junto. <Link className="text-brand-600 underline" to={`/leads?id=${f.lead_id}`}>Abrir lead</Link></p>}
    </Modal>
  );
}

function PaymentForm({ p, sales, clients, onClose, onSaved }: { p: Row; sales: Row[]; clients: Row[]; onClose: () => void; onSaved: () => void }) {
  const app = useApp();
  const { run, busy } = useAction();
  const [f, setF] = useState<Row>({ status: 'pending', due_date: todayISO(), ...p });
  const set = (k: string) => (e: any) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = () => run(async () => {
    if (!(Number(f.amount) > 0)) throw new Error('Valor inválido.');
    if (f.status === 'paid' && !f.paid_at) throw new Error('Informe a data do pagamento.');
    const row = { sale_id: f.sale_id || null, client_id: f.client_id || sales.find((s) => s.id === f.sale_id)?.client_id || null, description: f.description || null, amount: Number(f.amount), due_date: f.due_date, status: f.status, paid_at: f.status === 'paid' ? f.paid_at : null, method: f.method || null, confirmed_by: f.status === 'paid' ? app.userId : null };
    if (p.id) await db.update('payments', p.id, row); else await db.insert('payments', { ...row, org_id: app.orgId });
  }, 'Recebimento salvo').then((r) => { if (r !== undefined) { onSaved(); onClose(); } });
  return (
    <Modal open onClose={onClose} title={p.id ? 'Recebimento' : 'Novo recebimento'} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={save}>Salvar</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Cliente" className="sm:col-span-2"><Select value={f.client_id ?? ''} onChange={set('client_id')} placeholder="—" options={clients.map((c) => ({ value: c.id, label: c.name }))} /></Field>
        <Field label="Descrição" className="sm:col-span-2"><Input value={f.description ?? ''} onChange={set('description')} /></Field>
        <Field label="Valor (R$)" required><Input type="number" min={0} step="0.01" value={f.amount ?? ''} onChange={set('amount')} /></Field>
        <Field label="Vencimento"><Input type="date" value={f.due_date} onChange={set('due_date')} /></Field>
        <Field label="Status"><Select value={f.status} onChange={set('status')} options={Object.entries(PAY).filter(([v]) => v !== 'overdue').map(([v, [l]]) => ({ value: v, label: l }))} /></Field>
        {f.status === 'paid' && <Field label="Pago em" required><Input type="date" value={f.paid_at ?? ''} onChange={set('paid_at')} /></Field>}
        <Field label="Forma"><Select value={f.method ?? ''} onChange={set('method')} placeholder="—" options={['PIX', 'Boleto', 'Cartão', 'Transferência', 'Dinheiro'].map((m) => ({ value: m, label: m }))} /></Field>
      </div>
      {f.status === 'paid' && <Alert tone="info" className="mt-3">Ao salvar como recebido, a confirmação fica registrada em seu nome na auditoria.</Alert>}
    </Modal>
  );
}
