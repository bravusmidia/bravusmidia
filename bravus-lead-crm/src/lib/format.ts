export const brl = (v: number | string | null | undefined) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(Number(v ?? 0));

export const brl2 = (v: number | string | null | undefined) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v ?? 0));

export const num = (v: number) => new Intl.NumberFormat('pt-BR').format(v);
export const pct = (v: number) => `${(Number.isFinite(v) ? v : 0).toFixed(1).replace('.', ',')}%`;

export function date(d: string | Date | null | undefined) {
  if (!d) return '—';
  const x = typeof d === 'string' ? new Date(d.length === 10 ? d + 'T12:00:00' : d) : d;
  return x.toLocaleDateString('pt-BR');
}
export function dateTime(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function daysSince(d: string | null | undefined, now = new Date()): number | null {
  if (!d) return null;
  return Math.floor((now.getTime() - new Date(d).getTime()) / 86400000);
}

export function relative(d: string | null | undefined, now = new Date()) {
  if (!d) return 'nunca';
  const diff = now.getTime() - new Date(d).getTime();
  const abs = Math.abs(diff);
  const m = Math.round(abs / 60000), h = Math.round(abs / 3600000), dd = Math.round(abs / 86400000);
  const s = m < 1 ? 'agora' : m < 60 ? `${m} min` : h < 24 ? `${h} h` : `${dd} d`;
  if (s === 'agora') return s;
  return diff >= 0 ? `há ${s}` : `em ${s}`;
}

export const todayISO = () => new Date().toISOString().slice(0, 10);

export function toLocalInput(d: string | null | undefined) {
  if (!d) return '';
  const x = new Date(d);
  const off = x.getTimezoneOffset();
  return new Date(x.getTime() - off * 60000).toISOString().slice(0, 16);
}
export const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

export function initials(name?: string | null) {
  return (name ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';
}
