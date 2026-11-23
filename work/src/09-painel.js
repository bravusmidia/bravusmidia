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
  lostDeals().filter(x => x.lo.retorno && x.lo.retorno <= d).forEach(x => prio.push(['warn', `Retomar contato com ${x.who}`, `Não fechou (${lbl(LOST_REASONS, x.lo.motivo || 'outro').toLowerCase()}) · retorno ${x.lo.retorno === d ? 'hoje' : 'desde ' + fdate(x.lo.retorno)}`, 'reunioes', { act: 'lostGo', k: '', id: '' }]));
  if (S.d.content.some(c => c.status === 'aprovacao')) prio.push(['blue', `${S.d.content.filter(c => c.status === 'aprovacao').length} publicação(ões) aguardando aprovação`, 'Conteúdo', 'conteudo']);

  return head(`${greet}, ${firstName(S.me.id)}`, fdateL(d), isAdmin() ? `<button class="btn pri" data-act="newTask">${ic('plus')}Tarefa</button>` : `<button class="btn pri" data-act="editMeet">${ic('plus')}Reunião</button>`) + `
  ${canFin() ? `<div class="grid g4">
    ${kpi('Entrou no mês', brl(fm.recebido), 'pagamentos confirmados', 'hl', ['financeiro', 'pago', 'fin-cob'])}
    ${kpi('A receber', brl(fm.aReceberTotal), fm.atrasado ? `mês ${brl(fm.aReceber)} + atrasado ${brl(fm.atrasado)}` : 'vencimentos do mês', 'y', ['financeiro', 'pendente', 'fin-cob'])}
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
  ${lostCard()}
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
      ${row('cal', 'Tarefas', `${tf}/${tt}`, `concluídas no mês · ${team().map(p => `${esc(firstName(p.id))} ${realTasks().filter(t => t.assignee === p.id && isLate(t)).length} atrasada(s)`).join(' · ')}`, 'equipe')}
      ${row('clock', 'Tempo online', fmtDur(team().reduce((a, p) => a + timeMonth(p.id, k), 0)), team().map(p => `${esc(firstName(p.id))} ${fmtDur(timeMonth(p.id, k))}`).join(' · '), 'equipe')}
      ${row('chat', 'Prospecções', prosp, `ligações ${lf}/${lt} · follow-ups ${ff}/${ft}`, 'agenda')}
    </div><div class="list">
      ${row('users', 'Clientes', cl.filter(inWallet).length, `${TIERS.map(t => `${cl.filter(c => inWallet(c) && clientTier(c) === t[0]).length} ${t[1].toLowerCase()}`).join(' · ')} · ${novos} novo(s) no mês`, 'clientes')}
      ${row('film', 'Conteúdo', `${pub}/${ct.length}`, 'publicados no mês', 'conteudo')}
      ${canFin() ? row('wallet', 'Financeiro', brl(finMonth(k).recebido), `a receber ${brl(finMonth(k).aReceberTotal)} · em atraso ${brl(finMonth(k).atrasado)}`, 'financeiro') : row('target', 'Metas', '→', 'acompanhe o progresso do mês', 'metas')}
    </div></div></div>`;
}
function weekChart() {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today(), i - 6));
  const vals = days.map(d => realTasks().filter(t => t.date === d && t.status === 'feito' && (isAdmin() || t.assignee === S.me.id)).length);
  const mx = Math.max(1, ...vals);
  return `<p class="small muted" style="margin-top:14px">Tarefas concluídas — últimos 7 dias</p><div class="bars" style="height:90px">${days.map((d, i) => `<div class="col"><div class="pair"><div class="b one" style="height:${vals[i] / mx * 100}%" title="${vals[i]}"></div></div><small>${new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'narrow' })}</small></div>`).join('')}</div>`;
}

