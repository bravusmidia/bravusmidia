import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { Send, FileText, ArrowLeft, Check, CheckCheck, AlertCircle, Clock, UserCheck, ShieldAlert, MessageCircle } from 'lucide-react';
import { db, getMode, sb, type Row } from '../lib/backend';
import { useApp } from '../lib/session';
import { dateTime, relative } from '../lib/format';
import { formatPhone, whatsappLink } from '../lib/phone';
import { decideSend, windowRemaining } from '../../supabase/functions/_shared/policy';
import { Alert, Badge, Button, Card, Empty, Input, PageHeader, Select, Spinner, Textarea, useAction } from '../components/ui';
import { StageBadge } from '../components/leads';

export default function Inbox() {
  const app = useApp();
  const [params, setParams] = useSearchParams();
  const [convs, setConvs] = useState<Row[] | null>(null);
  const [leads, setLeads] = useState<Row[]>([]);
  const [integ, setInteg] = useState<Row | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const sel = params.get('c');

  const load = async () => {
    const [c, l, i] = await Promise.all([
      db.list('conversations', { eq: { org_id: app.orgId }, order: ['updated_at', false] }),
      db.list('leads', { eq: { org_id: app.orgId } }),
      db.list('integrations', { eq: { org_id: app.orgId } }),
    ]);
    setConvs(c); setLeads(l); setInteg(i[0] ?? null);
    const leadParam = params.get('lead');
    if (leadParam && !sel) { const found = c.find((x) => x.lead_id === leadParam); if (found) setParams({ c: found.id }); }
  };
  useEffect(() => {
    load().catch(() => setConvs([]));
    if (getMode() !== 'supabase') return;
    const ch = sb().channel('inbox-' + app.orgId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `org_id=eq.${app.orgId}` }, () => load())
      .subscribe();
    return () => { sb().removeChannel(ch); };
  }, [app.orgId]); // eslint-disable-line

  const leadOf = (c: Row) => leads.find((l) => l.id === c.lead_id);
  const list = useMemo(() => (convs ?? []).filter((c) => {
    const l = leadOf(c);
    if (filter === 'unread' && !c.unread_count) return false;
    if (filter === 'reply' && !(c.last_inbound_at && (!c.last_outbound_at || c.last_inbound_at > c.last_outbound_at))) return false;
    if (filter === 'mine' && c.assigned_to !== app.userId) return false;
    if (filter === 'window' && windowRemaining(c.last_inbound_at, new Date()) <= 0) return false;
    const s = q.toLowerCase();
    return !s || `${c.contact_name ?? ''} ${l?.full_name ?? ''} ${l?.company ?? ''} ${c.phone_e164}`.toLowerCase().includes(s);
  }), [convs, leads, q, filter]); // eslint-disable-line

  const current = (convs ?? []).find((c) => c.id === sel);
  const leadForNew = params.get('lead') && !current ? leads.find((l) => l.id === params.get('lead')) : null;

  return (
    <div>
      <PageHeader title="Caixa de entrada" subtitle="Conversas do WhatsApp recebidas pela API oficial da Meta." />
      {integ?.mode !== 'live' && (
        <Alert tone={integ?.mode === 'demo' ? 'warn' : 'info'} className="mb-4">
          {integ?.mode === 'demo' ? 'Integração em MODO DEMONSTRAÇÃO: nenhuma mensagem é enviada de verdade' : 'O WhatsApp oficial ainda não está conectado. As conversas aparecem aqui depois de configurar em '}
          {integ?.mode !== 'demo' && <Link to="/integracoes" className="font-semibold underline">Integrações</Link>}.
        </Alert>
      )}
      <div className="grid h-[calc(100vh-230px)] min-h-[520px] grid-cols-1 overflow-hidden rounded-xl border border-line bg-white shadow-card md:grid-cols-[320px_1fr] dark:border-white/10 dark:bg-navy-800">
        <div className={clsx('flex min-h-0 flex-col border-r border-line dark:border-white/10', (sel || leadForNew) && 'hidden md:flex')}>
          <div className="space-y-2 border-b border-line p-3 dark:border-white/10">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar conversa…" type="search" />
            <Select value={filter} onChange={(e) => setFilter(e.target.value)} options={[{ value: 'all', label: 'Todas' }, { value: 'reply', label: 'Precisam de resposta' }, { value: 'unread', label: 'Não lidas' }, { value: 'window', label: 'Janela de 24h aberta' }, { value: 'mine', label: 'Atribuídas a mim' }]} />
          </div>
          <div className="flex-1 overflow-y-auto">
            {convs === null ? <Spinner /> : list.length === 0 ? <Empty title="Nenhuma conversa" text="Quando um contato escrever para o número oficial, a conversa aparece aqui." /> : list.map((c) => {
              const l = leadOf(c);
              const open = windowRemaining(c.last_inbound_at, new Date()) > 0;
              return (
                <button key={c.id} onClick={() => setParams({ c: c.id })} className={clsx('flex w-full gap-3 border-b border-line/70 px-3 py-3 text-left hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5', sel === c.id && 'bg-brand-50 dark:bg-brand-500/10')}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"><MessageCircle className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold">{l?.full_name ?? c.contact_name ?? formatPhone(c.phone_e164)}</span><span className="shrink-0 text-[10px] text-ink-soft">{relative(c.updated_at)}</span></span>
                    <span className="block truncate text-xs text-ink-soft">{c.last_message_preview}</span>
                    <span className="mt-1 flex gap-1">{c.unread_count > 0 && <Badge tone="green">{c.unread_count} nova(s)</Badge>}{open ? <Badge tone="cyan">Janela aberta</Badge> : <Badge>Janela fechada</Badge>}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className={clsx('min-h-0', !(sel || leadForNew) && 'hidden md:block')}>
          {current ? <Thread key={current.id} conv={current} lead={leadOf(current)} integ={integ} onBack={() => setParams({})} onChange={load} />
            : leadForNew ? <Thread key={leadForNew.id} conv={null} lead={leadForNew} integ={integ} onBack={() => setParams({})} onChange={load} />
            : <Empty title="Selecione uma conversa" text="Escolha uma conversa à esquerda para ver o histórico e responder." />}
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ s }: { s: string }) {
  if (s === 'read') return <CheckCheck className="h-3.5 w-3.5 text-sky-400" />;
  if (s === 'delivered') return <CheckCheck className="h-3.5 w-3.5" />;
  if (s === 'sent') return <Check className="h-3.5 w-3.5" />;
  if (s === 'failed') return <AlertCircle className="h-3.5 w-3.5 text-red-400" />;
  return <Clock className="h-3.5 w-3.5" />;
}

function Thread({ conv, lead, integ, onBack, onChange }: { conv: Row | null; lead?: Row; integ: Row | null; onBack: () => void; onChange: () => void }) {
  const app = useApp();
  const { run, busy, push } = useAction();
  const [msgs, setMsgs] = useState<Row[]>([]);
  const [templates, setTemplates] = useState<Row[]>([]);
  const [text, setText] = useState('');
  const [tpl, setTpl] = useState('');
  const [vars, setVars] = useState<string[]>([]);
  const [suppressed, setSuppressed] = useState(false);
  const [now, setNow] = useState(new Date());
  const end = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (conv) setMsgs(await db.list('messages', { eq: { conversation_id: conv.id }, order: ['created_at', true] }));
    setTemplates(await db.list('message_templates', { eq: { org_id: app.orgId } }));
    const phone = conv?.phone_e164 ?? lead?.phone_e164;
    if (phone) setSuppressed((await db.list('suppression_list', { eq: { org_id: app.orgId, phone_e164: phone } })).length > 0);
    if (conv?.unread_count) await db.update('conversations', conv.id, { unread_count: 0 }).catch(() => {});
  };
  useEffect(() => {
    load().catch(() => {});
    const t = setInterval(() => setNow(new Date()), 30000);
    if (getMode() !== 'supabase' || !conv) return () => clearInterval(t);
    const ch = sb().channel('msgs-' + conv.id).on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conv.id}` }, () => load()).subscribe();
    return () => { clearInterval(t); sb().removeChannel(ch); };
  }, [conv?.id]); // eslint-disable-line
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs.length]);

  const template = templates.find((t) => t.name === tpl);
  const remaining = windowRemaining(conv?.last_inbound_at ?? null, now);
  const base = {
    now, lastInboundAt: conv?.last_inbound_at ?? null, suppressed: suppressed || !!lead?.opted_out, consentStatus: lead?.consent_status ?? 'unknown',
    integrationMode: integ?.mode ?? 'disabled', sentLastMinuteOrg: 0, templatesTodayOrg: 0, lastTemplateToContactAt: null,
    limits: { max_per_minute: 20, max_per_day: 200, quiet_start: '21:00', quiet_end: '08:00', ...(app.org?.settings?.whatsapp ?? {}) },
    localHour: new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Fortaleza', hour: '2-digit', minute: '2-digit', hour12: false }).format(now),
  } as const;
  const textDecision = decideSend({ ...base, kind: 'text' });
  const tplDecision = decideSend({ ...base, kind: 'template', template: template ? { status: template.status, category: template.category } : null });

  const send = (kind: 'text' | 'template') => run(async () => {
    const r = await db.invoke('whatsapp-send', kind === 'text'
      ? { kind, conversation_id: conv?.id, lead_id: lead?.id, text }
      : { kind, conversation_id: conv?.id, lead_id: lead?.id, template_name: template?.name, language: template?.language, variables: vars });
    if (r?.demo) { push('warn', r.error); }
    else if (!r?.ok) throw new Error(r?.error ?? 'Não foi possível enviar');
    else push('ok', 'Mensagem aceita pela Meta. O status de entrega aparece em seguida.');
    setText(''); setTpl(''); setVars([]);
    await load(); onChange();
  });

  const name = lead?.full_name ?? conv?.contact_name ?? formatPhone(conv?.phone_e164);
  const wa = whatsappLink(conv?.phone_e164 ?? lead?.phone_e164);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 border-b border-line px-3 py-2.5 dark:border-white/10">
        <button className="rounded-lg p-1.5 hover:bg-slate-100 md:hidden dark:hover:bg-white/10" onClick={onBack} aria-label="Voltar"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{name}</div>
          <div className="flex flex-wrap items-center gap-1 text-xs text-ink-soft">{formatPhone(conv?.phone_e164 ?? lead?.phone_e164)} {lead && <StageBadge stageId={lead.stage_id} />}</div>
        </div>
        {lead && <Link to={`/leads?id=${lead.id}`}><Button size="sm" variant="secondary">Ficha</Button></Link>}
        {conv && app.can.write && conv.assigned_to !== app.userId && <Button size="sm" variant="ghost" icon={<UserCheck className="h-3.5 w-3.5" />} onClick={() => run(() => db.update('conversations', conv.id, { assigned_to: app.userId, automation_paused: true }), 'Atendimento assumido por você').then(onChange)}>Assumir</Button>}
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto bg-[#F1F5F9] p-4 dark:bg-navy-900/60">
        {msgs.length === 0 && <p className="py-10 text-center text-sm text-ink-soft">Nenhuma mensagem registrada nesta conversa ainda.</p>}
        {msgs.map((m) => (
          <div key={m.id} className={clsx('flex', m.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
            <div className={clsx('max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm', m.direction === 'outbound' ? (m.status === 'failed' ? 'bg-red-50 text-red-900 dark:bg-red-500/20 dark:text-red-100' : 'bg-brand-600 text-white') : 'bg-white text-ink dark:bg-navy-700 dark:text-slate-100')}>
              {m.template_name && <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase opacity-80"><FileText className="h-3 w-3" />Modelo: {m.template_name}</div>}
              <div className="whitespace-pre-wrap break-words">{m.body ?? `[${m.type}]`}</div>
              <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-75">{dateTime(m.created_at)}{m.direction === 'outbound' && <StatusIcon s={m.status} />}</div>
              {m.status === 'failed' && m.error_message && <div className="mt-1 text-[11px] font-medium">{m.error_message}</div>}
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <footer className="space-y-2 border-t border-line p-3 dark:border-white/10">
        {suppressed || lead?.opted_out ? <Alert tone="error"><ShieldAlert className="mr-1 inline h-4 w-4" />Contato em opt-out. Envios bloqueados.</Alert> : remaining > 0
          ? <div className="text-xs text-emerald-700 dark:text-emerald-300">Janela de atendimento aberta — fecha em {Math.floor(remaining / 3600000)}h{String(Math.floor((remaining % 3600000) / 60000)).padStart(2, '0')}.</div>
          : <div className="text-xs text-amber-700 dark:text-amber-300">Janela de 24h fechada. Só é possível enviar um modelo aprovado pela Meta para quem deu consentimento.</div>}
        {app.can.write && (remaining > 0 ? (
          <div className="flex items-end gap-2">
            <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva sua resposta…" maxLength={4096}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && text.trim() && textDecision.allowed) { e.preventDefault(); send('text'); } }} />
            <Button loading={busy} disabled={!text.trim() || !textDecision.allowed} onClick={() => send('text')} icon={<Send className="h-4 w-4" />} aria-label="Enviar" />
          </div>
        ) : (
          <Card pad className="bg-slate-50 dark:bg-white/5">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Select value={tpl} onChange={(e) => { setTpl(e.target.value); setVars([]); }} placeholder="Escolha um modelo aprovado…" options={templates.map((t) => ({ value: t.name, label: `${t.name} · ${t.category === 'MARKETING' ? 'Marketing' : t.category === 'UTILITY' ? 'Utilidade' : 'Autenticação'} · ${t.status}` }))} />
              <Button loading={busy} disabled={!tplDecision.allowed} onClick={() => send('template')} icon={<Send className="h-4 w-4" />}>Enviar modelo</Button>
            </div>
            {template && <p className="mt-2 rounded-md bg-white p-2 text-xs text-ink-soft dark:bg-navy-800">{template.body}</p>}
            {template && template.variables > 0 && <div className="mt-2 grid gap-2 sm:grid-cols-2">{Array.from({ length: template.variables }).map((_, i) => <Input key={i} className="h-8" placeholder={`Variável {{${i + 1}}}`} value={vars[i] ?? ''} onChange={(e) => { const v = [...vars]; v[i] = e.target.value; setVars(v); }} />)}</div>}
            {tpl && !tplDecision.allowed && <p className="mt-2 text-xs text-red-600">{tplDecision.reason}</p>}
            {templates.length === 0 && <p className="mt-2 text-xs text-ink-soft">Nenhum modelo sincronizado. Crie e aprove modelos no WhatsApp Manager e sincronize em Integrações.</p>}
          </Card>
        ))}
        {remaining > 0 && !textDecision.allowed && <p className="text-xs text-red-600">{textDecision.reason}</p>}
        {wa && <p className="text-[11px] text-ink-soft">Prefere responder pelo celular? <a className="text-brand-600 underline" href={wa} target="_blank" rel="noopener noreferrer">Abrir no WhatsApp</a> (não sincroniza com o CRM).</p>}
      </footer>
    </div>
  );
}
