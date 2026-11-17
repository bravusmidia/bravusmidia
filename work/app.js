/* =====================================================================
   BRAVUS WORK v1.0 — Organize. Execute. Evolua.
   App leve (sem frameworks). Dados: Supabase (produção) ou modo local.
   ===================================================================== */
const CFG = window.BW_CONFIG || {};
const VERSION = '2.6.3';
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
const fdateY = s => s ? new Date(s + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
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
  clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  star:'<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  grid:'<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  target:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  wallet:'<path d="M20 7H5a2 2 0 0 1 0-4h13v4"/><path d="M3 5v14a2 2 0 0 0 2 2h15V7"/><circle cx="16" cy="14" r="1.2"/>',
  meet:'<path d="M15 10l5-3v10l-5-3z"/><rect x="2" y="6" width="13" height="12" rx="2"/>',
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
    if (error) {
      let msg = error.message || 'Falha na integração';
      try { const j = await error.context.json(); if (j && j.error) msg = j.error; } catch {}
      throw new Error(msg);
    }
    return data;
  }
}

/* ---------------- estado ---------------- */
const DEFAULT_SETTINGS = {
  agency_name: 'Bravus Mídia', max_clients: 20, priscila_finance: false,
  calls_start: '12:00', meetings_start: '18:30', meetings_end: '21:30', meet_slot: 60, prospect_goal: 15, followup_goal: 10,
  priscila_start: '09:00', priscila_end: '17:00', morning_hour: '08:00',
  reminder_offsets: [-5, -2, 0, 1, 5, 10], remind_default: 10, lock_minutes: 15,
  notify: { tarefas: true, financeiro: true, campanhas: true, conteudo: true, chat: true },
  shutdown: { auto: false, trigger: 'ambos', days: 5, pause: true, msg: '' },
  recharge: { auto: false, repeat: 3, msg: '' },
  exit_reasons: ['Inadimplência', 'Cancelamento', 'Término de contrato', 'Falta de pagamento', 'Sem verba para anúncios', 'Insatisfação com os resultados', 'Pausou o negócio', 'Mudou de agência']
};
const isSplit = c => +c.installments === 2 && c.due_day2;
const dueTxt = c => isSplit(c) ? `dia ${c.due_day || '—'} e ${c.due_day2} (2x)` : `dia ${c.due_day || '—'}`;
const parts = c => { const t = Math.round((+c.contract_value || 0) * 100); if (!isSplit(c)) return [[+c.due_day || 10, t / 100]]; const a = Math.ceil(t / 2); return [[+c.due_day || 10, a / 100], [+c.due_day2, (t - a) / 100]]; };
const exitReasons = () => (Array.isArray(S.set.exit_reasons) ? S.set.exit_reasons : DEFAULT_SETTINGS.exit_reasons).filter(Boolean);
/* campo de motivo: lista pronta (editável em Ajustes) + texto livre */
const reasonField = (v = '') => `<label class="fl">Motivo da saída<input name="end_reason" value="${esc(v || '')}" maxlength="120" list="exitR" placeholder="escolha abaixo ou digite"><datalist id="exitR">${exitReasons().map(r => `<option value="${esc(r)}">`).join('')}</datalist></label>
  <div class="row wrap" style="gap:6px;margin-top:-4px">${exitReasons().map(r => `<button type="button" class="chip ${r === v ? 'blue' : ''}" style="cursor:pointer" data-act="pickReason" data-v="${esc(r)}">${esc(r)}</button>`).join('')}</div>`;
/* Aviso de recarga (só para campanhas sem saldo). Texto editável em Ajustes. */
const RECHARGE_MSG = `🔔 *AVISO AUTOMÁTICO – BRAVUS MÍDIA*

Identificamos que suas campanhas estão sem saldo disponível para continuar rodando.

Para evitar a interrupção dos anúncios e manter suas campanhas ativas, solicitamos a realização de uma nova recarga.

Após a regularização, a veiculação poderá ser retomada normalmente.

Agradecemos pela atenção! 🚀

*Mensagem automática do sistema. Se já realizou a recarga, desconsidere este aviso.*`;
/* Comunicado de desligamento (cliente que parou de pagar / sem saldo). Texto editável em Ajustes. */
const SHUTDOWN_MSG = `⚠️ *COMUNICADO AUTOMÁTICO – BRAVUS MÍDIA*

Informamos que sua conta será desativada por falta de saldo disponível para continuidade das campanhas.

Estamos iniciando o protocolo de desligamento, com a suspensão dos serviços e a desativação das campanhas vinculadas à sua conta.

Caso deseje manter os serviços ativos, solicitamos a regularização do saldo pendente.

*Esta é uma mensagem automática do sistema.*`;
const S = { me: null, route: 'painel', d: {}, set: { ...DEFAULT_SETTINGS }, agendaDate: today(), agendaWho: null,
  finMonth: curYM(), meetMonth: curYM(), goalMonth: curYM(), meetWho: '', meetTicket: '', meetDay: null, cliFilter: 'online', contentWeek: null, popped: new Set(), startedAt: new Date().toISOString() };
TABLES.forEach(t => S.d[t] = []);
let store, sb;

const isAdmin = () => S.me && S.me.role === 'admin';
const canFin = () => true; /* toda a equipe vê o financeiro; só o administrador altera */
const prof = id => S.d.profiles.find(p => p.id === id);
const pname = id => (prof(id) || {}).name || '—';
const firstName = id => pname(id).split(' ')[0];
const client = id => S.d.clients.find(c => c.id === id);
const cname = id => (client(id) || {}).name || 'Bravus Mídia';
const cargo = p => (p && p.title) || (p && p.role === 'admin' ? 'Administrador' : 'Comercial · co-founder');
const CARGOS = ['CEO / Fundador', 'Co-founder', 'Gestor de tráfego', 'Comercial', 'Social media', 'Designer', 'Editor de vídeo', 'Copywriter', 'Atendimento', 'Financeiro', 'Estagiário'];
const team = () => S.d.profiles.filter(p => p.role === 'admin' || p.role === 'comercial');
const isOnline = p => !!p && ((S.me && p.id === S.me.id && !document.hidden) || (!!p.last_seen && (Date.now() - new Date(p.last_seen)) < 150000));
const avatar = (p, size = 36) => `<span class="av" style="background:${p && p.avatar_url ? `#0b1a3d url('${esc(p.avatar_url)}') center/cover` : esc(p && p.color || '#2f7bff')};width:${size}px;height:${size}px">${p && p.avatar_url ? '' : esc(initials(p && p.name))}<i class="dot ${isOnline(p) ? 'on' : ''}"></i></span>`;

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
function modal(title, body, { footer = '', wide = false, form = '', cls = '', onOpen = null } = {}) {
  const root = $('#modal-root');
  const inner = `<header><h2>${esc(title)}</h2><button class="btn sm ic" data-act="closeModal" aria-label="Fechar">${ic('x')}</button></header><div class="bd ${cls}">${body}</div>${footer ? `<footer>${footer}</footer>` : ''}`;
  root.innerHTML = `<div class="ov" data-ov="1">${form ? `<form class="mo ${wide ? 'wide' : ''}" data-form="${form}" novalidate>${inner}</form>` : `<div class="mo ${wide ? 'wide' : ''}">${inner}</div>`}</div>`;
  const first = root.querySelector('input:not([type=hidden]),select,textarea'); if (first && innerWidth > 860) first.focus();
  if (onOpen) onOpen(root.querySelector('form') || root);
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
const OP = [['ativo', 'Ativo (online)'], ['pausado', 'Pausado (online)'], ['onboarding', 'Em implantação (online)'], ['cancelado', 'Saiu da carteira (offline)']];
const inWallet = c => c.op_status !== 'cancelado';
const walletBtn = c => !isAdmin() ? walletChip(c) : `<button type="button" class="wsw ${inWallet(c) ? 'on' : ''}" data-act="setWallet" data-id="${c.id}" data-on="${inWallet(c) ? '0' : '1'}" title="${inWallet(c) ? 'Clique para desativar' : 'Clique para ativar'}"><i></i>${inWallet(c) ? 'Ativo' : 'Inativo'}</button>`;
const walletChip = c => inWallet(c) ? '<span class="chip ok"><i class="dot on"></i>Online</span>' : '<span class="chip"><i class="dot"></i>Offline</span>';

function invStatus(i) {
  if (i.status === 'pago' || i.status === 'cancelado' || i.status === 'atrasado') return i.status; /* atrasado = marcado manualmente */
  if (i.status === 'areceber') return 'pendente'; /* a receber = marcado manualmente, não vira atraso sozinho */
  return i.due_date < today() ? 'atrasado' : 'pendente';
}
/* status do mês atual (cobranças canceladas não contam) */
function clientFin(c) {
  const inv = S.d.invoices.filter(i => i.client_id === c.id && i.status !== 'cancelado');
  if (inv.some(i => invStatus(i) === 'atrasado')) return 'inadimplente';
  const cur = inv.filter(i => ym(i.due_date) === curYM());
  if (cur.some(i => invStatus(i) === 'pendente')) return 'a vencer';
  if (cur.length && cur.every(i => i.status === 'pago')) return 'pago';
  return 'sem cobrança';
}
/* status de pagamento clicável: Pago · A receber · Em atraso (manual) */
const monthInv = (c, k = curYM()) => S.d.invoices.filter(i => i.client_id === c.id && ym(i.due_date) === k && i.status !== 'cancelado').sort((a, b) => a.due_date.localeCompare(b.due_date));
const payBtn = c => { const s = clientFin(c); return `<button type="button" class="chip ${s === 'inadimplente' ? 'bad' : s === 'pago' ? 'ok' : s === 'a vencer' ? 'warn' : ''}" style="cursor:pointer" data-act="payMenu" data-id="${c.id}" title="Clique para marcar: pago, a receber ou em atraso">${esc(s)} ▾</button>`; };
const finChip = s => `<span class="chip ${s === 'inadimplente' ? 'bad' : s === 'pago' ? 'ok' : s === 'a vencer' ? 'warn' : ''}">${esc(s)}</span>`;
const campsOf = id => S.d.campaigns.filter(c => c.client_id === id);
/* Anúncios/Meta removidos do Bravus Work: nenhum status de conta de anúncios é calculado */
function adState() { return { k: 'na', label: '', cls: '' }; }
/* ---------- avisos por WhatsApp (recarga e desligamento) ---------- */
const NOTICE = {
  recharge: { name: 'Aviso de recarga', log: 'Enviou aviso de recarga', icon: 'wallet', def: () => RECHARGE_MSG },
  shutdown: { name: 'Comunicado de desligamento', log: 'Enviou comunicado de desligamento', icon: 'bell', def: () => SHUTDOWN_MSG }
};
const nCfg = k => ({ ...DEFAULT_SETTINGS[k], ...(S.set[k] || {}) });
const nText = k => (nCfg(k).msg || '').trim() || NOTICE[k].def();
const shutCfg = () => ({ ...nCfg('shutdown'), trigger: 'atraso' });
const isNoBalance = c => (c.services || []).includes('trafego') && c.op_status !== 'cancelado' && adState(c).k === 'saldo';
const overdueDays = c => S.d.invoices.filter(i => i.client_id === c.id && invStatus(i) === 'atrasado').reduce((m, i) => Math.max(m, dayDiff(today(), i.due_date)), 0);
const overdueSum = c => S.d.invoices.filter(i => i.client_id === c.id && invStatus(i) === 'atrasado').reduce((a, i) => a + +i.amount, 0);
function fillMsg(tpl, c) {
  return String(tpl).replace(/\{cliente\}/gi, c.name || '').replace(/\{contato\}/gi, (c.contact || c.name || '').split(' ')[0])
    .replace(/\{valor\}/gi, brl(overdueSum(c))).replace(/\{dias\}/gi, String(overdueDays(c)));
}
const waTo = (c, msg) => { const wa = onlyDigits(c.whatsapp || c.phone).replace(/^55/, ''); return `https://wa.me/${wa ? '55' + wa : ''}?text=${encodeURIComponent(msg)}`; };
const sentAt = (k, c) => (S.d.activity.filter(a => a.client_id === c.id && a.action.startsWith(NOTICE[k].log)).map(a => a.created_at).sort().pop()) || null;
const daysSince = t => t ? dayDiff(today(), t.slice(0, 10)) : Infinity;
/* motivo pelo qual o cliente entrou na regra (ou null) */
function nReason(k, c) {
  if (c.op_status === 'cancelado') return null;
  if (k === 'recharge') return isNoBalance(c) ? 'Campanhas sem saldo' : null;
  const cfg = shutCfg(), od = overdueDays(c), lim = Number(cfg.days) || 5;
  if (['saldo', 'ambos'].includes(cfg.trigger) && isNoBalance(c)) {
    // com o aviso de recarga ligado, o desligamento por saldo só vem depois do aviso + prazo
    if (!nCfg('recharge').auto) return 'Sem saldo na conta de anúncios';
    const r = sentAt('recharge', c); if (r && daysSince(r) >= lim) return `Sem saldo há ${daysSince(r)} dia(s) após o aviso de recarga`;
  }
  if (['atraso', 'ambos'].includes(cfg.trigger) && od >= lim) return `Pagamento atrasado há ${od} dia(s)`;
  return null;
}
/* pendentes: regra atingida e sem envio recente (recarga: reenvia após X dias; desligamento: 1 a cada 30 dias) */
const nDue = k => {
  if (!nCfg(k).auto) return [];
  const wait = k === 'recharge' ? Math.max(1, Number(nCfg('recharge').repeat) || 3) : 30;
  return S.d.clients.filter(c => nReason(k, c) && daysSince(sentAt(k, c)) >= wait && !(k === 'recharge' && nReason('shutdown', c) && nCfg('shutdown').auto));
};
const shutDue = () => nDue('shutdown');
function noticeModal(k, id) {
  const c = client(id); if (!c) return; const wa = onlyDigits(c.whatsapp || c.phone); const sent = sentAt(k, c);
  modal(NOTICE[k].name + ' — ' + c.name, `
    ${!wa ? '<div class="infobox" style="margin-bottom:12px">Este cliente não tem WhatsApp cadastrado. Edite o cliente e preencha o número.</div>' : ''}
    ${k === 'recharge' && !isNoBalance(c) ? '<div class="infobox" style="margin-bottom:12px">Atenção: este cliente não está marcado como sem saldo no momento.</div>' : ''}
    ${sent ? `<p class="note" style="margin-bottom:10px">Último envio em ${new Date(sent).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.</p>` : ''}
    <label class="fl">Mensagem (pode ajustar só para este envio)<textarea id="nTxt" style="min-height:240px">${esc(fillMsg(nText(k), c))}</textarea></label>
    ${k === 'shutdown' ? `<label class="sw" style="margin-top:10px"><input type="checkbox" id="nPause" ${shutCfg().pause ? 'checked' : ''}> Marcar cliente como Pausado ao enviar</label>` : ''}
    <p class="note" style="margin-top:8px">Abre o WhatsApp com a mensagem pronta para ${esc(c.whatsapp || c.phone || '—')}; é só tocar em enviar. O envio fica registrado no histórico do cliente.</p>`,
    { wide: true, footer: `<button type="button" class="btn" data-act="closeModal">Cancelar</button><span class="sp"></span><button type="button" class="btn ${k === 'shutdown' ? 'bad' : 'pri'}" data-act="noticeSend" data-k="${k}" data-id="${c.id}" ${wa ? '' : 'disabled'}>${ic('wa')}Enviar no WhatsApp</button>` });
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
const isLate = t => !['feito', 'noshow', 'cancelada', 'remarcada'].includes(t.status) && t.date && (t.date < today() || (t.date === today() && t.time && t.time < nowHM() && t.kind !== 'tarefa'));

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
const finPeople = () => team().map(p => p.id);

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
    popup(`${mine.length} novos avisos`, mine.slice(0, 3).map(n => n.title).join(' · '), { type: mine.some(n => n.type === 'alerta') ? 'bad' : '', route: 'alertas' });
    systemPop({ title: `Bravus Work · ${mine.length} novos alertas`, body: mine.slice(0, 3).map(n => n.title).join(' · '), key: 'batch', route: 'alertas' });
  } else mine.forEach(n => { if (n.type === 'chat') return systemPop(n); popup(n.title, n.body, { type: n.type === 'alerta' ? 'bad' : n.type === 'pago' ? 'ok' : '', route: n.route }); systemPop(n); });
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
    if (nf.tarefas !== false && hm >= '16:00') for (const t of mineToday.filter(t => t.goal && (t.count || 0) < t.goal && t.status !== 'feito')) {
      await notifyUsers([me.id], `Faltam ${t.goal - (t.count || 0)} para a meta: ${t.title}`, `Você fez ${t.count || 0} de ${t.goal} hoje. Bora fechar o dia! 💪`, 'tarefa', `goal:${t.id}:${d}`, 'agenda');
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
        if (!['pendente', 'areceber'].includes(i.status)) continue;
        const diff = dayDiff(d, i.due_date);
        if ((S.set.reminder_offsets || []).map(Number).includes(diff)) {
          const t = diff < 0 ? `Cobrança vence em ${-diff} dia(s)` : diff === 0 ? 'Cobrança vence hoje' : `Pagamento atrasado há ${diff} dia(s)`;
          await notifyUsers(finPeople(), t, `${cname(i.client_id)} — ${brl(i.amount)}`, diff > 0 ? 'alerta' : 'financeiro', `inv:${i.id}:${diff}`, 'financeiro');
        }
      }
      for (const c of shutDue()) await notifyUsers(admins(), `Comunicado de desligamento pronto: ${c.name}`, nReason('shutdown', c) + ' · toque para enviar no WhatsApp', 'alerta', `shut:${c.id}:${curYM()}`, 'clientes');
      for (const x of upcomingDates(7)) await notifyUsers(admins(), `${x.hol ? 'Feriado' : 'Data comercial'} ${x.i === 0 ? 'hoje' : x.i === 1 ? 'amanhã' : `em ${x.i} dias`}: ${x.name} (${fdate(x.ds)})`, 'Hora de criar panfleto, flyer e pensar em desconto para a Bravus e os clientes.', 'conteudo', `hol:${x.ds}:${x.name}`, 'conteudo');
      const appr = S.d.content.filter(c => c.status === 'aprovacao').length;
      if (appr && nf.conteudo !== false && hm >= S.set.morning_hour) await notifyUsers([me.id], appr === 1 ? 'Existe 1 publicação aguardando aprovação' : `Existem ${appr} publicações aguardando aprovação`, 'Revise antes de publicar.', 'conteudo', `appr:${d}:${appr}`, 'conteudo');
    }
  } catch (e) { console.warn('tick', e); }
  ticking = false;
}

/* presença (online/offline) + último acesso */
/* ---------- TEMPO ONLINE: conta o tempo com o app aberto na tela, para sempre, visível para todos ---------- */
let beatAt = null; S.ot = [];
const fmtDur = sec => { sec = Math.max(0, Math.round(sec || 0)); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60); return h ? `${h}h${pad(m)}` : m ? `${m}min` : sec ? '<1min' : '0min'; };
const timeOf = (uid, from, to) => S.ot.filter(r => r.user_id === uid && (!from || r.day >= from) && (!to || r.day <= to)).reduce((a, r) => a + (+r.seconds || 0), 0) + (S.me && uid === S.me.id && beatAt && !document.hidden && (!to || today() <= to) && (!from || today() >= from) ? Math.min(90, (Date.now() - beatAt) / 1000) : 0);
const timeToday = uid => timeOf(uid, today(), today());
const timeWeek = uid => timeOf(uid, addDays(today(), -6), today());
const timeMonth = (uid, k = curYM()) => timeOf(uid, k + '-01', k + '-31');
async function loadTime() {
  if (!SUPA || !sb) return;
  try { const { data, error } = await sb.from('online_time').select('user_id,day,seconds'); if (!error && data) S.ot = data; } catch {}
}
async function addTime() {
  if (!S.me || !beatAt) return; const now = Date.now(); const secs = Math.round(Math.min(90, (now - beatAt) / 1000)); beatAt = document.hidden ? null : now;
  if (secs < 1) return;
  const r = S.ot.find(x => x.user_id === S.me.id && x.day === today()); if (r) r.seconds = (+r.seconds || 0) + secs; else S.ot.push({ user_id: S.me.id, day: today(), seconds: secs });
  if (SUPA && sb) { try { await sb.rpc('bw_add_time', { p_seconds: secs }); } catch (e) { console.warn('tempo online', e); } }
}
async function heartbeat() {
  if (!S.me) return;
  await addTime();
  if (document.hidden) return;
  if (!beatAt) beatAt = Date.now();
  loadTime().then(renderPresence);
  const now = new Date().toISOString(); S.me.last_seen = now;
  const mine = (S.d.profiles || []).find(p => p.id === S.me.id); if (mine) mine.last_seen = now;
  renderPresence();
  try { await store.update('profiles', S.me.id, { last_seen: now }); } catch (e) { console.warn('presença', e); }
}
/* voltou para o app (desbloqueou o celular / trocou de aba): avisa na hora que está online */
document.addEventListener('visibilitychange', () => { if (!document.hidden) heartbeat(); else { addTime(); renderPresence(); } });
window.addEventListener('pagehide', () => { addTime(); });
window.addEventListener('focus', () => heartbeat());

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
const appUrl = () => location.origin + location.pathname.replace(/index\.html$/, '');
async function sendReset(email) {
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: appUrl() });
  if (error) throw new Error(/rate|seconds/i.test(error.message) ? 'Aguarde um minuto antes de pedir outro link.' : error.message);
}
function renderRecovery(err = '') {
  $('#app').innerHTML = `<div class="auth"><div class="abox"><img class="logo" src="icons/icon.svg" alt="Bravus Work"><h1>BRAVUS <span>WORK</span></h1><p class="slogan">Crie sua nova senha</p>
    ${err ? `<p class="warnbox" style="margin:16px 0">${esc(err)}</p><button class="btn pri" data-act="recoveryBack">Voltar ao login</button>` : `<form data-form="recoverySave" class="f" style="text-align:left;margin-top:16px">
      ${fld('Nova senha (mín. 6 caracteres)', 'pin', '', 'password', 'minlength="6" required autocomplete="new-password"')}${fld('Repita a nova senha', 'pin2', '', 'password', 'minlength="6" required autocomplete="new-password"')}
      <button class="btn pri">Salvar e entrar</button></form>`}</div></div>`;
}
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
    const users = SUPA ? `<p class="muted small">${esc(AUTH.email)} · <a href="#" data-act="authChangeEmail">trocar</a> · <a href="#" data-act="forgotPw">esqueci a senha</a></p>`
      : `<div class="users">${locals.map(p => `<button type="button" class="${AUTH.user === p.id ? 'on' : ''}" data-act="authPick" data-id="${p.id}">${avatar(p, 54)}<b>${esc(p.name.split(' ')[0])}</b><small class="muted">${esc(cargo(p))}</small></button>`).join('')}</div>`;
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
      localStorage.setItem('bw_session', p.id);
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
  render(); tick(); setTimeout(releaseNotice, 800); checkVersion();
  timers.forEach(clearInterval);
  timers = [setInterval(tick, 60000), setInterval(heartbeat, 45000), setInterval(checkVersion, 30 * 60000), setInterval(() => { if (!document.hidden && !$('#modal-root').innerHTML && ['painel', 'equipe'].includes(S.route)) renderViewSoft(); if (CW.open) renderChat(); renderPresence(); }, 30000)];
  armLock();
}
async function logout(silent) {
  if (S.me) { try { await store.update('profiles', S.me.id, { last_seen: new Date(Date.now() - 300000).toISOString() }); } catch {} }
  timers.forEach(clearInterval); timers = []; S.me = null; localStorage.removeItem('bw_session');
  if (SUPA) await sb.auth.signOut();
  AUTH.pin = ''; closeModal(); renderAuth(silent ? 'Bloqueado por inatividade.' : '');
}
let lockT;
function armLock() {
  clearTimeout(lockT);
  if (!S.me) return;
  const mins = S.set.lock_v2 ? +S.set.lock_minutes || 0 : 0; // 0 = nunca bloqueia sozinho (padrão: continua conectado)
  if (!mins) return;
  lockT = setTimeout(() => logout(true), mins * 60000);
}
['click', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, () => S.me && armLock(), { passive: true }));

/* =====================================================================
   LAYOUT
   ===================================================================== */
const NAV = [
  ['painel', 'Painel', 'grid'], ['clientes', 'Clientes', 'users'],
  ['financeiro', 'Financeiro', 'wallet', 'fin'], ['agenda', 'Agenda', 'cal'], ['reunioes', 'Reuniões', 'meet'], ['metas', 'Metas', 'target'], ['conteudo', 'Conteúdo', 'film'],
  ['equipe', 'Equipe', 'team'], ['alertas', 'Alertas', 'bell'],
  ['ajustes', 'Ajustes', 'gear', 'admin']
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
      <div class="me"><span data-act="editProfile" data-id="${S.me.id}" style="cursor:pointer" title="Editar meu perfil">${avatar(S.me)}</span><div class="who" data-act="editProfile" data-id="${S.me.id}" style="cursor:pointer" title="Editar meu perfil"><b>${esc(S.me.name)}</b><small>${esc(cargo(S.me))}</small></div><button class="btn sm ic" title="Bloquear" data-act="logout">${ic('lock')}</button></div>
    </aside>
    <main class="main">
      <div class="mtop"><img src="icons/icon.svg" alt=""><b>BRAVUS <span>WORK</span></b><a class="btn sm ic" href="#alertas" style="position:relative">${ic('bell')}${unread() ? `<span class="badge" style="position:absolute;top:-6px;right:-6px">${unread()}</span>` : ''}</a><button class="btn sm ic" data-act="logout" title="Bloquear">${ic('lock')}</button></div>
      <div class="presence" id="presence">${presenceHtml()}</div>
      <div id="view"></div>
    </main>
    <button id="cwFab" class="cw-fab" data-act="chatToggle" aria-label="Chat da equipe">${ic('chat')}</button>
    <section id="cw" class="cw"></section>
    <nav class="bnav">${[['painel', 'Painel', 'grid'], ['clientes', 'Clientes', 'users'], ['agenda', 'Agenda', 'cal'], ['reunioes', 'Reuniões', 'meet']].map(n => `<a href="#${n[0]}" class="${S.route === n[0] ? 'on' : ''}">${ic(n[2])}${n[1]}${badge(n[0])}</a>`).join('')}<button data-act="moreMenu">${ic('more')}Mais</button></nav>
  </div>`;
  renderView(); renderChat(true); fabPlace();
}
/* botão do chat: flutuante e arrastável (posição salva neste aparelho) */
const FAB = { pos: lsGet('bw_fab_pos', null), drag: null, block: false };
function fabLimits() { const m = innerWidth <= 860; return { top: m ? 70 : 16, bottom: innerHeight - 56 - (m ? 76 : 16), side: m ? 12 : 20 }; }
function fabPlace() {
  const f = $('#cwFab'); if (!f || !FAB.pos) return;
  const L = fabLimits(); const y = Math.min(L.bottom, Math.max(L.top, FAB.pos.y * innerHeight));
  f.style.top = y + 'px'; f.style.bottom = 'auto';
  if (FAB.pos.side === 'l') { f.style.left = L.side + 'px'; f.style.right = 'auto'; } else { f.style.right = L.side + 'px'; f.style.left = 'auto'; }
}
addEventListener('resize', fabPlace);
document.addEventListener('pointerdown', e => {
  const f = e.target.closest('#cwFab'); if (!f || (e.button && e.button !== 0)) return;
  const r = f.getBoundingClientRect();
  FAB.drag = { f, id: e.pointerId, sx: e.clientX, sy: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false };
});
document.addEventListener('pointermove', e => {
  const d = FAB.drag; if (!d || e.pointerId !== d.id) return;
  if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 8) return;
  if (!d.moved) { d.moved = true; d.f.classList.add('drag'); try { d.f.setPointerCapture(d.id); } catch {} }
  e.preventDefault();
  const x = Math.min(innerWidth - 56, Math.max(0, e.clientX - d.dx)), y = Math.min(innerHeight - 56, Math.max(0, e.clientY - d.dy));
  Object.assign(d.f.style, { left: x + 'px', top: y + 'px', right: 'auto', bottom: 'auto' });
}, { passive: false });
const fabEnd = e => {
  const d = FAB.drag; if (!d || e.pointerId !== d.id) return; FAB.drag = null;
  if (!d.moved) return;
  d.f.classList.remove('drag'); FAB.block = true; setTimeout(() => { FAB.block = false; }, 350);
  const r = d.f.getBoundingClientRect();
  FAB.pos = { side: r.left + 28 < innerWidth / 2 ? 'l' : 'r', y: r.top / innerHeight }; lsSet('bw_fab_pos', FAB.pos); fabPlace();
};
document.addEventListener('pointerup', fabEnd); document.addEventListener('pointercancel', fabEnd);
document.addEventListener('click', e => { if (FAB.block && e.target.closest('#cwFab')) { e.preventDefault(); e.stopPropagation(); FAB.block = false; } }, true);
/* rolagem no celular: não reconstruir a tela enquanto o dedo está na tela ou a página ainda desliza */
const SCR = { touching: false, last: 0, pending: null };
addEventListener('touchstart', () => { SCR.touching = true; }, { passive: true });
addEventListener('touchend', () => { SCR.touching = false; SCR.last = Date.now(); }, { passive: true });
addEventListener('touchcancel', () => { SCR.touching = false; }, { passive: true });
addEventListener('scroll', () => { SCR.last = Date.now(); }, { passive: true });
const scrollBusy = () => SCR.touching || Date.now() - SCR.last < 900;
function renderViewSoft() {
  if (scrollBusy()) { clearTimeout(SCR.pending); SCR.pending = setTimeout(renderViewSoft, 400); return; }
  renderView(true);
}
function renderView(keepScroll) {
  const v = $('#view'); if (!v) return;
  const y = keepScroll ? window.scrollY : 0;
  if (S.route === 'chat') { S.route = 'painel'; history.replaceState(null, '', '#painel'); CW.open = true; CW.tab = 'chat'; lsSet('bw_cw_open', true); setTimeout(() => renderChat(true)); }
  if (!NAV.some(n => n[0] === S.route && navOk(n))) { S.route = 'painel'; if (location.hash !== '#painel') history.replaceState(null, '', '#painel'); }
  const keep = $('#chatInput') && $('#chatInput').value;
  try { v.innerHTML = (V[S.route] || V.painel)(); } catch (e) { console.error(e); v.innerHTML = `<div class="card warnbox">Erro ao montar a tela: ${esc(e.message)}</div>`; }
  if (keepScroll && y) window.scrollTo(0, y);

  document.querySelectorAll('.nav a, .bnav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + S.route));
}
const head = (title, sub = '', actions = '') => `<div class="top"><h1>${esc(title)}${sub ? `<small>${sub}</small>` : ''}</h1>${actions}</div>`;
const kpi = (label, val, sub = '', cls = '', go) => go
  ? `<div class="kpi go ${cls}" role="button" tabindex="0" title="Abrir ${esc(label)}" data-act="kpiGo" data-r="${go[0]}" data-f="${go[1] || ''}" data-s="${go[2] || ''}"><small>${esc(label)}</small><b>${val}</b>${sub ? `<em>${sub}</em>` : ''}<i class="kgo">${ic('right')}</i></div>`
  : `<div class="kpi ${cls}"><small>${esc(label)}</small><b>${val}</b>${sub ? `<em>${sub}</em>` : ''}</div>`;
const empty = t => `<div class="empty">${t}</div>`;

/* =====================================================================
   TELAS
   ===================================================================== */
const V = {};

/* ---------- PAINEL ---------- */
V.painel = () => {
  const d = today(), k = curYM(), cl = S.d.clients;
  const ativos = cl.filter(inWallet), cancel = cl.filter(c => !inWallet(c));
  const inativos = cl.filter(c => c.op_status === 'pausado');
  const novos = cl.filter(c => ym(c.start_date || c.created_at) === k);
  const inad = cl.filter(c => clientFin(c) === 'inadimplente');
  const traf = cl.filter(c => (c.services || []).includes('trafego') && c.op_status !== 'cancelado');
  const tasks = realTasks().filter(t => t.date === d && (isAdmin() || t.assignee === S.me.id));
  const done = tasks.filter(t => t.status === 'feito');
  const meets = realTasks().filter(t => t.kind === 'reuniao' && ym(t.date) === k);
  const mFeitas = meets.filter(t => t.status === 'feito'), mFaltas = meets.filter(t => t.status === 'noshow'), mWon = meets.filter(t => t.outcome === 'fechou');
  const mWait = meetings().filter(t => t.status === 'pendente' && isLate(t));
  const contentPend = S.d.content.filter(c => !['publicado'].includes(c.status));
  const fm = finMonth(k);
  const months = lastMonths(6); const fms = months.map(finMonth);
  const max = Math.max(1, ...fms.map(f => Math.max(f.recebido, f.saidas)));
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  // Assistente Bravus: prioridades calculadas (sem IA paga)
  const prio = [];
  if (isAdmin()) shutDue().forEach(c => prio.push(['bad', `Enviar comunicado de desligamento: ${c.name}`, nReason('shutdown', c), 'clientes', { act: 'noticeOpen', k: 'shutdown', id: c.id }]));
  inad.forEach(c => prio.push(['bad', `Cobrar ${c.name}`, 'Pagamento em atraso', 'financeiro']));
  realTasks().filter(t => isLate(t) && (isAdmin() || t.assignee === S.me.id)).slice(0, 5).forEach(t => prio.push(['warn', t.title, `Atrasada · ${firstName(t.assignee)} · ${fdate(t.date)}`, 'agenda']));
  if (isAdmin()) upcomingDates(7).forEach(x => prio.push(['blue', `${x.hol ? 'Feriado' : 'Data comercial'} ${x.i === 0 ? 'hoje' : x.i === 1 ? 'amanhã' : `em ${x.i} dias`}: ${x.name}`, `${fdate(x.ds)} · crie panfleto, flyer e desconto`, 'conteudo']));
  mWait.slice(0, 5).forEach(t => prio.push(['warn', `Como foi a reunião com ${meetWho(t)}?`, `${fdate(t.date)} às ${t.time || '--:--'} · toque e marque Realizada ou Faltou`, 'reunioes', { act: 'editMeet', k: '', id: t.id }]));
  if (S.d.content.some(c => c.status === 'aprovacao')) prio.push(['blue', `${S.d.content.filter(c => c.status === 'aprovacao').length} publicação(ões) aguardando aprovação`, 'Conteúdo', 'conteudo']);

  return head(`${greet}, ${firstName(S.me.id)}`, fdateL(d), isAdmin() ? `<button class="btn pri" data-act="newTask">${ic('plus')}Tarefa</button>` : `<button class="btn pri" data-act="editMeet">${ic('plus')}Reunião</button>`) + `
  ${canFin() ? `<div class="grid g4">
    ${kpi('Entrou no mês', brl(fm.recebido), 'pagamentos confirmados', 'hl', ['financeiro', 'pago', 'fin-cob'])}
    ${kpi('A receber', brl(fm.aReceber), 'vencimentos do mês', 'y', ['financeiro', 'pendente', 'fin-cob'])}
    ${kpi('Em atraso', brl(fm.atrasado), `${inad.length} cliente(s) inadimplente(s)`, fm.atrasado ? 'r' : '', ['financeiro', 'atrasado', 'fin-cob'])}
    ${kpi('Saldo do mês', brl(fm.saldo), `saídas ${brl(fm.saidas)}`, fm.saldo >= 0 ? 'g' : 'r', ['financeiro', 'todos', 'fin-saidas'])}
  </div>` : ''}
  <div class="sec">Clientes<span class="sp"></span><a class="small" href="#metas" style="text-transform:none;letter-spacing:0">ver metas do mês →</a></div>
  <div class="grid g4">
    ${kpi('Clientes ativos', `${ativos.length}<span class="muted" style="font-size:15px"> / ${S.set.max_clients}</span>`, `<a href="#clientes" data-act="cliFilterGo" data-f="offline">${cancel.length} inativo(s)</a> · ${novos.length} novo(s) no mês`, '', ['clientes', 'online'])}
    ${kpi('Inadimplentes', inad.length, inad.length ? 'clique no cliente para cobrar' : 'ninguém em atraso', inad.length ? 'r' : '', ['clientes', 'inad'])}
    ${kpi('Reuniões no mês', meets.length, `${mFeitas.length} realizadas · ${mFaltas.length} faltas · ${mWon.length} fecharam${mWait.length ? ` · <b style="color:var(--warn,#ffbe50)">${mWait.length} sem resultado</b>` : ''}`, mWait.length ? 'y' : '', ['reunioes'])}
    ${canFin() ? kpi('Receita mensal', brl(mrr()), 'soma dos contratos ativos', 'g', ['clientes', 'online']) : kpi('Novos no mês', novos.length, '', '', ['clientes', 'todos'])}
  </div>
  <div class="grid g2" style="margin-top:14px">
    <div class="card"><h3>${ic('spark')}Prioridades de hoje<span class="sp"></span><span class="chip blue">Assistente Bravus</span></h3>
      <div class="list">${prio.length ? prio.slice(0, 8).map(p => `<a class="li" href="#${p[3]}"${p[4] ? ` data-act="${p[4].act}" data-k="${p[4].k}" data-id="${p[4].id}"` : ''}><i class="dot ${p[0] === 'bad' ? 'bad' : p[0] === 'warn' ? 'warn' : 'on'}"></i><div class="t"><b>${esc(p[1])}</b><small>${esc(p[2])}</small></div>${ic('right')}</a>`).join('') : empty('Tudo em ordem por aqui. ✅')}</div>
    </div>
    <div class="card"><h3>${ic('wallet')}Pagamentos do mês<span class="sp"></span><a class="small" href="#clientes">ver clientes</a></h3>
      <div class="list">${ativos.length ? ativos.slice().sort((a, b) => ['inadimplente', 'a vencer', 'sem cobrança', 'pago'].indexOf(clientFin(a)) - ['inadimplente', 'a vencer', 'sem cobrança', 'pago'].indexOf(clientFin(b))).slice(0, 10).map(c => `<div class="li"><div class="t" data-act="openClient" data-id="${c.id}" style="cursor:pointer"><b>${esc(c.name)}</b><small>vence ${esc(dueTxt(c))}${canFin() ? ' · ' + brl(c.contract_value) : ''}</small></div>${canFin() ? (isAdmin() ? payBtn(c) : finChip(clientFin(c))) : ''}</div>`).join('') : empty('Nenhum cliente ativo.')}</div>
    </div>

  </div>
  <div class="grid g2" style="margin-top:14px">
    ${canFin() ? `<div class="card"><h3>${ic('wallet')}Entradas x saídas (6 meses)<span class="sp"></span><span class="legend"><span><i style="background:#3d86ff"></i>Entrou</span><span><i style="background:#ff6b7a"></i>Saiu</span></span></h3>
      <div class="bars">${months.map((m, i) => `<div class="col"><div class="pair"><div class="b" style="height:${fms[i].recebido / max * 100}%" title="${brl(fms[i].recebido)}"></div><div class="b out" style="height:${fms[i].saidas / max * 100}%" title="${brl(fms[i].saidas)}"></div></div><small>${monthName(m)}</small></div>`).join('')}</div>
      <p class="small muted" style="margin-top:8px">Receita recorrente (contratos ativos): <b style="color:var(--tx)">${brl(mrr())}</b>/mês</p></div>` : ''}
    <div class="card"><h3>${ic('cal')}Hoje<span class="sp"></span><a class="small" href="#agenda">agenda</a></h3>
      <div class="grid g3" style="grid-template-columns:repeat(3,1fr);gap:8px">
        ${kpi('Pendentes', tasks.length - done.length, '', '', ['agenda'])}${kpi('Concluídas', done.length, '', 'g', ['agenda'])}${kpi('Reuniões', meets.filter(t => t.date === d).length, '', '', ['reunioes'])}
      </div>
      <div style="margin-top:12px"><div class="row small"><span class="muted">Produtividade do dia</span><span class="sp"></span><b>${tasks.length ? Math.round(done.length / tasks.length * 100) : 0}%</b></div><div class="prog" style="margin-top:6px"><i style="width:${tasks.length ? done.length / tasks.length * 100 : 0}%"></i></div></div>
      <div class="row small" style="margin-top:12px;gap:16px;flex-wrap:wrap"><a class="muted" href="#reunioes">Reuniões no mês: <b style="color:var(--tx)">${meets.length}</b> (${mFeitas.length} realizadas · ${mWon.length} fecharam)</a><span class="muted">Publicações pendentes: <b style="color:var(--tx)">${contentPend.length}</b></span></div>
      ${weekChart()}
    </div>
  </div>
  ${monthSummary(k)}
  ${datesCard()}
  <div class="sec">Equipe</div>
  <div class="grid g2">${team().map(p => { const tt = realTasks().filter(t => t.assignee === p.id && t.date === d); const dn = tt.filter(t => t.status === 'feito').length; return `<div class="card row">${avatar(p, 44)}<div class="sp"><b>${esc(p.name)}</b><div class="small muted">${isOnline(p) ? '<span style="color:var(--ok)">online agora</span>' : 'offline · ' + ago(p.last_seen)}</div><div class="prog" style="margin-top:8px"><i style="width:${tt.length ? dn / tt.length * 100 : 0}%"></i></div></div><b class="num">${dn}/${tt.length}</b></div>`; }).join('')}</div>`;
};
/* Resumo do mês: junta todas as áreas do Bravus Work num lugar só */
function datesCard() {
  const up = upcomingDates(60);
  return `<div class="card" style="margin-top:14px"><h3>${ic('cal')}Feriados e datas comerciais (próximos 60 dias)<span class="sp"></span><a class="small" href="${GCAL_HOL}" target="_blank" rel="noopener">abrir no Google Agenda</a></h3>
    <div class="list">${up.length ? up.slice(0, 10).map(x => `<div class="li"><div class="mtime ${x.i <= 7 ? 'hj' : ''}"><b>${fdate(x.ds)}</b><small>${WD[new Date(x.ds + 'T12:00:00').getDay()]}</small></div><div class="t"><b>${esc(x.name)}</b><small>${x.i === 0 ? 'hoje' : x.i === 1 ? 'amanhã' : `em ${x.i} dias`}${x.i <= 7 ? ' · hora do flyer / desconto' : ''}</small></div><span class="chip ${x.hol ? 'warn' : 'blue'}">${x.hol ? 'Feriado' : 'Comercial'}</span></div>`).join('') : empty('Nenhuma data nos próximos 60 dias.')}</div>
    <p class="note" style="margin-top:8px">Mesmos feriados do Google Agenda (Brasil), mais os do Ceará e de Fortaleza. Você recebe o aviso 7 dias antes.</p></div>`;
}
function monthSummary(k) {
  const mine = t => isAdmin() || t.assignee === S.me.id;
  const ts = realTasks().filter(t => ym(t.date) === k && mine(t));
  const cnt = (kind, rx) => { const x = ts.filter(t => (kind ? t.kind === kind : true) && (!rx || rx.test(t.title || ''))); return [x.filter(t => t.status === 'feito').length, x.length]; };
  const [tf, tt] = cnt('tarefa'), [lf, lt] = cnt('ligacao'), [ff, ft] = cnt('followup');
  const ms = meetings().filter(t => ym(t.date) === k), decided = ms.filter(t => ['feito', 'noshow'].includes(t.status)).length;
  const prosp = ts.filter(t => /prospec/i.test(t.title || '')).reduce((a, t) => a + (+t.count || 0), 0);
  const ct = S.d.content.filter(c => ym(c.date) === k), pub = ct.filter(c => c.status === 'publicado').length;
  const cl = S.d.clients, novos = cl.filter(c => ym(c.start_date || c.created_at) === k).length;
  const row = (icn, name, val, sub, r) => `<a class="li" href="#${r}"><div class="t"><b style="font-weight:500">${ic(icn)} ${esc(name)}</b><small>${sub}</small></div><b class="num">${val}</b>${ic('right')}</a>`;
  return `<div class="card" style="margin-top:14px"><h3>${ic('spark')}Bravus Work no mês · ${monthName(k)}<span class="sp"></span><span class="chip blue">tudo do app</span></h3>
    <div class="grid g2" style="gap:0 18px"><div class="list">
      ${row('meet', 'Reuniões', ms.length, `${ms.filter(t => t.status === 'feito').length} realizadas · ${ms.filter(t => t.status === 'noshow').length} faltas · ${ms.filter(t => t.outcome === 'fechou').length} fecharam · comparecimento ${decided ? Math.round(ms.filter(t => t.status === 'feito').length / decided * 100) + '%' : '—'}`, 'reunioes')}
      ${row('cal', 'Tarefas', `${tf}/${tt}`, 'concluídas no mês', 'agenda')}
      ${row('clock', 'Tempo online', fmtDur(team().reduce((a, p) => a + timeMonth(p.id, k), 0)), team().map(p => `${esc(firstName(p.id))} ${fmtDur(timeMonth(p.id, k))}`).join(' · '), 'equipe')}
      ${row('chat', 'Prospecções', prosp, `ligações ${lf}/${lt} · follow-ups ${ff}/${ft}`, 'agenda')}
    </div><div class="list">
      ${row('users', 'Clientes', cl.filter(inWallet).length, `${TIERS.map(t => `${cl.filter(c => inWallet(c) && clientTier(c) === t[0]).length} ${t[1].toLowerCase()}`).join(' · ')} · ${novos} novo(s) no mês`, 'clientes')}
      ${row('film', 'Conteúdo', `${pub}/${ct.length}`, 'publicados no mês', 'conteudo')}
      ${canFin() ? row('wallet', 'Financeiro', brl(finMonth(k).recebido), `a receber ${brl(finMonth(k).aReceber)} · em atraso ${brl(finMonth(k).atrasado)}`, 'financeiro') : row('target', 'Metas', '→', 'acompanhe o progresso do mês', 'metas')}
    </div></div></div>`;
}
function weekChart() {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today(), i - 6));
  const vals = days.map(d => realTasks().filter(t => t.date === d && t.status === 'feito' && (isAdmin() || t.assignee === S.me.id)).length);
  const mx = Math.max(1, ...vals);
  return `<p class="small muted" style="margin-top:14px">Tarefas concluídas — últimos 7 dias</p><div class="bars" style="height:90px">${days.map((d, i) => `<div class="col"><div class="pair"><div class="b one" style="height:${vals[i] / mx * 100}%" title="${vals[i]}"></div></div><small>${new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'narrow' })}</small></div>`).join('')}</div>`;
}

/* ---------- CLIENTES ---------- */
/* ---------- TICKET DO CLIENTE: Ouro / Prata / Bronze ---------- */
const TIERS = [['ouro', 'Ouro'], ['prata', 'Prata'], ['bronze', 'Bronze']];
const autoTier = v => (+v || 0) >= 1200 ? 'ouro' : (+v || 0) > 800 ? 'prata' : 'bronze';
const clientTier = c => (c && TIERS.some(t => t[0] === c.tier)) ? c.tier : autoTier(c && c.contract_value);
const tierName = k => lbl(TIERS, k);
const tierChip = c => { const k = clientTier(c); return `<span class="chip tier ${k}" title="Ticket ${tierName(k)}${c.tier ? ' (marcado)' : ' (pelo valor do contrato)'}">${ic('star')}${tierName(k)}</span>`; };
const tierRule = 'Bronze até R$ 800 · Prata acima de R$ 800 até R$ 1.199 · Ouro a partir de R$ 1.200';
V.clientes = () => {
  const f = S.cliFilter; let cl = S.d.clients.slice().sort((a, b) => a.name.localeCompare(b.name));
  const ativos = S.d.clients.filter(c => c.op_status !== 'cancelado').length;
  const nOff = S.d.clients.length - ativos;
  if (f === 'online') cl = cl.filter(inWallet);
  if (f === 'offline') cl = cl.filter(c => !inWallet(c)).sort((a, b) => String(b.end_date || '').localeCompare(String(a.end_date || '')));
  if (f === 'inad') cl = cl.filter(c => clientFin(c) === 'inadimplente');
  const tf = S.cliTier || ''; const base = cl;
  if (tf) cl = cl.filter(c => clientTier(c) === tf);
  const order = { ouro: 0, prata: 1, bronze: 2 }; cl = cl.slice().sort((a, b) => order[clientTier(a)] - order[clientTier(b)] || a.name.localeCompare(b.name));
  const tabs = [['online', `Online · ${ativos}`], ['offline', `Offline · ${nOff}`], ['inad', 'Inadimplentes'], ['todos', `Todos · ${S.d.clients.length}`]];
  return head('Clientes', `${ativos} de ${S.set.max_clients} vagas usadas`, `${isAdmin() ? `<label class="btn" title="Importar planilha (ex.: Metrifiquei)">${ic('down')}<span class="hide-m">Importar</span><input type="file" accept=".csv,text/csv" data-act-change="importCsv" hidden></label>` : ''}${isAdmin() ? `<button class="btn pri" data-act="editClient">${ic('plus')}Cliente</button>` : ''}`) +
    (isAdmin() ? ['shutdown'].filter(k => nDue(k).length).map(k => `<div class="card" style="margin-bottom:14px;border-color:${k === 'shutdown' ? 'rgba(255,107,122,.45)' : 'rgba(255,190,80,.45)'}"><h3>${ic(NOTICE[k].icon)}${k === 'shutdown' ? 'Comunicados de desligamento' : 'Avisos de recarga'} pendentes<span class="sp"></span><a class="small" href="#ajustes">editar texto</a></h3><div class="list">${nDue(k).map(c => `<div class="li"><div class="t"><b>${esc(c.name)}</b><small>${esc(nReason(k, c))}</small></div><button class="btn sm ${k === 'shutdown' ? 'bad' : 'pri'}" data-act="noticeOpen" data-k="${k}" data-id="${c.id}">${ic('wa')}Enviar</button></div>`).join('')}</div></div>`).join('') : '') +
    `<div class="tabs" style="margin-bottom:10px">${tabs.map(t => `<button data-act="cliFilter" data-f="${t[0]}" class="${f === t[0] ? 'on' : ''}">${t[1]}</button>`).join('')}</div>
    <div class="row wrap" style="gap:10px;margin-bottom:14px"><span class="muted small" style="font-weight:600">Ticket</span><div class="tabs tier-tabs" style="margin:0">${[['', 'Todos'], ...TIERS].map(x => `<button data-act="cliTier" data-f="${x[0]}" class="${x[0]} ${tf === x[0] ? 'on' : ''}">${x[0] ? ic('star') : ''}${esc(x[1])} <small>${x[0] ? base.filter(c => clientTier(c) === x[0]).length : base.length}</small></button>`).join('')}</div></div>
    <div class="grid g3">${cl.length ? cl.map(c => `<div class="ccard tier-${clientTier(c)}" data-act="openClient" data-id="${c.id}">
      <div class="hd"><span class="av tier-av ${clientTier(c)}">${esc(initials(c.name))}</span><div class="sp" style="min-width:0"><b>${esc(c.name)}</b><div style="margin-top:4px">${tierChip(c)}</div></div>${walletBtn(c)}</div>
      <div class="row wrap" style="gap:6px">${(c.services || []).map(s => `<span class="chip blue">${esc(svcName(s))}</span>`).join('') || '<span class="muted small">Sem serviços</span>'}</div>
      <div class="ft"><span class="muted">${esc(c.segment || 'Segmento —')} · vence ${esc(dueTxt(c))}</span>${canFin() ? `<b>${brl(c.contract_value)}</b>` : ''}</div>
      ${!inWallet(c) ? `<div class="small muted">Saiu ${c.end_date ? 'em ' + fdateY(c.end_date) : ''}${c.end_reason ? ' · ' + esc(c.end_reason) : ''}${c.start_date ? ` · cliente desde ${fdateY(c.start_date)}` : ''}</div>` : ''}
      <div class="row">${canFin() ? (isAdmin() ? payBtn(c) : finChip(clientFin(c))) : ''}${inWallet(c) ? `${c.op_status !== 'ativo' ? `<span class="chip warn">${esc(c.op_status === 'pausado' ? 'Pausado' : 'Em implantação')}</span>` : ''}${['prob', 'saldo'].includes(adState(c).k) ? adChip(c) : ''}` : ''}<span class="sp"></span><span class="small muted">${esc(firstName(c.owner))}</span></div>
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
    <div class="f2">${fld('Valor mensal do contrato (R$)', 'contract_value', c.contract_value, 'number', 'step="0.01" min="0"')}${sel('Forma de pagamento', 'installments', [['1', 'À vista (1 vencimento)'], ['2', 'Parcelado em 2x']], String(c.installments || 1))}</div>
    <div class="f2">${fld('1º vencimento (dia)', 'due_day', c.due_day || 10, 'number', 'min="1" max="31"')}<div id="dd2" style="${+c.installments === 2 ? '' : 'visibility:hidden'}">${fld('2º vencimento (dia)', 'due_day2', c.due_day2 || '', 'number', 'min="1" max="31" placeholder="ex.: 20"')}</div></div>
    <p class="note" id="ddNote" style="${+c.installments === 2 ? '' : 'display:none'};margin-top:-6px">Parcelado: o valor mensal é dividido em 2 cobranças iguais, uma em cada dia. Máximo 2x.</p>
    <div class="fl">Ticket do cliente<div class="seg tier-seg" role="radiogroup">${[['', 'Automático'], ...TIERS].map(x => `<label class="${x[0]}"><input type="radio" name="tier" value="${x[0]}" ${(c.tier || '') === x[0] ? 'checked' : ''}><span>${x[0] ? ic('star') : ''}${x[1]}</span></label>`).join('')}</div><small class="muted" id="tierHint" style="display:block;margin-top:6px">${tierRule}</small></div>
    <div class="f2">${fld('Data de contratação', 'start_date', c.start_date || today(), 'date')}${sel('Status na carteira', 'op_status', OP, c.op_status || 'ativo')}</div>
    ${fld('Data de saída (se saiu)', 'end_date', c.end_date, 'date')}
    ${reasonField(c.end_reason)}
    ${area('Observações', 'notes', c.notes)}
  </div>`, { form: 'saveClient', onOpen: f => { const th = () => { const h = $('#tierHint'); const pick = (f.querySelector('input[name="tier"]:checked') || {}).value; if (h) h.textContent = pick ? `Marcado como ${tierName(pick)}. ${tierRule}` : `Automático pelo valor: ${tierName(autoTier(num(f.contract_value.value)))}. ${tierRule}`; }; f.contract_value.addEventListener('input', th); f.querySelectorAll('input[name="tier"]').forEach(r => r.addEventListener('change', th)); th(); const sl = f.installments; sl.addEventListener('change', () => { const two = sl.value === '2'; $('#dd2').style.visibility = two ? '' : 'hidden'; $('#ddNote').style.display = two ? '' : 'none'; if (two) f.due_day2.focus(); }); }, footer: `${c.id && isAdmin() ? `<button type="button" class="btn bad" data-act="delClient" data-id="${c.id}">${ic('trash')}</button><span class="sp"></span>` : ''}<button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">Salvar</button>` });
}
function clientDetail(id) {
  const c = client(id); if (!c) return;
  const inv = S.d.invoices.filter(i => i.client_id === id).sort((a, b) => b.due_date.localeCompare(a.due_date));
  const acts = S.d.activity.filter(a => a.client_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 15);
  const wa = onlyDigits(c.whatsapp || c.phone);
  const wal = !isAdmin() ? '' : `<div class="card row wrap" style="gap:10px;margin-bottom:12px;padding:12px 14px"><div class="sp"><b>Status na carteira</b><div class="small muted">${inWallet(c) ? 'Cliente ativo na carteira' : `Saiu${c.end_date ? ' em ' + fdateY(c.end_date) : ''}${c.end_reason ? ' · ' + esc(c.end_reason) : ''}`}</div></div><div class="tabs" style="margin:0"><button type="button" class="${inWallet(c) ? 'on' : ''}" data-act="setWallet" data-id="${c.id}" data-on="1" data-from="detail"><i class="dot ${inWallet(c) ? 'on' : ''}"></i> Online</button><button type="button" class="${inWallet(c) ? '' : 'on'}" data-act="setWallet" data-id="${c.id}" data-on="0" data-from="detail"><i class="dot"></i> Offline</button></div></div>`;
  const tierBox = !isAdmin() ? '' : `<div class="card row wrap" style="gap:10px;margin-bottom:12px;padding:12px 14px"><div class="sp"><b>Ticket do cliente</b><div class="small muted">${c.tier ? 'Marcado manualmente' : `Automático pelo valor${canFin() ? ' (' + brl(c.contract_value) + ')' : ''}`}</div></div><div class="tabs tier-tabs" style="margin:0">${[['', 'Auto'], ...TIERS].map(x => `<button type="button" class="${x[0]} ${(c.tier || '') === x[0] ? 'on' : ''}" data-act="setTier" data-id="${c.id}" data-t="${x[0]}">${x[0] ? ic('star') : ''}${x[1]}</button>`).join('')}</div></div>`;
  modal(c.name, `${wal}${tierBox}<div class="row wrap" style="gap:6px;margin-bottom:12px">${tierChip(c)}${walletChip(c)}${canFin() ? (isAdmin() ? payBtn(c) : finChip(clientFin(c))) : ''}${(c.services || []).map(s => `<span class="chip blue">${esc(svcName(s))}</span>`).join('')}</div>
    <div class="grid g2" style="gap:10px">
      <div class="card"><h3>Contato</h3><div class="small" style="display:grid;gap:4px"><span>👤 ${esc(c.contact || '—')}</span><span>📱 ${esc(c.whatsapp || c.phone || '—')}</span><span>✉️ ${esc(c.email || '—')}</span><span>📷 ${esc(c.instagram || '—')}</span><span>🏷️ ${esc(c.segment || '—')}</span><span>🧑‍💼 Responsável: ${esc(pname(c.owner))}</span></div></div>
      <div class="card"><h3>Contrato</h3><div class="small" style="display:grid;gap:4px">${canFin() ? `<span>Valor: <b>${brl(c.contract_value)}</b>/mês</span>` : ''}<span>Vencimento: ${esc(dueTxt(c))}${isSplit(c) && canFin() ? ` · ${parts(c).map(p => brl(p[1])).join(' + ')}` : ''}</span><span>Desde: ${c.start_date ? new Date(c.start_date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</span></div></div>
    </div>
    ${canFin() ? `<div class="sec">Cobranças</div><div class="list">${inv.length ? inv.slice(0, 8).map(i => `<div class="li"><div class="t"><b>${brl(i.amount)} · ${fdate(i.due_date)}</b><small>${esc(i.description || 'Mensalidade')}</small></div>${invChip(i)}</div>`).join('') : empty('Nenhuma cobrança.')}</div>` : ''}
    <div class="sec">Histórico de atividades</div>
    <div class="list">${acts.length ? acts.map(a => `<div class="li"><div class="t"><b style="font-weight:500">${esc(a.action)}</b><small>${esc(firstName(a.user_id))} · ${new Date(a.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</small></div></div>`).join('') : empty('Sem registros ainda.')}</div>
    <form data-form="clientNote" class="row" style="margin-top:10px"><input type="hidden" name="id" value="${c.id}"><input name="text" placeholder="Registrar atividade (ex.: liguei, enviei proposta)" maxlength="300"><button class="btn">Registrar</button></form>`,
    { wide: true, footer: `${wa ? `<a class="btn ok" href="https://wa.me/55${wa.replace(/^55/, '')}" target="_blank" rel="noopener">${ic('wa')}WhatsApp</a>` : ''}<button type="button" class="btn" data-act="editMeet" data-client="${c.id}">${ic('meet')}<span class="hide-m">Reunião</span></button><button type="button" class="btn" data-act="clientReport" data-id="${c.id}">${ic('file')}Relatório</button>${isAdmin() ? `<button type="button" class="btn bad" data-act="noticeOpen" data-k="shutdown" data-id="${c.id}" title="Comunicado de desligamento">${ic('bell')}<span class="hide-m">Desligamento</span></button>` : ''}<span class="sp"></span>${isAdmin() ? `<button type="button" class="btn pri" data-act="editClient" data-id="${c.id}">${ic('edit')}Editar</button>` : ''}` });
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

/* ---------- FINANCEIRO ---------- */
const invChip = i => { const s = invStatus(i); return `<span ${isAdmin() && s !== 'cancelado' ? `data-act="invMenu" data-id="${i.id}" style="cursor:pointer" title="Clique para alterar"` : ''} class="chip ${s === 'pago' ? 'ok' : s === 'atrasado' ? 'bad' : s === 'pendente' ? 'warn' : ''}">${s === 'pago' ? 'Pago' : s === 'atrasado' ? 'Atrasado' : s === 'pendente' ? 'A vencer' : 'Cancelado'}</span>`; };
V.financeiro = () => {
  const k = S.finMonth, fm = finMonth(k);
  const invAll = S.d.invoices.filter(i => i.status !== 'cancelado' && inWallet(client(i.client_id) || { op_status: 'cancelado' }) && (ym(i.due_date) === k || invStatus(i) === 'atrasado')).sort((a, b) => a.due_date.localeCompare(b.due_date));
  const ff = S.finFilter || 'todos'; const inv = ff === 'todos' ? invAll : invAll.filter(i => invStatus(i) === ff);
  const fTabs = [['todos', 'Todas'], ['pago', 'Pagas'], ['pendente', 'A receber'], ['atrasado', 'Em atraso']].map(t => [t[0], `${t[1]} · ${t[0] === 'todos' ? invAll.length : invAll.filter(i => invStatus(i) === t[0]).length}`]);
  const exp = S.d.expenses.filter(e => ym(e.date) === k).sort((a, b) => b.date.localeCompare(a.date));
  const label = (l => l[0].toUpperCase() + l.slice(1))(new Date(k + '-15T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
  const shift = n => { const d = new Date(k + '-15T12:00:00'); d.setMonth(d.getMonth() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
  return head('Financeiro', 'Bravus Finance · entradas, saídas e cobranças', isAdmin() ? `<button class="btn" data-act="genInvoices" data-m="${k}">${ic('sync')}<span class="hide-m">Gerar mensalidades</span></button><button class="btn pri" data-act="newInvoice">${ic('plus')}Cobrança</button>` : '') + `
    <div class="datebar" style="margin-bottom:14px"><button class="btn sm ic" data-act="finMonth" data-m="${shift(-1)}">${ic('left')}</button><b>${label}</b><button class="btn sm ic" data-act="finMonth" data-m="${shift(1)}">${ic('right')}</button></div>
    <div class="grid g4">${kpi('Entrou', brl(fm.recebido), 'confirmado', 'hl', ['financeiro', 'pago', 'fin-cob'])}${kpi('A receber', brl(fm.aReceber), '', 'y', ['financeiro', 'pendente', 'fin-cob'])}${kpi('Atrasado (total)', brl(fm.atrasado), '', fm.atrasado ? 'r' : '', ['financeiro', 'atrasado', 'fin-cob'])}${kpi('Saiu', brl(fm.saidas), `saldo do mês ${brl(fm.saldo)}`, fm.saidas ? 'r' : '', ['financeiro', 'todos', 'fin-saidas'])}</div>
    <div class="card" id="fin-cob" style="margin-top:14px"><h3>${ic('wallet')}Cobranças<span class="sp"></span><span class="small muted">${inv.length}</span></h3>
      <div class="tabs" style="margin-bottom:10px">${fTabs.map(t => `<button data-act="finFilter" data-f="${t[0]}" class="${ff === t[0] ? 'on' : ''}">${t[1]}</button>`).join('')}</div>
      <div class="list">${inv.length ? inv.map(i => { const c = client(i.client_id) || {}; const s = invStatus(i); return `<div class="li"><div class="t"><b>${esc(c.name || '—')} · ${brl(i.amount)}</b><small>${esc(i.description || 'Mensalidade')} · vence ${fdate(i.due_date)}${i.status === 'pago' ? ` · pago em ${fdate(i.paid_at)} (${esc(i.method || '')})` : ''}</small></div>${invChip(i)}
        ${isAdmin() && s !== 'pago' && s !== 'cancelado' ? `<button class="btn sm ok" data-act="payInvoice" data-id="${i.id}">${ic('check')}<span class="hide-m">Recebido</span></button><a class="btn sm ic" title="Cobrar no WhatsApp" href="${waCharge(i)}" target="_blank" rel="noopener" data-act="chargeWa" data-id="${i.id}">${ic('wa')}</a>` : ''}
        ${isAdmin() ? `<button class="btn sm ic" data-act="editInvoice" data-id="${i.id}">${ic('edit')}</button>` : ''}</div>`; }).join('') : empty(ff !== 'todos' && invAll.length ? 'Nenhuma cobrança nesse filtro.' : 'Sem cobranças de clientes ativos neste mês. Use “Gerar mensalidades” ou marque o pagamento direto no cliente.')}</div></div>
    <div class="card" id="fin-saidas" style="margin-top:14px"><h3>${ic('down')}Saídas / despesas<span class="sp"></span>${isAdmin() ? `<button class="btn sm" data-act="newExpense">${ic('plus')}Despesa</button>` : ''}</h3>
      <div class="list">${exp.length ? exp.map(e => `<div class="li"><div class="t"><b>${esc(e.description)}</b><small>${esc(e.category || 'Geral')} · ${fdate(e.date)}</small></div><b class="num" style="color:var(--bad)">− ${brl(e.amount)}</b>${isAdmin() ? `<button class="btn sm ic" data-act="delExpense" data-id="${e.id}">${ic('trash')}</button>` : ''}</div>`).join('') : empty('Nenhuma despesa registrada no mês.')}</div></div>
    <p class="note" style="margin-top:10px">Uma cobrança só fica “Paga” quando você confirmar que o dinheiro caiu na conta.</p>`;
};
function invoiceForm(i = {}) {
  modal(i.id ? 'Editar cobrança' : 'Nova cobrança', `<div class="f"><input type="hidden" name="id" value="${esc(i.id || '')}">
    ${sel('Cliente *', 'client_id', S.d.clients.map(c => [c.id, c.name]), i.client_id, 'required')}
    <div class="f2">${fld('Valor (R$) *', 'amount', i.amount, 'number', 'step="0.01" min="0.01" required')}${fld('Vencimento *', 'due_date', i.due_date || today(), 'date', 'required')}</div>
    ${fld('Descrição', 'description', i.description || 'Mensalidade')}
    ${i.id ? sel('Status', 'status', [['pendente', 'Automático (pelo vencimento)'], ['areceber', 'A receber'], ['atrasado', 'Em atraso'], ['cancelado', 'Cancelado']].concat(i.status === 'pago' ? [['pago', 'Pago']] : []), i.status) : ''}
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
/* ---------- REUNIÕES (Bravus Meetings) ---------- */
const MTYPES = [['comercial', 'Comercial (primeira conversa)'], ['proposta', 'Apresentação de proposta'], ['alinhamento', 'Alinhamento'], ['onboarding', 'Onboarding / implantação'], ['resultado', 'Resultados / relatório'], ['outro', 'Outro']];
const MFORMATS = [['meet', 'Google Meet'], ['whatsapp', 'Vídeo no WhatsApp'], ['ligacao', 'Ligação'], ['presencial', 'Presencial']];
const MSTATUS = [['pendente', 'Agendada'], ['feito', 'Realizada'], ['noshow', 'Não compareceu'], ['remarcada', 'Remarcada'], ['cancelada', 'Cancelada']];
const MOUT = [['', '—'], ['fechou', 'Fechou'], ['negociando', 'Em negociação'], ['perdido', 'Não fechou']];
const TICKETS = [['baixo', 'Baixo', 'ok'], ['medio', 'Médio', 'warn'], ['alto', 'Alto', 'bad']];
const ticketChip = t => { const x = TICKETS.find(k => k[0] === t.ticket); return x ? `<span class="chip ${x[2]}" title="Ticket ${x[1]}">${ic('wallet')}${x[1]}</span>` : ''; };
const ticketPick = v => `<div class="fl">Ticket<div class="seg" role="radiogroup">${[['', 'Sem ticket', ''], ...TICKETS].map(x => `<label class="${x[2]}"><input type="radio" name="ticket" value="${x[0]}" ${(v || '') === x[0] ? 'checked' : ''}><span>${x[1]}</span></label>`).join('')}</div></div>`;
const lbl = (L, k) => (L.find(x => x[0] === k) || ['', k || '—'])[1];
const meetings = () => realTasks().filter(t => t.kind === 'reuniao');
const meetWho = t => t.company || (t.client_id && cname(t.client_id)) || t.contact_name || t.title;
const meetChip = t => { const s = t.status === 'pendente' && isLate(t) ? ['warn', 'Aguardando resultado'] : [{ feito: 'ok', noshow: 'bad', cancelada: 'bad', remarcada: 'warn' }[t.status] || 'blue', lbl(MSTATUS, t.status)]; return `<span class="chip ${s[0]}">${esc(s[1])}</span>`; };
/* lê a conversa colada do WhatsApp e tenta achar data, hora e telefone */
function parseWa(txt) {
  const out = {}; const t = (txt || '').toLowerCase();
  const tm = t.match(/(\d{1,2})\s*(?:h|:)\s*(\d{2})?\s*(?:h|hrs|horas)?/); if (tm && +tm[1] < 24) out.time = `${pad(+tm[1])}:${pad(+(tm[2] || 0))}`;
  const d = new Date(); let date = null;
  const dm = t.match(/(?:dia\s*)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/) || t.match(/dia\s+(\d{1,2})\b/);
  if (dm) { const y = dm[3] ? (+dm[3] < 100 ? 2000 + +dm[3] : +dm[3]) : d.getFullYear(); const mo = dm[2] ? +dm[2] - 1 : d.getMonth(); let x = new Date(y, mo, +dm[1], 12); if (!dm[2] && x < d) x.setMonth(x.getMonth() + 1); date = x; }
  else if (/depois de amanh/.test(t)) { date = new Date(); date.setDate(date.getDate() + 2); }
  else if (/amanh/.test(t)) { date = new Date(); date.setDate(date.getDate() + 1); }
  else if (/\bhoje\b/.test(t)) date = new Date();
  else { const W = ['domingo', 'segunda', 'terça|terca', 'quarta', 'quinta', 'sexta', 'sábado|sabado']; const i = W.findIndex(w => new RegExp(`\\b(${w})`).test(t)); if (i >= 0) { date = new Date(); date.setDate(date.getDate() + (((i - date.getDay()) + 7) % 7 || 7)); } }
  if (date) out.date = iso(date);
  const ph = (txt || '').match(/(?:\+?55\s*)?\(?\d{2}\)?\s*9?\s*\d{4}[-\s]?\d{4}/); if (ph) out.phone = ph[0].trim();
  return out;
}
/* horários livres: dias da semana e blocos a partir do horário das reuniões */
const hm2m = h => { const [a, b] = String(h || '0:0').split(':'); return (+a || 0) * 60 + (+b || 0); };
const m2hm = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const dayName = (ds, i) => i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : WD[new Date(ds + 'T12:00:00').getDay()];
const busyMeet = t => !['cancelada', 'remarcada', 'noshow'].includes(t.status);
/* regra dos membros (não admin): seg–sex só a partir das 18:30; sábado, domingo e feriado em qualquer horário. Admin é livre. */
const MEMBER_MEET_START = '18:30';
const HOL = {};
function holidays(y) {
  if (HOL[y]) return HOL[y];
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const easter = new Date(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1, 12);
  const rel = n => { const x = new Date(easter); x.setDate(x.getDate() + n); return iso(x); };
  const out = {};
  [['01-01', 'Confraternização Universal'], ['03-19', 'São José (CE)'], ['03-25', 'Data Magna do Ceará'], ['04-13', 'Aniversário de Fortaleza'], ['04-21', 'Tiradentes'], ['05-01', 'Dia do Trabalho'], ['08-15', 'N. Sra. da Assunção (Fortaleza)'], ['09-07', 'Independência'], ['10-12', 'N. Sra. Aparecida'], ['11-02', 'Finados'], ['11-15', 'Proclamação da República'], ['11-20', 'Consciência Negra'], ['12-25', 'Natal']].forEach(([md, n]) => { out[`${y}-${md}`] = n; });
  out[rel(-48)] = 'Carnaval'; out[rel(-47)] = 'Carnaval'; out[rel(-2)] = 'Sexta-feira Santa'; out[rel(60)] = 'Corpus Christi';
  return (HOL[y] = out);
}
/* datas comerciais (não são feriado, mas são ótimas para campanhas) */
function salesDates(y) {
  const nth = (mo, wd, n) => { const x = new Date(y, mo, 1, 12); x.setDate(1 + ((wd - x.getDay() + 7) % 7) + (n - 1) * 7); return iso(x); };
  const bf = (() => { const x = new Date(nth(10, 4, 4) + 'T12:00:00'); x.setDate(x.getDate() + 1); return iso(x); })();
  const e = Object.entries(holidays(y)).find(([, n]) => n === 'Sexta-feira Santa'); const pas = e ? (x => { x.setDate(x.getDate() + 2); return iso(x); })(new Date(e[0] + 'T12:00:00')) : null;
  const out = { [`${y}-03-08`]: 'Dia da Mulher', [`${y}-03-15`]: 'Dia do Consumidor', [nth(4, 0, 2)]: 'Dia das Mães', [`${y}-06-12`]: 'Dia dos Namorados', [nth(7, 0, 2)]: 'Dia dos Pais', [`${y}-09-15`]: 'Dia do Cliente', [bf]: 'Black Friday', [`${y}-12-31`]: 'Réveillon' };
  if (pas) out[pas] = 'Páscoa';
  return out;
}
/* próximas datas (feriados + comerciais) dentro de N dias, a partir de hoje */
function upcomingDates(n) {
  const out = []; const t0 = today();
  for (let i = 0; i <= n; i++) { const ds = addDays(t0, i); const h = holidayName(ds), c = salesDates(+ds.slice(0, 4))[ds]; if (h) out.push({ ds, i, name: h, hol: true }); if (c && c !== h) out.push({ ds, i, name: c, hol: false }); }
  return out;
}
const GCAL_HOL = 'https://calendar.google.com/calendar/u/0/r?cid=' + encodeURIComponent('pt-br.brazilian#holiday@group.v.calendar.google.com');
const holidayName = ds => ds ? holidays(+ds.slice(0, 4))[ds] || '' : '';
const meetFreeDay = ds => { const w = new Date(ds + 'T12:00:00').getDay(); return w === 0 || w === 6 || !!holidayName(ds); };
const meetAllowed = (ds, tm) => isAdmin() || !ds || meetFreeDay(ds) || hm2m(tm) >= hm2m(MEMBER_MEET_START);
const meetRuleMsg = ds => holidayName(ds) ? `Feriado (${holidayName(ds)}): pode marcar em qualquer horário.` : meetFreeDay(ds) ? 'Fim de semana: pode marcar em qualquer horário.' : `Segunda a sexta: reuniões a partir das ${MEMBER_MEET_START}.`;
function daySlots(ds, who) {
  const dur = Math.max(15, +S.set.meet_slot || 60), st = hm2m(S.set.meetings_start || '18:30'), en = Math.max(hm2m(S.set.meetings_end || '21:30'), st + dur);
  const ms = meetings().filter(t => t.date === ds && t.time && busyMeet(t) && (!who || t.assignee === who));
  const past = ds < today() || (ds === today() ? hm2m(nowHM()) : -1);
  const isPast = m => past === true || (typeof past === 'number' && past >= m);
  const out = [];
  for (let m = st; m + dur <= en; m += dur) {
    const hit = ms.filter(t => { const a = hm2m(t.time); return a < m + dur && a + dur > m; });
    out.push({ time: m2hm(m), meets: hit, past: isPast(m), locked: !hit.length && !meetAllowed(ds, m2hm(m)) });
  }
  // reuniões fora do bloco padrão (ex.: 12:00) também aparecem e contam como ocupadas
  ms.filter(t => !out.some(x => x.meets.includes(t))).forEach(t => out.push({ time: t.time, meets: [t], past: isPast(hm2m(t.time)) }));
  return out.sort((a, b) => hm2m(a.time) - hm2m(b.time));
}
function weekStrip(who) {
  const days = []; const d0 = new Date(); for (let i = 0; i < 7; i++) { const d = new Date(d0); d.setDate(d0.getDate() + i); days.push(iso(d)); }
  const sel = days.includes(S.meetDay) ? S.meetDay : days[0];
  const info = days.map((ds, i) => { const sl = daySlots(ds, who); const free = sl.filter(x => !x.past && !x.locked && !x.meets.length).length; const busy = sl.filter(x => x.meets.length).length; return { ds, i, free, busy, open: sl.filter(x => !x.past).length }; });
  const slots = daySlots(sel, who);
  const tag = x => x.open === 0 ? ['off', 'Encerrado'] : x.free === 0 ? ['bad', 'Lotado'] : ['ok', `${x.free} livre${x.free > 1 ? 's' : ''}`];
  const hol = holidayName(sel);
  return `<div class="card wk-card" style="margin-bottom:14px"><h3>${ic('cal')}Horários da semana <span class="muted small" style="font-weight:400;margin-left:auto">blocos de ${S.set.meet_slot || 60} min · ${esc(S.set.meetings_start)} às ${esc(S.set.meetings_end || '21:30')}</span></h3>
    <div class="wk">${info.map(x => { const [c, t] = tag(x); return `<button class="wd ${c} ${x.ds === sel ? 'on' : ''}" data-act="meetDay" data-d="${x.ds}"><b>${dayName(x.ds, x.i)}</b><small>${fdate(x.ds)}${holidayName(x.ds) ? ' · feriado' : ''}</small><i>${t}</i></button>`; }).join('')}</div>
    ${hol || !isAdmin() ? `<p class="note" style="margin:8px 0 0">${hol ? `${esc(hol)} · ` : ''}${isAdmin() ? 'Você pode marcar em qualquer horário.' : esc(meetRuleMsg(sel))}</p>` : ''}
    <div class="slots">${slots.map(x => x.meets.length
      ? `<button class="slot busy" data-act="editMeet" data-id="${x.meets[0].id}"><b>${x.time}</b><span>Ocupado</span><small>${esc(x.meets[0].time)} · ${esc(meetWho(x.meets[0]))}</small></button>`
      : x.past ? `<div class="slot past"><b>${x.time}</b><span>Passou</span></div>`
      : x.locked ? `<div class="slot past" title="${esc(meetRuleMsg(sel))}"><b>${x.time}</b><span>Fora da regra</span></div>`
      : `<button class="slot free" data-act="meetSlot" data-d="${sel}" data-t="${x.time}"><b>${x.time}</b><span>Livre</span><small>toque para marcar</small></button>`).join('')}</div></div>`;
}
V.reunioes = () => {
  const k = S.meetMonth || curYM(); const mine = S.meetWho || '';
  const tk = S.meetTicket || '';
  const allWho = meetings().filter(t => !mine || t.assignee === mine);
  const all = allWho.filter(t => !tk || (tk === 'sem' ? !t.ticket : t.ticket === tk));
  const ms = all.filter(t => ym(t.date) === k).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  const real = ms.filter(t => t.status === 'feito'), nos = ms.filter(t => t.status === 'noshow'), past = ms.filter(t => t.date < today() || t.status !== 'pendente');
  const com = ms.filter(t => ['comercial', 'proposta'].includes(t.meet_type || 'comercial'));
  const won = ms.filter(t => t.outcome === 'fechou');
  const decided = real.length + nos.length;
  const label = (l => l[0].toUpperCase() + l.slice(1))(new Date(k + '-15T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
  const shift = n => { const d = new Date(k + '-15T12:00:00'); d.setMonth(d.getMonth() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
  const prev = all.filter(t => ym(t.date) === shift(-1)).length;
  const next = all.filter(t => t.status === 'pendente' && (t.date > today() || (t.date === today() && (t.time || '') >= nowHM()))).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const pend = all.filter(t => t.status === 'pendente' && isLate(t));
  const row = t => `<div class="li"><div class="mtime ${t.date === today() ? 'hj' : ''}" data-act="editMeet" data-id="${t.id}"><b>${esc(t.time || '--:--')}</b><small>${t.date === today() ? 'Hoje' : t.date === iso(new Date(Date.now() + 864e5)) ? 'Amanhã' : WD[new Date(t.date + 'T12:00:00').getDay()] + ' ' + fdate(t.date)}</small></div><div class="t" data-act="editMeet" data-id="${t.id}" style="cursor:pointer"><b>${esc(meetWho(t))}${t.contact_name && t.company ? ` <span class="muted" style="font-weight:400">· ${esc(t.contact_name)}</span>` : ''}</b><small>${esc(lbl(MTYPES, t.meet_type || 'comercial'))} · ${esc(lbl(MFORMATS, t.meet_format || 'meet'))} · ${esc(firstName(t.assignee))}${t.outcome ? ' · ' + esc(lbl(MOUT, t.outcome)) : ''}</small></div>${ticketChip(t)}${meetChip(t)}</div>`;
  return head('Reuniões', 'Bravus Meetings · tudo que você marca com clientes, organizado e contado', `<button class="btn pri" data-act="editMeet">${ic('plus')}Reunião</button>`) + `
    <div class="row wrap" style="gap:10px;margin-bottom:14px"><div class="datebar" style="margin:0"><button class="btn sm ic" data-act="meetMonth" data-m="${shift(-1)}">${ic('left')}</button><b>${label}</b><button class="btn sm ic" data-act="meetMonth" data-m="${shift(1)}">${ic('right')}</button></div><span class="sp"></span>
      <div class="tabs" style="margin:0">${[['', 'Todos'], ...team().map(p => [p.id, p.name.split(' ')[0]])].map(x => `<button data-act="meetWho" data-id="${x[0]}" class="${mine === x[0] ? 'on' : ''}">${esc(x[1])}</button>`).join('')}</div></div>
    <div class="row wrap" style="gap:10px;margin-bottom:14px"><span class="muted small" style="font-weight:600">Ticket</span><div class="tabs tk-tabs" style="margin:0">${(() => { const mm = allWho.filter(t => ym(t.date) === k); return [['', 'Todos', '', mm.length], ...TICKETS.map(x => [x[0], x[1], x[2], mm.filter(t => t.ticket === x[0]).length]), ['sem', 'Sem ticket', '', mm.filter(t => !t.ticket).length]].map(x => `<button data-act="meetTicket" data-id="${x[0]}" class="${x[2]} ${tk === x[0] ? 'on' : ''}">${esc(x[1])} <small>${x[3]}</small></button>`).join(''); })()}</div></div>
    ${weekStrip(mine)}
    <div class="grid g4" style="margin-bottom:14px">
      ${kpi('Reuniões no mês', ms.length, `${prev} no mês anterior${prev ? ` (${ms.length >= prev ? '+' : ''}${Math.round((ms.length - prev) / prev * 100)}%)` : ''}`, 'hl')}
      ${kpi('Realizadas', `<span style="color:var(--ok)">${real.length}</span>`, `${nos.length} não compareceu${pend.filter(t => ym(t.date) === k).length ? ` · <b style="color:var(--warn,#ffbe50)">${pend.filter(t => ym(t.date) === k).length} aguardando resultado</b>` : ''}`)}
      ${kpi('Comparecimento', decided ? Math.round(real.length / decided * 100) + '%' : '—', 'realizadas ÷ (realizadas + faltas)')}
      ${kpi('Fecharam', `<span style="color:var(--ok)">${won.length}</span>`, `${com.length ? Math.round(won.length / com.length * 100) : 0}% das comerciais · ${ms.filter(t => t.outcome === 'negociando').length} em negociação`)}
    </div>
    ${pend.length ? `<div class="card" style="margin-bottom:14px;border-color:rgba(255,190,80,.45)"><h3>${ic('bell')}Já passaram — como foi? (${pend.length})</h3><div class="list">${pend.slice(0, 8).map(t => `<div class="li"><div class="t"><b>${esc(meetWho(t))}</b><small>${fdate(t.date)} ${esc(t.time || '')}</small></div><button class="btn sm ok" data-act="meetSet" data-id="${t.id}" data-s="feito">${ic('check')}Realizada</button><button class="btn sm" data-act="meetSet" data-id="${t.id}" data-s="noshow">Faltou</button></div>`).join('')}</div></div>` : ''}
    <div class="grid g2">
      <div class="card"><h3>${ic('cal')}Próximas</h3><div class="list">${next.length ? next.slice(0, 10).map(t => row(t).replace('</div><span', `</div>${t.phone || (client(t.client_id) || {}).whatsapp ? `<button class="btn sm ic" data-act="meetConfirm" data-id="${t.id}" title="Confirmar no WhatsApp">${ic('wa')}</button>` : ''}<span`)).join('') : empty('Nenhuma reunião marcada. Use “+ Reunião”.')}</div></div>
      <div class="card"><h3>${ic('chat')}Por tipo no mês</h3><div class="list">${MTYPES.map(([kk, nm]) => { const n = ms.filter(t => (t.meet_type || 'comercial') === kk).length; return n ? `<div class="li"><div class="t"><b style="font-weight:500">${esc(nm)}</b></div><b class="num">${n}</b></div>` : ''; }).join('') || empty('Sem reuniões neste mês.')}</div></div>
    </div>
    <div class="card" style="margin-top:14px"><h3>${ic('file')}Todas de ${label.split(' ')[0].toLowerCase()} (${ms.length})</h3><div class="list">${ms.length ? ms.slice().reverse().map(row).join('') : empty('Sem reuniões neste mês.')}</div></div>`;
};
function meetForm(t = {}) {
  const c = t.client_id ? client(t.client_id) : null;
  modal(t.id ? 'Editar reunião' : 'Nova reunião', `<div class="f">
    <input type="hidden" name="id" value="${esc(t.id || '')}">
    ${t.id ? '' : `<label class="fl">Colar conversa do WhatsApp (opcional)<textarea id="waPaste" rows="2" placeholder="Cole aqui a mensagem em que marcou a reunião, ex.: “Fechado, amanhã às 19h pelo Meet”. Eu preencho data e hora."></textarea></label>`}
    ${sel('Cliente da carteira', 'client_id', clientOpts('Não é cliente ainda (lead / prospecção)'), t.client_id || '')}
    <div class="f2">${fld('Nome do contato', 'contact_name', t.contact_name || (c && c.contact) || '', 'text', 'maxlength="80"')}${fld('Empresa', 'company', t.company || (c && c.name) || '', 'text', 'maxlength="100"')}</div>
    <div class="f2">${fld('WhatsApp', 'phone', t.phone || (c && c.whatsapp) || '', 'tel', 'placeholder="(85) 9 9999-9999"')}${sel('Responsável', 'assignee', teamOpts(), t.assignee || S.me.id)}</div>
    <div class="f2">${fld('Data *', 'date', t.date || today(), 'date', 'required')}${fld('Horário *', 'time', t.time || S.set.meetings_start, 'time', 'required')}</div>
    <div class="f2">${sel('Tipo', 'meet_type', MTYPES, t.meet_type || 'comercial')}${sel('Formato', 'meet_format', MFORMATS, t.meet_format || 'meet')}</div>
    ${ticketPick(t.ticket)}
    <p class="note" id="meetRule" style="margin:0"></p>
    <div class="f2">${sel('Status', 'status', MSTATUS, t.status || 'pendente')}${sel('Resultado', 'outcome', MOUT, t.outcome || '')}</div>
    ${area('Anotações', 'description', t.description)}
  </div>`, { form: 'saveMeet', footer: `${t.id ? `<button type="button" class="btn bad" data-act="delTask" data-id="${t.id}">${ic('trash')}</button>${t.outcome === 'fechou' && !t.client_id ? `<button type="button" class="btn ok" data-act="meetToClient" data-id="${t.id}">${ic('plus')}Virar cliente</button>` : ''}<span class="sp"></span>` : ''}<button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">Salvar</button>` });
  const fm = $('#modal-root form[data-form="saveMeet"]'); let stTouched = !!t.id;
  const chk = () => { if (!fm) return; const ds = fm.date.value, tm = fm.time.value, r = $('#meetRule'); const passed = ds && tm && (ds < today() || (ds === today() && tm <= nowHM()));
    if (!stTouched && fm.status.value !== 'feito' && passed) fm.status.value = 'feito'; if (!stTouched && !passed && fm.status.value === 'feito') fm.status.value = 'pendente';
    const ok = meetAllowed(ds, tm); const msg = isAdmin() ? (passed && !t.id ? 'Esta reunião já aconteceu: ela entra como Realizada e já conta no painel.' : '') : (ok ? meetRuleMsg(ds) : `Fora do horário permitido. ${meetRuleMsg(ds)}`) + (passed && !t.id && ok ? ' Já aconteceu: entra como Realizada.' : '');
    if (r) { r.textContent = msg; r.style.display = msg ? '' : 'none'; r.style.color = ok ? '' : 'var(--bad,#ff6b7a)'; } };
  if (fm) { fm.status.addEventListener('change', () => { stTouched = true; }); fm.date.addEventListener('input', chk); fm.time.addEventListener('input', chk); chk(); }
  const wa = $('#waPaste'); if (wa) wa.addEventListener('input', () => { const p = parseWa(wa.value), f = wa.form; if (p.date) f.date.value = p.date; if (p.time) f.time.value = p.time; if (p.phone && !f.phone.value) f.phone.value = p.phone; chk(); });
  const cs = $('#modal-root select[name="client_id"]'); if (cs) cs.addEventListener('change', () => { const x = client(cs.value), f = cs.form; if (!x) return; f.company.value = x.name; if (!f.contact_name.value) f.contact_name.value = x.contact || ''; if (!f.phone.value) f.phone.value = x.whatsapp || x.phone || ''; f.meet_type.value = 'alinhamento'; });
}
V.agenda = () => {
  const d = S.agendaDate, who = S.agendaWho || S.me.id;
  const dow = new Date(d + 'T12:00:00').getDay(); const wk = dow === 0 || dow === 6;
  let ts = realTasks().filter(t => t.date === d && (who === 'all' ? true : t.assignee === who));
  ts.sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
  const done = ts.filter(t => t.status === 'feito').length;
  const goals = ts.filter(t => t.goal);
  const late = realTasks().filter(t => isLate(t) && t.date < d && (who === 'all' || t.assignee === who));
  return head(wk ? 'Bravus Weekend' : 'Bravus Daily', wk ? 'Produção de conteúdo para a semana' : 'Rotina organizada automaticamente', isAdmin() ? `<button class="btn pri" data-act="newTask">${ic('plus')}Nova</button>` : `<button class="btn pri" data-act="editMeet">${ic('plus')}Reunião</button>`) + `
    <div class="row wrap" style="margin-bottom:14px;justify-content:space-between">
      <div class="datebar"><button class="btn sm ic" data-act="agDate" data-d="${addDays(d, -1)}">${ic('left')}</button><b>${d === today() ? 'Hoje' : esc(fdateL(d).split(',')[0])} · ${fdate(d)}</b><button class="btn sm ic" data-act="agDate" data-d="${addDays(d, 1)}">${ic('right')}</button>${d !== today() ? `<button class="btn sm" data-act="agDate" data-d="${today()}">Hoje</button>` : ''}</div>
      ${isAdmin() ? `<div class="tabs">${team().map(p => `<button data-act="agWho" data-w="${p.id}" class="${who === p.id ? 'on' : ''}">${esc(p.name.split(' ')[0])}</button>`).join('')}<button data-act="agWho" data-w="all" class="${who === 'all' ? 'on' : ''}">Todos</button></div>` : ''}
    </div>
    ${(() => { const h = holidayName(d), c = salesDates(+d.slice(0, 4))[d]; return h || c ? `<div class="card" style="margin-bottom:14px;border-color:rgba(255,190,80,.45)"><b>${ic('cal')} ${esc(h || c)}</b> <span class="muted small">· ${h ? 'feriado' : 'data comercial'}</span></div>` : ''; })()}
    <div class="grid g3" style="margin-bottom:14px">${kpi('Concluídas', `${done}/${ts.length}`, `${ts.length ? Math.round(done / ts.length * 100) : 0}% do dia`, 'hl')}${goals.length ? goals.slice(0, 2).map(g => kpi(g.title.replace(/\(.*\)/, '').slice(0, 32), `${g.count || 0}/${g.goal}`, 'meta do dia', (g.count || 0) >= g.goal ? 'g' : '')).join('') : kpi('Reuniões', ts.filter(t => t.kind === 'reuniao').length, 'no dia') + kpi('Ligações', ts.filter(t => t.kind === 'ligacao').length, `a partir das ${S.set.calls_start}`)}</div>
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
    ${isAdmin() && !template ? `<label class="sw"><input type="checkbox" name="override"> Permitir ligação fora da regra (antes das ${S.set.calls_start})</label>` : ''}
    ${!template ? `<p class="note">Regra: ligações a partir das ${S.set.calls_start}. Reuniões: administrador em qualquer horário; membros de segunda a sexta a partir das ${MEMBER_MEET_START}, e em qualquer horário no fim de semana e feriados.</p>` : ''}
  </div>`, { form: 'saveTask', footer: `${t.id ? `<button type="button" class="btn bad" data-act="delTask" data-id="${t.id}">${ic('trash')}</button>${!template && t.date ? `<button type="button" class="btn" data-act="taskCal" data-id="${t.id}" title="Adicionar ao calendário">${ic('cal')}<span class="hide-m">Calendário</span></button>` : ''}<span class="sp"></span>` : ''}<button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">Salvar</button>` });
}

/* ---------- CONTEÚDO (calendário editorial) ---------- */
const CST = [['ideia', 'Ideia'], ['gravado', 'Gravado'], ['editado', 'Editado'], ['aprovacao', 'Aprovação'], ['agendado', 'Agendado'], ['publicado', 'Publicado']];
const CHN = [['reels', 'Reels'], ['feed', 'Feed'], ['stories', 'Stories'], ['youtube', 'YouTube'], ['shorts', 'Shorts']];
V.conteudo = () => {
  const start = S.contentWeek || (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(d); })();
  S.contentWeek = start; const end = addDays(start, 6);
  const items = S.d.content.filter(c => !c.date || (c.date >= start && c.date <= end) || c.status === 'ideia');
  return head('Conteúdo', 'Calendário editorial · prepare a semana no fim de semana', isAdmin() ? `<button class="btn pri" data-act="editContent">${ic('plus')}Conteúdo</button>` : '') + `
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

/* =====================================================================
   CHAT FLUTUANTE (Conversa + Anotações) · avisos de versão · popups
   ===================================================================== */
const RELEASE = { version: '2.6.3', notes: [
  'Alertas: botões “Lidos de hoje” e “Todos lidos”, com a contagem de não lidos.',
  'Tempo online mais enxuto: só Hoje e Total, proporcional no celular.',
  'Tempo online: o app conta o tempo que cada um passa no Bravus Work (hoje, 7 dias, mês e total) e mostra para todos, no topo, na Equipe e no Painel.',
  'Clientes com ticket Ouro, Prata e Bronze: selo colorido no card, filtro com contagem e cards ordenados do Ouro para o Bronze.',
  'Ticket automático pelo valor do contrato (Bronze até R$ 800 · Prata acima de R$ 800 · Ouro a partir de R$ 1.200), ou marcado à mão na conta de cada cliente.',
  'Status online corrigido: você aparece online na hora em que abre ou volta para o app.',
  'Painel conectado a todo o Bravus Work: novo resumo do mês com reuniões, tarefas, prospecções, clientes, conteúdo e financeiro, cada um levando para a sua aba.',
  'Reuniões que já passaram sem resultado aparecem nas Prioridades de hoje e no card de Reuniões; um toque e você marca Realizada ou Faltou.',
  'Dá para registrar uma reunião que já aconteceu: se a data/hora já passou, ela entra como Realizada e conta na hora.',
  'Reuniões fora do horário padrão (ex.: 12:00) agora aparecem ocupando o horário na semana.',
  'Membros (Priscila): reuniões de segunda a sexta a partir das 18:30; sábado, domingo e feriados em qualquer horário. O administrador marca e edita em qualquer horário.',
  'Excluir cliente: só o administrador (também travado no banco).',
  'Feriados no calendário (os mesmos do Google Agenda, mais Ceará e Fortaleza) e datas comerciais (Dia das Mães, Black Friday…). Aviso 7 dias antes para criar panfleto, flyer e desconto.',
  'Reuniões: agora dá para marcar em qualquer horário, sem trava de regra.',
  'Reuniões: botões de Ticket (Baixo, Médio, Alto) dentro de cada reunião, selo colorido na lista e filtro por ticket com contagem do mês.',
  'Você continua conectado: fechar o app ou ficar sem usar não desliga mais a sessão. Só sai se tocar no cadeado.',
  'Botão do chat flutuante: segure e arraste para qualquer lugar da tela; ele gruda na lateral mais próxima e lembra a posição.',
  'Painel: toque em qualquer card (Entrou no mês, A receber, Em atraso, Saldo, Clientes, Inadimplentes, Reuniões, Receita) e vá direto para a aba certa, já filtrada.',
  'Financeiro: filtro de cobranças (Todas, Pagas, A receber, Em atraso).',
  'Reuniões: menu da semana (Hoje, Amanhã, Qua, Qui…) mostrando só se há horário livre ou lotado; toque num horário livre para marcar.',
  'Horário das reuniões em destaque na lista.',
  'Celular: a tela de Alertas (e as outras) não volta mais para o topo enquanto você rola; avisos aparecem com o texto completo.',
  'Adicionar e remover membros da equipe, com senha definida por você.',
  'Quem está online aparece no topo da tela.',
  'Selo de pagamento corrigido: cobranças canceladas não contam mais como "em dia".',
  'Chat flutuante no canto direito: converse enquanto mexe em qualquer tela.',
  'Aba Anotações no chat para guardar o que é importante (fixe qualquer mensagem com 📌).',
  'Confirmação de leitura: ✓ enviado · ✓✓ visto.',
  'Avisos na tela de tudo: mensagens, cliente novo, pagamentos, vencimentos, reuniões e prospecção.',
  'Tela de Metas, Reuniões e controle manual de pagamentos.'
] };
const CW = { open: lsGet('bw_cw_open', false), tab: 'chat', seenSent: 0 };
const msgTime = iso => { const d = new Date(iso), h = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); return d.toDateString() === new Date().toDateString() ? h : `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${h}`; };
const seenBy = m => team().filter(p => p.id !== m.user_id && p.chat_seen_at && p.chat_seen_at >= m.created_at);
function cwShell() {
  const others = team().filter(p => p.id !== S.me.id);
  return `<header class="cw-hd"><div class="sp"><b>Chat da equipe</b><small>${others.map(p => `<span><i class="dot ${isOnline(p) ? 'on' : ''}"></i>${esc(firstName(p.id))} ${isOnline(p) ? 'online' : '· ' + ago(p.last_seen)}</span>`).join('')}</small></div>
      <button class="btn sm ic" data-act="chatToggle" aria-label="Fechar">${ic('x')}</button></header>
    <div class="cw-tabs"><button class="${CW.tab === 'chat' ? 'on' : ''}" data-act="cwTab" data-t="chat">${ic('chat')}Conversa</button><button class="${CW.tab === 'notas' ? 'on' : ''}" data-act="cwTab" data-t="notas">📌 Anotações <span class="muted">${S.d.messages.filter(m => m.pinned).length || ''}</span></button></div>
    <div class="cw-list" id="cwList">${cwList()}</div>
    <form class="cw-form" data-form="${CW.tab === 'chat' ? 'sendMsg' : 'sendNote'}"><textarea id="chatInput" name="text" rows="1" maxlength="4000" placeholder="${CW.tab === 'chat' ? 'Escreva uma mensagem…' : 'Nova anotação importante…'}" required></textarea><button class="btn pri ic" aria-label="Enviar">${ic('send')}</button></form>`;
}
function cwList() {
  if (CW.tab === 'notas') {
    const ns = S.d.messages.filter(m => m.pinned).sort((a, b) => b.created_at.localeCompare(a.created_at));
    return ns.length ? ns.map(m => `<div class="cw-note"><div class="row" style="gap:6px"><b class="small">${esc(firstName(m.user_id))}</b><span class="small muted">${msgTime(m.created_at)}</span><span class="sp"></span><button class="btn sm ic" data-act="msgPin" data-id="${m.id}" title="Tirar das anotações">${ic('x')}</button>${m.user_id === S.me.id || isAdmin() ? `<button class="btn sm ic" data-act="msgDel" data-id="${m.id}" title="Apagar">${ic('trash')}</button>` : ''}</div><p>${esc(m.text)}</p></div>`).join('')
      : `<div class="cw-empty">Nada anotado ainda.<br><span class="small">Escreva abaixo ou toque em 📌 numa mensagem da conversa.</span></div>`;
  }
  const ms = S.d.messages.slice().sort((a, b) => a.created_at.localeCompare(b.created_at)).slice(-150);
  if (!ms.length) return `<div class="cw-empty">Nenhuma mensagem ainda. Diga um oi 👋</div>`;
  let lastDay = ''; const lastMine = [...ms].reverse().find(m => m.user_id === S.me.id);
  return ms.map(m => { const mine = m.user_id === S.me.id, day = (m.created_at || '').slice(0, 10);
    const sep = day !== lastDay ? `<div class="cw-day">${new Date(m.created_at).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</div>` : ''; lastDay = day;
    const sb2 = mine ? seenBy(m) : []; const tick = mine ? (sb2.length ? '<span class="ck2 on" title="Visto">✓✓</span>' : '<span class="ck2" title="Enviado">✓</span>') : '';
    return `${sep}<div class="cw-m ${mine ? 'me' : ''}">${mine ? '' : `<small class="cw-who">${esc(firstName(m.user_id))}</small>`}<div class="cw-b">${esc(m.text)}<span class="cw-t">${msgTime(m.created_at).slice(-5)} ${tick}</span><button class="cw-pin ${m.pinned ? 'on' : ''}" data-act="msgPin" data-id="${m.id}" title="${m.pinned ? 'Tirar das anotações' : 'Guardar nas anotações'}">📌</button></div>${mine && m === lastMine && sb2.length ? `<small class="cw-seen">Visto por ${sb2.map(p => esc(firstName(p.id))).join(', ')} · ${msgTime(sb2.map(p => p.chat_seen_at).sort().pop())}</small>` : ''}</div>`; }).join('');
}
function presenceHtml() {
  return team().map(p => { const on = isOnline(p); return `<span class="pr ${on ? 'on' : ''}" data-act="editProfile" data-id="${p.id}" title="${esc(p.name)} · ${on ? 'online agora' : 'visto ' + ago(p.last_seen)}">${avatar(p, 28)}<span><b>${esc(firstName(p.id))}${p.id === S.me.id ? ' (você)' : ''}</b><small>${on ? 'online' : 'offline · ' + ago(p.last_seen)} · hoje ${fmtDur(timeToday(p.id))}</small></span></span>`; }).join('');
}
const renderPresence = () => { const el = $('#presence'); if (el && S.me) el.innerHTML = presenceHtml(); };
function renderChat(full = false) {
  const box = $('#cw'), fab = $('#cwFab'); if (!box || !S.me) return;
  const n = chatUnread(); if (fab) { fab.classList.toggle('hide', CW.open); fab.querySelector('.badge') && fab.querySelector('.badge').remove(); if (n && !CW.open) fab.insertAdjacentHTML('beforeend', `<span class="badge">${n}</span>`); }
  box.classList.toggle('on', CW.open); if (!CW.open) { box.innerHTML = ''; return; }
  const list = $('#cwList');
  if (full || !list) { const draft = $('#chatInput') && $('#chatInput').value; box.innerHTML = cwShell(); if (draft) $('#chatInput').value = draft; }
  else { const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 60; list.innerHTML = cwList(); if (!atBottom) return markChatSeen(); }
  const l = $('#cwList'); if (l && CW.tab === 'chat') l.scrollTop = l.scrollHeight;
  markChatSeen();
}
async function markChatSeen() {
  if (!CW.open || CW.tab !== 'chat' || document.hidden) return;
  lastChatSeen = new Date().toISOString(); lsSet('bw_chat_seen', lastChatSeen); renderShellBadges();
  const last = S.d.messages.filter(m => m.user_id !== S.me.id).map(m => m.created_at).sort().pop();
  if (!last || (S.me.chat_seen_at && S.me.chat_seen_at >= last) || Date.now() - CW.seenSent < 4000) return;
  CW.seenSent = Date.now(); try { await store.update('profiles', S.me.id, { chat_seen_at: new Date().toISOString() }); } catch {}
}
/* popup na tela (estilo PRIBANK): ícone/foto, título, texto, clique abre o lugar certo */
function popup(title, body = '', { type = '', who = null, route = null, act = null, ms = 7000 } = {}) {
  const el = document.createElement('div'); el.className = 'toast pop ' + type;
  el.innerHTML = `${who ? avatar(prof(who), 34) : `<span class="pop-ic">${ic(type === 'bad' ? 'bell' : type === 'ok' ? 'check' : type === 'chat' ? 'chat' : 'spark')}</span>`}<div class="sp"><b>${esc(title)}</b>${body ? `<span class="small muted">${esc(body)}</span>` : ''}</div><button class="pop-x" aria-label="Fechar">×</button>`;
  el.addEventListener('click', e => { el.remove(); if (e.target.classList.contains('pop-x')) return; if (act) act(); else if (route) location.hash = route; });
  const box = $('#toasts'); box.appendChild(el); while (box.children.length > 4) box.firstChild.remove(); setTimeout(() => el.remove(), ms);
}
const popMsgSeen = new Set();
function popMsgs() {
  const fresh = S.d.messages.filter(m => m.user_id !== S.me.id && m.created_at >= S.startedAt && !popMsgSeen.has(m.id));
  fresh.forEach(m => popMsgSeen.add(m.id));
  if (CW.open && CW.tab === 'chat' && !document.hidden) return;
  fresh.slice(-3).forEach(m => popup(`${firstName(m.user_id)}${m.pinned ? ' anotou' : ''}`, m.text.slice(0, 140), { type: 'chat', who: m.user_id, act: () => { CW.open = true; CW.tab = m.pinned ? 'notas' : 'chat'; lsSet('bw_cw_open', true); renderChat(true); } }));
}
const notifyTeam = (title, body, type = 'info', key = null, route = null) => notifyUsers(team().filter(p => p.id !== S.me.id).map(p => p.id), title, body, type, key, route);
/* aviso de versão nova */
function releaseNotice() {
  if (lsGet('bw_version_seen', '') === RELEASE.version) return;
  modal(`Versão ${RELEASE.version}`, `<div style="text-align:center;margin-bottom:14px"><div class="rel-ic">${ic('spark')}</div><p style="font-size:18px;font-weight:700;line-height:1.3">Andrade acabou de atualizar o Bravus Work para a versão ${RELEASE.version}!</p></div>
    <div class="sec" style="margin-top:0">O que mudou</div><ul class="rel">${RELEASE.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>`, { footer: `<span class="sp"></span><button type="button" class="btn pri" data-act="releaseOk">Entendi</button>` });
  if (isAdmin()) notifyTeam(`Andrade atualizou o Bravus Work para a versão ${RELEASE.version}`, RELEASE.notes[0], 'info', `release:${RELEASE.version}`, 'painel');
}
async function checkVersion() {
  try { const r = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' }); if (!r.ok) return; const v = (await r.json()).version;
    if (v && v !== RELEASE.version && !$('#updBar')) document.body.insertAdjacentHTML('beforeend', `<div id="updBar" class="updbar">${ic('spark')}<span>Andrade atualizou o Bravus Work para a versão <b>${esc(v)}</b>.</span><button class="btn sm pri" data-act="updateNow">Atualizar</button></div>`);
  } catch {}
}

/* ---------- EQUIPE ---------- */
V.equipe = () => {
  const d = today(); const wk = Array.from({ length: 7 }, (_, i) => addDays(d, -i));
  return head('Equipe', 'Bravus Team · produtividade e presença', isAdmin() && SUPA ? `<button class="btn pri" data-act="newMember">${ic('plus')}Membro</button>` : '') + `<div class="grid g2">${team().map(p => {
    const mine = realTasks().filter(t => t.assignee === p.id);
    const td = mine.filter(t => t.date === d), tdn = td.filter(t => t.status === 'feito').length;
    const w = mine.filter(t => wk.includes(t.date)), wdn = w.filter(t => t.status === 'feito').length;
    const late = mine.filter(isLate).length;
    const goals = td.filter(t => t.goal);
    const acts = S.d.activity.filter(a => a.user_id === p.id).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6);
    return `<div class="card"><div class="row" style="margin-bottom:14px"><span data-act="editProfile" data-id="${p.id}" style="cursor:pointer">${avatar(p, 48)}</span><div class="sp" data-act="editProfile" data-id="${p.id}" style="cursor:pointer"><b style="font-size:16px">${esc(p.name)}</b><div class="small muted">${esc(cargo(p))} · ${isOnline(p) ? '<span style="color:var(--ok)">online agora</span>' : 'offline · último acesso ' + ago(p.last_seen)}</div></div>${p.id === S.me.id || isAdmin() ? `<label class="btn sm" title="Trocar foto">${ic('plus')}Foto<input type="file" accept="image/*" data-act-change="setPhoto" data-id="${p.id}" hidden></label>` : ''}</div>
      <div class="sec" style="margin-top:0">${ic('clock')} Tempo online no Bravus Work</div>
      <div class="grid g4 ot-grid" style="gap:8px;margin-bottom:12px">${kpi('Hoje', fmtDur(timeToday(p.id)), '', isOnline(p) ? 'g' : '')}${kpi('Total', fmtDur(timeOf(p.id)))}</div>
      <div class="sec" style="margin-top:0">Tarefas</div>
      <div class="grid g3" style="grid-template-columns:repeat(3,1fr);gap:8px">${kpi('Hoje', `${tdn}/${td.length}`)}${kpi('Semana', w.length ? Math.round(wdn / w.length * 100) + '%' : '—')}${kpi('Atrasadas', late, '', late ? 'r' : 'g')}</div>
      ${goals.map(g => `<div style="margin-top:10px"><div class="row small"><span>${esc(g.title)}</span><span class="sp"></span><b>${g.count || 0}/${g.goal}</b></div><div class="prog" style="margin-top:4px"><i style="width:${Math.min(100, (g.count || 0) / g.goal * 100)}%"></i></div></div>`).join('')}
      <div class="sec" style="margin-top:16px">Atividades recentes</div><div class="list">${acts.length ? acts.map(a => `<div class="li"><div class="t"><b style="font-weight:500">${esc(a.action)}</b><small>${ago(a.created_at)}</small></div></div>`).join('') : empty('Sem atividades.')}</div></div>`;
  }).join('')}</div>`;
};

/* ---------- ALERTAS ---------- */
V.alertas = () => {
  const ns = S.d.notifications.filter(n => n.user_id === S.me.id).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 100);
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  return head('Alertas', 'Bravus Notify', (() => { const un = S.d.notifications.filter(n => n.user_id === S.me.id && !n.read), ut = un.filter(n => iso(new Date(n.created_at)) === today()); return `<div class="row" style="gap:8px"><button class="btn" data-act="readAll" data-s="hoje" ${ut.length ? '' : 'disabled'} title="Marca como lidos só os alertas de hoje">${ic('check')}Lidos de hoje${ut.length ? ` <small>${ut.length}</small>` : ''}</button><button class="btn pri" data-act="readAll" ${un.length ? '' : 'disabled'} title="Marca todos como lidos">${ic('check')}Todos lidos${un.length ? ` <small>${un.length}</small>` : ''}</button></div>`; })()) + `
    ${perm !== 'granted' ? `<div class="infobox row" style="margin-bottom:14px"><div class="sp">${perm === 'unsupported' ? 'Este navegador não suporta notificações. No iPhone, instale o app na Tela de Início (Compartilhar → Adicionar à Tela de Início) e abra por lá.' : perm === 'denied' ? 'As notificações estão bloqueadas neste aparelho. Libere nas configurações do navegador para este site.' : 'Ative as notificações para receber lembretes no celular e no computador.'}</div>${perm === 'default' ? `<button class="btn pri" data-act="enablePush">${ic('bell')}Ativar</button>` : ''}</div>` : `<div class="row small muted" style="margin-bottom:12px">${ic('bell')}Notificações ativas neste aparelho. <button class="btn sm" data-act="testPush">Testar</button></div>`}
    <div class="card"><div class="list alist">${ns.length ? ns.map(n => `<a class="li" href="#${esc(n.route || 'painel')}" data-act="readOne" data-id="${n.id}" style="${n.read ? 'opacity:.55' : ''}"><i class="dot ${n.type === 'alerta' ? 'bad' : n.type === 'pago' ? 'on' : n.read ? '' : 'warn'}"></i><div class="t"><b>${esc(n.title)}</b><small>${esc(n.body || '')} · ${ago(n.created_at)}</small></div></a>`).join('') : empty('Nenhum alerta por enquanto.')}</div></div>
    <p class="note" style="margin-top:10px">Lembretes no horário exato dependem do sistema do aparelho. Com o app fechado, os avisos chegam pelo servidor (Supabase + push) quando estiver configurado.</p>`;
};

/* ---------- RELATÓRIOS ---------- */
V.relatorios = () => head('Relatórios', 'Bravus Reports · por cliente, prontos para PDF e WhatsApp') + `
  <div class="grid g3">${S.d.clients.filter(c => inWallet(c) && (c.services || []).includes('trafego')).map(c => { const cs = campsOf(c.id); const sp = cs.reduce((a, x) => a + +x.spend, 0); const ld = cs.reduce((a, x) => a + +x.leads, 0); return `<div class="ccard" data-act="clientReport" data-id="${c.id}"><div class="hd"><b>${esc(c.name)}</b>${ic('file')}</div><div class="row small muted"><span>${brl(sp)} investidos</span><span class="sp"></span><span>${int(ld)} leads</span></div></div>`; }).join('') || `<div class="card" style="grid-column:1/-1">${empty('Cadastre clientes com o serviço de tráfego pago para gerar relatórios.')}</div>`}</div>`;
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
/* ---------- METAS (Bravus Goals) ---------- */
const GOALS_DEF = { revenue: 10000, mrr: 10000, clients: 20, new_clients: 3, meetings: 12, closes: 3, prospects: 300 };
const goals = () => ({ ...GOALS_DEF, ...(S.set.goals || {}) });
function goalData(k) {
  const g = goals(), cl = S.d.clients, ms = meetings().filter(t => ym(t.date) === k);
  const prosp = realTasks().filter(t => ym(t.date) === k && /prospec/i.test(t.title || '')).reduce((a, t) => a + (+t.count || 0), 0);
  const rows = [
    canFin() && ['revenue', 'Faturamento recebido', finMonth(k).recebido, g.revenue, true, 'pagamentos marcados como Pago no mês', 'wallet'],
    canFin() && ['mrr', 'Receita recorrente (contratos)', mrr(), g.mrr, true, 'soma dos contratos ativos hoje', 'wallet'],
    ['clients', 'Clientes ativos', cl.filter(inWallet).length, g.clients, false, 'na carteira hoje', 'users'],
    ['new_clients', 'Novos clientes', cl.filter(c => ym(c.start_date || c.created_at) === k).length, g.new_clients, false, 'data de contratação no mês', 'plus'],
    ['meetings', 'Reuniões realizadas', ms.filter(t => t.status === 'feito').length, g.meetings, false, `${ms.length} marcadas no mês`, 'meet'],
    ['closes', 'Fechamentos', ms.filter(t => t.outcome === 'fechou').length, g.closes, false, 'reuniões com resultado “Fechou”', 'check'],
    ['prospects', 'Prospecções', prosp, g.prospects, false, 'contador das tarefas de prospecção', 'chat']
  ].filter(Boolean);
  return rows.map(([key, name, val, goal, money, sub, icon]) => ({ key, name, val: +val || 0, goal: +goal || 0, money, sub, icon, pct: goal ? Math.min(100, Math.round((+val || 0) / goal * 100)) : 0 }));
}
V.metas = () => {
  const k = S.goalMonth || curYM();
  const label = (l => l[0].toUpperCase() + l.slice(1))(new Date(k + '-15T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
  const shift = n => { const d = new Date(k + '-15T12:00:00'); d.setMonth(d.getMonth() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
  const rows = goalData(k); const fmt = (r, v) => r.money ? brl(v) : int(v);
  const done = rows.filter(r => r.goal && r.val >= r.goal).length;
  const avg = rows.length ? Math.round(rows.reduce((a, r) => a + r.pct, 0) / rows.length) : 0;
  const [y, m] = k.split('-').map(Number); const dim = new Date(y, m, 0).getDate();
  const elapsed = k === curYM() ? new Date().getDate() : k < curYM() ? dim : 0; const pace = Math.round(elapsed / dim * 100);
  const g10 = goals().revenue;
  return head('Metas', 'Bravus Goals · acompanhe o mês e o caminho até a meta', isAdmin() ? `<button class="btn pri" data-act="editGoals">${ic('edit')}Editar metas</button>` : '') + `
    <div class="datebar" style="margin-bottom:14px"><button class="btn sm ic" data-act="goalMonth" data-m="${shift(-1)}">${ic('left')}</button><b>${label}</b><button class="btn sm ic" data-act="goalMonth" data-m="${shift(1)}">${ic('right')}</button></div>
    ${canFin() ? (() => { const fm = finMonth(k), prev = fm.recebido + fm.aReceber, nAt = new Set(S.d.invoices.filter(i => invStatus(i) === 'atrasado').map(i => i.client_id)).size; return `<div class="grid g4" style="margin-bottom:14px">
      ${kpi('Entrou no mês', brl(fm.recebido), `${Math.round(fm.recebido / (g10 || 1) * 100)}% da meta de ${brl(g10)}`, 'hl', ['financeiro', 'pago', 'fin-cob'])}
      ${kpi('A receber', brl(fm.aReceber), `previsão do mês: ${brl(prev)}`, 'y', ['financeiro', 'pendente', 'fin-cob'])}
      ${kpi('Em atraso', brl(fm.atrasado), `${nAt} cliente(s)`, fm.atrasado ? 'r' : '', ['financeiro', 'atrasado', 'fin-cob'])}
      ${kpi('Falta para a meta', brl(Math.max(0, g10 - fm.recebido)), prev >= g10 ? 'se todos pagarem, a meta é batida ✅' : `mesmo se todos pagarem, faltam ${brl(g10 - prev)}`, fm.recebido >= g10 ? 'g' : '')}
    </div>`; })() : ''}
    <div class="grid g4" style="margin-bottom:14px">
      ${kpi('Clientes ativos', `${S.d.clients.filter(inWallet).length}<span class="muted" style="font-size:15px"> / ${goals().clients}</span>`, canFin() ? `receita mensal ${brl(mrr())}` : 'na carteira', '', ['clientes', 'online'])}
      ${kpi('Ticket médio', canFin() ? brl(mrr() / (S.d.clients.filter(inWallet).length || 1)) : '—', canFin() && mrr() < goals().mrr ? `faltam ${Math.ceil((goals().mrr - mrr()) / ((mrr() / (S.d.clients.filter(inWallet).length || 1)) || 697))} cliente(s) nesse valor p/ a meta recorrente` : 'por cliente ativo')}
      ${kpi('Metas batidas', `${done}<span class="muted" style="font-size:15px"> / ${rows.length}</span>`, done === rows.length ? 'todas batidas 🎯' : 'no mês')}
      ${kpi('Progresso médio', avg + '%', `${pace}% do mês já passou`, avg >= pace ? 'g' : 'y')}
    </div>
    <div class="grid g2">${rows.map(r => { const ok = r.goal && r.val >= r.goal; const behind = !ok && k === curYM() && r.pct < pace - 10;
      return `<div class="card goal"><div class="row" style="margin-bottom:10px">${ic(r.icon)}<b class="sp">${esc(r.name)}</b>${ok ? '<span class="chip ok">Batida</span>' : behind ? '<span class="chip warn">Abaixo do ritmo</span>' : '<span class="chip blue">No caminho</span>'}</div>
        <div class="row" style="align-items:baseline;gap:8px"><b class="gv">${fmt(r, r.val)}</b><span class="muted">de ${fmt(r, r.goal)}</span><span class="sp"></span><b class="num" style="color:${ok ? 'var(--ok)' : 'var(--tx)'}">${r.pct}%</b></div>
        <div class="prog" style="margin:10px 0 6px;position:relative"><i style="width:${r.pct}%;${ok ? 'background:linear-gradient(90deg,#14a86b,#2bd48a)' : ''}"></i>${k === curYM() ? `<span class="pace" style="left:${pace}%" title="ritmo esperado hoje"></span>` : ''}</div>
        <div class="small muted">${esc(r.sub)}${!ok && r.goal ? ` · faltam ${fmt(r, r.goal - r.val)}` : ''}</div></div>`; }).join('')}</div>
    <p class="note" style="margin-top:12px">A linha branca na barra mostra onde você deveria estar hoje para bater a meta até o fim do mês.</p>`;
};
function goalsForm() {
  const g = goals();
  modal('Editar metas do mês', `<div class="f">
    <div class="f2">${fld('Faturamento recebido (R$)', 'revenue', g.revenue, 'number', 'min="0" step="0.01"')}${fld('Receita recorrente (R$)', 'mrr', g.mrr, 'number', 'min="0" step="0.01"')}</div>
    <div class="f2">${fld('Clientes ativos', 'clients', g.clients, 'number', 'min="0"')}${fld('Novos clientes no mês', 'new_clients', g.new_clients, 'number', 'min="0"')}</div>
    <div class="f2">${fld('Reuniões realizadas no mês', 'meetings', g.meetings, 'number', 'min="0"')}${fld('Fechamentos no mês', 'closes', g.closes, 'number', 'min="0"')}</div>
    ${fld('Prospecções no mês', 'prospects', g.prospects, 'number', 'min="0"')}
    <p class="note">As metas valem para todos os meses até você mudar. Os números do progresso vêm do próprio app: pagamentos, clientes, reuniões e contador de prospecção da agenda.</p>
  </div>`, { form: 'saveGoals', footer: `<button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">Salvar metas</button>` });
}

/* ---------- AJUSTES ---------- */
V.ajustes = () => {
  const s = S.set; const tpls = S.d.tasks.filter(t => t.is_template).sort((a, b) => firstName(a.assignee).localeCompare(firstName(b.assignee)) || (a.time || '').localeCompare(b.time || ''));
  const DN = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const integ = (n, st, how) => `<div class="li"><div class="t"><b>${n}</b><small>${how}</small></div><span class="chip ${st ? 'ok' : ''}">${st ? 'Conectado' : 'Pendente'}</span></div>`;
  return head('Ajustes', 'Somente o administrador vê esta tela') + `
  <form class="card f" data-form="saveSettings"><h3>${ic('gear')}Operação</h3>
    <div class="f2">${fld('Nome da agência', 'agency_name', s.agency_name)}${fld('Limite de clientes', 'max_clients', s.max_clients, 'number', 'min="1" max="500"')}</div>
    <div class="f2">${fld('Ligações a partir de', 'calls_start', s.calls_start, 'time')}${fld('Horários livres da semana começam às', 'meetings_start', s.meetings_start, 'time')}</div>
    <div class="f2">${fld('Última reunião termina às', 'meetings_end', s.meetings_end || '21:30', 'time')}${fld('Duração de cada reunião (min)', 'meet_slot', s.meet_slot || 60, 'number', 'min="15" max="180" step="15"')}</div>
    <div class="f2">${fld('Meta diária de prospecção', 'prospect_goal', s.prospect_goal, 'number')}${fld('Meta diária de follow-ups (Priscila)', 'followup_goal', s.followup_goal, 'number')}</div>
    <div class="f2">${fld('Priscila — início', 'priscila_start', s.priscila_start, 'time')}${fld('Priscila — fim', 'priscila_end', s.priscila_end, 'time')}</div>
    <div class="f2">${fld('Aviso de bom dia às', 'morning_hour', s.morning_hour, 'time')}${fld('Bloquear após (min sem uso · 0 = nunca)', 'lock_minutes', s.lock_v2 ? s.lock_minutes || 0 : 0, 'number', 'min="0" max="240"')}</div>
    ${fld('Lembretes de cobrança (dias em relação ao vencimento)', 'reminder_offsets', (s.reminder_offsets || []).join(', '), 'text', 'placeholder="-5, -2, 0, 1, 5, 10"')}
    <p class="note">Negativo = antes do vencimento · 0 = no dia · positivo = depois.</p>
    <div class="sec" style="margin:4px 0 0">Tipos de notificação</div>
    <div class="cks">${[['tarefas', 'Tarefas e reuniões'], ['financeiro', 'Cobranças'], ['conteudo', 'Conteúdo'], ['chat', 'Chat']].map(n => `<label><input type="checkbox" name="nf_${n[0]}" ${(s.notify || {})[n[0]] !== false ? 'checked' : ''}>${n[1]}</label>`).join('')}</div>
    <div><button class="btn pri">Salvar ajustes</button></div>
  </form>
  <form class="card f" data-form="saveReasons" style="margin-top:14px"><h3>${ic('users')}Motivos de saída do cliente</h3>
    <label class="fl">Frases prontas — uma por linha<textarea name="list" style="min-height:190px">${esc(exitReasons().join('\n'))}</textarea></label>
    <p class="note">Aparecem como botões quando você desativa um cliente ou edita o cadastro. Você ainda pode digitar um motivo diferente na hora. A ordem daqui é a ordem dos botões.</p>
    <div class="row wrap"><button class="btn pri">Salvar motivos</button><button type="button" class="btn" data-act="reasonsReset">Restaurar lista padrão</button></div>
  </form>
  <form class="card f" data-form="saveShutdown" style="margin-top:14px"><h3>${ic('bell')}Comunicado de desligamento (WhatsApp)</h3>
    <label class="sw"><input type="checkbox" name="auto" ${shutCfg().auto ? 'checked' : ''}> <b>Automático ligado</b> — o app identifica sozinho quem entrou na regra e deixa o comunicado pronto (alerta + Prioridades de hoje)</label>
    <div class="f2"><input type="hidden" name="trigger" value="atraso">${fld('Prazo em dias', 'days', shutCfg().days, 'number', 'min="1" max="90"')}</div>
    <p class="note">Dispara quando a mensalidade passar este número de dias em atraso.</p>
    <label class="fl">Texto da mensagem<textarea name="msg" style="min-height:260px">${esc(nText('shutdown'))}</textarea></label>
    <p class="note">Pode usar: <b>{cliente}</b> nome da empresa · <b>{contato}</b> primeiro nome do contato · <b>{valor}</b> total em atraso · <b>{dias}</b> dias de atraso. Negrito do WhatsApp: *texto*.</p>
    <label class="sw"><input type="checkbox" name="pause" ${shutCfg().pause ? 'checked' : ''}> Marcar o cliente como Pausado quando o comunicado for enviado</label>
    <p class="note">Desligado: o comunicado só sai quando você clicar em “Desligamento” no cliente. Ligado: o app avisa e deixa pronto; você confirma o envio com 1 toque. Envio 100% sem toque exige a API oficial do WhatsApp com modelo aprovado pela Meta.</p>
    <div class="row wrap"><button class="btn pri">Salvar comunicado</button><button type="button" class="btn" data-act="noticeReset" data-k="shutdown">Restaurar texto padrão</button></div>
  </form>
  <div class="card" style="margin-top:14px"><h3>${ic('cal')}Rotinas automáticas (Daily e Weekend)<span class="sp"></span><button class="btn sm" data-act="newTemplate">${ic('plus')}Rotina</button></h3>
    <div class="list scrollbox">${tpls.map(t => `<div class="li"><span class="tm num" style="color:var(--blue2);font-weight:700;width:46px">${esc(t.time || '—')}</span><div class="t"><b>${esc(t.title)}</b><small>${esc(firstName(t.assignee))} · ${DN.map((n, i) => (t.days || []).includes(i) ? `<b style="color:var(--tx)">${n}</b>` : `<span style="opacity:.35">${n}</span>`).join(' ')}${t.goal ? ' · meta ' + t.goal : ''}</small></div><button class="btn sm ic" data-act="editTemplate" data-id="${t.id}">${ic('edit')}</button></div>`).join('') || empty('Sem rotinas.')}</div>
    <p class="note" style="margin-top:8px">As tarefas do dia são criadas automaticamente a partir destas rotinas. Mudanças valem a partir do próximo dia gerado.</p></div>
  <div class="card" style="margin-top:14px"><h3>${ic('sync')}Integrações oficiais</h3><div class="list">
    ${integ('Banco de dados (Supabase)', SUPA, SUPA ? 'Dados na nuvem, criptografados e com backup diário do Supabase.' : 'Modo local: dados só neste aparelho. Siga o README para conectar.')}
    ${integ('Push com app fechado', !!CFG.VAPID_PUBLIC_KEY && SUPA, 'Chaves VAPID + função send-push no Supabase.')}
    ${integ('WhatsApp Business Platform', false, 'Hoje: botões que abrem o WhatsApp com a mensagem pronta. API oficial: próxima etapa (exige modelos aprovados).')}
    ${integ('Google Calendar / iPhone / Android', true, 'Botão “Calendário” em cada tarefa gera o evento (.ics) compatível com todos.')}
    ${integ('Instagram, RD Station, ClickUp', false, 'Preparados para a próxima etapa; enquanto isso, registro manual.')}
  </div></div>
  <div class="card" style="margin-top:14px"><h3>${ic('down')}Backup</h3><div class="row wrap"><button class="btn" data-act="backup">${ic('down')}Baixar backup (JSON)</button>${!SUPA ? `<label class="btn">Restaurar backup<input type="file" accept="application/json" data-act-change="restore" hidden></label>` : ''}</div><p class="note" style="margin-top:8px">O backup contém dados de clientes: guarde em local seguro (ex.: pasta privada no Drive).</p></div>
  <div class="card" style="margin-top:14px"><h3>${ic('users')}Equipe<span class="sp"></span>${SUPA ? `<button class="btn sm pri" data-act="newMember">${ic('plus')}Membro</button>` : ''}</h3><div class="list">${team().map(p => `<div class="li">${avatar(p)}<div class="t" data-act="editProfile" data-id="${p.id}" style="cursor:pointer"><b>${esc(p.name)}</b><small>${esc(cargo(p))} · <b style="color:${p.role === 'admin' ? 'var(--blue2)' : 'var(--tx2)'}">${p.role === 'admin' ? 'Administrador' : 'Membro'}</b>${p.email ? ' · ' + esc(p.email) : ''}</small></div>${p.id === S.me.id || isAdmin() ? `<label class="btn sm" title="Trocar foto">${ic('plus')}Foto<input type="file" accept="image/*" data-act-change="setPhoto" data-id="${p.id}" hidden></label>` : ''}${!SUPA || p.id === S.me.id ? `<button class="btn sm" data-act="changePin" data-id="${p.id}">Trocar senha</button>` : `<button class="btn sm" data-act="setRole" data-id="${p.id}">${p.role === 'admin' ? 'Tirar admin' : 'Dar admin'}</button><button class="btn sm" data-act="adminPw" data-id="${p.id}">Alterar senha</button><button class="btn sm bad" data-act="removeMember" data-id="${p.id}" title="Remover da equipe">${ic('trash')}</button><button class="btn sm" data-act="resetPw" data-id="${p.id}" title="Envia um link por e-mail para a pessoa criar a senha">Link por e-mail</button>`}</div>`).join('')}</div>
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
  cliFilter: d => { S.cliFilter = d.f; renderView(); },
  cliTier: d => { S.cliTier = d.f; renderView(); },
  setTier: async d => {
    if (!isAdmin()) return toast('Só o administrador muda o ticket', '', 'warn');
    const c = client(d.id); if (!c) return;
    try { await store.update('clients', c.id, { tier: d.t || null }); } catch (e) { return toast('Não foi possível salvar o ticket', /tier/i.test(e.message || '') ? 'Falta rodar o SQL v2.4 (ticket) no Supabase.' : e.message, 'bad'); }
    c.tier = d.t || null; await log(d.t ? `Ticket de ${c.name}: ${tierName(d.t)}` : `Ticket de ${c.name} voltou para automático (${tierName(autoTier(c.contract_value))})`, c.id);
    toast('Ticket atualizado', `${c.name} · ${tierName(clientTier(c))}`, 'ok'); await refresh(); clientDetail(c.id);
  },
  newMember: () => { if (!isAdmin()) return;
    const sug = 'bravus' + Math.floor(1000 + Math.random() * 9000);
    modal('Adicionar membro à equipe', `<div class="f">
      <div class="f2">${fld('Nome *', 'name', '', 'text', 'required maxlength="80" placeholder="ex.: Teste Bravus"')}${fld('E-mail de acesso *', 'email', '', 'email', 'required autocomplete="off" placeholder="nome@email.com"')}</div>
      <div class="f2"><label class="fl">Senha *<div class="row" style="gap:6px"><input name="pin" id="nmPin" value="${sug}" minlength="6" required autocomplete="off" style="flex:1"><button type="button" class="btn sm" data-act="genPin">Gerar</button></div></label>${fld('Cargo', 'title', '', 'text', 'maxlength="60" list="cargos" placeholder="ex.: Social media"')}<datalist id="cargos">${CARGOS.map(c => `<option value="${esc(c)}">`).join('')}</datalist></div>
      ${sel('Acesso', 'role', [['comercial', 'Membro — vê tudo e adiciona reuniões (seg–sex a partir das 18:30; fim de semana e feriado livre)'], ['admin', 'Administrador — pode alterar tudo']], 'comercial')}
      <p class="note">O e-mail pode ser inventado para teste (ex.: teste@bravusmidia.com.br): o acesso já sai liberado, sem confirmação por e-mail. Depois de criar, eu mostro o acesso pronto para copiar ou mandar no WhatsApp.</p></div>`,
      { form: 'saveMember', footer: `<button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">Criar membro</button>` }); },
  genPin: () => { const el = $('#nmPin'); if (el) el.value = 'bravus' + Math.floor(1000 + Math.random() * 9000); },
  removeMember: d => { const p = prof(d.id); if (!p || !isAdmin() || p.id === S.me.id) return;
    confirmBox(`Remover ${esc(p.name)} da equipe?`, `O acesso de <b>${esc(p.email || p.name)}</b> é apagado. Clientes e conteúdos dele(a) passam para você; tarefas, mensagens e histórico dele(a) são apagados. Não dá para desfazer.`, 'Remover', async () => {
      const { error } = await sb.rpc('admin_remove_member', { target: p.id }); if (error) return toast('Não foi possível remover', error.message, 'bad');
      await log(`Removeu ${p.name} da equipe`); toast('Membro removido', p.name, 'ok'); await refresh(); renderView(); }, true); },
  copyAccess: d => { navigator.clipboard && navigator.clipboard.writeText(d.txt).then(() => toast('Acesso copiado', '', 'ok')); },
  chatToggle: () => { CW.open = !CW.open; lsSet('bw_cw_open', CW.open); renderChat(true); if (CW.open && innerWidth > 860) setTimeout(() => $('#chatInput') && $('#chatInput').focus(), 50); },
  cwTab: d => { CW.tab = d.t; renderChat(true); },
  msgPin: async d => { const m = S.d.messages.find(x => x.id === d.id); if (!m) return; try { await store.update('messages', m.id, { pinned: !m.pinned }); } catch (e) { return toast('Anotações ainda não ativadas no banco', 'Falta rodar o SQL v2.0 no Supabase.', 'warn'); } if (!m.pinned) toast('Guardado nas anotações', '', 'ok'); await loadAll('messages'); renderChat(); },
  msgDel: d => confirmBox('Apagar anotação?', 'Ela some para todos.', 'Apagar', async () => { await store.remove('messages', d.id); await loadAll('messages'); renderChat(true); }, true),
  releaseOk: () => { lsSet('bw_version_seen', RELEASE.version); closeModal(); },
  updateNow: async () => { try { const r = await navigator.serviceWorker?.getRegistration(); await r?.update(); } catch {} location.reload(); },
  setRole: d => { const p = prof(d.id); if (!p || !isAdmin() || p.id === S.me.id) return; const toAdmin = p.role !== 'admin'; const nm = p.name.split(' ')[0];
    confirmBox(toAdmin ? `Dar acesso de administrador a ${nm}?` : `Tirar o acesso de administrador de ${nm}?`, toAdmin ? `${esc(nm)} vai poder <b>cadastrar, editar, ativar e desativar clientes</b>, marcar pagamentos, ver o financeiro, mexer em Ajustes e alterar senhas da equipe — igual a você.` : `${esc(nm)} volta a ser membro: vê os clientes, mas não altera cadastro, status nem pagamentos.`, toAdmin ? 'Dar admin' : 'Tirar admin', async () => {
      await store.update('profiles', p.id, { role: toAdmin ? 'admin' : 'comercial' }); await log(`${toAdmin ? 'Deu' : 'Tirou'} acesso de administrador ${toAdmin ? 'para' : 'de'} ${p.name}`);
      await notifyUsers([p.id], toAdmin ? 'Você agora é administrador' : 'Seu acesso mudou para membro', `Alterado por ${firstName(S.me.id)}`, 'tarefa', null, 'painel');
      toast('Acesso atualizado', `${nm}: ${toAdmin ? 'administrador' : 'membro'}`, 'ok'); await refresh(); renderView(); }, !toAdmin); },
  adminPw: d => { const p = prof(d.id); if (!p || !isAdmin()) return;
    modal(`Alterar senha · ${p.name.split(' ')[0]}`, `<div class="f"><input type="hidden" name="id" value="${p.id}">
      ${fld('Nova senha (mín. 6 caracteres)', 'pin', '', 'password', 'minlength="6" required autocomplete="new-password"')}${fld('Repita a nova senha', 'pin2', '', 'password', 'minlength="6" required autocomplete="new-password"')}
      <p class="note">A senha antiga para de funcionar na hora. Passe a nova para ${esc(p.name.split(' ')[0])} pessoalmente ou por mensagem, e peça para trocar depois em Equipe → Trocar senha.</p></div>`,
      { form: 'adminPwSave', footer: `<button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">Salvar senha</button>` }); },
  resetPw: d => { const p = prof(d.id); if (!p) return; if (!p.email) return toast('Este membro não tem e-mail no perfil', 'Confira em Authentication → Users no Supabase.', 'warn');
    confirmBox('Redefinir senha', `Vou mandar para <b>${esc(p.email)}</b> um link para <b>${esc(p.name.split(' ')[0])}</b> criar uma senha nova. A senha atual continua valendo até ela criar a nova.`, 'Enviar link', async () => {
      try { await sendReset(p.email); await log(`Enviou link de redefinição de senha para ${p.name}`); toast('Link enviado', `${p.email} · peça para olhar também o spam.`, 'ok'); } catch (e) { toast('Não foi possível enviar', e.message, 'bad'); } }); },
  forgotPw: async () => { if (!AUTH.email) return; try { await sendReset(AUTH.email); toast('Enviamos um link para o seu e-mail', `${AUTH.email} · confira também o spam.`, 'ok'); } catch (e) { toast('Não foi possível enviar', e.message, 'bad'); } },
  recoveryBack: async () => { await sb.auth.signOut(); renderAuth(); },
  editGoals: () => goalsForm(), goalMonth: d => { S.goalMonth = d.m; renderView(); },
  payMenu: d => {
    const c = client(d.id); if (!c) return; const k = curYM(); const inv = monthInv(c, k); const late = S.d.invoices.filter(i => i.client_id === c.id && ym(i.due_date) < k && invStatus(i) === 'atrasado');
    const B = (id, st, cur) => `<div class="row" style="gap:6px">${[['pago', 'Pago', 'ok'], ['areceber', 'A receber', 'warn'], ['atrasado', 'Em atraso', 'bad']].map(o => `<button type="button" class="btn sm ${cur === (o[0] === 'areceber' ? 'pendente' : o[0]) ? o[2] : ''}" data-act="invSet" data-id="${id}" data-s="${o[0]}" data-client="${c.id}">${o[1]}</button>`).join('')}</div>`;
    const line = i => `<div class="li"><div class="t"><b>${brl(i.amount)} · vence ${fdate(i.due_date)}</b><small>${esc(i.description || 'Mensalidade')}</small></div>${B(i.id, null, invStatus(i))}</div>`;
    modal(`Pagamento · ${c.name}`, `
      <div class="sec" style="margin-top:0">${esc(monthName(k))}/${k.slice(0, 4)}</div>
      ${inv.length ? `<div class="list">${inv.map(line).join('')}</div>` : (+c.contract_value > 0 ? `<p class="small muted" style="margin-bottom:10px">Ainda não tem cobrança deste mês. Escolha o status e eu crio a mensalidade${isSplit(c) ? ' (2 parcelas)' : ''} de ${brl(c.contract_value)}:</p><div class="li"><div class="t"><b>${brl(c.contract_value)}</b><small>vence ${esc(dueTxt(c))}</small></div>${B('new', null, '')}</div>` : `<p class="note">Este cliente está sem valor de contrato. Edite o cliente e informe o valor mensal.</p>`)}
      ${late.length ? `<div class="sec">Meses anteriores em atraso</div><div class="list">${late.map(line).join('')}</div>` : ''}
      <p class="note" style="margin-top:12px">Pago entra em “Entrou no mês” do painel na data de hoje. A receber e Em atraso ficam como você marcar, sem mudar sozinhos.</p>`,
      { footer: `<button type="button" class="btn" data-act="openClient" data-id="${c.id}">Ver cliente</button><span class="sp"></span><button type="button" class="btn" data-act="closeModal">Fechar</button>` });
  },
  invMenu: d => { const i = S.d.invoices.find(x => x.id === d.id); if (i) A.payMenu({ id: i.client_id }); },
  invSet: async d => {
    const c = client(d.client); if (!c) return; const st = d.s; const nm = { pago: 'pago', areceber: 'a receber', atrasado: 'em atraso' }[st];
    const patch = st === 'pago' ? { status: 'pago', paid_at: today(), method: 'Manual', confirmed_by: S.me.name } : { status: st, paid_at: null };
    const fail = e => /check|constraint|status/i.test(e && e.message || '');
    try {
      if (d.id === 'new') {
        const k = curYM(); const [y, m] = k.split('-').map(Number); const last = new Date(y, m, 0).getDate(); const ps = parts(c);
        for (let j = 0; j < ps.length; j++) await store.insert('invoices', { client_id: c.id, amount: ps[j][1], due_date: `${k}-${pad(Math.min(ps[j][0], last))}`, description: `Mensalidade ${monthName(k)}/${y}${ps.length > 1 ? ` (${j + 1}/2)` : ''}`, ...patch });
      } else await store.update('invoices', d.id, patch);
    } catch (e) { if (fail(e)) return toast('O banco ainda não aceita esse status', 'Rode o SQL v1.7 no Supabase.', 'warn'); throw e; }
    await log(`Marcou ${c.name} como ${nm}`, c.id);
    await notifyTeam(st === 'pago' ? `Pagamento recebido: ${c.name} 💰` : st === 'atrasado' ? `${c.name} está em atraso` : `${c.name}: mensalidade a receber`, `Marcado por ${firstName(S.me.id)}`, st === 'pago' ? 'pago' : st === 'atrasado' ? 'alerta' : 'financeiro', null, 'financeiro');
    toast(`${c.name}: ${nm}`, 'Painel e financeiro atualizados.', 'ok'); await refresh(); renderView(); A.payMenu({ id: c.id });
  },
  pickReason: (d, el) => { const f = el.closest('form'); if (!f) return; f.end_reason.value = d.v; f.querySelectorAll('[data-act="pickReason"]').forEach(b => b.classList.toggle('blue', b === el)); },
  reasonsReset: () => { const t = $('form[data-form="saveReasons"] textarea[name="list"]'); if (t) t.value = DEFAULT_SETTINGS.exit_reasons.join('\n'); toast('Lista padrão restaurada', 'Clique em salvar para gravar.'); },
  editMeet: d => meetForm(d.id ? S.d.tasks.find(t => t.id === d.id) : (d.client ? { client_id: d.client, meet_type: 'alinhamento' } : {})),
  meetMonth: d => { S.meetMonth = d.m; renderView(); }, meetDay: d => { S.meetDay = d.d; renderView(); },
  meetSlot: d => meetForm({ date: d.d, time: d.t }), meetWho: d => { S.meetWho = d.id; renderView(); }, meetTicket: d => { S.meetTicket = d.id; renderView(); },
  meetSet: async d => { const t = S.d.tasks.find(x => x.id === d.id); if (!t) return; await store.update('tasks', t.id, { status: d.s, done_at: d.s === 'feito' ? new Date().toISOString() : null }); await log(`Reunião com ${meetWho(t)}: ${lbl(MSTATUS, d.s).toLowerCase()}`, t.client_id); toast('Reunião atualizada', lbl(MSTATUS, d.s), 'ok'); await refresh(); if (d.s === 'feito') meetForm(S.d.tasks.find(x => x.id === d.id)); },
  meetConfirm: d => { const t = S.d.tasks.find(x => x.id === d.id); if (!t) return; const c = client(t.client_id) || {}; const ph = t.phone || c.whatsapp || c.phone; const dia = t.date === today() ? 'hoje' : `no dia ${fdate(t.date)}`;
    window.open(waTo({ whatsapp: ph }, `Olá${t.contact_name ? ', ' + t.contact_name.split(' ')[0] : ''}! Passando para confirmar nossa reunião ${dia} às ${t.time}${t.meet_format === 'meet' ? ' pelo Google Meet' : t.meet_format === 'presencial' ? '' : t.meet_format === 'ligacao' ? ' por ligação' : ' por vídeo no WhatsApp'}. Posso confirmar? 😊`), '_blank', 'noopener'); log(`Enviou confirmação de reunião para ${meetWho(t)}`, t.client_id); },
  meetToClient: d => { const t = S.d.tasks.find(x => x.id === d.id); if (!t) return; closeModal(); clientForm({ name: t.company || t.contact_name || '', contact: t.contact_name || '', whatsapp: t.phone || '', services: ['trafego'], notes: t.description || '' }); },
  cliFilterGo: d => { S.cliFilter = d.f; location.hash = 'clientes'; renderView(); },
  finFilter: d => { S.finFilter = d.f; renderView(true); },
  kpiGo: d => {
    const r = d.r;
    if (r === 'clientes' && d.f) S.cliFilter = d.f;
    if (r === 'financeiro') { if (S.route !== 'financeiro') S.finMonth = curYM(); S.finFilter = d.f || 'todos'; S.keepFin = true; }
    if (r === 'reunioes' && S.route !== 'reunioes') S.meetMonth = curYM();
    if (r === 'agenda' && S.route !== 'agenda') S.agendaDate = today();
    const go = () => { if (d.s) { const t = document.getElementById(d.s); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); } };
    if (S.route === r) { renderView(true); setTimeout(go, 30); } else { location.hash = r; setTimeout(go, 120); }
  },
  editProfile: d => {
    const p = prof(d.id); if (!p) return;
    const mine = p.id === S.me.id, can = mine || isAdmin();
    const role = 'Acesso: ' + (p.role === 'admin' ? 'administrador' : 'comercial');
    if (!can) return modal(p.name, `<div class="row" style="gap:14px;margin-bottom:12px">${avatar(p, 72)}<div><b style="font-size:17px">${esc(p.name)}</b><div class="small muted">${esc(cargo(p))}</div></div></div>
      <div class="small" style="display:grid;gap:6px">${p.phone ? `<span>📱 ${esc(p.phone)}</span>` : ''}${p.birth_date ? `<span>🎂 ${fdateY(p.birth_date)}</span>` : ''}${p.bio ? `<span>${esc(p.bio)}</span>` : ''}</div>`);
    modal(mine ? 'Meu perfil' : `Perfil de ${p.name.split(' ')[0]}`, `<div class="f">
      <input type="hidden" name="id" value="${p.id}">
      <div class="row" style="gap:14px">${avatar(p, 72)}<div class="row wrap" style="gap:8px"><label class="btn sm">${ic('plus')}${p.avatar_url ? 'Trocar foto' : 'Adicionar foto'}<input type="file" accept="image/*" data-act-change="setPhoto" data-id="${p.id}" data-reopen="1" hidden></label>${p.avatar_url ? `<button type="button" class="btn sm" data-act="removePhoto" data-id="${p.id}">Remover foto</button>` : ''}${SUPA && isAdmin() && !mine ? `<button type="button" class="btn sm" data-act="adminPw" data-id="${p.id}">Alterar senha</button>` : ''}<div class="small muted" style="width:100%">${role}${p.email ? ' · ' + esc(p.email) : ''}</div></div></div>
      <div class="f2">${fld('Nome *', 'name', p.name, 'text', 'required maxlength="80"')}${isAdmin() ? `${fld('Cargo', 'title', p.title, 'text', 'maxlength="60" list="cargos" placeholder="escolha ou digite"')}<datalist id="cargos">${CARGOS.map(c => `<option value="${esc(c)}">`).join('')}</datalist>` : `<label class="fl">Cargo<input value="${esc(cargo(p))}" disabled title="Só o administrador define o cargo"></label>`}</div>
      <div class="f2">${fld('Data de nascimento', 'birth_date', p.birth_date, 'date')}${fld('WhatsApp', 'phone', p.phone, 'tel', 'placeholder="(85) 9 9999-9999"')}</div>
      ${area('Sobre / detalhes', 'bio', p.bio)}
      <label class="fl">Cor do perfil (quando sem foto)<input type="color" name="color" value="${esc(p.color || '#2f7bff')}" style="height:40px;padding:4px"></label>
    </div>`, { form: 'saveProfile', footer: `<button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">Salvar</button>` });
  },
  removePhoto: async d => { await store.update('profiles', d.id, { avatar_url: null }); toast('Foto removida', '', 'ok'); await refresh(); renderView(); A.editProfile({ id: d.id }); },
  setWallet: async d => {
    if (!isAdmin()) return toast('Somente o administrador altera clientes', '', 'warn');
    const c = client(d.id); if (!c) return;
    const on = d.on === '1'; if (on === inWallet(c)) return;
    if (on) {
      if (S.d.clients.filter(inWallet).length >= S.set.max_clients) return toast('Limite de clientes atingido', `Seu limite é ${S.set.max_clients}. Aumente em Ajustes.`, 'warn');
      return F.walletSave({ id: c.id, on: '1', from: d.from || '' });
    }
    const open = S.d.invoices.filter(i => i.client_id === c.id && ['pendente', 'atrasado'].includes(invStatus(i)));
    modal('Desativar cliente', `<div class="f"><input type="hidden" name="id" value="${c.id}"><input type="hidden" name="on" value="0"><input type="hidden" name="from" value="${esc(d.from || '')}">
      <p><b>${esc(c.name)}</b> sai da carteira: vai para a aba Offline e deixa de contar no painel, no financeiro, nos alertas e nas vagas.</p>
      ${fld('Data de saída', 'end_date', today(), 'date')}
      ${reasonField(clientFin(c) === 'inadimplente' && exitReasons().includes('Inadimplência') ? 'Inadimplência' : '')}
      ${open.length && canFin() ? `<label class="cklbl"><input type="checkbox" name="cancel_inv" value="1" checked> Cancelar ${open.length} cobrança(s) em aberto (${brl(open.reduce((a, i) => a + +i.amount, 0))})</label>` : ''}
      ${isAdmin() && c.whatsapp ? `<label class="cklbl"><input type="checkbox" name="send_msg" value="1"> Enviar comunicado de desligamento no WhatsApp (opcional)</label>` : ''}
    </div>`, { form: 'walletSave', footer: `<button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn bad">Desativar</button>` });
  },
  importDo: async (d, el) => {
    el.disabled = true; let n = 0;
    for (const c of IMPORT.filter(c => !c._skip)) { const { _skip, ...row } = c; const r = await store.insert('clients', row); n++; await log(`Importou o cliente ${row.name}`, r && r.id); }
    closeModal(); toast(`${n} cliente(s) importado(s)`, 'Complete valor e vencimento de cada um.', 'ok'); S.cliFilter = 'online'; await refresh();
  },
  editClient: d => { if (!isAdmin()) return toast('Somente o administrador altera clientes', 'Peça acesso de administrador ao Andrade.', 'warn'); if (!d.id && S.d.clients.filter(c => c.op_status !== 'cancelado').length >= S.set.max_clients) return toast('Limite de clientes atingido', `Seu espaço comporta ${S.set.max_clients} clientes. Aumente em Ajustes.`, 'warn'); clientForm(d.id ? client(d.id) : {}); },
  openClient: d => clientDetail(d.id),
  noticeOpen: d => { if (!isAdmin()) return toast('Somente o administrador envia este aviso', '', 'warn'); noticeModal(d.k, d.id); },
  noticeSend: async d => {
    const k = d.k, c = client(d.id); if (!c || !NOTICE[k]) return;
    const txt = ($('#nTxt') || {}).value || fillMsg(nText(k), c); const pause = k === 'shutdown' && !!($('#nPause') || {}).checked; const why = nReason(k, c);
    window.open(waTo(c, txt), '_blank', 'noopener');
    await log(`${NOTICE[k].log}${why ? ' (' + why + ')' : ''}`, c.id);
    if (pause && c.op_status !== 'pausado' && c.op_status !== 'cancelado') { await store.update('clients', c.id, { op_status: 'pausado' }); await log('Cliente pausado (protocolo de desligamento)', c.id); }
    closeModal(); toast(`${NOTICE[k].name} aberto no WhatsApp`, pause ? 'Cliente marcado como Pausado.' : 'Registrado no histórico.', 'ok'); await refresh();
  },
  noticeReset: d => { const t = $(`form[data-form="${d.k === 'recharge' ? 'saveRecharge' : 'saveShutdown'}"] textarea[name="msg"]`); if (t) t.value = NOTICE[d.k].def(); toast('Texto padrão restaurado', 'Clique em salvar para gravar.'); },
  delClient: d => !isAdmin() ? toast('Só o administrador exclui clientes', '', 'warn') : confirmBox('Excluir cliente?', 'Isto apaga o cliente e as cobranças ligadas a ele. Para manter o histórico, prefira marcar como “Cancelado”.', 'Excluir', async () => {
    const c = client(d.id); for (const t of ['campaigns', 'invoices']) for (const r of S.d[t].filter(x => x.client_id === d.id)) await store.remove(t, r.id);
    await store.remove('clients', d.id); await log(`Excluiu o cliente ${c && c.name}`); toast('Cliente excluído', '', 'ok'); await refresh(); }, true),
  clientReport: d => clientReport(d.id), print: () => EMBED ? toast('Disponível no app publicado', 'Na versão instalada, este botão salva o relatório em PDF.', 'warn') : window.print(),

  finMonth: d => { S.finMonth = d.m; renderView(); },
  newInvoice: () => { if (!S.d.clients.length) return toast('Cadastre um cliente primeiro', '', 'warn'); invoiceForm({}); },
  editInvoice: d => invoiceForm(S.d.invoices.find(i => i.id === d.id)),
  delInvoice: d => confirmBox('Excluir cobrança?', 'Prefira “Cancelado” para manter o histórico.', 'Excluir', async () => { await store.remove('invoices', d.id); await refresh(); }, true),
  genInvoices: async d => {
    const k = d.m; let n = 0;
    for (const c of S.d.clients.filter(c => c.op_status !== 'cancelado' && +c.contract_value > 0)) {
      const have = S.d.invoices.filter(i => i.client_id === c.id && ym(i.due_date) === k && (/mensalidade/i.test(i.description || '') || i.asaas_id));
      const ps = parts(c); if (have.length >= ps.length) continue;
      const [y, m] = k.split('-').map(Number); const last = new Date(y, m, 0).getDate();
      for (let j = have.length; j < ps.length; j++) {
        const due = `${k}-${pad(Math.min(ps[j][0], last))}`;
        await store.insert('invoices', { client_id: c.id, amount: ps[j][1], due_date: due, description: `Mensalidade ${monthName(k)}/${y}${ps.length > 1 ? ` (${j + 1}/2)` : ''}`, status: 'pendente' }); n++;
      }
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
  newExpense: () => modal('Nova despesa', `<div class="f">${fld('Descrição *', 'description', '', 'text', 'required')}<div class="f2">${fld('Valor (R$) *', 'amount', '', 'number', 'step="0.01" min="0.01" required')}${fld('Data', 'date', today(), 'date', 'required')}</div>${sel('Categoria', 'category', ['Ferramentas', 'Equipe', 'Impostos', 'Anúncios próprios', 'Equipamentos', 'Outros'])}</div>`, { form: 'saveExpense', footer: `<button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">Salvar</button>` }),
  delExpense: d => confirmBox('Excluir despesa?', 'Esta ação não pode ser desfeita.', 'Excluir', async () => { await store.remove('expenses', d.id); await refresh(); }, true),
  newTask: () => isAdmin() ? taskForm({}) : toast('Membros só adicionam reuniões', 'Use “+ Reunião”.', 'warn'), editTask: d => { const t = S.d.tasks.find(t => t.id === d.id); return t && t.kind === 'reuniao' ? meetForm(t) : taskForm(t); },
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
  editContent: d => (!d.id && !isAdmin()) ? toast('Membros só adicionam reuniões', '', 'warn') : contentForm(d.id ? S.d.content.find(c => c.id === d.id) : {}),
  delContent: d => confirmBox('Excluir conteúdo?', 'Esta ação não pode ser desfeita.', 'Excluir', async () => { await store.remove('content', d.id); await refresh(); }, true),
  cNext: async (d, el, ev) => {
    const c = S.d.content.find(x => x.id === d.id); const i = CST.findIndex(s => s[0] === c.status);
    if (c.status === 'aprovacao' && !isAdmin()) return toast('Aguardando aprovação do Andrade', '', 'warn');
    const next = CST[Math.min(i + 1, CST.length - 1)][0]; c.status = next; renderView();
    await store.update('content', c.id, { status: next }); log(`Conteúdo “${c.title}” → ${next}`, c.client_id);
    if (next === 'aprovacao') await notifyUsers(admins(), 'Publicação aguardando aprovação', c.title, 'conteudo', `apr:${c.id}`, 'conteudo');
  },
  cWeek: d => { S.contentWeek = d.d; renderView(); },
  readAll: async d => {
    const onlyToday = d && d.s === 'hoje';
    const list = S.d.notifications.filter(n => n.user_id === S.me.id && !n.read && (!onlyToday || iso(new Date(n.created_at)) === today()));
    if (!list.length) return toast(onlyToday ? 'Nenhum alerta de hoje para marcar' : 'Tudo já está lido', '', 'ok');
    list.forEach(n => { n.read = true }); renderView();
    await Promise.all(list.map(n => store.update('notifications', n.id, { read: true }).catch(() => {})));
    toast(onlyToday ? 'Alertas de hoje marcados como lidos' : 'Todos os alertas marcados como lidos', `${list.length} alerta(s)`, 'ok'); await refresh();
  },
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
    localStorage.setItem('bw_session', a.id); await startSession(a.id);
  },
  saveClient: async (v, fd) => {
    if (!isAdmin()) return toast('Somente o administrador altera clientes', '', 'warn');
    if (!v.name.trim()) return toast('Informe o nome da empresa', '', 'bad');
    const row = { name: v.name.trim(), contact: v.contact, whatsapp: v.whatsapp, phone: v.phone, email: v.email, instagram: v.instagram, segment: v.segment, owner: v.owner || null,
      services: fd.getAll('services'), contract_value: num(v.contract_value) || 0, due_day: num(v.due_day), installments: v.installments === '2' ? 2 : 1, due_day2: v.installments === '2' ? num(v.due_day2) : null, start_date: v.start_date || null, op_status: v.op_status,
      notes: v.notes, tier: v.tier || null };
    if (row.installments === 2 && (!row.due_day2 || row.due_day2 < 1 || row.due_day2 > 31)) return toast('Informe o dia do 2º vencimento', 'Parcelado aceita até 2x.', 'warn');
    if (row.installments === 2 && row.due_day2 === row.due_day) return toast('Os dois vencimentos estão no mesmo dia', 'Escolha dias diferentes ou use À vista.', 'warn');
    const old = v.id && client(v.id);
    if (row.op_status === 'cancelado') { row.end_date = v.end_date || (old && old.end_date) || today(); row.end_reason = (v.end_reason || '').trim() || null; }
    else { row.end_date = null; row.end_reason = null; }
    if (old && inWallet(old) !== inWallet(row)) await log(inWallet(row) ? `${row.name} voltou para a carteira (online)` : `${row.name} saiu da carteira (offline)${row.end_reason ? ': ' + row.end_reason : ''}`, v.id);
    const noCol = e => /end_date|end_reason|installments|due_day2|column/i.test(e && e.message || '');
    const save = r => v.id ? store.update('clients', v.id, r) : store.insert('clients', r);
    let saved; try { saved = await save(row); } catch (e) { if (/tier/i.test(e && e.message || '')) { delete row.tier; saved = await save(row); toast('Cliente salvo sem o ticket', 'Falta rodar o SQL v2.4 (ticket) no Supabase.', 'warn'); } else { if (!noCol(e)) throw e; delete row.end_date; delete row.end_reason; delete row.installments; delete row.due_day2; saved = await save(row); toast('Banco ainda sem alguns campos', 'Rode o SQL v1.5 no Supabase para guardar o parcelamento e a saída.', 'warn'); } }
    if (v.id) await log(`Atualizou o cadastro de ${row.name}`, v.id); else { await log(`Cadastrou o cliente ${row.name}`, saved && saved.id); await notifyTeam(`Cliente novo: ${row.name} 🎉`, `${row.contract_value ? brl(row.contract_value) + '/mês · ' : ''}vence ${dueTxt(row)}`, 'pago', null, 'clientes'); }
    closeModal(); toast('Cliente salvo', '', 'ok'); await refresh();
  },
  saveProfile: async v => {
    if (!(v.name || '').trim()) return toast('Informe o nome', '', 'bad');
    const row = { name: v.name.trim(), birth_date: v.birth_date || null, phone: (v.phone || '').trim() || null, bio: (v.bio || '').trim() || null, color: v.color || null };
    if (isAdmin()) row.title = (v.title || '').trim() || null;
    const before = prof(v.id);
    try { await store.update('profiles', v.id, row); }
    catch (e) { if (!/title|birth_date|phone|bio|column/i.test(e && e.message || '')) throw e; await store.update('profiles', v.id, { name: row.name, color: row.color }); toast('Nome salvo, detalhes ainda não', 'Rode o SQL v1.2 no Supabase para guardar cargo, nascimento, WhatsApp e detalhes.', 'warn'); closeModal(); await refresh(); renderView(); return; }
    if (isAdmin() && before && (before.title || null) !== (row.title || null) && v.id !== S.me.id) await log(`Definiu o cargo de ${row.name}: ${row.title || cargo({ role: before.role })}`);
    closeModal(); toast('Perfil atualizado', '', 'ok'); await refresh(); renderView();
  },
  walletSave: async v => {
    const c = client(v.id); if (!c) return;
    const on = v.on === '1';
    const row = on ? { op_status: 'ativo', end_date: null, end_reason: null } : { op_status: 'cancelado', end_date: v.end_date || today(), end_reason: (v.end_reason || '').trim() || null };
    try { await store.update('clients', c.id, row); }
    catch (e) { if (!/end_date|end_reason|column/i.test(e && e.message || '')) throw e; await store.update('clients', c.id, { op_status: row.op_status }); toast('Banco ainda sem os campos de saída', 'Rode o SQL v1.1 no Supabase para guardar data e motivo.', 'warn'); }
    let nInv = 0;
    if (!on && v.cancel_inv) for (const i of S.d.invoices.filter(i => i.client_id === c.id && ['pendente', 'atrasado'].includes(invStatus(i)))) { await store.update('invoices', i.id, { status: 'cancelado' }); nInv++; }
    await log(on ? `${c.name} foi ativado (voltou para a carteira)` : `${c.name} foi desativado (saiu da carteira)${row.end_reason ? ': ' + row.end_reason : ''}${nInv ? ` · ${nInv} cobrança(s) cancelada(s)` : ''}`, c.id);
    closeModal(); await refresh(); renderView();
    toast(on ? `${c.name} ativado` : `${c.name} desativado`, on ? 'Voltou para a carteira (online).' : `Foi para a aba Offline${nInv ? ' e as cobranças em aberto foram canceladas' : ''}.`, 'ok');
    await notifyTeam(on ? `${c.name} voltou para a carteira` : `${c.name} saiu da carteira`, on ? 'Cliente ativo novamente.' : (row.end_reason || 'Cliente desativado.'), on ? 'pago' : 'alerta', null, 'clientes');
    if (!on && v.send_msg) return noticeModal('shutdown', c.id);
    if (v.from === 'detail') clientDetail(c.id);
  },
  clientNote: async v => { if (!v.text.trim()) return; await store.insert('activity', { user_id: S.me.id, action: v.text.trim(), client_id: v.id }); await refresh(); clientDetail(v.id); },

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
  saveMeet: async (v, fd, form) => {
    const c = v.client_id ? client(v.client_id) : null;
    const who = (v.company || '').trim() || (c && c.name) || (v.contact_name || '').trim();
    if (!who) return toast('Informe o nome do contato ou a empresa', '', 'bad');
    const old = v.id ? S.d.tasks.find(x => x.id === v.id) || {} : {};
    if (!isAdmin() && (!v.id || old.date !== v.date || old.time !== v.time) && !meetAllowed(v.date, v.time)) return toast('Horário fora da regra', meetRuleMsg(v.date), 'bad');
    const row = { title: `Reunião · ${who}`, kind: 'reuniao', date: v.date, time: v.time, assignee: v.assignee || S.me.id, client_id: v.client_id || null, description: v.description, priority: 'alta', remind_min: 30,
      contact_name: (v.contact_name || '').trim() || null, company: (v.company || '').trim() || null, phone: (v.phone || '').trim() || null, meet_type: v.meet_type, meet_format: v.meet_format, ticket: v.ticket || null };
    row.status = v.status || 'pendente'; row.outcome = v.outcome || null; row.done_at = row.status === 'feito' ? old.done_at || new Date().toISOString() : null;
    const extra = ['contact_name', 'company', 'phone', 'meet_type', 'meet_format', 'outcome', 'ticket'];
    const save = r => v.id ? store.update('tasks', v.id, r) : store.insert('tasks', { status: 'pendente', ...r, count: 0, is_template: false });
    try { await save(row); } catch (e) { const m = e && e.message || ''; if (/ticket/i.test(m)) { delete row.ticket; await save(row); toast('Reunião salva sem o ticket', 'Falta rodar o SQL v2.2 (ticket) no Supabase.', 'warn'); } else { if (!/column|contact_name|company|meet_|outcome|phone/i.test(m)) throw e; extra.forEach(x => delete row[x]); await save(row); toast('Reunião salva sem os detalhes', 'O banco ainda não tem os campos de reunião (SQL v1.4).', 'warn'); } }
    const st = row.status || 'pendente';
    if (!v.id && st === 'pendente') { await log(`Marcou reunião com ${who} · ${fdate(v.date)} ${v.time}`, row.client_id); await notifyTeam(`Reunião marcada com ${who}`, `${fdate(v.date)} às ${v.time} · ${firstName(row.assignee)} · por ${firstName(S.me.id)}`, 'tarefa', null, 'reunioes'); }
    else if (st !== (old.status || 'pendente') && st !== 'pendente' && v.outcome !== 'fechou') { await log(`Reunião com ${who} (${fdate(v.date)} ${v.time}): ${lbl(MSTATUS, st).toLowerCase()}`, row.client_id); await notifyTeam(`Reunião com ${who}: ${lbl(MSTATUS, st).toLowerCase()}`, `${fdate(v.date)} às ${v.time} · registrado por ${firstName(S.me.id)}`, 'tarefa', `meet:${v.id || who + v.date + v.time}:${st}`, 'reunioes'); }
    if (v.outcome === 'fechou' && old.outcome !== 'fechou') { await log(`Reunião com ${who}: fechou negócio 🎉`, row.client_id); await notifyTeam(`Fechou negócio com ${who}! 🎉`, `Registrado por ${firstName(S.me.id)}`, 'pago', `won:${v.id || who + v.date}`, 'reunioes'); }
    closeModal(); toast(v.id ? 'Reunião atualizada' : st === 'feito' ? 'Reunião registrada como realizada' : 'Reunião marcada', `${who} · ${fdate(v.date)} às ${v.time}`, 'ok'); await refresh();
  },
  saveTask: async (v, fd, form) => {
    const tpl = !!v.is_template;
    const row = { title: v.title.trim(), kind: v.kind, priority: v.priority, time: v.time || null, assignee: v.assignee || S.me.id, client_id: v.client_id || null, goal: num(v.goal) || null, remind_min: num(v.remind_min) ?? 10, description: v.description };
    if (!row.title) return toast('Informe o título', '', 'bad');
    const override = isAdmin() && form.override && form.override.checked;
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
    if ((S.set.notify || {}).chat !== false) await notifyUsers(team().filter(p => p.id !== S.me.id).map(p => p.id), `Mensagem de ${firstName(S.me.id)}`, text.slice(0, 120), 'chat', null, 'chat');
    await loadAll('messages'); renderChat(true); $('#chatInput') && $('#chatInput').focus();
  },
  sendNote: async (v, fd, form) => {
    const text = (v.text || '').trim(); if (!text) return;
    form.text.value = '';
    try { await store.insert('messages', { user_id: S.me.id, text, pinned: true }); } catch (e) { return toast('Anotações ainda não ativadas no banco', 'Falta rodar o SQL v2.0 no Supabase.', 'warn'); }
    await notifyTeam(`${firstName(S.me.id)} fez uma anotação`, text.slice(0, 120), 'chat', null, 'chat');
    await loadAll('messages'); renderChat(true);
  },

  saveSettings: async (v, fd, form) => {
    const offs = String(v.reminder_offsets || '').split(/[,; ]+/).filter(x => x !== '').map(Number).filter(n => Number.isFinite(n) && Math.abs(n) <= 60);
    const s = { ...S.set, agency_name: v.agency_name, max_clients: num(v.max_clients) || 20, calls_start: v.calls_start, meetings_start: v.meetings_start, meetings_end: v.meetings_end || '21:30', meet_slot: num(v.meet_slot) || 60, prospect_goal: num(v.prospect_goal) || 0, followup_goal: num(v.followup_goal) || 0,
      priscila_start: v.priscila_start, priscila_end: v.priscila_end, morning_hour: v.morning_hour, lock_minutes: Math.max(0, num(v.lock_minutes) || 0), lock_v2: true, reminder_offsets: offs,
      notify: Object.fromEntries(['tarefas', 'financeiro', 'conteudo', 'chat'].map(k => [k, !!form['nf_' + k].checked])) };
    await store.upsertSettings(s); S.set = s; await log('Atualizou os ajustes'); toast('Ajustes salvos', '', 'ok'); armLock(); await refresh();
  },
  saveReasons: async v => {
    const list = [...new Set(String(v.list || '').split('\n').map(x => x.trim()).filter(Boolean))].slice(0, 30);
    if (!list.length) return toast('Escreva pelo menos um motivo', '', 'warn');
    const s = { ...S.set, exit_reasons: list }; await store.upsertSettings(s); S.set = s;
    await log('Atualizou os motivos de saída do cliente'); toast('Motivos salvos', `${list.length} frase(s) prontas.`, 'ok'); await refresh();
  },
  saveGoals: async v => {
    const g = Object.fromEntries(Object.keys(GOALS_DEF).map(k => [k, Math.max(0, num(v[k]) || 0)]));
    const s = { ...S.set, goals: g }; await store.upsertSettings(s); S.set = s;
    await log('Atualizou as metas'); closeModal(); toast('Metas salvas', '', 'ok'); await refresh();
  },
  saveRecharge: async (v, fd, form) => {
    const msg = String(v.msg || '').trim(); if (!msg) return toast('Escreva o texto do aviso', '', 'warn');
    const s = { ...S.set, recharge: { auto: form.auto.checked, repeat: Math.max(1, num(v.repeat) || 3), msg } };
    await store.upsertSettings(s); S.set = s; await log(`Atualizou o aviso de recarga (automático ${s.recharge.auto ? 'ligado' : 'desligado'})`); toast('Aviso de recarga salvo', s.recharge.auto ? 'Automático ligado.' : 'Automático desligado — envio só manual.', 'ok'); await refresh();
  },
  saveShutdown: async (v, fd, form) => {
    const msg = String(v.msg || '').trim(); if (!msg) return toast('Escreva o texto do comunicado', '', 'warn');
    const s = { ...S.set, shutdown: { auto: form.auto.checked, trigger: v.trigger, days: Math.max(1, num(v.days) || 5), pause: form.pause.checked, msg } };
    await store.upsertSettings(s); S.set = s; await log(`Atualizou o comunicado de desligamento (automático ${s.shutdown.auto ? 'ligado' : 'desligado'})`); toast('Comunicado salvo', s.shutdown.auto ? 'Automático ligado.' : 'Automático desligado — envio só manual.', 'ok'); await refresh();
  },
  saveMember: async v => {
    const name = (v.name || '').trim(), email = (v.email || '').trim().toLowerCase(), pin = v.pin || '';
    if (!name || !email) return toast('Preencha nome e e-mail', '', 'bad');
    if (pin.length < 6 || WEAK.includes(pin)) return toast('Senha fraca', 'Use pelo menos 6 caracteres, sem sequências óbvias.', 'bad');
    const { error } = await sb.rpc('admin_add_member', { p_email: email, p_password: pin, p_name: name, p_role: v.role, p_title: (v.title || '').trim() || null });
    if (error) return toast('Não foi possível criar', /function|schema cache/i.test(error.message) ? 'Falta instalar a função no banco (SQL v2.1).' : error.message, 'bad');
    await log(`Adicionou ${name} à equipe (${v.role === 'admin' ? 'administrador' : 'membro'})`); await refresh();
    const txt = `Seu acesso ao Bravus Work:\n${appUrl()}\nE-mail: ${email}\nSenha: ${pin}\n\nNo iPhone: abra no Safari > Compartilhar > Adicionar à Tela de Início. Troque a senha depois em Equipe > Trocar senha.`;
    modal('Membro criado ✅', `<p style="margin-bottom:10px"><b>${esc(name)}</b> já pode entrar no app.</p><pre class="acc">${esc(txt)}</pre>`,
      { footer: `<a class="btn ok" href="https://wa.me/?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener">${ic('wa')}Mandar no WhatsApp</a><button type="button" class="btn" data-act="copyAccess" data-txt="${esc(txt)}">Copiar</button><span class="sp"></span><button type="button" class="btn pri" data-act="closeModal">Pronto</button>` });
  },
  adminPwSave: async v => {
    const p = prof(v.id); if (!p) return;
    if (v.pin.length < 6 || v.pin !== v.pin2) return toast('As senhas não conferem ou têm menos de 6 caracteres', '', 'bad');
    if (WEAK.includes(v.pin)) return toast('Senha muito fácil', 'Escolha outra.', 'bad');
    const { error } = await sb.rpc('admin_set_password', { target: v.id, new_password: v.pin });
    if (error) return toast('Não foi possível alterar', /function|schema cache/i.test(error.message) ? 'Falta instalar a função de senha no banco (SQL v1.9).' : error.message, 'bad');
    await log(`Alterou a senha de ${p.name}`); closeModal(); toast('Senha alterada', `${p.name.split(' ')[0]} já pode entrar com a senha nova.`, 'ok');
  },
  recoverySave: async v => {
    if (v.pin.length < 6 || v.pin !== v.pin2) return toast('As senhas não conferem ou têm menos de 6 caracteres', '', 'bad');
    if (WEAK.includes(v.pin)) return toast('Senha muito fácil', 'Escolha outra.', 'bad');
    const { data, error } = await sb.auth.updateUser({ password: v.pin }); if (error) return toast('Erro ao salvar a senha', error.message, 'bad');
    toast('Senha criada', 'Bem-vindo(a) ao Bravus Work!', 'ok'); startSession(data.user.id);
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
async function refresh(t) { await loadAll(t); if (S.me) { popNew(); popMsgs(); renderShellBadges(); renderPresence(); if (!t || (t !== 'messages' && (t !== 'profiles' || S.route === 'equipe'))) renderViewSoft(); if (!t || ['messages', 'profiles'].includes(t)) renderChat(); } }
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
  if (e.target.dataset.actChange === 'setPhoto') {
    const f = e.target.files[0], id = e.target.dataset.id; e.target.value = ''; if (!f) return;
    try {
      const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('Imagem inválida')); i.src = URL.createObjectURL(f); });
      const n = 256, cv = document.createElement('canvas'); cv.width = cv.height = n; const k = Math.min(img.width, img.height);
      cv.getContext('2d').drawImage(img, (img.width - k) / 2, (img.height - k) / 2, k, k, 0, 0, n, n);
      await store.update('profiles', id, { avatar_url: cv.toDataURL('image/jpeg', 0.82) });
      if (id === S.me.id) S.me.avatar_url = cv.toDataURL('image/jpeg', 0.82);
      toast('Foto atualizada', '', 'ok'); await refresh(); renderView(); if (e.target.dataset.reopen) A.editProfile({ id });
    } catch (err) { toast('Não foi possível salvar a foto', err.message, 'bad'); }
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
addEventListener('hashchange', () => { S.route = (location.hash.replace(/^#\/?/, '') || 'painel').split('?')[0]; if (S.route === 'financeiro' && !S.keepFin) S.finFilter = 'todos'; S.keepFin = false; if (S.me) { closeModal(); renderView(); renderShellBadges(); window.scrollTo(0, 0); } });
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.me) { heartbeat(); refresh(); tick(); } });

/* =====================================================================
   INICIALIZAÇÃO
   ===================================================================== */
(async function boot() {
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  const hashQ = new URLSearchParams(location.hash.replace(/^#/, ''));
  const recovery = hashQ.get('type') === 'recovery', recErr = hashQ.get('error_description');
  if (SUPA) {
    try {
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm');
      sb = createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
      store = new SupaStore(sb); store.listen();
      const { data } = await sb.auth.getSession();
      if (recErr) { history.replaceState(null, '', location.pathname); return renderRecovery(/expired|invalid/i.test(recErr) ? 'Este link expirou ou já foi usado. Peça um novo ao administrador ou use “esqueci a senha” no login.' : recErr.replace(/\+/g, ' ')); }
      if (recovery && data.session) { history.replaceState(null, '', location.pathname); return renderRecovery(); }
      store.onChange(t => { if (S.me) { clearTimeout(refreshing); refreshing = setTimeout(() => refresh(t), 250); } });
      if (data.session) return startSession(data.session.user.id);
    } catch (e) { $('#app').innerHTML = `<div class="auth"><div class="abox"><img class="logo" src="icons/icon.svg" alt=""><p class="warnbox" style="margin-top:20px">Não foi possível conectar ao servidor. Verifique a internet e tente novamente.</p><button class="btn pri" style="margin-top:14px" data-act="reload">Tentar de novo</button></div></div>`; return; }
  } else {
    store = new LocalStore();
    store.onChange(t => { if (S.me && t !== 'profiles') { clearTimeout(refreshing); refreshing = setTimeout(() => refresh(), 150); } });
    await loadAll();
    const sid = localStorage.getItem('bw_session'); if (sid && prof(sid)) return startSession(sid);
  }
  renderAuth();
})();
