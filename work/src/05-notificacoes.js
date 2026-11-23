/* =====================================================================
   NOTIFICAÇÕES (Bravus Notify)
   ===================================================================== */
async function notifyUsers(ids, title, body, type = 'info', key = null, route = null) {
  for (const u of [...new Set(ids)].filter(Boolean)) {
    try { await store.insertUnique('notifications', { user_id: u, title, body, type, key: key || uid(), route, read: false }); } catch (e) { console.warn(e.message); }
  }
}
/* v2.9.0: inscreve o aparelho no push do servidor (chega no celular mesmo com o app fechado) */
async function pushSubscribe(loud = false) {
  if (!SUPA || !('PushManager' in window) || !('serviceWorker' in navigator) || !('Notification' in window) || Notification.permission !== 'granted') return false;
  try {
    /* a chave pública vem do servidor (gerada lá, a privada nunca sai de lá) */
    const pub = CFG.VAPID_PUBLIC_KEY || S.vapid || (S.vapid = (await sb.rpc('bw_vapid_public')).data || '');
    if (!pub) { if (loud) toast('Push do servidor ainda não configurado', 'Falta rodar o SQL v2.9 e publicar a função send-push.', 'warn'); return false; }
    const reg = await navigator.serviceWorker.ready;
    const key = Uint8Array.from(atob(pub.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - pub.length % 4) % 4)), c => c.charCodeAt(0));
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    const { error } = await sb.from('push_subs').upsert({ user_id: S.me.id, endpoint: sub.endpoint, subscription: sub.toJSON() }, { onConflict: 'endpoint' });
    if (error) throw error; S.pushOk = true; return true;
  } catch (e) { console.warn('push', e.message || e); if (loud) toast('Push do servidor não ativou', e.message || '', 'warn'); return false; }
}

/* v2.9.0: LEMBRETES em qualquer item (cliente, reunião, tarefa, cobrança, conteúdo ou avulso) */
const REM_TYPES = { cliente: ['Cliente', 'clientes'], reuniao: ['Reunião', 'reunioes'], tarefa: ['Tarefa', 'agenda'], cobranca: ['Cobrança', 'financeiro'], conteudo: ['Conteúdo', 'conteudo'], avulso: ['Lembrete', 'alertas'] };
const remAt = r => new Date(r.remind_at);
const pendingRems = () => (S.d.reminders || []).filter(r => !r.sent && ((r.users || []).includes(S.me.id) || r.created_by === S.me.id)).sort((a, b) => a.remind_at.localeCompare(b.remind_at));
const itemRems = (type, id) => (S.d.reminders || []).filter(r => r.item_type === type && r.item_id === id && !r.sent);
const remBtn = (type, id, title) => id ? `<button type="button" class="btn" data-act="newRem" data-t="${type}" data-id="${esc(id)}" data-title="${esc(title || '')}" title="Criar lembrete para este item">${ic('bell')}<span class="hide-m">Lembrete${itemRems(type, id).length ? ` (${itemRems(type, id).length})` : ''}</span></button>` : '';
function reminderForm(o = {}) {
  const now = new Date(Date.now() + 60 * 6e4); const dt = o.date || iso(now), tm = o.time || `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const others = team().filter(p => p.id !== S.me.id);
  modal('Novo lembrete', `<div class="f">
    <input type="hidden" name="item_type" value="${esc(o.t || 'avulso')}"><input type="hidden" name="item_id" value="${esc(o.id || '')}">
    ${o.id ? `<p class="note" style="margin:0">${ic('bell')} ${esc((REM_TYPES[o.t] || REM_TYPES.avulso)[0])}: <b>${esc(o.title || '')}</b></p>` : ''}
    ${fld('O que lembrar *', 'title', o.id ? o.title : '', 'text', 'required maxlength="160" placeholder="ex.: Ligar para confirmar a proposta"')}
    <div class="f2">${fld('Data *', 'date', dt, 'date', 'required')}${fld('Horário *', 'time', tm, 'time', 'required')}</div>
    <label class="fl">Avisar no celular de<div class="cks"><label><input type="checkbox" name="users" value="${S.me.id}" checked>Eu (${esc(firstName(S.me.id))})</label>${others.map(p => `<label><input type="checkbox" name="users" value="${p.id}" checked>${esc(firstName(p.id))}</label>`).join('')}</div></label>
    ${area('Observação (opcional)', 'body', '')}
    ${(() => { const ex = o.id ? itemRems(o.t, o.id) : []; return ex.length ? `<div class="sec" style="margin:4px 0 0">Lembretes já marcados neste item</div><div class="list">${ex.map(remRow).join('')}</div>` : ''; })()}
  </div>`, { form: 'saveRem', footer: `<button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">${ic('bell')}Salvar lembrete</button>` });
}
const remRow = r => `<div class="li"><i class="dot warn"></i><div class="t"><b>${esc(r.title)}</b><small>${fdate(iso(remAt(r)))} às ${ftime(r.remind_at)} · ${esc((REM_TYPES[r.item_type] || REM_TYPES.avulso)[0])} · avisa ${esc((r.users || []).map(firstName).join(' e '))}</small></div>${r.created_by === S.me.id || isAdmin() ? `<button type="button" class="btn sm ic bad" data-act="delRem" data-id="${r.id}" aria-label="Apagar lembrete">${ic('trash')}</button>` : ''}</div>`;
async function remindersTick() {
  const now = Date.now();
  for (const r of (S.d.reminders || []).filter(r => !r.sent)) {
    const at = remAt(r).getTime(); if (!(at <= now)) continue;
    if (now - at < 6 * 3600e3) await notifyUsers(r.users || [], `🔔 ${r.title}`, `${r.body ? r.body + ' · ' : ''}Lembrete das ${ftime(r.remind_at)}${r.created_by && r.created_by !== S.me.id ? ' · criado por ' + firstName(r.created_by) : ''}`, 'tarefa', `rem:${r.id}`, (REM_TYPES[r.item_type] || REM_TYPES.avulso)[1]);
    r.sent = true; try { await store.update('reminders', r.id, { sent: true }); } catch {}
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
    /* v2.8.3: lembretes dos compromissos de toda a equipe (reuniões e tarefas com horário marcadas por alguém, não as da rotina automática) */
    const others = realTasks().filter(t => t.date === d && t.assignee && t.assignee !== me.id && (t.kind === 'reuniao' || !t.template_id));
    if (nf.tarefas !== false) for (const t of [...mineToday, ...others]) {
      if (['feito', 'cancelada', 'remarcada', 'noshow'].includes(t.status) || !t.time) continue;
      const [h, m] = t.time.split(':').map(Number); const at = new Date(); at.setHours(h, m - (t.remind_min ?? 10), 0, 0);
      const diff = (Date.now() - at) / 6e4;
      if (diff >= 0 && diff < 15) {
        const mine = t.assignee === me.id, who = firstName(t.assignee);
        const rm = t.remind_min ?? 10, inTxt = rm ? ` (em ${rm >= 60 ? rm / 60 + ' h' : rm + ' min'})` : '';
        const title = t.kind === 'reuniao' ? (mine ? `📅 Você tem reunião às ${t.time}${inTxt}` : `📅 Reunião de ${who} às ${t.time}${inTxt}`) : t.kind === 'ligacao' ? (mine ? `${firstName(me.id)}, chegou o horário das ligações` : `Ligações de ${who} às ${t.time}`) : mine ? `Lembrete das ${t.time}` : `Compromisso de ${who} às ${t.time}`;
        await notifyUsers([me.id], title, t.kind === 'reuniao' ? meetWho(t) : t.title, 'tarefa', `task:${t.id}${t.date}${t.time}`, t.kind === 'reuniao' ? 'reunioes' : 'agenda');
      }
    }
    await remindersTick();
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

