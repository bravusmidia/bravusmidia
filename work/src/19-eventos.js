/* =====================================================================
   EVENTOS GLOBAIS
   ===================================================================== */
let refreshing;
async function refresh(t) { await loadAll(t); if (S.me) { popNew(); popMsgs(); renderShellBadges(); renderPresence(); if (!t || (t !== 'messages' && (t !== 'profiles' || S.route === 'equipe'))) renderViewSoft(); if (!t || ['messages', 'profiles'].includes(t)) renderChat(); } }
function renderShellBadges() { if (!$('.shell')) return render(); const cur = $('.nav'); if (!cur) return; const u = unread(), c = chatUnread();
  document.querySelectorAll('.nav a, .bnav a').forEach(a => { const k = a.getAttribute('href').slice(1); let b = a.querySelector('.badge'); const n = k === 'alertas' ? u : k === 'chat' && S.route !== 'chat' ? c : 0; if (n) { if (!b) { b = document.createElement('span'); b.className = 'badge'; a.appendChild(b); } b.textContent = n; } else if (b) b.remove(); });
  const mb = $('.mtop a[href="#alertas"]'); if (mb) { let b = mb.querySelector('.badge'); if (u) { if (!b) { b = document.createElement('span'); b.className = 'badge'; b.style.cssText = 'position:absolute;top:-6px;right:-6px'; mb.appendChild(b); } b.textContent = u; } else if (b) b.remove(); } }

document.addEventListener('click', e => {
  if (e.target.matches('[data-ov]')) return closeModal();
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = A[el.dataset.act]; if (!fn) return;
  const realLink = el.tagName === 'A' && /^https?:/.test(el.getAttribute('href') || '');
  if (el.tagName === 'A' && el.dataset.act === 'closeModal') { closeModal(); return; }
  if (!realLink) e.preventDefault();
  e.stopPropagation();
  Promise.resolve(fn(el.dataset, el, e)).catch(err => toast('Algo deu errado', err.message, 'bad'));
});
document.addEventListener('submit', e => {
  const f = e.target; const fn = F[f.dataset.form]; if (!fn) return; e.preventDefault();
  if (!f.checkValidity()) { f.reportValidity(); return; }
  const fd = new FormData(f); const btn = f.querySelector('button:not([type=button])'); if (btn) { if (btn.disabled) return; btn.disabled = true; } /* trava o envio duplo */
  Promise.resolve(fn(Object.fromEntries(fd), fd, f)).catch(err => toast('Não foi possível salvar', err.message, 'bad')).finally(() => { if (btn) btn.disabled = false; });
});
/* v2.7.8: bolinha da barra de meta — arrasta para marcar a quantidade rápido */
document.addEventListener('input', e => {
  const r = e.target; if (!r.dataset || !r.dataset.cslide) return;
  const t = S.d.tasks.find(x => x.id === r.dataset.cslide); if (!t) return;
  r.style.setProperty('--p', (r.value / r.max * 100) + '%');
  const b = r.closest('.cnt') && r.closest('.cnt').querySelector('b'); if (b) b.textContent = `${r.value} / ${t.goal}`;
});
document.addEventListener('change', async e => {
  if (e.target.dataset && e.target.dataset.cstep) {
    const t = S.d.tasks.find(x => x.id === e.target.dataset.cstep); if (!t) return;
    const v = Math.max(1, Math.min(9999, Math.round(+e.target.value) || 5)); e.target.value = v; try { localStorage.setItem(cStepKey(t), v); } catch {} return;
  }
  if (e.target.dataset && e.target.dataset.cslide) {
    const t = S.d.tasks.find(x => x.id === e.target.dataset.cslide); if (!t) return;
    const v = +e.target.value - (t.count || 0); if (v) await A.cnt({ id: t.id, v }); return;
  }
  if (e.target.dataset.actChange === 'importCsv') {
    try { const f = e.target.files[0]; if (!f) return; const list = csvToClients(parseCsv(await f.text())); e.target.value = '';
      if (!list.length) throw new Error('Não encontrei a coluna "Nome" na planilha.'); importPreview(list);
    } catch (err) { toast('Não foi possível ler a planilha', err.message, 'bad'); }
    return;
  }
  if (e.target.dataset.actChange === 'setPhoto') {
    const f = e.target.files[0], id = e.target.dataset.id; e.target.value = ''; if (!f) return;
    try {
      const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('Imagem inválida')); i.src = URL.createObjectURL(f); });
      const n = 256, cv = document.createElement('canvas'); cv.width = cv.height = n; const k = Math.min(img.width, img.height);
      cv.getContext('2d').drawImage(img, (img.width - k) / 2, (img.height - k) / 2, k, k, 0, 0, n, n);
      await store.update('profiles', id, { avatar_url: cv.toDataURL('image/jpeg', 0.82) });
      if (id === S.me.id) S.me.avatar_url = cv.toDataURL('image/jpeg', 0.82);
      toast('Foto atualizada', '', 'ok'); await refresh(); renderView(); if (e.target.dataset.reopen) A.editProfile({ id });
    } catch (err) { toast('Não foi possível salvar a foto', err.message, 'bad'); }
    return;
  }
  if (e.target.dataset.actChange === 'restore') {
    try { const j = JSON.parse(await e.target.files[0].text()); if (j.app !== 'bravus-work') throw new Error('Arquivo inválido');
      confirmBox('Restaurar backup?', 'Os dados atuais deste aparelho (exceto senhas) serão substituídos.', 'Restaurar', async () => { const keep = store.db.profiles; store.db = j.data; store.db.profiles = keep.map(p => ({ ...p, ...(j.data.profiles || []).find(x => x.id === p.id), pin_hash: p.pin_hash, salt: p.salt })); store.save('all'); await refresh(); toast('Backup restaurado', '', 'ok'); }, true);
    } catch (err) { toast('Backup inválido', err.message, 'bad'); }
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Enter' && !e.shiftKey && e.target.id === 'chatInput') { e.preventDefault(); e.target.form.requestSubmit(); }
});
addEventListener('hashchange', () => { S.route = (location.hash.replace(/^#\/?/, '') || 'painel').split('?')[0]; if (S.route === 'financeiro' && !S.keepFin) S.finFilter = 'todos'; S.keepFin = false; if (S.me) { closeModal(); renderView(); renderShellBadges(); window.scrollTo(0, 0); } });
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.me) { heartbeat(); refresh(); tick(); } });

