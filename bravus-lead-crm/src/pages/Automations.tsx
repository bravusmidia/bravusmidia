import { useState } from 'react';
import { Plus, Pause, Play, FlaskConical } from 'lucide-react';
import { db, type Row } from '../lib/backend';
import { useApp, useRows } from '../lib/session';
import { dateTime } from '../lib/format';
import { Alert, Badge, Button, Card, DataTable, Field, Input, Modal, PageHeader, Select, Spinner, useAction } from '../components/ui';
import { TASK_TYPES, PRIORITY } from '../components/leads';

export const TRIGGERS: Record<string, string> = {
  lead_created: 'Quando um lead é criado', stage_changed: 'Quando o lead muda de etapa', proposal_sent: 'Quando uma proposta é enviada',
  sale_won: 'Quando uma venda é fechada', message_received: 'Quando chega mensagem no WhatsApp', opt_out: 'Quando alguém pede para parar (opt-out)',
  task_overdue: 'Quando uma tarefa vence', integration_error: 'Quando a integração falha',
};
export const ACTIONS: Record<string, string> = {
  create_task: 'Criar tarefa de follow-up', notify_owner: 'Avisar o responsável pelo lead', notify_admins: 'Avisar os administradores',
  update_last_interaction: 'Atualizar a última interação', suppress_contact: 'Bloquear novos envios (supressão)', create_client: 'Criar cadastro de cliente',
};

export default function Automations() {
  const app = useApp();
  const { run } = useAction();
  const { rows, loading, reload } = useRows('automations', { order: ['created_at', true] });
  const { rows: runs } = useRows('automation_runs', { order: ['created_at', false], limit: 100 });
  const [edit, setEdit] = useState<Row | null>(null);
  const allPaused = rows.length > 0 && rows.every((a) => !a.active);
  const toggleAll = () => run(() => Promise.all(rows.map((a) => db.update('automations', a.id, { active: allPaused }))), allPaused ? 'Automações retomadas' : 'Todas as automações pausadas').then(reload);

  return (
    <div>
      <PageHeader title="Automações" subtitle="Regras simples: gatilho → condição → ação. Executadas no servidor, uma única vez por evento." actions={app.can.manage && <>
        <Button variant="secondary" icon={allPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />} onClick={toggleAll}>{allPaused ? 'Retomar todas' : 'Pausar todas'}</Button>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEdit({ trigger: 'lead_created', action: 'create_task', params: { type: 'follow_up', days: 1, priority: 'normal' }, conditions: {}, active: true, simulate: true })}>Nova regra</Button>
      </>} />
      <Alert tone="info" className="mb-4">Automações deste CRM <b>não enviam mensagens</b> no WhatsApp. Elas criam tarefas, avisos e cadastros internos. Use “modo simulação” para testar uma regra antes de ativar de verdade.</Alert>
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Card pad={false}>{loading ? <Spinner /> : <DataTable rows={rows} onRow={(a) => app.can.manage && setEdit(a)} cols={[
          { key: 'name', label: 'Regra', render: (a) => <div><div className="font-medium">{a.name}</div><div className="text-xs text-ink-soft">{TRIGGERS[a.trigger]} → {ACTIONS[a.action]}</div></div> },
          { key: 'status', label: 'Status', render: (a) => <span className="flex gap-1"><Badge tone={a.active ? 'green' : 'slate'} dot>{a.active ? 'Ativa' : 'Pausada'}</Badge>{a.simulate && <Badge tone="violet">Simulação</Badge>}</span> },
          { key: 't', label: '', render: (a) => app.can.manage && <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); run(() => db.update('automations', a.id, { active: !a.active }), a.active ? 'Pausada' : 'Ativada').then(reload); }}>{a.active ? 'Pausar' : 'Ativar'}</Button> },
        ]} />}</Card>
        <Card title="Log de execuções" pad={false}>
          <div className="max-h-[480px] overflow-y-auto">{runs.map((r) => (
            <div key={r.id} className="border-b border-line px-4 py-2 text-xs last:border-0 dark:border-white/10">
              <div className="flex items-center justify-between"><span className="font-medium">{rows.find((a) => a.id === r.automation_id)?.name ?? 'Regra'}</span><Badge tone={{ executed: 'green', simulated: 'violet', skipped: 'slate', error: 'red' }[r.outcome as string]}>{{ executed: 'Executada', simulated: 'Simulada', skipped: 'Ignorada', error: 'Erro' }[r.outcome as string]}</Badge></div>
              <div className="text-ink-soft">{dateTime(r.created_at)}{r.outcome === 'error' ? ` · ${r.detail}` : ''}</div>
            </div>))}
            {runs.length === 0 && <p className="p-4 text-sm text-ink-soft">Nenhuma execução ainda.</p>}
          </div>
        </Card>
      </div>
      {edit && <RuleForm a={edit} onClose={() => setEdit(null)} onSaved={reload} />}
    </div>
  );
}

function RuleForm({ a, onClose, onSaved }: { a: Row; onClose: () => void; onSaved: () => void }) {
  const app = useApp();
  const { run, busy } = useAction();
  const [f, setF] = useState<Row>({ ...a, params: { ...(a.params ?? {}) }, conditions: { ...(a.conditions ?? {}) } });
  const p = f.params;
  const setP = (k: string, v: any) => setF((x) => ({ ...x, params: { ...x.params, [k]: v } }));
  return (
    <Modal open onClose={onClose} title={a.id ? 'Editar regra' : 'Nova regra'} wide footer={<>
      {a.id && <Button variant="ghost" className="mr-auto text-red-600" onClick={() => run(() => db.remove('automations', a.id), 'Regra excluída').then(() => { onSaved(); onClose(); })}>Excluir</Button>}
      <Button variant="secondary" onClick={onClose}>Cancelar</Button>
      <Button loading={busy} onClick={() => run(async () => {
        if (!f.name?.trim()) throw new Error('Dê um nome à regra.');
        const row = { name: f.name.trim(), trigger: f.trigger, action: f.action, params: f.action === 'create_task' ? { type: p.type, title: p.title || f.name, days: Number(p.days || 0), priority: p.priority } : p.message ? { message: p.message } : {}, conditions: Object.fromEntries(Object.entries(f.conditions).filter(([, v]) => v)), active: !!f.active, simulate: !!f.simulate };
        if (a.id) await db.update('automations', a.id, row); else await db.insert('automations', { ...row, org_id: app.orgId });
      }, 'Regra salva').then((r) => { if (r !== undefined) { onSaved(); onClose(); } })}>Salvar</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome da regra" required className="sm:col-span-2"><Input value={f.name ?? ''} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="1. Gatilho (quando)"><Select value={f.trigger} onChange={(e) => setF({ ...f, trigger: e.target.value })} options={Object.entries(TRIGGERS).map(([v, l]) => ({ value: v, label: l }))} /></Field>
        <Field label="2. Condição (opcional)">
          {f.trigger === 'stage_changed' ? <Select value={f.conditions.stage_id ?? ''} onChange={(e) => setF({ ...f, conditions: { stage_id: e.target.value } })} placeholder="Qualquer etapa" options={app.stages.map((s) => ({ value: s.id, label: `Entrou em: ${s.name}` }))} />
            : <Input value={f.conditions.source ?? ''} onChange={(e) => setF({ ...f, conditions: { ...f.conditions, source: e.target.value } })} placeholder="Origem do lead (ex.: Meta Ads)" />}
        </Field>
        <Field label="3. Ação (então)" className="sm:col-span-2"><Select value={f.action} onChange={(e) => setF({ ...f, action: e.target.value })} options={Object.entries(ACTIONS).map(([v, l]) => ({ value: v, label: l }))} /></Field>
        {f.action === 'create_task' && <>
          <Field label="Tipo de tarefa"><Select value={p.type ?? 'follow_up'} onChange={(e) => setP('type', e.target.value)} options={Object.entries(TASK_TYPES).map(([v, l]) => ({ value: v, label: l }))} /></Field>
          <Field label="Título da tarefa"><Input value={p.title ?? ''} onChange={(e) => setP('title', e.target.value)} /></Field>
          <Field label="Prazo (dias depois do evento)"><Input type="number" min={0} max={90} value={p.days ?? 1} onChange={(e) => setP('days', e.target.value)} /></Field>
          <Field label="Prioridade"><Select value={p.priority ?? 'normal'} onChange={(e) => setP('priority', e.target.value)} options={Object.entries(PRIORITY).map(([v, [l]]) => ({ value: v, label: l }))} /></Field>
        </>}
        {f.action === 'notify_admins' && <Field label="Mensagem do aviso" className="sm:col-span-2"><Input value={p.message ?? ''} onChange={(e) => setP('message', e.target.value)} /></Field>}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />Ativa</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!f.simulate} onChange={(e) => setF({ ...f, simulate: e.target.checked })} /><FlaskConical className="h-4 w-4 text-violet-500" />Modo simulação (só registra no log)</label>
      </div>
    </Modal>
  );
}
