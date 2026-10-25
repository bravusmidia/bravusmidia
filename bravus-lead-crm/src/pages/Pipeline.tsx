import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { LayoutGrid, Table2, Plus, AlarmClock, User } from 'lucide-react';
import { useApp, useRows } from '../lib/session';
import { brl, relative } from '../lib/format';
import { lastActivity, inactivityLevel } from '../lib/metrics';
import { Badge, Button, DOT, DataTable, PageHeader, SearchInput, Select, Spinner, Card } from '../components/ui';
import { LeadDrawer, LeadForm, LeadStatusBadges, StageBadge, useStageMover } from '../components/leads';

export default function Pipeline() {
  const app = useApp();
  const [params, setParams] = useSearchParams();
  const { rows, loading, reload, setRows } = useRows('leads');
  const { rows: tasks } = useRows('tasks', { eq: { status: 'open' } });
  const [view, setView] = useState<'kanban' | 'tabela'>('kanban');
  const [q, setQ] = useState('');
  const [owner, setOwner] = useState('');
  const [service, setService] = useState('');
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [form, setForm] = useState(false);
  const mover = useStageMover(reload);

  const leads = useMemo(() => rows.filter((l) => !l.archived_at && (!owner || l.owner_id === owner) && (!service || l.service_id === service) &&
    (!q || `${l.full_name} ${l.company ?? ''} ${(l.tags ?? []).join(' ')}`.toLowerCase().includes(q.toLowerCase()))), [rows, q, owner, service]);
  const nextTask = (id: string) => tasks.filter((t) => t.lead_id === id).sort((a, b) => (a.due_at < b.due_at ? -1 : 1))[0];

  const drop = async (stageId: string) => {
    const lead = rows.find((l) => l.id === drag);
    setDrag(null); setOver(null);
    if (!lead || lead.stage_id === stageId) return;
    const kind = app.stages.find((s) => s.id === stageId)?.kind;
    if (kind !== 'won' && kind !== 'lost') setRows((r) => r.map((x) => (x.id === lead.id ? { ...x, stage_id: stageId } : x))); // otimista
    await mover.move(lead, stageId);
    reload();
  };

  return (
    <div>
      <PageHeader title="Funil de vendas" subtitle="Arraste os cartões entre as etapas. No celular, use o seletor dentro do cartão." actions={<>
        <div className="flex rounded-lg border border-line bg-white p-0.5 dark:border-white/10 dark:bg-white/5">
          <button onClick={() => setView('kanban')} className={clsx('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm', view === 'kanban' && 'bg-navy text-white dark:bg-brand-600')}><LayoutGrid className="h-4 w-4" />Kanban</button>
          <button onClick={() => setView('tabela')} className={clsx('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm', view === 'tabela' && 'bg-navy text-white dark:bg-brand-600')}><Table2 className="h-4 w-4" />Tabela</button>
        </div>
        {app.can.write && <Button icon={<Plus className="h-4 w-4" />} onClick={() => setForm(true)}>Novo lead</Button>}
      </>} />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <SearchInput value={q} onChange={setQ} />
        <Select className="sm:w-48" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Todos responsáveis" options={app.members.map((m) => ({ value: m.user_id, label: app.memberName(m.user_id) }))} />
        <Select className="sm:w-56" value={service} onChange={(e) => setService(e.target.value)} placeholder="Todos os serviços" options={app.services.map((s) => ({ value: s.id, label: s.name }))} />
      </div>
      {loading ? <Spinner /> : view === 'kanban' ? (
        <div className="-mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-4 sm:-mx-6 sm:px-6">
          {app.stages.map((s) => {
            const items = leads.filter((l) => l.stage_id === s.id);
            const total = items.reduce((a, l) => a + Number(l.potential_value ?? 0), 0);
            return (
              <div key={s.id} className={clsx('flex w-[280px] shrink-0 snap-start flex-col rounded-xl border bg-slate-100/70 transition dark:bg-white/[0.03]', over === s.id ? 'border-brand-400 ring-2 ring-brand-500/20' : 'border-transparent')}
                onDragOver={(e) => { e.preventDefault(); setOver(s.id); }} onDragLeave={() => setOver(null)} onDrop={() => drop(s.id)}>
                <div className="flex items-center justify-between px-3 pb-2 pt-3">
                  <div className="flex min-w-0 items-center gap-2"><span className={clsx('h-2 w-2 shrink-0 rounded-full', DOT[s.color])} /><span className="truncate text-[13px] font-semibold">{s.name}</span></div>
                  <span className="shrink-0 rounded-full bg-white px-2 text-xs font-medium text-ink-soft dark:bg-white/10">{items.length}</span>
                </div>
                <div className="px-3 pb-2 text-[11px] text-ink-soft">{brl(total)}</div>
                <div className="flex max-h-[calc(100vh-300px)] min-h-[80px] flex-col gap-2 overflow-y-auto px-2 pb-2">
                  {items.map((l) => {
                    const t = nextTask(l.id);
                    const late = (t && new Date(t.due_at) < new Date()) || (l.next_follow_up_at && new Date(l.next_follow_up_at) < new Date());
                    const lvl = inactivityLevel(l, app.inactivity);
                    return (
                      <article key={l.id} draggable={app.can.write} onDragStart={() => setDrag(l.id)} onDragEnd={() => { setDrag(null); setOver(null); }}
                        onClick={() => setParams({ id: l.id })}
                        className={clsx('cursor-pointer rounded-lg border bg-white p-3 shadow-sm transition hover:shadow-md dark:bg-navy-700', drag === l.id && 'opacity-50', late ? 'border-red-200 dark:border-red-500/40' : lvl !== 'ok' ? 'border-slate-200 opacity-90 dark:border-white/10' : 'border-line dark:border-white/10')}>
                        <div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="truncate text-sm font-semibold">{l.full_name}</div><div className="truncate text-xs text-ink-soft">{l.company}</div></div>{late && <AlarmClock className="h-4 w-4 shrink-0 text-red-500" />}</div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {l.service_id && <Badge tone="blue">{app.services.find((x) => x.id === l.service_id)?.name}</Badge>}
                          {(l.tags ?? []).slice(0, 2).map((tg: string) => <Badge key={tg}>{tg}</Badge>)}
                        </div>
                        <div className="mt-2"><LeadStatusBadges lead={l} /></div>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-ink-soft">
                          <span className="font-semibold text-ink dark:text-slate-200">{brl(l.potential_value)}</span>
                          <span className="flex items-center gap-1"><User className="h-3 w-3" />{app.memberName(l.owner_id).split(' ')[0]}</span>
                        </div>
                        <div className="mt-1 text-[11px] text-ink-soft">Última atividade {relative(lastActivity(l))}{t ? ` · Próx.: ${t.title}` : ''}</div>
                        {app.can.write && <select onClick={(e) => e.stopPropagation()} value={l.stage_id} onChange={(e) => mover.move(l, e.target.value)}
                          className="mt-2 w-full rounded-md border border-line bg-canvas px-2 py-1 text-[11px] lg:hidden dark:border-white/10 dark:bg-white/5">
                          {app.stages.map((x) => <option key={x.id} value={x.id}>Mover para: {x.name}</option>)}
                        </select>}
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card pad={false}>
          <DataTable rows={leads} onRow={(l) => setParams({ id: l.id })} initialSort={['stage', 'asc']} cols={[
            { key: 'full_name', label: 'Lead', render: (l) => <div><div className="font-medium">{l.full_name}</div><div className="text-xs text-ink-soft">{l.company}</div></div> },
            { key: 'stage', label: 'Etapa', sort: (l) => app.stages.find((s) => s.id === l.stage_id)?.position, render: (l) => <StageBadge stageId={l.stage_id} /> },
            { key: 'service', label: 'Serviço', render: (l) => app.services.find((s) => s.id === l.service_id)?.name ?? '—' },
            { key: 'potential_value', label: 'Valor', render: (l) => brl(l.potential_value), sort: (l) => Number(l.potential_value) },
            { key: 'owner', label: 'Responsável', render: (l) => app.memberName(l.owner_id) },
            { key: 'next', label: 'Próximo follow-up', sort: (l) => l.next_follow_up_at, render: (l) => (l.next_follow_up_at ? relative(l.next_follow_up_at) : '—') },
            { key: 'last', label: 'Última atividade', sort: (l) => lastActivity(l), render: (l) => relative(lastActivity(l)) },
          ]} />
        </Card>
      )}
      <LeadForm open={form} onClose={() => setForm(false)} onSaved={reload} />
      <LeadDrawer leadId={params.get('id')} onClose={() => setParams({})} onChanged={reload} />
      {mover.modal}
    </div>
  );
}
