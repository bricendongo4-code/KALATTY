import { HttpException } from '@nestjs/common';
export function paidPeriodActive(
  institution: { paid_until?: string | null } | null | undefined,
  now = Date.now(),
) {
  // Legacy/trial spaces are not silently converted to paid accounts by this migration.
  return !institution?.paid_until || Date.parse(institution.paid_until) > now;
}
export function assertPaidPeriod(
  institution: { paid_until?: string | null } | null | undefined,
) {
  if (!paidPeriodActive(institution))
    throw new HttpException(
      'Le forfait payé de cet établissement a expiré. Le responsable peut le renouveler dans Abonnement de l’établissement.',
      402,
    );
}
export function membershipPeriodActive(row: any) {
  const room = Array.isArray(row.rooms) ? row.rooms[0] : row.rooms;
  const institution = Array.isArray(room?.institutions)
    ? room.institutions[0]
    : room?.institutions;
  return paidPeriodActive(institution);
}
