/* =====================================================================
   REGRAS DE NEGÓCIO
   ===================================================================== */
const SERVICES = [['trafego', 'Tráfego pago'], ['social', 'Social media'], ['site', 'Site'], ['landing', 'Landing page'], ['automacao', 'Automação'], ['mentoria', 'Mentoria']];
const svcName = k => (SERVICES.find(s => s[0] === k) || [k, k])[1];
const OP = [['ativo', 'Ativo (online)'], ['pausado', 'Pausado (online)'], ['onboarding', 'Em implantação (online)'], ['cancelado', 'Saiu da carteira (offline)']];
const inWallet = c => c.op_status !== 'cancelado';
const walletBtn = c => !isAdmin() ? walletChip(c) : `<button type="button" class="wsw ${inWallet(c) ? 'on' : ''}" data-act="setWallet" data-id="${c.id}" data-on="${inWallet(c) ? '0' : '1'}" title="${inWallet(c) ? 'Clique para desativar' : 'Clique para ativar'}"><i></i>${inWallet(c) ? 'Ativo' : 'Inativo'}</button>`;
const walletChip = c => inWallet(c) ? '<span class="chip ok"><i class="dot on"></i>Online</span>' : '<span class="chip neu"><i class="dot"></i>Offline</span>';

function invStatus(i) {
  if (i.status === 'pago' || i.status === 'cancelado' || i.status === 'atrasado') return i.status; /* atrasado = marcado manualmente */
  /* pendente ou "a receber": passou do vencimento sem pagar = em atraso (v2.7.4) */
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
const payBtn = c => { const s = clientFin(c); return `<button type="button" class="chip st ${s === 'inadimplente' ? 'bad' : s === 'pago' ? 'ok' : s === 'a vencer' ? 'warn' : 'neu'}" style="cursor:pointer" data-act="payMenu" data-id="${c.id}" title="Clique para marcar: pago, a receber ou em atraso">${esc(s)} ▾</button>`; };
const finChip = s => `<span class="chip st ${s === 'inadimplente' ? 'bad' : s === 'pago' ? 'ok' : s === 'a vencer' ? 'warn' : 'neu'}">${esc(s)}</span>`;
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

/* v2.9.1: sem Asaas — descrição antiga "Cobrança Asaas" aparece como Mensalidade */
const invDesc = i => String(i.description || '').replace(/cobran[çc]a\s+asaas/gi, 'Mensalidade').replace(/\s*\basaas\b\s*/gi, ' ').trim() || 'Mensalidade';

/* gera as mensalidades do mês que faltam (usado pelo botão e automático ao entrar como admin) */
async function genMonthInvoices(k) {
  let n = 0;
  for (const c of S.d.clients.filter(c => c.op_status !== 'cancelado' && +c.contract_value > 0)) {
    const mine = S.d.invoices.filter(i => i.client_id === c.id && ym(i.due_date) === k);
    const have = mine.filter(i => /mensalidade/i.test(invDesc(i)));
    const ps = parts(c); if (have.length >= ps.length || mine.length >= ps.length) continue;
    const [y, m] = k.split('-').map(Number); const last = new Date(y, m, 0).getDate();
    for (let j = Math.max(have.length, mine.length); j < ps.length; j++) {
      const due = `${k}-${pad(Math.min(ps[j][0], last))}`;
      S.d.invoices.push(await store.insert('invoices', { client_id: c.id, amount: ps[j][1], due_date: due, description: `Mensalidade ${monthName(k)}/${y}${ps.length > 1 ? ` (${j + 1}/2)` : ''}`, status: 'pendente' })); n++;
    }
  }
  return n;
}
function finMonth(k) {
  const recebido = S.d.invoices.filter(i => i.status === 'pago' && ym(i.paid_at) === k).reduce((a, i) => a + +i.amount, 0);
  const aReceber = S.d.invoices.filter(i => invStatus(i) === 'pendente' && ym(i.due_date) === k).reduce((a, i) => a + +i.amount, 0);
  const atrasado = S.d.invoices.filter(i => invStatus(i) === 'atrasado').reduce((a, i) => a + +i.amount, 0);
  const saidas = S.d.expenses.filter(e => ym(e.date) === k).reduce((a, e) => a + +e.amount, 0);
  return { recebido, aReceber, atrasado, aReceberTotal: aReceber + atrasado, saidas, saldo: recebido - saidas };
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

