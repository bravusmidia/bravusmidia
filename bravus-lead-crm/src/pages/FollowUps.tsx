import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useApp, useRows } from '../lib/session';
import { relative } from '../lib/format';
import { inactivityLevel, isOpenLead, lastActivity, needsTeamReply, waitingLead } from '../lib/metrics';
import { Badge, Button, Card, Empty, PageHeader, Select, Spinner, Tabs } from '../components/ui';
import { INACT, LeadDrawer, StageBadge, TaskForm, TaskRow } from '../components/leads';

export default function FollowUps() {
  const app = useApp();
  const [params, setParams] = useSearchParams();
  const { rows: tasks, loading, reload } = useRows('tasks', { order: ['due_at', true] });
  const { rows: leads, reload: reloadLeads } = useRows('leads');
  const [tab, setTab] = useState('hoje');
  const [who, setWho] = useState(app.role === 'seller' ? app.userId ?? '' : '');
  const [form, setForm] = useState(params.get('novo') === '1');
  useEffect(() => { if (params.get('novo') === '1') setForm(true); }, [params]);

  const now = new Date();
  const sod = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eod = new Date(sod.getTime() + 86400000);
  const mine = tasks.filter((t) => !who || t.assignee_id === who);
  const open = mine.filter((t) => t.status === 'open');
  const groups: Record<string, any[]> = {
    hoje: open.filter((t) => new Date(t.due_at) >= sod && new Date(t.due_at) < eod),
    vencidos: open.filter((t) => new Date(t.due_at) < now),
    proximos: open.filter((t) => new Date(t.due_at) >= eod),
    concluidas: mine.filter((t) => t.status === 'done').sort((a, b) => (a.completed_at < b.completed_at ? 1 : -1)),
    canceladas: mine.filter((t) => t.status === 'canceled'),
  };
  const activeLeads = leads.filter((l) => !l.archived_at && isOpenLead(l, app.stages) && (!who || l.owner_id === who));
  const leadLists: Record<string, any[]> = {
    responder: activeLeads.filter(needsTeamReply),
    aguardando: activeLeads.filter(waitingLead),
    inativos: activeLeads.filter((l) => inactivityLevel(l, app.inactivity) !== 'ok').sort((a, b) => ((lastActivity(a) ?? '') < (lastActivity(b) ?? '') ? -1 : 1)),
  };
  const leadName = useMemo(() => new Map(leads.map((l) => [l.id, l.full_name + (l.company ? ` (${l.company})` : '')])), [leads]);
  const refresh = () => { reload(); reloadLeads(); };

  return (
    <div>
      <PageHeader title="Follow-ups" subtitle="Sua rotina diária: o que fazer hoje, o que atrasou e quem está esperando." actions={<>
        <Select className="w-48" value={who} onChange={(e) => setWho(e.target.value)} placeholder="Toda a equipe" options={app.members.map((m) => ({ value: m.user_id, label: app.memberName(m.user_id) }))} />
        {app.can.write && <Button icon={<Plus className="h-4 w-4" />} onClick={() => setForm(true)}>Nova tarefa</Button>}
      </>} />
      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'hoje', label: 'Para hoje', count: groups.hoje.length }, { value: 'vencidos', label: 'Vencidos', count: groups.vencidos.length },
        { value: 'proximos', label: 'Próximos', count: groups.proximos.length }, { value: 'responder', label: 'Precisam de resposta', count: leadLists.responder.length },
        { value: 'aguardando', label: 'Aguardando o lead', count: leadLists.aguardando.length }, { value: 'inativos', label: 'Inativos', count: leadLists.inativos.length },
        { value: 'concluidas', label: 'Concluídas' }, { value: 'canceladas', label: 'Canceladas' },
      ]} />
      {loading ? <Spinner /> : groups[tab] ? (
        groups[tab].length ? <div className="space-y-2">{groups[tab].map((t) => <TaskRow key={t.id} t={t} onChange={refresh} showLead leadName={leadName.get(t.lead_id)} />)}</div>
          : <Card><Empty title={tab === 'vencidos' ? 'Nada atrasado 🎉' : 'Nenhuma tarefa aqui'} text="Crie tarefas de ligação, mensagem, reunião, proposta ou revisão comercial." /></Card>
      ) : (
        <div className="space-y-2">
          {tab === 'inativos' && <p className="mb-2 text-xs text-ink-soft">Regras: {app.inactivity.attention} dias = atenção · {app.inactivity.priority} = follow-up prioritário · {app.inactivity.review} = revisão comercial · {app.inactivity.requalify} = requalificar/nutrir (ajuste em Configurações).</p>}
          {leadLists[tab].length === 0 && <Card><Empty title="Ninguém nesta lista" /></Card>}
          {leadLists[tab].map((l) => {
            const lvl = inactivityLevel(l, app.inactivity);
            return (
              <button key={l.id} onClick={() => setParams({ id: l.id })} className="flex w-full flex-col gap-1 rounded-xl border border-line bg-white p-3 text-left hover:border-brand-200 sm:flex-row sm:items-center dark:border-white/10 dark:bg-navy-700/60">
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{l.full_name} <span className="font-normal text-ink-soft">{l.company}</span></div>
                  <div className="text-xs text-ink-soft">Recebida {relative(l.last_inbound_at)} · Enviada {relative(l.last_outbound_at)} · Tentativa {relative(l.last_attempt_at)} · Qualquer atividade {relative(lastActivity(l))}</div></div>
                <div className="flex flex-wrap gap-1"><StageBadge stageId={l.stage_id} />{lvl !== 'ok' && <Badge tone={INACT[lvl][1]}>{INACT[lvl][0]}</Badge>}</div>
              </button>
            );
          })}
        </div>
      )}
      <p className="mt-6 text-xs text-ink-soft">Uma tarefa de follow-up não autoriza envio automático no WhatsApp. Mensagens fora da janela de 24h exigem modelo aprovado e consentimento — veja a <Link className="text-brand-600 underline" to="/caixa-de-entrada">Caixa de entrada</Link>.</p>
      <TaskForm open={form} onClose={() => { setForm(false); if (params.get('novo')) setParams({}); }} onSaved={refresh} />
      <LeadDrawer leadId={params.get('id')} onClose={() => setParams({})} onChanged={refresh} />
    </div>
  );
}
