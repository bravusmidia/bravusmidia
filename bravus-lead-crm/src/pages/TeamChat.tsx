import { useEffect, useMemo, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { sb, getMode, type Row } from '../lib/backend';
import { useApp } from '../lib/session';
import { Avatar } from '../components/Avatar';
import { Alert, Button, Card, PageHeader, Spinner, Textarea, useAction } from '../components/ui';

/*
 * Chat da equipe — é o MESMO chat do Bravus Work (tabela public.messages no mesmo projeto Supabase).
 * O que é escrito aqui aparece no Bravus Work e vice-versa, e avisa a equipe nos alertas do Bravus Work.
 * Para funcionar, entre no CRM com o mesmo e-mail que você usa no Bravus Work.
 */
const pub = () => sb().schema('public');
const hm = (d: string) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const dayLabel = (d: string) => {
  const x = new Date(d), t = new Date(); const y = new Date(); y.setDate(t.getDate() - 1);
  if (x.toDateString() === t.toDateString()) return 'Hoje';
  if (x.toDateString() === y.toDateString()) return 'Ontem';
  return x.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
};

export default function TeamChat() {
  const app = useApp();
  const { run, busy, push } = useAction();
  const [msgs, setMsgs] = useState<Row[] | null>(null);
  const [people, setPeople] = useState<Row[]>([]);
  const [err, setErr] = useState('');
  const [text, setText] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const demo = getMode() === 'demo';

  const load = async () => {
    const [p, m] = await Promise.all([
      pub().from('profiles').select('id,name,avatar_url,role'),
      pub().from('messages').select('id,user_id,text,created_at').order('created_at', { ascending: false }).limit(300),
    ]);
    if (p.error || m.error) throw new Error((p.error || m.error)!.message);
    if (!(p.data ?? []).some((x) => x.id === app.userId)) { setErr('nobw'); setMsgs([]); return; }
    setPeople(p.data ?? []); setMsgs((m.data ?? []).reverse()); setErr('');
  };

  useEffect(() => {
    if (demo) return;
    load().catch((e) => { setErr(e.message || 'erro'); setMsgs([]); });
    const ch = sb().channel('bw-chat').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => load().catch(() => {})).subscribe();
    const t = setInterval(() => { if (!document.hidden) load().catch(() => {}); }, 15000);
    return () => { clearInterval(t); sb().removeChannel(ch); };
  }, [app.userId]); // eslint-disable-line

  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs?.length]);

  const who = (id: string) => people.find((p) => p.id === id);
  const send = () => run(async () => {
    const t = text.trim(); if (!t) return;
    if (t.length > 4000) throw new Error('Mensagem muito longa.');
    const { error } = await pub().from('messages').insert({ user_id: app.userId, text: t });
    if (error) throw new Error(error.message);
    setText('');
    const me = who(app.userId!)?.name?.split(' ')[0] || 'Equipe';
    const others = people.filter((p) => p.id !== app.userId && p.role !== 'cliente');
    await Promise.all(others.map((p) => pub().from('notifications').insert({ user_id: p.id, title: `💬 Mensagem de ${me} (CRM)`, body: t.slice(0, 120), type: 'chat', key: `crmchat:${crypto.randomUUID()}`, route: 'chat', read: false })));
    await load();
  }).catch((e) => push('error', e.message));

  const grouped = useMemo(() => {
    const out: { day: string; items: Row[] }[] = [];
    (msgs ?? []).forEach((m) => { const d = dayLabel(m.created_at); const last = out[out.length - 1]; if (last && last.day === d) last.items.push(m); else out.push({ day: d, items: [m] }); });
    return out;
  }, [msgs]);

  return (
    <div>
      <PageHeader title="Chat da equipe" subtitle="O mesmo chat do Bravus Work: o que você escreve aqui aparece lá, e a equipe recebe o aviso." />
      {demo ? <Alert tone="info">No modo demonstração o chat da equipe fica desligado.</Alert>
        : err === 'nobw' ? <Alert tone="warn">Sua conta do CRM ({app.email}) não está no Bravus Work. Para usar o chat, entre no CRM com o <b>mesmo e-mail</b> que você usa no Bravus Work.</Alert>
        : err ? <Alert tone="error">Não foi possível abrir o chat: {err}</Alert>
        : (
          <Card pad={false}>
            <div className="flex h-[calc(100vh-280px)] min-h-[360px] flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {msgs === null ? <Spinner /> : !msgs.length ? <p className="py-10 text-center text-sm text-ink-soft">Nenhuma mensagem ainda. Mande a primeira!</p> : grouped.map((g) => (
                  <div key={g.day} className="space-y-3">
                    <div className="text-center text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{g.day}</div>
                    {g.items.map((m) => {
                      const mine = m.user_id === app.userId; const p = who(m.user_id);
                      return (
                        <div key={m.id} className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                          <Avatar name={p?.name} url={p?.avatar_url} size={30} />
                          <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${mine ? 'rounded-br-sm bg-brand-600 text-white' : 'rounded-bl-sm bg-slate-100 text-ink dark:bg-white/10 dark:text-slate-100'}`}>
                            {!mine && <div className="mb-0.5 text-[11px] font-semibold opacity-80">{p?.name?.split(' ')[0] ?? 'Equipe'}</div>}
                            <div className="whitespace-pre-wrap break-words">{m.text}</div>
                            <div className={`mt-0.5 text-right text-[10px] ${mine ? 'text-white/70' : 'text-ink-soft'}`}>{hm(m.created_at)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div ref={end} />
              </div>
              <div className="flex items-end gap-2 border-t border-line p-3 dark:border-white/10">
                <Textarea rows={1} value={text} maxLength={4000} placeholder="Escreva uma mensagem…" className="min-h-[42px] flex-1 resize-none"
                  onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
                <Button loading={busy} onClick={send} icon={<Send className="h-4 w-4" />} disabled={!text.trim()}>Enviar</Button>
              </div>
            </div>
          </Card>
        )}
    </div>
  );
}
