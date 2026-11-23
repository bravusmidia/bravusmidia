/* =====================================================================
   SESSÃO
   ===================================================================== */
let timers = [];
async function startSession(userId) {
  await loadAll();
  const me = prof(userId);
  if (!me) { toast('Perfil não encontrado', 'Peça ao administrador para concluir seu cadastro.', 'bad'); if (SUPA) await sb.auth.signOut(); return renderAuth(); }
  if (me.role === 'cliente') { toast('Área do cliente em breve', 'Este acesso é da equipe Bravus.', 'warn'); if (SUPA) await sb.auth.signOut(); return renderAuth(); }
  S.me = me; S.agendaWho = me.id; S.startedAt = new Date().toISOString();
  if (isAdmin() && !S.d.tasks.some(t => t.is_template)) {
    const pri = team().find(p => p.role === 'comercial');
    for (const t of defaultTemplates(me.id, pri && pri.id)) S.d.tasks.push(await store.insert('tasks', t));
    if (!S.d.settings.length) await store.upsertSettings(S.set);
  }
  if (isAdmin()) try { const n = await genMonthInvoices(curYM()); if (n) { await log(`Gerou ${n} mensalidade(s) de ${curYM()} automaticamente`); await loadAll('invoices'); } } catch (e) { console.warn('auto mensalidades', e); }
  await heartbeat(); await log('Entrou no app'); setTimeout(() => syncMetrics(), 6000);
  S.route = (location.hash.replace(/^#\/?/, '') || 'painel').split('?')[0];
  render(); tick(); setTimeout(releaseNotice, 800); checkVersion(); setTimeout(() => pushSubscribe(), 2500);
  timers.forEach(clearInterval);
  timers = [setInterval(tick, 60000), setInterval(heartbeat, 45000), setInterval(checkVersion, 30 * 60000), setInterval(() => { if (!document.hidden && !$('#modal-root').innerHTML && ['painel', 'equipe'].includes(S.route)) renderViewSoft(); if (CW.open) renderChat(); renderPresence(); }, 30000)];
  armLock();
}
async function logout(silent) {
  if (S.me) { try { await store.update('profiles', S.me.id, { last_seen: new Date(Date.now() - 300000).toISOString() }); } catch {} }
  timers.forEach(clearInterval); timers = []; S.me = null; localStorage.removeItem('bw_session');
  if (SUPA) await sb.auth.signOut();
  AUTH.pin = ''; closeModal(); renderAuth(silent ? 'Bloqueado por inatividade.' : '');
}
let lockT;
function armLock() {
  clearTimeout(lockT);
  if (!S.me) return;
  const mins = S.set.lock_v2 ? +S.set.lock_minutes || 0 : 0; // 0 = nunca bloqueia sozinho (padrão: continua conectado)
  if (!mins) return;
  lockT = setTimeout(() => logout(true), mins * 60000);
}
['click', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, () => S.me && armLock(), { passive: true }));

