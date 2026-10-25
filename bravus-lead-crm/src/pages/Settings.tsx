import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, Plus, Trash2, Database, RotateCcw } from 'lucide-react';
import clsx from 'clsx';
import { clearConfig, db, getConfig, getMode, setDemo, type Row } from '../lib/backend';
import { resetDemo } from '../lib/demo';
import { useApp } from '../lib/session';
import { Alert, Button, Card, Confirm, DOT, Field, Input, PageHeader, Select, useAction } from '../components/ui';

const COLORS = ['blue', 'sky', 'cyan', 'indigo', 'violet', 'amber', 'green', 'red', 'slate'];
const KINDS = [{ value: 'open', label: 'Em andamento' }, { value: 'waiting', label: 'Aguardando lead' }, { value: 'won', label: 'Ganho' }, { value: 'lost', label: 'Perdido' }, { value: 'nurture', label: 'Nutrição' }];

export default function SettingsPage() {
  const app = useApp();
  const { run, busy } = useAction();
  const [name, setName] = useState(app.org?.name ?? '');
  const [inact, setInact] = useState<Row>(app.inactivity);
  const [wa, setWa] = useState<Row>({ max_per_minute: 20, max_per_day: 200, quiet_start: '21:00', quiet_end: '08:00', ...(app.org?.settings?.whatsapp ?? {}) });
  const [stages, setStages] = useState<Row[]>(app.stages);
  const [confirm, setConfirm] = useState<'disconnect' | 'reset' | null>(null);
  useEffect(() => setStages(app.stages), [app.stages]);

  const saveOrg = () => run(async () => {
    const i = Object.fromEntries(Object.entries(inact).map(([k, v]) => [k, Math.max(1, Number(v))]));
    if (!(i.attention < i.priority && i.priority < i.review && i.review < i.requalify)) throw new Error('Os prazos de inatividade devem ser crescentes.');
    const w = { max_per_minute: Math.min(80, Math.max(1, Number(wa.max_per_minute))), max_per_day: Math.max(1, Number(wa.max_per_day)), quiet_start: wa.quiet_start, quiet_end: wa.quiet_end };
    await db.update('organizations', app.orgId, { name: name.trim(), settings: { ...(app.org?.settings ?? {}), inactivity: i, whatsapp: w } });
  }, 'Configurações salvas').then(app.reloadOrg);

  const move = (i: number, dir: -1 | 1) => { const s = [...stages]; const j = i + dir; if (j < 0 || j >= s.length) return; [s[i], s[j]] = [s[j], s[i]]; setStages(s.map((x, k) => ({ ...x, position: k + 1 }))); };
  const saveStages = () => run(async () => {
    if (stages.filter((s) => s.kind === 'won').length !== 1 || stages.filter((s) => s.kind === 'lost').length !== 1) throw new Error('O funil precisa ter exatamente uma etapa de Ganho e uma de Perdido.');
    for (const s of stages) {
      const row = { name: s.name.trim(), position: s.position, color: s.color, kind: s.kind, probability: Number(s.probability), entry_criteria: s.entry_criteria || null, exit_criteria: s.exit_criteria || null };
      if (s.id?.startsWith('new-')) await db.insert('pipeline_stages', { ...row, org_id: app.orgId }); else await db.update('pipeline_stages', s.id, row);
    }
    for (const old of app.stages.filter((o) => !stages.some((s) => s.id === o.id))) await db.remove('pipeline_stages', old.id);
  }, 'Funil atualizado').then(app.reloadOrg);

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Empresa, funil, regras de follow-up e limites de segurança." />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Empresa e regras">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome da empresa" className="sm:col-span-2"><Input value={name} onChange={(e) => setName(e.target.value)} disabled={!app.can.admin} /></Field>
            <div className="sm:col-span-2 text-xs font-semibold text-ink-soft">Inatividade (dias sem atividade)</div>
            {[['attention', 'Atenção'], ['priority', 'Follow-up prioritário'], ['review', 'Revisão comercial'], ['requalify', 'Requalificar / nutrir']].map(([k, l]) => <Field key={k} label={l}><Input type="number" min={1} value={inact[k]} onChange={(e) => setInact({ ...inact, [k]: e.target.value })} disabled={!app.can.admin} /></Field>)}
            <div className="sm:col-span-2 text-xs font-semibold text-ink-soft">Limites de segurança do WhatsApp</div>
            <Field label="Máx. mensagens por minuto"><Input type="number" min={1} max={80} value={wa.max_per_minute} onChange={(e) => setWa({ ...wa, max_per_minute: e.target.value })} disabled={!app.can.admin} /></Field>
            <Field label="Máx. contatos/dia fora da janela" hint="Fique abaixo do limite da sua conta na Meta"><Input type="number" min={1} value={wa.max_per_day} onChange={(e) => setWa({ ...wa, max_per_day: e.target.value })} disabled={!app.can.admin} /></Field>
            <Field label="Silêncio (marketing) a partir de"><Input type="time" value={wa.quiet_start} onChange={(e) => setWa({ ...wa, quiet_start: e.target.value })} disabled={!app.can.admin} /></Field>
            <Field label="até"><Input type="time" value={wa.quiet_end} onChange={(e) => setWa({ ...wa, quiet_end: e.target.value })} disabled={!app.can.admin} /></Field>
          </div>
          {app.can.admin && <Button className="mt-4" loading={busy} onClick={saveOrg}>Salvar</Button>}
        </Card>

        <Card title="Aparência">
          <div className="grid grid-cols-3 gap-2">{([['light', 'Claro'], ['dark', 'Escuro'], ['system', 'Automático']] as const).map(([v, l]) => (
            <button key={v} onClick={() => app.setTheme(v)} className={clsx('rounded-xl border p-4 text-sm font-medium', app.theme === v ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-white' : 'border-line dark:border-white/10')}>{l}</button>
          ))}</div>
          <p className="mt-2 text-xs text-ink-soft">A preferência fica salva no seu usuário.</p>
          <div className="mt-6 border-t border-line pt-4 dark:border-white/10">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Database className="h-4 w-4" />Banco de dados</div>
            {getMode() === 'demo' ? <>
              <Alert tone="warn">Você está no modo demonstração.</Alert>
              <div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" icon={<RotateCcw className="h-4 w-4" />} onClick={() => setConfirm('reset')}>Restaurar dados de exemplo</Button><Button onClick={() => { setDemo(false); location.reload(); }}>Conectar banco real</Button></div>
            </> : <>
              <p className="break-all text-xs text-ink-soft">Conectado a: {getConfig()?.url}</p>
              {!import.meta.env.VITE_SUPABASE_URL && <Button className="mt-3" variant="ghost" onClick={() => setConfirm('disconnect')}>Desconectar este navegador</Button>}
            </>}
          </div>
        </Card>

        <Card title="Etapas do funil" className="xl:col-span-2" action={app.can.manage && <Button size="sm" variant="secondary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setStages([...stages, { id: 'new-' + Date.now(), name: 'Nova etapa', color: 'blue', kind: 'open', probability: 20, position: stages.length + 1 }])}>Adicionar etapa</Button>}>
          <div className="space-y-2">
            {stages.map((s, i) => (
              <div key={s.id} className="grid grid-cols-[auto_1fr] items-center gap-2 rounded-lg border border-line p-2 sm:grid-cols-[auto_1fr_130px_150px_90px_auto] dark:border-white/10">
                <span className={clsx('h-3 w-3 rounded-full', DOT[s.color])} />
                <Input className="h-9" value={s.name} disabled={!app.can.manage} onChange={(e) => setStages(stages.map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x)))} />
                <Select className="h-9" value={s.color} disabled={!app.can.manage} onChange={(e) => setStages(stages.map((x) => (x.id === s.id ? { ...x, color: e.target.value } : x)))} options={COLORS.map((c) => ({ value: c, label: c }))} />
                <Select className="h-9" value={s.kind} disabled={!app.can.manage} onChange={(e) => setStages(stages.map((x) => (x.id === s.id ? { ...x, kind: e.target.value } : x)))} options={KINDS} />
                <Input className="h-9" type="number" min={0} max={100} value={s.probability} title="Probabilidade %" disabled={!app.can.manage} onChange={(e) => setStages(stages.map((x) => (x.id === s.id ? { ...x, probability: e.target.value } : x)))} />
                {app.can.manage && <div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => move(i, -1)} aria-label="Subir"><ArrowUp className="h-3.5 w-3.5" /></Button><Button size="sm" variant="ghost" onClick={() => move(i, 1)} aria-label="Descer"><ArrowDown className="h-3.5 w-3.5" /></Button><Button size="sm" variant="ghost" className="text-red-600" onClick={() => setStages(stages.filter((x) => x.id !== s.id).map((x, k) => ({ ...x, position: k + 1 })))} aria-label="Remover"><Trash2 className="h-3.5 w-3.5" /></Button></div>}
                <Input className="col-span-2 h-8 text-xs sm:col-span-3" placeholder="Critério de entrada (ex.: respondeu e tem verba)" value={s.entry_criteria ?? ''} disabled={!app.can.manage} onChange={(e) => setStages(stages.map((x) => (x.id === s.id ? { ...x, entry_criteria: e.target.value } : x)))} />
                <Input className="col-span-2 h-8 text-xs sm:col-span-3" placeholder="Critério de saída" value={s.exit_criteria ?? ''} disabled={!app.can.manage} onChange={(e) => setStages(stages.map((x) => (x.id === s.id ? { ...x, exit_criteria: e.target.value } : x)))} />
              </div>
            ))}
          </div>
          {app.can.manage && <Button className="mt-4" loading={busy} onClick={saveStages}>Salvar funil</Button>}
          <p className="mt-2 text-xs text-ink-soft">Leads de uma etapa removida ficam “sem etapa” — mova-os antes de excluir.</p>
        </Card>
      </div>
      <Confirm open={confirm === 'disconnect'} onClose={() => setConfirm(null)} title="Desconectar este navegador?" text="Os dados continuam salvos no banco. Você precisará colar a URL e a chave de novo para usar neste navegador." onConfirm={() => { clearConfig(); location.reload(); }} />
      <Confirm open={confirm === 'reset'} onClose={() => setConfirm(null)} title="Restaurar dados de exemplo?" text="Apaga o que você fez na demonstração e volta aos dados iniciais." onConfirm={() => { resetDemo(); location.reload(); }} />
    </div>
  );
}
