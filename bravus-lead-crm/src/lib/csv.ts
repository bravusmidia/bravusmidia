/** Protege contra "CSV formula injection" ao exportar (=, +, -, @, tab, CR no início). */
export function safeCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  let s = Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  if (/[";\n\r,]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function toCSV(rows: Record<string, unknown>[], columns: { key: string; label: string }[]): string {
  const head = columns.map((c) => safeCell(c.label)).join(';');
  const body = rows.map((r) => columns.map((c) => safeCell(r[c.key])).join(';')).join('\r\n');
  return '﻿' + head + '\r\n' + body;
}

export function downloadText(filename: string, content: string, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
