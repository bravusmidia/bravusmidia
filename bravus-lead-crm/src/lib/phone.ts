import { parsePhoneNumberFromString } from 'libphonenumber-js';

export interface NormalizedPhone {
  original: string;
  e164: string | null;
  valid: boolean;
}

/**
 * Normaliza telefone brasileiro ou internacional para E.164 (+5585999999999).
 * Preserva o original para auditoria. Um número válido NÃO prova que existe conta no WhatsApp.
 */
export function normalizePhone(input: string | null | undefined, defaultCountry: 'BR' = 'BR'): NormalizedPhone {
  const original = (input ?? '').toString().trim();
  if (!original) return { original, e164: null, valid: false };
  let cleaned = original.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('00')) cleaned = '+' + cleaned.slice(2);
  // números brasileiros digitados com 55 mas sem "+"
  if (!cleaned.startsWith('+') && /^55\d{10,11}$/.test(cleaned)) cleaned = '+' + cleaned;
  // remove zero de operadora/discagem nacional (ex.: 0 85 9...)
  if (!cleaned.startsWith('+') && cleaned.startsWith('0')) cleaned = cleaned.replace(/^0+/, '');
  const parsed = parsePhoneNumberFromString(cleaned, defaultCountry);
  if (!parsed) return { original, e164: null, valid: false };
  const valid = parsed.isValid();
  return { original, e164: valid ? parsed.number : null, valid };
}

export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return '';
  const p = parsePhoneNumberFromString(e164);
  return p ? (p.country === 'BR' ? p.formatNational() : p.formatInternational()) : e164;
}

/** Link para abrir a conversa no app/navegador do WhatsApp. NÃO sincroniza mensagens. */
export function whatsappLink(e164: string | null | undefined, text?: string): string | null {
  if (!e164) return null;
  const n = e164.replace(/\D/g, '');
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
