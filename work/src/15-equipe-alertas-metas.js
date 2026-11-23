/* ---------- EQUIPE ---------- */
/* ---------- TAREFAS DE CADA PERFIL: toque no número, veja o que falta e marque o que foi feito ---------- */
const kpiP = (uid, m, label, val, cls = '') => `<div class="kpi go ${cls}" role="button" tabindex="0" title="Ver ${esc(label.toLowerCase())}" data-act="personTasks" data-id="${uid}" data-m="${m}"><small>${esc(label)}</small><b>${val}</b><i class="kgo">${ic('right')}</i></div>`;
const PT = { late: 'Atrasadas', today: 'Hoje', week: 'Últimos 7 dias' };
const PT_JUST = new Set();
function personTaskList(uid, m) {
  const d = today(), wk = Array.from({ length: 7 }, (_, i) => addDays(d, -i));
  const mine = realTasks().filter(t => t.assignee === uid);
  // nas atrasadas, as que você acabou de marcar continuam aparecendo (em “Feitas”) até fechar a janela
  const ts = m === 'late' ? mine.filter(t => isLate(t) || (PT_JUST.has(t.id) && t.status === 'feito')) : m === 'today' ? mine.filter(t => t.date === d) : mine.filter(t => wk.includes(t.date));
  return ts.sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
}
function personTasks(uid, m) {
  const p = prof(uid); if (!p) return;
  const can = isAdmin() || uid === S.me.id;
  const ts = personTaskList(uid, m), doneL = ts.filter(t => t.status === 'feito'), pendL = ts.filter(t => t.status !== 'feito'), done = doneL.length, pend = pendL.length;
  const row = t => { const isM = t.kind === 'reuniao'; return `<div class="li pt-row ${t.status === 'feito' ? 'done' : ''}" data-row="${t.id}">
    <button type="button" class="ck ${isM ? 'm' : ''} ${t.status === 'feito' ? 'on' : ''}" ${can ? `data-act="ptCheck" data-id="${t.id}" data-u="${uid}" data-m="${m}"` : 'disabled'} aria-label="${isM ? 'Marcar reunião como realizada' : 'Concluir'}" title="${isM ? 'Marcar como Realizada' : 'Concluir'}">${t.status === 'feito' ? ic('check') : isM ? ic('meet') : ''}</button>
    <div class="t"><b>${esc(t.title)}</b><small>${t.status === 'feito' && t.done_at ? `<span style="color:var(--ok)">✓ feita ${new Date(t.done_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span> · ` : ''}${t.date === d0() ? 'Hoje' : WD[new Date(t.date + 'T12:00:00').getDay()] + ' ' + fdate(t.date)}${t.time ? ' · ' + esc(t.time) : ''}${t.client_id ? ' · ' + esc(cname(t.client_id)) : ''}${t.goal ? ` · meta ${t.count || 0}/${t.goal}` : ''}${isLate(t) ? ' · <span style="color:var(--bad)">atrasada</span>' : ''}</small></div>
    ${isM ? `<button type="button" class="btn sm" data-act="editMeet" data-id="${t.id}">Ver reunião</button>` : ''}</div>`; };
  modal(`${esc(firstName(uid) || p.name)} · ${PT[m]}`, `<div class="row wrap" style="gap:8px;margin-bottom:12px">${Object.entries(PT).map(([k, n]) => `<button type="button" class="btn sm ${k === m ? 'pri' : ''}" data-act="personTasks" data-id="${uid}" data-m="${k}">${n} <small>${k === 'late' ? personTaskList(uid, k).length : personTaskList(uid, k).filter(t => t.status !== 'feito').length}</small></button>`).join('')}</div>
    <div class="row small" style="margin-bottom:6px"><span class="muted">${pend} pendente(s) · ${done} feita(s)</span><span class="sp"></span>${ts.length ? `<b>${Math.round(done / ts.length * 100)}%</b>` : ''}</div>
    <div class="prog" style="margin-bottom:12px"><i style="width:${ts.length ? done / ts.length * 100 : 0}%"></i></div>
    <div class="sec" style="margin:4px 0 6px">A fazer (${pend})</div>
    <div class="list">${pendL.length ? pendL.map(row).join('') : empty(m === 'late' ? 'Nada atrasado. ✅' : 'Tudo feito por aqui. ✅')}</div>
    ${doneL.length ? `<div class="sec" style="margin:16px 0 6px;color:var(--ok)">${ic('check')}Feitas (${done}) · já contam no painel</div><div class="list">${doneL.map(row).join('')}</div>` : ''}
    ${can ? '' : `<p class="note" style="margin-top:10px">Só ${esc(firstName(uid))} ou o administrador marcam estas tarefas.</p>`}`,
    { wide: true, footer: `${can && pend && ts.some(t => t.kind !== 'reuniao' && t.status !== 'feito') ? `<button type="button" class="btn ok" data-act="ptAll" data-id="${uid}" data-m="${m}">${ic('check')}Marcar todas como feitas</button>` : ''}<span class="sp"></span><button type="button" class="btn" data-act="closeModal">Fechar</button>` });
}
const d0 = () => today();
/* re-desenha a janela sem perder a rolagem */
function personTasksKeep(uid, m) { const bd = $('#modal-root .bd'); const y = bd ? bd.scrollTop : 0; personTasks(uid, m); const nb = $('#modal-root .bd'); if (nb) nb.scrollTop = y; }
V.equipe = () => {
  const d = today(); const wk = Array.from({ length: 7 }, (_, i) => addDays(d, -i));
  return head('Equipe', 'Bravus Team · produtividade e presença', isAdmin() && SUPA ? `<button class="btn pri" data-act="newMember">${ic('plus')}Membro</button>` : '') + `<div class="grid g2">${team().map(p => {
    const mine = realTasks().filter(t => t.assignee === p.id);
    const td = mine.filter(t => t.date === d), tdn = td.filter(t => t.status === 'feito').length;
    const w = mine.filter(t => wk.includes(t.date)), wdn = w.filter(t => t.status === 'feito').length;
    const late = mine.filter(isLate).length;
    const goals = td.filter(t => t.goal);
    const acts = S.d.activity.filter(a => a.user_id === p.id).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6);
    return `<div class="card"><div class="row" style="margin-bottom:14px"><span data-act="editProfile" data-id="${p.id}" style="cursor:pointer">${avatar(p, 48)}</span><div class="sp" data-act="editProfile" data-id="${p.id}" style="cursor:pointer"><b style="font-size:16px">${esc(p.name)}</b><div class="small muted">${esc(cargo(p))} · ${isOnline(p) ? '<span style="color:var(--ok)">online agora</span>' : 'offline · último acesso ' + ago(p.last_seen)}</div></div>${p.id === S.me.id || isAdmin() ? `<label class="btn sm" title="Trocar foto">${ic('plus')}Foto<input type="file" accept="image/*" data-act-change="setPhoto" data-id="${p.id}" hidden></label>` : ''}${isAdmin() && SUPA && p.id !== S.me.id ? `<button class="btn sm bad" data-act="removeMember" data-id="${p.id}" title="Excluir ${esc(p.name)} da equipe" style="margin-left:6px">${ic('trash')}<span class="hide-m">Excluir</span></button>` : ''}</div>
      <div class="sec" style="margin-top:0">${ic('clock')} Tempo online no Bravus Work</div>
      <div class="grid g4 ot-grid" style="gap:8px;margin-bottom:12px">${kpi('Hoje', fmtDur(timeToday(p.id)), '', isOnline(p) ? 'g' : '')}${kpi('Total', fmtDur(timeOf(p.id)))}</div>
      <div class="sec" style="margin-top:0">Tarefas</div>
      <div class="grid g3" style="grid-template-columns:repeat(3,1fr);gap:8px">${kpiP(p.id, 'today', 'Hoje', `${tdn}/${td.length}`)}${kpiP(p.id, 'week', 'Semana', w.length ? Math.round(wdn / w.length * 100) + '%' : '—')}${kpiP(p.id, 'late', 'Atrasadas', late, late ? 'r' : 'g')}</div>
      ${goals.map(g => `<div style="margin-top:10px"><div class="row small"><span>${esc(g.title)}</span><span class="sp"></span><b>${g.count || 0}/${g.goal}</b></div><div class="prog" style="margin-top:4px"><i style="width:${Math.min(100, (g.count || 0) / g.goal * 100)}%"></i></div></div>`).join('')}
      <div class="sec" style="margin-top:16px">Atividades recentes</div><div class="list">${acts.length ? acts.map(a => `<div class="li"><div class="t"><b style="font-weight:500">${esc(a.action)}</b><small>${ago(a.created_at)}</small></div></div>`).join('') : empty('Sem atividades.')}</div></div>`;
  }).join('')}</div>`;
};

/* ---------- ALERTAS ---------- */
V.alertas = () => {
  const ns = S.d.notifications.filter(n => n.user_id === S.me.id).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 100);
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  return head('Alertas', 'Bravus Notify', (() => { const un = S.d.notifications.filter(n => n.user_id === S.me.id && !n.read), ut = un.filter(n => iso(new Date(n.created_at)) === today()); return `<div class="row" style="gap:8px"><button class="btn" data-act="newRem">${ic('bell')}Lembrete</button><button class="btn" data-act="readAll" data-s="hoje" ${ut.length ? '' : 'disabled'} title="Marca como lidos só os alertas de hoje">${ic('check')}Lidos de hoje${ut.length ? ` <small>${ut.length}</small>` : ''}</button><button class="btn pri" data-act="readAll" ${un.length ? '' : 'disabled'} title="Marca todos como lidos">${ic('check')}Todos lidos${un.length ? ` <small>${un.length}</small>` : ''}</button></div>`; })()) + `
    ${perm !== 'granted' ? `<div class="infobox row" style="margin-bottom:14px"><div class="sp">${perm === 'unsupported' ? 'Este navegador não suporta notificações. No iPhone, instale o app na Tela de Início (Compartilhar → Adicionar à Tela de Início) e abra por lá.' : perm === 'denied' ? 'As notificações estão bloqueadas neste aparelho. Libere nas configurações do navegador para este site.' : 'Ative as notificações para receber lembretes no celular e no computador.'}</div>${perm === 'default' ? `<button class="btn pri" data-act="enablePush">${ic('bell')}Ativar</button>` : ''}</div>` : `<div class="row small muted" style="margin-bottom:12px">${ic('bell')}Notificações ativas neste aparelho. <button class="btn sm" data-act="testPush">Testar</button></div>`}
    ${(() => { const pr = pendingRems(); return `<div class="card" style="margin-bottom:14px"><h3>${ic('bell')}Lembretes agendados <small class="muted">${pr.length}</small></h3>${pr.length ? `<div class="list">${pr.map(remRow).join('')}</div>` : `<p class="small muted" style="margin:0">Nenhum lembrete. Toque em <b>Lembrete</b> aqui ou no botão ${ic('bell')} dentro de qualquer cliente, reunião, tarefa, cobrança ou conteúdo.</p>`}</div>`; })()}
    <div class="card"><div class="list alist">${ns.length ? ns.map(n => `<a class="li" href="#${esc(n.route || 'painel')}" data-act="readOne" data-id="${n.id}" style="${n.read ? 'opacity:.55' : ''}"><i class="dot ${n.type === 'alerta' ? 'bad' : n.type === 'pago' ? 'on' : n.read ? '' : 'warn'}"></i><div class="t"><b>${esc(n.title)}</b><small>${esc(n.body || '')} · ${ago(n.created_at)}</small></div></a>`).join('') : empty('Nenhum alerta por enquanto.')}</div></div>
    <p class="note" style="margin-top:10px">Lembretes no horário exato dependem do sistema do aparelho. Com o app fechado, os avisos chegam pelo servidor (Supabase + push)${S.pushOk ? ' — <b>ativo neste aparelho ✅</b>' : ''}.</p>`;
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
      ${kpi('A receber', brl(fm.aReceberTotal), `mês ${brl(fm.aReceber)} + atrasado ${brl(fm.atrasado)}`, 'y', ['financeiro', 'pendente', 'fin-cob'])}
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
      return `<div class="card goal"><div class="row" style="margin-bottom:10px">${ic(r.icon)}<b class="sp">${esc(r.name)}</b>${ok ? '<span class="chip st ok">Batida</span>' : behind ? '<span class="chip st warn">Abaixo do ritmo</span>' : '<span class="chip st info">No caminho</span>'}</div>
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

