/* =====================================================================
   CHAT FLUTUANTE (Conversa + Anotações) · avisos de versão · popups
   ===================================================================== */
const RELEASE = { version: '3.6.0', notes: [
  'Segurança reforçada: biblioteca do Supabase agora fica dentro do próprio app (sem depender de site externo) e funções internas de alerta bloqueadas para quem é de fora.',
  'Código organizado por áreas e com teste automático a cada atualização — menos risco de uma mudança quebrar outra tela.',
  'Botões de salvar não enviam duas vezes se você tocar rápido.',
  'Horários da semana mais profissionais: tocar num horário abre as opções (marcar reunião, bloquear, liberar) — nada muda com um toque só.',
  'Todo bloqueio, liberação ou horário extra exige motivo (e observação em “Outro motivo”), avisa a equipe e fica no Histórico.',
  'Horário bloqueado mostra o motivo no card; o cliente nunca vê motivos nem nomes.',
  'Horário aberto por você (ex.: 19:00) fica livre e verde mesmo perto de outra reunião — você decide.',
  'Página do cliente mostra a grade inteira: verde = livre para escolher, vermelho = reservado (sem nomes).',
  'Horário extra que bate com uma reunião não aparece mais como “Ocupado” repetido; em “Escolher livres” ele aparece para você tirar.',
  'Reuniões → Horários da semana: botão “Escolher livres” para fechar ou abrir cada horário e abrir horários extras.',
  'Botão “Divulgar horários”: mensagem pronta no WhatsApp com os horários livres e link da página pública (o cliente só vê horários, nunca nomes).',

  'Cores padronizadas no app inteiro: STATUS tem bolinha (verde = feito, âmbar = precisa da sua ação, vermelho = problema, azul = agendado, violeta = remarcada, cinza = cancelado/inativo).',
  'TICKET agora é metal, igual ao ticket do cliente: Baixo = bronze, Médio = prata, Alto = ouro. Nunca mais se confunde com status.',
  'Resultado da reunião colorido na linha: Fechou (verde), Em negociação (azul), Não fechou (vermelho). Remarcadas em violeta com ↻.',
  'Mesma paleta do site da Bravus Mídia.',
  'Reuniões no celular: o ticket (Baixo/Médio/Alto) e o status (Realizada, Aguardando resultado…) agora ficam embaixo do nome e do tipo da reunião, deixando o texto em linha inteira. No quadro “Já passaram”, os botões Realizada/Faltou/Remarcar também descem para baixo do nome.',
  'Reuniões: os quadros Reuniões no mês, Realizadas, Comparecimento e Fecharam agora são clicáveis. Abre a lista de cada um com o assunto, ticket, responsável, formato, quantidades e as anotações de cada reunião.',
  'Dentro da lista dá para trocar entre Todas, Realizadas, Não compareceu, Aguardando resultado, Fecharam, Em negociação e Não fecharam, e tocar numa reunião para abrir e editar.',
  'As datas de vencimento (“vence 23/11”) agora aparecem em amarelo no Financeiro, no histórico do cliente e nos cards de Clientes.',
  'Novo menu Contratos, com as abas Contratos e Propostas. Os modelos da Bravus já vêm prontos: é só trocar nome, e-mail, CPF/CNPJ, telefone, valores e prazos.',
  'Os valores e prazos do contrato saem por extenso sozinhos (ex.: R$ 1.200,00 (mil e duzentos reais)). Na proposta, os totais de cada pacote são calculados na hora.',
  'Prévia igual à folha A4, com botões Baixar PDF, Imprimir e Enviar (no celular, abre o WhatsApp para mandar o PDF). Dá para puxar os dados de um cliente já cadastrado e duplicar um documento.',
  'Reuniões → Andamento pós-reunião: o passo a passo de cada cliente agora fica fechado. Toque no nome do cliente para abrir (e de novo para fechar). “Ver reunião” fica dentro do card aberto.',
  'Novo botão “Não fechou” em cada cliente do funil (Reuniões → Andamento pós-reunião). Você escolhe o motivo (preço, sem orçamento, concorrente, adiou, parou de responder…), escreve uma observação e, se quiser, uma data para retomar o contato.',
  'O cliente sai do funil e vai para a nova aba “Não fecharam”, com motivo, data, em que etapa parou e botões de WhatsApp, + Reunião e “Retomar negociação”.',
  'Painel: novo card “Propostas não fechadas” com quantos não fecharam no mês, taxa de fechamento e o motivo mais comum. Quando chega o dia de retomar, aparece nas Prioridades de hoje e vira um follow-up na agenda.',
  'Reuniões: o “Andamento pós-reunião” virou um funil por cliente: Reunião → Proposta enviada → Contrato assinado → Onboarding → Cliente na carteira. Cada cliente tem um botão para avançar a próxima etapa.',
  '“Colocar na carteira” abre o cadastro do cliente já preenchido. Ao salvar, ele vai direto para a lista de Clientes e as reuniões ficam ligadas a ele.',
  'Tudo conversa: reunião realizada marca a etapa Reunião sozinha; reunião do tipo Proposta ou Onboarding realizada marca a etapa dela; cliente que sai da carteira volta a ficar pendente no funil. Cada etapa avisa a equipe no celular.',
  'Cada cliente do funil tem “+ Reunião” para marcar uma nova reunião em qualquer horário, já preenchida. Nos Horários da semana há o botão “Outro horário”.',
  'Para desmarcar uma etapa, o app pede confirmação (evita toque sem querer). No celular aparece um aviso por vez.',
  'Asaas removido: o Bravus Work não tem mais nenhuma conexão com o Asaas. As cobranças antigas que vinham como “Cobrança Asaas” agora aparecem como Mensalidade, e você continua marcando pago / a receber / em atraso manualmente.',
  'Lembrete em qualquer item: botão 🔔 Lembrete em clientes, reuniões, tarefas, cobranças e conteúdos (e lembrete avulso em Alertas). Você escolhe dia, hora e quem recebe (você, a Priscila ou os dois).',
  'Reuniões avisam Andrade e Priscila no celular 20 min antes (dá para mudar em cada reunião).',
  'Push do servidor: os avisos chegam no celular mesmo com o app fechado. Abra o app uma vez e toque em Alertas → Ativar.',
  'Menu: novo atalho “CRM”. Toque para abrir o CRM direto (no celular fica em Mais).',
  'Avisos de tudo: mensagens do chat sempre notificam a equipe, e também exclusões (reunião, tarefa, cobrança, despesa, conteúdo) e anotações nos clientes.',
  'Avisos para a equipe: tudo que alguém faz no app (reunião marcada, remarcada, realizada, cliente, pagamento, anotação…) gera um aviso para os outros. A Priscila recebe o que o Andrade faz e vice-versa.',
  'Lembretes de compromisso: além dos seus, você recebe o lembrete das reuniões e compromissos com horário dos outros da equipe (ex.: “Reunião de Andrade às 20:30”).',
  'Reuniões: ao escolher “Remarcada”, o app pede a nova data e o novo horário e move a própria reunião. Ela conta uma vez só e fica marcada com “↻ Remarcada”. No quadro “Já passaram” há o botão ↻ Remarcar.',
  'Reuniões: agora todos (inclusive a Priscila) podem marcar reunião em qualquer horário, qualquer dia. A trava das 18:30 saiu.',
  'Reuniões: novo “Andamento pós-reunião”. Cada negócio fechado ou em negociação mostra o passo a passo: Reunião → Proposta → Contrato → Pagamento → Onboarding → Operação rodando. Toque na etapa para marcar; Reunião e Pagamento marcam sozinhos.',
  'Reuniões: os “Horários da semana” agora ficam recolhidos num botão. Toque em “Ver horários” para abrir.',
  'Agenda: o número do botão de somar (antes fixo em +5) agora é editável. Toque no número, digite quanto quer somar (ex.: 10, 20) e toque no +. O app lembra o número de cada rotina neste aparelho.',
  'Agenda: a barra das metas (seguir, deixar de seguir, prospecção…) ganhou uma bolinha. Arraste para marcar a quantidade rápido; os botões − + e +5 continuam funcionando.',
  'Cliente: o botão “Desligamento” virou “Pausar / Cancelar”. Ao tocar você escolhe: Pausar (fica na carteira como Pausado, com aviso opcional no WhatsApp), Cancelar (sai da carteira, com data, motivo e cobranças) ou só enviar o comunicado de desligamento. Cliente pausado ganha o botão “Retomar”.',
  '“A receber” agora mostra o total de tudo que falta receber: mensalidades do mês ainda não vencidas + as atrasadas. O card “Atrasado” continua mostrando só o valor em atraso.',
  'Agenda: ao tocar no quadrado da tarefa aparece na hora o ✓ verde, a tarefa fica riscada e some o “Atrasada” (também na lista de atrasadas). Toque de novo para desmarcar.',
  'Em atraso automático: mensalidade que passou do vencimento sem pagamento entra em “Em atraso” e o cliente vira inadimplente no painel, mesmo se estava marcada como “A receber”.',
  'As mensalidades do mês agora são geradas sozinhas quando o administrador entra no app (antes precisava clicar em gerar). Nenhum cliente fica sem cobrança.',
  'Avisos visíveis no celular: quando uma janela está aberta (ex.: Nova reunião), o aviso de erro ou de restrição aparece dentro dela, no topo do formulário. O popup do topo também desceu para não ficar atrás da barra do iPhone.',
  'Checklist da Equipe: reuniões também podem ser marcadas no quadrado (vira “Realizada” e conta no painel e em Reuniões).',
  'Checklist da Equipe: ao marcar aparece o ✓ verde no quadrado e a tarefa desce para “Feitas” (com data e hora), sem sumir. Tudo conta no painel.',
  'Equipe: toque em Hoje, Semana ou Atrasadas de cada pessoa para ver a lista do que falta e marcar como feito (checklist). Tem também “Marcar todas como feitas”.',
  'Tudo que é marcado entra na hora no Painel (tarefas concluídas, atrasadas e produtividade).',
  'Equipe: botão Excluir membro no card de cada pessoa (só o administrador).',
  'Toda exclusão pergunta “Tem certeza?” dizendo exatamente o que vai ser apagado (cliente, reunião, tarefa, cobrança, despesa, conteúdo, membro).',
  'Clientes: medalhas realistas de Ouro, Prata e Bronze no lugar da estrela.',
  'Alertas: botões “Lidos de hoje” e “Todos lidos”, com a contagem de não lidos.',
  'Tempo online mais enxuto: só Hoje e Total, proporcional no celular.',
  'Tempo online: o app conta o tempo que cada um passa no Bravus Work (hoje, 7 dias, mês e total) e mostra para todos, no topo, na Equipe e no Painel.',
  'Clientes com ticket Ouro, Prata e Bronze: selo colorido no card, filtro com contagem e cards ordenados do Ouro para o Bronze.',
  'Ticket automático pelo valor do contrato (Bronze até R$ 800 · Prata acima de R$ 800 · Ouro a partir de R$ 1.200), ou marcado à mão na conta de cada cliente.',
  'Status online corrigido: você aparece online na hora em que abre ou volta para o app.',
  'Painel conectado a todo o Bravus Work: novo resumo do mês com reuniões, tarefas, prospecções, clientes, conteúdo e financeiro, cada um levando para a sua aba.',
  'Reuniões que já passaram sem resultado aparecem nas Prioridades de hoje e no card de Reuniões; um toque e você marca Realizada ou Faltou.',
  'Dá para registrar uma reunião que já aconteceu: se a data/hora já passou, ela entra como Realizada e conta na hora.',
  'Reuniões fora do horário padrão (ex.: 12:00) agora aparecem ocupando o horário na semana.',
  'Reuniões: todos marcam em qualquer horário, qualquer dia.',
  'Excluir cliente: só o administrador (também travado no banco).',
  'Feriados no calendário (os mesmos do Google Agenda, mais Ceará e Fortaleza) e datas comerciais (Dia das Mães, Black Friday…). Aviso 7 dias antes para criar panfleto, flyer e desconto.',
  'Reuniões: agora dá para marcar em qualquer horário, sem trava de regra.',
  'Reuniões: botões de Ticket (Baixo, Médio, Alto) dentro de cada reunião, selo colorido na lista e filtro por ticket com contagem do mês.',
  'Você continua conectado: fechar o app ou ficar sem usar não desliga mais a sessão. Só sai se tocar no cadeado.',
  'Botão do chat flutuante: segure e arraste para qualquer lugar da tela; ele gruda na lateral mais próxima e lembra a posição.',
  'Painel: toque em qualquer card (Entrou no mês, A receber, Em atraso, Saldo, Clientes, Inadimplentes, Reuniões, Receita) e vá direto para a aba certa, já filtrada.',
  'Financeiro: filtro de cobranças (Todas, Pagas, A receber, Em atraso).',
  'Reuniões: menu da semana (Hoje, Amanhã, Qua, Qui…) mostrando só se há horário livre ou lotado; toque num horário livre para marcar.',
  'Horário das reuniões em destaque na lista.',
  'Celular: a tela de Alertas (e as outras) não volta mais para o topo enquanto você rola; avisos aparecem com o texto completo.',
  'Adicionar e remover membros da equipe, com senha definida por você.',
  'Quem está online aparece no topo da tela.',
  'Selo de pagamento corrigido: cobranças canceladas não contam mais como "em dia".',
  'Chat flutuante no canto direito: converse enquanto mexe em qualquer tela.',
  'Aba Anotações no chat para guardar o que é importante (fixe qualquer mensagem com 📌).',
  'Confirmação de leitura: ✓ enviado · ✓✓ visto.',
  'Avisos na tela de tudo: mensagens, cliente novo, pagamentos, vencimentos, reuniões e prospecção.',
  'Tela de Metas, Reuniões e controle manual de pagamentos.'
] };
const CW = { open: lsGet('bw_cw_open', false), tab: 'chat', seenSent: 0 };
const msgTime = iso => { const d = new Date(iso), h = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); return d.toDateString() === new Date().toDateString() ? h : `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${h}`; };
const seenBy = m => team().filter(p => p.id !== m.user_id && p.chat_seen_at && p.chat_seen_at >= m.created_at);
function cwShell() {
  const others = team().filter(p => p.id !== S.me.id);
  return `<header class="cw-hd"><div class="sp"><b>Chat da equipe</b><small>${others.map(p => `<span><i class="dot ${isOnline(p) ? 'on' : ''}"></i>${esc(firstName(p.id))} ${isOnline(p) ? 'online' : '· ' + ago(p.last_seen)}</span>`).join('')}</small></div>
      <button class="btn sm ic" data-act="chatToggle" aria-label="Fechar">${ic('x')}</button></header>
    <div class="cw-tabs"><button class="${CW.tab === 'chat' ? 'on' : ''}" data-act="cwTab" data-t="chat">${ic('chat')}Conversa</button><button class="${CW.tab === 'notas' ? 'on' : ''}" data-act="cwTab" data-t="notas">📌 Anotações <span class="muted">${S.d.messages.filter(m => m.pinned).length || ''}</span></button></div>
    <div class="cw-list" id="cwList">${cwList()}</div>
    <form class="cw-form" data-form="${CW.tab === 'chat' ? 'sendMsg' : 'sendNote'}"><textarea id="chatInput" name="text" rows="1" maxlength="4000" placeholder="${CW.tab === 'chat' ? 'Escreva uma mensagem…' : 'Nova anotação importante…'}" required></textarea><button class="btn pri ic" aria-label="Enviar">${ic('send')}</button></form>`;
}
function cwList() {
  if (CW.tab === 'notas') {
    const ns = S.d.messages.filter(m => m.pinned).sort((a, b) => b.created_at.localeCompare(a.created_at));
    return ns.length ? ns.map(m => `<div class="cw-note"><div class="row" style="gap:6px"><b class="small">${esc(firstName(m.user_id))}</b><span class="small muted">${msgTime(m.created_at)}</span><span class="sp"></span><button class="btn sm ic" data-act="msgPin" data-id="${m.id}" title="Tirar das anotações">${ic('x')}</button>${m.user_id === S.me.id || isAdmin() ? `<button class="btn sm ic" data-act="msgDel" data-id="${m.id}" title="Apagar">${ic('trash')}</button>` : ''}</div><p>${esc(m.text)}</p></div>`).join('')
      : `<div class="cw-empty">Nada anotado ainda.<br><span class="small">Escreva abaixo ou toque em 📌 numa mensagem da conversa.</span></div>`;
  }
  const ms = S.d.messages.slice().sort((a, b) => a.created_at.localeCompare(b.created_at)).slice(-150);
  if (!ms.length) return `<div class="cw-empty">Nenhuma mensagem ainda. Diga um oi 👋</div>`;
  let lastDay = ''; const lastMine = [...ms].reverse().find(m => m.user_id === S.me.id);
  return ms.map(m => { const mine = m.user_id === S.me.id, day = (m.created_at || '').slice(0, 10);
    const sep = day !== lastDay ? `<div class="cw-day">${new Date(m.created_at).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</div>` : ''; lastDay = day;
    const sb2 = mine ? seenBy(m) : []; const tick = mine ? (sb2.length ? '<span class="ck2 on" title="Visto">✓✓</span>' : '<span class="ck2" title="Enviado">✓</span>') : '';
    return `${sep}<div class="cw-m ${mine ? 'me' : ''}">${mine ? '' : `<small class="cw-who">${esc(firstName(m.user_id))}</small>`}<div class="cw-b">${esc(m.text)}<span class="cw-t">${msgTime(m.created_at).slice(-5)} ${tick}</span><button class="cw-pin ${m.pinned ? 'on' : ''}" data-act="msgPin" data-id="${m.id}" title="${m.pinned ? 'Tirar das anotações' : 'Guardar nas anotações'}">📌</button></div>${mine && m === lastMine && sb2.length ? `<small class="cw-seen">Visto por ${sb2.map(p => esc(firstName(p.id))).join(', ')} · ${msgTime(sb2.map(p => p.chat_seen_at).sort().pop())}</small>` : ''}</div>`; }).join('');
}
function presenceHtml() {
  return team().map(p => { const on = isOnline(p); return `<span class="pr ${on ? 'on' : ''}" data-act="editProfile" data-id="${p.id}" title="${esc(p.name)} · ${on ? 'online agora' : 'visto ' + ago(p.last_seen)}">${avatar(p, 28)}<span><b>${esc(firstName(p.id))}${p.id === S.me.id ? ' (você)' : ''}</b><small>${on ? 'online' : 'offline · ' + ago(p.last_seen)} · hoje ${fmtDur(timeToday(p.id))}</small></span></span>`; }).join('');
}
const renderPresence = () => { const el = $('#presence'); if (el && S.me) el.innerHTML = presenceHtml(); };
function renderChat(full = false) {
  const box = $('#cw'), fab = $('#cwFab'); if (!box || !S.me) return;
  const n = chatUnread(); if (fab) { fab.classList.toggle('hide', CW.open); fab.querySelector('.badge') && fab.querySelector('.badge').remove(); if (n && !CW.open) fab.insertAdjacentHTML('beforeend', `<span class="badge">${n}</span>`); }
  box.classList.toggle('on', CW.open); if (!CW.open) { box.innerHTML = ''; return; }
  const list = $('#cwList');
  if (full || !list) { const draft = $('#chatInput') && $('#chatInput').value; box.innerHTML = cwShell(); if (draft) $('#chatInput').value = draft; }
  else { const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 60; list.innerHTML = cwList(); if (!atBottom) return markChatSeen(); }
  const l = $('#cwList'); if (l && CW.tab === 'chat') l.scrollTop = l.scrollHeight;
  markChatSeen();
}
async function markChatSeen() {
  if (!CW.open || CW.tab !== 'chat' || document.hidden) return;
  lastChatSeen = new Date().toISOString(); lsSet('bw_chat_seen', lastChatSeen); renderShellBadges();
  const last = S.d.messages.filter(m => m.user_id !== S.me.id).map(m => m.created_at).sort().pop();
  if (!last || (S.me.chat_seen_at && S.me.chat_seen_at >= last) || Date.now() - CW.seenSent < 4000) return;
  CW.seenSent = Date.now(); try { await store.update('profiles', S.me.id, { chat_seen_at: new Date().toISOString() }); } catch {}
}
/* popup na tela (estilo PRIBANK): ícone/foto, título, texto, clique abre o lugar certo */
function popup(title, body = '', { type = '', who = null, route = null, act = null, ms = 7000 } = {}) {
  const el = document.createElement('div'); el.className = 'toast pop ' + type;
  el.innerHTML = `${who ? avatar(prof(who), 34) : `<span class="pop-ic">${ic(type === 'bad' ? 'bell' : type === 'ok' ? 'check' : type === 'chat' ? 'chat' : 'spark')}</span>`}<div class="sp"><b>${esc(title)}</b>${body ? `<span class="small muted">${esc(body)}</span>` : ''}</div><button class="pop-x" aria-label="Fechar">×</button>`;
  el.addEventListener('click', e => { el.remove(); if (e.target.classList.contains('pop-x')) return; if (act) act(); else if (route) location.hash = route; });
  const box = $('#toasts'); box.appendChild(el); while (box.children.length > 4) box.firstChild.remove(); setTimeout(() => el.remove(), ms);
}
const popMsgSeen = new Set();
function popMsgs() {
  const fresh = S.d.messages.filter(m => m.user_id !== S.me.id && m.created_at >= S.startedAt && !popMsgSeen.has(m.id));
  fresh.forEach(m => popMsgSeen.add(m.id));
  if (CW.open && CW.tab === 'chat' && !document.hidden) return;
  fresh.slice(-3).forEach(m => popup(`${firstName(m.user_id)}${m.pinned ? ' anotou' : ''}`, m.text.slice(0, 140), { type: 'chat', who: m.user_id, act: () => { CW.open = true; CW.tab = m.pinned ? 'notas' : 'chat'; lsSet('bw_cw_open', true); renderChat(true); } }));
}
const notifyTeam = (title, body, type = 'info', key = null, route = null) => (S.pendLog = null, notifyUsers)(team().filter(p => p.id !== S.me.id).map(p => p.id), title, body, type, key, route);
/* aviso de versão nova */
function releaseNotice() {
  if (lsGet('bw_version_seen', '') === RELEASE.version) return;
  modal(`Versão ${RELEASE.version}`, `<div style="text-align:center;margin-bottom:14px"><div class="rel-ic">${ic('spark')}</div><p style="font-size:18px;font-weight:700;line-height:1.3">Andrade acabou de atualizar o Bravus Work para a versão ${RELEASE.version}!</p></div>
    <div class="sec" style="margin-top:0">O que mudou</div><ul class="rel">${RELEASE.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>`, { footer: `<span class="sp"></span><button type="button" class="btn pri" data-act="releaseOk">Entendi</button>` });
  if (isAdmin()) notifyTeam(`Andrade atualizou o Bravus Work para a versão ${RELEASE.version}`, RELEASE.notes[0], 'info', `release:${RELEASE.version}`, 'painel');
}
async function checkVersion() {
  try { const r = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' }); if (!r.ok) return; const v = (await r.json()).version;
    if (v && v !== RELEASE.version && !$('#updBar')) document.body.insertAdjacentHTML('beforeend', `<div id="updBar" class="updbar">${ic('spark')}<span>Andrade atualizou o Bravus Work para a versão <b>${esc(v)}</b>.</span><button class="btn sm pri" data-act="updateNow">Atualizar</button></div>`);
  } catch {}
}

