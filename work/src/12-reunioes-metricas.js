/* ---------- v3.7.0 — MÉTRICAS DO FUNIL + BANCO DE REPROSPECÇÃO + PAINEL NO DRIVE ----------
   Pessoas (não reuniões): cada empresa/contato conta uma vez no mês.
   Agendadas → Compareceram → Fecharam. "Não fecharam" e "Não compareceram" vão para o banco de reprospecção. */
const monthOf = s => String(s || '').slice(0, 7);
function funnelMonth(k) {
  const ms = meetings().filter(t => monthOf(t.date) === k && t.status !== 'cancelada');
  const keys = f => new Set(ms.filter(f).map(dealKey));
  const ag = keys(() => true), comp = keys(t => t.status === 'feito'), falt = keys(t => t.status === 'noshow');
  [...comp].forEach(x => falt.delete(x));
  const won = keys(t => t.outcome === 'fechou');
  allDeals().forEach(d => { const c = d.p && d.p.carteira; if (c && c !== true && monthOf(c) === k) won.add(dealKey(d.last)); });
  const lost = lostDeals().filter(d => monthOf(d.lostAt) === k).length;
  return { ym: k, reunioes: ms.length, realizadas: ms.filter(t => t.status === 'feito').length, agendadas: ag.size, compareceram: comp.size, faltaram: falt.size, fecharam: won.size, nao_fecharam: lost };
}
const fpct = (a, b) => b ? Math.round(a / b * 100) : 0;
const monthsBack = (k, n) => { const out = []; const d = new Date(k + '-15T12:00:00'); for (let i = 0; i < n; i++) { out.unshift(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`); d.setMonth(d.getMonth() - 1); } return out; };
const monthShort = k => new Date(k + '-15T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

/* pessoas que fizeram reunião (ou marcaram) e não viraram cliente: Não fecharam + Não compareceram */
function reprospectList() {
  const lost = lostDeals().map(d => ({ id: d.past.id, who: d.who, kind: 'lost', why: d.lo.motivo ? lbl(LOST_REASONS, d.lo.motivo) : 'Sem motivo', at: String(d.lostAt || d.past.date).slice(0, 10), ret: d.lo.retorno || null, phone: d.phone, obs: d.lo.obs || '' }));
  const g = {}; meetings().forEach(t => { const k = dealKey(t); (g[k] = g[k] || []).push(t); });
  const lostKeys = new Set(lostDeals().map(d => dealKey(d.last)));
  const nos = Object.entries(g).filter(([k, ms]) => !lostKeys.has(k) && ms.some(t => t.status === 'noshow') && !ms.some(t => t.status === 'feito' || meetUpcoming(t)) && !ms.some(t => t.client_id && client(t.client_id) && inWallet(client(t.client_id))))
    .map(([, ms]) => { ms.sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))); const t = ms[ms.length - 1]; const p = pipeOf(t);
      return { id: t.id, who: meetWho(t), kind: 'noshow', why: 'Não compareceu', at: t.date, ret: p.retorno || null, phone: (ms.slice().reverse().find(x => x.phone) || {}).phone || '', obs: '' }; });
  return [...lost, ...nos].sort((a, b) => (a.ret && a.ret <= today() ? 0 : 1) - (b.ret && b.ret <= today() ? 0 : 1) || (b.at || '').localeCompare(a.at || ''));
}

function funnelCard(k) {
  const f = funnelMonth(k); const hist = monthsBack(k, 6).map(funnelMonth); const max = Math.max(1, f.agendadas);
  const bar = (label, n, sub, cls) => `<div class="fn-row"><span class="fn-l">${label}</span><div class="fn-bar"><i class="${cls}" style="width:${Math.max(n ? 6 : 0, n / max * 100)}%"></i></div><b class="fn-n">${n}</b><small class="fn-s">${sub}</small></div>`;
  const url = S.set.sheet_url;
  return `<div class="card" style="margin-bottom:14px"><h3>${ic('target')}Funil do mês — pessoas<span class="sp"></span>${url ? `<a class="btn sm" href="${esc(url)}" target="_blank" rel="noopener">${ic('file')}Painel no Drive</a>` : ''}</h3>
    ${bar('Marcaram reunião', f.agendadas, `${f.reunioes} reuniões`, 'b')}
    ${bar('Compareceram', f.compareceram, `${fpct(f.compareceram, f.agendadas)}% das marcadas`, 'g')}
    ${bar('Fecharam', f.fecharam, `${fpct(f.fecharam, f.compareceram)}% de quem veio`, 'o')}
    <div class="fn-foot"><span>Faltaram: <b>${f.faltaram}</b></span><span>Não fecharam: <b>${f.nao_fecharam}</b></span><span>Conversão total: <b>${fpct(f.fecharam, f.agendadas)}%</b></span></div>
    <div class="fn-hist"><div class="fn-hh"><span>MÊS</span><span>MARCOU</span><span>VEIO</span><span>FECHOU</span><span>%</span></div>${hist.slice().reverse().map(h => `<div class="${h.ym === k ? 'on' : ''}"><span>${monthShort(h.ym)}/${h.ym.slice(2, 4)}</span><span>${h.agendadas}</span><span>${h.compareceram}</span><span>${h.fecharam}</span><span>${fpct(h.fecharam, h.agendadas)}%</span></div>`).join('')}</div>
    <p class="note" style="margin:8px 0 0">Cada pessoa/empresa conta uma vez por mês, mesmo com várias reuniões.</p></div>`;
}

function reprospectCard() {
  const L = reprospectList(); const tab = S.rpTab || 'todos';
  const list = L.filter(x => tab === 'todos' || (tab === 'agora' ? x.ret && x.ret <= today() : x.kind === tab));
  const n = f => L.filter(f).length;
  const row = x => { const tel = onlyDigits(x.phone).replace(/^55/, ''); const due = x.ret && x.ret <= today();
    return `<div class="rp-row"><div class="rp-t"><b>${esc(x.who)}</b><small><span class="${x.kind === 'lost' ? 'tx-bad' : 'tx-warn'}">${esc(x.why)}</span> · ${fdate(x.at)}${x.ret ? ` · <span class="${due ? 'tx-warn' : ''}">${due ? 'prospectar agora' : 'prospectar em ' + fdate(x.ret)}</span>` : ''}</small>${x.obs ? `<small class="muted">${esc(x.obs)}</small>` : ''}</div>
      <div class="rp-a">${isAdmin() ? `<button class="btn sm" data-act="rpWhen" data-id="${x.id}" data-k="${x.kind}">${ic('cal')}${x.ret ? 'Mudar data' : 'Prospectar em…'}</button>` : ''}${tel ? `<a class="btn sm ok ic" href="https://wa.me/55${tel}" target="_blank" rel="noopener" title="WhatsApp">${ic('wa')}</a>` : ''}<button class="btn sm ic" data-act="dealMeet" data-id="${x.id}" title="Marcar nova reunião">${ic('plus')}</button></div></div>`; };
  return `<div class="card" style="margin-bottom:14px"><h3>${ic('users')}Reprospectar depois <span class="muted small" style="font-weight:400">(${L.length})</span></h3>
    <div class="tabs" style="margin:0 0 10px">${[['todos', 'Todos', L.length], ['agora', 'Retomar agora', n(x => x.ret && x.ret <= today())], ['lost', 'Não fecharam', n(x => x.kind === 'lost')], ['noshow', 'Não compareceram', n(x => x.kind === 'noshow')]].map(([k2, l, c]) => `<button data-act="rpTab" data-id="${k2}" class="${tab === k2 ? 'on' : ''}">${l} <small>${c}</small></button>`).join('')}</div>
    <div class="rp-box">${list.length ? list.map(row).join('') : empty(tab === 'agora' ? 'Ninguém para retomar hoje.' : 'Ninguém nesta lista ainda.')}</div>
    <p class="note" style="margin:8px 0 0">Quem fez reunião e não fechou, ou marcou e não veio. Escolha quando prospectar de novo: o app cria o lembrete na agenda e avisa no dia.</p></div>`;
}

/* salva a data de reprospecção e cria o lembrete na agenda */
async function setReprospect(id, kind, date, obs) {
  const m = S.d.tasks.find(t => t.id === id); if (!m) return toast('Registro não encontrado', '', 'bad');
  const p = pipeOf(m); const who = meetWho(m);
  if (kind === 'lost') await putPipe(m, { ...p, perdido: { ...(p.perdido || {}), retorno: date } });
  else await putPipe(m, { ...p, retorno: date });
  if (date) await store.insert('tasks', { title: `Reprospectar: ${who}`, kind: 'followup', date, time: S.set.calls_start || '12:00', assignee: S.me.id, client_id: m.client_id || null, priority: 'media', remind_min: 20, description: `${kind === 'lost' ? 'Não fechou' : 'Não compareceu'} em ${fdate(m.date)}${obs ? ' — ' + obs : ''}` });
  await log(`Reprospecção de ${who}: ${date ? fdate(date) : 'sem data'}${obs ? ` (${obs})` : ''}`, m.client_id);
  toast(date ? 'Reprospecção agendada' : 'Data removida', date ? `${who} · ${fdateL(date)}` : who, 'ok'); await refresh();
}

/* snapshot das métricas para o painel do Google Drive (só o admin grava; a planilha lê pela função bw_metrics com chave) */
let lastMetricsJson = '';
async function syncMetrics(force) {
  if (!isAdmin() || !SUPA) return;
  const months = monthsBack(curYM(), 12).map(funnelMonth);
  const rp = reprospectList().map(x => ({ nome: x.who, situacao: x.kind === 'lost' ? 'Não fechou' : 'Não compareceu', motivo: x.why, data: x.at, retomar: x.ret || '' }));
  const body = JSON.stringify({ months, reprospect: rp });
  const prev = S.set.metrics ? JSON.stringify({ months: S.set.metrics.months, reprospect: S.set.metrics.reprospect }) : '';
  if (!force && (body === lastMetricsJson || body === prev)) { lastMetricsJson = body; return; }
  lastMetricsJson = body;
  const s = { ...S.set, metrics: { updated_at: new Date().toISOString(), months, reprospect: rp } };
  try { await store.upsertSettings(s); S.set = s; } catch (e) { console.warn('métricas', e); }
}
