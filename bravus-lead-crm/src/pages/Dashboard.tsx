import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, MessageSquareWarning, Hourglass, BadgeCheck, Handshake, Send, AlarmClock, CalendarX2, Trophy, XCircle, Wallet, Repeat, Receipt, Percent, Layers, Scale, Briefcase, LogIn, LogOut, Banknote, Timer } from 'lucide-react';
import { db, type Row } from '../lib/backend';
import { useApp } from '../lib/session';
import { avgDaysToClose, avgResponseHours, computeDashboard, groupCount, seriesByDay, seriesByMonth, saleTotal } from '../lib/metrics';
import { brl, num, pct } from '../lib/format';
import { Card, Field, Input, PageHeader, Select, Spinner, Stat } from '../components/ui';
import { AreaSeries, Bars, Donut } from '../components/charts';

export function usePeriod() {
  const [period, setPeriod] = useState('month');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const range = useMemo(() => {
    const now = new Date();
    const d = (n: number) => new Date(now.getTime() - n * 86400000);
    switch (period) {
      case '7': return { from: d(7), to: now };
      case '30': return { from: d(30), to: now };
      case '90': return { from: d(90), to: now };
      case 'year': return { from: new Date(now.getFullYear(), 0, 1), to: now };
      case 'lastmonth': return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 0) };
      case 'custom': return { from: custom.from ? new Date(custom.from + 'T00:00') : d(30), to: custom.to ? new Date(custom.to + 'T23:59') : now };
      default: return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    }
  }, [period, custom]);
  const control = (
    <div className="flex flex-wrap items-end gap-2">
      <Select className="w-44" value={period} onChange={(e) => setPeriod(e.target.value)} options={[['month', 'Este mês'], ['lastmonth', 'Mês passado'], ['7', 'Últimos 7 dias'], ['30', 'Últimos 30 dias'], ['90', 'Últimos 90 dias'], ['year', 'Este ano'], ['custom', 'Personalizado']].map(([value, label]) => ({ value, label }))} />
      {period === 'custom' && <><Input type="date" className="w-40" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} /><Input type="date" className="w-40" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} /></>}
    </div>
  );
  return { range, control, period };
}

export default function Dashboard() {
  const app = useApp();
  const nav = useNavigate();
  const { range, control } = usePeriod();
  const [data, setData] = useState<Record<string, Row[]> | null>(null);
  const [flt, setFlt] = useState({ source: '', service: '', owner: '', campaign: '' });

  useEffect(() => {
    const eq = { org_id: app.orgId };
    Promise.all(['leads', 'sales', 'payments', 'tasks', 'clients', 'activities', 'messages'].map((t) => db.list(t, { eq, limit: t === 'messages' || t === 'activities' ? 5000 : 10000 })))
      .then(([leads, sales, payments, tasks, clients, activities, messages]) => setData({ leads, sales, payments, tasks, clients, activities, messages }))
      .catch(() => setData({ leads: [], sales: [], payments: [], tasks: [], clients: [], activities: [], messages: [] }));
  }, [app.orgId]);

  const filtered = useMemo((): Record<string, Row[]> | null => {
    if (!data) return null;
    const leads = data.leads.filter((l) => (!flt.source || l.source === flt.source) && (!flt.service || l.service_id === flt.service) && (!flt.owner || l.owner_id === flt.owner) && (!flt.campaign || l.campaign === flt.campaign));
    const ids = new Set(leads.map((l) => l.id));
    const anyLeadFilter = flt.source || flt.campaign;
    const sales = data.sales.filter((s) => (!flt.service || s.service_id === flt.service) && (!flt.owner || s.owner_id === flt.owner) && (!anyLeadFilter || ids.has(s.lead_id)));
    const tasks = data.tasks.filter((t) => (!flt.owner || t.assignee_id === flt.owner) && (!anyLeadFilter || ids.has(t.lead_id)));
    return { ...data, leads, sales, tasks };
  }, [data, flt]);

  if (!filtered) return <Spinner />;
  const m = computeDashboard({ leads: filtered.leads, stages: app.stages, sales: filtered.sales, payments: filtered.payments, tasks: filtered.tasks, clients: filtered.clients, inactivity: app.inactivity, from: range.from, to: range.to });
  const inRange = (d?: string) => !!d && new Date(d) >= range.from && new Date(d) <= new Date(range.to.getTime() + 86400000);
  const days = Math.min(90, Math.max(7, Math.round((range.to.getTime() - range.from.getTime()) / 86400000) + 1));
  const openStages = app.stages.filter((s) => s.kind !== 'lost');
  const funnel = openStages.map((s) => ({ name: s.name, value: filtered.leads.filter((l) => !l.archived_at && l.stage_id === s.id).length }));
  const svcName = (id: string) => app.services.find((s) => s.id === id)?.name ?? 'Outro';
  const resp = avgResponseHours(filtered.messages);
  const close = avgDaysToClose(filtered.leads);
  const uniq = (k: string) => [...new Set(data!.leads.map((l) => l[k]).filter(Boolean))].sort().map((v) => ({ value: v, label: v }));

  return (
    <div>
      <PageHeader title={`Olá, ${app.profile?.full_name?.split(' ')[0] ?? ''} 👋`} subtitle="Visão geral da operação comercial — dados reais do seu CRM." actions={control} />

      <Card className="mb-5" pad>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Field label="Origem"><Select value={flt.source} onChange={(e) => setFlt({ ...flt, source: e.target.value })} placeholder="Todas" options={uniq('source')} /></Field>
          <Field label="Serviço"><Select value={flt.service} onChange={(e) => setFlt({ ...flt, service: e.target.value })} placeholder="Todos" options={app.services.map((s) => ({ value: s.id, label: s.name }))} /></Field>
          <Field label="Responsável"><Select value={flt.owner} onChange={(e) => setFlt({ ...flt, owner: e.target.value })} placeholder="Todos" options={app.members.map((x) => ({ value: x.user_id, label: app.memberName(x.user_id) }))} /></Field>
          <Field label="Campanha"><Select value={flt.campaign} onChange={(e) => setFlt({ ...flt, campaign: e.target.value })} placeholder="Todas" options={uniq('campaign')} /></Field>
        </div>
      </Card>

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">Atenção agora</h2>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Precisam de resposta" value={num(m.needsReply)} hint="O lead escreveu por último" tone="red" icon={<MessageSquareWarning className="h-4 w-4" />} onClick={() => nav('/leads?f=responder')} />
        <Stat label="Aguardando o lead" value={num(m.waitingLead)} hint="Nós escrevemos por último" tone="amber" icon={<Hourglass className="h-4 w-4" />} onClick={() => nav('/leads?f=aguardando')} />
        <Stat label="Follow-ups vencidos" value={num(m.overdueTasks)} hint={`${m.tasksToday} para hoje`} tone="red" icon={<AlarmClock className="h-4 w-4" />} onClick={() => nav('/follow-ups')} />
        <Stat label="Sem contato 7+ dias" value={num(m.noContact7)} tone="amber" icon={<CalendarX2 className="h-4 w-4" />} onClick={() => nav('/leads?f=7')} />
        <Stat label="Sem contato 15+ dias" value={num(m.noContact15)} tone="red" icon={<CalendarX2 className="h-4 w-4" />} onClick={() => nav('/leads?f=15')} />
        <Stat label="Sem contato 30+ dias" value={num(m.noContact30)} tone="slate" icon={<CalendarX2 className="h-4 w-4" />} onClick={() => nav('/leads?f=30')} />
      </div>

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">Leads e funil</h2>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Total de leads" value={num(m.totalLeads)} hint={`${m.createdInRange} no período`} icon={<Users className="h-4 w-4" />} onClick={() => nav('/leads')} />
        <Stat label="Novos hoje" value={num(m.newToday)} hint={`${m.new7} em 7 dias · ${m.new30} em 30`} tone="blue" icon={<UserPlus className="h-4 w-4" />} />
        <Stat label="Qualificados" value={num(m.qualified)} tone="cyan" icon={<BadgeCheck className="h-4 w-4" />} onClick={() => nav('/funil')} />
        <Stat label="Propostas enviadas" value={num(m.proposalsSent)} tone="blue" icon={<Send className="h-4 w-4" />} onClick={() => nav('/funil')} />
        <Stat label="Em negociação" value={num(m.negotiating)} tone="violet" icon={<Handshake className="h-4 w-4" />} onClick={() => nav('/funil')} />
        <Stat label="Taxa de conversão" value={pct(m.conversion)} hint={`${m.wonCount} ganhos · ${m.lostCount} perdidos`} tone="green" icon={<Percent className="h-4 w-4" />} />
      </div>

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">Clientes — quem entra e quem sai</h2>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Clientes ativos" value={num(m.activeClients)} tone="green" icon={<Briefcase className="h-4 w-4" />} onClick={() => nav('/clientes')} />
        <Stat label="Entraram no período" value={num(m.clientsIn)} tone="green" icon={<LogIn className="h-4 w-4" />} onClick={() => nav('/clientes')} />
        <Stat label="Saíram no período" value={num(m.clientsOut)} tone="red" icon={<LogOut className="h-4 w-4" />} onClick={() => nav('/clientes?f=churned')} />
        <Stat label="Vendas ganhas / perdidas" value={`${m.wonCount} / ${m.lostCount}`} tone="violet" icon={<Trophy className="h-4 w-4" />} />
      </div>

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">Financeiro comercial</h2>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Receita contratada" value={brl(m.contracted)} hint={`${m.salesCount} vendas no período`} tone="green" icon={<Wallet className="h-4 w-4" />} />
        <Stat label="Recorrente mensal (MRR)" value={brl(m.mrr)} hint="Contratos ativos" tone="blue" icon={<Repeat className="h-4 w-4" />} />
        <Stat label="Recebido no período" value={brl(m.received)} hint={`A receber: ${brl(m.receivable)}`} tone="green" icon={<Banknote className="h-4 w-4" />} />
        <Stat label="Ticket médio" value={brl(m.avgTicket)} tone="cyan" icon={<Receipt className="h-4 w-4" />} />
        <Stat label="Pipeline total" value={brl(m.pipeline)} hint="Leads em aberto" tone="indigo" icon={<Layers className="h-4 w-4" />} />
        <Stat label="Pipeline ponderado" value={brl(m.weighted)} hint="× probabilidade" tone="violet" icon={<Scale className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Leads captados por dia"><AreaSeries data={seriesByDay(filtered.leads, 'created_at', days)} /></Card>
        <Card title="Leads por mês"><Bars data={seriesByMonth(filtered.leads, 'created_at')} /></Card>
        <Card title="Leads por etapa do funil"><Bars data={funnel} horizontal height={Math.max(260, funnel.length * 26)} /></Card>
        <Card title="Origem dos leads (período)"><Donut data={groupCount(filtered.leads.filter((l) => inRange(l.created_at)), (l) => l.source)} height={260} /></Card>
        <Card title="Receita por mês: contratada × recebida">
          <Bars money keys={[{ key: 'contratada', name: 'Contratada', color: '#2563EB' }, { key: 'recebida', name: 'Recebida', color: '#10B981' }]}
            data={seriesByMonth(filtered.sales, 'closed_at', saleTotal).map((x, i) => ({ ...x, contratada: x.value, recebida: seriesByMonth(filtered.payments.filter((p) => p.status === 'paid'), 'paid_at', (p) => Number(p.amount))[i].value }))} />
        </Card>
        <Card title="Vendas por serviço (período)"><Bars data={groupCount(filtered.sales.filter((s) => inRange(s.closed_at)), (s) => svcName(s.service_id))} horizontal color="#10B981" /></Card>
        <Card title="Motivos de perda (período)"><Bars data={groupCount(filtered.leads.filter((l) => l.lost_reason && inRange(l.lost_at)), (l) => l.lost_reason)} horizontal color="#EF4444" /></Card>
        <Card title="Atividades comerciais por dia"><AreaSeries data={seriesByDay(filtered.activities.filter((a) => a.type !== 'system' && a.type !== 'stage'), 'occurred_at', days)} /></Card>
        <div className="grid grid-cols-2 gap-3 lg:col-span-2">
          <Stat label="Tempo médio de resposta (WhatsApp)" value={resp === null ? '—' : resp < 1 ? `${Math.round(resp * 60)} min` : `${resp.toFixed(1).replace('.', ',')} h`} hint="Mensagem recebida → resposta enviada" icon={<Timer className="h-4 w-4" />} />
          <Stat label="Tempo médio até o fechamento" value={close === null ? '—' : `${Math.round(close)} dias`} hint="Entrada do lead → venda ganha" tone="green" icon={<XCircle className="h-4 w-4 rotate-45" />} />
        </div>
      </div>
    </div>
  );
}
