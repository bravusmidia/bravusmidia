import { useEffect, useState } from 'react';
import { UserPlus, Mail, ShieldCheck } from 'lucide-react';
import { db, type Row } from '../lib/backend';
import { useApp, ROLE_LABEL, type Role } from '../lib/session';
import { dateTime, initials, relative } from '../lib/format';
import { Alert, Badge, Button, Card, DataTable, Field, Input, Modal, PageHeader, Select, useAction } from '../components/ui';

const ROLE_DESC: Record<Role, string> = {
  owner: 'Tudo, inclusive equipe, integrações e auditoria.',
  admin: 'Tudo, exceto alterar o proprietário.',
  manager: 'Comercial completo + configura funil, serviços, automações e confirma pagamentos.',
  seller: 'Cadastra e atende leads, tarefas, propostas e vendas.',
  viewer: 'Apenas visualiza.',
};

export default function Team() {
  const app = useApp();
  const { run } = useAction();
  const [invites, setInvites] = useState<Row[]>([]);
  const [stats, setStats] = useState<{ tasks: Row[]; leads: Row[] }>({ tasks: [], leads: [] });
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Row | null>(null);
  const load = async () => {
    if (app.can.admin) setInvites(await db.list('invitations', { eq: { org_id: app.orgId }, order: ['created_at', false] }).catch(() => []));
    const [tasks, leads] = await Promise.all([db.list('tasks', { eq: { org_id: app.orgId, status: 'open' } }), db.list('leads', { eq: { org_id: app.orgId } })]);
    setStats({ tasks, leads });
  };
  useEffect(() => { load().catch(() => {}); }, [app.orgId]); // eslint-disable-line

  const pending = invites.filter((i) => !i.accepted_at && !i.revoked_at);
  return (
    <div>
      <PageHeader title="Usuários e equipe" subtitle="Seu time dentro do CRM — cada pessoa com o acesso certo." actions={app.can.admin && <Button icon={<UserPlus className="h-4 w-4" />} onClick={() => setOpen(true)}>Convidar funcionário</Button>} />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {app.members.map((m) => {
          const name = app.memberName(m.user_id);
          const myLeads = stats.leads.filter((l) => l.owner_id === m.user_id && !l.archived_at).length;
          const late = stats.tasks.filter((t) => t.assignee_id === m.user_id && new Date(t.due_at) < new Date()).length;
          return (
            <button key={m.id} onClick={() => app.can.admin && m.user_id !== app.userId && m.role !== 'owner' && setEdit(m)} className="flex items-center gap-3 rounded-xl border border-line bg-white p-4 text-left shadow-card dark:border-white/10 dark:bg-navy-700/60">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-cyan-400 text-sm font-bold text-white">{initials(name)}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2"><span className="truncate font-semibold">{name}</span>{!m.active && <Badge>Inativo</Badge>}</span>
                <span className="block truncate text-xs text-ink-soft">{m.job_title ?? ''} {m.profile?.email ? `· ${m.profile.email}` : ''}</span>
                <span className="mt-1 flex flex-wrap gap-1"><Badge tone={m.role === 'owner' ? 'violet' : m.role === 'admin' ? 'indigo' : 'blue'}>{ROLE_LABEL[m.role as Role]}</Badge><Badge>{myLeads} leads</Badge>{late > 0 && <Badge tone="red">{late} atrasadas</Badge>}</span>
              </span>
            </button>
          );
        })}
      </div>
      {app.can.admin && pending.length > 0 && (
        <Card title="Convites pendentes" pad={false} className="mb-5">
          <DataTable rows={pending} cols={[
            { key: 'email', label: 'E-mail', render: (i) => <span className="flex items-center gap-2"><Mail className="h-4 w-4 text-ink-soft" />{i.email}</span> },
            { key: 'role', label: 'Papel', render: (i) => ROLE_LABEL[i.role as Role] },
            { key: 'created_at', label: 'Enviado', render: (i) => relative(i.created_at) },
            { key: 'x', label: '', render: (i) => <Button size="sm" variant="ghost" className="text-red-600" onClick={() => run(() => db.update('invitations', i.id, { revoked_at: new Date().toISOString() }), 'Convite cancelado').then(load)}>Cancelar</Button> },
          ]} />
        </Card>
      )}
      <Card title={<span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Papéis e permissões</span>}>
        <div className="grid gap-2 sm:grid-cols-2">{(Object.keys(ROLE_DESC) as Role[]).map((r) => <div key={r} className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-white/5"><b>{ROLE_LABEL[r]}</b><div className="text-xs text-ink-soft">{ROLE_DESC[r]}</div></div>)}</div>
        <p className="mt-3 text-xs text-ink-soft">As permissões são garantidas pelo banco de dados (Row Level Security), não só pela tela. Ninguém pode se promover sozinho.</p>
      </Card>
      {open && <InviteModal onClose={() => setOpen(false)} onSaved={load} />}
      {edit && <MemberModal m={edit} onClose={() => setEdit(null)} onSaved={() => { app.reloadOrg(); load(); }} />}
    </div>
  );
}

function InviteModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const app = useApp();
  const { run, busy } = useAction();
  const [f, setF] = useState({ email: '', role: 'seller', job_title: '' });
  const link = location.origin + location.pathname;
  return (
    <Modal open onClose={onClose} title="Convidar funcionário" footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={() => run(async () => {
      const email = f.email.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('E-mail inválido.');
      await db.insert('invitations', { org_id: app.orgId, email, role: f.role, job_title: f.job_title || null, invited_by: app.userId });
    }, 'Convite criado').then((r) => { if (r !== undefined) { onSaved(); onClose(); } })}>Criar convite</Button></>}>
      <div className="grid gap-3">
        <Field label="E-mail do funcionário" required><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Cargo"><Input value={f.job_title} onChange={(e) => setF({ ...f, job_title: e.target.value })} placeholder="Ex.: Comercial, Social media" /></Field>
        <Field label="Papel"><Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} options={(['admin', 'manager', 'seller', 'viewer'] as Role[]).map((r) => ({ value: r, label: `${ROLE_LABEL[r]} — ${ROLE_DESC[r]}` }))} /></Field>
      </div>
      <Alert tone="info" className="mt-4">Depois de criar, envie para a pessoa este link: <b className="break-all">{link}</b>. Ela clica em “Criar conta” com <b>o mesmo e-mail</b>, confirma o e-mail e entra direto na equipe.</Alert>
    </Modal>
  );
}

function MemberModal({ m, onClose, onSaved }: { m: Row; onClose: () => void; onSaved: () => void }) {
  const app = useApp();
  const { run, busy } = useAction();
  const [f, setF] = useState({ role: m.role, job_title: m.job_title ?? '', active: m.active });
  return (
    <Modal open onClose={onClose} title={app.memberName(m.user_id)} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={() => run(() => db.update('memberships', m.id, f), 'Acesso atualizado').then((r) => { if (r !== undefined) { onSaved(); onClose(); } })}>Salvar</Button></>}>
      <div className="grid gap-3">
        <Field label="Cargo"><Input value={f.job_title} onChange={(e) => setF({ ...f, job_title: e.target.value })} /></Field>
        <Field label="Papel"><Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} options={(['admin', 'manager', 'seller', 'viewer'] as Role[]).map((r) => ({ value: r, label: ROLE_LABEL[r] }))} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />Acesso ativo (desmarque para bloquear o acesso desta pessoa)</label>
        <p className="text-xs text-ink-soft">Membro desde {dateTime(m.created_at)}.</p>
      </div>
    </Modal>
  );
}
