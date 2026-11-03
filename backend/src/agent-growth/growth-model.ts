import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
export const STAGES = [
  'new',
  'qualified',
  'contacted',
  'meeting',
  'won',
  'lost',
];
export function object(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new BadRequestException('Objet attendu.');
  return value as Record<string, any>;
}
export function text(value: unknown, max: number, required = false) {
  if (
    typeof value !== 'string' ||
    value.length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)
  )
    throw new BadRequestException('Texte invalide.');
  const result = value.trim();
  if (required && !result) throw new BadRequestException('Champ obligatoire.');
  return result;
}
export function publicUrl(value: unknown, required = true) {
  const s = text(value, 2000, required);
  if (!s && !required) return '';
  try {
    const u = new URL(s);
    if (
      u.protocol !== 'https:' ||
      u.username ||
      u.password ||
      u.port ||
      !u.hostname.includes('.') ||
      /(^|\.)(localhost|local|internal)$/.test(u.hostname) ||
      /^[\d.]+$/.test(u.hostname) ||
      u.hostname.includes(':')
    )
      throw Error();
    return u.toString();
  } catch {
    throw new BadRequestException('Une URL publique HTTPS est requise.');
  }
}
export function email(value: unknown) {
  const s = text(value, 254).toLowerCase();
  if (s && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s))
    throw new BadRequestException('Email professionnel invalide.');
  return s;
}
export function date(value: unknown) {
  if (value === null || value === '') return null;
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    throw new BadRequestException('Date ISO invalide.');
  return new Date(value).toISOString();
}
export function digest(a: Record<string, any>) {
  return createHash('sha256')
    .update(
      JSON.stringify([
        a.channel,
        a.sender,
        a.recipient,
        a.subject,
        a.body,
        a.scheduled_for ?? null,
        a.lead_id ?? null,
      ]),
    )
    .digest('hex');
}
export function brief(value: unknown) {
  const b = object(value);
  const result = {
    offer: text(b.offer, 500, true),
    audience: text(b.audience, 500, true),
    benefit: text(b.benefit, 1000, true),
    cta: publicUrl(b.cta),
    signature: text(b.signature, 300, true),
  };
  if (Object.values(result).reduce((n, v) => n + v.length, 0) > 2400)
    throw new BadRequestException(
      'Le brief dépasse 2 400 caractères au total.',
    );
  return result;
}
export function template(
  b: ReturnType<typeof brief>,
  company: string,
  channel: string,
) {
  const intro = company
    ? `Bonjour à l’équipe de ${company},`
    : 'Vous cherchez un espace pour apprendre, enseigner et organiser vos formations ?';
  return `${intro}\n\n${b.offer}\n${b.benefit}\n\nPour ${b.audience}.\nDécouvrir Kalatty : ${b.cta}\n\n${b.signature}${channel === 'email' ? '\n\nSi cette proposition ne vous concerne pas, indiquez-le par retour de mail : nous ne vous relancerons pas.' : ''}`;
}
