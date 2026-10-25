import type { Row } from './backend';

export interface Inactivity { attention: number; priority: number; review: number; requalify: number }
export const DEFAULT_INACTIVITY: Inactivity = { attention: 3, priority: 7, review: 15, requalify: 30 };

const DAY = 86400000;
const t = (d?: string | null) => (d ? new Date(d.length === 10 ? d + 'T12:00:00' : d).getTime() : NaN);

export function stageKind(stages: Row[], id?: string | null): string | undefined {
  return stages.find((s) => s.id === id)?.kind;
}

export function isOpenLead(lead: Row, stages: Row[]) {
  const k = stageKind(stages, lead.stage_id);
  return !lead.archived_at && k !== 'won' && k !== 'lost';
}

/** Última atividade comercial de qualquer tipo. */
export function lastActivity(l: Row): string | null {
  const c = [l.last_interaction_at, l.last_inbound_at, l.last_outbound_at, l.last_attempt_at, l.created_at].filter(Boolean) as string[];
  return c.length ? c.reduce((a, b) => (a > b ? a : b)) : null;
}

export type InactivityLevel = 'ok' | 'attention' | 'priority' | 'review' | 'requalify';
export function inactivityLevel(l: Row, cfg: Inactivity = DEFAULT_INACTIVITY, now = Date.now()): InactivityLevel {
  const last = lastActivity(l);
  if (!last) return 'ok';
  const days = (now - t(last)) / DAY;
  if (days >= cfg.requalify) return 'requalify';
  if (days >= cfg.review) return 'review';
  if (days >= cfg.priority) return 'priority';
  if (days >= cfg.attention) return 'attention';
  return 'ok';
}

/** Quem precisa de resposta da equipe: lead escreveu depois da nossa última mensagem. */
export function needsTeamReply(l: Row) {
  if (l.waiting_on === 'team') return true;
  return !!l.last_inbound_at && (!l.last_outbound_at || l.last_inbound_at > l.last_outbound_at);
}
export function waitingLead(l: Row) {
  if (needsTeamReply(l)) return false;
  return l.waiting_on === 'lead' || (!!l.last_outbound_at && (!l.last_inbound_at || l.last_outbound_at > l.last_inbound_at));
}

export interface DashboardInput {
  leads: Row[]; stages: Row[]; sales: Row[]; payments: Row[]; tasks: Row[]; clients: Row[];
  inactivity?: Inactivity; now?: Date; from?: Date; to?: Date;
}

export function saleTotal(s: Row) {
  return Math.max(0, Number(s.setup_value ?? 0) + Number(s.monthly_value ?? 0) * Number(s.duration_months ?? 1) - Number(s.discount ?? 0));
}

export function computeDashboard(i: DashboardInput) {
  const now = i.now ?? new Date();
  const N = now.getTime();
  const from = i.from ?? new Date(now.getFullYear(), now.getMonth(), 1);
  const to = i.to ?? now;
  const inRange = (d?: string | null) => { const x = t(d); return x >= from.getTime() && x <= to.getTime() + DAY; };
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const cfg = i.inactivity ?? DEFAULT_INACTIVITY;

  const leads = i.leads.filter((l) => !l.archived_at);
  const open = leads.filter((l) => isOpenLead(l, i.stages));
  const kindOf = (l: Row) => stageKind(i.stages, l.stage_id);
  const nameOf = (l: Row) => i.stages.find((s) => s.id === l.stage_id)?.name ?? '';
  const prob = (l: Row) => (l.probability ?? i.stages.find((s) => s.id === l.stage_id)?.probability ?? 0) / 100;
  const since = (l: Row) => { const a = lastActivity(l); return a ? (N - t(a)) / DAY : 0; };

  const salesInRange = i.sales.filter((s) => inRange(s.closed_at) && s.contract_status !== 'canceled');
  const wonInRange = leads.filter((l) => kindOf(l) === 'won' && inRange(l.won_at));
  const lostInRange = leads.filter((l) => kindOf(l) === 'lost' && inRange(l.lost_at));
  const createdInRange = leads.filter((l) => inRange(l.created_at));
  const activeSales = i.sales.filter((s) => ['signed', 'active', 'pending'].includes(s.contract_status));

  const contracted = salesInRange.reduce((a, s) => a + saleTotal(s), 0);
  const mrr = activeSales.reduce((a, s) => a + Number(s.monthly_value ?? 0), 0);
  const received = i.payments.filter((p) => p.status === 'paid' && inRange(p.paid_at)).reduce((a, p) => a + Number(p.amount), 0);
  const receivable = i.payments.filter((p) => p.status === 'pending' || p.status === 'overdue').reduce((a, p) => a + Number(p.amount), 0);
  const closedCount = wonInRange.length + lostInRange.length;

  const activeClients = i.clients.filter((c) => c.status === 'active');
  return {
    totalLeads: leads.length,
    newToday: leads.filter((l) => t(l.created_at) >= startToday).length,
    new7: leads.filter((l) => N - t(l.created_at) <= 7 * DAY).length,
    new30: leads.filter((l) => N - t(l.created_at) <= 30 * DAY).length,
    createdInRange: createdInRange.length,
    needsReply: open.filter(needsTeamReply).length,
    waitingLead: open.filter(waitingLead).length,
    qualified: open.filter((l) => /qualificad/i.test(nameOf(l))).length,
    negotiating: open.filter((l) => /negocia/i.test(nameOf(l))).length,
    proposalsSent: open.filter((l) => /proposta enviada/i.test(nameOf(l))).length,
    overdueTasks: i.tasks.filter((x) => x.status === 'open' && t(x.due_at) < N).length,
    tasksToday: i.tasks.filter((x) => x.status === 'open' && t(x.due_at) >= startToday && t(x.due_at) < startToday + DAY).length,
    noContact7: open.filter((l) => since(l) >= 7).length,
    noContact15: open.filter((l) => since(l) >= 15).length,
    noContact30: open.filter((l) => since(l) >= 30).length,
    inactive: open.filter((l) => inactivityLevel(l, cfg, N) !== 'ok').length,
    wonCount: wonInRange.length,
    lostCount: lostInRange.length,
    salesCount: salesInRange.length,
    contracted,
    mrr,
    received,
    receivable,
    avgTicket: salesInRange.length ? contracted / salesInRange.length : 0,
    conversion: closedCount ? (wonInRange.length / closedCount) * 100 : 0,
    pipeline: open.reduce((a, l) => a + Number(l.potential_value ?? 0), 0),
    weighted: open.reduce((a, l) => a + Number(l.potential_value ?? 0) * prob(l), 0),
    activeClients: activeClients.length,
    clientsIn: i.clients.filter((c) => inRange(c.started_at)).length,
    clientsOut: i.clients.filter((c) => c.status === 'churned' && inRange(c.churned_at)).length,
  };
}

export function groupCount<T>(rows: T[], key: (r: T) => string | null | undefined) {
  const m = new Map<string, number>();
  for (const r of rows) { const k = key(r) || 'Não informado'; m.set(k, (m.get(k) ?? 0) + 1); }
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function seriesByDay(rows: Row[], field: string, days = 30, now = new Date()) {
  const out: { name: string; value: number }[] = [];
  for (let d = days - 1; d >= 0; d--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d);
    const k = day.toISOString().slice(0, 10);
    out.push({ name: day.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), value: rows.filter((r) => (r[field] ?? '').slice(0, 10) === k).length });
  }
  return out;
}

export function seriesByMonth(rows: Row[], field: string, valueFn: (r: Row) => number = () => 1, months = 6, now = new Date()) {
  const out: { name: string; value: number }[] = [];
  for (let m = months - 1; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const k = d.toISOString().slice(0, 7);
    out.push({ name: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), value: rows.filter((r) => (r[field] ?? '').slice(0, 7) === k).reduce((a, r) => a + valueFn(r), 0) });
  }
  return out;
}

/** Tempo médio (horas) entre mensagem recebida e próxima resposta enviada, por conversa. */
export function avgResponseHours(messages: Row[]) {
  const byConv = new Map<string, Row[]>();
  for (const m of messages) { const a = byConv.get(m.conversation_id) ?? []; a.push(m); byConv.set(m.conversation_id, a); }
  const diffs: number[] = [];
  for (const list of byConv.values()) {
    list.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
    let pending: string | null = null;
    for (const m of list) {
      if (m.direction === 'inbound' && !pending) pending = m.created_at;
      if (m.direction === 'outbound' && pending && m.status !== 'failed') { diffs.push((t(m.created_at) - t(pending)) / 3600000); pending = null; }
    }
  }
  return diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : null;
}

export function avgDaysToClose(leads: Row[]) {
  const d = leads.filter((l) => l.won_at && l.created_at).map((l) => (t(l.won_at) - t(l.created_at)) / DAY);
  return d.length ? d.reduce((a, b) => a + b, 0) / d.length : null;
}
