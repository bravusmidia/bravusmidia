import Papa from 'papaparse';
import { normalizePhone } from './phone';

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_ROWS = 20000;

export const IMPORT_FIELDS = [
  { key: 'full_name', label: 'Nome', required: true, aliases: ['nome', 'name', 'nome completo', 'contato', 'full name', 'cliente'] },
  { key: 'company', label: 'Empresa', aliases: ['empresa', 'company', 'negócio', 'negocio', 'razão social', 'loja'] },
  { key: 'phone', label: 'Telefone / WhatsApp', aliases: ['telefone', 'phone', 'celular', 'whatsapp', 'fone', 'tel', 'mobile', 'número', 'numero'] },
  { key: 'email', label: 'E-mail', aliases: ['email', 'e-mail', 'mail'] },
  { key: 'city', label: 'Cidade', aliases: ['cidade', 'city', 'município'] },
  { key: 'state', label: 'Estado (UF)', aliases: ['estado', 'uf', 'state'] },
  { key: 'segment', label: 'Segmento', aliases: ['segmento', 'nicho', 'ramo', 'segment'] },
  { key: 'source', label: 'Origem', aliases: ['origem', 'source', 'canal', 'fonte'] },
  { key: 'campaign', label: 'Campanha', aliases: ['campanha', 'campaign', 'anúncio', 'anuncio'] },
  { key: 'instagram', label: 'Instagram', aliases: ['instagram', 'insta', '@'] },
  { key: 'website', label: 'Site', aliases: ['site', 'website', 'url'] },
  { key: 'notes', label: 'Observações', aliases: ['observações', 'observacoes', 'obs', 'notas', 'notes'] },
  { key: 'tags', label: 'Etiquetas', aliases: ['etiquetas', 'tags', 'labels'] },
  { key: 'consent', label: 'Consentimento (sim/não)', aliases: ['consentimento', 'opt-in', 'optin', 'autorizou'] },
] as const;

export type FieldKey = (typeof IMPORT_FIELDS)[number]['key'];
export type Mapping = Partial<Record<FieldKey, string>>;
export type RawRow = Record<string, string>;

export interface ParsedFile {
  headers: string[];
  rows: RawRow[];
  /** Número (1-based) da linha do arquivo onde está o cabeçalho. */
  headerLine: number;
  /** Linha real do arquivo para cada item de rows (para mostrar erros na linha certa). */
  lineNumbers?: number[];
  /** Aba usada (só XLSX) e todas as abas do arquivo. */
  sheet?: string;
  sheets?: string[];
}

const ALLOWED: Record<string, string[]> = {
  csv: ['text/csv', 'application/vnd.ms-excel', 'text/plain', ''],
  txt: ['text/plain', ''],
  json: ['application/json', ''],
  vcf: ['text/vcard', 'text/x-vcard', 'text/directory', ''],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ''],
};

export function checkFile(f: File): string | null {
  const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED[ext]) return 'Formato não suportado para importação de contatos. Use CSV, XLSX, JSON, VCF ou TXT. (XLS antigo: salve como XLSX.)';
  if (!ALLOWED[ext].includes(f.type)) return `Tipo de arquivo (${f.type}) não confere com a extensão .${ext}.`;
  if (f.size > MAX_FILE_BYTES) return 'Arquivo maior que 10 MB.';
  if (f.size === 0) return 'Arquivo vazio.';
  return null;
}

const clean = (v: unknown) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, 2000);
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

/** Quantos campos de contato um conjunto de títulos de coluna reconhece (nome/telefone/e-mail valem mais). */
export function headerScore(cells: string[]): number {
  const m = guessMapping(cells.map(clean).filter(Boolean));
  let score = 0;
  for (const k of Object.keys(m)) score += k === 'full_name' || k === 'phone' || k === 'email' ? 3 : 1;
  return score;
}

const HEADER_SCAN = 25;

/**
 * Acha a linha de cabeçalho dentro de uma grade (planilha ou CSV sem cabeçalho fixo).
 * Planilhas exportadas costumam ter título, resumo ou linhas vazias antes da tabela real.
 */
export function locateTable(grid: unknown[][]): { headerIndex: number; score: number } {
  let best = { headerIndex: 0, score: 0 };
  const limit = Math.min(grid.length, HEADER_SCAN);
  for (let i = 0; i < limit; i++) {
    const cells = (grid[i] ?? []).map(clean);
    if (cells.filter(Boolean).length < 2) continue;
    const score = headerScore(cells);
    if (score > best.score) best = { headerIndex: i, score };
  }
  return best;
}

function gridToParsed(grid: unknown[][], extra: Partial<ParsedFile> = {}): ParsedFile {
  const { headerIndex } = locateTable(grid);
  const head = grid[headerIndex] ?? [];
  const width = Math.max(head.length, ...grid.slice(headerIndex + 1).map((r) => r?.length ?? 0));
  const used = new Map<string, number>();
  const headers = Array.from({ length: width }, (_, i) => {
    const base = clean(head[i]) || `Coluna ${i + 1}`;
    const n = (used.get(base) ?? 0) + 1; used.set(base, n);
    return n > 1 ? `${base} (${n})` : base;
  });
  const rows: RawRow[] = [];
  const lines: number[] = [];
  grid.slice(headerIndex + 1).forEach((r, j) => {
    const row = Object.fromEntries(headers.map((h, i) => [h, clean(r?.[i])]));
    if (Object.values(row).some(Boolean)) { rows.push(row); lines.push(headerIndex + 2 + j); }
  });
  return finish({ headers, rows, headerLine: headerIndex + 1, lineNumbers: lines, ...extra });
}

export async function parseFile(f: File, sheetName?: string): Promise<ParsedFile> {
  const ext = f.name.split('.').pop()?.toLowerCase();
  if (ext === 'xlsx') {
    const mod: any = await import('read-excel-file/browser');
    const all: { sheet: string; data: unknown[][] }[] = await mod.default(f);
    return pickSheet(all, sheetName);
  }
  const text = await f.text();
  if (ext === 'json') {
    const data = JSON.parse(text);
    const arr: any[] = Array.isArray(data) ? data : Array.isArray(data?.contacts) ? data.contacts : [];
    const headers = Array.from(new Set(arr.flatMap((o) => (o && typeof o === 'object' ? Object.keys(o) : []))));
    return finish({ headers, rows: arr.map((o) => Object.fromEntries(headers.map((h) => [h, clean(o?.[h])]))), headerLine: 1 });
  }
  if (ext === 'vcf') return finish({ headers: ['Nome', 'Telefone', 'E-mail', 'Empresa'], rows: parseVcf(text), headerLine: 1 });
  // CSV / TXT (separador detectado automaticamente; cabeçalho pode não estar na 1ª linha)
  const res = Papa.parse<string[]>(text, { header: false, skipEmptyLines: false });
  return gridToParsed(res.data);
}

/** Escolhe a aba com a tabela de contatos (ou a aba pedida). Exportado para testes. */
export function pickSheet(all: { sheet: string; data: unknown[][] }[], sheetName?: string): ParsedFile {
  if (!all.length) return { headers: [], rows: [], headerLine: 1 };
  const sheets = all.map((s) => s.sheet);
  let chosen = sheetName ? all.find((s) => s.sheet === sheetName) : undefined;
  if (!chosen) {
    // maior pontuação de cabeçalho; empate → aba com mais linhas
    chosen = [...all].sort((a, b) => {
      const d = locateTable(b.data).score - locateTable(a.data).score;
      return d !== 0 ? d : b.data.length - a.data.length;
    })[0];
  }
  return gridToParsed(chosen.data, { sheet: chosen.sheet, sheets });
}

function finish(p: ParsedFile): ParsedFile {
  if (p.rows.length > MAX_ROWS) throw new Error(`O arquivo tem ${p.rows.length} linhas. O limite por importação é ${MAX_ROWS}.`);
  return p;
}

export function parseVcf(text: string): RawRow[] {
  const out: RawRow[] = [];
  for (const card of text.split(/BEGIN:VCARD/i).slice(1)) {
    const unfolded = card.replace(/\r?\n[ \t]/g, '');
    const get = (re: RegExp) => clean(unfolded.match(re)?.[1] ?? '');
    out.push({
      Nome: get(/^FN[^:]*:(.*)$/im) || get(/^N[^:]*:(.*)$/im).split(';').filter(Boolean).reverse().join(' '),
      Telefone: get(/^TEL[^:]*:(.*)$/im),
      'E-mail': get(/^EMAIL[^:]*:(.*)$/im),
      Empresa: get(/^ORG[^:]*:(.*)$/im).replace(/;/g, ' ').trim(),
    });
  }
  return out;
}

export function guessMapping(headers: string[]): Mapping {
  const m: Mapping = {};
  for (const f of IMPORT_FIELDS) {
    const hit = headers.find((h) => f.aliases.some((a) => norm(h) === norm(a))) ?? headers.find((h) => f.aliases.some((a) => a.length > 3 && norm(h).includes(norm(a))));
    if (hit && !Object.values(m).includes(hit)) m[f.key] = hit;
  }
  return m;
}

export interface ExistingIndex { phones: Map<string, string>; emails: Map<string, string> }

export type RowStatus = 'new' | 'duplicate_existing' | 'duplicate_in_file' | 'invalid';
export interface PreparedRow {
  line: number;
  status: RowStatus;
  errors: string[];
  existingId?: string;
  data: Record<string, any>;
}

export function prepareRows(rows: RawRow[], map: Mapping, existing: ExistingIndex, lineNumbers?: number[]): PreparedRow[] {
  const seenPhones = new Set<string>();
  const seenEmails = new Set<string>();
  return rows.map((r, i) => {
    const get = (k: FieldKey) => (map[k] ? clean(r[map[k]!]) : '');
    const errors: string[] = [];
    const name = get('full_name') || get('company');
    const phone = normalizePhone(get('phone'));
    const emailRaw = get('email').toLowerCase();
    const email = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailRaw) ? emailRaw : '';
    if (!name) errors.push('Sem nome');
    if (!phone.e164 && !email) errors.push(get('phone') ? 'Telefone inválido e sem e-mail' : 'Sem telefone e sem e-mail');
    if (emailRaw && !email) errors.push('E-mail inválido');
    const consentRaw = norm(get('consent'));
    const data = {
      full_name: name.slice(0, 160), company: get('company') || null,
      phone_original: phone.original || null, phone_e164: phone.e164, phone_valid: phone.valid,
      whatsapp: phone.e164, email: email || null, city: get('city') || null, state: get('state').toUpperCase().slice(0, 2) || null,
      segment: get('segment') || null, source: get('source') || 'Importação', campaign: get('campaign') || null,
      instagram: get('instagram') || null, website: get('website') || null, notes: get('notes') || null,
      tags: get('tags') ? get('tags').split(/[,;|]/).map((t) => t.trim()).filter(Boolean).slice(0, 10) : [],
      _consent: ['sim', 's', 'yes', 'y', 'true', '1', 'autorizado'].includes(consentRaw),
    };
    let status: RowStatus = 'new';
    let existingId: string | undefined;
    const fatal = errors.some((e) => e !== 'E-mail inválido');
    if (fatal) status = 'invalid';
    else if (phone.e164 && existing.phones.has(phone.e164)) { status = 'duplicate_existing'; existingId = existing.phones.get(phone.e164); }
    else if (email && existing.emails.has(email)) { status = 'duplicate_existing'; existingId = existing.emails.get(email); }
    else if ((phone.e164 && seenPhones.has(phone.e164)) || (email && seenEmails.has(email))) status = 'duplicate_in_file';
    if (status !== 'invalid') { if (phone.e164) seenPhones.add(phone.e164); if (email) seenEmails.add(email); }
    return { line: lineNumbers?.[i] ?? i + 2, status, errors, existingId, data };
  });
}

export function summarize(rows: PreparedRow[]) {
  return {
    total: rows.length,
    valid: rows.filter((r) => r.status === 'new').length,
    duplicateExisting: rows.filter((r) => r.status === 'duplicate_existing').length,
    duplicateInFile: rows.filter((r) => r.status === 'duplicate_in_file').length,
    invalid: rows.filter((r) => r.status === 'invalid').length,
    validPhones: rows.filter((r) => r.data.phone_valid).length,
    withConsent: rows.filter((r) => r.data._consent).length,
  };
}
