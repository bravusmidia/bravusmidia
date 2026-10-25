import { describe, expect, it } from 'vitest';
import { normalizePhone, whatsappLink } from '../src/lib/phone';
import { safeCell, toCSV } from '../src/lib/csv';
import { guessMapping, locateTable, parseVcf, pickSheet, prepareRows, summarize } from '../src/lib/importer';
import { computeDashboard, inactivityLevel, needsTeamReply, waitingLead } from '../src/lib/metrics';
import { decideSend, windowOpen } from '../supabase/functions/_shared/policy';

describe('telefone', () => {
  it('normaliza celular brasileiro com DDD', () => {
    expect(normalizePhone('(85) 99122-5865')).toMatchObject({ e164: '+5585991225865', valid: true });
    expect(normalizePhone('85991225865').e164).toBe('+5585991225865');
    expect(normalizePhone('5585991225865').e164).toBe('+5585991225865');
    expect(normalizePhone('+55 85 99122-5865').e164).toBe('+5585991225865');
    expect(normalizePhone('0 85 99122-5865').e164).toBe('+5585991225865');
  });
  it('aceita internacional e preserva o original', () => {
    const p = normalizePhone('+1 (415) 555-2671');
    expect(p.valid).toBe(true);
    expect(p.original).toBe('+1 (415) 555-2671');
  });
  it('rejeita lixo', () => {
    expect(normalizePhone('123').valid).toBe(false);
    expect(normalizePhone('').e164).toBeNull();
    expect(normalizePhone('abc').valid).toBe(false);
  });
  it('gera link wa.me sem prometer sincronização', () => {
    expect(whatsappLink('+5585991225865')).toBe('https://wa.me/5585991225865');
  });
});

describe('exportação CSV segura', () => {
  it('neutraliza fórmulas', () => {
    expect(safeCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(safeCell('+5585')).toBe("'+5585");
    expect(safeCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(safeCell('-2+3')).toBe("'-2+3");
    expect(safeCell('normal')).toBe('normal');
  });
  it('monta cabeçalho e linhas', () => {
    const out = toCSV([{ a: 'x;y', b: 2 }], [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }]);
    expect(out).toContain('A;B');
    expect(out).toContain('"x;y";2');
  });
});

describe('importação', () => {
  const rows = [
    { Nome: 'Ana', Telefone: '(85) 98888-1111', Email: 'ana@x.com' },
    { Nome: 'Ana repetida', Telefone: '85 98888-1111', Email: '' },
    { Nome: 'Bia', Telefone: '85 97777-2222', Email: '' },
    { Nome: '', Telefone: '', Email: '' },
    { Nome: 'Caio', Telefone: '12', Email: 'invalido' },
  ];
  it('detecta colunas automaticamente', () => {
    const m = guessMapping(['Nome', 'Telefone', 'Email']);
    expect(m).toMatchObject({ full_name: 'Nome', phone: 'Telefone', email: 'Email' });
  });
  it('separa novos, duplicados e inválidos', () => {
    const map = guessMapping(['Nome', 'Telefone', 'Email']);
    const existing = { phones: new Map([['+5585977772222', 'lead-bia']]), emails: new Map<string, string>() };
    const p = prepareRows(rows, map, existing);
    expect(p.map((r) => r.status)).toEqual(['new', 'duplicate_in_file', 'duplicate_existing', 'invalid', 'invalid']);
    expect(p[2].existingId).toBe('lead-bia');
    const s = summarize(p);
    expect(s).toMatchObject({ total: 5, valid: 1, duplicateExisting: 1, duplicateInFile: 1, invalid: 2 });
  });
  it('lê contatos VCF', () => {
    const v = parseVcf('BEGIN:VCARD\nVERSION:3.0\nFN:João Silva\nTEL;TYPE=CELL:+55 85 99999-0000\nORG:Padaria;\nEND:VCARD');
    expect(v[0]).toMatchObject({ Nome: 'João Silva', Telefone: '+55 85 99999-0000', Empresa: 'Padaria' });
  });
});

describe('regras do WhatsApp', () => {
  const now = new Date('2026-10-25T15:00:00Z');
  const base = {
    now, lastInboundAt: null as string | null, suppressed: false, consentStatus: 'unknown' as const, integrationMode: 'live' as const,
    sentLastMinuteOrg: 0, templatesTodayOrg: 0, lastTemplateToContactAt: null, localHour: '12:00',
    limits: { max_per_minute: 20, max_per_day: 200, quiet_start: '21:00', quiet_end: '08:00' },
  };
  const tpl = { status: 'APPROVED', category: 'MARKETING' as const };

  it('janela de 24h', () => {
    expect(windowOpen('2026-10-25T00:00:00Z', now)).toBe(true);
    expect(windowOpen('2026-10-24T14:59:00Z', now)).toBe(false);
  });
  it('mensagem livre só com janela aberta', () => {
    expect(decideSend({ ...base, kind: 'text' }).code).toBe('window_closed');
    expect(decideSend({ ...base, kind: 'text', lastInboundAt: '2026-10-25T14:00:00Z' }).allowed).toBe(true);
  });
  it('opt-out bloqueia tudo, inclusive dentro da janela', () => {
    expect(decideSend({ ...base, kind: 'text', lastInboundAt: '2026-10-25T14:00:00Z', suppressed: true }).code).toBe('opted_out');
    expect(decideSend({ ...base, kind: 'template', template: tpl, consentStatus: 'revoked' }).code).toBe('opted_out');
  });
  it('modelo fora da janela exige aprovação e consentimento', () => {
    expect(decideSend({ ...base, kind: 'template', template: { ...tpl, status: 'PENDING' } }).code).toBe('template_not_approved');
    expect(decideSend({ ...base, kind: 'template', template: tpl }).code).toBe('no_consent');
    expect(decideSend({ ...base, kind: 'template', template: tpl, consentStatus: 'granted' }).allowed).toBe(true);
  });
  it('limites, insistência e horário de silêncio', () => {
    const ok = { ...base, kind: 'template' as const, template: tpl, consentStatus: 'granted' as const };
    expect(decideSend({ ...ok, sentLastMinuteOrg: 20 }).code).toBe('rate_minute');
    expect(decideSend({ ...ok, templatesTodayOrg: 200 }).code).toBe('rate_day');
    expect(decideSend({ ...ok, lastTemplateToContactAt: '2026-10-25T10:00:00Z' }).code).toBe('contact_cooldown');
    expect(decideSend({ ...ok, localHour: '22:30' }).code).toBe('quiet_hours');
    expect(decideSend({ ...ok, localHour: '07:59' }).code).toBe('quiet_hours');
    expect(decideSend({ ...ok, localHour: '22:30', template: { status: 'APPROVED', category: 'UTILITY' } }).allowed).toBe(true);
  });
  it('integração desativada nunca envia', () => {
    expect(decideSend({ ...base, kind: 'text', integrationMode: 'disabled', lastInboundAt: '2026-10-25T14:00:00Z' }).allowed).toBe(false);
  });
});

describe('métricas do dashboard', () => {
  const stages = [
    { id: 's1', name: 'Novo lead', kind: 'open', probability: 10 },
    { id: 's2', name: 'Negociação', kind: 'open', probability: 50 },
    { id: 'w', name: 'Fechado — ganho', kind: 'won', probability: 100 },
    { id: 'l', name: 'Fechado — perdido', kind: 'lost', probability: 0 },
  ];
  const now = new Date('2026-10-25T12:00:00Z');
  const leads = [
    { id: 'a', stage_id: 's1', potential_value: 1000, created_at: '2026-10-25T10:00:00Z', last_inbound_at: '2026-10-25T11:00:00Z', last_outbound_at: '2026-10-25T09:00:00Z' },
    { id: 'b', stage_id: 's2', potential_value: 2000, created_at: '2026-09-01T10:00:00Z', last_outbound_at: '2026-10-01T10:00:00Z' },
    { id: 'c', stage_id: 'w', potential_value: 1500, created_at: '2026-10-01T10:00:00Z', won_at: '2026-10-10T10:00:00Z' },
    { id: 'd', stage_id: 'l', potential_value: 500, created_at: '2026-10-02T10:00:00Z', lost_at: '2026-10-12T10:00:00Z', lost_reason: 'Preço' },
  ];
  const sales = [{ lead_id: 'c', setup_value: 500, monthly_value: 1500, duration_months: 6, discount: 0, closed_at: '2026-10-10', contract_status: 'active' }];
  const payments = [{ amount: 1500, status: 'paid', paid_at: '2026-10-15' }, { amount: 1500, status: 'pending', due_date: '2026-11-15' }];
  const m = computeDashboard({ leads, stages, sales, payments, tasks: [{ status: 'open', due_at: '2026-10-24T10:00:00Z' }], clients: [{ status: 'active', started_at: '2026-10-10' }, { status: 'churned', started_at: '2026-01-01', churned_at: '2026-10-20' }], now, from: new Date('2026-10-01T00:00:00Z'), to: now });

  it('separa contratado, recorrente e recebido', () => {
    expect(m.contracted).toBe(500 + 1500 * 6);
    expect(m.mrr).toBe(1500);
    expect(m.received).toBe(1500);
    expect(m.receivable).toBe(1500);
  });
  it('conversão, pipeline e ponderado', () => {
    expect(m.conversion).toBe(50);
    expect(m.pipeline).toBe(3000);
    expect(m.weighted).toBe(1000 * 0.1 + 2000 * 0.5);
  });
  it('quem precisa de resposta e quem está parado', () => {
    expect(m.needsReply).toBe(1);
    expect(m.waitingLead).toBe(1);
    expect(m.noContact15).toBe(1);
    expect(m.overdueTasks).toBe(1);
    expect(needsTeamReply(leads[0])).toBe(true);
    expect(waitingLead(leads[1])).toBe(true);
    expect(inactivityLevel(leads[1], undefined, now.getTime())).toBe('review');
  });
  it('clientes que entram e saem', () => {
    expect(m.activeClients).toBe(1);
    expect(m.clientsIn).toBe(1);
    expect(m.clientsOut).toBe(1);
  });
});

describe('importação — planilha com aba de resumo', () => {
  const resumo = [
    ['Resumo da extração'],
    [],
    ['Total de registros no PDF', 312],
    ['Registros após remoção de duplicados exatos', 298],
    ['Páginas processadas', 14],
    [],
    ['Observação', 'Gerado automaticamente'],
  ];
  const contatos = [
    ['Contatos extraídos'],
    [],
    ['Nome', 'Empresa', 'Telefone', 'E-mail'],
    ['Ana Lima', 'Padaria Sol', '(85) 99999-1111', ''],
    ['', '', '', ''],
    ['João Melo', '', '85 98888-2222', 'joao@ex.com'],
  ];

  it('escolhe a aba de contatos, não a de resumo, mesmo sendo a 2ª', () => {
    const p = pickSheet([{ sheet: 'Resumo', data: resumo }, { sheet: 'Contatos', data: contatos }]);
    expect(p.sheet).toBe('Contatos');
    expect(p.sheets).toEqual(['Resumo', 'Contatos']);
    expect(p.headers).toEqual(['Nome', 'Empresa', 'Telefone', 'E-mail']);
    expect(p.headerLine).toBe(3);
    expect(p.rows).toHaveLength(2); // linha em branco ignorada
    expect(p.lineNumbers).toEqual([4, 6]);
    const prep = prepareRows(p.rows, guessMapping(p.headers), { phones: new Map(), emails: new Map() }, p.lineNumbers);
    expect(summarize(prep).valid).toBe(2);
    expect(prep.map((r) => r.line)).toEqual([4, 6]);
  });

  it('respeita a aba escolhida manualmente', () => {
    const p = pickSheet([{ sheet: 'Resumo', data: resumo }, { sheet: 'Contatos', data: contatos }], 'Resumo');
    expect(p.sheet).toBe('Resumo');
  });

  it('acha o cabeçalho abaixo de linhas de título', () => {
    expect(locateTable(contatos).headerIndex).toBe(2);
    expect(locateTable(resumo).score).toBe(0);
  });
});
