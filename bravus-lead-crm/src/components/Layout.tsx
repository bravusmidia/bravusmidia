import clsx from 'clsx';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, KanbanSquare, MessagesSquare, CalendarClock, Target, Contact, Briefcase, FileSignature, Package,
  FolderUp, BarChart3, Workflow, UsersRound, Plug, ShieldCheck, Settings, Search, Bell, Plus, Menu, X, Sun, Moon, Monitor, LogOut, ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import { useApp, ROLE_LABEL } from '../lib/session';
import { db, setDemo, type Row } from '../lib/backend';
import { relative, initials } from '../lib/format';
import { Input } from './ui';

export const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/funil', label: 'Funil de vendas', icon: KanbanSquare },
  { to: '/caixa-de-entrada', label: 'Caixa de entrada', icon: MessagesSquare },
  { to: '/follow-ups', label: 'Follow-ups', icon: CalendarClock },
  { to: '/prospeccao', label: 'Prospecção', icon: Target },
  { to: '/contatos-whatsapp', label: 'Contatos do WhatsApp', icon: Contact },
  { to: '/clientes', label: 'Clientes', icon: Briefcase },
  { to: '/vendas', label: 'Propostas e vendas', icon: FileSignature },
  { to: '/servicos', label: 'Serviços e produtos', icon: Package },
  { to: '/importacoes', label: 'Arquivos e importações', icon: FolderUp },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/automacoes', label: 'Automações', icon: Workflow },
  { to: '/equipe', label: 'Usuários e equipe', icon: UsersRound },
  { to: '/integracoes', label: 'Integrações', icon: Plug },
  { to: '/seguranca', label: 'Segurança e auditoria', icon: ShieldCheck },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];
const GROUPS = [
  { label: 'Comercial', items: NAV.slice(0, 7) },
  { label: 'Negócios', items: NAV.slice(7, 12) },
  { label: 'Gestão', items: NAV.slice(12) },
];

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img src="mark.png" alt="" className="h-9 w-9 shrink-0 rounded-lg ring-1 ring-white/10" />
      {!compact && (
        <div className="leading-tight">
          <div className="font-display text-[15px] font-extrabold tracking-[0.08em] text-white">BRAVUS <span className="text-sky-400">LEAD</span></div>
          <div className="text-[10px] font-medium text-slate-400">CRM Comercial | Bravus Mídia</div>
        </div>
      )}
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const app = useApp();
  const loc = useLocation();
  const nav = useNavigate();
  const [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('bravus.lead.collapsed') === '1');
  const [search, setSearch] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [quick, setQuick] = useState(false);
  const [notifs, setNotifs] = useState<Row[]>([]);

  useEffect(() => setMobile(false), [loc.pathname]);
  useEffect(() => { try { localStorage.setItem('bravus.lead.collapsed', collapsed ? '1' : '0'); } catch { /* */ } }, [collapsed]);

  const loadNotifs = async () => {
    if (!app.userId || !app.orgId) return;
    try { setNotifs(await db.list('notifications', { eq: { user_id: app.userId }, order: ['created_at', false], limit: 30 })); } catch { /* */ }
  };
  useEffect(() => {
    loadNotifs();
    if (app.orgId) db.rpc('scan_overdue_tasks', { p_org: app.orgId }).then(loadNotifs).catch(() => {});
    const i = setInterval(loadNotifs, 60000);
    return () => clearInterval(i);
  }, [app.userId, app.orgId]); // eslint-disable-line

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch(true); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const unread = notifs.filter((n) => !n.read_at).length;
  const current = NAV.find((n) => (n.to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(n.to)));

  const sidebar = (isMobile: boolean) => (
    <div className="flex h-full flex-col bg-navy-900 text-slate-300">
      <div className={clsx('flex h-16 items-center border-b border-white/5', collapsed && !isMobile ? 'justify-center px-2' : 'justify-between px-4')}>
        <Logo compact={collapsed && !isMobile} />
        {isMobile && <button onClick={() => setMobile(false)} className="rounded-lg p-1.5 hover:bg-white/10" aria-label="Fechar menu"><X className="h-5 w-5" /></button>}
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {GROUPS.map((g) => (
          <div key={g.label} className="mb-3">
            {!(collapsed && !isMobile) && <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{g.label}</div>}
            {g.items.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/'} title={label}
                className={({ isActive }) => clsx('group mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition',
                  collapsed && !isMobile && 'justify-center px-2',
                  isActive ? 'bg-brand-600/15 text-white shadow-[inset_2px_0_0_#22D3EE]' : 'hover:bg-white/5 hover:text-white')}>
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!(collapsed && !isMobile) && <span className="truncate">{label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      {!isMobile && (
        <button onClick={() => setCollapsed(!collapsed)} className="flex items-center justify-center gap-2 border-t border-white/5 py-3 text-xs text-slate-500 hover:text-white">
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Recolher menu</>}
        </button>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-canvas dark:bg-navy-900">
      <aside className={clsx('fixed inset-y-0 left-0 z-30 hidden transition-all lg:block', collapsed ? 'w-[72px]' : 'w-64')}>{sidebar(false)}</aside>
      {mobile && <div className="fixed inset-0 z-40 lg:hidden"><div className="absolute inset-0 bg-black/50" onClick={() => setMobile(false)} /><div className="relative h-full w-72">{sidebar(true)}</div></div>}

      <div className={clsx('flex min-w-0 flex-1 flex-col transition-all', collapsed ? 'lg:pl-[72px]' : 'lg:pl-64')}>
        {app.mode === 'demo' && (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-400 px-4 py-1.5 text-center text-xs font-semibold text-amber-950">
            MODO DEMONSTRAÇÃO — dados de exemplo, salvos só neste navegador. Nada é enviado ao WhatsApp.
            <button className="underline" onClick={() => { setDemo(false); location.hash = '#/'; location.reload(); }}>Sair da demonstração</button>
          </div>
        )}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-line bg-white/85 px-3 backdrop-blur sm:px-5 dark:border-white/10 dark:bg-navy-800/85">
          <button className="rounded-lg p-2 text-ink-soft hover:bg-slate-100 lg:hidden dark:hover:bg-white/10" onClick={() => setMobile(true)} aria-label="Abrir menu"><Menu className="h-5 w-5" /></button>
          <div className="hidden min-w-0 text-sm font-semibold text-ink md:block dark:text-white">{current?.label}</div>
          <button onClick={() => setSearch(true)} className="ml-auto flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-canvas px-3 text-sm text-ink-soft hover:border-brand-200 sm:max-w-sm md:ml-6 dark:border-white/10 dark:bg-white/5">
            <Search className="h-4 w-4 shrink-0" /><span className="truncate">Buscar lead, cliente, telefone…</span><kbd className="ml-auto hidden rounded border border-line px-1.5 text-[10px] sm:block dark:border-white/10">Ctrl K</kbd>
          </button>
          <div className="relative">
            <button onClick={() => setQuick(!quick)} className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white hover:bg-brand-700" aria-label="Ações rápidas"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Novo</span></button>
            {quick && (
              <Menu2 onClose={() => setQuick(false)}>
                {[['Novo lead', '/leads?novo=1'], ['Nova tarefa de follow-up', '/follow-ups?novo=1'], ['Nova prospecção', '/prospeccao?novo=1'], ['Nova proposta', '/vendas?novo=proposta'], ['Importar contatos', '/importacoes']].map(([l, to]) => (
                  <button key={to} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-white/10" onClick={() => { setQuick(false); nav(to); }}>{l}</button>
                ))}
              </Menu2>
            )}
          </div>
          <div className="relative">
            <button onClick={() => setNotifOpen(!notifOpen)} className="relative rounded-lg p-2 text-ink-soft hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10" aria-label="Notificações">
              <Bell className="h-5 w-5" />{unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread}</span>}
            </button>
            {notifOpen && (
              <Menu2 onClose={() => setNotifOpen(false)} wide>
                <div className="flex items-center justify-between px-3 py-2"><span className="text-sm font-semibold">Notificações</span>
                  {unread > 0 && <button className="text-xs text-brand-600" onClick={async () => { await Promise.all(notifs.filter((n) => !n.read_at).map((n) => db.update('notifications', n.id, { read_at: new Date().toISOString() }))); loadNotifs(); }}>Marcar como lidas</button>}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifs.length === 0 && <p className="px-3 py-6 text-center text-sm text-ink-soft">Sem notificações.</p>}
                  {notifs.map((n) => (
                    <button key={n.id} onClick={async () => { if (!n.read_at) await db.update('notifications', n.id, { read_at: new Date().toISOString() }); setNotifOpen(false); loadNotifs(); if (n.link) nav(n.link); }}
                      className={clsx('block w-full border-t border-line px-3 py-2 text-left hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5', !n.read_at && 'bg-brand-50/60 dark:bg-brand-500/10')}>
                      <div className="text-sm font-medium">{n.title}</div>
                      <div className="truncate text-xs text-ink-soft">{n.body} · {relative(n.created_at)}</div>
                    </button>
                  ))}
                </div>
              </Menu2>
            )}
          </div>
          <UserMenu />
        </header>
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
      {search && <GlobalSearch onClose={() => setSearch(false)} />}
    </div>
  );
}

function Menu2({ children, onClose, wide }: { children: ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className={clsx('absolute right-0 z-40 mt-2 rounded-xl border border-line bg-white p-1 text-ink shadow-pop dark:border-white/10 dark:bg-navy-800 dark:text-slate-100', wide ? 'w-80' : 'w-60')}>{children}</div>
    </>
  );
}

function UserMenu() {
  const app = useApp();
  const [open, setOpen] = useState(false);
  const name = app.profile?.full_name || app.email || 'Usuário';
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Perfil">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-cyan-400 text-xs font-bold text-white">{initials(name)}</span>
      </button>
      {open && (
        <Menu2 onClose={() => setOpen(false)}>
          <div className="px-3 py-2"><div className="truncate text-sm font-semibold">{name}</div><div className="text-xs text-ink-soft">{ROLE_LABEL[app.role]} · {app.org?.name}</div></div>
          <div className="my-1 border-t border-line dark:border-white/10" />
          <div className="flex gap-1 px-2 py-1">
            {([['light', Sun, 'Claro'], ['dark', Moon, 'Escuro'], ['system', Monitor, 'Auto']] as const).map(([v, Icon, l]) => (
              <button key={v} onClick={() => app.setTheme(v)} className={clsx('flex flex-1 flex-col items-center gap-1 rounded-md py-2 text-[11px]', app.theme === v ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-white' : 'hover:bg-slate-100 dark:hover:bg-white/10')}><Icon className="h-4 w-4" />{l}</button>
            ))}
          </div>
          <div className="my-1 border-t border-line dark:border-white/10" />
          <button onClick={app.signOut} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"><LogOut className="h-4 w-4" />Sair</button>
        </Menu2>
      )}
    </div>
  );
}

function GlobalSearch({ onClose }: { onClose: () => void }) {
  const { orgId } = useApp();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [data, setData] = useState<{ leads: Row[]; clients: Row[] }>({ leads: [], clients: [] });
  useEffect(() => { (async () => setData({ leads: await db.list('leads', { eq: { org_id: orgId } }), clients: await db.list('clients', { eq: { org_id: orgId } }) }))().catch(() => {}); }, [orgId]);
  const res = useMemo(() => {
    const s = q.trim().toLowerCase(); const digits = s.replace(/\D/g, '');
    if (s.length < 2) return [];
    const hit = (r: Row, ...f: string[]) => f.some((k) => String(r[k] ?? '').toLowerCase().includes(s)) || (digits.length >= 4 && String(r.phone_e164 ?? '').includes(digits)) || (Array.isArray(r.tags) && r.tags.some((t: string) => t.toLowerCase().includes(s)));
    return [
      ...data.leads.filter((r) => hit(r, 'full_name', 'company', 'email', 'source')).slice(0, 8).map((r) => ({ type: 'Lead', title: r.full_name, sub: r.company, to: `/leads?id=${r.id}` })),
      ...data.clients.filter((r) => hit(r, 'name', 'company', 'email')).slice(0, 5).map((r) => ({ type: 'Cliente', title: r.name, sub: r.company, to: `/clientes?id=${r.id}` })),
      ...NAV.filter((n) => n.label.toLowerCase().includes(s)).map((n) => ({ type: 'Página', title: n.label, sub: '', to: n.to })),
    ];
  }, [q, data]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-navy-900/50 p-4 pt-[10vh] backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-pop dark:bg-navy-800">
        <div className="flex items-center gap-2 border-b border-line px-4 dark:border-white/10"><Search className="h-4 w-4 text-ink-soft" />
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, empresa, telefone, e-mail, etiqueta…" className="border-0 shadow-none focus:ring-0 dark:bg-transparent" onKeyDown={(e) => e.key === 'Escape' && onClose()} />
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {q.length >= 2 && res.length === 0 && <p className="py-8 text-center text-sm text-ink-soft">Nenhum resultado.</p>}
          {res.map((r, i) => (
            <button key={i} onClick={() => { onClose(); nav(r.to); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-white/10">
              <span className="w-14 shrink-0 text-[11px] font-medium text-ink-soft">{r.type}</span>
              <span className="min-w-0"><span className="block truncate text-sm font-medium dark:text-white">{r.title}</span>{r.sub && <span className="block truncate text-xs text-ink-soft">{r.sub}</span>}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
