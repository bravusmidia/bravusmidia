/* ---------- AJUSTES ---------- */
V.ajustes = () => {
  const s = S.set; const tpls = S.d.tasks.filter(t => t.is_template).sort((a, b) => firstName(a.assignee).localeCompare(firstName(b.assignee)) || (a.time || '').localeCompare(b.time || ''));
  const DN = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const integ = (n, st, how) => `<div class="li"><div class="t"><b>${n}</b><small>${how}</small></div><span class="chip st ${st ? 'ok' : 'neu'}">${st ? 'Conectado' : 'Pendente'}</span></div>`;
  return head('Ajustes', 'Somente o administrador vê esta tela') + `
  <form class="card f" data-form="saveSettings"><h3>${ic('gear')}Operação</h3>
    <div class="f2">${fld('Nome da agência', 'agency_name', s.agency_name)}${fld('Limite de clientes', 'max_clients', s.max_clients, 'number', 'min="1" max="500"')}</div>
    <div class="f2">${fld('Ligações a partir de', 'calls_start', s.calls_start, 'time')}${fld('Horários livres da semana começam às', 'meetings_start', s.meetings_start, 'time')}</div>
    <div class="f2">${fld('Última reunião termina às', 'meetings_end', s.meetings_end || '21:30', 'time')}${fld('Duração de cada reunião (min)', 'meet_slot', s.meet_slot || 60, 'number', 'min="15" max="180" step="15"')}</div>
    <div class="f2">${fld('Meta diária de prospecção', 'prospect_goal', s.prospect_goal, 'number')}${fld('Meta diária de follow-ups (Priscila)', 'followup_goal', s.followup_goal, 'number')}</div>
    <div class="f2">${fld('Priscila — início', 'priscila_start', s.priscila_start, 'time')}${fld('Priscila — fim', 'priscila_end', s.priscila_end, 'time')}</div>
    <div class="f2">${fld('Aviso de bom dia às', 'morning_hour', s.morning_hour, 'time')}${fld('Bloquear após (min sem uso · 0 = nunca)', 'lock_minutes', s.lock_v2 ? s.lock_minutes || 0 : 0, 'number', 'min="0" max="240"')}</div>
    ${fld('Lembretes de cobrança (dias em relação ao vencimento)', 'reminder_offsets', (s.reminder_offsets || []).join(', '), 'text', 'placeholder="-5, -2, 0, 1, 5, 10"')}
    <p class="note">Negativo = antes do vencimento · 0 = no dia · positivo = depois.</p>
    <div class="sec" style="margin:4px 0 0">Tipos de notificação</div>
    <div class="cks">${[['tarefas', 'Tarefas e reuniões'], ['financeiro', 'Cobranças'], ['conteudo', 'Conteúdo'], ['chat', 'Chat']].map(n => `<label><input type="checkbox" name="nf_${n[0]}" ${(s.notify || {})[n[0]] !== false ? 'checked' : ''}>${n[1]}</label>`).join('')}</div>
    <div><button class="btn pri">Salvar ajustes</button></div>
  </form>
  <form class="card f" data-form="saveReasons" style="margin-top:14px"><h3>${ic('users')}Motivos de saída do cliente</h3>
    <label class="fl">Frases prontas — uma por linha<textarea name="list" style="min-height:190px">${esc(exitReasons().join('\n'))}</textarea></label>
    <p class="note">Aparecem como botões quando você desativa um cliente ou edita o cadastro. Você ainda pode digitar um motivo diferente na hora. A ordem daqui é a ordem dos botões.</p>
    <div class="row wrap"><button class="btn pri">Salvar motivos</button><button type="button" class="btn" data-act="reasonsReset">Restaurar lista padrão</button></div>
  </form>
  <form class="card f" data-form="saveShutdown" style="margin-top:14px"><h3>${ic('bell')}Comunicado de desligamento (WhatsApp)</h3>
    <label class="sw"><input type="checkbox" name="auto" ${shutCfg().auto ? 'checked' : ''}> <b>Automático ligado</b> — o app identifica sozinho quem entrou na regra e deixa o comunicado pronto (alerta + Prioridades de hoje)</label>
    <div class="f2"><input type="hidden" name="trigger" value="atraso">${fld('Prazo em dias', 'days', shutCfg().days, 'number', 'min="1" max="90"')}</div>
    <p class="note">Dispara quando a mensalidade passar este número de dias em atraso.</p>
    <label class="fl">Texto da mensagem<textarea name="msg" style="min-height:260px">${esc(nText('shutdown'))}</textarea></label>
    <p class="note">Pode usar: <b>{cliente}</b> nome da empresa · <b>{contato}</b> primeiro nome do contato · <b>{valor}</b> total em atraso · <b>{dias}</b> dias de atraso. Negrito do WhatsApp: *texto*.</p>
    <label class="sw"><input type="checkbox" name="pause" ${shutCfg().pause ? 'checked' : ''}> Marcar o cliente como Pausado quando o comunicado for enviado</label>
    <p class="note">Desligado: o comunicado só sai quando você clicar em “Desligamento” no cliente. Ligado: o app avisa e deixa pronto; você confirma o envio com 1 toque. Envio 100% sem toque exige a API oficial do WhatsApp com modelo aprovado pela Meta.</p>
    <div class="row wrap"><button class="btn pri">Salvar comunicado</button><button type="button" class="btn" data-act="noticeReset" data-k="shutdown">Restaurar texto padrão</button></div>
  </form>
  <div class="card" style="margin-top:14px"><h3>${ic('cal')}Rotinas automáticas (Daily e Weekend)<span class="sp"></span><button class="btn sm" data-act="newTemplate">${ic('plus')}Rotina</button></h3>
    <div class="list scrollbox">${tpls.map(t => `<div class="li"><span class="tm num" style="color:var(--blue2);font-weight:700;width:46px">${esc(t.time || '—')}</span><div class="t"><b>${esc(t.title)}</b><small>${esc(firstName(t.assignee))} · ${DN.map((n, i) => (t.days || []).includes(i) ? `<b style="color:var(--tx)">${n}</b>` : `<span style="opacity:.35">${n}</span>`).join(' ')}${t.goal ? ' · meta ' + t.goal : ''}</small></div><button class="btn sm ic" data-act="editTemplate" data-id="${t.id}">${ic('edit')}</button></div>`).join('') || empty('Sem rotinas.')}</div>
    <p class="note" style="margin-top:8px">As tarefas do dia são criadas automaticamente a partir destas rotinas. Mudanças valem a partir do próximo dia gerado.</p></div>
  <div class="card" style="margin-top:14px"><h3>${ic('sync')}Integrações oficiais</h3><div class="list">
    ${integ('Banco de dados (Supabase)', SUPA, SUPA ? 'Dados na nuvem, criptografados e com backup diário do Supabase.' : 'Modo local: dados só neste aparelho. Siga o README para conectar.')}
    ${integ('Push com app fechado', !!(S.pushOk || CFG.VAPID_PUBLIC_KEY) && SUPA, 'SQL v2.9 + função send-push no Supabase (chaves geradas no servidor).')}
    ${integ('WhatsApp Business Platform', false, 'Hoje: botões que abrem o WhatsApp com a mensagem pronta. API oficial: próxima etapa (exige modelos aprovados).')}
    ${integ('Google Calendar / iPhone / Android', true, 'Botão “Calendário” em cada tarefa gera o evento (.ics) compatível com todos.')}
    ${integ('Instagram, RD Station, ClickUp', false, 'Preparados para a próxima etapa; enquanto isso, registro manual.')}
  </div></div>
  <div class="card" style="margin-top:14px"><h3>${ic('down')}Backup</h3><div class="row wrap"><button class="btn" data-act="backup">${ic('down')}Baixar backup (JSON)</button>${!SUPA ? `<label class="btn">Restaurar backup<input type="file" accept="application/json" data-act-change="restore" hidden></label>` : ''}</div><p class="note" style="margin-top:8px">O backup contém dados de clientes: guarde em local seguro (ex.: pasta privada no Drive).</p></div>
  <div class="card" style="margin-top:14px"><h3>${ic('users')}Equipe<span class="sp"></span>${SUPA ? `<button class="btn sm pri" data-act="newMember">${ic('plus')}Membro</button>` : ''}</h3><div class="list">${team().map(p => `<div class="li">${avatar(p)}<div class="t" data-act="editProfile" data-id="${p.id}" style="cursor:pointer"><b>${esc(p.name)}</b><small>${esc(cargo(p))} · <b style="color:${p.role === 'admin' ? 'var(--blue2)' : 'var(--tx2)'}">${p.role === 'admin' ? 'Administrador' : 'Membro'}</b>${p.email ? ' · ' + esc(p.email) : ''}</small></div>${p.id === S.me.id || isAdmin() ? `<label class="btn sm" title="Trocar foto">${ic('plus')}Foto<input type="file" accept="image/*" data-act-change="setPhoto" data-id="${p.id}" hidden></label>` : ''}${!SUPA || p.id === S.me.id ? `<button class="btn sm" data-act="changePin" data-id="${p.id}">Trocar senha</button>` : `<button class="btn sm" data-act="setRole" data-id="${p.id}">${p.role === 'admin' ? 'Tirar admin' : 'Dar admin'}</button><button class="btn sm" data-act="adminPw" data-id="${p.id}">Alterar senha</button><button class="btn sm bad" data-act="removeMember" data-id="${p.id}" title="Remover da equipe">${ic('trash')}</button><button class="btn sm" data-act="resetPw" data-id="${p.id}" title="Envia um link por e-mail para a pessoa criar a senha">Link por e-mail</button>`}</div>`).join('')}</div>
  ${SUPA ? '<p class="note" style="margin-top:8px">Novos usuários são criados no painel do Supabase (Authentication → Add user) — veja o README.</p>' : ''}</div>
  <p class="note" style="margin-top:14px;text-align:center">Bravus Work v${VERSION} · ${SUPA ? 'Supabase' : 'modo local'}</p>`;
};

