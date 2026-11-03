import { BadRequestException } from '@nestjs/common';

export const ROUTING: Record<string, { department: string; reason: string }> = {
  payment: {
    department: 'finance',
    reason: 'Paiement, facture ou retrait à vérifier.',
  },
  bug: {
    department: 'developer',
    reason: 'Anomalie technique à reproduire avant correction.',
  },
  usability: {
    department: 'ux',
    reason: 'Parcours ou accessibilité à améliorer.',
  },
  course: {
    department: 'product',
    reason: 'Contenu ou offre de formation à examiner.',
  },
  suggestion: {
    department: 'product',
    reason: 'Demande d’évolution du produit.',
  },
  other: {
    department: 'support',
    reason: 'Qualification complémentaire par le support.',
  },
};
export function text(value: unknown, min: number, max: number) {
  if (
    typeof value !== 'string' ||
    value.trim().length < min ||
    value.trim().length > max
  )
    throw new BadRequestException(
      `Texte attendu : ${min} à ${max} caractères.`,
    );
  return value.trim();
}
export function amount(value: unknown) {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value <= 0 ||
    value > 1_000_000_000
  )
    throw new BadRequestException('Montant entier positif en FCFA attendu.');
  return value;
}
export function id(value: unknown) {
  if (
    typeof value !== 'string' ||
    !/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value)
  )
    throw new BadRequestException('Identifiant invalide.');
  return value;
}
export function routeFeedback(category: string, body: string) {
  if (!Object.hasOwn(ROUTING, category))
    throw new BadRequestException('Catégorie inconnue.');
  // Content is data, never agent instructions. Deterministic suggestions work without paid AI.
  if (category !== 'other') return ROUTING[category];
  const normalized = body
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (
    /paiement|rembours|retrait|factur|debite|orange money|mtn/.test(normalized)
  )
    return ROUTING.payment;
  if (/erreur|bug|plant|impossible|ne fonctionne/.test(normalized))
    return ROUTING.bug;
  if (/lisib|couleur|navigation|accessib|menu|logo/.test(normalized))
    return ROUTING.usability;
  return ROUTING.other;
}
export function payoutAccount(input: Record<string, unknown>) {
  const method = input.method;
  if (method !== 'orange_money' && method !== 'mtn_momo')
    throw new BadRequestException('Choisissez Orange Money ou MTN MoMo.');
  const phone = text(input.phone, 9, 20).replace(/[\s()+-]/g, '');
  const normalized = phone.length === 9 ? `237${phone}` : phone;
  if (!/^2376\d{8}$/.test(normalized))
    throw new BadRequestException(
      'Numéro mobile camerounais invalide (+237 et 9 chiffres).',
    );
  return {
    method,
    phone: normalized,
    holder_name: text(input.holderName, 3, 120),
  };
}
