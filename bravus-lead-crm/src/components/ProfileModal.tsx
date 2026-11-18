import { useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { db } from '../lib/backend';
import { useApp } from '../lib/session';
import { Avatar, resizeImage } from './Avatar';
import { Button, Field, Input, Modal, useAction } from './ui';

/** Editar o meu perfil: foto, nome e cargo (ex.: CEO). */
export function ProfileModal({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const { run, busy, push } = useAction();
  const me = app.members.find((m) => m.user_id === app.userId);
  const [f, setF] = useState({ full_name: app.profile?.full_name ?? '', avatar_url: (app.profile?.avatar_url as string | null) ?? null, job_title: me?.job_title ?? '' });
  const file = useRef<HTMLInputElement>(null);
  const pick = async (fl?: File) => { if (!fl) return; try { setF((x) => ({ ...x, avatar_url: '' })); const d = await resizeImage(fl); setF((x) => ({ ...x, avatar_url: d })); } catch (e: any) { push('error', e.message); } };
  const save = () => run(async () => {
    const name = f.full_name.trim();
    if (!name) throw new Error('Informe o seu nome.');
    await db.update('profiles', app.userId!, { full_name: name, avatar_url: f.avatar_url || null });
    if (me && (me.job_title ?? '') !== f.job_title.trim()) await db.update('memberships', me.id, { job_title: f.job_title.trim() || null });
    await app.reloadOrg();
  }, 'Perfil atualizado').then((r) => { if (r !== undefined) onClose(); });
  return (
    <Modal open onClose={onClose} title="Meu perfil" footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={save}>Salvar</Button></>}>
      <div className="grid gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={f.full_name} url={f.avatar_url} size={80} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon={<Camera className="h-4 w-4" />} onClick={() => file.current?.click()}>{f.avatar_url ? 'Trocar foto' : 'Adicionar foto'}</Button>
            {f.avatar_url && <Button size="sm" variant="ghost" className="text-red-600" icon={<Trash2 className="h-4 w-4" />} onClick={() => setF({ ...f, avatar_url: null })}>Remover</Button>}
            <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          </div>
        </div>
        <Field label="Nome" required><Input value={f.full_name} maxLength={80} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></Field>
        <Field label="Cargo" hint={app.can.admin ? 'Aparece no seu cartão da equipe. Ex.: CEO, Comercial, Social media.' : 'Só o administrador altera o cargo.'}>
          <Input value={f.job_title} maxLength={60} disabled={!app.can.admin} onChange={(e) => setF({ ...f, job_title: e.target.value })} placeholder="Ex.: CEO" />
        </Field>
      </div>
    </Modal>
  );
}
