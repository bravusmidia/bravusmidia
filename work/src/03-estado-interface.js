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
const PAUSE_MSG = `Olá, {contato}! Tudo bem?

Informamos que os serviços da *{cliente}* com a Bravus Mídia estão *pausados* a partir de hoje.

Assim que quiser retomar, é só nos chamar por aqui que reativamos tudo.

Equipe Bravus Mídia`;
const S = { me: null, route: 'painel', d: {}, set: { ...DEFAULT_SETTINGS }, agendaDate: today(), agendaWho: null,
  finMonth: curYM(), meetMonth: curYM(), goalMonth: curYM(), meetWho: '', meetTicket: '', meetDay: null, weekOpen: lsGet('bw_week_open', false), pipeTab: '', cliFilter: 'online', contentWeek: null, popped: new Set(), startedAt: new Date().toISOString() };
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
/* foto só aceita imagem embutida (data:image) — evita CSS/URL injetado no estilo */
const safeImg = u => typeof u === 'string' && /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(u);
const avatar = (p, size = 36) => `<span class="av" style="background:${p && safeImg(p.avatar_url) ? `#0b1a3d url('${esc(p.avatar_url)}') center/cover` : esc(p && p.color || '#2f7bff')};width:${size}px;height:${size}px">${p && p.avatar_url ? '' : esc(initials(p && p.name))}<i class="dot ${isOnline(p) ? 'on' : ''}"></i></span>`;

async function loadAll(only) {
  const ts = only ? [only] : TABLES;
  await Promise.all(ts.map(async t => {
    try { S.d[t] = await store.list(t); if (t === 'documents') S.docsMissing = false; } catch (e) { S.d[t] = []; if (t === 'documents') { S.docsMissing = true; return; } if (!/permission|policy/i.test(e.message)) console.warn(t, e.message); }
  }));
  if (!only || only === 'settings') { const row = S.d.settings.find(s => s.id === 'main'); S.set = { ...DEFAULT_SETTINGS, ...(row && row.data || {}) }; }
  if (S.me && (!only || only === 'profiles')) { const me = prof(S.me.id); if (me) S.me = { ...S.me, ...me }; }
}

/* ---------------- registro de atividade ---------------- */
async function log(action, client_id = null) {
  const id = ++logSeq; if (S.me) S.pendLog = { id, action };
  try { await store.insert('activity', { user_id: S.me.id, action, client_id }); } catch {}
  /* v2.8.3: tudo que alguém faz no app avisa o resto da equipe (ex.: Priscila recebe o que o Andrade fez).
     Se a mesma ação já mandar um aviso próprio (notifyTeam), este genérico é descartado para não duplicar. */
  if (!S.me) return;
  setTimeout(() => { if (!S.pendLog || S.pendLog.id !== id) return; S.pendLog = null;
    notifyTeam(`${firstName(S.me.id)}: ${action}`, `${fdate(today())} às ${nowHM()} · Bravus Work`, 'info', `act:${uid()}`, 'painel'); }, 1200);
}
let logSeq = 0;

/* ---------------- toasts / modal ---------------- */
function toast(title, body = '', type = '') {
  const el = document.createElement('div'); el.className = 'toast ' + type;
  el.innerHTML = `<b>${esc(title)}</b>${body ? `<span class="small muted">${esc(body)}</span>` : ''}`;
  const box = $('#toasts'); box.appendChild(el); while (box.children.length > (innerWidth < 860 ? 1 : 3)) box.firstChild.remove(); setTimeout(() => el.remove(), 4200);
  modalAlert(title, body, type);
}
/* com uma janela aberta, o aviso também aparece dentro dela (no celular o topo fica atrás da barra do iPhone) */
function modalAlert(title, body = '', type = '') {
  const mo = $('#modal-root .mo'); if (!mo || !type || type === 'ok') return;
  const bd = mo.querySelector('.bd'); if (!bd) return;
  let al = mo.querySelector('.mo-alert');
  if (!al) { al = document.createElement('div'); bd.prepend(al); }
  al.className = 'mo-alert ' + type; al.setAttribute('role', 'alert');
  al.innerHTML = `<b>${esc(title)}</b>${body ? `<span class="small">${esc(body)}</span>` : ''}`;
  bd.scrollTo({ top: 0, behavior: 'smooth' });
  al.style.animation = 'none'; void al.offsetWidth; al.style.animation = '';
  if (navigator.vibrate) try { navigator.vibrate(60); } catch {}
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

