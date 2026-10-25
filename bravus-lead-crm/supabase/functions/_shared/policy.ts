// Regras de envio do WhatsApp — código puro, usado pela Edge Function (que decide de verdade)
// e pela interface (que só mostra ao usuário por que um envio está liberado ou bloqueado).

export type SendKind = 'text' | 'template';
export type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';

export interface SendContext {
  kind: SendKind;
  now: Date;
  lastInboundAt: string | null;          // última mensagem recebida do contato
  suppressed: boolean;                    // está na lista de supressão / pediu para parar
  consentStatus: 'unknown' | 'granted' | 'revoked';
  integrationMode: 'disabled' | 'demo' | 'live';
  template?: { status: string; category: TemplateCategory } | null;
  sentLastMinuteOrg: number;              // envios da empresa no último minuto
  templatesTodayOrg: number;              // modelos fora da janela enviados hoje
  lastTemplateToContactAt: string | null; // último modelo enviado a este contato
  limits: { max_per_minute: number; max_per_day: number; quiet_start: string; quiet_end: string };
  localHour?: string;                     // "HH:MM" no fuso da empresa
}

export interface SendDecision { allowed: boolean; reason: string; code: string }

export const WINDOW_HOURS = 24;

export function windowOpen(lastInboundAt: string | null, now: Date): boolean {
  if (!lastInboundAt) return false;
  return now.getTime() - new Date(lastInboundAt).getTime() < WINDOW_HOURS * 3600_000;
}

export function windowRemaining(lastInboundAt: string | null, now: Date): number {
  if (!lastInboundAt) return 0;
  return Math.max(0, WINDOW_HOURS * 3600_000 - (now.getTime() - new Date(lastInboundAt).getTime()));
}

function inQuietHours(hhmm: string | undefined, start: string, end: string) {
  if (!hhmm) return false;
  return start > end ? hhmm >= start || hhmm < end : hhmm >= start && hhmm < end;
}

export function decideSend(c: SendContext): SendDecision {
  const no = (code: string, reason: string) => ({ allowed: false, code, reason });
  if (c.integrationMode === 'disabled') return no('disabled', 'Integração do WhatsApp desativada. Configure em Integrações.');
  if (c.suppressed || c.consentStatus === 'revoked') return no('opted_out', 'Contato pediu para não receber mensagens (opt-out). Envio bloqueado.');
  if (c.sentLastMinuteOrg >= c.limits.max_per_minute) return no('rate_minute', `Limite de segurança atingido (${c.limits.max_per_minute} mensagens/minuto). Aguarde um pouco.`);

  const open = windowOpen(c.lastInboundAt, c.now);
  if (c.kind === 'text') {
    if (!open) return no('window_closed', 'Janela de 24h fechada: o contato não escreveu nas últimas 24 horas. Use um modelo aprovado pela Meta.');
    return { allowed: true, code: 'ok_window', reason: 'Janela de atendimento aberta — mensagem livre permitida.' };
  }

  // modelo (template)
  if (!c.template) return no('no_template', 'Selecione um modelo de mensagem.');
  if (c.template.status !== 'APPROVED') return no('template_not_approved', 'Este modelo ainda não foi aprovado pela Meta.');
  if (!open) {
    if (c.consentStatus !== 'granted') return no('no_consent', 'Sem consentimento (opt-in) registrado. A Meta exige opt-in para mensagens iniciadas pela empresa.');
    if (c.templatesTodayOrg >= c.limits.max_per_day) return no('rate_day', `Limite diário de segurança atingido (${c.limits.max_per_day} contatos/dia).`);
    if (c.lastTemplateToContactAt && c.now.getTime() - new Date(c.lastTemplateToContactAt).getTime() < 24 * 3600_000) {
      return no('contact_cooldown', 'Já foi enviado um modelo a este contato nas últimas 24h sem resposta. Evite insistência para não reduzir a qualidade do número.');
    }
    if (c.template.category === 'MARKETING' && inQuietHours(c.localHour, c.limits.quiet_start, c.limits.quiet_end)) {
      return no('quiet_hours', `Horário de silêncio (${c.limits.quiet_start}–${c.limits.quiet_end}). Mensagens promocionais ficam bloqueadas.`);
    }
  }
  return { allowed: true, code: 'ok_template', reason: 'Modelo aprovado e requisitos atendidos.' };
}
