import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, ArrowRightCircle, ListChecks } from 'lucide-react';
import { db, type Row } from '../lib/backend';
import { useApp, useRows } from '../lib/session';
import { normalizePhone, formatPhone, whatsappLink } from '../lib/phone';
import { date, fromLocalInput, relative, toLocalInput } from '../lib/format';
import { Alert, Badge, Button, Card, DataTable, Field, Input, Modal, PageHeader, SearchInput, Select, Spinner, Tabs, Textarea, useAction } from '../components/ui';

export const P_STATUS: Record<string, [string, string]> = {
  not_contacted: ['Não abordada', 'slate'], in_progress: ['Em andamento', 'blue'], waiting: ['Aguardando resposta', 'amber'],
  qualified: ['Qualificada', 'cyan'], closed: ['Encerrada', 'red'], future: ['Revisão futura', 'violet'],
};
const CHANNELS = ['Google Maps', 'Instagram', 'Facebook', 'Indicação', 'LinkedIn', 'Site', 'Evento', 'Outro'];

/** Cadência sugerida — cada passo é executado por uma pessoa, nunca automaticamente. */
export const CADENCE = [
  { day: 0, step: 'Pesquisar a empresa (site, Instagram, anúncios ativos na Biblioteca de Anúncios)' },
  { day: 0, step: 'Primeiro contato pelo canal público da empresa (Instagram/telefone comercial) com diagnóstico personalizado' },
  { day: 2, step: 'Seguimento: enviar 1 insight concreto (ex.: anúncio do concorrente)' },
  { day: 5, step: 'Ligação curta para propor diagnóstico gratuito' },
  { day: 10, step: 'Última tentativa educada; sem resposta → encerrar ou revisão futura' },
];

export default function Prospecting() {
  const app = useApp();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const { rows, loading, reload } = useRows('prospects', { order: ['created_at', false] });
  const { run } = useAction();
  const [tab, setTab] = useState('not_contacted');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<Row | null>(null);
  const [cad, setCad] = useState(false);
  useEffect(() => { if (params.get('novo') === '1') { setEdit({}); setParams({}); } }, [params]); // eslint-disable-line

  const list = useMemo(() => rows.filter((p) => p.status === tab && (!q || `${p.company} ${p.niche ?? ''} ${p.contact_name ?? ''}`.toLowerCase().includes(q.toLowerCase()))), [rows, tab, q]);

  return (
    <div>
      <PageHeader title="Prospecção" subtitle="Organize a prospecção ativa: empresas, abordagens e próximos passos." actions={<>
        <Button variant="secondary" icon={<ListChecks className="h-4 w-4" />} onClick={() => setCad(true)}>Cadência sugerida</Button>
        {app.can.write && <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEdit({})}>Nova empresa</Button>}
      </>} />
      <Tabs value={tab} onChange={setTab} tabs={Object.entries(P_STATUS).map(([v, [l]]) => ({ value: v, label: l, count: rows.filter((p) => p.status === v).length }))} />
      <Card pad={false}>
        <div className="border-b border-line p-3 dark:border-white/10"><SearchInput value={q} onChange={setQ} placeholder="Empresa, nicho, contato…" /></div>
        {loading ? <Spinner /> : <DataTable rows={list} onRow={(p) => setEdit(p)} cols={[
          { key: 'company', label: 'Empresa', render: (p) => <div><div className="font-medium">{p.company}</div><div className="text-xs text-ink-soft">{p.niche}{p.city ? ` · ${p.city}` : ''}</div></div> },
          { key: 'contact_name', label: 'Contato', render: (p) => <div className="text-sm">{p.contact_name ?? '—'}<div className="text-xs text-ink-soft">{formatPhone(p.phone_e164)}</div></div> },
          { key: 'discovery_channel', label: 'Canal', hideSm: true },
          { key: 'service', label: 'Serviço potencial', hideSm: true, render: (p) => app.services.find((s) => s.id === p.service_id)?.name ?? '—' },
          { key: 'cadence_step', label: 'Passo', render: (p) => <Badge tone="blue">{Math.min(p.cadence_step ?? 0, CADENCE.length)}/{CADENCE.length}</Badge> },
          { key: 'approached_at', label: 'Abordagem', render: (p) => (p.approached_at ? relative(p.approached_at) : '—') },
          { key: 'next', label: 'Próxima ação', render: (p) => <span className="text-xs">{p.next_action ?? '—'}{p.next_action_at ? ` · ${date(p.next_action_at)}` : ''}</span> },
          { key: 'owner', label: 'Responsável', hideSm: true, render: (p) => app.memberName(p.owner_id) },
          { key: 'go', label: '', render: (p) => (p.lead_id ? <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); nav(`/leads?id=${p.lead_id}`); }}>Ver lead</Button>
            : app.can.write ? <Button size="sm" variant="secondary" icon={<ArrowRightCircle className="h-3.5 w-3.5" />} onClick={(e) => { e.stopPropagation(); run(() => db.rpc('convert_prospect', { p_prospect: p.id }), 'Convertida em lead no funil').then((id) => { reload(); if (id) nav(`/leads?id=${id}`); }); }}>Virar lead</Button> : null) },
        ]} />}
      </Card>
      {edit && <ProspectForm p={edit} onClose={() => setEdit(null)} onSaved={reload} />}
      <Modal open={cad} onClose={() => setCad(false)} title="Cadência comercial sugerida">
        <Alert tone="info" className="mb-3">Cada passo é feito por uma pessoa da equipe. O CRM não dispara mensagens automáticas para quem não deu consentimento.</Alert>
        <ol className="space-y-2">{CADENCE.map((c, i) => <li key={i} className="flex gap-3 text-sm"><Badge tone="blue">Dia {c.day}</Badge><span>{c.step}</span></li>)}</ol>
      </Modal>
    </div>
  );
}

function ProspectForm({ p, onClose, onSaved }: { p: Row; onClose: () => void; onSaved: () => void }) {
  const app = useApp();
  const { run, busy } = useAction();
  const [f, setF] = useState<Row>({ status: 'not_contacted', owner_id: app.userId, cadence_step: 0, ...p, phone: p.phone_original ?? p.phone_e164 ?? '', next_action_at: toLocalInput(p.next_action_at) });
  const set = (k: string) => (e: any) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = () => run(async () => {
    if (!f.company?.trim()) throw new Error('Informe a empresa.');
    const ph = normalizePhone(f.phone);
    if (f.phone && !ph.valid) throw new Error('Telefone inválido.');
    const row = { company: f.company.trim(), niche: f.niche || null, discovery_channel: f.discovery_channel || null, contact_name: f.contact_name || null, phone_original: f.phone || null, phone_e164: ph.e164,
      email: f.email || null, instagram: f.instagram || null, city: f.city || null, service_id: f.service_id || null, owner_id: f.owner_id || null, status: f.status,
      approached_at: f.status !== 'not_contacted' ? (p.approached_at ?? new Date().toISOString()) : null, cadence_step: Number(f.cadence_step || 0), result: f.result || null,
      next_action: f.next_action || null, next_action_at: fromLocalInput(f.next_action_at), notes: f.notes || null };
    if (p.id) await db.update('prospects', p.id, row); else await db.insert('prospects', { ...row, org_id: app.orgId });
  }, 'Prospecção salva').then((r) => { if (r !== undefined) { onSaved(); onClose(); } });
  const wa = whatsappLink(normalizePhone(f.phone).e164);
  return (
    <Modal open onClose={onClose} title={p.id ? p.company : 'Nova empresa prospectada'} wide footer={<>
      {p.id && app.can.manage && <Button variant="ghost" className="mr-auto text-red-600" onClick={() => run(() => db.remove('prospects', p.id), 'Removida').then(() => { onSaved(); onClose(); })}>Excluir</Button>}
      <Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={save} disabled={!app.can.write}>Salvar</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Empresa" required><Input value={f.company ?? ''} onChange={set('company')} /></Field>
        <Field label="Nicho"><Input value={f.niche ?? ''} onChange={set('niche')} /></Field>
        <Field label="Canal de descoberta"><Select value={f.discovery_channel ?? ''} onChange={set('discovery_channel')} placeholder="—" options={CHANNELS.map((c) => ({ value: c, label: c }))} /></Field>
        <Field label="Contato"><Input value={f.contact_name ?? ''} onChange={set('contact_name')} /></Field>
        <Field label="Telefone comercial"><Input value={f.phone ?? ''} onChange={set('phone')} inputMode="tel" /></Field>
        <Field label="Instagram"><Input value={f.instagram ?? ''} onChange={set('instagram')} /></Field>
        <Field label="Cidade"><Input value={f.city ?? ''} onChange={set('city')} /></Field>
        <Field label="Serviço potencial"><Select value={f.service_id ?? ''} onChange={set('service_id')} placeholder="—" options={app.services.map((s) => ({ value: s.id, label: s.name }))} /></Field>
        <Field label="Situação"><Select value={f.status} onChange={set('status')} options={Object.entries(P_STATUS).map(([v, [l]]) => ({ value: v, label: l }))} /></Field>
        <Field label="Passo da cadência"><Select value={String(f.cadence_step ?? 0)} onChange={set('cadence_step')} options={[{ value: '0', label: 'Não iniciada' }, ...CADENCE.map((c, i) => ({ value: String(i + 1), label: `${i + 1}. ${c.step.slice(0, 60)}…` }))]} /></Field>
        <Field label="Responsável"><Select value={f.owner_id ?? ''} onChange={set('owner_id')} placeholder="—" options={app.members.map((m) => ({ value: m.user_id, label: app.memberName(m.user_id) }))} /></Field>
        <Field label="Resultado da abordagem"><Input value={f.result ?? ''} onChange={set('result')} /></Field>
        <Field label="Próxima ação"><Input value={f.next_action ?? ''} onChange={set('next_action')} /></Field>
        <Field label="Quando"><Input type="datetime-local" value={f.next_action_at ?? ''} onChange={set('next_action_at')} /></Field>
        <Field label="Observações" className="sm:col-span-2"><Textarea value={f.notes ?? ''} onChange={set('notes')} /></Field>
      </div>
      {wa && <p className="mt-3 text-xs text-ink-soft">Contato manual: <a className="text-brand-600 underline" href={wa} target="_blank" rel="noopener noreferrer">abrir conversa no WhatsApp</a>. Faça abordagens personalizadas e respeite quem não quiser conversa.</p>}
    </Modal>
  );
}
