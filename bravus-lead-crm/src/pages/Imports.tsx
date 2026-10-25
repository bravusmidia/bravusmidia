import { useEffect, useMemo, useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, Download, Trash2, Paperclip } from 'lucide-react';
import { db, getMode, sb, type Row } from '../lib/backend';
import { useApp, useRows } from '../lib/session';
import { checkFile, guessMapping, IMPORT_FIELDS, parseFile, prepareRows, summarize, type Mapping, type ParsedFile, type PreparedRow } from '../lib/importer';
import { dateTime, num } from '../lib/format';
import { downloadText, toCSV } from '../lib/csv';
import { Alert, Badge, Button, Card, DataTable, Field, Input, PageHeader, Select, Stat, Tabs, useAction } from '../components/ui';

const STRATEGIES = [
  { value: 'insert_new', label: 'Inserir apenas novos (ignorar existentes)' },
  { value: 'update_existing', label: 'Inserir novos e atualizar existentes (mesmo telefone/e-mail)' },
  { value: 'review', label: 'Inserir novos e me mostrar os duplicados para revisar' },
];

export default function Imports() {
  const [tab, setTab] = useState('importar');
  return (
    <div>
      <PageHeader title="Arquivos e importações" subtitle="Importe contatos com pré-visualização, mapeamento de colunas e deduplicação." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'importar', label: 'Importar contatos' }, { value: 'historico', label: 'Histórico' }, { value: 'arquivos', label: 'Arquivos' }]} />
      {tab === 'importar' && <Importer onDone={() => setTab('historico')} />}
      {tab === 'historico' && <History />}
      {tab === 'arquivos' && <Files />}
    </div>
  );
}

function Importer({ onDone }: { onDone: () => void }) {
  const app = useApp();
  const { run, busy, push } = useAction();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [map, setMap] = useState<Mapping>({});
  const [strategy, setStrategy] = useState('insert_new');
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [existing, setExisting] = useState<Row[]>([]);
  const [templates, setTemplates] = useState<Row[]>([]);
  const [tplName, setTplName] = useState('');
  const [stage, setStage] = useState(app.stages[0]?.id ?? '');
  const [result, setResult] = useState<Row | null>(null);

  useEffect(() => { db.list('import_templates', { eq: { org_id: app.orgId } }).then(setTemplates).catch(() => {}); }, [app.orgId]);

  const pick = async (f: File) => {
    const err = checkFile(f);
    if (err) return push('error', err);
    try {
      const p = await parseFile(f);
      if (!p.rows.length) return push('error', 'Nenhuma linha encontrada no arquivo.');
      setFile(f); setParsed(p); setMap(guessMapping(p.headers)); setResult(null);
      setExisting(await db.list('leads', { eq: { org_id: app.orgId } }));
    } catch (e: any) { push('error', 'Não foi possível ler o arquivo: ' + e.message); }
  };

  const prepared: PreparedRow[] = useMemo(() => {
    if (!parsed) return [];
    const phones = new Map<string, string>(); const emails = new Map<string, string>();
    for (const l of existing) { if (l.phone_e164) phones.set(l.phone_e164, l.id); if (l.email) emails.set(String(l.email).toLowerCase(), l.id); }
    return prepareRows(parsed.rows, map, { phones, emails });
  }, [parsed, map, existing]);
  const sum = summarize(prepared);

  const doImport = () => run(async () => {
    if (!map.full_name && !map.company) throw new Error('Mapeie ao menos a coluna de Nome ou Empresa.');
    if (!skipInvalid && sum.invalid) throw new Error('Há linhas inválidas. Marque “Ignorar linhas inválidas” ou corrija o arquivo.');
    const [imp] = await db.insert('imports', { org_id: app.orgId, file_name: file!.name.slice(0, 200), file_type: file!.name.split('.').pop(), strategy, total_rows: prepared.length });
    const toInsert = prepared.filter((r) => r.status === 'new').map(({ data }) => { const { _consent, ...d } = data; return { ...d, org_id: app.orgId, stage_id: stage || null, owner_id: app.userId, import_id: imp.id }; });
    let inserted = 0, updated = 0;
    for (let i = 0; i < toInsert.length; i += 200) { const chunk = await db.insert('leads', toInsert.slice(i, i + 200)); inserted += chunk.length; }
    if (strategy === 'update_existing') {
      for (const r of prepared.filter((x) => x.status === 'duplicate_existing' && x.existingId)) {
        const { _consent, full_name, source, tags, ...patch } = r.data;
        const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== null && v !== ''));
        await db.update('leads', r.existingId!, clean); updated++;
      }
    }
    const errors = prepared.filter((r) => r.status !== 'new').map((r) => ({ linha: r.line, situacao: r.status, erros: r.errors.join('; '), nome: r.data.full_name, telefone: r.data.phone_original }));
    const res = { inserted, updated, skipped: prepared.filter((r) => r.status === 'duplicate_in_file' || (r.status === 'duplicate_existing' && strategy !== 'update_existing')).length, rejected: sum.invalid, duplicates: sum.duplicateExisting + sum.duplicateInFile, errors: errors.slice(0, 2000) };
    await db.update('imports', imp.id, res);
    setResult({ ...res, review: strategy === 'review' ? prepared.filter((r) => r.status === 'duplicate_existing') : [] });
  }, 'Importação concluída');

  const errorReport = () => downloadText(`erros-${file?.name ?? 'importacao'}.csv`, toCSV(prepared.filter((r) => r.status !== 'new').map((r) => ({ linha: r.line, situacao: { invalid: 'Inválida', duplicate_existing: 'Já existe no CRM', duplicate_in_file: 'Repetida no arquivo' }[r.status as string], erros: r.errors.join('; '), nome: r.data.full_name, telefone: r.data.phone_original, email: r.data.email })), [
    { key: 'linha', label: 'Linha' }, { key: 'situacao', label: 'Situação' }, { key: 'erros', label: 'Erros' }, { key: 'nome', label: 'Nome' }, { key: 'telefone', label: 'Telefone' }, { key: 'email', label: 'E-mail' }]));

  if (result) return (
    <Card>
      <Alert tone="ok" className="mb-4">Importação concluída: {result.inserted} novos, {result.updated} atualizados, {result.skipped} ignorados, {result.rejected} rejeitados.</Alert>
      <Alert tone="warn" className="mb-4">Contatos importados <b>não</b> têm consentimento automático para receber mensagens. Registre o opt-in de cada um quando houver evidência.</Alert>
      {result.review?.length > 0 && <div className="mb-4"><div className="mb-2 text-sm font-semibold">Duplicados para revisar ({result.review.length})</div>
        <DataTable rows={result.review.map((r: PreparedRow) => ({ id: r.line, ...r.data, existingId: r.existingId }))} cols={[{ key: 'full_name', label: 'Nome no arquivo' }, { key: 'phone_e164', label: 'Telefone' }, { key: 'email', label: 'E-mail' }, { key: 'ex', label: 'Existente', render: (r: Row) => <a className="text-brand-600 underline" href={`#/leads?id=${r.existingId}`}>Abrir lead existente</a> }]} /></div>}
      <div className="flex gap-2"><Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={errorReport}>Relatório de erros</Button><Button onClick={() => { setResult(null); setParsed(null); setFile(null); onDone(); }}>Ver histórico</Button></div>
    </Card>
  );

  return (
    <div className="space-y-4">
      {!parsed ? (
        <Card>
          <button onClick={() => input.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) pick(f); }}
            className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-line px-6 py-14 text-center hover:border-brand-400 hover:bg-brand-50/40 dark:border-white/10 dark:hover:bg-white/5">
            <UploadCloud className="mb-3 h-10 w-10 text-brand-600" />
            <span className="text-sm font-semibold">Clique ou arraste seu arquivo aqui</span>
            <span className="mt-1 text-xs text-ink-soft">CSV, XLSX, JSON, VCF (contatos do celular) ou TXT · até 10 MB · até 20 mil linhas</span>
          </button>
          <input ref={input} type="file" hidden accept=".csv,.txt,.xlsx,.json,.vcf" onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ''; }} />
          <p className="mt-3 text-xs text-ink-soft">O arquivo é lido no seu navegador e nunca é executado. Fórmulas de planilha são tratadas como texto.</p>
        </Card>
      ) : (
        <>
          <Card title={<span className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" />{file?.name}</span>} action={<Button size="sm" variant="ghost" onClick={() => { setParsed(null); setFile(null); }}>Trocar arquivo</Button>}>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
              <Stat label="Linhas" value={num(sum.total)} />
              <Stat label="Novos válidos" value={num(sum.valid)} tone="green" />
              <Stat label="Já existem no CRM" value={num(sum.duplicateExisting)} tone="amber" />
              <Stat label="Repetidos no arquivo" value={num(sum.duplicateInFile)} tone="amber" />
              <Stat label="Inválidos" value={num(sum.invalid)} tone="red" />
              <Stat label="Com opt-in na planilha" value={num(sum.withConsent)} tone="cyan" hint="Não é registrado automaticamente" />
            </div>
          </Card>
          <Card title="Mapeamento de colunas" action={templates.length > 0 && <Select className="h-8 w-52 text-xs" value="" onChange={(e) => { const t = templates.find((x) => x.id === e.target.value); if (t) setMap(t.mapping); }} placeholder="Usar modelo salvo…" options={templates.map((t) => ({ value: t.id, label: t.name }))} />}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {IMPORT_FIELDS.map((fd) => (
                <Field key={fd.key} label={fd.label} required={'required' in fd && fd.required}>
                  <Select value={map[fd.key] ?? ''} onChange={(e) => setMap({ ...map, [fd.key]: e.target.value || undefined })} placeholder="— não importar —" options={parsed.headers.map((h) => ({ value: h, label: h }))} />
                </Field>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-2"><Field label="Salvar este mapeamento como modelo"><Input className="h-9 w-56" value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="Ex.: Leads Meta Ads" /></Field>
              <Button size="sm" variant="secondary" disabled={!tplName.trim()} onClick={() => run(() => db.insert('import_templates', { org_id: app.orgId, name: tplName.trim(), mapping: map }), 'Modelo salvo').then(() => { setTplName(''); db.list('import_templates', { eq: { org_id: app.orgId } }).then(setTemplates); })}>Salvar modelo</Button></div>
          </Card>
          <Card title="Pré-visualização (primeiras 50 linhas)" pad={false}>
            <DataTable rows={prepared.slice(0, 50).map((r) => ({ id: r.line, ...r.data, st: r.status, err: r.errors.join('; ') }))} cols={[
              { key: 'id', label: 'Linha' },
              { key: 'st', label: 'Situação', render: (r: Row) => <Badge tone={{ new: 'green', invalid: 'red', duplicate_existing: 'amber', duplicate_in_file: 'amber' }[r.st as string]}>{{ new: 'Novo', invalid: 'Inválido', duplicate_existing: 'Já existe', duplicate_in_file: 'Repetido' }[r.st as string]}</Badge> },
              { key: 'full_name', label: 'Nome' }, { key: 'company', label: 'Empresa' },
              { key: 'phone_e164', label: 'Telefone normalizado', render: (r: Row) => r.phone_e164 ?? <span className="text-red-500">{r.phone_original ?? '—'}</span> },
              { key: 'email', label: 'E-mail' }, { key: 'err', label: 'Erros', render: (r: Row) => <span className="text-xs text-red-600">{r.err}</span> },
            ]} />
          </Card>
          <Card title="Como importar">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Estratégia"><Select value={strategy} onChange={(e) => setStrategy(e.target.value)} options={STRATEGIES} /></Field>
              <Field label="Etapa inicial dos novos"><Select value={stage} onChange={(e) => setStage(e.target.value)} options={app.stages.filter((s) => !['won', 'lost'].includes(s.kind)).map((s) => ({ value: s.id, label: s.name }))} /></Field>
              <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={skipInvalid} onChange={(e) => setSkipInvalid(e.target.checked)} />Ignorar linhas inválidas</label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button loading={busy} disabled={!app.can.write || sum.valid + (strategy === 'update_existing' ? sum.duplicateExisting : 0) === 0} onClick={doImport}>Importar {num(sum.valid)} contatos</Button>
              <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={errorReport} disabled={sum.total === sum.valid}>Baixar relatório de erros</Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function History() {
  const app = useApp();
  const { rows } = useRows('imports', { order: ['created_at', false] });
  return (
    <Card pad={false}><DataTable rows={rows} cols={[
      { key: 'file_name', label: 'Arquivo', render: (r) => <span className="font-medium">{r.file_name}</span> },
      { key: 'created_at', label: 'Data', render: (r) => dateTime(r.created_at) },
      { key: 'by', label: 'Usuário', render: (r) => app.memberName(r.created_by) },
      { key: 'total_rows', label: 'Linhas' }, { key: 'inserted', label: 'Inseridos' }, { key: 'updated', label: 'Atualizados' },
      { key: 'skipped', label: 'Ignorados' }, { key: 'rejected', label: 'Rejeitados' },
      { key: 'rep', label: '', render: (r) => (r.errors?.length ? <Button size="sm" variant="ghost" onClick={() => downloadText(`erros-${r.file_name}.csv`, toCSV(r.errors, [{ key: 'linha', label: 'Linha' }, { key: 'situacao', label: 'Situação' }, { key: 'erros', label: 'Erros' }, { key: 'nome', label: 'Nome' }, { key: 'telefone', label: 'Telefone' }]))}>Erros</Button> : null) },
    ]} /></Card>
  );
}

const FILE_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/csv', 'text/plain', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

function Files() {
  const app = useApp();
  const { run, busy, push } = useAction();
  const { rows, reload } = useRows('files', { order: ['created_at', false] });
  const input = useRef<HTMLInputElement>(null);
  if (getMode() !== 'supabase') return <Card><Alert tone="info">O armazenamento de arquivos (PDF, imagens, contratos) funciona com o banco real conectado.</Alert></Card>;
  const upload = (f: File) => run(async () => {
    if (!FILE_TYPES.includes(f.type)) throw new Error('Tipo de arquivo não permitido. Use PDF, imagem, planilha, documento ou texto.');
    if (f.size > 20 * 1024 * 1024) throw new Error('Máximo 20 MB.');
    const safe = f.name.normalize('NFD').replace(/[^\w.\-]+/g, '_').slice(-120);
    const path = `${app.orgId}/${crypto.randomUUID()}-${safe}`;
    const { error } = await sb().storage.from('crm-files').upload(path, f, { contentType: f.type, upsert: false });
    if (error) throw new Error(error.message);
    await db.insert('files', { org_id: app.orgId, name: f.name.slice(0, 200), mime_type: f.type, size_bytes: f.size, storage_path: path });
  }, 'Arquivo enviado').then(reload);
  const open = async (r: Row) => { const { data, error } = await sb().storage.from('crm-files').createSignedUrl(r.storage_path, 120); if (error) return push('error', error.message); window.open(data.signedUrl, '_blank', 'noopener'); };
  return (
    <Card title="Arquivos da empresa" action={app.can.write && <Button size="sm" loading={busy} icon={<Paperclip className="h-3.5 w-3.5" />} onClick={() => input.current?.click()}>Enviar arquivo</Button>} pad={false}>
      <input ref={input} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
      <DataTable rows={rows} onRow={open} cols={[
        { key: 'name', label: 'Arquivo', render: (r) => <span className="font-medium text-brand-600">{r.name}</span> },
        { key: 'size_bytes', label: 'Tamanho', render: (r) => `${(r.size_bytes / 1024).toFixed(0)} KB` },
        { key: 'created_at', label: 'Enviado', render: (r) => dateTime(r.created_at) },
        { key: 'by', label: 'Por', render: (r) => app.memberName(r.uploaded_by) },
        { key: 'x', label: '', render: (r) => app.can.manage && <button aria-label="Excluir" className="text-ink-soft hover:text-red-600" onClick={(e) => { e.stopPropagation(); run(async () => { await sb().storage.from('crm-files').remove([r.storage_path]); await db.remove('files', r.id); }, 'Arquivo removido').then(reload); }}><Trash2 className="h-4 w-4" /></button> },
      ]} />
    </Card>
  );
}
