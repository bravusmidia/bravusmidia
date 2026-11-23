/* ---------- FINANCEIRO ---------- */
const invChip = i => { const s = invStatus(i); return `<span ${isAdmin() && s !== 'cancelado' ? `data-act="invMenu" data-id="${i.id}" style="cursor:pointer" title="Clique para alterar"` : ''} class="chip st ${s === 'pago' ? 'ok' : s === 'atrasado' ? 'bad' : s === 'pendente' ? 'warn' : 'neu'}">${s === 'pago' ? 'Pago' : s === 'atrasado' ? 'Atrasado' : s === 'pendente' ? 'A vencer' : 'Cancelado'}</span>`; };
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
    <div class="grid g4">${kpi('Entrou', brl(fm.recebido), 'confirmado', 'hl', ['financeiro', 'pago', 'fin-cob'])}${kpi('A receber', brl(fm.aReceberTotal), fm.atrasado ? `mês ${brl(fm.aReceber)} + atrasado ${brl(fm.atrasado)}` : '', 'y', ['financeiro', 'pendente', 'fin-cob'])}${kpi('Atrasado (total)', brl(fm.atrasado), '', fm.atrasado ? 'r' : '', ['financeiro', 'atrasado', 'fin-cob'])}${kpi('Saiu', brl(fm.saidas), `saldo do mês ${brl(fm.saldo)}`, fm.saidas ? 'r' : '', ['financeiro', 'todos', 'fin-saidas'])}</div>
    <div class="card" id="fin-cob" style="margin-top:14px"><h3>${ic('wallet')}Cobranças<span class="sp"></span><span class="small muted">${inv.length}</span></h3>
      <div class="tabs" style="margin-bottom:10px">${fTabs.map(t => `<button data-act="finFilter" data-f="${t[0]}" class="${ff === t[0] ? 'on' : ''}">${t[1]}</button>`).join('')}</div>
      <div class="list">${inv.length ? inv.map(i => { const c = client(i.client_id) || {}; const s = invStatus(i); return `<div class="li"><div class="t"><b>${esc(c.name || '—')} · ${brl(i.amount)}</b><small>${esc(invDesc(i))} · <span class="due-y">vence ${fdate(i.due_date)}</span>${i.status === 'pago' ? ` · pago em ${fdate(i.paid_at)} (${esc(i.method || '')})` : ''}</small></div>${invChip(i)}
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
    ${fld('Descrição', 'description', i.id ? invDesc(i) : 'Mensalidade')}
    ${i.id ? sel('Status', 'status', [['pendente', 'Automático (pelo vencimento)'], ['areceber', 'A receber'], ['atrasado', 'Em atraso'], ['cancelado', 'Cancelado']].concat(i.status === 'pago' ? [['pago', 'Pago']] : []), i.status) : ''}
    ${fld('Link de pagamento (opcional)', 'payment_url', i.payment_url, 'url', 'placeholder="https://..."')}
  </div>`, { form: 'saveInvoice', footer: `${i.id ? `<button type="button" class="btn bad" data-act="delInvoice" data-id="${i.id}">${ic('trash')}</button>${remBtn('cobranca', i.id, `Cobrança ${cname(i.client_id)} · ${brl(i.amount)}`)}<span class="sp"></span>` : ''}<button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">Salvar</button>` });
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
