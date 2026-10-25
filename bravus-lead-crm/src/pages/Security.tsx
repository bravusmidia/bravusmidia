import { useEffect, useState } from 'react';
import { ShieldCheck, KeyRound, LogOut, CheckCircle2 } from 'lucide-react';
import { db, getMode, sb, type Row } from '../lib/backend';
import { useApp } from '../lib/session';
import { dateTime } from '../lib/format';
import { Alert, Badge, Button, Card, DataTable, Field, Input, PageHeader, Select, useAction } from '../components/ui';

const TABLES: Record<string, string> = { leads: 'Lead', clients: 'Cliente', sales: 'Venda', payments: 'Pagamento', proposals: 'Proposta', memberships: 'Equipe', invitations: 'Convite', consents: 'Consentimento', suppression_list: 'Supressão', integrations: 'Integração', automations: 'Automação', pipeline_stages: 'Etapa', services: 'Serviço' };
const ACT: Record<string, [string, string]> = { insert: ['Criou', 'green'], update: ['Alterou', 'blue'], delete: ['Excluiu', 'red'] };

export default function Security() {
  const app = useApp();
  const [logs, setLogs] = useState<Row[]>([]);
  const [table, setTable] = useState('');
  useEffect(() => { if (app.can.admin) db.list('audit_logs', { eq: { org_id: app.orgId, ...(table ? { table_name: table } : {}) }, order: ['created_at', false], limit: 500 }).then(setLogs).catch(() => {}); }, [app.orgId, table, app.can.admin]);
  return (
    <div>
      <PageHeader title="Segurança e auditoria" subtitle="Quem mudou o quê, quando — e proteção da sua conta." />
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Mfa />
        <Card title={<span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Proteções ativas</span>}>
          <ul className="space-y-1.5 text-sm">{[
            'Login obrigatório; senhas e sessões gerenciadas pelo Supabase Auth',
            'Cada empresa só enxerga os próprios dados (Row Level Security no banco)',
            'Permissões por papel validadas no servidor, não só na tela',
            'Webhook do WhatsApp com verificação de assinatura (HMAC SHA-256)',
            'Eventos idempotentes: o mesmo evento nunca é processado duas vezes',
            'Tokens da Meta apenas nos secrets do servidor',
            'HTTPS obrigatório e política de segurança de conteúdo (CSP)',
            'Exportações protegidas contra injeção de fórmulas',
            'Mensagens de login genéricas (não revelam se o e-mail existe)',
            'Auditoria automática de alterações críticas',
          ].map((t) => <li key={t} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{t}</li>)}</ul>
          {getMode() === 'supabase' && <Button className="mt-4" variant="secondary" icon={<LogOut className="h-4 w-4" />} onClick={async () => { await sb().auth.signOut({ scope: 'global' }); location.reload(); }}>Sair de todos os dispositivos</Button>}
        </Card>
      </div>
      {app.can.admin ? (
        <Card title="Registro de auditoria" action={<Select className="h-8 w-44 text-xs" value={table} onChange={(e) => setTable(e.target.value)} placeholder="Todas as áreas" options={Object.entries(TABLES).map(([v, l]) => ({ value: v, label: l }))} />} pad={false}>
          <DataTable rows={logs} cols={[
            { key: 'created_at', label: 'Quando', render: (l) => <span className="whitespace-nowrap text-xs">{dateTime(l.created_at)}</span> },
            { key: 'actor', label: 'Quem', render: (l) => (l.actor_id ? app.memberName(l.actor_id) : <Badge>Sistema</Badge>) },
            { key: 'action', label: 'Ação', render: (l) => <Badge tone={ACT[l.action]?.[1]}>{ACT[l.action]?.[0] ?? l.action}</Badge> },
            { key: 'table_name', label: 'Área', render: (l) => TABLES[l.table_name] ?? l.table_name },
            { key: 'changes', label: 'Detalhes', render: (l) => <span className="line-clamp-2 max-w-md font-mono text-[11px] text-ink-soft">{l.action === 'update' ? Object.keys(l.changes ?? {}).join(', ') : (l.changes?.full_name ?? l.changes?.name ?? l.changes?.title ?? l.changes?.email ?? '')}</span> },
          ]} />
        </Card>
      ) : <Alert tone="info">A auditoria é visível para proprietário e administradores.</Alert>}
    </div>
  );
}

function Mfa() {
  const { run, busy, push } = useAction();
  const [factors, setFactors] = useState<Row[]>([]);
  const [enroll, setEnroll] = useState<Row | null>(null);
  const [code, setCode] = useState('');
  const isSb = getMode() === 'supabase';
  const load = async () => { if (!isSb) return; const { data } = await sb().auth.mfa.listFactors(); setFactors(data?.totp ?? []); };
  useEffect(() => { load(); }, []); // eslint-disable-line
  if (!isSb) return <Card title="Verificação em duas etapas"><Alert tone="info">Disponível com o banco real conectado.</Alert></Card>;
  const verified = factors.filter((f) => f.status === 'verified');
  return (
    <Card title={<span className="flex items-center gap-2"><KeyRound className="h-4 w-4" />Verificação em duas etapas (MFA)</span>}>
      {verified.length ? <Alert tone="ok">MFA ativado na sua conta.</Alert> : <Alert tone="warn">Recomendado para proprietário e administradores: proteja a conta com um app autenticador (Google Authenticator, Authy, 1Password).</Alert>}
      {!verified.length && !enroll && <Button className="mt-3" loading={busy} onClick={() => run(async () => {
        for (const f of factors.filter((x) => x.status !== 'verified')) await sb().auth.mfa.unenroll({ factorId: f.id });
        const { data, error } = await sb().auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Bravus Lead' });
        if (error) throw error; setEnroll(data);
      })}>Ativar MFA</Button>}
      {enroll && <div className="mt-3 space-y-3">
        <p className="text-sm">Escaneie o QR code com o app autenticador e digite o código:</p>
        <img src={enroll.totp.qr_code} alt="QR code MFA" className="h-44 w-44 rounded-lg bg-white p-2" />
        <p className="break-all font-mono text-[11px] text-ink-soft">{enroll.totp.secret}</p>
        <Field label="Código de 6 dígitos"><Input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} className="w-40" /></Field>
        <Button loading={busy} onClick={() => run(async () => { const { error } = await sb().auth.mfa.challengeAndVerify({ factorId: enroll.id, code }); if (error) throw new Error('Código inválido'); setEnroll(null); await load(); }, 'MFA ativado')}>Confirmar</Button>
      </div>}
      {verified.length > 0 && <Button className="mt-3" variant="ghost" onClick={() => run(async () => { await sb().auth.mfa.unenroll({ factorId: verified[0].id }); await load(); push('warn', 'MFA desativado'); })}>Desativar MFA</Button>}
    </Card>
  );
}
