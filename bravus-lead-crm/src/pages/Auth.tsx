import { useState, type ReactNode } from 'react';
import { Database, PlayCircle, LogIn, Building2, KeyRound } from 'lucide-react';
import { saveConfig, sb, setDemo } from '../lib/backend';
import { useApp } from '../lib/session';
import { Alert, Button, Field, Input } from '../components/ui';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05070d] px-4 py-10">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-brand-600/30 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[480px] w-[480px] rounded-full bg-blue-700/30 blur-[120px]" />
      <div className="relative w-full max-w-md">
        <img src="logo-bravus-lead.webp" alt="Bravus Lead" className="mx-auto mb-2 h-40 w-40 rounded-2xl object-cover" />
        <p className="mb-6 text-center text-xs font-medium tracking-widest text-slate-400">CRM COMERCIAL · BRAVUS MÍDIA</p>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-slate-100 shadow-2xl backdrop-blur">{children}</div>
      </div>
    </div>
  );
}

const dark = 'border-white/10 bg-white/5 text-white placeholder:text-slate-500';

export function SetupPage() {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [err, setErr] = useState('');
  return (
    <Shell>
      <h1 className="flex items-center gap-2 font-display text-lg font-bold"><Database className="h-5 w-5 text-sky-400" />Conectar o banco de dados</h1>
      <p className="mt-1 text-sm text-slate-400">Cole os dados do seu projeto Supabase (Project Settings → API). Isso é feito uma única vez por navegador.</p>
      <div className="mt-4 space-y-3">
        <Field label="Project URL"><Input className={dark} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://xxxx.supabase.co" /></Field>
        <Field label="Chave anon / public" hint="Nunca use a chave service_role aqui."><Input className={dark} value={key} onChange={(e) => setKey(e.target.value)} placeholder="eyJhbGciOi…" /></Field>
        {err && <Alert tone="error">{err}</Alert>}
        <Button className="w-full" onClick={() => { try { saveConfig(url, key); location.reload(); } catch (e: any) { setErr(e.message); } }}>Conectar</Button>
      </div>
      <div className="my-5 flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-white/10" />ou<span className="h-px flex-1 bg-white/10" /></div>
      <button className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/15 text-sm font-medium text-white transition hover:bg-white/10" onClick={() => { setDemo(true); location.reload(); }}><PlayCircle className="h-4 w-4" />Conhecer em modo demonstração</button>
      <p className="mt-2 text-center text-[11px] text-slate-500">Demonstração usa dados de exemplo salvos só neste navegador. Nada é enviado.</p>
    </Shell>
  );
}

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [mfa, setMfa] = useState<{ factorId: string } | null>(null);
  const [code, setCode] = useState('');

  const go = async () => {
    setBusy(true); setMsg(null);
    try {
      if (mode === 'login') {
        const { error } = await sb().auth.signInWithPassword({ email: email.trim(), password: pass });
        // mensagem genérica: não revela se o e-mail existe
        if (error) throw new Error(/confirm/i.test(error.message) ? 'Confirme seu e-mail pelo link enviado antes de entrar.' : 'E-mail ou senha incorretos.');
        const { data: aal } = await sb().auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
          const { data: f } = await sb().auth.mfa.listFactors();
          const totp = f?.totp?.[0];
          if (totp) { setMfa({ factorId: totp.id }); return; }
        }
        location.reload();
      } else if (mode === 'signup') {
        if (pass.length < 10) throw new Error('Use uma senha com pelo menos 10 caracteres.');
        const { error } = await sb().auth.signUp({ email: email.trim(), password: pass, options: { data: { full_name: name.trim() }, emailRedirectTo: location.origin + location.pathname } });
        if (error && !/registered/i.test(error.message)) throw new Error(error.message);
        setMsg({ tone: 'ok', text: 'Se o e-mail for válido, você receberá um link de confirmação. Depois de confirmar, volte e entre.' });
        setMode('login');
      } else {
        await sb().auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin + location.pathname + '#/redefinir-senha' });
        setMsg({ tone: 'ok', text: 'Se existir uma conta com este e-mail, enviamos um link para redefinir a senha.' });
      }
    } catch (e: any) { setMsg({ tone: 'error', text: e.message }); }
    finally { setBusy(false); }
  };

  const verifyMfa = async () => {
    setBusy(true);
    try {
      const { error } = await sb().auth.mfa.challengeAndVerify({ factorId: mfa!.factorId, code: code.trim() });
      if (error) throw new Error('Código inválido.');
      location.reload();
    } catch (e: any) { setMsg({ tone: 'error', text: e.message }); } finally { setBusy(false); }
  };

  if (mfa) return (
    <Shell>
      <h1 className="flex items-center gap-2 font-display text-lg font-bold"><KeyRound className="h-5 w-5 text-sky-400" />Verificação em duas etapas</h1>
      <p className="mt-1 text-sm text-slate-400">Digite o código de 6 dígitos do seu aplicativo autenticador.</p>
      <Input className={`${dark} mt-4 text-center text-lg tracking-[0.5em]`} value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} autoFocus />
      {msg && <Alert tone={msg.tone} className="mt-3">{msg.text}</Alert>}
      <Button className="mt-4 w-full" loading={busy} onClick={verifyMfa}>Verificar</Button>
    </Shell>
  );

  return (
    <Shell>
      <h1 className="flex items-center gap-2 font-display text-lg font-bold"><LogIn className="h-5 w-5 text-sky-400" />{mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar conta' : 'Recuperar senha'}</h1>
      <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); go(); }}>
        {mode === 'signup' && <Field label="Seu nome"><Input className={dark} value={name} onChange={(e) => setName(e.target.value)} required /></Field>}
        <Field label="E-mail"><Input className={dark} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
        {mode !== 'reset' && <Field label="Senha"><Input className={dark} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={pass} onChange={(e) => setPass(e.target.value)} required /></Field>}
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <Button className="w-full" loading={busy} type="submit">{mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar conta' : 'Enviar link'}</Button>
      </form>
      <div className="mt-4 flex justify-between text-xs text-slate-400">
        {mode === 'login' ? <button onClick={() => setMode('signup')}>Criar conta</button> : <button onClick={() => setMode('login')}>Já tenho conta</button>}
        {mode === 'login' && <button onClick={() => setMode('reset')}>Esqueci a senha</button>}
      </div>
    </Shell>
  );
}

export function ResetPasswordPage() {
  const [pass, setPass] = useState('');
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  return (
    <Shell>
      <h1 className="font-display text-lg font-bold">Definir nova senha</h1>
      <Input className={`${dark} mt-4`} type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Nova senha (mín. 10 caracteres)" />
      {msg && <Alert tone={msg.tone} className="mt-3">{msg.text}</Alert>}
      <Button className="mt-4 w-full" onClick={async () => {
        if (pass.length < 10) return setMsg({ tone: 'error', text: 'Mínimo de 10 caracteres.' });
        const { error } = await sb().auth.updateUser({ password: pass });
        setMsg(error ? { tone: 'error', text: error.message } : { tone: 'ok', text: 'Senha alterada. Você já pode usar o sistema.' });
        if (!error) setTimeout(() => { location.hash = '#/'; location.reload(); }, 1200);
      }}>Salvar senha</Button>
    </Shell>
  );
}

export function OnboardingPage() {
  const app = useApp();
  const [name, setName] = useState('Bravus Mídia');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Shell>
      <h1 className="flex items-center gap-2 font-display text-lg font-bold"><Building2 className="h-5 w-5 text-sky-400" />Criar sua empresa no CRM</h1>
      <p className="mt-1 text-sm text-slate-400">Você será o proprietário. O funil com 14 etapas, os serviços da Bravus e as automações padrão serão criados automaticamente.</p>
      <Field label="Nome da empresa" className="mt-4"><Input className={dark} value={name} onChange={(e) => setName(e.target.value)} /></Field>
      {err && <Alert tone="error" className="mt-3">{err}</Alert>}
      <Button className="mt-4 w-full" loading={busy} onClick={async () => {
        setBusy(true); setErr('');
        try { await sb().rpc('create_organization', { p_name: name }).then(({ error }) => { if (error) throw error; }); await app.reloadOrg(); }
        catch (e: any) { setErr(e.message); } finally { setBusy(false); }
      }}>Criar empresa</Button>
      <p className="mt-4 text-[11px] text-slate-500">É funcionário(a)? Peça ao proprietário para te convidar em “Usuários e equipe” com este mesmo e-mail ({app.email}) e depois entre novamente.</p>
      <button className="mt-2 text-xs text-slate-400 underline" onClick={app.signOut}>Sair</button>
    </Shell>
  );
}
