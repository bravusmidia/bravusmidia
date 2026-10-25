import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Download } from 'lucide-react';
import { useApp, useRows } from '../lib/session';
import { brl, relative, num } from '../lib/format';
import { formatPhone } from '../lib/phone';
import { lastActivity, needsTeamReply, waitingLead, isOpenLead } from '../lib/metrics';
import { toCSV, downloadText } from '../lib/csv';
import { Badge, Button, Card, DataTable, PageHeader, SearchInput, Select, Spinner, Tabs, Empty } from '../components/ui';
import { LeadDrawer, LeadForm, LeadStatusBadges, StageBadge, TEMP } from '../components/leads';

export default function Leads() {
  const app = useApp();
  const [params, setParams] = useSearchParams();
  const { rows, loading, reload } = useRows('leads', { order: ['created_at', false] });
  const [q, setQ] = useState('');
  const [stage, setStage] = useState('');
  const [owner, setOwner] = useState('');
  const [source, setSource] = useState('');
  const [tag, setTag] = useState('');
  const f = params.get('f') ?? 'abertos';
  const [form, setForm] = useState(params.get('novo') === '1');
  useEffect(() => { if (params.get('novo') === '1') setForm(true); }, [params]);

  const days = (l: any) => { const a = lastActivity(l); return a ? (Date.now() - new Date(a).getTime()) / 86400000 : 0; };
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase(); const d = s.replace(/\D/g, '');
    return rows.filter((l) => {
      if (f === 'arquivados' ? !l.archived_at : l.archived_at) return false;
      const open = isOpenLead(l, app.stages);
      if (f === 'abertos' && !open) return false;
      if (f === 'responder' && !(open && needsTeamReply(l))) return false;
      if (f === 'aguardando' && !(open && waitingLead(l))) return false;
      if (['7', '15', '30'].includes(f) && !(open && days(l) >= Number(f))) return false;
      if (f === 'ganhos' && app.stages.find((x) => x.id === l.stage_id)?.kind !== 'won') return false;
      if (f === 'perdidos' && app.stages.find((x) => x.id === l.stage_id)?.kind !== 'lost') return false;
      if (stage && l.stage_id !== stage) return false;
      if (owner && l.owner_id !== owner) return false;
      if (source && l.source !== source) return false;
      if (tag && !(l.tags ?? []).includes(tag)) return false;
      if (s && !(`${l.full_name} ${l.company ?? ''} ${l.email ?? ''} ${l.source ?? ''} ${(l.tags ?? []).join(' ')}`.toLowerCase().includes(s) || (d.length >= 4 && (l.phone_e164 ?? '').includes(d)))) return false;
      return true;
    });
  }, [rows, q, stage, owner, source, tag, f, app.stages]); // eslint-disable-line

  const count = (fn: (l: any) => boolean) => rows.filter((l) => !l.archived_at && isOpenLead(l, app.stages) && fn(l)).length;
  const tags = [...new Set(rows.flatMap((l) => l.tags ?? []))].sort();
  const sources = [...new Set(rows.map((l) => l.source).filter(Boolean))].sort();

  const exportCsv = () => downloadText(`leads-bravus-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(filtered.map((l) => ({ ...l, etapa: app.stages.find((s) => s.id === l.stage_id)?.name, responsavel: app.memberName(l.owner_id), servico: app.services.find((s) => s.id === l.service_id)?.name })), [
    { key: 'full_name', label: 'Nome' }, { key: 'company', label: 'Empresa' }, { key: 'phone_e164', label: 'Telefone' }, { key: 'email', label: 'E-mail' },
    { key: 'etapa', label: 'Etapa' }, { key: 'servico', label: 'Serviço' }, { key: 'source', label: 'Origem' }, { key: 'campaign', label: 'Campanha' },
    { key: 'responsavel', label: 'Responsável' }, { key: 'potential_value', label: 'Potencial' }, { key: 'consent_status', label: 'Consentimento' }, { key: 'tags', label: 'Etiquetas' }, { key: 'created_at', label: 'Criado em' },
  ]));

  return (
    <div>
      <PageHeader title="Leads" subtitle={`${num(rows.filter((l) => !l.archived_at).length)} leads cadastrados`} actions={<>
        <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={exportCsv}>Exportar</Button>
        {app.can.write && <Button icon={<Plus className="h-4 w-4" />} onClick={() => setForm(true)}>Novo lead</Button>}
      </>} />
      <Tabs value={f} onChange={(v) => setParams({ f: v })} tabs={[
        { value: 'abertos', label: 'Em aberto', count: count(() => true) },
        { value: 'responder', label: 'Precisam de resposta', count: count(needsTeamReply) },
        { value: 'aguardando', label: 'Aguardando o lead', count: count(waitingLead) },
        { value: '7', label: 'Sem contato 7+ d', count: count((l) => days(l) >= 7) },
        { value: '15', label: '15+ d', count: count((l) => days(l) >= 15) },
        { value: '30', label: '30+ d', count: count((l) => days(l) >= 30) },
        { value: 'ganhos', label: 'Ganhos' }, { value: 'perdidos', label: 'Perdidos' }, { value: 'todos', label: 'Todos' }, { value: 'arquivados', label: 'Arquivados' },
      ]} />
      <Card pad={false}>
        <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:flex-wrap dark:border-white/10">
          <SearchInput value={q} onChange={setQ} placeholder="Nome, empresa, telefone, e-mail, etiqueta…" />
          <Select className="sm:w-48" value={stage} onChange={(e) => setStage(e.target.value)} placeholder="Todas as etapas" options={app.stages.map((s) => ({ value: s.id, label: s.name }))} />
          <Select className="sm:w-44" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Todos responsáveis" options={app.members.map((m) => ({ value: m.user_id, label: app.memberName(m.user_id) }))} />
          <Select className="sm:w-40" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Todas origens" options={sources.map((s) => ({ value: s, label: s }))} />
          {tags.length > 0 && <Select className="sm:w-40" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Etiqueta" options={tags.map((s) => ({ value: s, label: s }))} />}
        </div>
        {loading ? <Spinner /> : (
          <DataTable rows={filtered} onRow={(l) => setParams({ f, id: l.id })}
            empty={<Empty title="Nenhum lead encontrado" text="Cadastre manualmente, importe uma planilha ou conecte o WhatsApp." action={app.can.write && <Button onClick={() => setForm(true)} icon={<Plus className="h-4 w-4" />}>Novo lead</Button>} />}
            cols={[
              { key: 'full_name', label: 'Lead', render: (l) => <div className="min-w-0"><div className="truncate font-medium">{l.full_name}</div><div className="truncate text-xs text-ink-soft">{l.company || formatPhone(l.phone_e164) || l.email}</div></div> },
              { key: 'stage', label: 'Etapa', sort: (l) => app.stages.find((s) => s.id === l.stage_id)?.position, render: (l) => <StageBadge stageId={l.stage_id} /> },
              { key: 'status', label: 'Situação', render: (l) => <LeadStatusBadges lead={l} />, sort: (l) => (needsTeamReply(l) ? 0 : 1) },
              { key: 'source', label: 'Origem', hideSm: true },
              { key: 'temperature', label: 'Temp.', hideSm: true, render: (l) => (l.temperature ? <Badge tone={TEMP[l.temperature][1]}>{TEMP[l.temperature][0]}</Badge> : '—') },
              { key: 'potential_value', label: 'Potencial', hideSm: true, render: (l) => brl(l.potential_value), sort: (l) => Number(l.potential_value) },
              { key: 'owner', label: 'Responsável', hideSm: true, render: (l) => app.memberName(l.owner_id) },
              { key: 'last', label: 'Última atividade', sort: (l) => lastActivity(l), render: (l) => <span className="text-xs text-ink-soft">{relative(lastActivity(l))}</span> },
            ]} />
        )}
      </Card>
      <LeadForm open={form} onClose={() => { setForm(false); if (params.get('novo')) setParams({}); }} onSaved={reload} />
      <LeadDrawer leadId={params.get('id')} onClose={() => setParams({ f })} onChanged={reload} />
    </div>
  );
}
