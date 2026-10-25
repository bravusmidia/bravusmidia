import { useState } from 'react';
import { Plus } from 'lucide-react';
import { db, type Row } from '../lib/backend';
import { useApp, useRows } from '../lib/session';
import { brl } from '../lib/format';
import { saleTotal } from '../lib/metrics';
import { Badge, Button, Card, DataTable, Field, Input, Modal, PageHeader, Spinner, Textarea, useAction } from '../components/ui';

export default function Services() {
  const app = useApp();
  const { rows, loading, reload } = useRows('services', { order: ['name'] });
  const { rows: sales } = useRows('sales');
  const { rows: leads } = useRows('leads');
  const [edit, setEdit] = useState<Row | null>(null);
  const done = () => { reload(); app.reloadOrg(); };
  return (
    <div>
      <PageHeader title="Serviços e produtos" subtitle="O que a Bravus Mídia vende, com preços de referência." actions={app.can.manage && <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEdit({ active: true, recurring: true })}>Novo serviço</Button>} />
      <Card pad={false}>{loading ? <Spinner /> : <DataTable rows={rows} onRow={(r) => app.can.manage && setEdit(r)} cols={[
        { key: 'name', label: 'Serviço', render: (s) => <div><div className="font-medium">{s.name}</div><div className="text-xs text-ink-soft">{s.description}</div></div> },
        { key: 'type', label: 'Tipo', render: (s) => <Badge tone={s.recurring ? 'blue' : 'violet'}>{s.recurring ? 'Recorrente' : 'Projeto'}</Badge> },
        { key: 'setup_price', label: 'Implantação', render: (s) => brl(s.setup_price) },
        { key: 'monthly_price', label: 'Mensal', render: (s) => brl(s.monthly_price) },
        { key: 'interest', label: 'Leads interessados', sort: (s) => leads.filter((l) => l.service_id === s.id).length, render: (s) => leads.filter((l) => l.service_id === s.id && !l.archived_at).length },
        { key: 'sold', label: 'Vendido (total)', sort: (s) => sales.filter((x) => x.service_id === s.id).reduce((a, x) => a + saleTotal(x), 0), render: (s) => brl(sales.filter((x) => x.service_id === s.id).reduce((a, x) => a + saleTotal(x), 0)) },
        { key: 'active', label: 'Status', render: (s) => <Badge tone={s.active ? 'green' : 'slate'}>{s.active ? 'Ativo' : 'Inativo'}</Badge> },
      ]} />}</Card>
      {edit && <ServiceForm s={edit} onClose={() => setEdit(null)} onSaved={done} />}
    </div>
  );
}

function ServiceForm({ s, onClose, onSaved }: { s: Row; onClose: () => void; onSaved: () => void }) {
  const app = useApp();
  const { run, busy } = useAction();
  const [f, setF] = useState<Row>({ ...s });
  const set = (k: string) => (e: any) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  return (
    <Modal open onClose={onClose} title={s.id ? s.name : 'Novo serviço'} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={() => run(async () => {
      if (!f.name?.trim()) throw new Error('Informe o nome.');
      const row = { name: f.name.trim(), description: f.description || null, setup_price: Number(f.setup_price || 0), monthly_price: Number(f.monthly_price || 0), recurring: !!f.recurring, active: !!f.active };
      if (s.id) await db.update('services', s.id, row); else await db.insert('services', { ...row, org_id: app.orgId });
    }, 'Serviço salvo').then((r) => { if (r !== undefined) { onSaved(); onClose(); } })}>Salvar</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome" required className="sm:col-span-2"><Input value={f.name ?? ''} onChange={set('name')} /></Field>
        <Field label="Descrição" className="sm:col-span-2"><Textarea value={f.description ?? ''} onChange={set('description')} /></Field>
        <Field label="Implantação (R$)"><Input type="number" min={0} value={f.setup_price ?? 0} onChange={set('setup_price')} /></Field>
        <Field label="Mensalidade (R$)"><Input type="number" min={0} value={f.monthly_price ?? 0} onChange={set('monthly_price')} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!f.recurring} onChange={set('recurring')} />Serviço recorrente</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!f.active} onChange={set('active')} />Ativo</label>
      </div>
    </Modal>
  );
}
