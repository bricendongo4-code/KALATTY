"use client";
const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
export async function commerceFetch<T>(
  path: string,
  body?: unknown,
  method = "POST",
): Promise<T> {
  const token = localStorage.getItem("kalatty_token");
  if (!token)
    throw Error("Connectez-vous à votre compte Kalatty pour continuer.");
  const r = await fetch(API + path, {
    method: body === undefined ? "GET" : method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store",
  });
  const b = await r.json().catch(() => ({}));
  if (!r.ok)
    throw Error(
      r.status === 401
        ? "Votre session a expiré. Reconnectez-vous."
        : r.status === 403
          ? "Vous n’avez pas accès à cet espace."
          : Array.isArray(b.message)
            ? b.message.join(" · ")
            : (b.message ?? "Action indisponible."),
    );
  return b;
}
export const money = (n: number) =>
  new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
export const departments: Record<string, string> = {
  support: "Support",
  finance: "Finance",
  developer: "Développement",
  ux: "UX / UI",
  product: "Produit",
  security: "Sécurité",
  qa: "Qualité",
  marketing: "Marketing",
  sales: "Commercial",
  analytics: "Analytics",
  crm: "CRM",
};
export const statuses: Record<string, string> = {
  new: "Reçu",
  routed: "Orienté vers un service",
  in_progress: "En cours",
  resolved: "Traité",
  requested: "Demande reçue",
  approved: "Approuvé · versement à effectuer",
  rejected: "Refusé",
  paid: "Payé",
  pending: "En attente",
  processing: "En cours",
  failed: "Échoué",
  refunded: "Remboursé",
  unknown: "À rapprocher",
  planned: "Prévisionnel",
};
