import clsx from 'clsx';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { X, Loader2, ChevronUp, ChevronDown, Inbox, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

/* ---------- cores semânticas do funil ---------- */
export const TONE: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/30',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30',
  cyan: 'bg-cyan-50 text-cyan-800 ring-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:ring-cyan-500/30',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
  red: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/30',
};
export const DOT: Record<string, string> = {
  blue: 'bg-blue-500', sky: 'bg-sky-500', amber: 'bg-amber-500', cyan: 'bg-cyan-500', indigo: 'bg-indigo-500',
  violet: 'bg-violet-500', green: 'bg-emerald-500', red: 'bg-red-500', slate: 'bg-slate-400',
};

export function Badge({ tone = 'slate', children, dot, className }: { tone?: string; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={clsx('inline-flex max-w-full items-center gap-1.5 truncate rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', TONE[tone] ?? TONE.slate, className)}>
      {dot && <span className={clsx('h-1.5 w-1.5 shrink-0 rounded-full', DOT[tone] ?? DOT.slate)} />}
      {children}
    </span>
  );
}

/* ---------- botões e campos ---------- */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md'; loading?: boolean; icon?: ReactNode };
export function Button({ variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...p }: BtnProps) {
  return (
    <button
      {...p}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm',
        variant === 'primary' && 'bg-brand-600 text-white shadow-sm hover:bg-brand-700',
        variant === 'secondary' && 'border border-line bg-white text-ink hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10',
        variant === 'ghost' && 'text-ink-soft hover:bg-slate-100 hover:text-ink dark:text-slate-300 dark:hover:bg-white/10',
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
        className,
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

const fieldCls = 'w-full rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100';
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={clsx(fieldCls, 'h-10', p.className)} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea rows={3} {...p} className={clsx(fieldCls, 'py-2', p.className)} />;
export function Select({ options, placeholder, ...p }: SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <select {...p} className={clsx(fieldCls, 'h-10 pr-8', p.className)}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
export function Field({ label, children, hint, required, className }: { label: string; children: ReactNode; hint?: string; required?: boolean; className?: string }) {
  return (
    <label className={clsx('block', className)}>
      <span className="mb-1 block text-xs font-medium text-ink-soft dark:text-slate-400">{label}{required && <span className="text-red-500"> *</span>}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-ink-soft">{hint}</span>}
    </label>
  );
}

/* ---------- containers ---------- */
export function Card({ children, className, title, action, pad = true }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode; pad?: boolean }) {
  return (
    <section className={clsx('rounded-xl border border-line bg-white shadow-card dark:border-white/10 dark:bg-navy-700/60', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 dark:border-white/10">
          <h3 className="text-sm font-semibold text-ink dark:text-slate-100">{title}</h3>
          {action}
        </header>
      )}
      <div className={clsx(pad && 'p-4')}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl dark:text-white">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink-soft dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, tone = 'blue', icon, onClick }: { label: string; value: ReactNode; hint?: ReactNode; tone?: string; icon?: ReactNode; onClick?: () => void }) {
  const Tag: any = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} className={clsx('group relative flex min-w-0 flex-col rounded-xl border border-line bg-white p-4 text-left shadow-card transition dark:border-white/10 dark:bg-navy-700/60', onClick && 'hover:border-brand-200 hover:shadow-md dark:hover:border-brand-500/40')}>
      <div className="flex items-center justify-between gap-2">
        <span className="line-clamp-2 text-xs font-medium leading-tight text-ink-soft dark:text-slate-400">{label}</span>
        {icon && <span className={clsx('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset', TONE[tone])}>{icon}</span>}
      </div>
      <span className="mt-2 truncate font-display text-2xl font-bold tracking-tight text-ink dark:text-white">{value}</span>
      {hint && <span className="mt-0.5 truncate text-[11px] text-ink-soft dark:text-slate-400">{hint}</span>}
    </Tag>
  );
}

export function Empty({ title, text, action, icon }: { title: string; text?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">{icon ?? <Inbox className="h-5 w-5" />}</div>
      <p className="text-sm font-semibold text-ink dark:text-slate-100">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-ink-soft dark:text-slate-400">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export const Spinner = () => <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>;

export function Alert({ tone = 'info', children, className }: { tone?: 'info' | 'warn' | 'error' | 'ok'; children: ReactNode; className?: string }) {
  const map = {
    info: ['border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200', Info],
    warn: ['border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200', AlertTriangle],
    error: ['border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200', AlertTriangle],
    ok: ['border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200', CheckCircle2],
  } as const;
  const [cls, Icon] = map[tone];
  return <div className={clsx('flex gap-2.5 rounded-lg border px-3 py-2.5 text-sm', cls, className)}><Icon className="mt-0.5 h-4 w-4 shrink-0" /><div className="min-w-0">{children}</div></div>;
}

export function Tabs({ tabs, value, onChange }: { tabs: { value: string; label: string; count?: number }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="-mx-1 mb-4 flex gap-1 overflow-x-auto px-1 pb-1">
      {tabs.map((t) => (
        <button key={t.value} onClick={() => onChange(t.value)}
          className={clsx('flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition',
            value === t.value ? 'bg-navy text-white dark:bg-brand-600' : 'text-ink-soft hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10')}>
          {t.label}
          {t.count !== undefined && <span className={clsx('rounded-full px-1.5 text-[11px]', value === t.value ? 'bg-white/20' : 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300')}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------- modal e gaveta ---------- */
export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" className={clsx('flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-pop sm:rounded-2xl dark:bg-navy-800', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}>
        <header className="flex items-center justify-between border-b border-line px-5 py-4 dark:border-white/10">
          <h2 className="font-display text-base font-bold text-ink dark:text-white">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-soft hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Fechar"><X className="h-4 w-4" /></button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line bg-slate-50/60 px-5 py-3 dark:border-white/10 dark:bg-white/5">{footer}</footer>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, children, subtitle }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-navy-900/40 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="flex h-full w-full max-w-2xl flex-col bg-canvas shadow-pop dark:bg-navy-900">
        <header className="flex items-start justify-between gap-3 border-b border-line bg-white px-5 py-4 dark:border-white/10 dark:bg-navy-800">
          <div className="min-w-0"><div className="truncate font-display text-lg font-bold text-ink dark:text-white">{title}</div>{subtitle && <div className="mt-1">{subtitle}</div>}</div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-soft hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Fechar"><X className="h-5 w-5" /></button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </aside>
    </div>
  );
}

/* ---------- tabela ordenável ---------- */
export interface Col<T> { key: string; label: string; render?: (r: T) => ReactNode; sort?: (r: T) => any; className?: string; hideSm?: boolean }
export function DataTable<T extends Record<string, any>>({ rows, cols, onRow, empty, initialSort }: { rows: T[]; cols: Col<T>[]; onRow?: (r: T) => void; empty?: ReactNode; initialSort?: [string, 'asc' | 'desc'] }) {
  const [sort, setSort] = useState<[string, 'asc' | 'desc'] | null>(initialSort ?? null);
  const [page, setPage] = useState(0);
  const PER = 50;
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const c = cols.find((x) => x.key === sort[0]);
    const get = c?.sort ?? ((r: T) => r[sort[0]]);
    return [...rows].sort((a, b) => { const x = get(a) ?? '', y = get(b) ?? ''; return (x < y ? -1 : x > y ? 1 : 0) * (sort[1] === 'asc' ? 1 : -1); });
  }, [rows, sort, cols]);
  useEffect(() => setPage(0), [rows.length]);
  if (!rows.length) return <>{empty ?? <Empty title="Nada por aqui ainda" />}</>;
  const pages = Math.ceil(sorted.length / PER);
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-ink-soft dark:border-white/10 dark:text-slate-400">
              {cols.map((c) => (
                <th key={c.key} className={clsx('whitespace-nowrap px-4 py-2.5 font-medium', c.hideSm && 'hidden md:table-cell', c.className)}>
                  <button className="inline-flex items-center gap-1 hover:text-ink dark:hover:text-white" onClick={() => setSort((s) => (s?.[0] === c.key ? [c.key, s[1] === 'asc' ? 'desc' : 'asc'] : [c.key, 'asc']))}>
                    {c.label}{sort?.[0] === c.key && (sort[1] === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.slice(page * PER, page * PER + PER).map((r, i) => (
              <tr key={r.id ?? i} onClick={() => onRow?.(r)} className={clsx('border-b border-line/70 last:border-0 dark:border-white/5', onRow && 'cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5')}>
                {cols.map((c) => <td key={c.key} className={clsx('px-4 py-2.5 align-middle text-ink dark:text-slate-200', c.hideSm && 'hidden md:table-cell', c.className)}>{c.render ? c.render(r) : (r[c.key] ?? '—')}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-line px-4 py-2 text-xs text-ink-soft dark:border-white/10">
          <span>{sorted.length} registros</span>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button>
            <span className="px-2 py-1.5">{page + 1}/{pages}</span>
            <Button size="sm" variant="ghost" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Próxima</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- avisos (toasts) ---------- */
type Toast = { id: number; tone: 'ok' | 'error' | 'info' | 'warn'; text: string };
const ToastCtx = createContext<{ push: (tone: Toast['tone'], text: string) => void }>({ push: () => {} });
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const push = useCallback((tone: Toast['tone'], text: string) => {
    const id = Date.now() + Math.random();
    setList((l) => [...l, { id, tone, text }]);
    setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), tone === 'error' ? 7000 : 4000);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6">
        {list.map((t) => <div key={t.id} className="pointer-events-auto w-full max-w-sm shadow-pop"><Alert tone={t.tone}>{t.text}</Alert></div>)}
      </div>
    </ToastCtx.Provider>
  );
}

/** Executa uma ação mostrando sucesso/erro. */
export function useAction() {
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(async <T,>(fn: () => Promise<T>, ok?: string): Promise<T | undefined> => {
    setBusy(true);
    try { const r = await fn(); if (ok) push('ok', ok); return r; }
    catch (e: any) { push('error', e?.message ?? 'Algo deu errado'); return undefined; }
    finally { setBusy(false); }
  }, [push]);
  return { run, busy, push };
}

export function Confirm({ open, onClose, onConfirm, title, text, danger, label = 'Confirmar' }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; text: string; danger?: boolean; label?: string }) {
  return (
    <Modal open={open} onClose={onClose} title={title} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose(); }}>{label}</Button></>}>
      <p className="text-sm text-ink-soft dark:text-slate-300">{text}</p>
    </Modal>
  );
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? 'Buscar…'} className="sm:max-w-xs" type="search" />;
}
