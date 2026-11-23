/* =====================================================================
   LAYOUT
   ===================================================================== */
const NAV = [
  ['painel', 'Painel', 'grid'], ['clientes', 'Clientes', 'users'],
  ['financeiro', 'Financeiro', 'wallet', 'fin'], ['agenda', 'Agenda', 'cal'], ['reunioes', 'Reuniões', 'meet'], ['contratos', 'Contratos', 'file'], ['crm', 'CRM', 'funnel', null, 'https://www.bravusmidia.com.br/crm/'], ['metas', 'Metas', 'target'], ['conteudo', 'Conteúdo', 'film'],
  ['equipe', 'Equipe', 'team'], ['alertas', 'Alertas', 'bell'],
  ['ajustes', 'Ajustes', 'gear', 'admin']
];
const navOk = n => !n[3] || (n[3] === 'fin' ? canFin() : isAdmin());
const unread = () => S.d.notifications.filter(n => n.user_id === S.me.id && !n.read).length;
let lastChatSeen = lsGet('bw_chat_seen', '');
const chatUnread = () => S.d.messages.filter(m => m.user_id !== S.me.id && m.created_at > lastChatSeen).length;

function render() {
  if (!S.me) return renderAuth();
  if (!NAV.some(n => n[0] === S.route && navOk(n))) S.route = 'painel';
  const nav = NAV.filter(navOk);
  const badge = k => k === 'alertas' && unread() ? `<span class="badge">${unread()}</span>` : k === 'chat' && chatUnread() ? `<span class="badge">${chatUnread()}</span>` : '';
  $('#app').innerHTML = `<div class="shell">
    <aside class="side">
      <div class="brand"><img src="icons/icon.svg" alt=""><div><b>BRAVUS <span>WORK</span></b><small>Organize. Execute. Evolua.</small></div></div>
      <nav class="nav">${nav.map(n => n[4] ? `<a href="${n[4]}" target="_blank" rel="noopener" title="Abrir o CRM Bravus Lead">${ic(n[2])}${n[1]}<span class="sp"></span><span style="opacity:.45;display:flex;transform:scale(.8)">${ic('ext')}</span></a>` : `<a href="#${n[0]}" class="${S.route === n[0] ? 'on' : ''}">${ic(n[2])}${n[1]}${badge(n[0])}</a>`).join('')}</nav>
      <div class="me"><span data-act="editProfile" data-id="${S.me.id}" style="cursor:pointer" title="Editar meu perfil">${avatar(S.me)}</span><div class="who" data-act="editProfile" data-id="${S.me.id}" style="cursor:pointer" title="Editar meu perfil"><b>${esc(S.me.name)}</b><small>${esc(cargo(S.me))}</small></div><button class="btn sm ic" title="Bloquear" data-act="logout">${ic('lock')}</button></div>
    </aside>
    <main class="main">
      <div class="mtop"><img src="icons/icon.svg" alt=""><b>BRAVUS <span>WORK</span></b><a class="btn sm ic" href="#alertas" style="position:relative">${ic('bell')}${unread() ? `<span class="badge" style="position:absolute;top:-6px;right:-6px">${unread()}</span>` : ''}</a><button class="btn sm ic" data-act="logout" title="Bloquear">${ic('lock')}</button></div>
      <div class="presence" id="presence">${presenceHtml()}</div>
      <div id="view"></div>
    </main>
    <button id="cwFab" class="cw-fab" data-act="chatToggle" aria-label="Chat da equipe">${ic('chat')}</button>
    <section id="cw" class="cw"></section>
    <nav class="bnav">${[['painel', 'Painel', 'grid'], ['clientes', 'Clientes', 'users'], ['agenda', 'Agenda', 'cal'], ['reunioes', 'Reuniões', 'meet']].map(n => `<a href="#${n[0]}" class="${S.route === n[0] ? 'on' : ''}">${ic(n[2])}${n[1]}${badge(n[0])}</a>`).join('')}<button data-act="moreMenu">${ic('more')}Mais</button></nav>
  </div>`;
  renderView(); renderChat(true); fabPlace();
}
/* botão do chat: flutuante e arrastável (posição salva neste aparelho) */
const FAB = { pos: lsGet('bw_fab_pos', null), drag: null, block: false };
function fabLimits() { const m = innerWidth <= 860; return { top: m ? 70 : 16, bottom: innerHeight - 56 - (m ? 76 : 16), side: m ? 12 : 20 }; }
function fabPlace() {
  const f = $('#cwFab'); if (!f || !FAB.pos) return;
  const L = fabLimits(); const y = Math.min(L.bottom, Math.max(L.top, FAB.pos.y * innerHeight));
  f.style.top = y + 'px'; f.style.bottom = 'auto';
  if (FAB.pos.side === 'l') { f.style.left = L.side + 'px'; f.style.right = 'auto'; } else { f.style.right = L.side + 'px'; f.style.left = 'auto'; }
}
addEventListener('resize', fabPlace);
document.addEventListener('pointerdown', e => {
  const f = e.target.closest('#cwFab'); if (!f || (e.button && e.button !== 0)) return;
  const r = f.getBoundingClientRect();
  FAB.drag = { f, id: e.pointerId, sx: e.clientX, sy: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false };
});
document.addEventListener('pointermove', e => {
  const d = FAB.drag; if (!d || e.pointerId !== d.id) return;
  if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 8) return;
  if (!d.moved) { d.moved = true; d.f.classList.add('drag'); try { d.f.setPointerCapture(d.id); } catch {} }
  e.preventDefault();
  const x = Math.min(innerWidth - 56, Math.max(0, e.clientX - d.dx)), y = Math.min(innerHeight - 56, Math.max(0, e.clientY - d.dy));
  Object.assign(d.f.style, { left: x + 'px', top: y + 'px', right: 'auto', bottom: 'auto' });
}, { passive: false });
const fabEnd = e => {
  const d = FAB.drag; if (!d || e.pointerId !== d.id) return; FAB.drag = null;
  if (!d.moved) return;
  d.f.classList.remove('drag'); FAB.block = true; setTimeout(() => { FAB.block = false; }, 350);
  const r = d.f.getBoundingClientRect();
  FAB.pos = { side: r.left + 28 < innerWidth / 2 ? 'l' : 'r', y: r.top / innerHeight }; lsSet('bw_fab_pos', FAB.pos); fabPlace();
};
document.addEventListener('pointerup', fabEnd); document.addEventListener('pointercancel', fabEnd);
document.addEventListener('click', e => { if (FAB.block && e.target.closest('#cwFab')) { e.preventDefault(); e.stopPropagation(); FAB.block = false; } }, true);
/* rolagem no celular: não reconstruir a tela enquanto o dedo está na tela ou a página ainda desliza */
const SCR = { touching: false, last: 0, pending: null };
addEventListener('touchstart', () => { SCR.touching = true; }, { passive: true });
addEventListener('touchend', () => { SCR.touching = false; SCR.last = Date.now(); }, { passive: true });
addEventListener('touchcancel', () => { SCR.touching = false; }, { passive: true });
addEventListener('scroll', () => { SCR.last = Date.now(); }, { passive: true });
const scrollBusy = () => SCR.touching || Date.now() - SCR.last < 900;
function renderViewSoft() {
  if (S.route === 'contratos' && S.docEdit) return; /* não apaga o que está sendo digitado no contrato */
  if (scrollBusy()) { clearTimeout(SCR.pending); SCR.pending = setTimeout(renderViewSoft, 400); return; }
  renderView(true);
}
function renderView(keepScroll) {
  const v = $('#view'); if (!v) return;
  const y = keepScroll ? window.scrollY : 0;
  if (S.route === 'chat') { S.route = 'painel'; history.replaceState(null, '', '#painel'); CW.open = true; CW.tab = 'chat'; lsSet('bw_cw_open', true); setTimeout(() => renderChat(true)); }
  if (!NAV.some(n => n[0] === S.route && navOk(n))) { S.route = 'painel'; if (location.hash !== '#painel') history.replaceState(null, '', '#painel'); }
  const keep = $('#chatInput') && $('#chatInput').value;
  try { v.innerHTML = (V[S.route] || V.painel)(); } catch (e) { console.error(e); v.innerHTML = `<div class="card warnbox">Erro ao montar a tela: ${esc(e.message)}</div>`; }
  if (keepScroll && y) window.scrollTo(0, y);

  document.querySelectorAll('.nav a, .bnav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + S.route));
}
const head = (title, sub = '', actions = '') => `<div class="top"><h1>${esc(title)}${sub ? `<small>${sub}</small>` : ''}</h1>${actions}</div>`;
const kpi = (label, val, sub = '', cls = '', go) => go
  ? `<div class="kpi go ${cls}" role="button" tabindex="0" title="Abrir ${esc(label)}" data-act="kpiGo" data-r="${go[0]}" data-f="${go[1] || ''}" data-s="${go[2] || ''}"><small>${esc(label)}</small><b>${val}</b>${sub ? `<em>${sub}</em>` : ''}<i class="kgo">${ic('right')}</i></div>`
  : `<div class="kpi ${cls}"><small>${esc(label)}</small><b>${val}</b>${sub ? `<em>${sub}</em>` : ''}</div>`;
const empty = t => `<div class="empty">${t}</div>`;

