/* =====================================================================
   AÇÕES (cliques)
   ===================================================================== */
const A = {
  closeModal, reload: () => location.reload(), logout: () => logout(),
  pin: d => { if (!SUPA && !AUTH.user) return toast('Escolha seu usuário primeiro', '', 'warn'); if (AUTH.pin.length < 6) { AUTH.pin += d.n; renderAuth(); if (AUTH.pin.length === 6) setTimeout(tryLogin, 80); } },
  pinBack: () => { AUTH.pin = AUTH.pin.slice(0, -1); renderAuth(); }, pinClear: () => { AUTH.pin = ''; renderAuth(); },
  authPick: d => { AUTH.user = d.id; AUTH.pin = ''; renderAuth(); },
  authChangeEmail: () => { AUTH.stage = 'email'; AUTH.pin = ''; renderAuth(); },
  moreMenu: () => modal('Menu', `<div class="list">${NAV.filter(navOk).map(n => `<a class="li" href="${n[4] || '#' + n[0]}" ${n[4] ? 'target="_blank" rel="noopener"' : ''} data-act="closeModal">${ic(n[2])}<div class="t"><b>${n[1]}</b></div>${n[0] === 'alertas' && unread() ? `<span class="badge">${unread()}</span>` : ''}</a>`).join('')}<button class="li" data-act="logout" style="width:100%">${ic('lock')}<div class="t" style="text-align:left"><b>Bloquear / sair</b></div></button></div>`),
  cliFilter: d => { S.cliFilter = d.f; renderView(); },
  cliTier: d => { S.cliTier = d.f; renderView(); },
  setTier: async d => {
    if (!isAdmin()) return toast('Só o administrador muda o ticket', '', 'warn');
    const c = client(d.id); if (!c) return;
    try { await store.update('clients', c.id, { tier: d.t || null }); } catch (e) { return toast('Não foi possível salvar o ticket', /tier/i.test(e.message || '') ? 'Falta rodar o SQL v2.4 (ticket) no Supabase.' : e.message, 'bad'); }
    c.tier = d.t || null; await log(d.t ? `Ticket de ${c.name}: ${tierName(d.t)}` : `Ticket de ${c.name} voltou para automático (${tierName(autoTier(c.contract_value))})`, c.id);
    toast('Ticket atualizado', `${c.name} · ${tierName(clientTier(c))}`, 'ok'); await refresh(); clientDetail(c.id);
  },
  newMember: () => { if (!isAdmin()) return;
    const sug = 'bravus' + Math.floor(1000 + Math.random() * 9000);
    modal('Adicionar membro à equipe', `<div class="f">
      <div class="f2">${fld('Nome *', 'name', '', 'text', 'required maxlength="80" placeholder="ex.: Teste Bravus"')}${fld('E-mail de acesso *', 'email', '', 'email', 'required autocomplete="off" placeholder="nome@email.com"')}</div>
      <div class="f2"><label class="fl">Senha *<div class="row" style="gap:6px"><input name="pin" id="nmPin" value="${sug}" minlength="6" required autocomplete="off" style="flex:1"><button type="button" class="btn sm" data-act="genPin">Gerar</button></div></label>${fld('Cargo', 'title', '', 'text', 'maxlength="60" list="cargos" placeholder="ex.: Social media"')}<datalist id="cargos">${CARGOS.map(c => `<option value="${esc(c)}">`).join('')}</datalist></div>
      ${sel('Acesso', 'role', [['comercial', 'Membro — vê tudo e adiciona reuniões (qualquer horário)'], ['admin', 'Administrador — pode alterar tudo']], 'comercial')}
      <p class="note">O e-mail pode ser inventado para teste (ex.: teste@bravusmidia.com.br): o acesso já sai liberado, sem confirmação por e-mail. Depois de criar, eu mostro o acesso pronto para copiar ou mandar no WhatsApp.</p></div>`,
      { form: 'saveMember', footer: `<button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">Criar membro</button>` }); },
  genPin: () => { const el = $('#nmPin'); if (el) el.value = 'bravus' + Math.floor(1000 + Math.random() * 9000); },
  removeMember: d => { const p = prof(d.id); if (!p || !isAdmin() || p.id === S.me.id) return;
    confirmBox(`Tem certeza que quer excluir ${esc(p.name)}?`, `O acesso de <b>${esc(p.email || p.name)}</b> é apagado. Clientes e conteúdos dele(a) passam para você; tarefas, mensagens e histórico dele(a) são apagados. Não dá para desfazer.`, `Sim, excluir ${esc(firstName(p.id) || p.name)}`, async () => {
      const { error } = await sb.rpc('admin_remove_member', { target: p.id }); if (error) return toast('Não foi possível remover', error.message, 'bad');
      await log(`Removeu ${p.name} da equipe`); toast('Membro removido', p.name, 'ok'); await refresh(); renderView(); }, true); },
  copyAccess: d => { navigator.clipboard && navigator.clipboard.writeText(d.txt).then(() => toast('Acesso copiado', '', 'ok')); },
  chatToggle: () => { CW.open = !CW.open; lsSet('bw_cw_open', CW.open); renderChat(true); if (CW.open && innerWidth > 860) setTimeout(() => $('#chatInput') && $('#chatInput').focus(), 50); },
  cwTab: d => { CW.tab = d.t; renderChat(true); },
  msgPin: async d => { const m = S.d.messages.find(x => x.id === d.id); if (!m) return; try { await store.update('messages', m.id, { pinned: !m.pinned }); } catch (e) { return toast('Anotações ainda não ativadas no banco', 'Falta rodar o SQL v2.0 no Supabase.', 'warn'); } if (!m.pinned) toast('Guardado nas anotações', '', 'ok'); await loadAll('messages'); renderChat(); },
  msgDel: d => confirmBox('Tem certeza que quer apagar esta anotação?', 'Ela some para todos. Não dá para desfazer.', 'Sim, apagar', async () => { await store.remove('messages', d.id); await loadAll('messages'); renderChat(true); }, true),
  releaseOk: () => { lsSet('bw_version_seen', RELEASE.version); closeModal(); },
  updateNow: async () => { try { const r = await navigator.serviceWorker?.getRegistration(); await r?.update(); } catch {} location.reload(); },
  setRole: d => { const p = prof(d.id); if (!p || !isAdmin() || p.id === S.me.id) return; const toAdmin = p.role !== 'admin'; const nm = p.name.split(' ')[0];
    confirmBox(toAdmin ? `Dar acesso de administrador a ${nm}?` : `Tirar o acesso de administrador de ${nm}?`, toAdmin ? `${esc(nm)} vai poder <b>cadastrar, editar, ativar e desativar clientes</b>, marcar pagamentos, ver o financeiro, mexer em Ajustes e alterar senhas da equipe — igual a você.` : `${esc(nm)} volta a ser membro: vê os clientes, mas não altera cadastro, status nem pagamentos.`, toAdmin ? 'Dar admin' : 'Tirar admin', async () => {
      await store.update('profiles', p.id, { role: toAdmin ? 'admin' : 'comercial' }); await log(`${toAdmin ? 'Deu' : 'Tirou'} acesso de administrador ${toAdmin ? 'para' : 'de'} ${p.name}`);
      await notifyUsers([p.id], toAdmin ? 'Você agora é administrador' : 'Seu acesso mudou para membro', `Alterado por ${firstName(S.me.id)}`, 'tarefa', null, 'painel');
      toast('Acesso atualizado', `${nm}: ${toAdmin ? 'administrador' : 'membro'}`, 'ok'); await refresh(); renderView(); }, !toAdmin); },
  adminPw: d => { const p = prof(d.id); if (!p || !isAdmin()) return;
    modal(`Alterar senha · ${p.name.split(' ')[0]}`, `<div class="f"><input type="hidden" name="id" value="${p.id}">
      ${fld('Nova senha (mín. 6 caracteres)', 'pin', '', 'password', 'minlength="6" required autocomplete="new-password"')}${fld('Repita a nova senha', 'pin2', '', 'password', 'minlength="6" required autocomplete="new-password"')}
      <p class="note">A senha antiga para de funcionar na hora. Passe a nova para ${esc(p.name.split(' ')[0])} pessoalmente ou por mensagem, e peça para trocar depois em Equipe → Trocar senha.</p></div>`,
      { form: 'adminPwSave', footer: `<button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">Salvar senha</button>` }); },
  resetPw: d => { const p = prof(d.id); if (!p) return; if (!p.email) return toast('Este membro não tem e-mail no perfil', 'Confira em Authentication → Users no Supabase.', 'warn');
    confirmBox('Redefinir senha', `Vou mandar para <b>${esc(p.email)}</b> um link para <b>${esc(p.name.split(' ')[0])}</b> criar uma senha nova. A senha atual continua valendo até ela criar a nova.`, 'Enviar link', async () => {
      try { await sendReset(p.email); await log(`Enviou link de redefinição de senha para ${p.name}`); toast('Link enviado', `${p.email} · peça para olhar também o spam.`, 'ok'); } catch (e) { toast('Não foi possível enviar', e.message, 'bad'); } }); },
  forgotPw: async () => { if (!AUTH.email) return; try { await sendReset(AUTH.email); toast('Enviamos um link para o seu e-mail', `${AUTH.email} · confira também o spam.`, 'ok'); } catch (e) { toast('Não foi possível enviar', e.message, 'bad'); } },
  recoveryBack: async () => { await sb.auth.signOut(); renderAuth(); },
  editGoals: () => goalsForm(), goalMonth: d => { S.goalMonth = d.m; renderView(); },
  payMenu: d => {
    const c = client(d.id); if (!c) return; const k = curYM(); const inv = monthInv(c, k); const late = S.d.invoices.filter(i => i.client_id === c.id && ym(i.due_date) < k && invStatus(i) === 'atrasado');
    const B = (id, st, cur) => `<div class="row" style="gap:6px">${[['pago', 'Pago', 'ok'], ['areceber', 'A receber', 'warn'], ['atrasado', 'Em atraso', 'bad']].map(o => `<button type="button" class="btn sm ${cur === (o[0] === 'areceber' ? 'pendente' : o[0]) ? o[2] : ''}" data-act="invSet" data-id="${id}" data-s="${o[0]}" data-client="${c.id}">${o[1]}</button>`).join('')}</div>`;
    const line = i => `<div class="li"><div class="t"><b>${brl(i.amount)} · <span class="due-y">vence ${fdate(i.due_date)}</span></b><small>${esc(invDesc(i))}</small></div>${B(i.id, null, invStatus(i))}</div>`;
    modal(`Pagamento · ${c.name}`, `
      <div class="sec" style="margin-top:0">${esc(monthName(k))}/${k.slice(0, 4)}</div>
      ${inv.length ? `<div class="list">${inv.map(line).join('')}</div>` : (+c.contract_value > 0 ? `<p class="small muted" style="margin-bottom:10px">Ainda não tem cobrança deste mês. Escolha o status e eu crio a mensalidade${isSplit(c) ? ' (2 parcelas)' : ''} de ${brl(c.contract_value)}:</p><div class="li"><div class="t"><b>${brl(c.contract_value)}</b><small>vence ${esc(dueTxt(c))}</small></div>${B('new', null, '')}</div>` : `<p class="note">Este cliente está sem valor de contrato. Edite o cliente e informe o valor mensal.</p>`)}
      ${late.length ? `<div class="sec">Meses anteriores em atraso</div><div class="list">${late.map(line).join('')}</div>` : ''}
      <p class="note" style="margin-top:12px">Pago entra em “Entrou no mês” do painel na data de hoje. A receber vira Em atraso sozinho quando passa do vencimento sem pagamento.</p>`,
      { footer: `<button type="button" class="btn" data-act="openClient" data-id="${c.id}">Ver cliente</button><span class="sp"></span><button type="button" class="btn" data-act="closeModal">Fechar</button>` });
  },
  invMenu: d => { const i = S.d.invoices.find(x => x.id === d.id); if (i) A.payMenu({ id: i.client_id }); },
  invSet: async d => {
    const c = client(d.client); if (!c) return; const st = d.s; const nm = { pago: 'pago', areceber: 'a receber', atrasado: 'em atraso' }[st];
    const patch = st === 'pago' ? { status: 'pago', paid_at: today(), method: 'Manual', confirmed_by: S.me.name } : { status: st, paid_at: null };
    const fail = e => /check|constraint|status/i.test(e && e.message || '');
    try {
      if (d.id === 'new') {
        const k = curYM(); const [y, m] = k.split('-').map(Number); const last = new Date(y, m, 0).getDate(); const ps = parts(c);
        for (let j = 0; j < ps.length; j++) await store.insert('invoices', { client_id: c.id, amount: ps[j][1], due_date: `${k}-${pad(Math.min(ps[j][0], last))}`, description: `Mensalidade ${monthName(k)}/${y}${ps.length > 1 ? ` (${j + 1}/2)` : ''}`, ...patch });
      } else await store.update('invoices', d.id, patch);
    } catch (e) { if (fail(e)) return toast('O banco ainda não aceita esse status', 'Rode o SQL v1.7 no Supabase.', 'warn'); throw e; }
    await log(`Marcou ${c.name} como ${nm}`, c.id);
    await notifyTeam(st === 'pago' ? `Pagamento recebido: ${c.name} 💰` : st === 'atrasado' ? `${c.name} está em atraso` : `${c.name}: mensalidade a receber`, `Marcado por ${firstName(S.me.id)}`, st === 'pago' ? 'pago' : st === 'atrasado' ? 'alerta' : 'financeiro', null, 'financeiro');
    toast(`${c.name}: ${nm}`, 'Painel e financeiro atualizados.', 'ok'); await refresh(); renderView(); A.payMenu({ id: c.id });
  },
  pickReason: (d, el) => { const f = el.closest('form'); if (!f) return; f.end_reason.value = d.v; f.querySelectorAll('[data-act="pickReason"]').forEach(b => b.classList.toggle('blue', b === el)); },
  reasonsReset: () => { const t = $('form[data-form="saveReasons"] textarea[name="list"]'); if (t) t.value = DEFAULT_SETTINGS.exit_reasons.join('\n'); toast('Lista padrão restaurada', 'Clique em salvar para gravar.'); },
  meetKpi: d => meetKpi(d.m || 'all'),
  editMeet: d => meetForm(d.id ? S.d.tasks.find(t => t.id === d.id) : (d.client ? { client_id: d.client, meet_type: 'alinhamento' } : {})),
  meetMonth: d => { S.meetMonth = d.m; renderView(); }, meetDay: d => { S.meetDay = d.d; renderView(); }, weekToggle: () => { S.weekOpen = !S.weekOpen; lsSet('bw_week_open', S.weekOpen); renderView(); }, pipeTab: d => { S.pipeTab = d.id; S.pipeOpen = null; renderView(); }, pipeOpen: d => { S.pipeOpen = S.pipeOpen === d.id ? null : d.id; renderView(); },
  pipeStep: async d => { if (!isAdmin()) return toast('Só o administrador avança as etapas', '', 'warn');
    const deal = deals().find(x => x.last.id === d.id); if (!deal) return; const k = d.s, t = deal.last, full = PIPE.find(x => x[0] === k)[2];
    if (deal.auto[k] && !deal.p[k]) return toast(`${full}: marcado automaticamente`, k === 'carteira' ? 'Para tirar, desative o cliente em Clientes.' : 'Vem da reunião realizada. Para desfazer, mude o status da reunião.', 'warn');
    const on = !deal.p[k];
    if (!on && !d.ok) return confirmBox(`Desmarcar “${full}”?`, `${esc(deal.who)} volta para esta etapa do funil.`, 'Desmarcar', () => A.pipeStep({ ...d, ok: 1 }), true);
    if (on && k === 'carteira') return pipeToWallet(deal);
    if (on && k === 'reuniao') { const m = deal.ms.slice().reverse().find(x => x.status === 'pendente'); if (m) await store.update('tasks', m.id, { status: 'feito', done_at: new Date().toISOString() }); }
    await setPipe(deal, k, on);
    if (on) { await log(`${deal.who}: ${full.toLowerCase()}`, deal.cid); await notifyTeam(`${full}: ${deal.who} ✅`, `Funil ${deal.n + 1}/${PIPE.length} · marcado por ${firstName(S.me.id)}`, 'tarefa', `pipe:${t.id}:${k}`, 'reunioes'); }
    else await log(`${deal.who}: desmarcou ${full.toLowerCase()}`, deal.cid);
    toast(on ? `${full} ✓` : `${full} desmarcado`, deal.who, on ? 'ok' : ''); await refresh(); },
  dealLost: d => { if (!isAdmin()) return toast('Só o administrador marca que o cliente não fechou', '', 'warn');
    const deal = deals().find(x => x.last.id === d.id); if (deal) lostForm(deal); },
  dealRetake: async d => { if (!isAdmin()) return toast('Só o administrador retoma a negociação', '', 'warn');
    const deal = lostDeals().find(x => x.ms.some(m => m.id === d.id)); if (!deal) return;
    if (!d.ok) return confirmBox(`Retomar negociação com ${esc(deal.who)}?`, 'O cliente volta para o funil como “Em negociação”, na etapa em que parou.', 'Retomar', () => A.dealRetake({ ...d, ok: 1 }));
    for (const m of deal.ms) { const q = pipeOf(m); if (q.perdido) { delete q.perdido; await putPipe(m, q); } if (m.outcome === 'perdido') await store.update('tasks', m.id, { outcome: 'negociando' }); }
    await log(`Retomou a negociação com ${deal.who}`, deal.cid);
    await notifyTeam(`Negociação retomada: ${deal.who}`, `Voltou para o funil · por ${firstName(S.me.id)}`, 'tarefa', `retake:${deal.past.id}:${Date.now()}`, 'reunioes');
    S.pipeTab = ''; toast('Negociação retomada', `${deal.who} voltou para o funil.`, 'ok'); await refresh(); },
  lostGo: () => { S.pipeTab = 'lost'; if (location.hash.replace('#', '') === 'reunioes') renderView(); else location.hash = 'reunioes'; setTimeout(() => { const t = document.querySelector('.tab-lost'); if (t) t.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 120); },
  dealMeet: d => { const deal = allDeals().find(x => x.last.id === d.id); const t = deal ? deal.last : S.d.tasks.find(x => x.id === d.id); if (!t) return;
    const nk = deal && deal.next >= 0 ? PIPE[deal.next][0] : 'carteira';
    meetForm({ client_id: (deal && deal.cid) || t.client_id || '', company: t.company || '', contact_name: t.contact_name || '', phone: t.phone || '', ticket: t.ticket || '', assignee: t.assignee, meet_type: PIPE_MTYPE[nk] || 'alinhamento', date: today(), time: nextHour() }); },
  meetSlot: d => meetForm({ date: d.d, time: d.t }),
  slotSheet: d => {
    const st = daySlots(d.d).find(x => x.time === d.t) || {}; const n = slotNote(d.d, d.t); const adm = isAdmin();
    const head = `<div class="sheet-st ${st.closed ? 'closed' : 'free'}"><b>${st.closed ? 'Bloqueado' : 'Livre'}${st.extra ? ' · horário extra' : ''}</b><span>${st.closed ? 'Não aparece para o cliente.' : 'Aparece em verde para o cliente.'}</span>${n ? `<small>${n.kind === 'block' ? 'Bloqueado' : 'Aberto'} por ${esc(firstName(n.by))} em ${stamp(n.at)}<br>Motivo: ${esc(whyTxt(n))}</small>` : st.closed ? '<small>Sem motivo registrado (bloqueio antigo).</small>' : ''}</div>`;
    const op = st.closed ? 'unblock' : st.extra ? 'remove' : 'block';
    const book = !st.closed ? `<button type="button" class="btn pri wide-b" data-act="meetSlot" data-d="${d.d}" data-t="${d.t}">${ic('meet')}Marcar reunião neste horário</button>` : '';
    if (!adm) return modal(`${d.t} · ${fdateL(d.d)}`, head + book + '<p class="note" style="margin:10px 0 0">Só o administrador bloqueia ou libera horários.</p>', { footer: `<span class="sp"></span><button type="button" class="btn" data-act="closeModal">Fechar</button>` });
    modal(`${d.t} · ${fdateL(d.d)}`, head + book + `<h4 class="sheet-h">${AV_TITLE[op]}</h4>` + availForm(op, d.d, d.t),
      { form: 'availSave', footer: `<span class="sp"></span><button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn ${op === 'block' || op === 'remove' ? 'bad' : 'ok'}">${AV_TITLE[op]}</button>` });
  },
  availOpen: d => modal('Abrir horário extra', `<p class="muted small" style="margin:0 0 10px">${esc(fdateL(d.d))} · o horário aparece em verde para o cliente.</p>` + availForm('open', d.d, ''),
    { form: 'availSave', footer: `<span class="sp"></span><button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn ok">Abrir horário</button>` }),
  availLog: () => {
    const L = (avail().log || []).slice().reverse().slice(0, 40);
    modal('Histórico de horários', L.length ? `<ul class="av-log">${L.map(x => `<li><span class="av-op ${x.op}">${AV_VERB[x.op]}</span><div><b>${x.t} · ${esc(fdateL(x.ds))}</b><small>${esc(x.why)}${x.obs ? ` — ${esc(x.obs)}` : ''}</small><small class="muted">${esc(firstName(x.by))} · ${stamp(x.at)}</small></div></li>`).join('')}</ul>` : '<p class="muted">Nenhuma alteração registrada ainda.</p>',
      { footer: `<span class="sp"></span><button type="button" class="btn pri" data-act="closeModal">Fechar</button>` });
  },
  availShare: d => {
    const days = []; for (let i = 0; i < 7; i++) days.push(addDays(today(), i));
    const lines = days.map((ds, i) => [ds, i, freeList(ds)]).filter(x => x[2].length).slice(0, 4).map(([ds, i, l]) => `*${dayName(ds, i)} (${fdate(ds)})*: ${l.join(' · ')}`);
    const txt = lines.length ? `Olá! Estes são os horários livres para uma reunião com a ${S.set.agency_name || 'Bravus Mídia'}:\n\n${lines.join('\n')}\n\nVeja e escolha o seu aqui: ${PUBLIC_URL}` : `No momento não temos horários livres nesta semana. Veja as próximas vagas: ${PUBLIC_URL}`;
    const on = avail().public !== false;
    modal('Divulgar horários livres', `<p class="muted small" style="margin:0 0 8px">Mensagem pronta para mandar no WhatsApp ou status. Só aparecem os horários <b>livres</b> — nada de nomes de clientes.</p><pre class="share-txt">${esc(txt)}</pre>${isAdmin() ? `<p class="small" style="margin:12px 0 0">Página pública: <b class="${on ? 'ok-t' : 'bad-t'}">${on ? 'ligada' : 'desligada'}</b> <button type="button" class="btn sm" data-act="availPublic">${on ? 'Desligar' : 'Ligar'}</button></p>` : ''}`,
      { footer: `<a class="btn ok" href="https://wa.me/?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener">${ic('wa')}WhatsApp</a><button type="button" class="btn" data-act="copyTxt" data-txt="${esc(txt)}">Copiar</button><span class="sp"></span><a class="btn pri" href="${PUBLIC_URL}" target="_blank" rel="noopener">Ver página</a>` });
  },
  availPublic: () => saveAvail(a => { a.public = a.public === false; }).then(() => { closeModal(); toast(avail().public === false ? 'Página de horários desligada' : 'Página de horários ligada', '', 'ok'); }),
  copyTxt: d => { navigator.clipboard && navigator.clipboard.writeText(d.txt).then(() => toast('Texto copiado', '', 'ok')); }, meetWho: d => { S.meetWho = d.id; renderView(); }, meetTicket: d => { S.meetTicket = d.id; renderView(); },
  meetResch: d => { const t = S.d.tasks.find(x => x.id === d.id); if (!t) return; meetForm(t); const f = $('#modal-root form[data-form="saveMeet"]'); if (f) { f.status.value = 'remarcada'; f.status.dispatchEvent(new Event('change')); f.new_date.focus(); } },
  meetSet: async d => { const t = S.d.tasks.find(x => x.id === d.id); if (!t) return; await store.update('tasks', t.id, { status: d.s, done_at: d.s === 'feito' ? new Date().toISOString() : null }); await log(`Reunião com ${meetWho(t)}: ${lbl(MSTATUS, d.s).toLowerCase()}`, t.client_id); toast('Reunião atualizada', lbl(MSTATUS, d.s), 'ok'); await refresh(); if (d.s === 'feito') meetForm(S.d.tasks.find(x => x.id === d.id)); },
  meetConfirm: d => { const t = S.d.tasks.find(x => x.id === d.id); if (!t) return; const c = client(t.client_id) || {}; const ph = t.phone || c.whatsapp || c.phone; const dia = t.date === today() ? 'hoje' : `no dia ${fdate(t.date)}`;
    window.open(waTo({ whatsapp: ph }, `Olá${t.contact_name ? ', ' + t.contact_name.split(' ')[0] : ''}! Passando para confirmar nossa reunião ${dia} às ${t.time}${t.meet_format === 'meet' ? ' pelo Google Meet' : t.meet_format === 'presencial' ? '' : t.meet_format === 'ligacao' ? ' por ligação' : ' por vídeo no WhatsApp'}. Posso confirmar? 😊`), '_blank', 'noopener'); log(`Enviou confirmação de reunião para ${meetWho(t)}`, t.client_id); },
  meetToClient: d => { const t = S.d.tasks.find(x => x.id === d.id); if (!t) return; closeModal(); clientForm({ name: t.company || t.contact_name || '', contact: t.contact_name || '', whatsapp: t.phone || '', services: ['trafego'], notes: t.description || '', op_status: 'ativo', start_date: today(), _deal: t.id }); },
  cliFilterGo: d => { S.cliFilter = d.f; location.hash = 'clientes'; renderView(); },
  finFilter: d => { S.finFilter = d.f; renderView(true); },
  kpiGo: d => {
    const r = d.r;
    if (r === 'clientes' && d.f) S.cliFilter = d.f;
    if (r === 'financeiro') { if (S.route !== 'financeiro') S.finMonth = curYM(); S.finFilter = d.f || 'todos'; S.keepFin = true; }
    if (r === 'reunioes' && S.route !== 'reunioes') S.meetMonth = curYM();
    if (r === 'agenda' && S.route !== 'agenda') S.agendaDate = today();
    const go = () => { if (d.s) { const t = document.getElementById(d.s); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); } };
    if (S.route === r) { renderView(true); setTimeout(go, 30); } else { location.hash = r; setTimeout(go, 120); }
  },
  editProfile: d => {
    const p = prof(d.id); if (!p) return;
    const mine = p.id === S.me.id, can = mine || isAdmin();
    const role = 'Acesso: ' + (p.role === 'admin' ? 'administrador' : 'comercial');
    if (!can) return modal(p.name, `<div class="row" style="gap:14px;margin-bottom:12px">${avatar(p, 72)}<div><b style="font-size:17px">${esc(p.name)}</b><div class="small muted">${esc(cargo(p))}</div></div></div>
      <div class="small" style="display:grid;gap:6px">${p.phone ? `<span>📱 ${esc(p.phone)}</span>` : ''}${p.birth_date ? `<span>🎂 ${fdateY(p.birth_date)}</span>` : ''}${p.bio ? `<span>${esc(p.bio)}</span>` : ''}</div>`);
    modal(mine ? 'Meu perfil' : `Perfil de ${p.name.split(' ')[0]}`, `<div class="f">
      <input type="hidden" name="id" value="${p.id}">
      <div class="row" style="gap:14px">${avatar(p, 72)}<div class="row wrap" style="gap:8px"><label class="btn sm">${ic('plus')}${p.avatar_url ? 'Trocar foto' : 'Adicionar foto'}<input type="file" accept="image/*" data-act-change="setPhoto" data-id="${p.id}" data-reopen="1" hidden></label>${p.avatar_url ? `<button type="button" class="btn sm" data-act="removePhoto" data-id="${p.id}">Remover foto</button>` : ''}${SUPA && isAdmin() && !mine ? `<button type="button" class="btn sm" data-act="adminPw" data-id="${p.id}">Alterar senha</button>` : ''}<div class="small muted" style="width:100%">${role}${p.email ? ' · ' + esc(p.email) : ''}</div></div></div>
      <div class="f2">${fld('Nome *', 'name', p.name, 'text', 'required maxlength="80"')}${isAdmin() ? `${fld('Cargo', 'title', p.title, 'text', 'maxlength="60" list="cargos" placeholder="escolha ou digite"')}<datalist id="cargos">${CARGOS.map(c => `<option value="${esc(c)}">`).join('')}</datalist>` : `<label class="fl">Cargo<input value="${esc(cargo(p))}" disabled title="Só o administrador define o cargo"></label>`}</div>
      <div class="f2">${fld('Data de nascimento', 'birth_date', p.birth_date, 'date')}${fld('WhatsApp', 'phone', p.phone, 'tel', 'placeholder="(85) 9 9999-9999"')}</div>
      ${area('Sobre / detalhes', 'bio', p.bio)}
      <label class="fl">Cor do perfil (quando sem foto)<input type="color" name="color" value="${esc(p.color || '#2f7bff')}" style="height:40px;padding:4px"></label>
    </div>`, { form: 'saveProfile', footer: `<button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">Salvar</button>` });
  },
  removePhoto: async d => { await store.update('profiles', d.id, { avatar_url: null }); toast('Foto removida', '', 'ok'); await refresh(); renderView(); A.editProfile({ id: d.id }); },
  setWallet: async d => {
    if (!isAdmin()) return toast('Somente o administrador altera clientes', '', 'warn');
    const c = client(d.id); if (!c) return;
    const on = d.on === '1'; if (on === inWallet(c)) return;
    if (on) {
      if (S.d.clients.filter(inWallet).length >= S.set.max_clients) return toast('Limite de clientes atingido', `Seu limite é ${S.set.max_clients}. Aumente em Ajustes.`, 'warn');
      return F.walletSave({ id: c.id, on: '1', from: d.from || '' });
    }
    const open = S.d.invoices.filter(i => i.client_id === c.id && ['pendente', 'atrasado'].includes(invStatus(i)));
    modal('Desativar cliente', `<div class="f"><input type="hidden" name="id" value="${c.id}"><input type="hidden" name="on" value="0"><input type="hidden" name="from" value="${esc(d.from || '')}">
      <p><b>${esc(c.name)}</b> sai da carteira: vai para a aba Offline e deixa de contar no painel, no financeiro, nos alertas e nas vagas.</p>
      ${fld('Data de saída', 'end_date', today(), 'date')}
      ${reasonField(clientFin(c) === 'inadimplente' && exitReasons().includes('Inadimplência') ? 'Inadimplência' : '')}
      ${open.length && canFin() ? `<label class="cklbl"><input type="checkbox" name="cancel_inv" value="1" checked> Cancelar ${open.length} cobrança(s) em aberto (${brl(open.reduce((a, i) => a + +i.amount, 0))})</label>` : ''}
      ${isAdmin() && c.whatsapp ? `<label class="cklbl"><input type="checkbox" name="send_msg" value="1"> Enviar comunicado de desligamento no WhatsApp (opcional)</label>` : ''}
    </div>`, { form: 'walletSave', footer: `<button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn bad">Desativar</button>` });
  },
  importDo: async (d, el) => {
    el.disabled = true; let n = 0;
    for (const c of IMPORT.filter(c => !c._skip)) { const { _skip, ...row } = c; const r = await store.insert('clients', row); n++; await log(`Importou o cliente ${row.name}`, r && r.id); }
    closeModal(); toast(`${n} cliente(s) importado(s)`, 'Complete valor e vencimento de cada um.', 'ok'); S.cliFilter = 'online'; await refresh();
  },
  editClient: d => { if (!isAdmin()) return toast('Somente o administrador altera clientes', 'Peça acesso de administrador ao Andrade.', 'warn'); if (!d.id && S.d.clients.filter(c => c.op_status !== 'cancelado').length >= S.set.max_clients) return toast('Limite de clientes atingido', `Seu espaço comporta ${S.set.max_clients} clientes. Aumente em Ajustes.`, 'warn'); clientForm(d.id ? client(d.id) : {}); },
  openClient: d => clientDetail(d.id),
  /* v2.7.7: escolher o que fazer com o cliente — pausar, cancelar ou só enviar o comunicado */
  offboard: d => {
    if (!isAdmin()) return toast('Somente o administrador altera clientes', '', 'warn');
    const c = client(d.id); if (!c) return; const paused = c.op_status === 'pausado';
    const opt = (act, cls, icon, t, sub) => `<button type="button" class="btn ${cls}" style="width:100%;justify-content:flex-start;text-align:left;padding:14px;height:auto;margin-bottom:10px" data-act="${act}" data-id="${c.id}">${ic(icon)}<span style="display:block"><b style="display:block">${t}</b><span class="small muted">${sub}</span></span></button>`;
    modal('O que fazer com ' + c.name + '?', `
      ${paused ? opt('resumeClient', 'ok', 'check', 'Retomar (voltar a Ativo)', 'O cliente está pausado. Volta a contar como ativo.') : opt('pauseClient', 'warn', 'clock', 'Pausar', 'Continua na carteira como Pausado. Dá para retomar depois.')}
      ${opt('cancelClient', 'bad', 'x', 'Cancelar (sair da carteira)', 'Vai para Offline, com data e motivo. Pode cancelar as cobranças em aberto.')}
      ${opt('shutNotice', '', 'bell', 'Só enviar comunicado de desligamento', 'Abre o WhatsApp com o comunicado, sem mudar o cliente.')}`,
      { footer: '<button type="button" class="btn" data-act="closeModal">Fechar</button>' });
  },
  pauseClient: d => {
    const c = client(d.id); if (!c) return; const wa = onlyDigits(c.whatsapp || c.phone);
    modal('Pausar ' + c.name, `<p style="margin-bottom:10px">O cliente continua na carteira como <b>Pausado</b>. Para voltar, toque em “Retomar”.</p>
      ${wa ? `<label class="sw" style="margin-bottom:10px"><input type="checkbox" id="pSend" checked> Avisar o cliente no WhatsApp</label>
      <label class="fl">Mensagem (pode ajustar)<textarea id="pTxt" style="min-height:200px">${esc(fillMsg(PAUSE_MSG, c))}</textarea></label>` : '<div class="infobox">Este cliente não tem WhatsApp cadastrado, então a pausa é feita sem aviso.</div>'}`,
      { footer: `<button type="button" class="btn" data-act="offboard" data-id="${c.id}">Voltar</button><span class="sp"></span><button type="button" class="btn warn" data-act="pauseDo" data-id="${c.id}">${ic('clock')}Pausar cliente</button>` });
  },
  pauseDo: async d => {
    const c = client(d.id); if (!c) return; const send = ($('#pSend') || {}).checked; const txt = ($('#pTxt') || {}).value;
    if (send && txt) window.open(waTo(c, txt), '_blank', 'noopener');
    await store.update('clients', c.id, { op_status: 'pausado' }); await log(`Pausou o cliente ${c.name}${send ? ' (avisado no WhatsApp)' : ''}`, c.id);
    await notifyTeam(`${c.name} foi pausado`, `Por ${firstName(S.me.id)}`, 'alerta', null, 'clientes');
    closeModal(); toast(`${c.name} pausado`, send ? 'Aviso aberto no WhatsApp.' : 'Continua na carteira como Pausado.', 'ok'); await refresh(); clientDetail(c.id);
  },
  resumeClient: async d => {
    const c = client(d.id); if (!c) return;
    await store.update('clients', c.id, { op_status: 'ativo' }); await log(`Retomou o cliente ${c.name} (voltou a Ativo)`, c.id);
    await notifyTeam(`${c.name} voltou a ficar ativo`, `Por ${firstName(S.me.id)}`, 'pago', null, 'clientes');
    closeModal(); toast(`${c.name} ativo novamente`, '', 'ok'); await refresh(); clientDetail(c.id);
  },
  cancelClient: d => { closeModal(); A.setWallet({ id: d.id, on: '0', from: 'detail' }); },
  shutNotice: d => noticeModal('shutdown', d.id),
  noticeOpen: d => { if (!isAdmin()) return toast('Somente o administrador envia este aviso', '', 'warn'); noticeModal(d.k, d.id); },
  noticeSend: async d => {
    const k = d.k, c = client(d.id); if (!c || !NOTICE[k]) return;
    const txt = ($('#nTxt') || {}).value || fillMsg(nText(k), c); const pause = k === 'shutdown' && !!($('#nPause') || {}).checked; const why = nReason(k, c);
    window.open(waTo(c, txt), '_blank', 'noopener');
    await log(`${NOTICE[k].log}${why ? ' (' + why + ')' : ''}`, c.id);
    if (pause && c.op_status !== 'pausado' && c.op_status !== 'cancelado') { await store.update('clients', c.id, { op_status: 'pausado' }); await log('Cliente pausado (protocolo de desligamento)', c.id); }
    closeModal(); toast(`${NOTICE[k].name} aberto no WhatsApp`, pause ? 'Cliente marcado como Pausado.' : 'Registrado no histórico.', 'ok'); await refresh();
  },
  noticeReset: d => { const t = $(`form[data-form="${d.k === 'recharge' ? 'saveRecharge' : 'saveShutdown'}"] textarea[name="msg"]`); if (t) t.value = NOTICE[d.k].def(); toast('Texto padrão restaurado', 'Clique em salvar para gravar.'); },
  delClient: d => !isAdmin() ? toast('Só o administrador exclui clientes', '', 'warn') : confirmBox(`Tem certeza que quer excluir o cliente ${esc((client(d.id) || {}).name || '')}?`, 'Isto apaga o cliente e as cobranças ligadas a ele. Não dá para desfazer. Para manter o histórico, prefira deixar ele Offline.', 'Sim, excluir cliente', async () => {
    const c = client(d.id); for (const t of ['campaigns', 'invoices']) for (const r of S.d[t].filter(x => x.client_id === d.id)) await store.remove(t, r.id);
    await store.remove('clients', d.id); await log(`Excluiu o cliente ${c && c.name}`); toast('Cliente excluído', '', 'ok'); await refresh(); }, true),
  clientReport: d => clientReport(d.id), print: () => EMBED ? toast('Disponível no app publicado', 'Na versão instalada, este botão salva o relatório em PDF.', 'warn') : window.print(),

  finMonth: d => { S.finMonth = d.m; renderView(); },
  newInvoice: () => { if (!S.d.clients.length) return toast('Cadastre um cliente primeiro', '', 'warn'); invoiceForm({}); },
  editInvoice: d => invoiceForm(S.d.invoices.find(i => i.id === d.id)),
  delInvoice: d => { const i = S.d.invoices.find(x => x.id === d.id) || {}; return confirmBox(`Tem certeza que quer excluir a cobrança de ${esc(cname(i.client_id) || '')}?`, `${brl(i.amount)} · vence ${fdate(i.due_date)}. Não dá para desfazer. Prefira “Cancelado” para manter o histórico.`, 'Sim, excluir cobrança', async () => { await store.remove('invoices', d.id); await log(`Excluiu a cobrança de ${cname(i.client_id) || 'cliente'} (${brl(i.amount)})`, i.client_id || null); await refresh(); }, true); },
  genInvoices: async d => {
    const k = d.m; const n = await genMonthInvoices(k);
    await log(`Gerou ${n} mensalidade(s) de ${k}`); toast(n ? `${n} mensalidade(s) criada(s)` : 'Tudo já estava gerado', '', 'ok'); await refresh();
  },
  payInvoice: d => {
    const i = S.d.invoices.find(x => x.id === d.id);
    modal('Confirmar recebimento', `<div class="f"><input type="hidden" name="id" value="${i.id}"><p><b>${esc(cname(i.client_id))}</b> · ${brl(i.amount)}</p>
      <div class="f2">${fld('Data do pagamento', 'paid_at', today(), 'date', 'required')}${sel('Forma', 'method', ['Pix', 'Boleto', 'Cartão', 'Transferência', 'Dinheiro'])}</div>
      <label class="sw"><input type="checkbox" name="confirm" required> Confirmo que o valor entrou na conta</label></div>`, { form: 'confirmPay', footer: `<button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn ok">${ic('check')}Confirmar</button>` });
  },
  chargeWa: d => { const i = S.d.invoices.find(x => x.id === d.id); log('Abriu lembrete de cobrança no WhatsApp', i && i.client_id); },
  newExpense: () => modal('Nova despesa', `<div class="f">${fld('Descrição *', 'description', '', 'text', 'required')}<div class="f2">${fld('Valor (R$) *', 'amount', '', 'number', 'step="0.01" min="0.01" required')}${fld('Data', 'date', today(), 'date', 'required')}</div>${sel('Categoria', 'category', ['Ferramentas', 'Equipe', 'Impostos', 'Anúncios próprios', 'Equipamentos', 'Outros'])}</div>`, { form: 'saveExpense', footer: `<button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">Salvar</button>` }),
  delExpense: d => { const x = S.d.expenses.find(e => e.id === d.id) || {}; return confirmBox(`Tem certeza que quer excluir a despesa “${esc(x.description || '')}”?`, `${brl(x.amount)} · ${fdate(x.date)}. Não dá para desfazer.`, 'Sim, excluir despesa', async () => { await store.remove('expenses', d.id); await log(`Excluiu a despesa “${x.description || ''}” (${brl(x.amount)})`); await refresh(); }, true); },
  newTask: () => isAdmin() ? taskForm({}) : toast('Membros só adicionam reuniões', 'Use “+ Reunião”.', 'warn'), editTask: d => { const t = S.d.tasks.find(t => t.id === d.id); return t && t.kind === 'reuniao' ? meetForm(t) : taskForm(t); },
  newTemplate: () => taskForm({}, true), editTemplate: d => taskForm(S.d.tasks.find(t => t.id === d.id), true),
  delTask: d => { const t = S.d.tasks.find(x => x.id === d.id) || {}; const isM = t.kind === 'reuniao'; return confirmBox(isM ? `Tem certeza que quer excluir a reunião com ${esc(meetWho(t))}?` : `Tem certeza que quer excluir a tarefa “${esc(t.title || '')}”?`, `${t.date ? fdate(t.date) : ''}${t.time ? ' às ' + esc(t.time) : ''}${t.date ? ' · ' : ''}Não dá para desfazer.`, isM ? 'Sim, excluir reunião' : 'Sim, excluir tarefa', async () => { await store.remove('tasks', d.id); await log(isM ? `Excluiu a reunião com ${meetWho(t)}${t.date ? ' · ' + fdate(t.date) + (t.time ? ' ' + t.time : '') : ''}` : `Excluiu a tarefa “${t.title || ''}”`, t.client_id || null); closeModal(); await refresh(); }, true); },
  personTasks: d => { if (!$('#modal-root .pt-row') && !$('#modal-root .empty')) PT_JUST.clear(); personTasks(d.id, d.m || 'late'); },
  ptCheck: async d => {
    const t = S.d.tasks.find(x => x.id === d.id); if (!t) return;
    if (!isAdmin() && t.assignee !== S.me.id) return toast('Só o responsável ou o administrador marca esta tarefa', '', 'warn');
    const done = t.status !== 'feito';
    Object.assign(t, { status: done ? 'feito' : 'pendente', done_at: done ? new Date().toISOString() : null }); if (done) PT_JUST.add(t.id);
    // mostra o ✓ verde no quadrado na hora; depois de um instante a tarefa desce para “Feitas”
    const r = document.querySelector(`#modal-root [data-row="${t.id}"]`); const b = r && r.querySelector('.ck');
    if (r && b) { r.classList.toggle('done', done); b.classList.toggle('on', done); b.innerHTML = done ? ic('check') : t.kind === 'reuniao' ? ic('meet') : ''; if (done) b.classList.add('pop'); }
    clearTimeout(S.ptT); S.ptT = setTimeout(() => { if ($('#modal-root .pt-row')) personTasksKeep(d.u, d.m); }, 900);
    try { await store.update('tasks', t.id, { status: t.status, done_at: t.done_at }); } catch (e) { return toast('Não foi possível salvar', e.message, 'bad'); }
    if (done && t.kind === 'reuniao') { log(`Reunião com ${meetWho(t)}: realizada`, t.client_id); notifyTeam(`Reunião com ${meetWho(t)}: realizada`, `${fdate(t.date)} às ${t.time || '--:--'} · registrado por ${firstName(S.me.id)}`, 'tarefa', `meet:${t.id}:feito`, 'reunioes'); }
    else if (done) log(`Concluiu: ${t.title}${t.assignee !== S.me.id ? ' (de ' + firstName(t.assignee) + ')' : ''}`, t.client_id);
    renderViewSoft();
  },
  ptAll: d => {
    const list = personTaskList(d.id, d.m).filter(t => t.kind !== 'reuniao' && t.status !== 'feito');
    confirmBox(`Tem certeza que quer marcar ${list.length} tarefa(s) como feitas?`, `Todas as tarefas de “${PT[d.m]}” de ${esc(firstName(d.id))} ficam como concluídas e entram na contagem do painel.`, 'Sim, marcar como feitas', async () => {
      const at = new Date().toISOString(); list.forEach(t => Object.assign(t, { status: 'feito', done_at: at }));
      await Promise.all(list.map(t => store.update('tasks', t.id, { status: 'feito', done_at: at }).catch(() => {})));
      list.forEach(t => PT_JUST.add(t.id)); await log(`Concluiu ${list.length} tarefa(s) de ${firstName(d.id)} (${PT[d.m].toLowerCase()})`); toast('Tarefas concluídas', `${list.length} tarefa(s)`, 'ok'); await refresh(); personTasks(d.id, d.m);
    });
  },
  toggleTask: async d => {
    const t = S.d.tasks.find(x => x.id === d.id); if (!t) return; const done = t.status !== 'feito';
    if (!isAdmin() && t.assignee && t.assignee !== S.me.id) return toast('Só o responsável ou o administrador marca esta tarefa', '', 'warn');
    Object.assign(t, { status: done ? 'feito' : 'pendente', done_at: done ? new Date().toISOString() : null });
    /* mostra na hora o ✓ no quadrado clicado (também dentro da janela de atrasadas) */
    document.querySelectorAll(`.ck[data-act="toggleTask"][data-id="${t.id}"]`).forEach(b => {
      b.innerHTML = done ? ic('check') : ''; b.classList.toggle('on', done); b.classList.remove('pop'); void b.offsetWidth; if (done) b.classList.add('pop');
      const row = b.closest('.task'); if (row) { row.classList.toggle('done', done); if (done) row.classList.remove('late'); row.querySelectorAll('.chip.bad').forEach(c => { if (/Atrasada/.test(c.textContent)) c.style.display = done ? 'none' : ''; }); }
    });
    if (navigator.vibrate && done) try { navigator.vibrate(30); } catch {}
    setTimeout(() => renderView(), 350);
    try { await store.update('tasks', t.id, { status: t.status, done_at: t.done_at }); }
    catch (e) { Object.assign(t, { status: done ? 'pendente' : 'feito', done_at: null }); renderView(); return toast('Não foi possível marcar', e.message, 'bad'); }
    toast(done ? 'Tarefa concluída ✓' : 'Tarefa reaberta', t.title, done ? 'ok' : '');
    if (done) log(`Concluiu: ${t.title}`, t.client_id);
  },
  cntStep: d => { const t = S.d.tasks.find(x => x.id === d.id); if (!t) return; const inp = document.querySelector(`.cstep[data-cstep="${t.id}"]`); const v = Math.max(1, Math.min(9999, +(inp && inp.value) || cStep(t))); try { localStorage.setItem(cStepKey(t), v); } catch {} return A.cnt({ id: t.id, v }); },
  cnt: async d => {
    const t = S.d.tasks.find(x => x.id === d.id); t.count = Math.max(0, (t.count || 0) + +d.v); renderView();
    await store.update('tasks', t.id, { count: t.count });
    if (t.goal && t.count >= t.goal && t.status !== 'feito') { t.status = 'feito'; t.done_at = new Date().toISOString(); await store.update('tasks', t.id, { status: 'feito', done_at: t.done_at }); toast('Meta batida! 🎯', t.title, 'ok'); log(`Bateu a meta: ${t.title} (${t.count})`); renderView(); }
  },
  agDate: async d => { S.agendaDate = d.d; if (d.d >= today() && d.d <= addDays(today(), 7)) await ensureRoutine(d.d); renderView(); },
  agWho: d => { S.agendaWho = d.w; renderView(); },
  showLate: () => modal('Tarefas atrasadas', realTasks().filter(t => isLate(t) && t.date < S.agendaDate && (S.agendaWho === 'all' || t.assignee === S.agendaWho)).sort((a, b) => b.date.localeCompare(a.date)).map(t => taskRow(t).replace('<span class="tm">', `<span class="tm" title="${fdate(t.date)}">${fdate(t.date)}<br>`)).join('') || empty('Nada atrasado.'), { wide: true }),
  taskCal: d => {
    const t = S.d.tasks.find(x => x.id === d.id); const dt = (t.date || today()).replace(/-/g, ''); const tm = (t.time || '09:00').replace(':', '') + '00';
    const [h, m] = (t.time || '09:00').split(':').map(Number); const e = new Date(2000, 0, 1, h, m + 30); const tmE = `${pad(e.getHours())}${pad(e.getMinutes())}00`;
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Bravus Work//PT-BR', 'BEGIN:VEVENT', `UID:${t.id}@bravuswork`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`, `DTSTART;TZID=America/Fortaleza:${dt}T${tm}`, `DTEND;TZID=America/Fortaleza:${dt}T${tmE}`, `SUMMARY:${t.title.replace(/[,;\n]/g, ' ')}`, `DESCRIPTION:${(t.description || '').replace(/[,;\n]/g, ' ')}`, 'BEGIN:VALARM', `TRIGGER:-PT${t.remind_min || 10}M`, 'ACTION:DISPLAY', 'DESCRIPTION:Lembrete', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    if (!EMBED) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = 'bravus-work-tarefa.ics'; a.click(); }
    const g = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(t.title)}&dates=${dt}T${tm}/${dt}T${tmE}&ctz=America/Fortaleza&details=${encodeURIComponent(t.description || '')}`;
    const ga = document.createElement('a'); ga.href = g; ga.target = '_blank'; ga.rel = 'noopener'; document.body.appendChild(ga); ga.click(); ga.remove();
    toast('Evento enviado ao calendário', EMBED ? 'Google Agenda aberto em nova aba.' : 'Abra o arquivo .ics para adicionar no iPhone/Android.');
  },
  editContent: d => (!d.id && !isAdmin()) ? toast('Membros só adicionam reuniões', '', 'warn') : contentForm(d.id ? S.d.content.find(c => c.id === d.id) : {}),
  delContent: d => { const c = S.d.content.find(x => x.id === d.id) || {}; return confirmBox(`Tem certeza que quer excluir o conteúdo “${esc(c.title || '')}”?`, 'Não dá para desfazer.', 'Sim, excluir conteúdo', async () => { await store.remove('content', d.id); await log(`Excluiu o conteúdo “${c.title || ''}”`); await refresh(); }, true); },
  cNext: async (d, el, ev) => {
    const c = S.d.content.find(x => x.id === d.id); const i = CST.findIndex(s => s[0] === c.status);
    if (c.status === 'aprovacao' && !isAdmin()) return toast('Aguardando aprovação do Andrade', '', 'warn');
    const next = CST[Math.min(i + 1, CST.length - 1)][0]; c.status = next; renderView();
    await store.update('content', c.id, { status: next }); log(`Conteúdo “${c.title}” → ${next}`, c.client_id);
    if (next === 'aprovacao') await notifyUsers(admins(), 'Publicação aguardando aprovação', c.title, 'conteudo', `apr:${c.id}`, 'conteudo');
  },
  cWeek: d => { S.contentWeek = d.d; renderView(); },
  readAll: async d => {
    const onlyToday = d && d.s === 'hoje';
    const list = S.d.notifications.filter(n => n.user_id === S.me.id && !n.read && (!onlyToday || iso(new Date(n.created_at)) === today()));
    if (!list.length) return toast(onlyToday ? 'Nenhum alerta de hoje para marcar' : 'Tudo já está lido', '', 'ok');
    list.forEach(n => { n.read = true }); renderView();
    await Promise.all(list.map(n => store.update('notifications', n.id, { read: true }).catch(() => {})));
    toast(onlyToday ? 'Alertas de hoje marcados como lidos' : 'Todos os alertas marcados como lidos', `${list.length} alerta(s)`, 'ok'); await refresh();
  },
  readOne: async d => { const n = S.d.notifications.find(x => x.id === d.id); if (n && !n.read) { n.read = true; store.update('notifications', n.id, { read: true }); } location.hash = '#' + (n && n.route || 'painel'); },
  enablePush: async () => {
    try {
      const p = await Notification.requestPermission();
      if (p !== 'granted') return toast('Permissão não concedida', '', 'warn');
      await pushSubscribe(true);
      toast('Notificações ativadas', 'Você receberá os lembretes neste aparelho.', 'ok'); systemPop({ title: 'Bravus Work', body: 'Notificações ativas ✅', key: 'test' }); renderView();
    } catch (e) { toast('Não foi possível ativar', e.message, 'warn'); }
  },
  newRem: d => reminderForm({ t: d.t || 'avulso', id: d.id || '', title: d.title || '' }),
  delRem: d => confirmBox('Apagar lembrete?', 'O aviso não será mais enviado.', 'Apagar', async () => { await store.remove('reminders', d.id); toast('Lembrete apagado', '', 'ok'); await refresh(); }, true),
  testPush: () => systemPop({ title: `Olá, ${firstName(S.me.id)}!`, body: 'Este é um teste do Bravus Notify.', key: 'test' + Date.now(), route: 'alertas' }),
  backup: () => {
    if (EMBED) return toast('Disponível no app publicado', 'Na prévia não é possível baixar arquivos.', 'warn');
    const data = { app: 'bravus-work', version: VERSION, at: new Date().toISOString(), data: {} };
    TABLES.forEach(t => data.data[t] = S.d[t].map(r => { const { pin_hash, salt, ...rest } = r; return rest; }));
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = `bravus-work-backup-${today()}.json`; a.click();
    log('Baixou backup');
  },
  changePin: d => modal('Trocar senha', `<div class="f"><input type="hidden" name="id" value="${d.id}">${fld('Nova senha (mín. 6 caracteres)', 'pin', '', 'password', 'minlength="6" required autocomplete="new-password" autocapitalize="none"')}${fld('Repita a senha', 'pin2', '', 'password', 'minlength="6" required autocomplete="new-password" autocapitalize="none"')}</div>`, { form: 'savePin', footer: `<button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">Salvar</button>` })
};

