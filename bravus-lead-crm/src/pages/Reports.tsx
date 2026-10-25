import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { db, type Row } from '../lib/backend';
import { useApp } from '../lib/session';
import { brl, num, pct } from '../lib/format';
import { saleTotal, groupCount } from '../lib/metrics';
import { downloadText, toCSV } from '../lib/csv';
import { Button, Card, DataTable, PageHeader, Spinner } from '../components/ui';
import { Bars } from '../components/charts';
import { usePeriod } from './Dashboard';

export default function Reports() {
  const app = useApp();
  const { range, control } = usePeriod();
  const [d, setD] = useState<Record<string, Row[]> | null>(null);
  useEffect(() => {
    Promise.all(['leads', 'sales', 'activities', 'tasks', 'stage_history', 'payments'].map((t) => db.list(t, { eq: { org_id: app.orgId }, limit: 20000 })))
      .then(([leads, sales, activities, tasks, history, payments]) => setD({ leads, sales, activities, tasks, history, payments })).catch(() => {});
  }, [app.orgId]);

  const inR = (x?: string | null) => !!x && new Date(x) >= range.from && new Date(x) <= new Date(range.to.getTime() + 86400000);
  const r = useMemo(() => {
    if (!d) return null;
    const won = (l: Row) => app.stages.find((s) => s.id === l.stage_id)?.kind === 'won';
    const lost = (l: Row) => app.stages.find((s) => s.id === l.stage_id)?.kind === 'lost';
    const team = app.members.map((m) => {
      const id = m.user_id;
      const sales = d.sales.filter((s) => s.owner_id === id && inR(s.closed_at));
      return {
        id, name: app.memberName(id),
        leads: d.leads.filter((l) => l.owner_id === id && inR(l.created_at)).length,
        activities: d.activities.filter((a) => a.created_by === id && inR(a.occurred_at) && !['system', 'stage'].includes(a.type)).length,
        tasksDone: d.tasks.filter((t) => t.assignee_id === id && t.status === 'done' && inR(t.completed_at)).length,
        tasksLate: d.tasks.filter((t) => t.assignee_id === id && t.status === 'open' && new Date(t.due_at) < new Date()).length,
        won: d.leads.filter((l) => l.owner_id === id && won(l) && inR(l.won_at)).length,
        lost: d.leads.filter((l) => l.owner_id === id && lost(l) && inR(l.lost_at)).length,
        revenue: sales.reduce((a, s) => a + saleTotal(s), 0),
      };
    });
    const sources = groupCount(d.leads.filter((l) => inR(l.created_at)), (l) => l.source).map(({ name, value }) => {
      const ls = d.leads.filter((l) => (l.source || 'Não informado') === name && inR(l.created_at));
      const w = ls.filter(won).length;
      const ids = new Set(ls.map((l) => l.id));
      return { id: name, name, leads: value, won: w, conv: value ? (w / value) * 100 : 0, revenue: d.sales.filter((s) => ids.has(s.lead_id)).reduce((a, s) => a + saleTotal(s), 0) };
    });
    // conversão entre etapas: quantos leads (que passaram pela etapa) chegaram à seguinte
    const reached = (stageId: string) => new Set([...d.history.filter((h) => h.to_stage === stageId && inR(h.changed_at)).map((h) => h.lead_id), ...d.leads.filter((l) => l.stage_id === stageId && inR(l.created_at)).map((l) => l.id)]).size;
    const funnel = app.stages.filter((s) => s.kind !== 'lost' && s.kind !== 'nurture').map((s) => ({ name: s.name, value: reached(s.id) }));
    const funnelConv = funnel.map((f, i) => ({ ...f, id: f.name, rate: i === 0 || !funnel[i - 1].value ? null : (f.value / funnel[i - 1].value) * 100 }));
    return { team, sources, funnelConv };
  }, [d, range]); // eslint-disable-line

  if (!r) return <Spinner />;
  const exp = (name: string, rows: Row[], cols: { key: string; label: string }[]) => downloadText(`${name}-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows, cols));

  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Produtividade, conversão e origem — tudo calculado a partir dos registros." actions={control} />
      <div className="space-y-4">
        <Card title="Produtividade da equipe" action={<Button size="sm" variant="ghost" icon={<Download className="h-3.5 w-3.5" />} onClick={() => exp('produtividade', r.team, [{ key: 'name', label: 'Membro' }, { key: 'leads', label: 'Leads' }, { key: 'activities', label: 'Atividades' }, { key: 'tasksDone', label: 'Tarefas concluídas' }, { key: 'tasksLate', label: 'Tarefas atrasadas' }, { key: 'won', label: 'Ganhos' }, { key: 'lost', label: 'Perdidos' }, { key: 'revenue', label: 'Receita contratada' }])}>CSV</Button>} pad={false}>
          <DataTable rows={r.team} cols={[
            { key: 'name', label: 'Membro', render: (x) => <b>{x.name}</b> }, { key: 'leads', label: 'Leads novos' }, { key: 'activities', label: 'Atividades' },
            { key: 'tasksDone', label: 'Tarefas concluídas' }, { key: 'tasksLate', label: 'Atrasadas', render: (x) => <span className={x.tasksLate ? 'font-semibold text-red-600' : ''}>{x.tasksLate}</span> },
            { key: 'won', label: 'Ganhos' }, { key: 'lost', label: 'Perdidos' }, { key: 'conv', label: 'Conversão', sort: (x) => x.won / (x.won + x.lost || 1), render: (x) => pct(x.won + x.lost ? (x.won / (x.won + x.lost)) * 100 : 0) },
            { key: 'revenue', label: 'Receita', render: (x) => brl(x.revenue) },
          ]} />
        </Card>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Conversão entre etapas (período)" pad={false}>
            <DataTable rows={r.funnelConv} cols={[{ key: 'name', label: 'Etapa' }, { key: 'value', label: 'Leads que chegaram', render: (x) => num(x.value) }, { key: 'rate', label: 'Da etapa anterior', render: (x) => (x.rate === null ? '—' : pct(x.rate)) }]} />
          </Card>
          <Card title="Leads por etapa alcançada"><Bars data={r.funnelConv} horizontal height={Math.max(260, r.funnelConv.length * 26)} /></Card>
        </div>
        <Card title="Desempenho por origem" action={<Button size="sm" variant="ghost" icon={<Download className="h-3.5 w-3.5" />} onClick={() => exp('origens', r.sources, [{ key: 'name', label: 'Origem' }, { key: 'leads', label: 'Leads' }, { key: 'won', label: 'Ganhos' }, { key: 'conv', label: 'Conversão %' }, { key: 'revenue', label: 'Receita' }])}>CSV</Button>} pad={false}>
          <DataTable rows={r.sources} cols={[{ key: 'name', label: 'Origem', render: (x) => <b>{x.name}</b> }, { key: 'leads', label: 'Leads' }, { key: 'won', label: 'Ganhos' }, { key: 'conv', label: 'Conversão', render: (x) => pct(x.conv) }, { key: 'revenue', label: 'Receita gerada', render: (x) => brl(x.revenue) }]} />
        </Card>
      </div>
    </div>
  );
}
