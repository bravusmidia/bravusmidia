/* =====================================================================
   FORMULÁRIOS
   ===================================================================== */
const num = v => v === '' || v == null ? null : Number(v);
const F = {
  rpSave: async v => { if (!isAdmin()) return toast('Só o administrador agenda reprospecção', '', 'warn'); if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date || '')) return modalAlert('Escolha a data', '', 'warn'); closeModal(); await setReprospect(v.id, v.k, v.date, (v.obs || '').trim()); },
  saveLost: async v => {
    if (!isAdmin()) return toast('Só o administrador marca que o cliente não fechou', '', 'warn');
    if (!v.motivo) return toast('Escolha o motivo', 'Ajuda a entender por que os clientes não fecham.', 'bad');
    const deal = deals().find(x => x.last.id === v.id); if (!deal) { closeModal(); return toast('Cliente não encontrado no funil', '', 'bad'); }
    const m = deal.past, why = lbl(LOST_REASONS, v.motivo), obs = (v.obs || '').trim().slice(0, 500);
    const info = { at: new Date().toISOString(), motivo: v.motivo, obs: obs || null, retorno: v.retorno || null, by: S.me.id, etapa: lostStage(deal) };
    await putPipe(m, { ...pipeOf(m), perdido: info });
    await store.update('tasks', m.id, { outcome: 'perdido', ...(m.status === 'pendente' && !meetUpcoming(m) ? { status: 'feito', done_at: m.done_at || new Date().toISOString() } : {}) });
    if (v.cancel_up) for (const t of deal.ms.filter(meetUpcoming)) await store.update('tasks', t.id, { status: 'cancelada' });
    if (v.retorno) await store.insert('tasks', { title: `Retomar contato: ${deal.who}`, kind: 'followup', date: v.retorno, time: S.set.calls_start || '12:00', assignee: S.me.id, client_id: deal.cid || null, priority: 'media', remind_min: 20, description: `Não fechou: ${why}${obs ? ' — ' + obs : ''}`, status: 'pendente', count: 0, is_template: false });
    await log(`${deal.who} não fechou a proposta (${why.toLowerCase()})`, deal.cid);
    await notifyTeam(`${deal.who} não fechou`, `Motivo: ${why}${v.retorno ? ' · retomar em ' + fdate(v.retorno) : ''} · por ${firstName(S.me.id)}`, 'info', `lost:${m.id}`, 'reunioes');
    closeModal(); S.pipeTab = 'lost'; toast('Movido para “Não fecharam”', `${deal.who} · ${why}`, 'ok'); await refresh();
  },
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
    if (!v.id && v.deal && saved && saved.id) { await linkDeal(v.deal, saved.id); closeModal(); await refresh(); S.cliFilter = 'online'; location.hash = 'clientes'; renderView(); return toast(`${row.name} entrou na carteira 🎉`, 'Funil concluído. O cliente já está na lista de Clientes.', 'ok'); }
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
  clientNote: async v => { if (!v.text.trim()) return; await log(`Anotação em ${cname(v.id)}: ${v.text.trim()}`.slice(0, 300), v.id); await refresh(); clientDetail(v.id); },

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
    let resch = '';
    if (v.status === 'remarcada') {
      if (!v.new_date || !v.new_time) return toast('Informe a nova data e o novo horário', '', 'bad');
      const fromD = old.date || v.date, fromT = old.time || v.time;
      if (v.new_date === fromD && v.new_time === fromT) return toast('A nova data/horário é igual à atual', 'Escolha outro dia ou horário para remarcar.', 'bad');
      resch = `${fdate(fromD)} ${fromT}`;
      v.description = `${(v.description || '').trim()}${(v.description || '').trim() ? '\n' : ''}${RESCH}${resch} → ${fdate(v.new_date)} ${v.new_time}`;
      v.date = v.new_date; v.time = v.new_time; v.status = 'pendente';
    }
    if (!isAdmin() && (!v.id || old.date !== v.date || old.time !== v.time) && !meetAllowed(v.date, v.time)) return toast('Horário fora da regra', meetRuleMsg(v.date), 'bad');
    const row = { title: `Reunião · ${who}`, kind: 'reuniao', date: v.date, time: v.time, assignee: v.assignee || S.me.id, client_id: v.client_id || null, description: v.description, priority: 'alta', remind_min: num(v.remind_min) ?? 20,
      contact_name: (v.contact_name || '').trim() || null, company: (v.company || '').trim() || null, phone: (v.phone || '').trim() || null, meet_type: v.meet_type, meet_format: v.meet_format, ticket: v.ticket || null };
    row.status = v.status || 'pendente'; row.outcome = v.outcome || null; row.done_at = row.status === 'feito' ? old.done_at || new Date().toISOString() : null;
    const extra = ['contact_name', 'company', 'phone', 'meet_type', 'meet_format', 'outcome', 'ticket'];
    const save = r => v.id ? store.update('tasks', v.id, r) : store.insert('tasks', { status: 'pendente', ...r, count: 0, is_template: false });
    try { await save(row); } catch (e) { const m = e && e.message || ''; if (/ticket/i.test(m)) { delete row.ticket; await save(row); toast('Reunião salva sem o ticket', 'Falta rodar o SQL v2.2 (ticket) no Supabase.', 'warn'); } else { if (!/column|contact_name|company|meet_|outcome|phone/i.test(m)) throw e; extra.forEach(x => delete row[x]); await save(row); toast('Reunião salva sem os detalhes', 'O banco ainda não tem os campos de reunião (SQL v1.4).', 'warn'); } }
    const st = row.status || 'pendente';
    if (resch) { await log(`Remarcou reunião com ${who}: ${resch} → ${fdate(v.date)} ${v.time}`, row.client_id); await notifyTeam(`Reunião remarcada com ${who}`, `De ${resch} para ${fdate(v.date)} às ${v.time} · por ${firstName(S.me.id)}`, 'tarefa', `resch:${v.id || who}:${v.date}${v.time}`, 'reunioes'); closeModal(); toast('Reunião remarcada', `${who} · ${fdate(v.date)} às ${v.time}`, 'ok'); return refresh(); }
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
  saveRem: async (v, fd) => {
    const title = (v.title || '').trim(); if (!title) return toast('Escreva o que lembrar', '', 'bad');
    const at = new Date(`${v.date}T${v.time}:00`); if (isNaN(at)) return toast('Data ou horário inválido', '', 'bad');
    if (at.getTime() < Date.now() - 60e3) return toast('Esse horário já passou', 'Escolha um horário no futuro.', 'warn');
    const users = fd.getAll('users'); if (!users.length) return toast('Escolha quem vai receber o aviso', '', 'bad');
    const t = REM_TYPES[v.item_type] ? v.item_type : 'avulso';
    try { await store.insert('reminders', { item_type: t, item_id: v.item_id || null, title, body: (v.body || '').trim() || null, route: REM_TYPES[t][1], remind_at: at.toISOString(), users, created_by: S.me.id, sent: false }); }
    catch (e) { return toast('Não foi possível salvar o lembrete', /reminders|relation|schema/i.test(e.message) ? 'Falta rodar o SQL v2.9 (notificações) no Supabase.' : e.message, 'bad'); }
    await log(`Criou lembrete: ${title} · ${fdate(v.date)} ${v.time}`);
    const others = users.filter(u => u !== S.me.id);
    if (others.length) await notifyUsers(others, `${firstName(S.me.id)} marcou um lembrete para você`, `${title} · ${fdate(v.date)} às ${v.time}`, 'tarefa', null, 'alertas');
    closeModal(); toast('Lembrete salvo', `${fdate(v.date)} às ${v.time} · avisa ${users.map(firstName).join(' e ')}`, 'ok'); await refresh();
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
    await notifyUsers(team().filter(p => p.id !== S.me.id).map(p => p.id), `💬 Mensagem de ${firstName(S.me.id)}`, text.slice(0, 120), 'chat', null, 'chat');
    await loadAll('messages'); renderChat(true); $('#chatInput') && $('#chatInput').focus();
  },
  sendNote: async (v, fd, form) => {
    const text = (v.text || '').trim(); if (!text) return;
    form.text.value = '';
    try { await store.insert('messages', { user_id: S.me.id, text, pinned: true }); } catch (e) { return toast('Anotações ainda não ativadas no banco', 'Falta rodar o SQL v2.0 no Supabase.', 'warn'); }
    await notifyTeam(`${firstName(S.me.id)} fez uma anotação`, text.slice(0, 120), 'chat', null, 'chat');
    await loadAll('messages'); renderChat(true);
  },

  availSave: async v => {
    const op = v.op, ds = v.d, t = (v.t || '').trim(), why = (v.why || '').trim(), obs = (v.obs || '').trim();
    if (!/^\d{2}:\d{2}$/.test(t)) return modalAlert('Escolha o horário', '', 'warn');
    if (!why) return modalAlert('Escolha o motivo', 'Toda alteração de horário precisa de justificativa.', 'warn');
    if (why === 'Outro motivo' && obs.length < 3) return modalAlert('Explique o motivo', 'Em “Outro motivo”, escreva uma observação.', 'warn');
    if (op === 'open') {
      if (daySlots(ds).some(x => x.time === t && !x.closed)) return modalAlert('Esse horário já existe', `${t} já está na grade de ${fdate(ds)}.`, 'warn');
      const hit = meetings().find(x => x.date === ds && x.time === t && busyMeet(x)); if (hit) return modalAlert('Horário ocupado', `Já tem reunião às ${t} (${meetWho(hit)}).`, 'warn');
    }
    closeModal(); await availChange(op, ds, t, why, obs);
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

