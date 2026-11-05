/* =====================================================================
   BRAVUS WORK v1.0 — Organize. Execute. Evolua.
   App leve (sem frameworks). Dados: Supabase (produção) ou modo local.
   ===================================================================== */
const CFG = window.BW_CONFIG || {};
const VERSION = '1.0.0';
const EMBED = !!CFG.EMBED;
const SUPA = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);
const TABLES = ['profiles','clients','invoices','expenses','campaigns','tasks','content','messages','notifications','activity','settings'];

/* ---------------- utilidades ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today = () => iso(new Date());
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
const dayDiff = (a, b) => Math.round((new Date(a + 'T12:00:00') - new Date(b + 'T12:00:00')) / 864e5);
const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const brl = n => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const int = n => (Number(n) || 0).toLocaleString('pt-BR');
const pct = n => isFinite(n) ? n.toFixed(2).replace('.', ',') + '%' : '—';
const fdate = s => s ? new Date(s.length > 10 ? s : s + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—';
const fdateL = s => s ? new Date(s + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) : '';
const ftime = s => s ? new Date(s).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
const ago = s => { if (!s) return 'nunca'; const m = Math.round((Date.now() - new Date(s)) / 6e4); if (m < 1) return 'agora'; if (m < 60) return `há ${m} min`; const h = Math.round(m / 60); if (h < 24) return `há ${h} h`; return `há ${Math.round(h / 24)} d`; };
const ym = s => (s || '').slice(0, 7);
const curYM = () => today().slice(0, 7);
const monthName = k => new Date(k + '-15T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id' + Date.now() + Math.random().toString(16).slice(2));
const onlyDigits = s => String(s || '').replace(/\D/g, '');
const initials = n => String(n || '?').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

const ICON = {
  grid:'<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  target:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  wallet:'<path d="M20 7H5a2 2 0 0 1 0-4h13v4"/><path d="M3 5v14a2 2 0 0 0 2 2h15V7"/><circle cx="16" cy="14" r="1.2"/>',
  cal:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  film:'<rect x="2" y="3" width="20" height="18" rx="2"/><path d="M7 3v18M17 3v18M2 12h20M2 7.5h5M2 16.5h5M17 7.5h5M17 16.5h5"/>',
  chat:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  team:'<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
  bell:'<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', x:'<path d="M18 6L6 18M6 6l12 12"/>', check:'<path d="M20 6L9 17l-5-5"/>',
  left:'<path d="M15 18l-6-6 6-6"/>', right:'<path d="M9 18l6-6-6-6"/>', more:'<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  lock:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  send:'<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>', sync:'<path d="M21 12a9 9 0 0 1-15.5 6.3L3 16M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M3 21v-5h5"/>',
  wa:'<path d="M3 21l1.7-5A8.5 8.5 0 1 1 8 19.3z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.4-2-1-1 .8a4 4 0 0 1-2.2-2.2l.8-1-1-2z"/>',
  file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>', trash:'<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  spark:'<path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z"/>', down:'<path d="M12 3v12M6 11l6 6 6-6M4 21h16"/>'
};
const ic = (n, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[n] || ''}</svg>`;

/* ---------------- dados: modo local ---------------- */
class LocalStore {
  constructor() {
    this.key = 'bw_local_v1'; this.subs = []; this.load();
    try { this.bc = new BroadcastChannel('bravus-work'); this.bc.onmessage = e => { this.load(); this.emit(e.data); }; } catch {}
  }
  load() { this.db = lsGet(this.key, {}) || {}; }
  save(t) { lsSet(this.key, this.db); try { this.bc && this.bc.postMessage(t); } catch {} this.emit(t); }
  emit(t) { this.subs.forEach(f => f(t)); }
  onChange(f) { this.subs.push(f); }
  async list(t) { return (this.db[t] || []).map(r => ({ ...r })); }
  async insert(t, row) {
    const r = { id: uid(), created_at: new Date().toISOString(), ...row };
    (this.db[t] = this.db[t] || []).push(r); this.save(t); return r;
  }
  async insertUnique(t, row) {
    if ((this.db[t] || []).some(x => x.user_id === row.user_id && x.key === row.key)) return null;
    return this.insert(t, row);
  }
  async update(t, id, patch) { const r = (this.db[t] || []).find(x => x.id === id); if (r) Object.assign(r, patch); this.save(t); return r; }
  async remove(t, id) { this.db[t] = (this.db[t] || []).filter(x => x.id !== id); this.save(t); }
  async upsertSettings(data) { this.db.settings = [{ id: 'main', data }]; this.save('settings'); }
  async invoke(name) { throw new Error('Integração disponível depois de conectar o Supabase (veja Ajustes > Integrações).'); }
}

/* ---------------- dados: Supabase ---------------- */
class SupaStore {
  constructor(sb) { this.sb = sb; this.subs = []; }
  emit(t) { this.subs.forEach(f => f(t)); }
  onChange(f) { this.subs.push(f); }
  listen() {
    this.ch = this.sb.channel('bw-db').on('postgres_changes', { event: '*', schema: 'public' }, p => this.emit(p.table)).subscribe();
  }
  chk({ data, error }) { if (error) throw new Error(error.message); return data; }
  async list(t) {
    let q = this.sb.from(t).select('*');
    if (t === 'messages') q = q.order('created_at', { ascending: false }).limit(300);
    if (t === 'activity') q = q.order('created_at', { ascending: false }).limit(400);
    if (t === 'notifications') q = q.order('created_at', { ascending: false }).limit(200);
    return this.chk(await q);
  }
  async insert(t, row) { const r = this.chk(await this.sb.from(t).insert(row).select().single()); this.emit(t); return r; }
  async insertUnique(t, row) {
    // sem .select(): quem cria o aviso nem sempre pode ler o aviso de outra pessoa (regra de segurança)
    const { error } = await this.sb.from(t).upsert(row, { onConflict: 'user_id,key', ignoreDuplicates: true });
    if (error) throw new Error(error.message); this.emit(t); return null;
  }
  async update(t, id, patch) { const r = this.chk(await this.sb.from(t).update(patch).eq('id', id).select().maybeSingle()); this.emit(t); return r; }
  async remove(t, id) { this.chk(await this.sb.from(t).delete().eq('id', id)); this.emit(t); }
  async upsertSettings(data) { this.chk(await this.sb.from('settings').upsert({ id: 'main', data })); this.emit('settings'); }
  async invoke(name, body) {
    const { data, error } = await this.sb.functions.invoke(name, { body });
    if (error) throw new Error(error.message || 'Falha na integração'); return data;
  }
}

/* ---------------- estado ---------------- */
const DEFAULT_SETTINGS = {
  agency_name: 'Bravus Mídia', max_clients: 20, priscila_finance: false,
  calls_start: '12:00', meetings_start: '18:30', prospect_goal: 15, followup_goal: 10,
  priscila_start: '09:00', priscila_end: '17:00', morning_hour: '08:00',
  reminder_offsets: [-5, -2, 0, 1, 5, 10], remind_default: 10, lock_minutes: 15,
  notify: { tarefas: true, financeiro: true, campanhas: true, conteudo: true, chat: true }
};
const S = { me: null, route: 'painel', d: {}, set: { ...DEFAULT_SETTINGS }, agendaDate: today(), agendaWho: null,
  finMonth: curYM(), cliFilter: 'todos', campFilter: 'todas', contentWeek: null, popped: new Set(), startedAt: new Date().toISOString() };
TABLES.forEach(t => S.d[t] = []);
let store, sb;

const isAdmin = () => S.me && S.me.role === 'admin';
const canFin = () => isAdmin() || !!S.set.priscila_finance;
const prof = id => S.d.profiles.find(p => p.id === id);
const pname = id => (prof(id) || {}).name || '—';
const firstName = id => pname(id).split(' ')[0];
const client = id => S.d.clients.find(c => c.id === id);
const cname = id => (client(id) || {}).name || 'Bravus Mídia';
const team = () => S.d.profiles.filter(p => p.role === 'admin' || p.role === 'comercial');
const isOnline = p => p && p.last_seen && (Date.now() - new Date(p.last_seen)) < 150000;
const avatar = (p, size = 36) => `<span class="av" style="background:${esc(p && p.color || '#2f7bff')};width:${size}px;height:${size}px">${esc(initials(p && p.name))}<i class="dot ${isOnline(p) ? 'on' : ''}"></i></span>`;

async function loadAll(only) {
  const ts = only ? [only] : TABLES;
  await Promise.all(ts.map(async t => {
    try { S.d[t] = await store.list(t); } catch (e) { S.d[t] = []; if (!/permission|policy/i.test(e.message)) console.warn(t, e.message); }
  }));
  if (!only || only === 'settings') { const row = S.d.settings.find(s => s.id === 'main'); S.set = { ...DEFAULT_SETTINGS, ...(row && row.data || {}) }; }
  if (S.me && (!only || only === 'profiles')) { const me = prof(S.me.id); if (me) S.me = { ...S.me, ...me }; }
}

/* ---------------- registro de atividade ---------------- */
async function log(action, client_id = null) {
  try { await store.insert('activity', { user_id: S.me.id, action, client_id }); } catch {}
}

/* ---------------- toasts / modal ---------------- */
function toast(title, body = '', type = '') {
  const el = document.createElement('div'); el.className = 'toast ' + type;
  el.innerHTML = `<b>${esc(title)}</b>${body ? `<span class="small muted">${esc(body)}</span>` : ''}`;
  const box = $('#toasts'); box.appendChild(el); while (box.children.length > 3) box.firstChild.remove(); setTimeout(() => el.remove(), 4200);
}
function modal(title, body, { footer = '', wide = false, form = '', cls = '' } = {}) {
  const root = $('#modal-root');
  const inner = `<header><h2>${esc(title)}</h2><button class="btn sm ic" data-act="closeModal" aria-label="Fechar">${ic('x')}</button></header><div class="bd ${cls}">${body}</div>${footer ? `<footer>${footer}</footer>` : ''}`;
  root.innerHTML = `<div class="ov" data-ov="1">${form ? `<form class="mo ${wide ? 'wide' : ''}" data-form="${form}" novalidate>${inner}</form>` : `<div class="mo ${wide ? 'wide' : ''}">${inner}</div>`}</div>`;
  const first = root.querySelector('input:not([type=hidden]),select,textarea'); if (first && innerWidth > 860) first.focus();
}
const closeModal = () => { $('#modal-root').innerHTML = ''; };
function confirmBox(title, text, okLabel, onOk, danger = false) {
  modal(title, `<p>${text}</p>`, { footer: `<button type="button" class="btn" data-act="closeModal">Cancelar</button><button type="button" class="btn ${danger ? 'bad' : 'pri'}" data-act="confirmOk">${esc(okLabel)}</button>` });
  A.confirmOk = async () => { closeModal(); await onOk(); };
}

/* campos de formulário */
const fld = (label, name, val = '', type = 'text', extra = '') => `<label class="fl">${esc(label)}<input type="${type}" name="${name}" value="${esc(val ?? '')}" ${extra}></label>`;
const sel = (label, name, opts, val = '', extra = '') => `<label class="fl">${esc(label)}<select name="${name}" ${extra}>${opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(val ?? '') ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select></label>`;
const area = (label, name, val = '') => `<label class="fl">${esc(label)}<textarea name="${name}">${esc(val ?? '')}</textarea></label>`;
const teamOpts = () => team().map(p => [p.id, p.name]);
const clientOpts = (none = 'Bravus Mídia (interno)') => [['', none], ...S.d.clients.slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => [c.id, c.name])];

/* =====================================================================
   REGRAS DE NEGÓCIO
   ===================================================================== */
const SERVICES = [['trafego', 'Tráfego pago'], ['social', 'Social media'], ['site', 'Site'], ['landing', 'Landing page'], ['automacao', 'Automação'], ['mentoria', 'Mentoria']];
const svcName = k => (SERVICES.find(s => s[0] === k) || [k, k])[1];
const OP = [['ativo', 'Ativo'], ['pausado', 'Pausado'], ['onboarding', 'Em implantação'], ['cancelado', 'Cancelado']];

function invStatus(i) {
  if (i.status === 'pago' || i.status === 'cancelado') return i.status;
  return i.due_date < today() ? 'atrasado' : 'pendente';
}
function clientFin(c) {
  const inv = S.d.invoices.filter(i => i.client_id === c.id);
  if (inv.some(i => invStatus(i) === 'atrasado')) return 'inadimplente';
  if (inv.some(i => invStatus(i) === 'pendente')) return 'a vencer';
  return inv.length ? 'em dia' : 'sem cobrança';
}
const finChip = s => `<span class="chip ${s === 'inadimplente' ? 'bad' : s === 'em dia' ? 'ok' : s === 'a vencer' ? 'warn' : ''}">${esc(s)}</span>`;
const campsOf = id => S.d.campaigns.filter(c => c.client_id === id);
/* Online = cliente ativo, com campanha ativa e sem bloqueio/saldo zerado informado pela Meta ou registro manual */
function adState(c) {
  if (!(c.services || []).includes('trafego')) return { k: 'na', label: 'Sem tráfego', cls: '' };
  const cs = campsOf(c.id); const act = cs.filter(x => x.status === 'ativa');
  const blocked = c.ad_account_status && !/^(1|ACTIVE|ativa)$/i.test(String(c.ad_account_status));
  if (c.op_status === 'cancelado') return { k: 'off', label: 'Cancelado', cls: 'bad' };
  if (blocked || cs.some(x => x.status === 'problema')) return { k: 'prob', label: 'Problema na conta', cls: 'bad' };
  if (c.ad_balance != null && c.ad_balance !== '' && Number(c.ad_balance) <= 0) return { k: 'saldo', label: 'Sem saldo', cls: 'warn' };
  if (act.length) return { k: 'on', label: `Online · ${act.length} ativa${act.length > 1 ? 's' : ''}`, cls: 'ok' };
  return { k: 'off', label: 'Offline', cls: '' };
}
const adChip = c => { const s = adState(c); return `<span class="chip ${s.cls}"><i class="dot ${s.k === 'on' ? 'on' : s.k === 'prob' ? 'bad' : s.k === 'saldo' ? 'warn' : ''}"></i>${esc(s.label)}</span>`; };
const metrics = x => {
  const sp = +x.spend || 0, im = +x.impressions || 0, cl = +x.clicks || 0, ld = +x.leads || 0;
  return { ctr: im ? cl / im * 100 : NaN, cpc: cl ? sp / cl : NaN, cpm: im ? sp / im * 1000 : NaN, cpl: ld ? sp / ld : NaN };
};
const CAMP_ST = [['ativa', 'Ativa'], ['pausada', 'Pausada'], ['sem_entrega', 'Sem entrega'], ['problema', 'Com problema'], ['encerrada', 'Encerrada']];
const campChip = s => `<span class="chip ${s === 'ativa' ? 'ok' : s === 'problema' || s === 'sem_entrega' ? 'bad' : s === 'pausada' ? 'warn' : ''}">${esc((CAMP_ST.find(x => x[0] === s) || [s, s])[1])}</span>`;

function finMonth(k) {
  const recebido = S.d.invoices.filter(i => i.status === 'pago' && ym(i.paid_at) === k).reduce((a, i) => a + +i.amount, 0);
  const aReceber = S.d.invoices.filter(i => invStatus(i) === 'pendente' && ym(i.due_date) === k).reduce((a, i) => a + +i.amount, 0);
  const atrasado = S.d.invoices.filter(i => invStatus(i) === 'atrasado').reduce((a, i) => a + +i.amount, 0);
  const saidas = S.d.expenses.filter(e => ym(e.date) === k).reduce((a, e) => a + +e.amount, 0);
  return { recebido, aReceber, atrasado, saidas, saldo: recebido - saidas };
}
const lastMonths = n => { const out = []; const d = new Date(); d.setDate(15); for (let i = n - 1; i >= 0; i--) { const x = new Date(d); x.setMonth(d.getMonth() - i); out.push(`${x.getFullYear()}-${pad(x.getMonth() + 1)}`); } return out; };
const mrr = () => S.d.clients.filter(c => c.op_status !== 'cancelado').reduce((a, c) => a + (+c.contract_value || 0), 0);

const realTasks = () => S.d.tasks.filter(t => !t.is_template);
const isLate = t => t.status !== 'feito' && t.date && (t.date < today() || (t.date === today() && t.time && t.time < nowHM() && t.kind !== 'tarefa'));

/* ---------- rotinas automáticas (Daily + Weekend) ---------- */
function defaultTemplates(andrade, priscila) {
  const s = S.set, W = [1, 2, 3, 4, 5];
  const T = (assignee, days, time, title, extra = {}) => ({ is_template: true, assignee, days, time, title, priority: 'media', kind: 'tarefa', status: 'pendente', remind_min: s.remind_default, ...extra });
  const out = [
    T(andrade, W, '08:00', 'Conferir pagamentos e cobranças do dia', { category: 'financeiro', priority: 'alta' }),
    T(andrade, W, '08:30', 'Análise das campanhas dos clientes', { category: 'trafego', priority: 'alta' }),
    T(andrade, W, '09:30', 'Prospecção de empresas', { category: 'comercial', goal: s.prospect_goal, description: 'Encontrar e abordar empresas com potencial (registre a quantidade).' }),
    T(andrade, W, '11:00', 'Envio de mensagens e follow-up de oportunidades', { category: 'comercial' }),
    T(andrade, W, s.calls_start, 'Ligações comerciais', { category: 'comercial', kind: 'ligacao', priority: 'alta' }),
    T(andrade, W, '15:00', 'Verificação dos clientes e gestão operacional', { category: 'operacional' }),
    T(andrade, [5], '16:30', 'Relatórios e planejamento estratégico da semana', { category: 'estrategia' }),
    T(andrade, [6], '09:00', 'Gravação de vídeos (Reels e YouTube)', { category: 'conteudo', description: 'Bravus Weekend — sábado de gravação.' }),
    T(andrade, [6], '11:00', 'Planejamento de conteúdo da semana', { category: 'conteudo' }),
    T(andrade, [6], '15:00', 'Produção de Reels e organização de materiais', { category: 'conteudo' }),
    T(andrade, [0], '09:00', 'Edição de vídeos e finalização de Reels', { category: 'conteudo', description: 'Bravus Weekend — domingo de edição.' }),
    T(andrade, [0], '14:00', 'Preparar Feed, Stories e vídeos do YouTube', { category: 'conteudo' }),
    T(andrade, [0], '17:00', 'Programar publicações da semana (enviar para aprovação)', { category: 'conteudo', priority: 'alta' })
  ];
  if (priscila) {
    const st = s.priscila_start, plus = (hm, m) => { const [h, mi] = hm.split(':').map(Number); const d = h * 60 + mi + m; return `${pad(Math.floor(d / 60) % 24)}:${pad(d % 60)}`; };
    out.push(
      T(priscila, W, st, 'Conferir pendências do dia', { category: 'operacional' }),
      T(priscila, W, plus(st, 30), 'Instagram: seguir perfis de empresas (manual)', { category: 'instagram', goal: 30, description: 'Ação manual e em ritmo natural. Não usar ferramentas de automação de seguir.' }),
      T(priscila, W, plus(st, 120), 'Acompanhar novos seguidores e interações', { category: 'instagram' }),
      T(priscila, W, plus(st, 300), 'Follow-up pelo WhatsApp', { category: 'comercial', goal: s.followup_goal, priority: 'alta' }),
      T(priscila, W, plus(st, 390), 'Acompanhar clientes (retornos e pendências)', { category: 'clientes' }),
      T(priscila, W, plus(st, 420), 'Instagram: deixar de seguir conforme estratégia (manual)', { category: 'instagram', description: 'Limpeza manual, poucos perfis por vez.' }),
      T(priscila, W, plus(s.priscila_end, -30), 'Registrar atividades realizadas no dia', { category: 'operacional' })
    );
  }
  return out;
}
async function ensureRoutine(date) {
  if (!S.me) return;
  const dow = new Date(date + 'T12:00:00').getDay();
  const tpls = S.d.tasks.filter(t => t.is_template && (t.days || []).includes(dow));
  let made = 0;
  for (const t of tpls) {
    if (!isAdmin() && t.assignee !== S.me.id) continue;
    if (S.d.tasks.some(x => x.template_id === t.id && x.date === date)) continue;
    const { id, created_at, is_template, days, agency_id, ...rest } = t;
    const row = await store.insert('tasks', { ...rest, template_id: id, date, status: 'pendente', count: 0, is_template: false });
    S.d.tasks.push(row); made++;
  }
  return made;
}

/* =====================================================================
   NOTIFICAÇÕES (Bravus Notify)
   ===================================================================== */
async function notifyUsers(ids, title, body, type = 'info', key = null, route = null) {
  for (const u of [...new Set(ids)].filter(Boolean)) {
    try { await store.insertUnique('notifications', { user_id: u, title, body, type, key: key || uid(), route, read: false }); } catch (e) { console.warn(e.message); }
  }
}
const admins = () => team().filter(p => p.role === 'admin').map(p => p.id);
const finPeople = () => team().filter(p => p.role === 'admin' || S.set.priscila_finance).map(p => p.id);

async function systemPop(n) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
    const opt = { body: n.body || '', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: n.key, data: { route: n.route || 'painel' } };
    if (reg) reg.showNotification(n.title, opt); else new Notification(n.title, opt);
  } catch {}
}
function popNew() {
  const mine = S.d.notifications.filter(n => n.user_id === S.me.id && !n.read && n.created_at >= S.startedAt && !S.popped.has(n.id));
  mine.forEach(n => S.popped.add(n.id));
  if (mine.length > 2) {
    toast(`${mine.length} novos alertas`, 'Toque no sino para ver todos.', mine.some(n => n.type === 'alerta') ? 'bad' : '');
    systemPop({ title: `Bravus Work · ${mine.length} novos alertas`, body: mine.slice(0, 3).map(n => n.title).join(' · '), key: 'batch', route: 'alertas' });
  } else mine.forEach(n => { toast(n.title, n.body, n.type === 'alerta' ? 'bad' : n.type === 'pago' ? 'ok' : ''); systemPop(n); });
}

/* motor de alertas que roda no aparelho (o servidor também roda via pg_cron) */
let ticking = false;
async function tick() {
  if (!S.me || ticking) return; ticking = true;
  try {
    const d = today(), hm = nowHM(), me = S.me, nf = S.set.notify || {};
    await ensureRoutine(d);
    const mineToday = realTasks().filter(t => t.assignee === me.id && t.date === d);
    if (hm >= S.set.morning_hour) {
      const pend = mineToday.filter(t => t.status !== 'feito');
      const prosp = pend.find(t => /prospec/i.test(t.title));
      const fu = pend.find(t => /follow/i.test(t.title));
      let body = `Você tem ${pend.length} tarefa(s) hoje.`;
      if (prosp && prosp.goal) body += ` Meta: ${prosp.goal - (prosp.count || 0)} empresas para prospectar.`;
      if (fu && fu.goal) body += ` ${fu.goal - (fu.count || 0)} follow-ups pendentes.`;
      const dow = new Date().getDay();
      await notifyUsers([me.id], `${dow === 0 || dow === 6 ? 'Bravus Weekend' : (h => h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite')(new Date().getHours())}, ${firstName(me.id)}! Confira sua programação.`, body, 'rotina', `morning:${d}`, 'agenda');
    }
    if (nf.tarefas !== false) for (const t of mineToday) {
      if (t.status === 'feito' || !t.time) continue;
      const [h, m] = t.time.split(':').map(Number); const at = new Date(); at.setHours(h, m - (t.remind_min ?? 10), 0, 0);
      const diff = (Date.now() - at) / 6e4;
      if (diff >= 0 && diff < 15) {
        const title = t.kind === 'reuniao' ? `Você tem uma reunião às ${t.time}` : t.kind === 'ligacao' ? `${firstName(me.id)}, chegou o horário das ligações` : `Lembrete das ${t.time}`;
        await notifyUsers([me.id], title, t.title, 'tarefa', `task:${t.id}`, 'agenda');
      }
    }
    if (isAdmin()) {
      if (nf.financeiro !== false) for (const i of S.d.invoices) {
        if (i.status !== 'pendente') continue;
        const diff = dayDiff(d, i.due_date);
        if ((S.set.reminder_offsets || []).map(Number).includes(diff)) {
          const t = diff < 0 ? `Cobrança vence em ${-diff} dia(s)` : diff === 0 ? 'Cobrança vence hoje' : `Pagamento atrasado há ${diff} dia(s)`;
          await notifyUsers(finPeople(), t, `${cname(i.client_id)} — ${brl(i.amount)}`, diff > 0 ? 'alerta' : 'financeiro', `inv:${i.id}:${diff}`, 'financeiro');
        }
      }
      if (nf.campanhas !== false) for (const c of S.d.clients) {
        const st = adState(c);
        if (st.k === 'prob' || st.k === 'saldo') await notifyUsers(team().map(p => p.id), st.k === 'saldo' ? 'Cliente sem saldo na conta de anúncios' : 'Problema em conta de anúncios', c.name, 'alerta', `ad:${c.id}:${st.k}:${d}`, 'campanhas');
      }
      const appr = S.d.content.filter(c => c.status === 'aprovacao').length;
      if (appr && nf.conteudo !== false && hm >= S.set.morning_hour) await notifyUsers([me.id], appr === 1 ? 'Existe 1 publicação aguardando aprovação' : `Existem ${appr} publicações aguardando aprovação`, 'Revise antes de publicar.', 'conteudo', `appr:${d}:${appr}`, 'conteudo');
    }
  } catch (e) { console.warn('tick', e); }
  ticking = false;
}

/* presença (online/offline) + último acesso */
async function heartbeat() {
  if (!S.me || document.hidden) return;
  try { await store.update('profiles', S.me.id, { last_seen: new Date().toISOString() }); } catch {}
}

/* =====================================================================
   AUTENTICAÇÃO — senha simples (mín. 6 caracteres)
   ===================================================================== */
async function hashPin(pin, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 150000, hash: 'SHA-256' }, key, 256);
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const FAIL_KEY = 'bw_fail';
function lockedFor() { const f = lsGet(FAIL_KEY, { n: 0, until: 0 }); return Math.max(0, f.until - Date.now()); }
function regFail() { const f = lsGet(FAIL_KEY, { n: 0, until: 0 }); f.n++; if (f.n >= 5) { f.until = Date.now() + Math.min(30, 5 * 2 ** (Math.floor(f.n / 5) - 1)) * 60000; } lsSet(FAIL_KEY, f); }
const clearFail = () => lsSet(FAIL_KEY, { n: 0, until: 0 });

const AUTH = { pin: '', user: null, email: lsGet('bw_email', ''), stage: 'pick' };
function renderAuth(lockMsg = '') {
  const app = $('#app'); const locals = SUPA ? [] : S.d.profiles;
  if (!SUPA && !locals.length) return renderSetup();
  if (SUPA && !AUTH.email) AUTH.stage = 'email';
  const brand = `<img class="logo" src="icons/icon.svg" alt="Bravus Work"><h1>BRAVUS <span>WORK</span></h1><p class="slogan">Organize. Execute. Evolua.</p>`;
  let body = '';
  if (SUPA && AUTH.stage === 'email') {
    body = `<form data-form="authEmail" class="f" style="text-align:left">${fld('E-mail de acesso', 'email', AUTH.email, 'email', 'required autocomplete="username"')}<button class="btn pri">Continuar</button></form>`;
  } else {
    if (!SUPA && !AUTH.user && locals.length === 1) AUTH.user = locals[0].id;
    const users = SUPA ? `<p class="muted small">${esc(AUTH.email)} · <a href="#" data-act="authChangeEmail">trocar</a></p>`
      : `<div class="users">${locals.map(p => `<button type="button" class="${AUTH.user === p.id ? 'on' : ''}" data-act="authPick" data-id="${p.id}">${avatar(p, 54)}<b>${esc(p.name.split(' ')[0])}</b><small class="muted">${p.role === 'admin' ? 'Administrador' : 'Comercial · co-founder'}</small></button>`).join('')}</div>`;
    const lk = lockedFor();
    body = `${users}${lockMsg ? `<p class="small" style="margin-top:10px;color:var(--warn)">${esc(lockMsg)}</p>` : ''}
      ${lk ? `<div class="warnbox" style="margin-top:16px">Muitas tentativas. Aguarde ${Math.ceil(lk / 60000)} min.</div>` : (AUTH.user || SUPA) ? `
      <form data-form="login" class="f" style="text-align:left;margin-top:16px">
        <label class="fl">Senha<input type="password" name="pw" id="pw" required minlength="6" autocomplete="current-password" autocapitalize="none" autocorrect="off" spellcheck="false"></label>
        <button class="btn pri">Entrar</button>
      </form>` : `<p class="muted small" style="margin-top:14px">Escolha seu usuário</p>`}`;
  }
  app.innerHTML = `<div class="auth"><div class="abox">${brand}${body}<p class="mode">${SUPA ? '🔒 Conexão segura · Supabase' : 'Modo local · dados apenas neste aparelho'} · v${VERSION}</p></div></div>`;
  const pw = $('#pw'); if (pw) pw.focus();
}
function renderSetup() {
  $('#app').innerHTML = `<div class="auth"><div class="abox" style="max-width:460px;text-align:left">
    <div style="text-align:center"><img class="logo" src="icons/icon.svg" alt=""><h1>BRAVUS <span>WORK</span></h1><p class="slogan">Primeiro acesso — criar a equipe</p></div>
    <form data-form="setup" class="f card">
      <b>Administrador</b>
      <div class="f2">${fld('Nome', 'a_name', 'Andrade', 'text', 'required')}${fld('Senha (mín. 6 caracteres)', 'a_pin', '', 'password', 'minlength="6" required autocomplete="new-password" autocapitalize="none" spellcheck="false"')}</div>
      <b style="margin-top:6px">Comercial / co-founder</b>
      <div class="f2">${fld('Nome', 'p_name', 'Priscila', 'text', 'required')}${fld('Senha (mín. 6 caracteres)', 'p_pin', '', 'password', 'minlength="6" required autocomplete="new-password" autocapitalize="none" spellcheck="false"')}</div>
      <p class="note">Pode usar letras minúsculas, números e símbolos (ex.: bravus#2026). As senhas ficam guardadas criptografadas.</p>
      <button class="btn pri">Criar e entrar</button>
    </form></div></div>`;
}
const WEAK = ['000000', '111111', '123456', '654321', '121212', '112233', '123123', '999999', '222222', 'senha1', 'senha123', '1234567', '12345678', 'abcdef', 'qwerty', 'bravus'];
async function tryLogin() {
  const pin = AUTH.pin; AUTH.pin = '';
  if (lockedFor()) return renderAuth();
  try {
    if (SUPA) {
      const { data, error } = await sb.auth.signInWithPassword({ email: AUTH.email, password: pin });
      if (error) throw error;
      await startSession(data.user.id);
    } else {
      const p = S.d.profiles.find(x => x.id === AUTH.user);
      if (!p || await hashPin(pin, p.salt) !== p.pin_hash) throw new Error('Senha incorreta');
      sessionStorage.setItem('bw_session', p.id);
      await startSession(p.id);
    }
    clearFail();
  } catch (e) {
    regFail(); renderAuth(lockedFor() ? '' : 'Senha incorreta. Tente novamente.');
  }
}

/* =====================================================================
   SESSÃO
   ===================================================================== */
let timers = [];
async function startSession(userId) {
  await loadAll();
  const me = prof(userId);
  if (!me) { toast('Perfil não encontrado', 'Peça ao administrador para concluir seu cadastro.', 'bad'); if (SUPA) await sb.auth.signOut(); return renderAuth(); }
  if (me.role === 'cliente') { toast('Área do cliente em breve', 'Este acesso é da equipe Bravus.', 'warn'); if (SUPA) await sb.auth.signOut(); return renderAuth(); }
  S.me = me; S.agendaWho = me.id; S.startedAt = new Date().toISOString();
  if (isAdmin() && !S.d.tasks.some(t => t.is_template)) {
    const pri = team().find(p => p.role === 'comercial');
    for (const t of defaultTemplates(me.id, pri && pri.id)) S.d.tasks.push(await store.insert('tasks', t));
    if (!S.d.settings.length) await store.upsertSettings(S.set);
  }
  await heartbeat(); await log('Entrou no app');
  S.route = (location.hash.replace(/^#\/?/, '') || 'painel').split('?')[0];
  render(); tick();
  timers.forEach(clearInterval);
  timers = [setInterval(tick, 60000), setInterval(heartbeat, 60000), setInterval(() => { if (!document.hidden && !$('#modal-root').innerHTML && ['painel', 'equipe', 'chat'].includes(S.route)) renderView(); }, 30000)];
  armLock();
}
async function logout(silent) {
  if (S.me) { try { await store.update('profiles', S.me.id, { last_seen: new Date(Date.now() - 300000).toISOString() }); } catch {} }
  timers.forEach(clearInterval); timers = []; S.me = null; sessionStorage.removeItem('bw_session');
  if (SUPA) await sb.auth.signOut();
  AUTH.pin = ''; closeModal(); renderAuth(silent ? 'Bloqueado por inatividade.' : '');
}
let lockT;
function armLock() {
  clearTimeout(lockT);
  if (!S.me) return;
  lockT = setTimeout(() => logout(true), (S.set.lock_minutes || 15) * 60000);
}
['click', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, () => S.me && armLock(), { passive: true }));

/* =====================================================================
   LAYOUT
   ===================================================================== */
const NAV = [
  ['painel', 'Painel', 'grid'], ['clientes', 'Clientes', 'users'], ['campanhas', 'Campanhas', 'target'],
  ['financeiro', 'Financeiro', 'wallet', 'fin'], ['agenda', 'Agenda', 'cal'], ['conteudo', 'Conteúdo', 'film'],
  ['chat', 'Chat', 'chat'], ['equipe', 'Equipe', 'team'], ['alertas', 'Alertas', 'bell'],
  ['relatorios', 'Relatórios', 'file'], ['boas-praticas', 'Boas práticas', 'shield'], ['ajustes', 'Ajustes', 'gear', 'admin']
];
const navOk = n => !n[3] || (n[3] === 'fin' ? canFin() : isAdmin());
const unread = () => S.d.notifications.filter(n => n.user_id === S.me.id && !n.read).length;
let lastChatSeen = lsGet('bw_chat_seen', '');
const chatUnread = () => S.d.messages.filter(m => m.user_id !== S.me.id && m.created_at > lastChatSeen).length;

function render() {
  if (!S.me) return renderAuth();
  if (!NAV.some(n => n[0] === S.route && navOk(n))) S.route = 'painel';
  const nav = NAV.filter(navOk);
  const badge = k => k === 'alertas' && unread() ? `<span class="badge">${unread()}</span>` : k === 'chat' && chatUnread() ? `<span class="badge">${chatUnread()}</span>` : '';
  $('#app').innerHTML = `<div class="shell">
    <aside class="side">
      <div class="brand"><img src="icons/icon.svg" alt=""><div><b>BRAVUS <span>WORK</span></b><small>Organize. Execute. Evolua.</small></div></div>
      <nav class="nav">${nav.map(n => `<a href="#${n[0]}" class="${S.route === n[0] ? 'on' : ''}">${ic(n[2])}${n[1]}${badge(n[0])}</a>`).join('')}</nav>
      <div class="me">${avatar(S.me)}<div class="who"><b>${esc(S.me.name)}</b><small>${isAdmin() ? 'Administrador' : 'Comercial'}</small></div><button class="btn sm ic" title="Bloquear" data-act="logout">${ic('lock')}</button></div>
    </aside>
    <main class="main">
      <div class="mtop"><img src="icons/icon.svg" alt=""><b>BRAVUS <span>WORK</span></b><a class="btn sm ic" href="#alertas" style="position:relative">${ic('bell')}${unread() ? `<span class="badge" style="position:absolute;top:-6px;right:-6px">${unread()}</span>` : ''}</a><button class="btn sm ic" data-act="logout" title="Bloquear">${ic('lock')}</button></div>
      <div id="view"></div>
    </main>
    <nav class="bnav">${[['painel', 'Painel', 'grid'], ['clientes', 'Clientes', 'users'], ['agenda', 'Agenda', 'cal'], ['chat', 'Chat', 'chat']].map(n => `<a href="#${n[0]}" class="${S.route === n[0] ? 'on' : ''}">${ic(n[2])}${n[1]}${badge(n[0])}</a>`).join('')}<button data-act="moreMenu">${ic('more')}Mais</button></nav>
  </div>`;
  renderView();
}
function renderView() {
  const v = $('#view'); if (!v) return;
  if (!NAV.some(n => n[0] === S.route && navOk(n))) { S.route = 'painel'; if (location.hash !== '#painel') history.replaceState(null, '', '#painel'); }
  const keep = $('#chatInput') && $('#chatInput').value;
  try { v.innerHTML = (V[S.route] || V.painel)(); } catch (e) { console.error(e); v.innerHTML = `<div class="card warnbox">Erro ao montar a tela: ${esc(e.message)}</div>`; }
  if (S.route === 'chat') {
    const box = $('.msgs'); if (box) box.scrollTop = box.scrollHeight;
    if (keep) $('#chatInput').value = keep;
    lastChatSeen = new Date().toISOString(); lsSet('bw_chat_seen', lastChatSeen);
  }
  document.querySelectorAll('.nav a, .bnav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + S.route));
}
const head = (title, sub = '', actions = '') => `<div class="top"><h1>${esc(title)}${sub ? `<small>${sub}</small>` : ''}</h1>${actions}</div>`;
const kpi = (label, val, sub = '', cls = '') => `<div class="kpi ${cls}"><small>${esc(label)}</small><b>${val}</b>${sub ? `<em>${sub}</em>` : ''}</div>`;
const empty = t => `<div class="empty">${t}</div>`;

/* =====================================================================
   TELAS
   ===================================================================== */
const V = {};

/* ---------- PAINEL ---------- */
V.painel = () => {
  const d = today(), k = curYM(), cl = S.d.clients;
  const ativos = cl.filter(c => c.op_status === 'ativo'), cancel = cl.filter(c => c.op_status === 'cancelado');
  const inativos = cl.filter(c => c.op_status === 'pausado');
  const novos = cl.filter(c => ym(c.start_date || c.created_at) === k);
  const inad = cl.filter(c => clientFin(c) === 'inadimplente');
  const traf = cl.filter(c => (c.services || []).includes('trafego') && c.op_status !== 'cancelado');
  const on = traf.filter(c => adState(c).k === 'on'), off = traf.filter(c => adState(c).k !== 'on');
  const cs = S.d.campaigns;
  const tasks = realTasks().filter(t => t.date === d && (isAdmin() || t.assignee === S.me.id));
  const done = tasks.filter(t => t.status === 'feito');
  const meets = realTasks().filter(t => t.kind === 'reuniao' && ym(t.date) === k);
  const contentPend = S.d.content.filter(c => !['publicado'].includes(c.status));
  const fm = finMonth(k);
  const months = lastMonths(6); const fms = months.map(finMonth);
  const max = Math.max(1, ...fms.map(f => Math.max(f.recebido, f.saidas)));
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  // Assistente Bravus: prioridades calculadas (sem IA paga)
  const prio = [];
  inad.forEach(c => prio.push(['bad', `Cobrar ${c.name}`, 'Pagamento em atraso', 'financeiro']));
  traf.filter(c => adState(c).k === 'prob').forEach(c => prio.push(['bad', `Verificar conta de anúncios de ${c.name}`, 'Problema reportado', 'campanhas']));
  traf.filter(c => adState(c).k === 'saldo').forEach(c => prio.push(['warn', `${c.name} está sem saldo`, 'Avisar o cliente para recarregar', 'campanhas']));
  realTasks().filter(t => isLate(t) && (isAdmin() || t.assignee === S.me.id)).slice(0, 5).forEach(t => prio.push(['warn', t.title, `Atrasada · ${firstName(t.assignee)} · ${fdate(t.date)}`, 'agenda']));
  if (S.d.content.some(c => c.status === 'aprovacao')) prio.push(['blue', `${S.d.content.filter(c => c.status === 'aprovacao').length} publicação(ões) aguardando aprovação`, 'Conteúdo', 'conteudo']);
  const camps30 = cs.filter(c => c.status === 'ativa' && +c.spend > 0);
  const worst = camps30.map(c => ({ c, m: metrics(c) })).filter(x => isFinite(x.m.ctr) && x.m.ctr < 0.8).slice(0, 3);
  worst.forEach(x => prio.push(['warn', `CTR baixo em "${x.c.name}" (${pct(x.m.ctr)})`, cname(x.c.client_id) + ' — revisar criativo', 'campanhas']));

  return head(`${greet}, ${firstName(S.me.id)}`, fdateL(d), `<button class="btn pri" data-act="newTask">${ic('plus')}Tarefa</button>`) + `
  ${canFin() ? `<div class="grid g4">
    ${kpi('Entrou no mês', brl(fm.recebido), 'pagamentos confirmados', 'hl')}
    ${kpi('A receber', brl(fm.aReceber), 'vencimentos do mês', 'y')}
    ${kpi('Em atraso', brl(fm.atrasado), `${inad.length} cliente(s) inadimplente(s)`, fm.atrasado ? 'r' : '')}
    ${kpi('Saldo do mês', brl(fm.saldo), `saídas ${brl(fm.saidas)}`, fm.saldo >= 0 ? 'g' : 'r')}
  </div>` : ''}
  <div class="sec">Clientes e anúncios</div>
  <div class="grid g4">
    ${kpi('Clientes ativos', `${ativos.length}<span class="muted" style="font-size:15px"> / ${S.set.max_clients}</span>`, `${cl.length} no total · ${novos.length} novo(s) no mês`)}
    ${kpi('Anunciando agora', `<span style="color:var(--ok)">${on.length}</span>`, 'online: campanha ativa e conta ok')}
    ${kpi('Parados', off.length, 'offline, sem saldo ou com problema', off.length ? 'y' : '')}
    ${kpi('Campanhas', `${cs.filter(c => c.status === 'ativa').length} <span class="muted" style="font-size:14px">ativas</span>`, `${cs.filter(c => c.status === 'pausada').length} pausadas · ${cs.filter(c => ['problema', 'sem_entrega'].includes(c.status)).length} com problema`)}
  </div>
  <div class="grid g2" style="margin-top:14px">
    <div class="card"><h3>${ic('spark')}Prioridades de hoje<span class="sp"></span><span class="chip blue">Assistente Bravus</span></h3>
      <div class="list">${prio.length ? prio.slice(0, 8).map(p => `<a class="li" href="#${p[3]}"><i class="dot ${p[0] === 'bad' ? 'bad' : p[0] === 'warn' ? 'warn' : 'on'}"></i><div class="t"><b>${esc(p[1])}</b><small>${esc(p[2])}</small></div>${ic('right')}</a>`).join('') : empty('Tudo em ordem por aqui. ✅')}</div>
    </div>
    <div class="card"><h3>${ic('target')}Status dos clientes de tráfego<span class="sp"></span><a class="small" href="#campanhas">ver tudo</a></h3>
      <div class="list">${traf.length ? traf.slice().sort((a, b) => adState(a).k.localeCompare(adState(b).k)).slice(0, 8).map(c => `<div class="li" data-act="openClient" data-id="${c.id}" style="cursor:pointer"><div class="t"><b>${esc(c.name)}</b><small>${c.ad_balance != null && c.ad_balance !== '' ? `Saldo: ${brl(c.ad_balance)} (${esc(c.ad_balance_source || 'manual')})` : 'Saldo não informado'}</small></div>${adChip(c)}</div>`).join('') : empty('Nenhum cliente com tráfego pago cadastrado.')}</div>
    </div>
  </div>
  <div class="grid g2" style="margin-top:14px">
    ${canFin() ? `<div class="card"><h3>${ic('wallet')}Entradas x saídas (6 meses)<span class="sp"></span><span class="legend"><span><i style="background:#3d86ff"></i>Entrou</span><span><i style="background:#ff6b7a"></i>Saiu</span></span></h3>
      <div class="bars">${months.map((m, i) => `<div class="col"><div class="pair"><div class="b" style="height:${fms[i].recebido / max * 100}%" title="${brl(fms[i].recebido)}"></div><div class="b out" style="height:${fms[i].saidas / max * 100}%" title="${brl(fms[i].saidas)}"></div></div><small>${monthName(m)}</small></div>`).join('')}</div>
      <p class="small muted" style="margin-top:8px">Receita recorrente (contratos ativos): <b style="color:var(--tx)">${brl(mrr())}</b>/mês</p></div>` : ''}
    <div class="card"><h3>${ic('cal')}Hoje<span class="sp"></span><a class="small" href="#agenda">agenda</a></h3>
      <div class="grid g3" style="grid-template-columns:repeat(3,1fr);gap:8px">
        ${kpi('Pendentes', tasks.length - done.length)}${kpi('Concluídas', done.length, '', 'g')}${kpi('Reuniões', meets.filter(t => t.date === d).length)}
      </div>
      <div style="margin-top:12px"><div class="row small"><span class="muted">Produtividade do dia</span><span class="sp"></span><b>${tasks.length ? Math.round(done.length / tasks.length * 100) : 0}%</b></div><div class="prog" style="margin-top:6px"><i style="width:${tasks.length ? done.length / tasks.length * 100 : 0}%"></i></div></div>
      <div class="row small" style="margin-top:12px;gap:16px;flex-wrap:wrap"><span class="muted">Reuniões no mês: <b style="color:var(--tx)">${meets.length}</b> (${meets.filter(t => t.status === 'feito').length} realizadas)</span><span class="muted">Publicações pendentes: <b style="color:var(--tx)">${contentPend.length}</b></span></div>
      ${weekChart()}
    </div>
  </div>
  <div class="sec">Equipe</div>
  <div class="grid g2">${team().map(p => { const tt = realTasks().filter(t => t.assignee === p.id && t.date === d); const dn = tt.filter(t => t.status === 'feito').length; return `<div class="card row">${avatar(p, 44)}<div class="sp"><b>${esc(p.name)}</b><div class="small muted">${isOnline(p) ? '<span style="color:var(--ok)">online agora</span>' : 'offline · ' + ago(p.last_seen)}</div><div class="prog" style="margin-top:8px"><i style="width:${tt.length ? dn / tt.length * 100 : 0}%"></i></div></div><b class="num">${dn}/${tt.length}</b></div>`; }).join('')}</div>`;
};
function weekChart() {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today(), i - 6));
  const vals = days.map(d => realTasks().filter(t => t.date === d && t.status === 'feito' && (isAdmin() || t.assignee === S.me.id)).length);
  const mx = Math.max(1, ...vals);
  return `<p class="small muted" style="margin-top:14px">Tarefas concluídas — últimos 7 dias</p><div class="bars" style="height:90px">${days.map((d, i) => `<div class="col"><div class="pair"><div class="b one" style="height:${vals[i] / mx * 100}%" title="${vals[i]}"></div></div><small>${new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'narrow' })}</small></div>`).join('')}</div>`;
}

/* ---------- CLIENTES ---------- */
V.clientes = () => {
  const f = S.cliFilter; let cl = S.d.clients.slice().sort((a, b) => a.name.localeCompare(b.name));
  const ativos = S.d.clients.filter(c => c.op_status !== 'cancelado').length;
  if (f === 'online') cl = cl.filter(c => adState(c).k === 'on');
  if (f === 'offline') cl = cl.filter(c => (c.services || []).includes('trafego') && adState(c).k !== 'on');
  if (f === 'inad') cl = cl.filter(c => clientFin(c) === 'inadimplente');
  if (f === 'cancel') cl = cl.filter(c => c.op_status === 'cancelado'); else if (f === 'todos') cl = cl.filter(c => c.op_status !== 'cancelado');
  const tabs = [['todos', 'Ativos'], ['online', 'Online'], ['offline', 'Offline'], ['inad', 'Inadimplentes'], ['cancel', 'Cancelados']];
  return head('Clientes', `${ativos} de ${S.set.max_clients} vagas usadas`, `${isAdmin() ? `<label class="btn" title="Importar planilha (ex.: Metrifiquei)">${ic('down')}<span class="hide-m">Importar</span><input type="file" accept=".csv,text/csv" data-act-change="importCsv" hidden></label>` : ''}<button class="btn pri" data-act="editClient">${ic('plus')}Cliente</button>`) +
    `<div class="tabs" style="margin-bottom:14px">${tabs.map(t => `<button data-act="cliFilter" data-f="${t[0]}" class="${f === t[0] ? 'on' : ''}">${t[1]}</button>`).join('')}</div>
    <div class="grid g3">${cl.length ? cl.map(c => `<div class="ccard" data-act="openClient" data-id="${c.id}">
      <div class="hd"><span class="av" style="background:linear-gradient(135deg,#1c5fe6,#0b1a3d)">${esc(initials(c.name))}</span><b>${esc(c.name)}</b>${adChip(c)}</div>
      <div class="row wrap" style="gap:6px">${(c.services || []).map(s => `<span class="chip blue">${esc(svcName(s))}</span>`).join('') || '<span class="muted small">Sem serviços</span>'}</div>
      <div class="ft"><span class="muted">${esc(c.segment || 'Segmento —')} · vence dia ${esc(c.due_day || '—')}</span>${canFin() ? `<b>${brl(c.contract_value)}</b>` : ''}</div>
      <div class="row">${canFin() ? finChip(clientFin(c)) : ''}<span class="chip">${esc((OP.find(o => o[0] === c.op_status) || ['', c.op_status])[1])}</span><span class="sp"></span><span class="small muted">${esc(firstName(c.owner))}</span></div>
    </div>`).join('') : `<div class="card" style="grid-column:1/-1">${empty(S.d.clients.length ? 'Nenhum cliente neste filtro.' : 'Cadastre seu primeiro cliente no botão “+ Cliente”.')}</div>`}</div>`;
};
function clientForm(c = {}) {
  const svcs = c.services || [];
  modal(c.id ? 'Editar cliente' : 'Novo cliente', `<div class="f">
    <input type="hidden" name="id" value="${esc(c.id || '')}">
    <div class="f2">${fld('Nome da empresa *', 'name', c.name, 'text', 'required maxlength="120"')}${fld('Responsável', 'contact', c.contact)}</div>
    <div class="f2">${fld('WhatsApp', 'whatsapp', c.whatsapp, 'tel', 'placeholder="(85) 9 9999-9999"')}${fld('Telefone', 'phone', c.phone, 'tel')}</div>
    <div class="f2">${fld('E-mail', 'email', c.email, 'email')}${fld('Instagram', 'instagram', c.instagram, 'text', 'placeholder="@perfil"')}</div>
    <div class="f2">${fld('Segmento', 'segment', c.segment)}${sel('Responsável interno', 'owner', teamOpts(), c.owner || S.me.id)}</div>
    <label class="fl">Serviços contratados<div class="cks">${SERVICES.map(s => `<label><input type="checkbox" name="services" value="${s[0]}" ${svcs.includes(s[0]) ? 'checked' : ''}>${s[1]}</label>`).join('')}</div></label>
    <div class="f2">${fld('Valor mensal do contrato (R$)', 'contract_value', c.contract_value, 'number', 'step="0.01" min="0"')}${fld('Dia de vencimento', 'due_day', c.due_day || 10, 'number', 'min="1" max="31"')}</div>
    <div class="f2">${fld('Data de contratação', 'start_date', c.start_date || today(), 'date')}${sel('Status operacional', 'op_status', OP, c.op_status || 'ativo')}</div>
    <div class="sec" style="margin:6px 0 0">Anúncios (Meta)</div>
    <div class="f2">${fld('ID da conta de anúncios', 'ad_account_id', c.ad_account_id, 'text', 'placeholder="act_123456789"')}${fld('Saldo na conta (R$) — manual', 'ad_balance', c.ad_balance, 'number', 'step="0.01" placeholder="deixe vazio se não souber"')}</div>
    ${sel('Situação da conta de anúncios', 'ad_account_status', [['', 'Não informado'], ['ativa', 'Ativa'], ['bloqueada', 'Bloqueada / restrita'], ['pagamento', 'Problema de pagamento']], c.ad_account_status)}
    <p class="note">Com a Meta conectada, saldo e situação são atualizados automaticamente e o registro manual é substituído pelos dados oficiais.</p>
    ${fld('ID do cliente no Asaas (opcional)', 'asaas_customer_id', c.asaas_customer_id, 'text', 'placeholder="cus_..."')}
    ${area('Observações', 'notes', c.notes)}
  </div>`, { form: 'saveClient', footer: `${c.id && isAdmin() ? `<button type="button" class="btn bad" data-act="delClient" data-id="${c.id}">${ic('trash')}</button><span class="sp"></span>` : ''}<button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">Salvar</button>` });
}
function clientDetail(id) {
  const c = client(id); if (!c) return;
  const inv = S.d.invoices.filter(i => i.client_id === id).sort((a, b) => b.due_date.localeCompare(a.due_date));
  const cs = campsOf(id); const acts = S.d.activity.filter(a => a.client_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 15);
  const wa = onlyDigits(c.whatsapp || c.phone);
  modal(c.name, `<div class="row wrap" style="gap:6px;margin-bottom:12px">${adChip(c)}${canFin() ? finChip(clientFin(c)) : ''}${(c.services || []).map(s => `<span class="chip blue">${esc(svcName(s))}</span>`).join('')}</div>
    <div class="grid g2" style="gap:10px">
      <div class="card"><h3>Contato</h3><div class="small" style="display:grid;gap:4px"><span>👤 ${esc(c.contact || '—')}</span><span>📱 ${esc(c.whatsapp || c.phone || '—')}</span><span>✉️ ${esc(c.email || '—')}</span><span>📷 ${esc(c.instagram || '—')}</span><span>🏷️ ${esc(c.segment || '—')}</span><span>🧑‍💼 Responsável: ${esc(pname(c.owner))}</span></div></div>
      <div class="card"><h3>Contrato</h3><div class="small" style="display:grid;gap:4px">${canFin() ? `<span>Valor: <b>${brl(c.contract_value)}</b>/mês</span>` : ''}<span>Vencimento: dia ${esc(c.due_day || '—')}</span><span>Desde: ${c.start_date ? new Date(c.start_date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</span><span>Conta de anúncios: ${esc(c.ad_account_id || '—')}</span><span>Saldo: ${c.ad_balance != null && c.ad_balance !== '' ? brl(c.ad_balance) + ` (${esc(c.ad_balance_source || 'manual')})` : 'não informado'}</span>${c.ad_synced_at ? `<span class="muted">Meta sincronizada ${ago(c.ad_synced_at)}</span>` : ''}</div></div>
    </div>
    <div class="sec">Campanhas</div>
    <div class="list">${cs.length ? cs.map(x => `<div class="li"><div class="t"><b>${esc(x.name)}</b><small>Investido ${brl(x.spend)} · ${int(x.leads)} leads · CTR ${pct(metrics(x).ctr)}</small></div>${campChip(x.status)}</div>`).join('') : empty('Sem campanhas registradas.')}</div>
    ${canFin() ? `<div class="sec">Cobranças</div><div class="list">${inv.length ? inv.slice(0, 8).map(i => `<div class="li"><div class="t"><b>${brl(i.amount)} · ${fdate(i.due_date)}</b><small>${esc(i.description || 'Mensalidade')}</small></div>${invChip(i)}</div>`).join('') : empty('Nenhuma cobrança.')}</div>` : ''}
    <div class="sec">Histórico de atividades</div>
    <div class="list">${acts.length ? acts.map(a => `<div class="li"><div class="t"><b style="font-weight:500">${esc(a.action)}</b><small>${esc(firstName(a.user_id))} · ${new Date(a.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</small></div></div>`).join('') : empty('Sem registros ainda.')}</div>
    <form data-form="clientNote" class="row" style="margin-top:10px"><input type="hidden" name="id" value="${c.id}"><input name="text" placeholder="Registrar atividade (ex.: liguei, enviei proposta)" maxlength="300"><button class="btn">Registrar</button></form>`,
    { wide: true, footer: `${wa ? `<a class="btn ok" href="https://wa.me/55${wa.replace(/^55/, '')}" target="_blank" rel="noopener">${ic('wa')}WhatsApp</a>` : ''}<button type="button" class="btn" data-act="clientReport" data-id="${c.id}">${ic('file')}Relatório</button><span class="sp"></span><button type="button" class="btn pri" data-act="editClient" data-id="${c.id}">${ic('edit')}Editar</button>` });
}

/* ---------- IMPORTAR CLIENTES (CSV do Metrifiquei ou planilha simples) ---------- */
function parseCsv(text) {
  text = text.replace(/^\uFEFF/, '');
  const first = text.split(/\r?\n/)[0]; const d = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true; else if (ch === d) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = (rows.shift() || []).map(h => h.trim().toLowerCase());
  return rows.filter(r => r.some(c => c.trim())).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
}
function csvToClients(rows) {
  const g = (r, ...ks) => { for (const k of ks) { const hit = Object.keys(r).find(h => h === k || h.startsWith(k)); if (hit && r[hit]) return r[hit]; } return ''; };
  const own = /bravus/i;
  return rows.map(r => {
    const raw = g(r, 'nome', 'empresa', 'cliente'); if (!raw) return null;
    const [a, b] = raw.includes('|') ? raw.split('|').map(x => x.trim()) : ['', raw];
    const canais = g(r, 'canais', 'canal'); const prod = g(r, 'produto', 'plano');
    const services = []; if (/meta|google|ads|tr[aá]fego/i.test(canais + ' ' + g(r, 'segmento') + ' ' + prod)) services.push('trafego');
    const valor = num(String(g(r, 'valor', 'mensalidade', 'contrato')).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.'));
    return { name: b || a, contact: b ? a : '', services, whatsapp: g(r, 'whatsapp', 'telefone', 'celular'), email: g(r, 'e-mail', 'email'),
      segment: g(r, 'ramo', 'nicho') || '', contract_value: valor || 0, due_day: num(g(r, 'vencimento', 'dia')) || null, op_status: 'ativo', owner: S.me.id,
      notes: [prod && `Plano: ${prod}`, canais && `Canais: ${canais}`, 'Importado da planilha'].filter(Boolean).join(' · '),
      _skip: /^sim$/i.test(g(r, 'arquivado')) ? 'arquivado' : own.test(b || a) ? 'é a própria agência' : S.d.clients.some(c => c.name.trim().toLowerCase() === (b || a).toLowerCase()) ? 'já cadastrado' : '' };
  }).filter(Boolean);
}
let IMPORT = [];
function importPreview(list) {
  IMPORT = list; const ok = list.filter(c => !c._skip); const free = S.set.max_clients - S.d.clients.filter(c => c.op_status !== 'cancelado').length;
  modal('Importar clientes', `<p class="small muted" style="margin-bottom:10px">${ok.length} cliente(s) serão cadastrados. Valor do contrato e dia de vencimento não vêm do Metrifiquei: complete depois em cada cliente.</p>
    <div class="list">${list.map(c => `<div class="li" style="${c._skip ? 'opacity:.45' : ''}"><div class="t"><b>${esc(c.name)}</b><small>${esc(c.contact || '—')} · ${c.services.map(svcName).join(', ') || 'sem serviço'}${c.contract_value ? ' · ' + brl(c.contract_value) : ''}</small></div>${c._skip ? `<span class="chip">${esc(c._skip)}</span>` : '<span class="chip ok">novo</span>'}</div>`).join('')}</div>
    ${ok.length > free ? `<p class="warnbox" style="margin-top:10px">Só cabem mais ${free} cliente(s) no limite atual. Aumente em Ajustes se precisar.</p>` : ''}`,
    { footer: `<button type="button" class="btn" data-act="closeModal">Cancelar</button><button type="button" class="btn pri" data-act="importDo" ${!ok.length || ok.length > free ? 'disabled' : ''}>${ic('check')}Importar ${ok.length}</button>` });
}

/* ---------- CAMPANHAS ---------- */
V.campanhas = () => {
  const f = S.campFilter; let cs = S.d.campaigns.slice();
  if (f !== 'todas') cs = cs.filter(c => f === 'problema' ? ['problema', 'sem_entrega'].includes(c.status) : c.status === f);
  cs.sort((a, b) => cname(a.client_id).localeCompare(cname(b.client_id)));
  const tot = cs.reduce((a, c) => ({ spend: a.spend + +c.spend, leads: a.leads + +c.leads, clicks: a.clicks + +c.clicks, impressions: a.impressions + +c.impressions }), { spend: 0, leads: 0, clicks: 0, impressions: 0 });
  const m = metrics(tot);
  const lastSync = S.d.clients.map(c => c.ad_synced_at).filter(Boolean).sort().pop();
  return head('Campanhas', `Ads Monitor · ${lastSync ? 'Meta sincronizada ' + ago(lastSync) : 'Meta ainda não conectada — registros manuais'}`,
    `<button class="btn" data-act="metaSync">${ic('sync')}<span class="hide-m">Sincronizar Meta</span></button><button class="btn pri" data-act="editCamp">${ic('plus')}Campanha</button>`) + `
    <div class="grid g4">${kpi('Investido', brl(tot.spend))}${kpi('Leads', int(tot.leads), `Custo/lead ${isFinite(m.cpl) ? brl(m.cpl) : '—'}`)}${kpi('CTR', pct(m.ctr), `CPC ${isFinite(m.cpc) ? brl(m.cpc) : '—'}`)}${kpi('CPM', isFinite(m.cpm) ? brl(m.cpm) : '—', `${int(tot.impressions)} impressões`)}</div>
    <div class="tabs" style="margin:16px 0 12px">${[['todas', 'Todas'], ['ativa', 'Ativas'], ['pausada', 'Pausadas'], ['problema', 'Com problema']].map(t => `<button data-act="campFilter" data-f="${t[0]}" class="${f === t[0] ? 'on' : ''}">${t[1]}</button>`).join('')}</div>
    <div class="card"><div class="tw"><table><thead><tr><th>Cliente / campanha</th><th>Status</th><th class="right">Investido</th><th class="right hide-m">Impr.</th><th class="right hide-m">Cliques</th><th class="right">CTR</th><th class="right hide-m">CPC</th><th class="right">Leads</th><th class="right">CPL</th><th></th></tr></thead><tbody>
    ${cs.length ? cs.map(c => { const x = metrics(c); return `<tr><td><b>${esc(c.name)}</b><div class="small muted">${esc(cname(c.client_id))} · ${c.source === 'meta' ? 'Meta' : 'manual'}${c.period ? ' · ' + esc(c.period) : ''}</div></td><td>${campChip(c.status)}</td><td class="right num">${brl(c.spend)}</td><td class="right num hide-m">${int(c.impressions)}</td><td class="right num hide-m">${int(c.clicks)}</td><td class="right num">${pct(x.ctr)}</td><td class="right num hide-m">${isFinite(x.cpc) ? brl(x.cpc) : '—'}</td><td class="right num">${int(c.leads)}</td><td class="right num">${isFinite(x.cpl) ? brl(x.cpl) : '—'}</td><td><button class="btn sm ic" data-act="editCamp" data-id="${c.id}">${ic('edit')}</button></td></tr>`; }).join('') : `<tr><td colspan="10">${empty('Nenhuma campanha. Sincronize com a Meta ou registre manualmente.')}</td></tr>`}
    </tbody></table></div></div>
    <p class="note" style="margin-top:10px">Saldo e situação das contas vêm somente da Meta (quando conectada) ou do que você registrar no cadastro do cliente — o app nunca estima saldo.</p>`;
};
function campForm(c = {}) {
  modal(c.id ? 'Editar campanha' : 'Nova campanha', `<div class="f"><input type="hidden" name="id" value="${esc(c.id || '')}">
    ${sel('Cliente *', 'client_id', S.d.clients.filter(x => x.op_status !== 'cancelado' || x.id === c.client_id).map(x => [x.id, x.name]), c.client_id, 'required')}
    <div class="f2">${fld('Nome da campanha *', 'name', c.name, 'text', 'required')}${sel('Status', 'status', CAMP_ST, c.status || 'ativa')}</div>
    <div class="f2">${fld('Orçamento diário (R$)', 'daily_budget', c.daily_budget, 'number', 'step="0.01"')}${fld('Período dos números', 'period', c.period || 'Últimos 30 dias')}</div>
    <div class="f2">${fld('Investido (R$)', 'spend', c.spend, 'number', 'step="0.01"')}${fld('Alcance', 'reach', c.reach, 'number')}</div>
    <div class="f2">${fld('Impressões', 'impressions', c.impressions, 'number')}${fld('Cliques', 'clicks', c.clicks, 'number')}</div>
    <div class="f2">${fld('Leads', 'leads', c.leads, 'number')}${fld('Conversões', 'conversions', c.conversions, 'number')}</div>
    ${c.source === 'meta' ? '<p class="infobox">Esta campanha vem da Meta. Edições manuais serão substituídas na próxima sincronização.</p>' : ''}
  </div>`, { form: 'saveCamp', footer: `${c.id && isAdmin() ? `<button type="button" class="btn bad" data-act="delCamp" data-id="${c.id}">${ic('trash')}</button><span class="sp"></span>` : ''}<button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">Salvar</button>` });
}

/* ---------- FINANCEIRO ---------- */
const invChip = i => { const s = invStatus(i); return `<span class="chip ${s === 'pago' ? 'ok' : s === 'atrasado' ? 'bad' : s === 'pendente' ? 'warn' : ''}">${s === 'pago' ? 'Pago' : s === 'atrasado' ? 'Atrasado' : s === 'pendente' ? 'A vencer' : 'Cancelado'}</span>`; };
V.financeiro = () => {
  const k = S.finMonth, fm = finMonth(k);
  const inv = S.d.invoices.filter(i => ym(i.due_date) === k || (invStatus(i) === 'atrasado')).sort((a, b) => a.due_date.localeCompare(b.due_date));
  const exp = S.d.expenses.filter(e => ym(e.date) === k).sort((a, b) => b.date.localeCompare(a.date));
  const label = (l => l[0].toUpperCase() + l.slice(1))(new Date(k + '-15T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
  const shift = n => { const d = new Date(k + '-15T12:00:00'); d.setMonth(d.getMonth() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
  return head('Financeiro', 'Bravus Finance · entradas, saídas e cobranças', isAdmin() ? `<button class="btn" data-act="genInvoices" data-m="${k}">${ic('sync')}<span class="hide-m">Gerar mensalidades</span></button><button class="btn pri" data-act="newInvoice">${ic('plus')}Cobrança</button>` : '') + `
    <div class="datebar" style="margin-bottom:14px"><button class="btn sm ic" data-act="finMonth" data-m="${shift(-1)}">${ic('left')}</button><b>${label}</b><button class="btn sm ic" data-act="finMonth" data-m="${shift(1)}">${ic('right')}</button></div>
    <div class="grid g4">${kpi('Entrou', brl(fm.recebido), 'confirmado', 'hl')}${kpi('A receber', brl(fm.aReceber), '', 'y')}${kpi('Atrasado (total)', brl(fm.atrasado), '', fm.atrasado ? 'r' : '')}${kpi('Saiu', brl(fm.saidas), `saldo do mês ${brl(fm.saldo)}`, fm.saidas ? 'r' : '')}</div>
    <div class="card" style="margin-top:14px"><h3>${ic('wallet')}Cobranças<span class="sp"></span><span class="small muted">${inv.length}</span></h3>
      <div class="list">${inv.length ? inv.map(i => { const c = client(i.client_id) || {}; const s = invStatus(i); return `<div class="li"><div class="t"><b>${esc(c.name || '—')} · ${brl(i.amount)}</b><small>${esc(i.description || 'Mensalidade')} · vence ${fdate(i.due_date)}${i.status === 'pago' ? ` · pago em ${fdate(i.paid_at)} (${esc(i.method || '')})` : ''}${i.asaas_id ? ' · Asaas' : ''}</small></div>${invChip(i)}
        ${isAdmin() && s !== 'pago' && s !== 'cancelado' ? `<button class="btn sm ok" data-act="payInvoice" data-id="${i.id}">${ic('check')}<span class="hide-m">Recebido</span></button><a class="btn sm ic" title="Cobrar no WhatsApp" href="${waCharge(i)}" target="_blank" rel="noopener" data-act="chargeWa" data-id="${i.id}">${ic('wa')}</a>${SUPA ? `<button class="btn sm ic" title="Gerar no Asaas" data-act="asaasCharge" data-id="${i.id}">${ic('send')}</button>` : ''}` : ''}
        ${isAdmin() ? `<button class="btn sm ic" data-act="editInvoice" data-id="${i.id}">${ic('edit')}</button>` : ''}</div>`; }).join('') : empty('Sem cobranças neste mês. Use “Gerar mensalidades” para criar a partir dos contratos.')}</div></div>
    <div class="card" style="margin-top:14px"><h3>${ic('down')}Saídas / despesas<span class="sp"></span>${isAdmin() ? `<button class="btn sm" data-act="newExpense">${ic('plus')}Despesa</button>` : ''}</h3>
      <div class="list">${exp.length ? exp.map(e => `<div class="li"><div class="t"><b>${esc(e.description)}</b><small>${esc(e.category || 'Geral')} · ${fdate(e.date)}</small></div><b class="num" style="color:var(--bad)">− ${brl(e.amount)}</b>${isAdmin() ? `<button class="btn sm ic" data-act="delExpense" data-id="${e.id}">${ic('trash')}</button>` : ''}</div>`).join('') : empty('Nenhuma despesa registrada no mês.')}</div></div>
    <p class="note" style="margin-top:10px">Uma cobrança só fica “Paga” com confirmação: pelo Asaas (automático) ou quando você confirmar que o dinheiro caiu na conta.</p>`;
};
function invoiceForm(i = {}) {
  modal(i.id ? 'Editar cobrança' : 'Nova cobrança', `<div class="f"><input type="hidden" name="id" value="${esc(i.id || '')}">
    ${sel('Cliente *', 'client_id', S.d.clients.map(c => [c.id, c.name]), i.client_id, 'required')}
    <div class="f2">${fld('Valor (R$) *', 'amount', i.amount, 'number', 'step="0.01" min="0.01" required')}${fld('Vencimento *', 'due_date', i.due_date || today(), 'date', 'required')}</div>
    ${fld('Descrição', 'description', i.description || 'Mensalidade')}
    ${i.id ? sel('Status', 'status', [['pendente', 'Pendente'], ['cancelado', 'Cancelado']].concat(i.status === 'pago' ? [['pago', 'Pago']] : []), i.status) : ''}
    ${fld('Link de pagamento (opcional)', 'payment_url', i.payment_url, 'url', 'placeholder="https://..."')}
  </div>`, { form: 'saveInvoice', footer: `${i.id ? `<button type="button" class="btn bad" data-act="delInvoice" data-id="${i.id}">${ic('trash')}</button><span class="sp"></span>` : ''}<button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">Salvar</button>` });
}

function waCharge(i) {
  const c = client(i.client_id) || {}; const s = invStatus(i);
  const msg = `Olá${c.contact ? ', ' + c.contact.split(' ')[0] : ''}! Tudo bem? Passando para lembrar ${s === 'atrasado' ? 'que a mensalidade com vencimento em ' + fdate(i.due_date) + ' ainda consta em aberto' : 'da mensalidade com vencimento em ' + fdate(i.due_date)}, no valor de ${brl(i.amount)}.${i.payment_url ? '\n\nLink para pagamento: ' + i.payment_url : ''}\n\nSe já pagou, por favor desconsidere. Obrigado! — Bravus Mídia`;
  const wa = onlyDigits(c.whatsapp || c.phone).replace(/^55/, '');
  return `https://wa.me/${wa ? '55' + wa : ''}?text=${encodeURIComponent(msg)}`;
}
/* ---------- AGENDA (Bravus Daily + Weekend) ---------- */
const KINDS = [['tarefa', 'Tarefa'], ['ligacao', 'Ligação'], ['reuniao', 'Reunião'], ['followup', 'Follow-up']];
const PRIO = [['alta', 'Alta'], ['media', 'Média'], ['baixa', 'Baixa']];
V.agenda = () => {
  const d = S.agendaDate, who = S.agendaWho || S.me.id;
  const dow = new Date(d + 'T12:00:00').getDay(); const wk = dow === 0 || dow === 6;
  let ts = realTasks().filter(t => t.date === d && (who === 'all' ? true : t.assignee === who));
  ts.sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
  const done = ts.filter(t => t.status === 'feito').length;
  const goals = ts.filter(t => t.goal);
  const late = realTasks().filter(t => isLate(t) && t.date < d && (who === 'all' || t.assignee === who));
  return head(wk ? 'Bravus Weekend' : 'Bravus Daily', wk ? 'Produção de conteúdo para a semana' : 'Rotina organizada automaticamente', `<button class="btn pri" data-act="newTask">${ic('plus')}Nova</button>`) + `
    <div class="row wrap" style="margin-bottom:14px;justify-content:space-between">
      <div class="datebar"><button class="btn sm ic" data-act="agDate" data-d="${addDays(d, -1)}">${ic('left')}</button><b>${d === today() ? 'Hoje' : esc(fdateL(d).split(',')[0])} · ${fdate(d)}</b><button class="btn sm ic" data-act="agDate" data-d="${addDays(d, 1)}">${ic('right')}</button>${d !== today() ? `<button class="btn sm" data-act="agDate" data-d="${today()}">Hoje</button>` : ''}</div>
      ${isAdmin() ? `<div class="tabs">${team().map(p => `<button data-act="agWho" data-w="${p.id}" class="${who === p.id ? 'on' : ''}">${esc(p.name.split(' ')[0])}</button>`).join('')}<button data-act="agWho" data-w="all" class="${who === 'all' ? 'on' : ''}">Todos</button></div>` : ''}
    </div>
    <div class="grid g3" style="margin-bottom:14px">${kpi('Concluídas', `${done}/${ts.length}`, `${ts.length ? Math.round(done / ts.length * 100) : 0}% do dia`, 'hl')}${goals.length ? goals.slice(0, 2).map(g => kpi(g.title.replace(/\(.*\)/, '').slice(0, 32), `${g.count || 0}/${g.goal}`, 'meta do dia', (g.count || 0) >= g.goal ? 'g' : '')).join('') : kpi('Reuniões', ts.filter(t => t.kind === 'reuniao').length, `a partir das ${S.set.meetings_start}`) + kpi('Ligações', ts.filter(t => t.kind === 'ligacao').length, `a partir das ${S.set.calls_start}`)}</div>
    ${late.length ? `<div class="warnbox" style="margin-bottom:12px">${late.length} tarefa(s) atrasada(s) de dias anteriores. <a href="#" data-act="showLate">Ver</a></div>` : ''}
    ${ts.length ? ts.map(taskRow).join('') : `<div class="card">${empty('Nada programado para este dia.')}</div>`}`;
};
function taskRow(t) {
  const late = isLate(t);
  return `<div class="task ${t.status === 'feito' ? 'done' : ''} ${late ? 'late' : ''}">
    <button class="ck" data-act="toggleTask" data-id="${t.id}" aria-label="Concluir">${t.status === 'feito' ? ic('check') : ''}</button>
    <span class="tm">${esc(t.time || '—')}</span>
    <div class="bd"><div class="tt">${esc(t.title)}</div>${t.description ? `<div class="small muted">${esc(t.description)}</div>` : ''}
      <div class="mt">${t.kind !== 'tarefa' ? `<span class="chip blue">${esc((KINDS.find(k => k[0] === t.kind) || ['', t.kind])[1])}</span>` : ''}${t.priority === 'alta' ? '<span class="chip bad">Alta</span>' : ''}${t.client_id ? `<span class="chip">${esc(cname(t.client_id))}</span>` : ''}${S.agendaWho === 'all' ? `<span class="chip">${esc(firstName(t.assignee))}</span>` : ''}${late ? '<span class="chip bad">Atrasada</span>' : ''}${t.template_id ? '<span class="chip">Rotina</span>' : ''}</div>
      ${t.goal ? `<div class="cnt"><button class="btn sm ic" data-act="cnt" data-id="${t.id}" data-v="-1">−</button><b>${t.count || 0} / ${t.goal}</b><button class="btn sm ic" data-act="cnt" data-id="${t.id}" data-v="1">+</button><button class="btn sm" data-act="cnt" data-id="${t.id}" data-v="5">+5</button><div class="prog sp"><i style="width:${Math.min(100, (t.count || 0) / t.goal * 100)}%"></i></div></div>` : ''}
    </div>
    <button class="btn sm ic" data-act="editTask" data-id="${t.id}" aria-label="Editar">${ic('edit')}</button></div>`;
}
function taskForm(t = {}, template = false) {
  const days = t.days || [1, 2, 3, 4, 5];
  modal(template ? (t.id ? 'Editar rotina' : 'Nova rotina recorrente') : (t.id ? 'Editar tarefa' : 'Nova tarefa'), `<div class="f">
    <input type="hidden" name="id" value="${esc(t.id || '')}"><input type="hidden" name="is_template" value="${template ? '1' : ''}">
    ${fld('Título *', 'title', t.title, 'text', 'required maxlength="160"')}
    <div class="f2">${sel('Tipo', 'kind', KINDS, t.kind || 'tarefa')}${sel('Prioridade', 'priority', PRIO, t.priority || 'media')}</div>
    <div class="f2">${template ? '' : fld('Data', 'date', t.date || S.agendaDate, 'date', 'required')}${fld('Horário', 'time', t.time || '', 'time')}</div>
    ${template ? `<label class="fl">Dias da semana<div class="cks">${['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((n, i) => `<label><input type="checkbox" name="days" value="${i}" ${days.includes(i) ? 'checked' : ''}>${n}</label>`).join('')}</div></label>` : ''}
    <div class="f2">${isAdmin() ? sel('Responsável', 'assignee', teamOpts(), t.assignee || (S.agendaWho !== 'all' && S.agendaWho) || S.me.id) : `<input type="hidden" name="assignee" value="${S.me.id}">`}${sel('Cliente', 'client_id', clientOpts(), t.client_id || '')}</div>
    <div class="f2">${fld('Meta (quantidade, opcional)', 'goal', t.goal || '', 'number', 'min="0" placeholder="ex.: 15"')}${sel('Avisar antes', 'remind_min', [[0, 'Na hora'], [5, '5 min'], [10, '10 min'], [15, '15 min'], [30, '30 min'], [60, '1 hora']], t.remind_min ?? S.set.remind_default)}</div>
    ${area('Descrição', 'description', t.description)}
    ${isAdmin() && !template ? `<label class="sw"><input type="checkbox" name="override"> Permitir horário fora da regra (reuniões antes das ${S.set.meetings_start})</label>` : ''}
    ${!template ? `<p class="note">Regras: ligações a partir das ${S.set.calls_start}; reuniões a partir das ${S.set.meetings_start}.</p>` : ''}
  </div>`, { form: 'saveTask', footer: `${t.id ? `<button type="button" class="btn bad" data-act="delTask" data-id="${t.id}">${ic('trash')}</button>${!template && t.date ? `<button type="button" class="btn" data-act="taskCal" data-id="${t.id}" title="Adicionar ao calendário">${ic('cal')}<span class="hide-m">Calendário</span></button>` : ''}<span class="sp"></span>` : ''}<button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">Salvar</button>` });
}

/* ---------- CONTEÚDO (calendário editorial) ---------- */
const CST = [['ideia', 'Ideia'], ['gravado', 'Gravado'], ['editado', 'Editado'], ['aprovacao', 'Aprovação'], ['agendado', 'Agendado'], ['publicado', 'Publicado']];
const CHN = [['reels', 'Reels'], ['feed', 'Feed'], ['stories', 'Stories'], ['youtube', 'YouTube'], ['shorts', 'Shorts']];
V.conteudo = () => {
  const start = S.contentWeek || (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(d); })();
  S.contentWeek = start; const end = addDays(start, 6);
  const items = S.d.content.filter(c => !c.date || (c.date >= start && c.date <= end) || c.status === 'ideia');
  return head('Conteúdo', 'Calendário editorial · prepare a semana no fim de semana', `<button class="btn pri" data-act="editContent">${ic('plus')}Conteúdo</button>`) + `
  <div class="datebar" style="margin-bottom:14px"><button class="btn sm ic" data-act="cWeek" data-d="${addDays(start, -7)}">${ic('left')}</button><b>${fdate(start)} – ${fdate(end)}</b><button class="btn sm ic" data-act="cWeek" data-d="${addDays(start, 7)}">${ic('right')}</button></div>
  <div class="kan">${CST.map(s => { const it = items.filter(c => c.status === s[0]).sort((a, b) => (a.date || '').localeCompare(b.date || '')); return `<div class="kcol"><h4>${s[1]}<span>${it.length}</span></h4>${it.map(c => `<div class="kit" data-act="editContent" data-id="${c.id}"><b>${esc(c.title)}</b><div class="row wrap" style="gap:4px"><span class="chip blue">${esc((CHN.find(x => x[0] === c.channel) || ['', c.channel || '—'])[1])}</span><span class="chip">${c.date ? fdate(c.date) : 'sem data'}</span></div><div class="small muted" style="margin-top:6px">${esc(cname(c.client_id))} · ${esc(firstName(c.assignee))}</div>${s[0] !== 'publicado' ? `<button class="btn sm" style="margin-top:8px;width:100%" data-act="cNext" data-id="${c.id}">${s[0] === 'aprovacao' && isAdmin() ? 'Aprovar →' : 'Avançar →'}</button>` : ''}</div>`).join('')}</div>`; }).join('')}</div>
  <p class="note" style="margin-top:10px">Nada é publicado automaticamente: tudo passa por “Aprovação” antes de ir ao ar.</p>`;
};
function contentForm(c = {}) {
  modal(c.id ? 'Editar conteúdo' : 'Novo conteúdo', `<div class="f"><input type="hidden" name="id" value="${esc(c.id || '')}">
    ${fld('Título / tema *', 'title', c.title, 'text', 'required maxlength="160"')}
    <div class="f2">${sel('Formato', 'channel', CHN, c.channel || 'reels')}${fld('Data de publicação', 'date', c.date || '', 'date')}</div>
    <div class="f2">${sel('Cliente', 'client_id', clientOpts('Bravus Mídia (próprio)'), c.client_id || '')}${sel('Responsável', 'assignee', teamOpts(), c.assignee || S.me.id)}</div>
    ${sel('Status', 'status', CST, c.status || 'ideia')}
    ${area('Roteiro / legenda / observações', 'notes', c.notes)}
  </div>`, { form: 'saveContent', footer: `${c.id ? `<button type="button" class="btn bad" data-act="delContent" data-id="${c.id}">${ic('trash')}</button><span class="sp"></span>` : ''}<button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">Salvar</button>` });
}

/* ---------- CHAT ---------- */
V.chat = () => {
  const ms = S.d.messages.slice().sort((a, b) => a.created_at.localeCompare(b.created_at)).slice(-200);
  let lastDay = '';
  return head('Chat da equipe', team().map(p => `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:12px"><i class="dot ${isOnline(p) ? 'on' : ''}"></i>${esc(p.name.split(' ')[0])} ${isOnline(p) ? 'online' : '· ' + ago(p.last_seen)}</span>`).join('')) + `
  <div class="card chat"><div class="msgs">${ms.length ? ms.map(m => { const day = (m.created_at || '').slice(0, 10); const sep = day !== lastDay ? `<div class="small muted" style="text-align:center;margin:6px 0">${new Date(m.created_at).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</div>` : ''; lastDay = day; const mine = m.user_id === S.me.id; return `${sep}<div class="msg ${mine ? 'me' : ''}">${mine ? '' : `<div class="au">${esc(firstName(m.user_id))}</div>`}${esc(m.text)}<small>${ftime(m.created_at)}</small></div>`; }).join('') : empty('Comece a conversa — anotações, recados e combinados ficam salvos aqui.')}</div>
  <form class="cbox" data-form="sendMsg"><textarea id="chatInput" name="text" placeholder="Mensagem ou anotação…" maxlength="4000" required></textarea><button class="btn pri ic" aria-label="Enviar">${ic('send')}</button></form></div>`;
};

/* ---------- EQUIPE ---------- */
V.equipe = () => {
  const d = today(); const wk = Array.from({ length: 7 }, (_, i) => addDays(d, -i));
  return head('Equipe', 'Bravus Team · produtividade e presença') + `<div class="grid g2">${team().map(p => {
    const mine = realTasks().filter(t => t.assignee === p.id);
    const td = mine.filter(t => t.date === d), tdn = td.filter(t => t.status === 'feito').length;
    const w = mine.filter(t => wk.includes(t.date)), wdn = w.filter(t => t.status === 'feito').length;
    const late = mine.filter(isLate).length;
    const goals = td.filter(t => t.goal);
    const acts = S.d.activity.filter(a => a.user_id === p.id).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6);
    return `<div class="card"><div class="row" style="margin-bottom:14px">${avatar(p, 48)}<div class="sp"><b style="font-size:16px">${esc(p.name)}</b><div class="small muted">${p.role === 'admin' ? 'Administrador' : 'Comercial · co-founder'} · ${isOnline(p) ? '<span style="color:var(--ok)">online agora</span>' : 'offline · último acesso ' + ago(p.last_seen)}</div></div></div>
      <div class="grid g3" style="grid-template-columns:repeat(3,1fr);gap:8px">${kpi('Hoje', `${tdn}/${td.length}`)}${kpi('Semana', w.length ? Math.round(wdn / w.length * 100) + '%' : '—')}${kpi('Atrasadas', late, '', late ? 'r' : 'g')}</div>
      ${goals.map(g => `<div style="margin-top:10px"><div class="row small"><span>${esc(g.title)}</span><span class="sp"></span><b>${g.count || 0}/${g.goal}</b></div><div class="prog" style="margin-top:4px"><i style="width:${Math.min(100, (g.count || 0) / g.goal * 100)}%"></i></div></div>`).join('')}
      <div class="sec" style="margin-top:16px">Atividades recentes</div><div class="list">${acts.length ? acts.map(a => `<div class="li"><div class="t"><b style="font-weight:500">${esc(a.action)}</b><small>${ago(a.created_at)}</small></div></div>`).join('') : empty('Sem atividades.')}</div></div>`;
  }).join('')}</div>`;
};

/* ---------- ALERTAS ---------- */
V.alertas = () => {
  const ns = S.d.notifications.filter(n => n.user_id === S.me.id).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 100);
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  return head('Alertas', 'Bravus Notify', `<button class="btn" data-act="readAll">${ic('check')}<span class="hide-m">Marcar lidas</span></button>`) + `
    ${perm !== 'granted' ? `<div class="infobox row" style="margin-bottom:14px"><div class="sp">${perm === 'unsupported' ? 'Este navegador não suporta notificações. No iPhone, instale o app na Tela de Início (Compartilhar → Adicionar à Tela de Início) e abra por lá.' : perm === 'denied' ? 'As notificações estão bloqueadas neste aparelho. Libere nas configurações do navegador para este site.' : 'Ative as notificações para receber lembretes no celular e no computador.'}</div>${perm === 'default' ? `<button class="btn pri" data-act="enablePush">${ic('bell')}Ativar</button>` : ''}</div>` : `<div class="row small muted" style="margin-bottom:12px">${ic('bell')}Notificações ativas neste aparelho. <button class="btn sm" data-act="testPush">Testar</button></div>`}
    <div class="card"><div class="list">${ns.length ? ns.map(n => `<a class="li" href="#${esc(n.route || 'painel')}" data-act="readOne" data-id="${n.id}" style="${n.read ? 'opacity:.55' : ''}"><i class="dot ${n.type === 'alerta' ? 'bad' : n.type === 'pago' ? 'on' : n.read ? '' : 'warn'}"></i><div class="t"><b>${esc(n.title)}</b><small>${esc(n.body || '')} · ${ago(n.created_at)}</small></div></a>`).join('') : empty('Nenhum alerta por enquanto.')}</div></div>
    <p class="note" style="margin-top:10px">Lembretes no horário exato dependem do sistema do aparelho. Com o app fechado, os avisos chegam pelo servidor (Supabase + push) quando estiver configurado.</p>`;
};

/* ---------- RELATÓRIOS ---------- */
V.relatorios = () => head('Relatórios', 'Bravus Reports · por cliente, prontos para PDF e WhatsApp') + `
  <div class="grid g3">${S.d.clients.filter(c => (c.services || []).includes('trafego')).map(c => { const cs = campsOf(c.id); const sp = cs.reduce((a, x) => a + +x.spend, 0); const ld = cs.reduce((a, x) => a + +x.leads, 0); return `<div class="ccard" data-act="clientReport" data-id="${c.id}"><div class="hd"><b>${esc(c.name)}</b>${ic('file')}</div><div class="row small muted"><span>${brl(sp)} investidos</span><span class="sp"></span><span>${int(ld)} leads</span></div></div>`; }).join('') || `<div class="card" style="grid-column:1/-1">${empty('Cadastre clientes com o serviço de tráfego pago para gerar relatórios.')}</div>`}</div>`;
function clientReport(id) {
  const c = client(id); if (!c) return; const cs = campsOf(id);
  const t = cs.reduce((a, x) => { ['spend', 'reach', 'impressions', 'clicks', 'leads', 'conversions'].forEach(k => a[k] += +x[k] || 0); return a; }, { spend: 0, reach: 0, impressions: 0, clicks: 0, leads: 0, conversions: 0 });
  const m = metrics(t); const period = cs[0] && cs[0].period || 'Período atual';
  const rows = [['Investimento', brl(t.spend)], ['Alcance', int(t.reach)], ['Impressões', int(t.impressions)], ['Cliques', int(t.clicks)], ['CTR', pct(m.ctr)], ['CPC', isFinite(m.cpc) ? brl(m.cpc) : '—'], ['CPM', isFinite(m.cpm) ? brl(m.cpm) : '—'], ['Leads', int(t.leads)], ['Custo por lead', isFinite(m.cpl) ? brl(m.cpl) : '—'], ['Conversões', int(t.conversions)]];
  const html = `<div class="report printable" style="border-radius:12px">
    <div style="display:flex;align-items:center;gap:12px;border-bottom:3px solid #1c5fe6;padding-bottom:14px;margin-bottom:18px"><img src="icons/icon.svg" width="44" height="44" alt=""><div><div style="font-weight:800;letter-spacing:.12em">BRAVUS MÍDIA</div><div style="font-size:12px;color:#5b6478">Relatório de resultados · ${esc(period)}</div></div></div>
    <h2 style="font-size:22px;margin-bottom:4px">${esc(c.name)}</h2><p style="color:#5b6478;font-size:13px;margin-bottom:16px">Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px">${rows.map(r => `<div style="border:1px solid #dde3ee;border-radius:10px;padding:10px 12px"><div style="font-size:11px;color:#5b6478;text-transform:uppercase;letter-spacing:.05em">${r[0]}</div><div style="font-size:20px;font-weight:700;color:#0b1020">${r[1]}</div></div>`).join('')}</div>
    <h3 style="margin:20px 0 8px;font-size:15px">Campanhas</h3>
    <table style="color:#0b1020"><thead><tr><th style="color:#5b6478">Campanha</th><th style="color:#5b6478;text-align:right">Investido</th><th style="color:#5b6478;text-align:right">Leads</th><th style="color:#5b6478;text-align:right">CPL</th></tr></thead><tbody>${cs.map(x => { const mm = metrics(x); return `<tr><td style="border-color:#e6eaf2">${esc(x.name)}</td><td style="text-align:right;border-color:#e6eaf2">${brl(x.spend)}</td><td style="text-align:right;border-color:#e6eaf2">${int(x.leads)}</td><td style="text-align:right;border-color:#e6eaf2">${isFinite(mm.cpl) ? brl(mm.cpl) : '—'}</td></tr>`; }).join('') || '<tr><td colspan="4">Sem campanhas registradas.</td></tr>'}</tbody></table>
    <p style="margin-top:20px;font-size:11px;color:#8a93a6">Dados ${cs.some(x => x.source === 'meta') ? 'obtidos da Meta Ads (Marketing API)' : 'registrados pela equipe Bravus'}. Bravus Mídia · @bravusmidia</p></div>`;
  const msg = `Olá${c.contact ? ', ' + c.contact.split(' ')[0] : ''}! Segue o resumo dos seus anúncios (${period}):\n\n💰 Investimento: ${brl(t.spend)}\n👀 Alcance: ${int(t.reach)}\n🖱️ Cliques: ${int(t.clicks)} (CTR ${pct(m.ctr)})\n🎯 Leads: ${int(t.leads)}\n📉 Custo por lead: ${isFinite(m.cpl) ? brl(m.cpl) : '—'}\n\nQualquer dúvida, estou à disposição!\nBravus Mídia`;
  const wa = onlyDigits(c.whatsapp || c.phone).replace(/^55/, '');
  modal('Relatório — ' + c.name, html, { wide: true, footer: `<a class="btn ok" ${wa ? `href="https://wa.me/55${wa}?text=${encodeURIComponent(msg)}"` : `href="https://wa.me/?text=${encodeURIComponent(msg)}"`} target="_blank" rel="noopener">${ic('wa')}Enviar resumo</a><span class="sp"></span><button type="button" class="btn pri" data-act="print">${ic('down')}Salvar PDF</button>` });
}

/* ---------- BOAS PRÁTICAS (Compliance) ---------- */
V['boas-praticas'] = () => {
  const probs = S.d.clients.filter(c => adState(c).k === 'prob');
  const B = (t, items) => `<div class="card"><h3>${ic('shield')}${t}</h3><ul style="padding-left:18px;display:grid;gap:7px;font-size:14px;color:var(--tx2)">${items.map(i => `<li>${i}</li>`).join('')}</ul></div>`;
  return head('Boas práticas', 'Bravus Compliance · Meta, Instagram e WhatsApp') + `
  <div class="warnbox" style="margin-bottom:14px">Seguir estas práticas reduz riscos, mas nenhuma ferramenta garante imunidade contra bloqueios. A palavra final é sempre das políticas oficiais de cada plataforma.</div>
  ${probs.length ? `<div class="card" style="margin-bottom:14px;border-color:rgba(255,90,106,.4)"><h3>Contas com alerta agora</h3><div class="list">${probs.map(c => `<div class="li" data-act="openClient" data-id="${c.id}" style="cursor:pointer"><div class="t"><b>${esc(c.name)}</b><small>Situação: ${esc(c.ad_account_status || 'campanha com problema')}</small></div>${adChip(c)}</div>`).join('')}</div></div>` : ''}
  <div class="grid g2">
  ${B('Anúncios na Meta', ['Nada de promessas de resultado garantido, “antes e depois” enganoso ou ganhos financeiros irreais.', 'Evite falar de características pessoais do público (“Você está acima do peso?”) — é uma das reprovações mais comuns.', 'Saúde, finanças, apostas, álcool e temas sociais/políticos têm regras e autorizações próprias.', 'A página de destino precisa cumprir o que o anúncio promete, funcionar no celular e ter política de privacidade.', 'Não use logos e marcas de terceiros sem autorização.', 'Revise o texto das imagens e evite elementos que imitem botões ou notificações do sistema.'])}
  ${B('Saúde das contas de anúncios', ['Use Business Manager com verificação da empresa e autenticação em dois fatores para todos.', 'Mantenha formas de pagamento válidas e em nome do responsável; falhas de pagamento travam a entrega.', 'Escale orçamento aos poucos em contas novas.', 'Cada cliente com sua própria conta de anúncios e acesso concedido pelo próprio cliente (parceiro no BM).', 'Quando houver reprovação, peça revisão pelo canal oficial — não recrie o mesmo anúncio em massa.'])}
  ${B('Instagram (rotina da Priscila)', ['Seguir e deixar de seguir sempre de forma manual e em ritmo natural, distribuído ao longo do dia.', 'Nada de apps ou robôs de seguir/curtir/comentar em massa — violam os termos e derrubam o alcance.', 'Interaja de verdade: comente e responda com conteúdo relevante.', 'Ao receber aviso de “ação bloqueada”, pare as ações por alguns dias.'])}
  ${B('WhatsApp Business', ['Envie mensagens só para quem deu permissão (cliente ativo ou contato que pediu informação).', 'Na API oficial, mensagens fora da janela de 24h só com modelos aprovados.', 'Ofereça uma forma simples de a pessoa parar de receber mensagens.', 'Evite disparos em massa por números pessoais; isso leva a banimento.', 'Cobranças: tom respeitoso, com dados corretos e link oficial de pagamento.'])}
  ${B('Segurança e dados (LGPD)', ['Cada pessoa tem login próprio — nunca compartilhe a senha.', 'Tokens da Meta, Asaas e WhatsApp ficam só no servidor (Supabase), nunca no app ou no GitHub.', 'Colete só os dados necessários dos clientes e apague o que não usa mais.', 'Faça backup mensal em Ajustes > Backup.'])}
  </div>`;
};

/* ---------- AJUSTES ---------- */
V.ajustes = () => {
  const s = S.set; const tpls = S.d.tasks.filter(t => t.is_template).sort((a, b) => firstName(a.assignee).localeCompare(firstName(b.assignee)) || (a.time || '').localeCompare(b.time || ''));
  const DN = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const integ = (n, st, how) => `<div class="li"><div class="t"><b>${n}</b><small>${how}</small></div><span class="chip ${st ? 'ok' : ''}">${st ? 'Conectado' : 'Pendente'}</span></div>`;
  const metaOn = S.d.clients.some(c => c.ad_synced_at); const asaasOn = S.d.invoices.some(i => i.asaas_id);
  return head('Ajustes', 'Somente o administrador vê esta tela') + `
  <form class="card f" data-form="saveSettings"><h3>${ic('gear')}Operação</h3>
    <div class="f2">${fld('Nome da agência', 'agency_name', s.agency_name)}${fld('Limite de clientes', 'max_clients', s.max_clients, 'number', 'min="1" max="500"')}</div>
    <div class="f2">${fld('Ligações a partir de', 'calls_start', s.calls_start, 'time')}${fld('Reuniões a partir de', 'meetings_start', s.meetings_start, 'time')}</div>
    <div class="f2">${fld('Meta diária de prospecção', 'prospect_goal', s.prospect_goal, 'number')}${fld('Meta diária de follow-ups (Priscila)', 'followup_goal', s.followup_goal, 'number')}</div>
    <div class="f2">${fld('Priscila — início', 'priscila_start', s.priscila_start, 'time')}${fld('Priscila — fim', 'priscila_end', s.priscila_end, 'time')}</div>
    <div class="f2">${fld('Aviso de bom dia às', 'morning_hour', s.morning_hour, 'time')}${fld('Bloquear após (min sem uso)', 'lock_minutes', s.lock_minutes, 'number', 'min="1" max="120"')}</div>
    ${fld('Lembretes de cobrança (dias em relação ao vencimento)', 'reminder_offsets', (s.reminder_offsets || []).join(', '), 'text', 'placeholder="-5, -2, 0, 1, 5, 10"')}
    <p class="note">Negativo = antes do vencimento · 0 = no dia · positivo = depois.</p>
    <label class="sw"><input type="checkbox" name="priscila_finance" ${s.priscila_finance ? 'checked' : ''}> Priscila pode ver o financeiro</label>
    <div class="sec" style="margin:4px 0 0">Tipos de notificação</div>
    <div class="cks">${[['tarefas', 'Tarefas e reuniões'], ['financeiro', 'Cobranças'], ['campanhas', 'Campanhas'], ['conteudo', 'Conteúdo'], ['chat', 'Chat']].map(n => `<label><input type="checkbox" name="nf_${n[0]}" ${(s.notify || {})[n[0]] !== false ? 'checked' : ''}>${n[1]}</label>`).join('')}</div>
    <div><button class="btn pri">Salvar ajustes</button></div>
  </form>
  <div class="card" style="margin-top:14px"><h3>${ic('cal')}Rotinas automáticas (Daily e Weekend)<span class="sp"></span><button class="btn sm" data-act="newTemplate">${ic('plus')}Rotina</button></h3>
    <div class="list">${tpls.map(t => `<div class="li"><span class="tm num" style="color:var(--blue2);font-weight:700;width:46px">${esc(t.time || '—')}</span><div class="t"><b>${esc(t.title)}</b><small>${esc(firstName(t.assignee))} · ${DN.map((n, i) => (t.days || []).includes(i) ? `<b style="color:var(--tx)">${n}</b>` : `<span style="opacity:.35">${n}</span>`).join(' ')}${t.goal ? ' · meta ' + t.goal : ''}</small></div><button class="btn sm ic" data-act="editTemplate" data-id="${t.id}">${ic('edit')}</button></div>`).join('') || empty('Sem rotinas.')}</div>
    <p class="note" style="margin-top:8px">As tarefas do dia são criadas automaticamente a partir destas rotinas. Mudanças valem a partir do próximo dia gerado.</p></div>
  <div class="card" style="margin-top:14px"><h3>${ic('sync')}Integrações oficiais</h3><div class="list">
    ${integ('Banco de dados (Supabase)', SUPA, SUPA ? 'Dados na nuvem, criptografados e com backup diário do Supabase.' : 'Modo local: dados só neste aparelho. Siga o README para conectar.')}
    ${integ('Meta Ads (Marketing API)', metaOn, 'Campanhas, métricas, saldo e situação das contas. Token fica no servidor.')}
    ${integ('Asaas', asaasOn, 'Cobranças, assinaturas e baixa automática por webhook.')}
    ${integ('Push com app fechado', !!CFG.VAPID_PUBLIC_KEY && SUPA, 'Chaves VAPID + função send-push no Supabase.')}
    ${integ('WhatsApp Business Platform', false, 'Hoje: botões que abrem o WhatsApp com a mensagem pronta. API oficial: próxima etapa (exige modelos aprovados).')}
    ${integ('Google Calendar / iPhone / Android', true, 'Botão “Calendário” em cada tarefa gera o evento (.ics) compatível com todos.')}
    ${integ('Instagram, RD Station, ClickUp', false, 'Preparados para a próxima etapa; enquanto isso, registro manual.')}
  </div></div>
  <div class="card" style="margin-top:14px"><h3>${ic('down')}Backup</h3><div class="row wrap"><button class="btn" data-act="backup">${ic('down')}Baixar backup (JSON)</button>${!SUPA ? `<label class="btn">Restaurar backup<input type="file" accept="application/json" data-act-change="restore" hidden></label>` : ''}</div><p class="note" style="margin-top:8px">O backup contém dados de clientes: guarde em local seguro (ex.: pasta privada no Drive).</p></div>
  <div class="card" style="margin-top:14px"><h3>${ic('users')}Equipe</h3><div class="list">${team().map(p => `<div class="li">${avatar(p)}<div class="t"><b>${esc(p.name)}</b><small>${p.role === 'admin' ? 'Administrador' : 'Comercial / co-founder'}${p.email ? ' · ' + esc(p.email) : ''}</small></div>${!SUPA || p.id === S.me.id ? `<button class="btn sm" data-act="changePin" data-id="${p.id}">Trocar senha</button>` : ''}</div>`).join('')}</div>
  ${SUPA ? '<p class="note" style="margin-top:8px">Novos usuários são criados no painel do Supabase (Authentication → Add user) — veja o README.</p>' : ''}</div>
  <p class="note" style="margin-top:14px;text-align:center">Bravus Work v${VERSION} · ${SUPA ? 'Supabase' : 'modo local'}</p>`;
};

/* =====================================================================
   AÇÕES (cliques)
   ===================================================================== */
const A = {
  closeModal, reload: () => location.reload(), logout: () => logout(),
  pin: d => { if (!SUPA && !AUTH.user) return toast('Escolha seu usuário primeiro', '', 'warn'); if (AUTH.pin.length < 6) { AUTH.pin += d.n; renderAuth(); if (AUTH.pin.length === 6) setTimeout(tryLogin, 80); } },
  pinBack: () => { AUTH.pin = AUTH.pin.slice(0, -1); renderAuth(); }, pinClear: () => { AUTH.pin = ''; renderAuth(); },
  authPick: d => { AUTH.user = d.id; AUTH.pin = ''; renderAuth(); },
  authChangeEmail: () => { AUTH.stage = 'email'; AUTH.pin = ''; renderAuth(); },
  moreMenu: () => modal('Menu', `<div class="list">${NAV.filter(navOk).map(n => `<a class="li" href="#${n[0]}" data-act="closeModal">${ic(n[2])}<div class="t"><b>${n[1]}</b></div>${n[0] === 'alertas' && unread() ? `<span class="badge">${unread()}</span>` : ''}</a>`).join('')}<button class="li" data-act="logout" style="width:100%">${ic('lock')}<div class="t" style="text-align:left"><b>Bloquear / sair</b></div></button></div>`),
  cliFilter: d => { S.cliFilter = d.f; renderView(); }, campFilter: d => { S.campFilter = d.f; renderView(); },
  importDo: async (d, el) => {
    el.disabled = true; let n = 0;
    for (const c of IMPORT.filter(c => !c._skip)) { const { _skip, ...row } = c; const r = await store.insert('clients', row); n++; await log(`Importou o cliente ${row.name}`, r && r.id); }
    closeModal(); toast(`${n} cliente(s) importado(s)`, 'Complete valor e vencimento de cada um.', 'ok'); S.cliFilter = 'todos'; await refresh();
  },
  editClient: d => { if (!d.id && S.d.clients.filter(c => c.op_status !== 'cancelado').length >= S.set.max_clients) return toast('Limite de clientes atingido', `Seu espaço comporta ${S.set.max_clients} clientes. Aumente em Ajustes.`, 'warn'); clientForm(d.id ? client(d.id) : {}); },
  openClient: d => clientDetail(d.id),
  delClient: d => confirmBox('Excluir cliente?', 'Isto apaga o cliente, as campanhas e as cobranças ligadas a ele. Para manter o histórico, prefira marcar como “Cancelado”.', 'Excluir', async () => {
    const c = client(d.id); for (const t of ['campaigns', 'invoices']) for (const r of S.d[t].filter(x => x.client_id === d.id)) await store.remove(t, r.id);
    await store.remove('clients', d.id); await log(`Excluiu o cliente ${c && c.name}`); toast('Cliente excluído', '', 'ok'); await refresh(); }, true),
  clientReport: d => clientReport(d.id), print: () => EMBED ? toast('Disponível no app publicado', 'Na versão instalada, este botão salva o relatório em PDF.', 'warn') : window.print(),
  editCamp: d => { if (!S.d.clients.length) return toast('Cadastre um cliente primeiro', '', 'warn'); campForm(d.id ? S.d.campaigns.find(c => c.id === d.id) : {}); },
  delCamp: d => confirmBox('Excluir campanha?', 'Esta ação não pode ser desfeita.', 'Excluir', async () => { await store.remove('campaigns', d.id); await refresh(); }, true),
  metaSync: async (d, el) => {
    el.disabled = true;
    try { const r = await store.invoke('meta-sync'); toast('Meta sincronizada', `${r.accounts || 0} contas · ${r.campaigns || 0} campanhas`, 'ok'); await log('Sincronizou a Meta Ads'); await refresh(); }
    catch (e) { toast('Não foi possível sincronizar', e.message, 'warn'); }
    el.disabled = false;
  },
  finMonth: d => { S.finMonth = d.m; renderView(); },
  newInvoice: () => { if (!S.d.clients.length) return toast('Cadastre um cliente primeiro', '', 'warn'); invoiceForm({}); },
  editInvoice: d => invoiceForm(S.d.invoices.find(i => i.id === d.id)),
  delInvoice: d => confirmBox('Excluir cobrança?', 'Prefira “Cancelado” para manter o histórico.', 'Excluir', async () => { await store.remove('invoices', d.id); await refresh(); }, true),
  genInvoices: async d => {
    const k = d.m; let n = 0;
    for (const c of S.d.clients.filter(c => c.op_status !== 'cancelado' && +c.contract_value > 0)) {
      if (S.d.invoices.some(i => i.client_id === c.id && ym(i.due_date) === k && /mensalidade/i.test(i.description || ''))) continue;
      const [y, m] = k.split('-').map(Number); const last = new Date(y, m, 0).getDate();
      const due = `${k}-${pad(Math.min(+c.due_day || 10, last))}`;
      await store.insert('invoices', { client_id: c.id, amount: +c.contract_value, due_date: due, description: `Mensalidade ${monthName(k)}/${y}`, status: 'pendente' }); n++;
    }
    await log(`Gerou ${n} mensalidade(s) de ${k}`); toast(n ? `${n} mensalidade(s) criada(s)` : 'Tudo já estava gerado', '', 'ok'); await refresh();
  },
  payInvoice: d => {
    const i = S.d.invoices.find(x => x.id === d.id);
    modal('Confirmar recebimento', `<div class="f"><input type="hidden" name="id" value="${i.id}"><p><b>${esc(cname(i.client_id))}</b> · ${brl(i.amount)}</p>
      <div class="f2">${fld('Data do pagamento', 'paid_at', today(), 'date', 'required')}${sel('Forma', 'method', ['Pix', 'Boleto', 'Cartão', 'Transferência', 'Dinheiro'])}</div>
      <label class="sw"><input type="checkbox" name="confirm" required> Confirmo que o valor entrou na conta</label></div>`, { form: 'confirmPay', footer: `<button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn ok">${ic('check')}Confirmar</button>` });
  },
  chargeWa: d => { const i = S.d.invoices.find(x => x.id === d.id); log('Abriu lembrete de cobrança no WhatsApp', i && i.client_id); },
  asaasCharge: async (d, el) => { el.disabled = true; try { const r = await store.invoke('asaas-charge', { invoice_id: d.id }); toast('Cobrança criada no Asaas', r.invoiceUrl || '', 'ok'); await refresh(); } catch (e) { toast('Asaas', e.message, 'warn'); } el.disabled = false; },
  newExpense: () => modal('Nova despesa', `<div class="f">${fld('Descrição *', 'description', '', 'text', 'required')}<div class="f2">${fld('Valor (R$) *', 'amount', '', 'number', 'step="0.01" min="0.01" required')}${fld('Data', 'date', today(), 'date', 'required')}</div>${sel('Categoria', 'category', ['Ferramentas', 'Equipe', 'Impostos', 'Anúncios próprios', 'Equipamentos', 'Outros'])}</div>`, { form: 'saveExpense', footer: `<button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">Salvar</button>` }),
  delExpense: d => confirmBox('Excluir despesa?', 'Esta ação não pode ser desfeita.', 'Excluir', async () => { await store.remove('expenses', d.id); await refresh(); }, true),
  newTask: () => taskForm({}), editTask: d => taskForm(S.d.tasks.find(t => t.id === d.id)),
  newTemplate: () => taskForm({}, true), editTemplate: d => taskForm(S.d.tasks.find(t => t.id === d.id), true),
  delTask: d => confirmBox('Excluir?', 'Esta ação não pode ser desfeita.', 'Excluir', async () => { await store.remove('tasks', d.id); await refresh(); }, true),
  toggleTask: async d => {
    const t = S.d.tasks.find(x => x.id === d.id); const done = t.status !== 'feito';
    Object.assign(t, { status: done ? 'feito' : 'pendente', done_at: done ? new Date().toISOString() : null }); renderView();
    await store.update('tasks', t.id, { status: t.status, done_at: t.done_at });
    if (done) log(`Concluiu: ${t.title}`, t.client_id);
  },
  cnt: async d => {
    const t = S.d.tasks.find(x => x.id === d.id); t.count = Math.max(0, (t.count || 0) + +d.v); renderView();
    await store.update('tasks', t.id, { count: t.count });
    if (t.goal && t.count >= t.goal && t.status !== 'feito') { t.status = 'feito'; t.done_at = new Date().toISOString(); await store.update('tasks', t.id, { status: 'feito', done_at: t.done_at }); toast('Meta batida! 🎯', t.title, 'ok'); log(`Bateu a meta: ${t.title} (${t.count})`); renderView(); }
  },
  agDate: async d => { S.agendaDate = d.d; if (d.d >= today() && d.d <= addDays(today(), 7)) await ensureRoutine(d.d); renderView(); },
  agWho: d => { S.agendaWho = d.w; renderView(); },
  showLate: () => modal('Tarefas atrasadas', realTasks().filter(t => isLate(t) && t.date < S.agendaDate && (S.agendaWho === 'all' || t.assignee === S.agendaWho)).sort((a, b) => b.date.localeCompare(a.date)).map(t => taskRow(t).replace('<span class="tm">', `<span class="tm" title="${fdate(t.date)}">${fdate(t.date)}<br>`)).join('') || empty('Nada atrasado.'), { wide: true }),
  taskCal: d => {
    const t = S.d.tasks.find(x => x.id === d.id); const dt = (t.date || today()).replace(/-/g, ''); const tm = (t.time || '09:00').replace(':', '') + '00';
    const [h, m] = (t.time || '09:00').split(':').map(Number); const e = new Date(2000, 0, 1, h, m + 30); const tmE = `${pad(e.getHours())}${pad(e.getMinutes())}00`;
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Bravus Work//PT-BR', 'BEGIN:VEVENT', `UID:${t.id}@bravuswork`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`, `DTSTART;TZID=America/Fortaleza:${dt}T${tm}`, `DTEND;TZID=America/Fortaleza:${dt}T${tmE}`, `SUMMARY:${t.title.replace(/[,;\n]/g, ' ')}`, `DESCRIPTION:${(t.description || '').replace(/[,;\n]/g, ' ')}`, 'BEGIN:VALARM', `TRIGGER:-PT${t.remind_min || 10}M`, 'ACTION:DISPLAY', 'DESCRIPTION:Lembrete', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    if (!EMBED) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = 'bravus-work-tarefa.ics'; a.click(); }
    const g = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(t.title)}&dates=${dt}T${tm}/${dt}T${tmE}&ctz=America/Fortaleza&details=${encodeURIComponent(t.description || '')}`;
    const ga = document.createElement('a'); ga.href = g; ga.target = '_blank'; ga.rel = 'noopener'; document.body.appendChild(ga); ga.click(); ga.remove();
    toast('Evento enviado ao calendário', EMBED ? 'Google Agenda aberto em nova aba.' : 'Abra o arquivo .ics para adicionar no iPhone/Android.');
  },
  editContent: d => contentForm(d.id ? S.d.content.find(c => c.id === d.id) : {}),
  delContent: d => confirmBox('Excluir conteúdo?', 'Esta ação não pode ser desfeita.', 'Excluir', async () => { await store.remove('content', d.id); await refresh(); }, true),
  cNext: async (d, el, ev) => {
    const c = S.d.content.find(x => x.id === d.id); const i = CST.findIndex(s => s[0] === c.status);
    if (c.status === 'aprovacao' && !isAdmin()) return toast('Aguardando aprovação do Andrade', '', 'warn');
    const next = CST[Math.min(i + 1, CST.length - 1)][0]; c.status = next; renderView();
    await store.update('content', c.id, { status: next }); log(`Conteúdo “${c.title}” → ${next}`, c.client_id);
    if (next === 'aprovacao') await notifyUsers(admins(), 'Publicação aguardando aprovação', c.title, 'conteudo', `apr:${c.id}`, 'conteudo');
  },
  cWeek: d => { S.contentWeek = d.d; renderView(); },
  readAll: async () => { for (const n of S.d.notifications.filter(n => n.user_id === S.me.id && !n.read)) await store.update('notifications', n.id, { read: true }); await refresh(); },
  readOne: async d => { const n = S.d.notifications.find(x => x.id === d.id); if (n && !n.read) { n.read = true; store.update('notifications', n.id, { read: true }); } location.hash = '#' + (n && n.route || 'painel'); },
  enablePush: async () => {
    try {
      const p = await Notification.requestPermission();
      if (p !== 'granted') return toast('Permissão não concedida', '', 'warn');
      if (SUPA && CFG.VAPID_PUBLIC_KEY && 'PushManager' in window) {
        const reg = await navigator.serviceWorker.ready;
        const key = Uint8Array.from(atob(CFG.VAPID_PUBLIC_KEY.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - CFG.VAPID_PUBLIC_KEY.length % 4) % 4)), c => c.charCodeAt(0));
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
        await sb.from('push_subs').upsert({ user_id: S.me.id, endpoint: sub.endpoint, subscription: sub.toJSON() }, { onConflict: 'endpoint' });
      }
      toast('Notificações ativadas', 'Você receberá os lembretes neste aparelho.', 'ok'); systemPop({ title: 'Bravus Work', body: 'Notificações ativas ✅', key: 'test' }); renderView();
    } catch (e) { toast('Não foi possível ativar', e.message, 'warn'); }
  },
  testPush: () => systemPop({ title: `Olá, ${firstName(S.me.id)}!`, body: 'Este é um teste do Bravus Notify.', key: 'test' + Date.now(), route: 'alertas' }),
  backup: () => {
    if (EMBED) return toast('Disponível no app publicado', 'Na prévia não é possível baixar arquivos.', 'warn');
    const data = { app: 'bravus-work', version: VERSION, at: new Date().toISOString(), data: {} };
    TABLES.forEach(t => data.data[t] = S.d[t].map(r => { const { pin_hash, salt, ...rest } = r; return rest; }));
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = `bravus-work-backup-${today()}.json`; a.click();
    log('Baixou backup');
  },
  changePin: d => modal('Trocar senha', `<div class="f"><input type="hidden" name="id" value="${d.id}">${fld('Nova senha (mín. 6 caracteres)', 'pin', '', 'password', 'minlength="6" required autocomplete="new-password" autocapitalize="none"')}${fld('Repita a senha', 'pin2', '', 'password', 'minlength="6" required autocomplete="new-password" autocapitalize="none"')}</div>`, { form: 'savePin', footer: `<button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">Salvar</button>` })
};

/* =====================================================================
   FORMULÁRIOS
   ===================================================================== */
const num = v => v === '' || v == null ? null : Number(v);
const F = {
  login: async v => { AUTH.pin = v.pw; await tryLogin(); },
  authEmail: async v => { AUTH.email = v.email.trim().toLowerCase(); lsSet('bw_email', AUTH.email); AUTH.stage = 'pin'; renderAuth(); },
  setup: async v => {
    if (v.a_pin.length < 6 || v.p_pin.length < 6) return toast('A senha precisa ter pelo menos 6 caracteres', '', 'bad');
    if (WEAK.includes(v.a_pin) || WEAK.includes(v.p_pin)) return toast('Senha muito fácil', 'Misture letras e um símbolo, ex.: bravus#2026.', 'bad');
    if (v.a_pin === v.p_pin) return toast('Use senhas diferentes para cada pessoa', '', 'bad');
    const mk = async (name, pin, role, color) => { const salt = uid(); return store.insert('profiles', { name: name.trim(), role, color, salt, pin_hash: await hashPin(pin, salt) }); };
    const a = await mk(v.a_name, v.a_pin, 'admin', '#2f7bff'); await mk(v.p_name, v.p_pin, 'comercial', '#b44cff');
    await store.upsertSettings(DEFAULT_SETTINGS);
    sessionStorage.setItem('bw_session', a.id); await startSession(a.id);
  },
  saveClient: async (v, fd) => {
    if (!v.name.trim()) return toast('Informe o nome da empresa', '', 'bad');
    const row = { name: v.name.trim(), contact: v.contact, whatsapp: v.whatsapp, phone: v.phone, email: v.email, instagram: v.instagram, segment: v.segment, owner: v.owner || null,
      services: fd.getAll('services'), contract_value: num(v.contract_value) || 0, due_day: num(v.due_day), start_date: v.start_date || null, op_status: v.op_status,
      ad_account_id: v.ad_account_id.trim() || null, asaas_customer_id: v.asaas_customer_id.trim() || null, notes: v.notes, ad_account_status: v.ad_account_status || null };
    const old = v.id && client(v.id);
    if (!old || !old.ad_synced_at || v.ad_balance !== String(old.ad_balance ?? '')) { row.ad_balance = num(v.ad_balance); row.ad_balance_source = row.ad_balance == null ? null : 'manual'; }
    if (v.id) { await store.update('clients', v.id, row); await log(`Atualizou o cadastro de ${row.name}`, v.id); }
    else { const c = await store.insert('clients', row); await log(`Cadastrou o cliente ${row.name}`, c.id); }
    closeModal(); toast('Cliente salvo', '', 'ok'); await refresh();
  },
  clientNote: async v => { if (!v.text.trim()) return; await store.insert('activity', { user_id: S.me.id, action: v.text.trim(), client_id: v.id }); await refresh(); clientDetail(v.id); },
  saveCamp: async v => {
    const row = { client_id: v.client_id, name: v.name.trim(), status: v.status, daily_budget: num(v.daily_budget), period: v.period, spend: num(v.spend) || 0, reach: num(v.reach) || 0, impressions: num(v.impressions) || 0, clicks: num(v.clicks) || 0, leads: num(v.leads) || 0, conversions: num(v.conversions) || 0, updated_at: new Date().toISOString() };
    const prev = v.id && S.d.campaigns.find(c => c.id === v.id);
    if (v.id) await store.update('campaigns', v.id, row); else await store.insert('campaigns', { ...row, source: 'manual' });
    if (prev && prev.status !== row.status) await log(`Campanha “${row.name}”: ${prev.status} → ${row.status}`, row.client_id); else if (!v.id) await log(`Registrou a campanha “${row.name}”`, row.client_id);
    if (['problema', 'sem_entrega'].includes(row.status) && (!prev || prev.status !== row.status)) await notifyUsers(team().map(p => p.id), 'Campanha com problema', `${cname(row.client_id)} — ${row.name}`, 'alerta', `camp:${v.id || row.name}:${row.status}:${today()}`, 'campanhas');
    closeModal(); toast('Campanha salva', '', 'ok'); await refresh();
  },
  saveInvoice: async v => {
    const row = { client_id: v.client_id, amount: num(v.amount), due_date: v.due_date, description: v.description, payment_url: v.payment_url || null };
    if (!row.amount || row.amount <= 0) return toast('Informe um valor válido', '', 'bad');
    if (v.id) { if (v.status && v.status !== 'pago') row.status = v.status; await store.update('invoices', v.id, row); }
    else { await store.insert('invoices', { ...row, status: 'pendente' }); await log(`Criou cobrança de ${brl(row.amount)}`, row.client_id); }
    closeModal(); toast('Cobrança salva', '', 'ok'); await refresh();
  },
  confirmPay: async (v, fd, form) => {
    if (!form.confirm.checked) return toast('Marque a confirmação', 'Só registre após ver o valor na conta.', 'warn');
    const i = S.d.invoices.find(x => x.id === v.id);
    await store.update('invoices', v.id, { status: 'pago', paid_at: v.paid_at, method: v.method, confirmed_by: S.me.name });
    await log(`Confirmou pagamento de ${brl(i.amount)} (${v.method})`, i.client_id);
    await notifyUsers(finPeople(), 'Pagamento recebido 💰', `${cname(i.client_id)} — ${brl(i.amount)}`, 'pago', `paid:${i.id}`, 'financeiro');
    closeModal(); await refresh();
  },
  saveExpense: async v => { await store.insert('expenses', { description: v.description, amount: num(v.amount), date: v.date, category: v.category }); await log(`Registrou despesa: ${v.description} (${brl(v.amount)})`); closeModal(); toast('Despesa salva', '', 'ok'); await refresh(); },
  saveTask: async (v, fd, form) => {
    const tpl = !!v.is_template;
    const row = { title: v.title.trim(), kind: v.kind, priority: v.priority, time: v.time || null, assignee: v.assignee || S.me.id, client_id: v.client_id || null, goal: num(v.goal) || null, remind_min: num(v.remind_min) ?? 10, description: v.description };
    if (!row.title) return toast('Informe o título', '', 'bad');
    const override = isAdmin() && form.override && form.override.checked;
    if (row.kind === 'reuniao' && (!row.time || row.time < S.set.meetings_start) && !override) return toast(`Reuniões só a partir das ${S.set.meetings_start}`, isAdmin() ? 'Marque “Permitir horário fora da regra” para abrir exceção.' : 'Fale com o administrador para abrir exceção.', 'warn');
    if (row.kind === 'ligacao' && row.time && row.time < S.set.calls_start && !override) return toast(`Ligações a partir das ${S.set.calls_start}`, 'Ajuste o horário ou abra exceção.', 'warn');
    if (tpl) { row.is_template = true; row.days = fd.getAll('days').map(Number); if (!row.days.length) return toast('Escolha ao menos um dia', '', 'bad'); }
    else row.date = v.date;
    if (v.id) await store.update('tasks', v.id, row);
    else { await store.insert('tasks', { ...row, status: 'pendente', count: 0, is_template: tpl }); await log(`${tpl ? 'Criou rotina' : 'Agendou'}: ${row.title}${row.assignee !== S.me.id ? ' para ' + firstName(row.assignee) : ''}`, row.client_id); }
    if (!tpl && row.assignee !== S.me.id && !v.id) await notifyUsers([row.assignee], `Nova tarefa de ${firstName(S.me.id)}`, `${row.title}${row.time ? ' · ' + row.time : ''} · ${fdate(row.date)}`, 'tarefa', null, 'agenda');
    closeModal(); toast('Salvo', '', 'ok'); await refresh();
  },
  saveContent: async v => {
    const row = { title: v.title.trim(), channel: v.channel, date: v.date || null, client_id: v.client_id || null, assignee: v.assignee, status: v.status, notes: v.notes };
    const prev = v.id && S.d.content.find(c => c.id === v.id);
    if (row.status === 'publicado' && prev && prev.status !== 'publicado' && !['aprovacao', 'agendado'].includes(prev.status) && !isAdmin()) return toast('Antes de publicar, envie para aprovação', '', 'warn');
    if (v.id) await store.update('content', v.id, row); else await store.insert('content', row);
    if (row.status === 'aprovacao' && (!prev || prev.status !== 'aprovacao')) await notifyUsers(admins(), 'Publicação aguardando aprovação', row.title, 'conteudo', `apr:${v.id || row.title}`, 'conteudo');
    await log(`${v.id ? 'Atualizou' : 'Criou'} conteúdo: ${row.title}`, row.client_id);
    closeModal(); toast('Conteúdo salvo', '', 'ok'); await refresh();
  },
  sendMsg: async (v, fd, form) => {
    const text = (v.text || '').trim(); if (!text) return;
    form.text.value = ''; await store.insert('messages', { user_id: S.me.id, text });
    if ((S.set.notify || {}).chat !== false) await notifyUsers(team().filter(p => p.id !== S.me.id && !isOnline(p)).map(p => p.id), `Mensagem de ${firstName(S.me.id)}`, text.slice(0, 120), 'chat', null, 'chat');
    await loadAll('messages'); renderView(); $('#chatInput') && $('#chatInput').focus();
  },
  saveSettings: async (v, fd, form) => {
    const offs = String(v.reminder_offsets || '').split(/[,; ]+/).filter(x => x !== '').map(Number).filter(n => Number.isFinite(n) && Math.abs(n) <= 60);
    const s = { ...S.set, agency_name: v.agency_name, max_clients: num(v.max_clients) || 20, calls_start: v.calls_start, meetings_start: v.meetings_start, prospect_goal: num(v.prospect_goal) || 0, followup_goal: num(v.followup_goal) || 0,
      priscila_start: v.priscila_start, priscila_end: v.priscila_end, morning_hour: v.morning_hour, lock_minutes: num(v.lock_minutes) || 15, reminder_offsets: offs, priscila_finance: form.priscila_finance.checked,
      notify: Object.fromEntries(['tarefas', 'financeiro', 'campanhas', 'conteudo', 'chat'].map(k => [k, !!form['nf_' + k].checked])) };
    await store.upsertSettings(s); S.set = s; await log('Atualizou os ajustes'); toast('Ajustes salvos', '', 'ok'); armLock(); await refresh();
  },
  savePin: async v => {
    if (v.pin.length < 6 || v.pin !== v.pin2) return toast('As senhas não conferem ou têm menos de 6 caracteres', '', 'bad');
    if (WEAK.includes(v.pin)) return toast('Senha muito fácil', '', 'bad');
    if (SUPA) { const { error } = await sb.auth.updateUser({ password: v.pin }); if (error) return toast('Erro', error.message, 'bad'); }
    else { const salt = uid(); await store.update('profiles', v.id, { salt, pin_hash: await hashPin(v.pin, salt) }); }
    await log('Trocou a senha'); closeModal(); toast('Senha atualizada', '', 'ok');
  }
};

/* =====================================================================
   EVENTOS GLOBAIS
   ===================================================================== */
let refreshing;
async function refresh(t) { await loadAll(t); if (S.me) { popNew(); if ($('#modal-root').innerHTML && !t) {} renderShellBadges(); renderView(); } }
function renderShellBadges() { if (!$('.shell')) return render(); const cur = $('.nav'); if (!cur) return; const u = unread(), c = chatUnread();
  document.querySelectorAll('.nav a, .bnav a').forEach(a => { const k = a.getAttribute('href').slice(1); let b = a.querySelector('.badge'); const n = k === 'alertas' ? u : k === 'chat' && S.route !== 'chat' ? c : 0; if (n) { if (!b) { b = document.createElement('span'); b.className = 'badge'; a.appendChild(b); } b.textContent = n; } else if (b) b.remove(); });
  const mb = $('.mtop a[href="#alertas"]'); if (mb) { let b = mb.querySelector('.badge'); if (u) { if (!b) { b = document.createElement('span'); b.className = 'badge'; b.style.cssText = 'position:absolute;top:-6px;right:-6px'; mb.appendChild(b); } b.textContent = u; } else if (b) b.remove(); } }

document.addEventListener('click', e => {
  if (e.target.matches('[data-ov]')) return closeModal();
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = A[el.dataset.act]; if (!fn) return;
  const realLink = el.tagName === 'A' && /^https?:/.test(el.getAttribute('href') || '');
  if (el.tagName === 'A' && el.dataset.act === 'closeModal') { closeModal(); return; }
  if (!realLink) e.preventDefault();
  e.stopPropagation();
  Promise.resolve(fn(el.dataset, el, e)).catch(err => toast('Algo deu errado', err.message, 'bad'));
});
document.addEventListener('submit', e => {
  const f = e.target; const fn = F[f.dataset.form]; if (!fn) return; e.preventDefault();
  if (!f.checkValidity()) { f.reportValidity(); return; }
  const fd = new FormData(f); const btn = f.querySelector('button.pri, button.ok'); if (btn) btn.disabled = true;
  Promise.resolve(fn(Object.fromEntries(fd), fd, f)).catch(err => toast('Não foi possível salvar', err.message, 'bad')).finally(() => { if (btn) btn.disabled = false; });
});
document.addEventListener('change', async e => {
  if (e.target.dataset.actChange === 'importCsv') {
    try { const f = e.target.files[0]; if (!f) return; const list = csvToClients(parseCsv(await f.text())); e.target.value = '';
      if (!list.length) throw new Error('Não encontrei a coluna "Nome" na planilha.'); importPreview(list);
    } catch (err) { toast('Não foi possível ler a planilha', err.message, 'bad'); }
    return;
  }
  if (e.target.dataset.actChange === 'restore') {
    try { const j = JSON.parse(await e.target.files[0].text()); if (j.app !== 'bravus-work') throw new Error('Arquivo inválido');
      confirmBox('Restaurar backup?', 'Os dados atuais deste aparelho (exceto senhas) serão substituídos.', 'Restaurar', async () => { const keep = store.db.profiles; store.db = j.data; store.db.profiles = keep.map(p => ({ ...p, ...(j.data.profiles || []).find(x => x.id === p.id), pin_hash: p.pin_hash, salt: p.salt })); store.save('all'); await refresh(); toast('Backup restaurado', '', 'ok'); }, true);
    } catch (err) { toast('Backup inválido', err.message, 'bad'); }
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Enter' && !e.shiftKey && e.target.id === 'chatInput') { e.preventDefault(); e.target.form.requestSubmit(); }
});
addEventListener('hashchange', () => { S.route = (location.hash.replace(/^#\/?/, '') || 'painel').split('?')[0]; if (S.me) { closeModal(); renderView(); renderShellBadges(); window.scrollTo(0, 0); } });
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.me) { heartbeat(); refresh(); tick(); } });

/* =====================================================================
   INICIALIZAÇÃO
   ===================================================================== */
(async function boot() {
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  if (SUPA) {
    try {
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm');
      sb = createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
      store = new SupaStore(sb); store.listen();
      const { data } = await sb.auth.getSession();
      store.onChange(t => { if (S.me) { clearTimeout(refreshing); refreshing = setTimeout(() => refresh(t), 250); } });
      if (data.session) return startSession(data.session.user.id);
    } catch (e) { $('#app').innerHTML = `<div class="auth"><div class="abox"><img class="logo" src="icons/icon.svg" alt=""><p class="warnbox" style="margin-top:20px">Não foi possível conectar ao servidor. Verifique a internet e tente novamente.</p><button class="btn pri" style="margin-top:14px" data-act="reload">Tentar de novo</button></div></div>`; return; }
  } else {
    store = new LocalStore();
    store.onChange(t => { if (S.me && t !== 'profiles') { clearTimeout(refreshing); refreshing = setTimeout(() => refresh(), 150); } });
    await loadAll();
    const sid = sessionStorage.getItem('bw_session'); if (sid && prof(sid)) return startSession(sid);
  }
  renderAuth();
})();
