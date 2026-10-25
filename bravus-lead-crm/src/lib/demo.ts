// MODO DEMONSTRAÇÃO — dados de exemplo salvos apenas neste navegador.
// Nada aqui é enviado a servidor, ao WhatsApp ou à Meta. Serve só para conhecer o sistema.
import type { Db, ListOpts, Row } from './backend';

export const DEMO_ORG = '00000000-0000-4000-8000-0000000000d0';
export const DEMO_USER = '00000000-0000-4000-8000-0000000000a1';
const DEMO_USER2 = '00000000-0000-4000-8000-0000000000a2';
const KEY = 'bravus.lead.demo.v1';

type Store = Record<string, Row[]>;
let store: Store | null = null;

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
const ago = (days: number, h = 0) => new Date(Date.now() - days * 86400000 - h * 3600000).toISOString();
const dateAgo = (days: number) => ago(days).slice(0, 10);

function load(): Store {
  if (store) return store;
  try { const raw = localStorage.getItem(KEY); if (raw) { store = JSON.parse(raw); return store!; } } catch { /* */ }
  store = seed();
  persist();
  return store;
}
function persist() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* */ } }
export function resetDemo() { store = seed(); persist(); }

function seed(): Store {
  const s: Store = {};
  const o = DEMO_ORG;
  s.organizations = [{ id: o, name: 'Bravus Mídia (demonstração)', settings: { inactivity: { attention: 3, priority: 7, review: 15, requalify: 30 }, whatsapp: { max_per_minute: 20, max_per_day: 200, quiet_start: '21:00', quiet_end: '08:00' } } }];
  s.profiles = [
    { id: DEMO_USER, full_name: 'Andrade', email: 'andrade@exemplo.com', theme: 'system' },
    { id: DEMO_USER2, full_name: 'Priscila', email: 'priscila@exemplo.com', theme: 'system' },
  ];
  s.memberships = [
    { id: uid(), org_id: o, user_id: DEMO_USER, role: 'owner', job_title: 'Proprietário', active: true, created_at: ago(120) },
    { id: uid(), org_id: o, user_id: DEMO_USER2, role: 'seller', job_title: 'Comercial', active: true, created_at: ago(60) },
  ];
  s.invitations = [];
  const stageNames: [string, string, string, number][] = [
    ['Novo lead', 'blue', 'open', 5], ['Prospecção iniciada', 'blue', 'open', 5], ['Primeiro contato realizado', 'sky', 'open', 10],
    ['Aguardando resposta do lead', 'amber', 'waiting', 10], ['Lead respondeu', 'sky', 'open', 20], ['Qualificação', 'cyan', 'open', 25],
    ['Qualificado', 'cyan', 'open', 35], ['Reunião ou diagnóstico agendado', 'indigo', 'open', 45], ['Proposta em preparação', 'indigo', 'open', 50],
    ['Proposta enviada', 'blue', 'open', 60], ['Negociação', 'violet', 'open', 75], ['Fechado — ganho', 'green', 'won', 100],
    ['Fechado — perdido', 'red', 'lost', 0], ['Nutrição futura', 'slate', 'nurture', 5],
  ];
  s.pipeline_stages = stageNames.map(([name, color, kind, probability], i) => ({ id: uid(), org_id: o, name, color, kind, probability, position: i + 1 }));
  const st = (n: number) => s.pipeline_stages[n - 1].id;
  s.services = [
    ['Gestão de Tráfego Pago', 0, 1500, true], ['Criação de Sites', 2500, 0, false], ['Landing Pages', 1200, 0, false],
    ['Social Media', 0, 1200, true], ['Branding e Identidade Visual', 1800, 0, false], ['Consultoria de Marketing', 900, 0, false],
    ['Automações', 600, 300, true], ['Mentoria em Marketing Digital', 1500, 0, false],
  ].map(([name, setup_price, monthly_price, recurring]) => ({ id: uid(), org_id: o, name, setup_price, monthly_price, recurring, active: true }));
  const sv = (n: number) => s.services[n].id;

  const L = (full_name: string, company: string, phone: string, stage: number, extra: Row = {}): Row => ({
    id: uid(), org_id: o, full_name, company, phone_original: phone, phone_e164: '+55' + phone.replace(/\D/g, ''), phone_valid: true,
    whatsapp: '+55' + phone.replace(/\D/g, ''), email: null, city: 'Fortaleza', state: 'CE', stage_id: st(stage), owner_id: DEMO_USER,
    consent_status: 'unknown', opted_out: false, tags: [], potential_value: 1500, entered_at: dateAgo(10), created_at: ago(10),
    updated_at: ago(1), archived_at: null, ...extra,
  });
  s.leads = [
    L('Carla Menezes', 'Clínica Sorriso', '85 98811-2201', 1, { source: 'Meta Ads', campaign: 'Leads Odonto', service_id: sv(0), created_at: ago(0, 3), entered_at: dateAgo(0), temperature: 'quente', tags: ['odonto'] }),
    L('Rafael Lima', 'Lima Pneus', '85 99712-3344', 3, { source: 'Indicação', service_id: sv(0), last_interaction_at: ago(2), last_outbound_at: ago(2), temperature: 'morno' }),
    L('Juliana Rocha', 'Studio JR Estética', '85 98620-1122', 4, { source: 'Instagram', service_id: sv(3), last_outbound_at: ago(5), last_interaction_at: ago(5), waiting_on: 'lead' }),
    L('Marcos Vieira', 'MV Imóveis', '85 99133-8899', 5, { source: 'Meta Ads', service_id: sv(1), potential_value: 2500, last_inbound_at: ago(0, 2), last_interaction_at: ago(0, 2), waiting_on: 'team', consent_status: 'granted', consent_source: 'Formulário Meta Ads', temperature: 'quente' }),
    L('Patrícia Gomes', 'Doce Gomes Confeitaria', '85 98455-0090', 7, { source: 'Google', service_id: sv(0), potential_value: 1800, last_interaction_at: ago(8) }),
    L('Thiago Nunes', 'Academia Força Total', '85 99876-5432', 8, { source: 'Meta Ads', service_id: sv(0), potential_value: 2200, next_follow_up_at: ago(-1), last_interaction_at: ago(1) }),
    L('Fernanda Castro', 'FC Advocacia', '85 98123-7766', 10, { source: 'Indicação', service_id: sv(1), potential_value: 3500, last_interaction_at: ago(4), next_follow_up_at: ago(1) }),
    L('Bruno Alves', 'Alves Auto Center', '85 99654-1200', 11, { source: 'Prospecção ativa', service_id: sv(0), potential_value: 2000, last_interaction_at: ago(1), temperature: 'quente' }),
    L('Aline Souza', 'Pet Shop Amigo Fiel', '85 98777-3311', 12, { source: 'Meta Ads', service_id: sv(0), potential_value: 1500, won_at: ago(6), last_interaction_at: ago(6), consent_status: 'granted', consent_source: 'Conversa no WhatsApp' }),
    L('Diego Martins', 'DM Construções', '85 99001-4455', 13, { source: 'Google', service_id: sv(1), lost_reason: 'Preço', lost_at: ago(3), last_interaction_at: ago(3) }),
    L('Luana Ribeiro', 'Ribeiro Moda', '85 98222-6677', 14, { source: 'Instagram', service_id: sv(3), last_interaction_at: ago(35) }),
    L('Eduardo Prado', 'Prado Burger', '85 99555-1010', 2, { source: 'Prospecção ativa', service_id: sv(0), last_interaction_at: ago(16) }),
  ];
  const lead = (i: number) => s.leads[i];
  s.clients = [
    { id: uid(), org_id: o, lead_id: lead(8).id, name: 'Aline Souza', company: 'Pet Shop Amigo Fiel', phone_e164: lead(8).phone_e164, status: 'active', started_at: dateAgo(6), owner_id: DEMO_USER, created_at: ago(6) },
    { id: uid(), org_id: o, name: 'Roberto Farias', company: 'Farias Odontologia', phone_e164: '+5585988001122', status: 'active', started_at: dateAgo(95), owner_id: DEMO_USER, created_at: ago(95) },
    { id: uid(), org_id: o, name: 'Sônia Prates', company: 'Prates Óticas', phone_e164: '+5585988003344', status: 'active', started_at: dateAgo(40), owner_id: DEMO_USER2, created_at: ago(40) },
    { id: uid(), org_id: o, name: 'Hugo Barros', company: 'Barros Fitness', phone_e164: '+5585988005566', status: 'churned', started_at: dateAgo(150), churned_at: dateAgo(12), churn_reason: 'Corte de orçamento', owner_id: DEMO_USER, created_at: ago(150) },
  ];
  s.sales = [
    { id: uid(), org_id: o, lead_id: lead(8).id, client_id: s.clients[0].id, service_id: sv(0), setup_value: 0, monthly_value: 1500, discount: 0, closed_at: dateAgo(6), start_date: dateAgo(5), contract_status: 'active', duration_months: 6, owner_id: DEMO_USER, created_at: ago(6) },
    { id: uid(), org_id: o, client_id: s.clients[1].id, service_id: sv(0), setup_value: 0, monthly_value: 1800, discount: 0, closed_at: dateAgo(95), contract_status: 'active', duration_months: 12, owner_id: DEMO_USER, created_at: ago(95) },
    { id: uid(), org_id: o, client_id: s.clients[2].id, service_id: sv(1), setup_value: 2500, monthly_value: 0, discount: 200, closed_at: dateAgo(40), contract_status: 'signed', owner_id: DEMO_USER2, created_at: ago(40) },
  ];
  s.payments = [
    { id: uid(), org_id: o, sale_id: s.sales[1].id, client_id: s.clients[1].id, description: 'Mensalidade', amount: 1800, due_date: dateAgo(5), status: 'paid', paid_at: dateAgo(4), confirmed_by: DEMO_USER, created_at: ago(5) },
    { id: uid(), org_id: o, sale_id: s.sales[0].id, client_id: s.clients[0].id, description: '1ª mensalidade', amount: 1500, due_date: dateAgo(-3), status: 'pending', created_at: ago(5) },
  ];
  s.proposals = [
    { id: uid(), org_id: o, lead_id: lead(6).id, title: 'Site institucional FC Advocacia', items: [{ service: 'Criação de Sites', setup: 3500, monthly: 0, qty: 1 }], setup_total: 3500, monthly_total: 0, discount: 0, status: 'sent', valid_until: dateAgo(-10), version: 1, sent_at: ago(4), owner_id: DEMO_USER, created_at: ago(4) },
  ];
  s.proposal_revisions = [];
  s.tasks = [
    { id: uid(), org_id: o, lead_id: lead(0).id, assignee_id: DEMO_USER, type: 'qualification', title: 'Qualificar lead novo', priority: 'high', due_at: ago(-0.1), status: 'open', source: 'automation', created_at: ago(0, 3) },
    { id: uid(), org_id: o, lead_id: lead(6).id, assignee_id: DEMO_USER, type: 'follow_up', title: 'Acompanhar proposta enviada', priority: 'high', due_at: ago(1), status: 'open', source: 'automation', created_at: ago(4) },
    { id: uid(), org_id: o, lead_id: lead(5).id, assignee_id: DEMO_USER2, type: 'meeting', title: 'Diagnóstico de tráfego', priority: 'normal', due_at: ago(-1), status: 'open', source: 'manual', created_at: ago(2) },
    { id: uid(), org_id: o, lead_id: lead(2).id, assignee_id: DEMO_USER2, type: 'message', title: 'Retomar contato', priority: 'normal', due_at: ago(-2), status: 'open', source: 'manual', created_at: ago(5) },
    { id: uid(), org_id: o, lead_id: lead(1).id, assignee_id: DEMO_USER, type: 'call', title: 'Ligar para apresentar case', priority: 'normal', due_at: ago(3), status: 'done', completed_at: ago(2), result: 'Pediu proposta', source: 'manual', created_at: ago(4) },
  ];
  s.activities = [
    { id: uid(), org_id: o, lead_id: lead(3).id, type: 'message', direction: 'inbound', summary: 'Perguntou valores de site com blog', occurred_at: ago(0, 2), created_by: null },
    { id: uid(), org_id: o, lead_id: lead(1).id, type: 'call', direction: 'outbound', summary: 'Apresentação do serviço de tráfego', occurred_at: ago(2), created_by: DEMO_USER },
  ];
  s.stage_history = [];
  s.prospects = [
    { id: uid(), org_id: o, company: 'Sabor da Terra Restaurante', niche: 'Restaurante', discovery_channel: 'Google Maps', contact_name: 'Gerência', phone_e164: '+5585987654000', status: 'not_contacted', owner_id: DEMO_USER2, created_at: ago(2) },
    { id: uid(), org_id: o, company: 'Vida Leve Nutrição', niche: 'Saúde', discovery_channel: 'Instagram', contact_name: 'Dra. Paula', status: 'waiting', approached_at: ago(3), cadence_step: 1, owner_id: DEMO_USER, created_at: ago(5) },
    { id: uid(), org_id: o, company: 'Auto Escola Rota Certa', niche: 'Educação', discovery_channel: 'Indicação', status: 'in_progress', approached_at: ago(1), cadence_step: 2, owner_id: DEMO_USER, created_at: ago(7) },
  ];
  const conv = { id: uid(), org_id: o, lead_id: lead(3).id, wa_id: '5585991338899', phone_e164: lead(3).phone_e164, contact_name: 'Marcos Vieira', status: 'open', unread_count: 1, last_inbound_at: ago(0, 2), last_message_preview: 'Quanto fica um site com blog?', updated_at: ago(0, 2), automation_paused: true };
  s.conversations = [conv];
  s.messages = [
    { id: uid(), org_id: o, conversation_id: conv.id, direction: 'inbound', type: 'text', body: 'Oi! Vi o anúncio de vocês.', status: 'received', created_at: ago(0, 3) },
    { id: uid(), org_id: o, conversation_id: conv.id, direction: 'inbound', type: 'text', body: 'Quanto fica um site com blog?', status: 'received', created_at: ago(0, 2) },
  ];
  s.message_templates = [
    { id: uid(), org_id: o, name: 'retomada_contato', language: 'pt_BR', category: 'MARKETING', status: 'APPROVED', body: 'Olá {{1}}, tudo bem? Aqui é da Bravus Mídia. Podemos retomar a conversa sobre seu projeto? Responda PARAR para não receber mais mensagens.', variables: 1 },
    { id: uid(), org_id: o, name: 'lembrete_reuniao', language: 'pt_BR', category: 'UTILITY', status: 'APPROVED', body: 'Olá {{1}}, lembrando da nossa reunião em {{2}}.', variables: 2 },
  ];
  s.consents = [];
  s.suppression_list = [];
  s.integrations = [{ id: uid(), org_id: o, provider: 'whatsapp_cloud', mode: 'demo', status: 'demo', phone_number_id: null, waba_id: null }];
  s.imports = [];
  s.import_templates = [];
  s.files = [];
  s.automations = [
    ['Qualificar lead novo', 'lead_created', 'create_task', { type: 'qualification', title: 'Qualificar lead novo', days: 0, priority: 'high' }],
    ['Acompanhar proposta enviada', 'proposal_sent', 'create_task', { type: 'follow_up', title: 'Acompanhar proposta enviada', days: 2, priority: 'high' }],
    ['Lead respondeu — avisar responsável', 'message_received', 'notify_owner', {}],
    ['Venda fechada — criar cliente', 'sale_won', 'create_client', {}],
    ['Venda fechada — avisar administradores', 'sale_won', 'notify_admins', {}],
    ['Opt-out — avisar administradores', 'opt_out', 'notify_admins', {}],
    ['Tarefa vencida — avisar responsável', 'task_overdue', 'notify_owner', {}],
    ['Falha na integração — avisar administradores', 'integration_error', 'notify_admins', {}],
  ].map(([name, trigger, action, params]) => ({ id: uid(), org_id: o, name, trigger, action, params, conditions: {}, active: true, simulate: false, created_at: ago(30) }));
  s.automation_runs = [];
  s.notifications = [{ id: uid(), org_id: o, user_id: DEMO_USER, title: 'Lead respondeu', body: 'Marcos Vieira', link: '/caixa-de-entrada', read_at: null, created_at: ago(0, 2) }];
  s.audit_logs = [];
  return s;
}

function matches(r: Row, o: ListOpts) {
  for (const [k, v] of Object.entries(o.eq ?? {})) if (r[k] !== v) return false;
  for (const k of Object.keys(o.is ?? {})) if (r[k] !== null && r[k] !== undefined) return false;
  for (const [k, v] of Object.entries(o.gte ?? {})) if (!(r[k] >= v)) return false;
  return true;
}

function audit(table: string, id: string, action: string, changes: Row) {
  load().audit_logs.unshift({ id: Date.now() + Math.random(), org_id: DEMO_ORG, actor_id: DEMO_USER, table_name: table, record_id: id, action, changes, created_at: new Date().toISOString() });
}

function runAutomations(trigger: string, leadId: string | null) {
  const s = load();
  const lead = leadId ? s.leads.find((l) => l.id === leadId) : null;
  for (const a of s.automations.filter((x) => x.trigger === trigger && x.active)) {
    const outcome = a.simulate ? 'simulated' : 'executed';
    if (!a.simulate) {
      if (a.action === 'create_task' && lead) {
        s.tasks.push({ id: uid(), org_id: DEMO_ORG, lead_id: lead.id, assignee_id: lead.owner_id, type: a.params.type ?? 'follow_up', title: a.params.title ?? a.name, priority: a.params.priority ?? 'normal', due_at: new Date(Date.now() + (a.params.days ?? 1) * 86400000).toISOString(), status: 'open', source: 'automation', created_at: new Date().toISOString() });
      } else if (a.action === 'create_client' && lead && !s.clients.some((c) => c.lead_id === lead.id)) {
        s.clients.push({ id: uid(), org_id: DEMO_ORG, lead_id: lead.id, name: lead.full_name, company: lead.company, phone_e164: lead.phone_e164, email: lead.email, status: 'active', started_at: new Date().toISOString().slice(0, 10), owner_id: lead.owner_id, created_at: new Date().toISOString() });
      } else if (a.action === 'notify_admins' || a.action === 'notify_owner') {
        s.notifications.unshift({ id: uid(), org_id: DEMO_ORG, user_id: DEMO_USER, title: a.name, body: lead?.full_name ?? '', read_at: null, created_at: new Date().toISOString() });
      }
    }
    s.automation_runs.unshift({ id: uid(), org_id: DEMO_ORG, automation_id: a.id, event_key: `${trigger}:${leadId}:${Date.now()}`, outcome, detail: a.action, created_at: new Date().toISOString() });
  }
}

function beforeLead(next: Row, prev: Row | null) {
  const s = load();
  if (next.stage_id && next.stage_id !== prev?.stage_id) {
    const kind = s.pipeline_stages.find((x) => x.id === next.stage_id)?.kind;
    if (kind === 'won' && !s.sales.some((x) => x.lead_id === next.id && x.service_id && Number(x.setup_value) + Number(x.monthly_value) > 0))
      throw new Error('Para marcar como venda ganha, registre antes a venda (serviço, valor e data de fechamento).');
    if (kind === 'lost' && !String(next.lost_reason ?? '').trim()) throw new Error('Informe o motivo da perda para mover o lead para Fechado — perdido.');
    next.won_at = kind === 'won' ? next.won_at ?? new Date().toISOString() : null;
    next.lost_at = kind === 'lost' ? next.lost_at ?? new Date().toISOString() : null;
    if (kind === 'waiting') next.waiting_on = 'lead';
  }
}

export const demoDb: Db = {
  async list(table, o = {}) {
    const rows = (load()[table] ?? []).filter((r) => matches(r, o));
    if (o.order) { const [k, asc = true] = o.order; rows.sort((a, b) => (a[k] ?? '') < (b[k] ?? '') ? (asc ? -1 : 1) : (a[k] ?? '') > (b[k] ?? '') ? (asc ? 1 : -1) : 0); }
    return structuredClone(rows.slice(0, o.limit ?? 5000));
  },
  async get(table, id) { return structuredClone(load()[table]?.find((r) => r.id === id) ?? null); },
  async insert(table, row) {
    const s = load(); s[table] ??= [];
    const rows = (Array.isArray(row) ? row : [row]).map((r) => ({ id: uid(), org_id: DEMO_ORG, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...r }));
    for (const r of rows) {
      if (table === 'leads') { r.tags ??= []; r.consent_status ??= 'unknown'; r.opted_out ??= false; r.archived_at ??= null; beforeLead(r, null); }
      if (table === 'payments' && r.status === 'paid') r.confirmed_by = DEMO_USER;
      s[table].push(r);
      if (['leads', 'clients', 'sales', 'payments', 'proposals', 'consents', 'suppression_list', 'invitations'].includes(table)) audit(table, r.id, 'insert', r);
      if (table === 'leads') runAutomations('lead_created', r.id);
      if (table === 'sales' && r.lead_id) runAutomations('sale_won', r.lead_id);
      if (table === 'proposals' && r.status === 'sent' && r.lead_id) runAutomations('proposal_sent', r.lead_id);
      if (table === 'consents') { const l = s.leads.find((x) => x.id === r.lead_id); if (l) { l.consent_status = r.status; l.consent_source = r.source; l.consent_at = r.created_at; l.opted_out = r.status === 'revoked'; } }
      if (table === 'suppression_list') { for (const l of s.leads.filter((x) => x.phone_e164 === r.phone_e164)) { l.opted_out = true; l.consent_status = 'revoked'; } runAutomations('opt_out', null); }
      if (table === 'activities' && r.lead_id) { const l = s.leads.find((x) => x.id === r.lead_id); if (l) l.last_interaction_at = r.occurred_at ?? r.created_at; }
    }
    persist();
    return structuredClone(rows);
  },
  async update(table, id, patch) {
    const s = load();
    const r = s[table]?.find((x) => x.id === id);
    if (!r) throw new Error('Registro não encontrado');
    const prev = { ...r };
    const next: Row = { ...r, ...patch, updated_at: new Date().toISOString() };
    if (table === 'leads') beforeLead(next, prev);
    if (table === 'tasks') next.completed_at = next.status === 'done' ? prev.completed_at ?? new Date().toISOString() : null;
    Object.assign(r, next);
    if (table === 'leads' && prev.stage_id !== r.stage_id) {
      s.stage_history.push({ id: uid(), org_id: DEMO_ORG, lead_id: id, from_stage: prev.stage_id, to_stage: r.stage_id, changed_at: new Date().toISOString(), changed_by: DEMO_USER });
      const stage = s.pipeline_stages.find((x) => x.id === r.stage_id);
      s.activities.push({ id: uid(), org_id: DEMO_ORG, lead_id: id, type: 'stage', summary: 'Etapa alterada para: ' + stage?.name, occurred_at: new Date().toISOString() });
    }
    if (table === 'proposals' && patch.status === 'sent' && prev.status !== 'sent' && r.lead_id) { r.sent_at = new Date().toISOString(); runAutomations('proposal_sent', r.lead_id); }
    audit(table, id, 'update', patch);
    persist();
    return structuredClone(r);
  },
  async remove(table, id) {
    const s = load();
    s[table] = (s[table] ?? []).filter((x) => x.id !== id);
    audit(table, id, 'delete', {});
    persist();
  },
  async rpc(name, args = {}) {
    const s = load();
    if (name === 'scan_overdue_tasks') return s.tasks.filter((t) => t.status === 'open' && t.due_at < new Date().toISOString()).length;
    if (name === 'accept_invitations') return 0;
    if (name === 'convert_prospect') {
      const p = s.prospects.find((x) => x.id === args.p_prospect);
      if (!p) throw new Error('Prospecção não encontrada');
      if (p.lead_id) return p.lead_id;
      const [lead] = await demoDb.insert('leads', { full_name: p.contact_name || p.company, company: p.company, phone_e164: p.phone_e164, phone_valid: !!p.phone_e164, source: 'Prospecção ativa', stage_id: s.pipeline_stages[0].id, owner_id: p.owner_id, segment: p.niche });
      p.lead_id = lead.id; p.status = 'qualified'; persist();
      return lead.id;
    }
    throw new Error('Função indisponível no modo demonstração');
  },
  async invoke(fn) {
    if (fn === 'whatsapp-send') return { ok: false, demo: true, error: 'Modo demonstração: nada é enviado ao WhatsApp.' };
    return { ok: false, error: 'Indisponível no modo demonstração. Conecte o banco de dados real em Configurações.' };
  },
};
