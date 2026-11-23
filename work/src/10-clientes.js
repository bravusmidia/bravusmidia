/* ---------- CLIENTES ---------- */
/* ---------- TICKET DO CLIENTE: Ouro / Prata / Bronze ---------- */
const TIERS = [['ouro', 'Ouro'], ['prata', 'Prata'], ['bronze', 'Bronze']];
const autoTier = v => (+v || 0) >= 1200 ? 'ouro' : (+v || 0) > 800 ? 'prata' : 'bronze';
const clientTier = c => (c && TIERS.some(t => t[0] === c.tier)) ? c.tier : autoTier(c && c.contract_value);
const tierName = k => lbl(TIERS, k);
/* medalha metálica realista (gradientes definidos uma vez no documento) */
const MEDAL_C = { ouro: ['#fff6c8', '#f7d257', '#c9961b', '#7a5208', '#d93d3d', '#9e1f1f'], prata: ['#ffffff', '#e4e9f0', '#a9b3c1', '#5b6574', '#2f6fe0', '#1b3f8f'], bronze: ['#ffe0c2', '#e3a06a', '#a8622e', '#5a2f10', '#2e9d62', '#17633b'] };
(function medalDefs() {
  if (document.getElementById('medalDefs')) return;
  const g = Object.entries(MEDAL_C).map(([k, c]) => `<linearGradient id="md-${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset=".35" stop-color="${c[1]}"/><stop offset=".7" stop-color="${c[2]}"/><stop offset="1" stop-color="${c[3]}"/></linearGradient><linearGradient id="mi-${k}" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${c[0]}"/><stop offset=".45" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></linearGradient><linearGradient id="mr-${k}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c[5]}"/><stop offset=".5" stop-color="${c[4]}"/><stop offset="1" stop-color="${c[5]}"/></linearGradient>`).join('');
  document.body.insertAdjacentHTML('afterbegin', `<svg id="medalDefs" width="0" height="0" style="position:absolute;width:0;height:0" aria-hidden="true"><defs>${g}<radialGradient id="md-shine" cx=".32" cy=".28" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset=".4" stop-color="#fff" stop-opacity=".15"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs></svg>`);
})();
const medal = (k, size = 18) => `<svg class="medal" width="${size}" height="${size * 1.25}" viewBox="0 0 32 40" aria-hidden="true">
  <path d="M8 0h7l3 14h-7z" fill="url(#mr-${k})"/><path d="M24 0h-7l-3 14h7z" fill="url(#mr-${k})" opacity=".85"/>
  <circle cx="16" cy="26" r="13" fill="url(#md-${k})"/><circle cx="16" cy="26" r="13" fill="none" stroke="${MEDAL_C[k][3]}" stroke-opacity=".6" stroke-width="1"/>
  <circle cx="16" cy="26" r="9.6" fill="url(#mi-${k})" stroke="${MEDAL_C[k][3]}" stroke-opacity=".45" stroke-width=".8"/>
  <path d="M16 19.6l1.9 3.9 4.3.6-3.1 3 .7 4.3-3.8-2-3.8 2 .7-4.3-3.1-3 4.3-.6z" fill="${MEDAL_C[k][1]}" stroke="${MEDAL_C[k][3]}" stroke-opacity=".7" stroke-width=".7"/>
  <circle cx="16" cy="26" r="13" fill="url(#md-shine)"/></svg>`;
const tierChip = c => { const k = clientTier(c); return `<span class="chip tier ${k}" title="Ticket ${tierName(k)}${c.tier ? ' (marcado)' : ' (pelo valor do contrato)'}">${medal(k)}${tierName(k)}</span>`; };
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
    <div class="row wrap" style="gap:10px;margin-bottom:14px"><span class="muted small" style="font-weight:600">Ticket</span><div class="tabs tier-tabs" style="margin:0">${[['', 'Todos'], ...TIERS].map(x => `<button data-act="cliTier" data-f="${x[0]}" class="${x[0]} ${tf === x[0] ? 'on' : ''}">${x[0] ? medal(x[0], 14) : ''}${esc(x[1])} <small>${x[0] ? base.filter(c => clientTier(c) === x[0]).length : base.length}</small></button>`).join('')}</div></div>
    <div class="grid g3">${cl.length ? cl.map(c => `<div class="ccard tier-${clientTier(c)}" data-act="openClient" data-id="${c.id}">
      <div class="hd"><span class="av tier-av ${clientTier(c)}">${esc(initials(c.name))}</span><div class="sp" style="min-width:0"><b>${esc(c.name)}</b><div style="margin-top:4px">${tierChip(c)}</div></div>${walletBtn(c)}</div>
      <div class="row wrap" style="gap:6px">${(c.services || []).map(s => `<span class="chip blue">${esc(svcName(s))}</span>`).join('') || '<span class="muted small">Sem serviços</span>'}</div>
      <div class="ft"><span class="muted">${esc(c.segment || 'Segmento —')} · <span class="due-y">vence ${esc(dueTxt(c))}</span></span>${canFin() ? `<b>${brl(c.contract_value)}</b>` : ''}</div>
      ${!inWallet(c) ? `<div class="small muted">Saiu ${c.end_date ? 'em ' + fdateY(c.end_date) : ''}${c.end_reason ? ' · ' + esc(c.end_reason) : ''}${c.start_date ? ` · cliente desde ${fdateY(c.start_date)}` : ''}</div>` : ''}
      <div class="row">${canFin() ? (isAdmin() ? payBtn(c) : finChip(clientFin(c))) : ''}${inWallet(c) ? `${c.op_status !== 'ativo' ? `<span class="chip st ${c.op_status === 'pausado' ? 'warn' : 'info'}">${esc(c.op_status === 'pausado' ? 'Pausado' : 'Em implantação')}</span>` : ''}${['prob', 'saldo'].includes(adState(c).k) ? adChip(c) : ''}` : ''}<span class="sp"></span><span class="small muted">${esc(firstName(c.owner))}</span></div>
    </div>`).join('') : `<div class="card" style="grid-column:1/-1">${empty(S.d.clients.length ? 'Nenhum cliente neste filtro.' : 'Cadastre seu primeiro cliente no botão “+ Cliente”.')}</div>`}</div>`;
};
function clientForm(c = {}) {
  const svcs = c.services || [];
  modal(c.id ? 'Editar cliente' : 'Novo cliente', `<div class="f">
    <input type="hidden" name="id" value="${esc(c.id || '')}">${c._deal ? `<input type="hidden" name="deal" value="${esc(c._deal)}"><p class="note" style="margin:0">Ao salvar, o cliente entra na carteira, o funil fica concluído e as reuniões dele ficam ligadas a este cadastro.</p>` : ''}
    <div class="f2">${fld('Nome da empresa *', 'name', c.name, 'text', 'required maxlength="120"')}${fld('Responsável', 'contact', c.contact)}</div>
    <div class="f2">${fld('WhatsApp', 'whatsapp', c.whatsapp, 'tel', 'placeholder="(85) 9 9999-9999"')}${fld('Telefone', 'phone', c.phone, 'tel')}</div>
    <div class="f2">${fld('E-mail', 'email', c.email, 'email')}${fld('Instagram', 'instagram', c.instagram, 'text', 'placeholder="@perfil"')}</div>
    <div class="f2">${fld('Segmento', 'segment', c.segment)}${sel('Responsável interno', 'owner', teamOpts(), c.owner || S.me.id)}</div>
    <label class="fl">Serviços contratados<div class="cks">${SERVICES.map(s => `<label><input type="checkbox" name="services" value="${s[0]}" ${svcs.includes(s[0]) ? 'checked' : ''}>${s[1]}</label>`).join('')}</div></label>
    <div class="f2">${fld('Valor mensal do contrato (R$)', 'contract_value', c.contract_value, 'number', 'step="0.01" min="0"')}${sel('Forma de pagamento', 'installments', [['1', 'À vista (1 vencimento)'], ['2', 'Parcelado em 2x']], String(c.installments || 1))}</div>
    <div class="f2">${fld('1º vencimento (dia)', 'due_day', c.due_day || 10, 'number', 'min="1" max="31"')}<div id="dd2" style="${+c.installments === 2 ? '' : 'visibility:hidden'}">${fld('2º vencimento (dia)', 'due_day2', c.due_day2 || '', 'number', 'min="1" max="31" placeholder="ex.: 20"')}</div></div>
    <p class="note" id="ddNote" style="${+c.installments === 2 ? '' : 'display:none'};margin-top:-6px">Parcelado: o valor mensal é dividido em 2 cobranças iguais, uma em cada dia. Máximo 2x.</p>
    <div class="fl">Ticket do cliente<div class="seg tier-seg" role="radiogroup">${[['', 'Automático'], ...TIERS].map(x => `<label class="${x[0]}"><input type="radio" name="tier" value="${x[0]}" ${(c.tier || '') === x[0] ? 'checked' : ''}><span>${x[0] ? medal(x[0], 16) : ''}${x[1]}</span></label>`).join('')}</div><small class="muted" id="tierHint" style="display:block;margin-top:6px">${tierRule}</small></div>
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
  const tierBox = !isAdmin() ? '' : `<div class="card row wrap" style="gap:10px;margin-bottom:12px;padding:12px 14px"><div class="sp"><b>Ticket do cliente</b><div class="small muted">${c.tier ? 'Marcado manualmente' : `Automático pelo valor${canFin() ? ' (' + brl(c.contract_value) + ')' : ''}`}</div></div><div class="tabs tier-tabs" style="margin:0">${[['', 'Auto'], ...TIERS].map(x => `<button type="button" class="${x[0]} ${(c.tier || '') === x[0] ? 'on' : ''}" data-act="setTier" data-id="${c.id}" data-t="${x[0]}">${x[0] ? medal(x[0], 14) : ''}${x[1]}</button>`).join('')}</div></div>`;
  modal(c.name, `${wal}${tierBox}<div class="row wrap" style="gap:6px;margin-bottom:12px">${tierChip(c)}${walletChip(c)}${canFin() ? (isAdmin() ? payBtn(c) : finChip(clientFin(c))) : ''}${(c.services || []).map(s => `<span class="chip blue">${esc(svcName(s))}</span>`).join('')}</div>
    <div class="grid g2" style="gap:10px">
      <div class="card"><h3>Contato</h3><div class="small" style="display:grid;gap:4px"><span>👤 ${esc(c.contact || '—')}</span><span>📱 ${esc(c.whatsapp || c.phone || '—')}</span><span>✉️ ${esc(c.email || '—')}</span><span>📷 ${esc(c.instagram || '—')}</span><span>🏷️ ${esc(c.segment || '—')}</span><span>🧑‍💼 Responsável: ${esc(pname(c.owner))}</span></div></div>
      <div class="card"><h3>Contrato</h3><div class="small" style="display:grid;gap:4px">${canFin() ? `<span>Valor: <b>${brl(c.contract_value)}</b>/mês</span>` : ''}<span>Vencimento: ${esc(dueTxt(c))}${isSplit(c) && canFin() ? ` · ${parts(c).map(p => brl(p[1])).join(' + ')}` : ''}</span><span>Desde: ${c.start_date ? new Date(c.start_date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</span></div></div>
    </div>
    ${canFin() ? `<div class="sec">Cobranças</div><div class="list">${inv.length ? inv.slice(0, 8).map(i => `<div class="li"><div class="t"><b>${brl(i.amount)} · ${fdate(i.due_date)}</b><small>${esc(invDesc(i))}</small></div>${invChip(i)}</div>`).join('') : empty('Nenhuma cobrança.')}</div>` : ''}
    <div class="sec">Histórico de atividades</div>
    <div class="list">${acts.length ? acts.map(a => `<div class="li"><div class="t"><b style="font-weight:500">${esc(a.action)}</b><small>${esc(firstName(a.user_id))} · ${new Date(a.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</small></div></div>`).join('') : empty('Sem registros ainda.')}</div>
    <form data-form="clientNote" class="row" style="margin-top:10px"><input type="hidden" name="id" value="${c.id}"><input name="text" placeholder="Registrar atividade (ex.: liguei, enviei proposta)" maxlength="300"><button class="btn">Registrar</button></form>`,
    { wide: true, footer: `${wa ? `<a class="btn ok" href="https://wa.me/55${wa.replace(/^55/, '')}" target="_blank" rel="noopener">${ic('wa')}WhatsApp</a>` : ''}<button type="button" class="btn" data-act="editMeet" data-client="${c.id}">${ic('meet')}<span class="hide-m">Reunião</span></button><button type="button" class="btn" data-act="clientReport" data-id="${c.id}">${ic('file')}Relatório</button>${remBtn('cliente', c.id, c.name)}${isAdmin() ? `<button type="button" class="btn bad" data-act="offboard" data-id="${c.id}" title="Pausar, cancelar ou enviar comunicado">${ic('bell')}<span class="hide-m">${c.op_status === 'pausado' ? 'Pausado' : 'Pausar / Cancelar'}</span></button>` : ''}<span class="sp"></span>${isAdmin() ? `<button type="button" class="btn pri" data-act="editClient" data-id="${c.id}">${ic('edit')}Editar</button>` : ''}` });
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

