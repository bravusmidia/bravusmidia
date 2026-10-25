import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Archive, ArchiveRestore, MessageCircle, Phone, Mail, Globe, AtSign, Pencil, Plus, ShieldCheck, ShieldOff, Trash2, ExternalLink, CalendarPlus, CheckCircle2 } from 'lucide-react';
import { db, type Row } from '../lib/backend';
import { useApp } from '../lib/session';
import { normalizePhone, formatPhone, whatsappLink } from '../lib/phone';
import { brl, date, dateTime, fromLocalInput, relative, toLocalInput, todayISO } from '../lib/format';
import { inactivityLevel, needsTeamReply, waitingLead, lastActivity } from '../lib/metrics';
import { Alert, Badge, Button, Card, Confirm, Drawer, Field, Input, Modal, Select, Tabs, Textarea, useAction } from './ui';

export const SOURCES = ['Meta Ads', 'Instagram', 'Facebook', 'Google', 'Indicação', 'Site', 'WhatsApp (entrada)', 'Prospecção ativa', 'Evento', 'Importação', 'Outro'];
export const LOST_REASONS = ['Preço', 'Sem resposta', 'Concorrência', 'Sem orçamento', 'Sem interesse', 'Momento inadequado', 'Outro'];
export const TASK_TYPES: Record<string, string> = { call: 'Ligação', message: 'Mensagem', meeting: 'Reunião', proposal: 'Enviar proposta', review: 'Revisão comercial', follow_up: 'Follow-up', qualification: 'Qualificação' };
export const PRIORITY: Record<string, [string, string]> = { low: ['Baixa', 'slate'], normal: ['Normal', 'blue'], high: ['Alta', 'amber'], urgent: ['Urgente', 'red'] };
export const TEMP: Record<string, [string, string]> = { frio: ['Frio', 'sky'], morno: ['Morno', 'amber'], quente: ['Quente', 'red'] };
export const INACT: Record<string, [string, string]> = { attention: ['3+ dias sem atividade', 'amber'], priority: ['Follow-up prioritário', 'red'], review: ['Revisão comercial', 'red'], requalify: ['Requalificar / nutrir', 'slate'] };

export function StageBadge({ stageId }: { stageId?: string | null }) {
  const { stages } = useApp();
  const s = stages.find((x) => x.id === stageId);
  if (!s) return <Badge>Sem etapa</Badge>;
  return <Badge tone={s.color} dot>{s.name}</Badge>;
}

export function LeadStatusBadges({ lead }: { lead: Row }) {
  const { inactivity } = useApp();
  const lvl = inactivityLevel(lead, inactivity);
  return (
    <span className="flex flex-wrap gap-1">
      {needsTeamReply(lead) && <Badge tone="red" dot>Responder</Badge>}
      {waitingLead(lead) && <Badge tone="amber" dot>Aguardando lead</Badge>}
      {lvl !== 'ok' && <Badge tone={INACT[lvl][1]}>{INACT[lvl][0]}</Badge>}
      {lead.opted_out && <Badge tone="slate">Opt-out</Badge>}
    </span>
  );
}

/* ---------------- formulário de lead ---------------- */
const EMPTY: Row = { full_name: '', company: '', phone_original: '', email: '', website: '', instagram: '', facebook: '', city: 'Fortaleza', state: 'CE', segment: '', service_id: '', source: '', campaign: '', temperature: '', potential_value: '', probability: '', next_action: '', next_follow_up_at: '', notes: '', tags: '' };

export function LeadForm({ open, onClose, lead, onSaved }: { open: boolean; onClose: () => void; lead?: Row | null; onSaved: (l: Row) => void }) {
  const app = useApp();
  const { run, busy } = useAction();
  const [f, setF] = useState<Row>(EMPTY);
  const [dupes, setDupes] = useState<Row[]>([]);
  useEffect(() => {
    if (!open) return;
    setDupes([]);
    setF(lead ? { ...EMPTY, ...lead, tags: (lead.tags ?? []).join(', '), next_follow_up_at: toLocalInput(lead.next_follow_up_at), service_id: lead.service_id ?? '', potential_value: lead.potential_value ?? '', probability: lead.probability ?? '' }
      : { ...EMPTY, owner_id: app.userId, stage_id: app.stages[0]?.id ?? '' });
  }, [open, lead]); // eslint-disable-line
  const set = (k: string) => (e: any) => setF((x) => ({ ...x, [k]: e.target.value }));
  const phone = normalizePhone(f.phone_original);

  const save = async (force = false) => {
    if (!f.full_name.trim()) throw new Error('Informe o nome.');
    if (f.phone_original && !phone.valid) throw new Error('Telefone inválido. Use DDD + número (ex.: 85 99999-9999) ou formato internacional.');
    if (f.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) throw new Error('E-mail inválido.');
    if (!force) {
      const all = await db.list('leads', { eq: { org_id: app.orgId } });
      const d = all.filter((x) => x.id !== lead?.id && ((phone.e164 && x.phone_e164 === phone.e164) || (f.email && x.email?.toLowerCase() === f.email.toLowerCase())));
      if (d.length) { setDupes(d); return null; }
    }
    const row: Row = {
      full_name: f.full_name.trim(), company: f.company || null, phone_original: f.phone_original || null, phone_e164: phone.e164, phone_valid: phone.valid,
      whatsapp: phone.e164, email: f.email?.trim().toLowerCase() || null, website: f.website || null, instagram: f.instagram || null, facebook: f.facebook || null,
      city: f.city || null, state: (f.state || '').toUpperCase().slice(0, 2) || null, segment: f.segment || null, service_id: f.service_id || null,
      source: f.source || null, campaign: f.campaign || null, temperature: f.temperature || null, potential_value: Number(f.potential_value || 0),
      probability: f.probability === '' ? null : Math.min(100, Math.max(0, Number(f.probability))), next_action: f.next_action || null,
      next_follow_up_at: fromLocalInput(f.next_follow_up_at), notes: f.notes || null, owner_id: f.owner_id || null,
      tags: String(f.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean).slice(0, 15),
    };
    if (lead) return db.update('leads', lead.id, row);
    const [created] = await db.insert('leads', { ...row, org_id: app.orgId, stage_id: f.stage_id || app.stages[0]?.id });
    return created;
  };

  const submit = async (force = false) => {
    const r = await run(() => save(force), lead ? 'Lead atualizado' : 'Lead cadastrado');
    if (r) { onSaved(r); onClose(); }
  };

  return (
    <Modal open={open} onClose={onClose} title={lead ? 'Editar lead' : 'Novo lead'} wide
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={() => submit(false)}>Salvar</Button></>}>
      {dupes.length > 0 && (
        <Alert tone="warn" className="mb-4">
          <b>Possível duplicado:</b> já existe {dupes.map((d) => `${d.full_name}${d.company ? ' (' + d.company + ')' : ''}`).join(', ')} com o mesmo telefone ou e-mail.
          <div className="mt-2 flex gap-2"><Link to={`/leads?id=${dupes[0].id}`} onClick={onClose}><Button size="sm" variant="secondary">Abrir existente</Button></Link><Button size="sm" variant="ghost" onClick={() => submit(true)}>Salvar mesmo assim</Button></div>
        </Alert>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome completo" required><Input value={f.full_name} onChange={set('full_name')} maxLength={160} /></Field>
        <Field label="Empresa"><Input value={f.company ?? ''} onChange={set('company')} /></Field>
        <Field label="Telefone / WhatsApp" hint={f.phone_original ? (phone.valid ? `Normalizado: ${phone.e164}` : 'Número inválido') : 'Número válido não garante que exista WhatsApp.'}><Input value={f.phone_original ?? ''} onChange={set('phone_original')} inputMode="tel" placeholder="(85) 99999-9999" /></Field>
        <Field label="E-mail"><Input type="email" value={f.email ?? ''} onChange={set('email')} /></Field>
        <Field label="Serviço de interesse"><Select value={f.service_id ?? ''} onChange={set('service_id')} placeholder="Selecione" options={app.services.filter((s) => s.active).map((s) => ({ value: s.id, label: s.name }))} /></Field>
        <Field label="Origem"><Select value={f.source ?? ''} onChange={set('source')} placeholder="Selecione" options={SOURCES.map((s) => ({ value: s, label: s }))} /></Field>
        <Field label="Campanha"><Input value={f.campaign ?? ''} onChange={set('campaign')} /></Field>
        <Field label="Segmento"><Input value={f.segment ?? ''} onChange={set('segment')} placeholder="Ex.: Odontologia" /></Field>
        {!lead && <Field label="Etapa inicial"><Select value={f.stage_id ?? ''} onChange={set('stage_id')} options={app.stages.filter((s) => !['won', 'lost'].includes(s.kind)).map((s) => ({ value: s.id, label: s.name }))} /></Field>}
        <Field label="Responsável"><Select value={f.owner_id ?? ''} onChange={set('owner_id')} placeholder="Sem responsável" options={app.members.filter((m) => m.active).map((m) => ({ value: m.user_id, label: app.memberName(m.user_id) }))} /></Field>
        <Field label="Temperatura"><Select value={f.temperature ?? ''} onChange={set('temperature')} placeholder="—" options={Object.entries(TEMP).map(([v, [l]]) => ({ value: v, label: l }))} /></Field>
        <Field label="Potencial financeiro (R$)"><Input type="number" min={0} step="0.01" value={f.potential_value} onChange={set('potential_value')} /></Field>
        <Field label="Probabilidade (%)" hint="Vazio = usa a da etapa"><Input type="number" min={0} max={100} value={f.probability} onChange={set('probability')} /></Field>
        <Field label="Próximo follow-up"><Input type="datetime-local" value={f.next_follow_up_at} onChange={set('next_follow_up_at')} /></Field>
        <Field label="Próxima ação" className="sm:col-span-2"><Input value={f.next_action ?? ''} onChange={set('next_action')} placeholder="Ex.: enviar diagnóstico da conta de anúncios" /></Field>
        <Field label="Cidade"><Input value={f.city ?? ''} onChange={set('city')} /></Field>
        <Field label="UF"><Input value={f.state ?? ''} onChange={set('state')} maxLength={2} /></Field>
        <Field label="Site"><Input value={f.website ?? ''} onChange={set('website')} /></Field>
        <Field label="Instagram"><Input value={f.instagram ?? ''} onChange={set('instagram')} placeholder="@perfil" /></Field>
        <Field label="Facebook"><Input value={f.facebook ?? ''} onChange={set('facebook')} /></Field>
        <Field label="Etiquetas" hint="Separe por vírgula"><Input value={f.tags} onChange={set('tags')} /></Field>
        <Field label="Observações comerciais" className="sm:col-span-2"><Textarea value={f.notes ?? ''} onChange={set('notes')} /></Field>
      </div>
    </Modal>
  );
}

/* ---------------- mover etapa (com regras de ganho/perda) ---------------- */
export function useStageMover(onDone: () => void) {
  const app = useApp();
  const { run } = useAction();
  const [pending, setPending] = useState<{ lead: Row; stage: Row } | null>(null);

  const move = async (lead: Row, stageId: string) => {
    if (!app.can.write || lead.stage_id === stageId) return;
    const stage = app.stages.find((s) => s.id === stageId);
    if (!stage) return;
    if (stage.kind === 'won' || stage.kind === 'lost') { setPending({ lead, stage }); return; }
    const ok = await run(() => db.update('leads', lead.id, { stage_id: stageId }), `Movido para ${stage.name}`);
    if (ok) onDone();
  };

  const modal = pending && (pending.stage.kind === 'won'
    ? <WonModal lead={pending.lead} stage={pending.stage} onClose={() => setPending(null)} onDone={() => { setPending(null); onDone(); }} />
    : <LostModal lead={pending.lead} stage={pending.stage} onClose={() => setPending(null)} onDone={() => { setPending(null); onDone(); }} />);
  return { move, modal };
}

function WonModal({ lead, stage, onClose, onDone }: { lead: Row; stage: Row; onClose: () => void; onDone: () => void }) {
  const app = useApp();
  const { run, busy } = useAction();
  const svc = app.services.find((s) => s.id === lead.service_id);
  const [f, setF] = useState<Row>({ service_id: lead.service_id ?? '', setup_value: svc?.setup_price || '', monthly_value: svc?.monthly_price || lead.potential_value || '', discount: '', closed_at: todayISO(), duration_months: svc?.recurring ? 6 : '', start_date: todayISO() });
  const set = (k: string) => (e: any) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = () => run(async () => {
    if (!f.service_id) throw new Error('Selecione o serviço vendido.');
    if (Number(f.setup_value || 0) + Number(f.monthly_value || 0) <= 0) throw new Error('Informe o valor da venda.');
    if (!f.closed_at) throw new Error('Informe a data de fechamento.');
    await db.insert('sales', { org_id: app.orgId, lead_id: lead.id, service_id: f.service_id, setup_value: Number(f.setup_value || 0), monthly_value: Number(f.monthly_value || 0), discount: Number(f.discount || 0), closed_at: f.closed_at, start_date: f.start_date || null, duration_months: f.duration_months ? Number(f.duration_months) : null, contract_status: 'pending', owner_id: lead.owner_id ?? app.userId });
    await db.update('leads', lead.id, { stage_id: stage.id });
  }, 'Venda registrada! 🎉').then((r) => r !== undefined && onDone());
  return (
    <Modal open onClose={onClose} title={`Registrar venda — ${lead.full_name}`} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={save}>Registrar venda ganha</Button></>}>
      <Alert tone="info" className="mb-3">Para marcar como <b>ganho</b>, registre o serviço vendido, o valor e a data. O cliente é criado automaticamente.</Alert>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Serviço vendido" required className="sm:col-span-2"><Select value={f.service_id} onChange={set('service_id')} placeholder="Selecione" options={app.services.map((s) => ({ value: s.id, label: s.name }))} /></Field>
        <Field label="Implantação (R$)"><Input type="number" min={0} value={f.setup_value} onChange={set('setup_value')} /></Field>
        <Field label="Mensalidade (R$)"><Input type="number" min={0} value={f.monthly_value} onChange={set('monthly_value')} /></Field>
        <Field label="Desconto (R$)"><Input type="number" min={0} value={f.discount} onChange={set('discount')} /></Field>
        <Field label="Duração (meses)"><Input type="number" min={1} value={f.duration_months} onChange={set('duration_months')} /></Field>
        <Field label="Data de fechamento" required><Input type="date" value={f.closed_at} onChange={set('closed_at')} /></Field>
        <Field label="Início do serviço"><Input type="date" value={f.start_date} onChange={set('start_date')} /></Field>
      </div>
    </Modal>
  );
}

function LostModal({ lead, stage, onClose, onDone }: { lead: Row; stage: Row; onClose: () => void; onDone: () => void }) {
  const { run, busy } = useAction();
  const [reason, setReason] = useState('');
  const [other, setOther] = useState('');
  const save = () => run(async () => {
    const r = reason === 'Outro' ? other.trim() : reason;
    if (!r) throw new Error('Informe o motivo da perda.');
    await db.update('leads', lead.id, { stage_id: stage.id, lost_reason: r });
  }, 'Registrado como perdido').then((x) => x !== undefined && onDone());
  return (
    <Modal open onClose={onClose} title={`Venda perdida — ${lead.full_name}`} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="danger" loading={busy} onClick={save}>Confirmar perda</Button></>}>
      <Field label="Motivo da perda" required><Select value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Selecione" options={LOST_REASONS.map((r) => ({ value: r, label: r }))} /></Field>
      {reason === 'Outro' && <Field label="Descreva" className="mt-3"><Input value={other} onChange={(e) => setOther(e.target.value)} /></Field>}
    </Modal>
  );
}

/* ---------------- tarefa ---------------- */
export function TaskForm({ open, onClose, leadId, task, onSaved }: { open: boolean; onClose: () => void; leadId?: string | null; task?: Row | null; onSaved: () => void }) {
  const app = useApp();
  const { run, busy } = useAction();
  const [leads, setLeads] = useState<Row[]>([]);
  const [f, setF] = useState<Row>({});
  useEffect(() => {
    if (!open) return;
    const due = new Date(Date.now() + 86400000); due.setHours(10, 0, 0, 0);
    setF(task ? { ...task, due_at: toLocalInput(task.due_at) } : { lead_id: leadId ?? '', type: 'follow_up', title: '', priority: 'normal', due_at: toLocalInput(due.toISOString()), assignee_id: app.userId, notes: '' });
    if (!leadId) db.list('leads', { eq: { org_id: app.orgId }, is: { archived_at: null }, order: ['full_name'] }).then(setLeads).catch(() => {});
  }, [open]); // eslint-disable-line
  const set = (k: string) => (e: any) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = () => run(async () => {
    if (!f.due_at) throw new Error('Informe data e hora.');
    const row = { lead_id: f.lead_id || null, type: f.type, title: f.title?.trim() || TASK_TYPES[f.type], priority: f.priority, due_at: fromLocalInput(f.due_at), assignee_id: f.assignee_id || null, notes: f.notes || null };
    if (task) await db.update('tasks', task.id, row); else await db.insert('tasks', { ...row, org_id: app.orgId, status: 'open' });
    if (row.lead_id && !task) await db.update('leads', row.lead_id, { next_follow_up_at: row.due_at, next_action: row.title });
  }, 'Tarefa salva').then((r) => { if (r !== undefined) { onSaved(); onClose(); } });
  return (
    <Modal open={open} onClose={onClose} title={task ? 'Editar tarefa' : 'Nova tarefa de follow-up'} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={save}>Salvar</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {!leadId && <Field label="Lead" className="sm:col-span-2"><Select value={f.lead_id ?? ''} onChange={set('lead_id')} placeholder="Sem lead (tarefa interna)" options={leads.map((l) => ({ value: l.id, label: `${l.full_name}${l.company ? ' — ' + l.company : ''}` }))} /></Field>}
        <Field label="Tipo"><Select value={f.type ?? 'follow_up'} onChange={set('type')} options={Object.entries(TASK_TYPES).map(([v, l]) => ({ value: v, label: l }))} /></Field>
        <Field label="Prioridade"><Select value={f.priority ?? 'normal'} onChange={set('priority')} options={Object.entries(PRIORITY).map(([v, [l]]) => ({ value: v, label: l }))} /></Field>
        <Field label="Título" className="sm:col-span-2"><Input value={f.title ?? ''} onChange={set('title')} placeholder={TASK_TYPES[f.type ?? 'follow_up']} /></Field>
        <Field label="Data e hora" required><Input type="datetime-local" value={f.due_at ?? ''} onChange={set('due_at')} /></Field>
        <Field label="Responsável"><Select value={f.assignee_id ?? ''} onChange={set('assignee_id')} placeholder="—" options={app.members.filter((m) => m.active).map((m) => ({ value: m.user_id, label: app.memberName(m.user_id) }))} /></Field>
        <Field label="Observação" className="sm:col-span-2"><Textarea value={f.notes ?? ''} onChange={set('notes')} /></Field>
      </div>
    </Modal>
  );
}

/* ---------------- ficha completa do lead ---------------- */
export function LeadDrawer({ leadId, onClose, onChanged }: { leadId: string | null; onClose: () => void; onChanged: () => void }) {
  const app = useApp();
  const { run, busy } = useAction();
  const [lead, setLead] = useState<Row | null>(null);
  const [tab, setTab] = useState('resumo');
  const [acts, setActs] = useState<Row[]>([]);
  const [tasks, setTasks] = useState<Row[]>([]);
  const [sales, setSales] = useState<Row[]>([]);
  const [consents, setConsents] = useState<Row[]>([]);
  const [edit, setEdit] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [note, setNote] = useState({ type: 'note', direction: 'outbound', summary: '' });
  const [consentOpen, setConsentOpen] = useState(false);
  const [del, setDel] = useState(false);

  const load = async () => {
    if (!leadId) return;
    const [l, a, t, s, c] = await Promise.all([
      db.get('leads', leadId), db.list('activities', { eq: { lead_id: leadId }, order: ['occurred_at', false] }),
      db.list('tasks', { eq: { lead_id: leadId }, order: ['due_at', false] }), db.list('sales', { eq: { lead_id: leadId } }),
      db.list('consents', { eq: { lead_id: leadId }, order: ['recorded_at', false] }),
    ]);
    setLead(l); setActs(a); setTasks(t); setSales(s); setConsents(c);
  };
  useEffect(() => { setTab('resumo'); load().catch(() => {}); }, [leadId]); // eslint-disable-line
  const refresh = async () => { await load(); onChanged(); };
  const mover = useStageMover(refresh);
  if (!leadId) return null;
  if (!lead) return <Drawer open onClose={onClose} title="Carregando…"><div /></Drawer>;

  const wa = whatsappLink(lead.phone_e164);
  const addNote = () => run(async () => {
    if (!note.summary.trim()) throw new Error('Escreva o registro.');
    await db.insert('activities', { org_id: app.orgId, lead_id: lead.id, type: note.type, direction: ['call', 'message', 'email', 'attempt'].includes(note.type) ? note.direction : null, summary: note.summary.trim(), occurred_at: new Date().toISOString() });
    if (note.type === 'message' || note.type === 'call' || note.type === 'attempt') await db.update('leads', lead.id, note.direction === 'inbound' ? { last_inbound_at: new Date().toISOString(), waiting_on: 'team' } : { last_outbound_at: new Date().toISOString(), waiting_on: 'lead' });
    setNote({ ...note, summary: '' });
  }, 'Registro adicionado').then(refresh);

  const Info = ({ label, children }: { label: string; children: ReactNode }) => (
    <div className="min-w-0"><div className="text-[11px] font-medium text-ink-soft">{label}</div><div className="truncate text-sm text-ink dark:text-slate-100">{children || '—'}</div></div>
  );

  return (
    <Drawer open onClose={onClose} title={lead.full_name}
      subtitle={<div className="flex flex-wrap items-center gap-1.5"><span className="text-sm text-ink-soft">{lead.company}</span><StageBadge stageId={lead.stage_id} /><LeadStatusBadges lead={lead} />{lead.archived_at && <Badge>Arquivado</Badge>}</div>}>
      <div className="mb-4 flex flex-wrap gap-2">
        {app.can.write && <Button size="sm" variant="secondary" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEdit(true)}>Editar</Button>}
        {app.can.write && <Button size="sm" variant="secondary" icon={<CalendarPlus className="h-3.5 w-3.5" />} onClick={() => setTaskOpen(true)}>Tarefa</Button>}
        {wa && !lead.opted_out && <a href={wa} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="secondary" icon={<MessageCircle className="h-3.5 w-3.5" />}>Abrir no WhatsApp</Button></a>}
        <Link to={`/caixa-de-entrada?lead=${lead.id}`}><Button size="sm" variant="secondary" icon={<ExternalLink className="h-3.5 w-3.5" />}>Conversa no CRM</Button></Link>
        {app.can.write && (lead.archived_at
          ? <Button size="sm" variant="ghost" icon={<ArchiveRestore className="h-3.5 w-3.5" />} onClick={() => run(() => db.update('leads', lead.id, { archived_at: null }), 'Lead restaurado').then(refresh)}>Restaurar</Button>
          : <Button size="sm" variant="ghost" icon={<Archive className="h-3.5 w-3.5" />} onClick={() => run(() => db.update('leads', lead.id, { archived_at: new Date().toISOString() }), 'Lead arquivado').then(refresh)}>Arquivar</Button>)}
        {app.can.manage && <Button size="sm" variant="ghost" className="text-red-600" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setDel(true)}>Excluir</Button>}
      </div>
      {wa && <p className="-mt-2 mb-4 text-[11px] text-ink-soft">“Abrir no WhatsApp” só abre o app com o número — não sincroniza mensagens com o CRM.</p>}

      <Card className="mb-4" pad>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="text-xs font-medium text-ink-soft">Etapa do funil</span>
          <Select className="sm:max-w-xs" disabled={!app.can.write} value={lead.stage_id ?? ''} onChange={(e) => mover.move(lead, e.target.value)} options={app.stages.map((s) => ({ value: s.id, label: s.name }))} />
          {lead.lost_reason && <Badge tone="red">Motivo: {lead.lost_reason}</Badge>}
        </div>
      </Card>

      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'resumo', label: 'Resumo' }, { value: 'historico', label: 'Histórico', count: acts.length }, { value: 'tarefas', label: 'Tarefas', count: tasks.filter((t) => t.status === 'open').length }, { value: 'consentimento', label: 'Consentimento' }, { value: 'vendas', label: 'Vendas', count: sales.length }]} />

      {tab === 'resumo' && (
        <div className="space-y-4">
          <Card><div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Info label="Telefone">{lead.phone_e164 ? <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{formatPhone(lead.phone_e164)}</span> : lead.phone_original}</Info>
            <Info label="E-mail">{lead.email && <a className="flex items-center gap-1 text-brand-600" href={`mailto:${lead.email}`}><Mail className="h-3 w-3" />{lead.email}</a>}</Info>
            <Info label="Cidade">{[lead.city, lead.state].filter(Boolean).join(' / ')}</Info>
            <Info label="Serviço de interesse">{app.services.find((s) => s.id === lead.service_id)?.name}</Info>
            <Info label="Origem">{lead.source}</Info>
            <Info label="Campanha">{lead.campaign}</Info>
            <Info label="Responsável">{app.memberName(lead.owner_id)}</Info>
            <Info label="Temperatura">{lead.temperature && <Badge tone={TEMP[lead.temperature][1]}>{TEMP[lead.temperature][0]}</Badge>}</Info>
            <Info label="Potencial">{brl(lead.potential_value)}</Info>
            <Info label="Segmento">{lead.segment}</Info>
            <Info label="Site">{lead.website && <a className="flex items-center gap-1 text-brand-600" href={/^https?:/.test(lead.website) ? lead.website : 'https://' + lead.website} target="_blank" rel="noopener noreferrer"><Globe className="h-3 w-3" />{lead.website}</a>}</Info>
            <Info label="Instagram">{lead.instagram && <span className="flex items-center gap-1"><AtSign className="h-3 w-3" />{lead.instagram}</span>}</Info>
            <Info label="Entrada">{date(lead.entered_at ?? lead.created_at)}</Info>
            <Info label="Próximo follow-up">{dateTime(lead.next_follow_up_at)}</Info>
            <Info label="Próxima ação">{lead.next_action}</Info>
          </div></Card>
          <Card title="Tempos de contato"><div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Info label="Última mensagem recebida">{relative(lead.last_inbound_at)}</Info>
            <Info label="Última mensagem enviada">{relative(lead.last_outbound_at)}</Info>
            <Info label="Última tentativa de contato">{relative(lead.last_attempt_at)}</Info>
            <Info label="Qualquer atividade">{relative(lastActivity(lead))}</Info>
          </div></Card>
          {(lead.tags?.length > 0 || lead.notes) && <Card>{lead.tags?.length > 0 && <div className="mb-2 flex flex-wrap gap-1">{lead.tags.map((t: string) => <Badge key={t} tone="blue">{t}</Badge>)}</div>}{lead.notes && <p className="whitespace-pre-wrap text-sm">{lead.notes}</p>}</Card>}
        </div>
      )}

      {tab === 'historico' && (
        <div className="space-y-4">
          {app.can.write && <Card>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
              <Select value={note.type} onChange={(e) => setNote({ ...note, type: e.target.value })} options={[['note', 'Anotação'], ['call', 'Ligação'], ['message', 'Mensagem'], ['email', 'E-mail'], ['meeting', 'Reunião'], ['attempt', 'Tentativa sem sucesso']].map(([v, l]) => ({ value: v, label: l }))} />
              {['call', 'message', 'email'].includes(note.type) ? <Select value={note.direction} onChange={(e) => setNote({ ...note, direction: e.target.value })} options={[{ value: 'outbound', label: 'Nós → lead' }, { value: 'inbound', label: 'Lead → nós' }]} /> : <div />}
            </div>
            <Textarea className="mt-2" value={note.summary} onChange={(e) => setNote({ ...note, summary: e.target.value })} placeholder="O que aconteceu?" />
            <div className="mt-2 flex justify-end"><Button size="sm" loading={busy} onClick={addNote} icon={<Plus className="h-3.5 w-3.5" />}>Registrar</Button></div>
          </Card>}
          <ol className="relative space-y-3 border-l border-line pl-4 dark:border-white/10">
            {acts.map((a) => (
              <li key={a.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-500 ring-4 ring-canvas dark:ring-navy-900" />
                <div className="text-xs text-ink-soft">{dateTime(a.occurred_at)} · {({ note: 'Anotação', call: 'Ligação', message: 'Mensagem', email: 'E-mail', meeting: 'Reunião', proposal: 'Proposta', stage: 'Etapa', system: 'Sistema', attempt: 'Tentativa' } as Row)[a.type]}{a.direction === 'inbound' ? ' recebida' : a.direction === 'outbound' ? ' enviada' : ''}{a.created_by ? ` · ${app.memberName(a.created_by)}` : ''}</div>
                <div className="whitespace-pre-wrap text-sm">{a.summary}</div>
              </li>
            ))}
            {acts.length === 0 && <p className="text-sm text-ink-soft">Sem histórico ainda.</p>}
          </ol>
        </div>
      )}

      {tab === 'tarefas' && (
        <div className="space-y-2">
          {tasks.map((t) => <TaskRow key={t.id} t={t} onChange={refresh} />)}
          {tasks.length === 0 && <p className="text-sm text-ink-soft">Nenhuma tarefa.</p>}
        </div>
      )}

      {tab === 'consentimento' && (
        <div className="space-y-3">
          <Alert tone={lead.consent_status === 'granted' ? 'ok' : lead.consent_status === 'revoked' ? 'error' : 'warn'}>
            {lead.consent_status === 'granted' && <>Consentimento registrado ({lead.consent_source}, {date(lead.consent_at)}). Pode receber modelos aprovados fora da janela de 24h.</>}
            {lead.consent_status === 'revoked' && <>Opt-out: este contato pediu para não receber mensagens. Envios bloqueados.</>}
            {lead.consent_status === 'unknown' && <>Sem consentimento documentado. Cadastrar o telefone <b>não</b> é consentimento. Só responda quando o contato escrever (janela de 24h).</>}
          </Alert>
          {app.can.write && <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon={<ShieldCheck className="h-3.5 w-3.5" />} onClick={() => setConsentOpen(true)}>Registrar consentimento</Button>
            {!lead.opted_out && <Button size="sm" variant="ghost" className="text-red-600" icon={<ShieldOff className="h-3.5 w-3.5" />} onClick={() => run(async () => { await db.insert('consents', { org_id: app.orgId, lead_id: lead.id, status: 'revoked', purpose: 'all', source: 'Registrado manualmente', recorded_by: app.userId }); if (lead.phone_e164) await db.insert('suppression_list', { org_id: app.orgId, phone_e164: lead.phone_e164, reason: 'opt_out', source: 'manual' }).catch(() => {}); }, 'Opt-out registrado').then(refresh)}>Registrar opt-out</Button>}
          </div>}
          <div className="space-y-2">{consents.map((c) => <div key={c.id} className="rounded-lg border border-line p-2 text-sm dark:border-white/10"><Badge tone={c.status === 'granted' ? 'green' : 'red'}>{c.status === 'granted' ? 'Concedido' : 'Revogado'}</Badge> <span className="ml-1">{c.source}</span> <span className="text-xs text-ink-soft">· {dateTime(c.recorded_at)}{c.evidence ? ` · ${c.evidence}` : ''}</span></div>)}</div>
          <ConsentModal open={consentOpen} onClose={() => setConsentOpen(false)} lead={lead} onSaved={refresh} />
        </div>
      )}

      {tab === 'vendas' && (
        <div className="space-y-2">
          {sales.map((s) => <Card key={s.id}><div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="font-medium">{app.services.find((x) => x.id === s.service_id)?.name}</span><span>{brl(s.setup_value)} + {brl(s.monthly_value)}/mês</span><span className="text-ink-soft">{date(s.closed_at)}</span></div></Card>)}
          {sales.length === 0 && <p className="text-sm text-ink-soft">Nenhuma venda registrada.</p>}
        </div>
      )}

      <LeadForm open={edit} onClose={() => setEdit(false)} lead={lead} onSaved={refresh} />
      <TaskForm open={taskOpen} onClose={() => setTaskOpen(false)} leadId={lead.id} onSaved={refresh} />
      <Confirm open={del} onClose={() => setDel(false)} danger title="Excluir lead definitivamente?" label="Excluir" text="Esta ação remove o lead e seu histórico. Prefira ARQUIVAR se quiser apenas tirar da lista. A exclusão fica registrada na auditoria."
        onConfirm={() => run(() => db.remove('leads', lead.id), 'Lead excluído').then((r) => { if (r !== undefined) { onChanged(); onClose(); } })} />
      {mover.modal}
    </Drawer>
  );
}

function ConsentModal({ open, onClose, lead, onSaved }: { open: boolean; onClose: () => void; lead: Row; onSaved: () => void }) {
  const app = useApp();
  const { run, busy } = useAction();
  const [f, setF] = useState({ purpose: 'marketing', source: 'Formulário Meta Ads', evidence: '' });
  return (
    <Modal open={open} onClose={onClose} title="Registrar consentimento (opt-in)" footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={() => run(async () => {
      if (!f.evidence.trim()) throw new Error('Descreva a evidência (onde e como o contato autorizou).');
      await db.insert('consents', { org_id: app.orgId, lead_id: lead.id, status: 'granted', purpose: f.purpose, source: f.source, evidence: f.evidence.trim(), recorded_by: app.userId });
    }, 'Consentimento registrado').then((r) => { if (r !== undefined) { onSaved(); onClose(); } })}>Registrar</Button></>}>
      <Alert tone="info" className="mb-3">A Meta exige que o contato tenha autorizado receber mensagens da Bravus Mídia no WhatsApp. Guarde a evidência (print, formulário, mensagem).</Alert>
      <div className="grid gap-3">
        <Field label="Finalidade"><Select value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })} options={[{ value: 'marketing', label: 'Marketing / ofertas' }, { value: 'utility', label: 'Utilidade (avisos, lembretes)' }, { value: 'all', label: 'Todas' }]} /></Field>
        <Field label="Origem"><Select value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} options={['Formulário Meta Ads', 'Formulário do site', 'Conversa no WhatsApp', 'Contrato', 'Presencial', 'Outro'].map((s) => ({ value: s, label: s }))} /></Field>
        <Field label="Evidência" required><Textarea value={f.evidence} onChange={(e) => setF({ ...f, evidence: e.target.value })} placeholder="Ex.: marcou a caixa de autorização no formulário da campanha X em 20/10" /></Field>
      </div>
    </Modal>
  );
}

export function TaskRow({ t, onChange, showLead, leadName }: { t: Row; onChange: () => void; showLead?: boolean; leadName?: string }) {
  const app = useApp();
  const { run } = useAction();
  const overdue = t.status === 'open' && new Date(t.due_at) < new Date();
  const [result, setResult] = useState('');
  const [closing, setClosing] = useState(false);
  return (
    <div className={`flex flex-col gap-2 rounded-xl border bg-white p-3 sm:flex-row sm:items-center dark:bg-navy-700/60 ${overdue ? 'border-red-200 dark:border-red-500/30' : 'border-line dark:border-white/10'}`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`text-sm font-medium ${t.status !== 'open' ? 'text-ink-soft line-through' : ''}`}>{t.title}</span>
          <Badge tone={PRIORITY[t.priority]?.[1]}>{PRIORITY[t.priority]?.[0]}</Badge>
          <Badge>{TASK_TYPES[t.type]}</Badge>
          {overdue && <Badge tone="red" dot>Atrasada</Badge>}
          {t.source === 'automation' && <Badge tone="violet">Automação</Badge>}
        </div>
        <div className="mt-0.5 text-xs text-ink-soft">
          {showLead && t.lead_id && <Link className="font-medium text-brand-600" to={`/leads?id=${t.lead_id}`}>{leadName ?? 'Lead'}</Link>}{showLead && t.lead_id && ' · '}
          {dateTime(t.due_at)} ({relative(t.due_at)}) · {app.memberName(t.assignee_id)}{t.result ? ` · Resultado: ${t.result}` : ''}
        </div>
      </div>
      {t.status === 'open' && app.can.write && (closing ? (
        <div className="flex gap-2"><Input className="h-8" value={result} onChange={(e) => setResult(e.target.value)} placeholder="Resultado" autoFocus /><Button size="sm" onClick={() => run(() => db.update('tasks', t.id, { status: 'done', result: result || null }), 'Tarefa concluída').then(onChange)}>OK</Button></div>
      ) : (
        <div className="flex gap-1">
          <Button size="sm" variant="secondary" icon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => setClosing(true)}>Concluir</Button>
          <Button size="sm" variant="ghost" onClick={() => run(() => db.update('tasks', t.id, { status: 'canceled' }), 'Tarefa cancelada').then(onChange)}>Cancelar</Button>
        </div>
      ))}
    </div>
  );
}

export function useLeadsIndex() {
  const { orgId } = useApp();
  const [leads, setLeads] = useState<Row[]>([]);
  const reload = () => db.list('leads', { eq: { org_id: orgId } }).then(setLeads).catch(() => {});
  useEffect(() => { reload(); }, [orgId]); // eslint-disable-line
  const byId = useMemo(() => new Map(leads.map((l) => [l.id, l])), [leads]);
  return { leads, byId, reload };
}
