import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { db, getMode, sb, type Mode, type Row } from './backend';
import { DEMO_ORG, DEMO_USER } from './demo';
import { DEFAULT_INACTIVITY, type Inactivity } from './metrics';

export type Role = 'owner' | 'admin' | 'manager' | 'seller' | 'viewer';
export const ROLE_LABEL: Record<Role, string> = { owner: 'Proprietário', admin: 'Administrador', manager: 'Gerente', seller: 'Vendedor(a)', viewer: 'Somente leitura' };

interface Ctx {
  mode: Mode;
  ready: boolean;
  userId: string | null;
  email: string | null;
  profile: Row | null;
  org: Row | null;
  orgId: string;
  role: Role;
  members: Row[];               // memberships + profile
  stages: Row[];
  services: Row[];
  inactivity: Inactivity;
  can: { write: boolean; manage: boolean; admin: boolean };
  needsOrg: boolean;
  reloadOrg: () => Promise<void>;
  memberName: (id?: string | null) => string;
  theme: 'light' | 'dark' | 'system';
  setTheme: (t: 'light' | 'dark' | 'system') => void;
  signOut: () => Promise<void>;
}

const C = createContext<Ctx>(null as any);
export const useApp = () => useContext(C);

export function AppProvider({ children }: { children: ReactNode }) {
  const mode = getMode();
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Row | null>(null);
  const [org, setOrg] = useState<Row | null>(null);
  const [role, setRole] = useState<Role>('viewer');
  const [members, setMembers] = useState<Row[]>([]);
  const [stages, setStages] = useState<Row[]>([]);
  const [services, setServices] = useState<Row[]>([]);
  const [needsOrg, setNeedsOrg] = useState(false);
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(() => (localStorage.getItem('bravus.lead.theme') as any) || 'system');

  useEffect(() => {
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();
    const mq = matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  const setTheme = (t: 'light' | 'dark' | 'system') => {
    setThemeState(t);
    try { localStorage.setItem('bravus.lead.theme', t); } catch { /* */ }
    if (userId && mode !== 'unconfigured') db.update('profiles', userId, { theme: t }).catch(() => {});
  };

  const loadOrgData = useCallback(async (uid: string) => {
    if (mode === 'supabase') { try { await db.rpc('accept_invitations'); } catch { /* */ } }
    const prof = await db.get('profiles', uid);
    setProfile(prof);
    if (prof?.theme && prof.theme !== theme) { setThemeState(prof.theme); try { localStorage.setItem('bravus.lead.theme', prof.theme); } catch { /* */ } }
    const mine = (await db.list('memberships', { eq: { user_id: uid, active: true } }));
    if (!mine.length) { setNeedsOrg(true); setOrg(null); return; }
    setNeedsOrg(false);
    const m = mine.find((x) => x.org_id === prof?.current_org_id) ?? mine[0];
    const [o, mem, st, sv] = await Promise.all([
      db.get('organizations', m.org_id),
      db.list('memberships', { eq: { org_id: m.org_id } }),
      db.list('pipeline_stages', { eq: { org_id: m.org_id }, order: ['position'] }),
      db.list('services', { eq: { org_id: m.org_id }, order: ['name'] }),
    ]);
    const profs = await db.list('profiles');
    setOrg(o); setRole(m.role); setStages(st); setServices(sv);
    setMembers(mem.map((x) => ({ ...x, profile: profs.find((p) => p.id === x.user_id) ?? null })));
  }, [mode]); // eslint-disable-line

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      if (mode === 'demo') {
        setUserId(DEMO_USER); setEmail('demo@bravus');
        await loadOrgData(DEMO_USER);
        setReady(true);
        return;
      }
      if (mode === 'unconfigured') { setReady(true); return; }
      const { data } = await sb().auth.getSession();
      const u = data.session?.user;
      if (u) { setUserId(u.id); setEmail(u.email ?? null); try { await loadOrgData(u.id); } catch (e) { console.error(e); } }
      setReady(true);
      const { data: sub } = sb().auth.onAuthStateChange(async (ev, session) => {
        if (ev === 'SIGNED_OUT') { setUserId(null); setOrg(null); setProfile(null); }
        if (ev === 'SIGNED_IN' && session?.user) { setUserId(session.user.id); setEmail(session.user.email ?? null); await loadOrgData(session.user.id).catch(console.error); }
      });
      unsub = () => sub.subscription.unsubscribe();
    })();
    return () => unsub();
  }, [mode, loadOrgData]);

  const reloadOrg = useCallback(async () => { if (userId) await loadOrgData(userId); }, [userId, loadOrgData]);

  const value = useMemo<Ctx>(() => {
    const memberName = (id?: string | null) => {
      if (!id) return 'Sem responsável';
      const m = members.find((x) => x.user_id === id);
      return m?.profile?.full_name || m?.profile?.email || 'Membro';
    };
    return {
      mode, ready, userId, email, profile, org, orgId: org?.id ?? (mode === 'demo' ? DEMO_ORG : ''), role, members, stages, services,
      inactivity: { ...DEFAULT_INACTIVITY, ...(org?.settings?.inactivity ?? {}) },
      can: { write: role !== 'viewer', manage: ['owner', 'admin', 'manager'].includes(role), admin: ['owner', 'admin'].includes(role) },
      needsOrg, reloadOrg, memberName, theme, setTheme,
      signOut: async () => { if (mode === 'supabase') { await sb().auth.signOut({ scope: 'local' }); } location.hash = '#/'; location.reload(); },
    };
  }, [mode, ready, userId, email, profile, org, role, members, stages, services, needsOrg, reloadOrg, theme]); // eslint-disable-line

  return <C.Provider value={value}>{children}</C.Provider>;
}

/** Carrega linhas de uma tabela da organização atual. */
export function useRows(table: string, opts: { order?: [string, boolean?]; eq?: Record<string, any>; limit?: number } = {}, deps: unknown[] = []) {
  const { orgId } = useApp();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify(opts);
  const reload = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try { setRows(await db.list(table, { ...opts, eq: { org_id: orgId, ...(opts.eq ?? {}) } })); setError(null); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [table, orgId, key, ...deps]); // eslint-disable-line
  useEffect(() => { reload(); }, [reload]);
  return { rows, setRows, loading, error, reload };
}
