/* =====================================================================
   AUTENTICAÇÃO — senha simples (mín. 6 caracteres)
   ===================================================================== */
async function hashPin(pin, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 150000, hash: 'SHA-256' }, key, 256);
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const FAIL_KEY = 'bw_fail';
function lockedFor() { const f = lsGet(FAIL_KEY, { n: 0, until: 0 }); return Math.max(0, f.until - Date.now()); }
function regFail() { const f = lsGet(FAIL_KEY, { n: 0, until: 0 }); f.n++; if (f.n >= 5) { f.until = Date.now() + Math.min(30, 5 * 2 ** (Math.floor(f.n / 5) - 1)) * 60000; } lsSet(FAIL_KEY, f); }
const clearFail = () => lsSet(FAIL_KEY, { n: 0, until: 0 });

const AUTH = { pin: '', user: null, email: lsGet('bw_email', ''), stage: 'pick' };
const appUrl = () => location.origin + location.pathname.replace(/index\.html$/, '');
async function sendReset(email) {
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: appUrl() });
  if (error) throw new Error(/rate|seconds/i.test(error.message) ? 'Aguarde um minuto antes de pedir outro link.' : error.message);
}
function renderRecovery(err = '') {
  $('#app').innerHTML = `<div class="auth"><div class="abox"><img class="logo" src="icons/icon.svg" alt="Bravus Work"><h1>BRAVUS <span>WORK</span></h1><p class="slogan">Crie sua nova senha</p>
    ${err ? `<p class="warnbox" style="margin:16px 0">${esc(err)}</p><button class="btn pri" data-act="recoveryBack">Voltar ao login</button>` : `<form data-form="recoverySave" class="f" style="text-align:left;margin-top:16px">
      ${fld('Nova senha (mín. 6 caracteres)', 'pin', '', 'password', 'minlength="6" required autocomplete="new-password"')}${fld('Repita a nova senha', 'pin2', '', 'password', 'minlength="6" required autocomplete="new-password"')}
      <button class="btn pri">Salvar e entrar</button></form>`}</div></div>`;
}
function renderAuth(lockMsg = '') {
  const app = $('#app'); const locals = SUPA ? [] : S.d.profiles;
  if (!SUPA && !locals.length) return renderSetup();
  if (SUPA && !AUTH.email) AUTH.stage = 'email';
  const brand = `<img class="logo" src="icons/icon.svg" alt="Bravus Work"><h1>BRAVUS <span>WORK</span></h1><p class="slogan">Organize. Execute. Evolua.</p>`;
  let body = '';
  if (SUPA && AUTH.stage === 'email') {
    body = `<form data-form="authEmail" class="f" style="text-align:left">${fld('E-mail de acesso', 'email', AUTH.email, 'email', 'required autocomplete="username"')}<button class="btn pri">Continuar</button></form>`;
  } else {
    if (!SUPA && !AUTH.user && locals.length === 1) AUTH.user = locals[0].id;
    const users = SUPA ? `<p class="muted small">${esc(AUTH.email)} · <a href="#" data-act="authChangeEmail">trocar</a> · <a href="#" data-act="forgotPw">esqueci a senha</a></p>`
      : `<div class="users">${locals.map(p => `<button type="button" class="${AUTH.user === p.id ? 'on' : ''}" data-act="authPick" data-id="${p.id}">${avatar(p, 54)}<b>${esc(p.name.split(' ')[0])}</b><small class="muted">${esc(cargo(p))}</small></button>`).join('')}</div>`;
    const lk = lockedFor();
    body = `${users}${lockMsg ? `<p class="small" style="margin-top:10px;color:var(--warn)">${esc(lockMsg)}</p>` : ''}
      ${lk ? `<div class="warnbox" style="margin-top:16px">Muitas tentativas. Aguarde ${Math.ceil(lk / 60000)} min.</div>` : (AUTH.user || SUPA) ? `
      <form data-form="login" class="f" style="text-align:left;margin-top:16px">
        <label class="fl">Senha<input type="password" name="pw" id="pw" required minlength="6" autocomplete="current-password" autocapitalize="none" autocorrect="off" spellcheck="false"></label>
        <button class="btn pri">Entrar</button>
      </form>` : `<p class="muted small" style="margin-top:14px">Escolha seu usuário</p>`}`;
  }
  app.innerHTML = `<div class="auth"><div class="abox">${brand}${body}<p class="mode">${SUPA ? '🔒 Conexão segura · Supabase' : 'Modo local · dados apenas neste aparelho'} · v${VERSION}</p></div></div>`;
  const pw = $('#pw'); if (pw) pw.focus();
}
function renderSetup() {
  $('#app').innerHTML = `<div class="auth"><div class="abox" style="max-width:460px;text-align:left">
    <div style="text-align:center"><img class="logo" src="icons/icon.svg" alt=""><h1>BRAVUS <span>WORK</span></h1><p class="slogan">Primeiro acesso — criar a equipe</p></div>
    <form data-form="setup" class="f card">
      <b>Administrador</b>
      <div class="f2">${fld('Nome', 'a_name', 'Andrade', 'text', 'required')}${fld('Senha (mín. 6 caracteres)', 'a_pin', '', 'password', 'minlength="6" required autocomplete="new-password" autocapitalize="none" spellcheck="false"')}</div>
      <b style="margin-top:6px">Comercial / co-founder</b>
      <div class="f2">${fld('Nome', 'p_name', 'Priscila', 'text', 'required')}${fld('Senha (mín. 6 caracteres)', 'p_pin', '', 'password', 'minlength="6" required autocomplete="new-password" autocapitalize="none" spellcheck="false"')}</div>
      <p class="note">Pode usar letras minúsculas, números e símbolos (ex.: bravus#2026). As senhas ficam guardadas criptografadas.</p>
      <button class="btn pri">Criar e entrar</button>
    </form></div></div>`;
}
const WEAK = ['000000', '111111', '123456', '654321', '121212', '112233', '123123', '999999', '222222', 'senha1', 'senha123', '1234567', '12345678', 'abcdef', 'qwerty', 'bravus'];
async function tryLogin() {
  const pin = AUTH.pin; AUTH.pin = '';
  if (lockedFor()) return renderAuth();
  try {
    if (SUPA) {
      const { data, error } = await sb.auth.signInWithPassword({ email: AUTH.email, password: pin });
      if (error) throw error;
      await startSession(data.user.id);
    } else {
      const p = S.d.profiles.find(x => x.id === AUTH.user);
      if (!p || await hashPin(pin, p.salt) !== p.pin_hash) throw new Error('Senha incorreta');
      localStorage.setItem('bw_session', p.id);
      await startSession(p.id);
    }
    clearFail();
  } catch (e) {
    regFail(); renderAuth(lockedFor() ? '' : 'Senha incorreta. Tente novamente.');
  }
}

