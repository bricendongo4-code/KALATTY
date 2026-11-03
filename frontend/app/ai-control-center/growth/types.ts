export type Lead = {
  id: string;
  company: string;
  source_url: string;
  country: string;
  city: string;
  industry: string;
  qualification: string;
  email: string;
  contact_source_url: string;
  opt_out: boolean;
  stage: string;
  notes: string;
  next_followup_at: string | null;
  version: number;
};
export type Action = {
  id: string;
  lead_id: string | null;
  channel: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  scheduled_for: string | null;
  generation_mode: string;
  status: string;
  digest: string;
  provider_id: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};
export type Brief = {
  offer: string;
  audience: string;
  benefit: string;
  cta: string;
  signature: string;
};
export type GrowthSnapshot = {
  settings: {
    brief: Partial<Brief>;
    discovery_enabled: boolean;
    provider: string;
    query: string;
    country: string;
    last_run_at: string | null;
    last_error: string | null;
    next_run_at: string;
    updated_at: string;
  };
  leads: Lead[];
  actions: Action[];
  events: {
    id: number;
    entity_type: string;
    event: string;
    created_at: string;
    details: { status?: string };
  }[];
  usage: { deliveries: number; discoveries: number };
  limits: { dailyDiscoveries: number; dailyDeliveries: number };
  connections: Record<string, boolean>;
  sender: { email: string; linkedin: string };
};
export type Mutate = (
  path: string,
  body?: unknown,
  method?: string,
) => Promise<Record<string, unknown> | null>;
export const stages: Record<string, string> = {
  new: "Nouveau",
  qualified: "Qualifié",
  contacted: "Contacté",
  meeting: "Rendez-vous",
  won: "Gagné",
  lost: "Perdu",
};
export const states: Record<string, string> = {
  draft: "À examiner",
  approved: "Approuvé",
  rejected: "Refusé",
  dispatching: "Exécution en cours · ne pas renvoyer",
  sent: "Transmis au fournisseur",
  exported: "Export autorisé",
  failed: "Échec",
  unknown: "Résultat incertain · vérifier le fournisseur",
};
export const localDate = (s: string | null) =>
  s
    ? new Date(Date.parse(s) - new Date(s).getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";
export const isoDate = (s: string) => (s ? new Date(s).toISOString() : null);
export function download(
  name: string,
  value: string,
  type = "text/plain;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function calendar(id: string, title: string, when: string) {
  const fmt = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const clean = (s: string) =>
    s
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  download(
    "kalatty-rappel.ics",
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Kalatty//Rappels//FR",
      "BEGIN:VEVENT",
      "UID:" + clean(id) + "@kalatty",
      "DTSTAMP:" + fmt(new Date()),
      "DTSTART:" + fmt(new Date(when)),
      "DTEND:" + fmt(new Date(Date.parse(when) + 30 * 60000)),
      "SUMMARY:" + clean(title),
      "END:VEVENT",
      "END:VCALENDAR",
      "",
    ].join("\r\n"),
    "text/calendar;charset=utf-8",
  );
}
