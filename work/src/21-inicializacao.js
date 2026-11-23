/* =====================================================================
   INICIALIZAÇÃO
   ===================================================================== */
(async function boot() {
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  const hashQ = new URLSearchParams(location.hash.replace(/^#/, ''));
  const recovery = hashQ.get('type') === 'recovery', recErr = hashQ.get('error_description');
  if (SUPA) {
    try {
      const { createClient } = window.supabase; /* biblioteca guardada no próprio app (vendor/), sem depender de CDN externo */
      sb = createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
      store = new SupaStore(sb); store.listen();
      const { data } = await sb.auth.getSession();
      if (recErr) { history.replaceState(null, '', location.pathname); return renderRecovery(/expired|invalid/i.test(recErr) ? 'Este link expirou ou já foi usado. Peça um novo ao administrador ou use “esqueci a senha” no login.' : recErr.replace(/\+/g, ' ')); }
      if (recovery && data.session) { history.replaceState(null, '', location.pathname); return renderRecovery(); }
      store.onChange(t => { if (S.me) { clearTimeout(refreshing); refreshing = setTimeout(() => refresh(t), 250); } });
      if (data.session) return startSession(data.session.user.id);
    } catch (e) { $('#app').innerHTML = `<div class="auth"><div class="abox"><img class="logo" src="icons/icon.svg" alt=""><p class="warnbox" style="margin-top:20px">Não foi possível conectar ao servidor. Verifique a internet e tente novamente.</p><button class="btn pri" style="margin-top:14px" data-act="reload">Tentar de novo</button></div></div>`; return; }
  } else {
    store = new LocalStore();
    store.onChange(t => { if (S.me && t !== 'profiles') { clearTimeout(refreshing); refreshing = setTimeout(() => refresh(), 150); } });
    await loadAll();
    const sid = localStorage.getItem('bw_session'); if (sid && prof(sid)) return startSession(sid);
  }
  renderAuth();
})();
