/* ---------- REUNIÕES (Bravus Meetings) ---------- */
const MTYPES = [['comercial', 'Comercial (primeira conversa)'], ['proposta', 'Apresentação de proposta'], ['alinhamento', 'Alinhamento'], ['onboarding', 'Onboarding / implantação'], ['resultado', 'Resultados / relatório'], ['outro', 'Outro']];
const MFORMATS = [['meet', 'Google Meet'], ['whatsapp', 'Vídeo no WhatsApp'], ['ligacao', 'Ligação'], ['presencial', 'Presencial']];
const MSTATUS = [['pendente', 'Agendada'], ['feito', 'Realizada'], ['noshow', 'Não compareceu'], ['remarcada', 'Remarcada'], ['cancelada', 'Cancelada']];
const MOUT = [['', '—'], ['fechou', 'Fechou'], ['negociando', 'Em negociação'], ['perdido', 'Não fechou']];
const TICKETS = [['baixo', 'Baixo', 'bronze'], ['medio', 'Médio', 'prata'], ['alto', 'Alto', 'ouro']]; // valor = metal (igual ao ticket do cliente)
const ticketChip = t => { const x = TICKETS.find(k => k[0] === t.ticket); return x ? `<span class="chip tk ${x[2]}" title="Ticket ${x[1]}">${medal(x[2], 14)}${x[1]}</span>` : ''; };
const ticketPick = v => `<div class="fl">Ticket<div class="seg" role="radiogroup">${[['', 'Sem ticket', ''], ...TICKETS].map(x => `<label class="${x[2]} tkl"><input type="radio" name="ticket" value="${x[0]}" ${(v || '') === x[0] ? 'checked' : ''}><span>${x[2] ? medal(x[2], 14) : ''}${x[1]}</span></label>`).join('')}</div></div>`;
const lbl = (L, k) => (L.find(x => x[0] === k) || ['', k || '—'])[1];
/* v2.8.2: remarcar move a própria reunião para a nova data/hora — registros antigos com status "remarcada" eram duplicados e não contam mais */
const meetings = () => realTasks().filter(t => t.kind === 'reuniao' && t.status !== 'remarcada');
const RESCH = '↻ Remarcada de ';
const reschFrom = t => { const m = String(t.description || '').match(/↻ Remarcada de ([^\n]+)/g); return m ? m.map(x => x.slice(RESCH.length)) : []; };
const reschChip = t => { const r = reschFrom(t); return r.length ? `<span class="chip chg" title="${esc('Remarcada de ' + r.join(', '))}">↻ Remarcada${r.length > 1 ? ' ' + r.length + 'x' : ''}</span>` : ''; };
const meetWho = t => t.company || (t.client_id && cname(t.client_id)) || t.contact_name || t.title;
const meetChip = t => { const s = t.status === 'pendente' && isLate(t) ? ['warn', 'Aguardando resultado'] : [{ feito: 'ok', noshow: 'bad', cancelada: 'neu', remarcada: 'chg' }[t.status] || 'info', lbl(MSTATUS, t.status)]; return `<span class="chip st ${s[0]}">${esc(s[1])}</span>`; };
const outTx = o => o ? ` · <span class="${{ fechou: 'tx-ok', negociando: 'tx-info', perdido: 'tx-bad' }[o] || ''}">${esc(lbl(MOUT, o))}</span>` : '';
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
/* v2.8.1: reuniões liberadas em qualquer horário para todos (admin e membros) */
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
const meetAllowed = () => true;
const meetRuleMsg = ds => holidayName(ds) ? `Feriado (${holidayName(ds)}): pode marcar em qualquer horário.` : 'Pode marcar em qualquer horário.';
/* v3.5.0 — disponibilidade com justificativa: todo bloqueio, liberação ou horário extra exige motivo e fica no histórico.
   avail.closed / avail.extra guardam só horários (vão para a página pública); motivos ficam em avail.notes / avail.log (só a equipe vê). */
const avail = () => (S.set && S.set.avail) || {};
const slotClosed = (ds, t) => ((avail().closed || {})[ds] || []).includes(t);
const slotExtra = ds => ((avail().extra || {})[ds] || []).filter(t => /^\d{2}:\d{2}$/.test(t));
const slotNote = (ds, t) => (avail().notes || {})[`${ds} ${t}`] || null;
const PUBLIC_URL = 'https://www.bravusmidia.com.br/work/horarios.html';
const AV_WHY = {
  block: ['Compromisso pessoal', 'Gravação de conteúdo', 'Reunião fora do app', 'Atendimento a cliente da carteira', 'Trabalho na CLT', 'Folga / descanso', 'Outro motivo'],
  unblock: ['Compromisso cancelado', 'Liberar para cliente', 'Bloqueio feito por engano', 'Outro motivo'],
  open: ['Encaixe para cliente', 'Horário extra da semana', 'Pedido do cliente', 'Outro motivo'],
  remove: ['Não vou conseguir atender', 'Compromisso pessoal', 'Aberto por engano', 'Outro motivo']
};
const AV_VERB = { block: 'bloqueou', unblock: 'liberou', open: 'abriu', remove: 'removeu' };
const AV_TITLE = { block: 'Bloquear horário', unblock: 'Liberar horário', open: 'Abrir horário extra', remove: 'Remover horário extra' };
const whyTxt = n => n ? `${n.why}${n.obs ? ` — ${n.obs}` : ''}` : '';
const stamp = iso_ => { const d = new Date(iso_); return `${fdate(iso(d))} às ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
async function saveAvail(fn) {
  const a = JSON.parse(JSON.stringify(avail())); a.closed = a.closed || {}; a.extra = a.extra || {}; a.notes = a.notes || {}; a.log = a.log || [];
  fn(a);
  const t0 = today(); ['closed', 'extra'].forEach(k => Object.keys(a[k]).forEach(d => { if (d < t0 || !(a[k][d] || []).length) delete a[k][d]; }));
  Object.keys(a.notes).forEach(k => { if (k.slice(0, 10) < t0) delete a.notes[k]; });
  a.log = a.log.slice(-80);
  const s = { ...S.set, avail: a };
  try { await store.upsertSettings(s); S.set = s; renderView(); return true; } catch (e) { toast('Não foi salvo', 'Só o administrador altera a disponibilidade.', 'warn'); return false; }
}
async function availChange(op, ds, t, why, obs) {
  const by = S.me.id, at = new Date().toISOString(), k = `${ds} ${t}`;
  const ok = await saveAvail(a => {
    if (op === 'block') { a.closed[ds] = [...new Set([...(a.closed[ds] || []), t])]; a.notes[k] = { kind: 'block', why, obs, by, at }; }
    if (op === 'unblock') { a.closed[ds] = (a.closed[ds] || []).filter(x => x !== t); delete a.notes[k]; }
    if (op === 'open') { a.extra[ds] = [...new Set([...(a.extra[ds] || []), t])].sort(); if (a.closed[ds]) a.closed[ds] = a.closed[ds].filter(x => x !== t); a.notes[k] = { kind: 'open', why, obs, by, at }; }
    if (op === 'remove') { a.extra[ds] = (a.extra[ds] || []).filter(x => x !== t); delete a.notes[k]; }
    a.log.push({ op, ds, t, why, obs, by, at });
  });
  if (!ok) return;
  const head = `${firstName(S.me.id)} ${AV_VERB[op]} o horário ${t} de ${fdate(ds)}`;
  toast(`Horário ${t} ${({ block: 'bloqueado', unblock: 'liberado', open: 'aberto', remove: 'removido' })[op]}`, `${fdate(ds)} · ${why}`, 'ok');
  try { await log(`${head} — ${why}${obs ? ` (${obs})` : ''}`); await notifyTeam(head, `Motivo: ${why}${obs ? ` — ${obs}` : ''}`, 'tarefa', `avail:${ds}:${t}:${op}:${Date.now()}`, 'reunioes'); } catch {}
}
function availForm(op, ds, t, pre = '') {
  const timeFld = op === 'open' ? fld('Horário', 't', t || (ds === today() ? nextHour() : '15:00'), 'time', 'required') : `<input type="hidden" name="t" value="${t}">`;
  return `${pre}<input type="hidden" name="op" value="${op}"><input type="hidden" name="d" value="${ds}">${timeFld}
    ${sel('Motivo (obrigatório)', 'why', [['', 'Escolha o motivo…'], ...AV_WHY[op]], '')}
    <label class="fl">Observação <span class="muted small">(obrigatória em “Outro motivo”)</span><textarea name="obs" rows="2" maxlength="140" placeholder="Ex.: levar o Lorenzo ao médico"></textarea></label>`;
}
function freeList(ds) { return daySlots(ds).filter(x => !x.past && !x.locked && !x.meets.length && !x.closed).map(x => x.time); }
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
  // horários extras abertos à mão (ex.: 15:00 num dia específico)
  // horário aberto à mão vale como livre mesmo colado numa reunião; só fica ocupado se tiver reunião exatamente nessa hora
  slotExtra(ds).filter(t => !out.some(x => x.time === t)).forEach(t => { const m = hm2m(t); const hit = ms.filter(x => hm2m(x.time) === m); out.push({ time: t, meets: hit, past: isPast(m), extra: true }); });
  out.forEach(x => { x.closed = !x.meets.length && slotClosed(ds, x.time); });
  // reuniões fora do bloco padrão (ex.: 12:00) também aparecem e contam como ocupadas
  ms.filter(t => !out.some(x => x.meets.includes(t))).forEach(t => out.push({ time: t.time, meets: [t], past: isPast(hm2m(t.time)) }));
  return out.sort((a, b) => hm2m(a.time) - hm2m(b.time));
}
function weekStrip(who) {
  const days = []; const d0 = new Date(); for (let i = 0; i < 7; i++) { const d = new Date(d0); d.setDate(d0.getDate() + i); days.push(iso(d)); }
  const sel = days.includes(S.meetDay) ? S.meetDay : days[0];
  const info = days.map((ds, i) => { const sl = daySlots(ds, who); const free = sl.filter(x => !x.past && !x.locked && !x.meets.length && !x.closed).length; const busy = sl.filter(x => x.meets.length).length; return { ds, i, free, busy, open: sl.filter(x => !x.past).length }; });
  const slots = daySlots(sel, who);
  const tag = x => x.open === 0 ? ['off', 'Encerrado'] : x.free === 0 ? ['bad', 'Lotado'] : ['ok', `${x.free} livre${x.free > 1 ? 's' : ''}`];
  const hol = holidayName(sel);
  const td = info[0];
  if (!S.weekOpen) return `<button class="card wk-toggle" data-act="weekToggle" style="margin-bottom:14px">${ic('cal')}<b>Horários da semana</b><span class="muted small">${td.open ? `${td.free} livre${td.free === 1 ? '' : 's'} hoje` : 'hoje encerrado'} · ${info.reduce((n, x) => n + x.free, 0)} na semana</span><span class="sp"></span><span class="btn sm">Ver horários ${ic('down')}</span></button>`;
  return `<div class="card wk-card" style="margin-bottom:14px"><h3>${ic('cal')}Horários da semana <span class="muted small" style="font-weight:400;margin-left:auto">blocos de ${S.set.meet_slot || 60} min · ${esc(S.set.meetings_start)} às ${esc(S.set.meetings_end || '21:30')}</span><button class="btn sm" data-act="weekToggle">Ocultar</button></h3>
    <div class="wk-tools"><button class="btn sm ok" data-act="availShare" data-d="${sel}">${ic('wa')}Divulgar horários</button>${isAdmin() ? `<button class="btn sm" data-act="availOpen" data-d="${sel}">${ic('plus')}Abrir horário</button><button class="btn sm" data-act="availLog">${ic('file')}Histórico</button>` : ''}</div>
    <div class="wk">${info.map(x => { const [c, t] = tag(x); return `<button class="wd ${c} ${x.ds === sel ? 'on' : ''}" data-act="meetDay" data-d="${x.ds}"><b>${dayName(x.ds, x.i)}</b><small>${fdate(x.ds)}${holidayName(x.ds) ? ' · feriado' : ''}</small><i>${t}</i></button>`; }).join('')}</div>
    ${hol || !isAdmin() ? `<p class="note" style="margin:8px 0 0">${hol ? `${esc(hol)} · ` : ''}${isAdmin() ? 'Você pode marcar em qualquer horário.' : esc(meetRuleMsg(sel))}</p>` : ''}
    <div class="slots">${slots.map(x => x.meets.length
      ? `<button class="slot busy" data-act="editMeet" data-id="${x.meets[0].id}"><b>${x.time}</b><span>Ocupado</span><small>${esc(x.meets[0].time)} · ${esc(meetWho(x.meets[0]))}</small></button>`
      : x.past ? `<div class="slot past"><b>${x.time}</b><span>Passou</span></div>`
      : x.closed ? `<button class="slot closed" data-act="slotSheet" data-d="${sel}" data-t="${x.time}"><b>${x.time}</b><span>Bloqueado</span><small>${esc((slotNote(sel, x.time) || {}).why || 'sem motivo registrado')}</small></button>`
      : x.locked ? `<div class="slot past" title="${esc(meetRuleMsg(sel))}"><b>${x.time}</b><span>Fora da regra</span></div>`
      : `<button class="slot free" data-act="slotSheet" data-d="${sel}" data-t="${x.time}"><b>${x.time}</b><span>Livre${x.extra ? ' · extra' : ''}</span><small>toque para opções</small></button>`).join('')}<button class="slot free" data-act="meetSlot" data-d="${sel}" data-t="${sel === today() ? nextHour() : '09:00'}"><b>${ic('plus')}</b><span>Outro horário</span><small>reunião em qualquer hora</small></button></div></div>`;
}
/* v3.0.0 — Funil pós-reunião por cliente: Reunião → Proposta enviada → Contrato assinado → Onboarding → Cliente na carteira (vai para Clientes) */
const PIPE = [['reuniao', 'Reunião', 'Reunião realizada'], ['proposta', 'Proposta', 'Proposta enviada'], ['contrato', 'Contrato', 'Contrato assinado'], ['onboarding', 'Onboarding', 'Onboarding feito'], ['carteira', 'Carteira', 'Cliente na carteira']];
const PIPE_BTN = { reuniao: 'Reunião realizada', proposta: 'Proposta enviada', contrato: 'Contrato assinado', onboarding: 'Onboarding feito', carteira: 'Colocar na carteira' };
const PIPE_MTYPE = { reuniao: 'comercial', proposta: 'proposta', contrato: 'alinhamento', onboarding: 'onboarding', carteira: 'alinhamento' };
const pipeOf = t => { let c = {}; if (typeof t.category === 'string' && t.category.startsWith('pipe:')) { try { c = JSON.parse(t.category.slice(5)) || {}; } catch {} } return Object.assign(c, t.pipeline && typeof t.pipeline === 'object' ? t.pipeline : {}); };
const dealKey = t => t.client_id || ((t.company || t.contact_name || '').trim().toLowerCase()) || t.phone || t.id;
const nextHour = () => `${pad((new Date().getHours() + 1) % 24)}:00`;
const meetUpcoming = t => t.status === 'pendente' && (t.date > today() || (t.date === today() && (t.time || '') >= nowHM()));
/* v3.1.0 — Proposta não fechada: sai do funil e vai para a lista "Não fecharam" (Reuniões + Painel) */
const LOST_REASONS = [['preco', 'Achou o preço alto'], ['orcamento', 'Sem orçamento no momento'], ['concorrente', 'Fechou com outra agência'], ['adiou', 'Vai pensar / adiou a decisão'], ['sumiu', 'Parou de responder'], ['valor', 'Não viu valor no serviço'], ['proprio', 'Vai fazer por conta própria'], ['outro', 'Outro motivo']];
const deals = () => allDeals().filter(d => !d.lost);
const lostDeals = () => allDeals().filter(d => d.lost).sort((a, b) => (b.lostAt || '').localeCompare(a.lostAt || ''));
function allDeals() {
  const g = {};
  meetings().forEach(t => { const k = dealKey(t); (g[k] = g[k] || []).push(t); });
  return Object.values(g).map(ms => {
    ms.sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
    const last = ms[ms.length - 1]; const out = ms.slice().reverse().find(t => t.outcome) || {};
    const p = Object.assign({}, ...ms.map(pipeOf)); if (p.operacao && !p.carteira) p.carteira = p.operacao; // etapa antiga "Operação" = na carteira
    const cid = ms.map(t => t.client_id).find(Boolean); const cl = cid ? client(cid) : null;
    const done1 = ty => ms.some(t => t.status === 'feito' && (!ty || t.meet_type === ty));
    const marked = PIPE.some(([k]) => k !== 'reuniao' && k !== 'carteira' && p[k]);
    const comercial = ms.some(t => ['comercial', 'proposta'].includes(t.meet_type || 'comercial'));
    // aparece assim que a reunião comercial é realizada (ou quando já tem resultado / etapa marcada); "Não fechou" sai do funil
    const lost = out.outcome === 'perdido';
    const show = lost || ['fechou', 'negociando'].includes(out.outcome) || marked || (comercial && done1() && !(cl && inWallet(cl) && !p.carteira));
    if (!show) return null;
    const auto = { reuniao: done1(), proposta: done1('proposta'), onboarding: done1('onboarding'), carteira: !!cl && inWallet(cl) };
    if (p.carteira && cl && !inWallet(cl)) delete p.carteira; // saiu da carteira → volta a ficar pendente
    const done = PIPE.map(([k]) => !!(p[k] || auto[k]));
    const next = done.indexOf(false);
    const up = ms.filter(meetUpcoming)[0] || null;
    const lo = p.perdido && typeof p.perdido === 'object' ? p.perdido : {};
    return { ms, last, past: ms.filter(t => !meetUpcoming(t)).pop() || last, outcome: out.outcome, p, auto, done, next, cid, cl, up, n: done.filter(Boolean).length, who: meetWho(last),
      lost, lo, lostAt: lo.at || out.done_at || out.date || '', phone: (ms.slice().reverse().find(t => t.phone) || {}).phone || (cl && (cl.whatsapp || cl.phone)) || '' };
  }).filter(Boolean).sort((a, b) => (a.next < 0) - (b.next < 0) || (b.last.date || '').localeCompare(a.last.date || ''));
}
async function putPipe(m, obj) {
  try { await store.update('tasks', m.id, { pipeline: obj, ...(String(m.category || '').startsWith('pipe:') ? { category: null } : {}) }); }
  catch (e) { if (!/pipeline|column/i.test(e && e.message || '')) throw e; await store.update('tasks', m.id, { category: 'pipe:' + JSON.stringify(obj) }); }
}
async function setPipe(deal, k, on) {
  const p = Object.assign({}, deal.p); if (on) p[k] = new Date().toISOString(); else { delete p[k]; if (k === 'carteira') delete p.operacao; }
  await putPipe(deal.last, p);
  if (!on) for (const m of deal.ms) if (m.id !== deal.last.id) { const q = pipeOf(m); if (q[k] || (k === 'carteira' && q.operacao)) { delete q[k]; delete q.operacao; await putPipe(m, q); } }
}
/* liga todas as reuniões do negócio ao cliente novo e marca "Cliente na carteira" */
async function linkDeal(mid, cid) {
  const deal = deals().find(x => x.ms.some(m => m.id === mid));
  const ms = deal ? deal.ms : [S.d.tasks.find(x => x.id === mid)].filter(Boolean);
  for (const m of ms) if (m.client_id !== cid) await store.update('tasks', m.id, { client_id: cid });
  if (deal) await setPipe(deal, 'carteira', true);
}
/* "Colocar na carteira": cliente novo → abre o cadastro já preenchido; cliente que tinha saído → volta a ficar ativo */
async function pipeToWallet(deal) {
  const t = deal.last;
  if (deal.cl) {
    try { await store.update('clients', deal.cl.id, { op_status: 'ativo', end_date: null, end_reason: null }); } catch (e) { if (!/end_date|end_reason|column/i.test(e && e.message || '')) throw e; await store.update('clients', deal.cl.id, { op_status: 'ativo' }); }
    await linkDeal(t.id, deal.cl.id); await log(`${deal.cl.name} entrou na carteira pelo funil`, deal.cl.id);
    await notifyTeam(`${deal.cl.name} entrou na carteira 🎉`, `Funil concluído · por ${firstName(S.me.id)}`, 'pago', `pipe:${t.id}:carteira`, 'clientes');
    await refresh(); S.cliFilter = 'online'; location.hash = 'clientes'; renderView(); return toast(`${deal.cl.name} na carteira 🎉`, 'Já está na lista de Clientes.', 'ok');
  }
  clientForm({ name: t.company || t.contact_name || '', contact: t.contact_name || '', whatsapp: t.phone || '', services: ['trafego'], op_status: 'ativo', start_date: today(), notes: deal.ms.map(m => m.description).filter(Boolean).join('\n'), _deal: t.id });
}
const pipeTabs = (all, lost) => `<span class="tabs" style="margin:0"><button data-act="pipeTab" data-id="" class="${!S.pipeTab ? 'on' : ''}">Em andamento <small>${all.filter(d => d.next >= 0).length}</small></button><button data-act="pipeTab" data-id="fin" class="${S.pipeTab === 'fin' ? 'on' : ''}">Na carteira <small>${all.filter(d => d.next < 0).length}</small></button><button data-act="pipeTab" data-id="lost" class="tab-lost ${S.pipeTab === 'lost' ? 'on' : ''}">Não fecharam <small>${lost.length}</small></button></span>`;
const pipeHead = (all, lost) => `<h3 style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">${ic('target')}Andamento pós-reunião <span class="sp"></span>${pipeTabs(all, lost)}</h3>`;
/* etapa em que o cliente parou antes de recusar */
const lostStage = d => { const i = d.done.lastIndexOf(true); return i >= 0 ? PIPE[i][2] : 'Antes da reunião'; };
function lostRow(d, can, mini = false) {
  const tel = onlyDigits(d.phone).replace(/^55/, '');
  const ret = d.lo.retorno; const retDue = ret && ret <= today();
  return `<div class="deal lost"><div class="deal-h"><div class="t" data-act="editMeet" data-id="${d.past.id}" style="cursor:pointer"><b>${esc(d.who)}</b><small><span class="tx-bad">Não fechou</span> · ${d.lostAt ? fdate(String(d.lostAt).slice(0, 10)) : '—'}${d.last.ticket ? ' · ticket ' + esc(lbl(TICKETS.map(x => [x[0], x[1]]), d.last.ticket)) : ''}${d.lo.by ? ' · por ' + esc(firstName(d.lo.by)) : ''}</small></div><span class="chip bad">${esc(d.lo.motivo ? lbl(LOST_REASONS, d.lo.motivo) : 'Sem motivo')}</span></div>
    ${mini ? '' : `<div class="lost-info"><span>Parou em: <b>${esc(lostStage(d))}</b></span>${ret ? `<span class="${retDue ? 'due' : ''}">${ic('cal')}Retomar contato ${ret === today() ? 'hoje' : ret < today() ? 'desde ' + fdate(ret) : 'em ' + fdate(ret)}</span>` : ''}</div>${d.lo.obs ? `<p class="lost-obs">${esc(d.lo.obs)}</p>` : ''}`}
    ${mini ? '' : `<div class="deal-act">${can ? `<button class="btn pri" data-act="dealRetake" data-id="${d.past.id}">${ic('spark')}Retomar negociação</button>` : ''}${tel ? `<a class="btn ok" href="https://wa.me/55${tel}" target="_blank" rel="noopener">${ic('wa')}WhatsApp</a>` : ''}<span class="sp"></span><button class="btn" data-act="dealMeet" data-id="${d.last.id}">${ic('plus')}Reunião</button></div>`}</div>`;
}
function lostForm(d) {
  modal('Cliente não fechou', `<div class="f">
    <p class="note" style="margin:0 0 4px"><b>${esc(d.who)}</b> sai do funil e vai para a lista <b>Não fecharam</b> (Reuniões e Painel). Dá para retomar depois.</p>
    <input type="hidden" name="id" value="${esc(d.last.id)}">
    ${sel('Motivo *', 'motivo', [['', 'Escolha o motivo'], ...LOST_REASONS], '', 'required')}
    ${area('Observação (opcional)', 'obs')}
    ${fld('Retomar contato em (opcional)', 'retorno', '', 'date', `min="${today()}"`)}
    ${d.ms.some(meetUpcoming) ? `<label class="sw"><input type="checkbox" name="cancel_up" checked> Cancelar as reuniões futuras deste cliente</label>` : ''}
    <p class="note" style="margin:0">Com data de retorno, o app cria um follow-up na agenda e avisa no dia.</p></div>`,
    { form: 'saveLost', footer: `<button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn bad">${ic('x')}Confirmar: não fechou</button>` });
}
function lostCard() {
  const ls = lostDeals(); const k = curYM();
  const mes = ls.filter(d => ym(String(d.lostAt).slice(0, 10)) === k);
  const won = allDeals().filter(d => !d.lost && (d.next < 0 || d.outcome === 'fechou') && ym(String((d.p.carteira && d.p.carteira !== true ? d.p.carteira : d.last.date) || '').slice(0, 10)) === k).length;
  const rate = won + mes.length ? Math.round(won / (won + mes.length) * 100) : null;
  const cnt = {}; ls.forEach(d => { const m = d.lo.motivo || 'outro'; cnt[m] = (cnt[m] || 0) + 1; });
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  return `<div class="card" style="margin-top:14px"><h3>${ic('x')}Propostas não fechadas<span class="sp"></span><a class="small" href="#reunioes" data-act="lostGo">ver todas →</a></h3>
    <div class="grid g3" style="grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">
      ${kpi('Não fecharam no mês', `<span style="color:${mes.length ? 'var(--bad)' : 'inherit'}">${mes.length}</span>`, `${ls.length} no total`)}
      ${kpi('Taxa de fechamento', rate === null ? '—' : rate + '%', `${won} fecharam × ${mes.length} não fecharam (mês)`, rate === null ? '' : rate >= 50 ? 'g' : 'y')}
      ${kpi('Motivo mais comum', top ? `<span style="font-size:15px">${esc(lbl(LOST_REASONS, top[0]))}</span>` : '—', top ? `${top[1]} cliente(s)` : 'nenhum ainda')}
    </div>
    <div class="deals">${ls.length ? ls.slice(0, 5).map(d => lostRow(d, isAdmin(), true)).join('') : empty('Nenhum cliente recusou proposta. 💪')}</div></div>`;
}
function pipeCard() {
  const all = deals(); const fin = S.pipeTab === 'fin'; const list = all.filter(d => fin ? d.next < 0 : d.next >= 0);
  const can = isAdmin();
  const row = d => { const nk = d.next >= 0 ? PIPE[d.next][0] : null;
    const open = S.pipeOpen === d.last.id;
    return `<div class="deal ${open ? 'open' : ''}"><div class="deal-h" data-act="pipeOpen" data-id="${d.last.id}" style="cursor:pointer" title="${open ? 'Fechar' : 'Ver'} o passo a passo"><div class="t"><b class="deal-nm">${esc(d.who)}${ic('down', 'i chev')}</b><small>${d.next < 0 ? '<span style="color:var(--ok)">Na carteira</span>' : d.outcome === 'fechou' ? '<span style="color:var(--ok)">Fechou</span>' : d.outcome === 'negociando' ? 'Em negociação' : 'Reunião realizada'} · última reunião ${fdate(d.past.date)}${d.last.ticket ? ' · ticket ' + esc(lbl(TICKETS.map(x => [x[0], x[1]]), d.last.ticket)) : ''}</small>${d.up ? `<small class="deal-up">${ic('cal')}Próxima reunião: ${d.up.date === today() ? 'hoje' : fdate(d.up.date)} às ${esc(d.up.time || '--:--')}</small>` : ''}</div><span class="deal-n">${d.n}/${PIPE.length}</span></div>
    ${open ? `<div class="pipe">${PIPE.map(([k, nm, full], i) => { const ok = d.done[i], au = !d.p[k] && d.auto[k], nx = i === d.next; const dt = d.p[k] && d.p[k] !== true ? fdate(String(d.p[k]).slice(0, 10)) : au ? 'automático' : nx ? 'próximo' : ''; return `<button class="pst ${ok ? 'ok' : ''} ${nx ? 'nx' : ''}" ${can && !au ? `data-act="pipeStep" data-id="${d.last.id}" data-s="${k}"` : 'disabled'} title="${esc(full)}${au ? ' (marcado automaticamente)' : ''}"><i>${ok ? ic('check') : i + 1}</i><b>${nm}</b><small>${dt}</small></button>`; }).join('')}</div>
    <div class="deal-act">${nk && can ? `<button class="btn ${nk === 'carteira' ? 'ok' : 'pri'}" data-act="pipeStep" data-id="${d.last.id}" data-s="${nk}">${ic(nk === 'carteira' ? 'plus' : 'check')}${PIPE_BTN[nk]}</button>` : nk ? `<span class="muted small">Próximo passo: <b style="color:var(--tx)">${esc(PIPE[d.next][2])}</b></span>` : d.cid ? `<button class="btn" data-act="openClient" data-id="${d.cid}">${ic('users')}Ver cliente</button>` : ''}<span class="sp"></span>${can && nk ? `<button class="btn lostbtn" data-act="dealLost" data-id="${d.last.id}">${ic('x')}Não fechou</button>` : ''}<button class="btn" data-act="editMeet" data-id="${d.last.id}">${ic('cal')}Ver reunião</button><button class="btn" data-act="dealMeet" data-id="${d.last.id}">${ic('plus')}Reunião</button></div>` : ''}</div>`; };
  const lost = lostDeals();
  if (S.pipeTab === 'lost') return `<div class="card" style="margin-bottom:14px">${pipeHead(all, lost)}
    ${lost.length ? `<div class="deals">${lost.map(d => lostRow(d, can)).join('')}</div>` : empty('Nenhuma proposta recusada. Quando um cliente não fechar, toque em “Não fechou” no card dele.')}
    <p class="note" style="margin:10px 0 0">Aqui ficam os clientes que receberam a proposta e não fecharam, com o motivo. ${can ? '“Retomar” devolve o cliente para o funil como Em negociação.' : ''}</p></div>`;
  return `<div class="card" style="margin-bottom:14px"><h3 style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">${ic('target')}Andamento pós-reunião <span class="sp"></span>${pipeTabs(all, lost)}</h3>
    ${list.length ? `<div class="deals">${list.map(row).join('')}</div>` : empty(fin ? 'Nenhum cliente entrou na carteira pelo funil ainda.' : 'Assim que uma reunião comercial for realizada, o passo a passo do cliente aparece aqui.')}
    <p class="note" style="margin:10px 0 0">Toque no nome do cliente para abrir o passo a passo. ${can ? 'Use o botão de cada cliente para avançar a etapa. “Colocar na carteira” cadastra o cliente e ele vai para Clientes. Reunião marca sozinha quando a reunião é realizada (e Proposta/Onboarding, se a reunião for desse tipo). Para desmarcar, toque na etapa.' : 'Só o administrador avança as etapas. Você pode marcar novas reuniões em qualquer horário pelo botão “+ Reunião”.'}</p></div>`;
}
/* Cards de Reuniões clicáveis: abre a lista detalhada de cada número */
const MK = { all: 'Reuniões no mês', feito: 'Realizadas', noshow: 'Não compareceu', wait: 'Aguardando resultado', fechou: 'Fecharam', negociando: 'Em negociação', perdido: 'Não fecharam' };
function meetScope() {
  const k = S.meetMonth || curYM(), mine = S.meetWho || '', tk = S.meetTicket || '';
  const ms = meetings().filter(t => (!mine || t.assignee === mine) && (!tk || (tk === 'sem' ? !t.ticket : t.ticket === tk)) && ym(t.date) === k).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  return { k, ms };
}
function meetKpiList(ms, m) {
  return m === 'feito' || m === 'noshow' ? ms.filter(t => t.status === m) : m === 'wait' ? ms.filter(t => t.status === 'pendente' && isLate(t)) : ['fechou', 'negociando', 'perdido'].includes(m) ? ms.filter(t => t.outcome === m) : ms;
}
function meetKpi(m = 'all') {
  const { k, ms } = meetScope(); const list = meetKpiList(ms, m);
  const label = (l => l[0].toUpperCase() + l.slice(1))(new Date(k + '-15T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
  const grp = (arr, key) => arr.map(([kk, nm, cls]) => [nm, list.filter(t => key(t) === kk).length, cls]).filter(x => x[1]);
  const byType = grp(MTYPES, t => t.meet_type || 'comercial');
  const byTicket = [...grp(TICKETS.map(x => [x[0], x[1], 'tk ' + x[2]]), t => t.ticket || ''), ...(list.filter(t => !t.ticket).length ? [['Sem ticket', list.filter(t => !t.ticket).length, '']] : [])];
  const byWho = team().map(p => [p.name.split(' ')[0], list.filter(t => t.assignee === p.id).length]).filter(x => x[1]);
  const byFmt = grp(MFORMATS, t => t.meet_format || 'meet');
  const box = (title, rows) => rows.length ? `<div class="card" style="padding:12px;margin:0"><small class="muted" style="font-weight:600;text-transform:uppercase;letter-spacing:.06em">${title}</small><div class="list" style="margin-top:6px">${rows.map(r => `<div class="li" style="padding:6px 0"><div class="t"><b style="font-weight:500">${r[2] ? `<span class="chip ${r[2]}">${esc(r[0])}</span>` : esc(r[0])}</b></div><b class="num">${r[1]}</b></div>`).join('')}</div></div>` : '';
  const row = t => `<div class="li mrow" data-act="editMeet" data-id="${t.id}" style="cursor:pointer"><div class="mtime"><b>${esc(t.time || '--:--')}</b><small>${WD[new Date(t.date + 'T12:00:00').getDay()]} ${fdate(t.date)}</small></div><div class="t"><b>${esc(meetWho(t))}${t.contact_name && t.company ? ` <span class="muted" style="font-weight:400">· ${esc(t.contact_name)}</span>` : ''}</b><small>${esc(lbl(MTYPES, t.meet_type || 'comercial'))} · ${esc(lbl(MFORMATS, t.meet_format || 'meet'))} · ${esc(firstName(t.assignee))}${outTx(t.outcome)}</small>${t.description ? `<small style="display:block;margin-top:4px;color:var(--tx);opacity:.8;white-space:pre-wrap">${esc(String(t.description).slice(0, 220))}${String(t.description).length > 220 ? '…' : ''}</small>` : ''}</div><div class="mchips">${ticketChip(t)}${meetChip(t)}</div></div>`;
  modal(`${MK[m]} · ${label}`, `<div class="row wrap" style="gap:8px;margin-bottom:12px">${Object.entries(MK).map(([kk, nm]) => { const n = meetKpiList(ms, kk).length; return n || kk === m || kk === 'all' ? `<button type="button" class="btn sm ${kk === m ? 'pri' : ''}" data-act="meetKpi" data-m="${kk}">${nm} <small>${n}</small></button>` : ''; }).join('')}</div>
    ${list.length ? `<div class="grid g2" style="gap:10px;margin-bottom:12px">${box('Assunto (tipo)', byType)}${box('Ticket', byTicket)}${box('Responsável', byWho)}${box('Formato', byFmt)}</div>
    <div class="list">${list.slice().reverse().map(row).join('')}</div>` : empty('Nenhuma reunião aqui neste mês.')}
    <p class="note" style="margin:10px 0 0">Toque numa reunião para abrir, ver as anotações completas e editar. Os filtros de pessoa e ticket da tela de Reuniões valem aqui também.</p>`, { wide: true });
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
  const row = t => `<div class="li mrow"><div class="mtime ${t.date === today() ? 'hj' : ''}" data-act="editMeet" data-id="${t.id}"><b>${esc(t.time || '--:--')}</b><small>${t.date === today() ? 'Hoje' : t.date === iso(new Date(Date.now() + 864e5)) ? 'Amanhã' : WD[new Date(t.date + 'T12:00:00').getDay()] + ' ' + fdate(t.date)}</small></div><div class="t" data-act="editMeet" data-id="${t.id}" style="cursor:pointer"><b>${esc(meetWho(t))}${t.contact_name && t.company ? ` <span class="muted" style="font-weight:400">· ${esc(t.contact_name)}</span>` : ''}</b><small>${esc(lbl(MTYPES, t.meet_type || 'comercial'))} · ${esc(lbl(MFORMATS, t.meet_format || 'meet'))} · ${esc(firstName(t.assignee))}${outTx(t.outcome)}${reschFrom(t).length ? ` · <span class="tx-chg">↻ antes: ${esc(reschFrom(t).slice(-1)[0])}</span>` : ''}</small></div><div class="mchips">${ticketChip(t)}${reschChip(t)}${meetChip(t)}</div></div>`;
  const mkpi = (m, label, val, sub = '', cls = '') => `<div class="kpi go ${cls}" role="button" tabindex="0" title="Ver ${esc(label.toLowerCase())}" data-act="meetKpi" data-m="${m}"><small>${esc(label)}</small><b>${val}</b>${sub ? `<em>${sub}</em>` : ''}<i class="kgo">${ic('right')}</i></div>`;
  return head('Reuniões', 'Bravus Meetings · tudo que você marca com clientes, organizado e contado', `<button class="btn pri" data-act="editMeet">${ic('plus')}Reunião</button>`) + `
    <div class="row wrap" style="gap:10px;margin-bottom:14px"><div class="datebar" style="margin:0"><button class="btn sm ic" data-act="meetMonth" data-m="${shift(-1)}">${ic('left')}</button><b>${label}</b><button class="btn sm ic" data-act="meetMonth" data-m="${shift(1)}">${ic('right')}</button></div><span class="sp"></span>
      <div class="tabs" style="margin:0">${[['', 'Todos'], ...team().map(p => [p.id, p.name.split(' ')[0]])].map(x => `<button data-act="meetWho" data-id="${x[0]}" class="${mine === x[0] ? 'on' : ''}">${esc(x[1])}</button>`).join('')}</div></div>
    <div class="row wrap" style="gap:10px;margin-bottom:14px"><span class="muted small" style="font-weight:600">Ticket</span><div class="tabs tk-tabs" style="margin:0">${(() => { const mm = allWho.filter(t => ym(t.date) === k); return [['', 'Todos', '', mm.length], ...TICKETS.map(x => [x[0], x[1], x[2], mm.filter(t => t.ticket === x[0]).length]), ['sem', 'Sem ticket', '', mm.filter(t => !t.ticket).length]].map(x => `<button data-act="meetTicket" data-id="${x[0]}" class="${x[2]} ${tk === x[0] ? 'on' : ''}">${x[2] ? medal(x[2], 14) : ''}${esc(x[1])} <small>${x[3]}</small></button>`).join(''); })()}</div></div>
    ${pipeCard()}
    ${weekStrip(mine)}
    <div class="grid g4" style="margin-bottom:14px">
      ${mkpi('all', 'Reuniões no mês', ms.length, `${prev} no mês anterior${prev ? ` (${ms.length >= prev ? '+' : ''}${Math.round((ms.length - prev) / prev * 100)}%)` : ''}`, 'hl')}
      ${mkpi('feito', 'Realizadas', `<span style="color:var(--ok)">${real.length}</span>`, `${nos.length} não compareceu${pend.filter(t => ym(t.date) === k).length ? ` · <b style="color:var(--warn,#ffbe50)">${pend.filter(t => ym(t.date) === k).length} aguardando resultado</b>` : ''}`)}
      ${mkpi('noshow', 'Comparecimento', decided ? Math.round(real.length / decided * 100) + '%' : '—', 'realizadas ÷ (realizadas + faltas)')}
      ${mkpi('fechou', 'Fecharam', `<span style="color:var(--ok)">${won.length}</span>`, `${com.length ? Math.round(won.length / com.length * 100) : 0}% das comerciais · ${ms.filter(t => t.outcome === 'negociando').length} em negociação`)}
    </div>
    ${pend.length ? `<div class="card" style="margin-bottom:14px;border-color:rgba(255,190,80,.45)"><h3>${ic('bell')}Já passaram — como foi? (${pend.length})</h3><div class="list">${pend.slice(0, 8).map(t => `<div class="li mrow nm"><div class="t"><b>${esc(meetWho(t))}</b><small>${fdate(t.date)} ${esc(t.time || '')}</small></div><div class="mchips"><button class="btn sm ok" data-act="meetSet" data-id="${t.id}" data-s="feito">${ic('check')}Realizada</button><button class="btn sm" data-act="meetSet" data-id="${t.id}" data-s="noshow">Faltou</button><button class="btn sm" data-act="meetResch" data-id="${t.id}">↻ Remarcar</button></div></div>`).join('')}</div></div>` : ''}
    <div class="grid g2">
      <div class="card"><h3>${ic('cal')}Próximas</h3><div class="list">${next.length ? next.slice(0, 10).map(t => row(t).replace('<div class="mchips">', `<div class="mchips">${t.phone || (client(t.client_id) || {}).whatsapp ? `<button class="btn sm ic" data-act="meetConfirm" data-id="${t.id}" title="Confirmar no WhatsApp">${ic('wa')}</button>` : ''}`)).join('') : empty('Nenhuma reunião marcada. Use “+ Reunião”.')}</div></div>
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
    ${sel('Avisar a equipe no celular', 'remind_min', [[0, 'Na hora'], [10, '10 min antes'], [15, '15 min antes'], [20, '20 min antes'], [30, '30 min antes'], [60, '1 hora antes']], t.remind_min ?? 20)}
    <p class="note" id="meetRule" style="margin:0"></p>
    <div class="f2">${sel('Status', 'status', MSTATUS, t.status || 'pendente')}${sel('Resultado', 'outcome', MOUT, t.outcome || '')}</div>
    <div id="reschBox" class="card" style="display:none;padding:12px;border-color:rgba(255,190,80,.45)"><b style="display:block;margin-bottom:8px">↻ Para quando foi remarcada?</b><div class="f2">${fld('Nova data *', 'new_date', t.date || today(), 'date')}${fld('Novo horário *', 'new_time', t.time || S.set.meetings_start, 'time')}</div><p class="note" style="margin:6px 0 0">A reunião é movida para a nova data e volta para “Agendada”. Ela continua contando <b>uma vez só</b>.</p></div>
    ${area('Anotações', 'description', t.description)}
  </div>`, { form: 'saveMeet', footer: `${t.id ? `<button type="button" class="btn bad" data-act="delTask" data-id="${t.id}">${ic('trash')}</button>${remBtn('reuniao', t.id, meetWho(t))}${t.outcome === 'fechou' && !t.client_id ? `<button type="button" class="btn ok" data-act="meetToClient" data-id="${t.id}">${ic('plus')}Virar cliente</button>` : ''}<span class="sp"></span>` : ''}<button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">Salvar</button>` });
  const fm = $('#modal-root form[data-form="saveMeet"]'); let stTouched = !!t.id;
  const chk = () => { if (!fm) return; const ds = fm.date.value, tm = fm.time.value, r = $('#meetRule'); const passed = ds && tm && (ds < today() || (ds === today() && tm <= nowHM()));
    if (!stTouched && fm.status.value !== 'feito' && passed) fm.status.value = 'feito'; if (!stTouched && !passed && fm.status.value === 'feito') fm.status.value = 'pendente';
    const ok = meetAllowed(ds, tm); const msg = isAdmin() ? (passed && !t.id ? 'Esta reunião já aconteceu: ela entra como Realizada e já conta no painel.' : '') : (ok ? meetRuleMsg(ds) : `Fora do horário permitido. ${meetRuleMsg(ds)}`) + (passed && !t.id && ok ? ' Já aconteceu: entra como Realizada.' : '');
    if (r) { r.textContent = msg; r.style.display = msg ? '' : 'none'; r.style.color = ok ? '' : 'var(--bad,#ff6b7a)'; } };
  const rs = () => { const b = $('#reschBox'); if (!b || !fm) return; const on = fm.status.value === 'remarcada'; b.style.display = on ? '' : 'none'; fm.new_date.required = on; fm.new_time.required = on; };
  if (fm) { fm.status.addEventListener('change', () => { stTouched = true; rs(); }); rs(); fm.date.addEventListener('input', chk); fm.time.addEventListener('input', chk); chk(); }
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
/* v2.7.9: número do botão +N editável (guardado neste aparelho, por rotina) */
const cStepKey = t => 'bw_step_' + (t.template_id || t.id);
const cStep = t => { try { return Math.max(1, +localStorage.getItem(cStepKey(t)) || 5); } catch { return 5; } };
function taskRow(t) {
  const late = isLate(t);
  return `<div class="task ${t.status === 'feito' ? 'done' : ''} ${late ? 'late' : ''}">
    <button class="ck" data-act="toggleTask" data-id="${t.id}" aria-label="Concluir">${t.status === 'feito' ? ic('check') : ''}</button>
    <span class="tm">${esc(t.time || '—')}</span>
    <div class="bd"><div class="tt">${esc(t.title)}</div>${t.description ? `<div class="small muted">${esc(t.description)}</div>` : ''}
      <div class="mt">${t.kind !== 'tarefa' ? `<span class="chip blue">${esc((KINDS.find(k => k[0] === t.kind) || ['', t.kind])[1])}</span>` : ''}${t.priority === 'alta' ? '<span class="chip bad">Alta</span>' : ''}${t.client_id ? `<span class="chip">${esc(cname(t.client_id))}</span>` : ''}${S.agendaWho === 'all' ? `<span class="chip">${esc(firstName(t.assignee))}</span>` : ''}${late ? '<span class="chip st bad">Atrasada</span>' : ''}${t.template_id ? '<span class="chip">Rotina</span>' : ''}</div>
      ${t.goal ? `<div class="cnt"><button class="btn sm ic" data-act="cnt" data-id="${t.id}" data-v="-1">−</button><b>${t.count || 0} / ${t.goal}</b><button class="btn sm ic" data-act="cnt" data-id="${t.id}" data-v="1">+</button><span class="cadd"><button class="btn sm" data-act="cntStep" data-id="${t.id}" aria-label="Somar a quantidade ao lado">+</button><input type="number" inputmode="numeric" class="cstep" min="1" max="9999" value="${cStep(t)}" data-cstep="${t.id}" aria-label="Quantidade a somar"></span><input type="range" class="cslide sp" min="0" max="${Math.max(t.goal, t.count || 0)}" step="1" value="${t.count || 0}" data-cslide="${t.id}" aria-label="Arraste para marcar a quantidade" style="--p:${Math.min(100, (t.count || 0) / Math.max(t.goal, t.count || 0) * 100)}%"></div>` : ''}
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
    ${!template ? `<p class="note">Regra: ligações a partir das ${S.set.calls_start}. Reuniões: qualquer horário, qualquer dia.</p>` : ''}
  </div>`, { form: 'saveTask', footer: `${t.id ? `<button type="button" class="btn bad" data-act="delTask" data-id="${t.id}">${ic('trash')}</button>${template ? '' : remBtn('tarefa', t.id, t.title)}${!template && t.date ? `<button type="button" class="btn" data-act="taskCal" data-id="${t.id}" title="Adicionar ao calendário">${ic('cal')}<span class="hide-m">Calendário</span></button>` : ''}<span class="sp"></span>` : ''}<button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">Salvar</button>` });
}

