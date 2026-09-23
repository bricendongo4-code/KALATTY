import { redirect } from "next/navigation";

type Params = Promise<{ path?: string[] }>;

const ROLE_ALIASES: Record<string, string> = {
  etudiant: "student",
  professeur: "teacher",
  pedagogie: "pedagogy",
  direction: "admin",
  student: "student",
  teacher: "teacher",
  pedagogy: "pedagogy",
  admin: "admin",
};

const SECTION_ALIASES: Record<string, Record<string, string>> = {
  student: {
    "emploi-du-temps": "schedule",
    cours: "subjects",
    travaux: "assignments",
    evaluations: "assignments",
    resultats: "results",
    classe: "class",
    presences: "attendance",
    messagerie: "notifications",
    actualites: "announcements",
    ressources: "subjects",
    aide: "help",
  },
  teacher: {
    "emploi-du-temps": "schedule",
    preparer: "lesson-plans",
    seances: "sessions",
    travaux: "assignments",
    suivi: "progress",
    ressources: "resources",
    messagerie: "notifications",
    actualites: "announcements",
    parametres: "settings",
    aide: "help",
  },
  pedagogy: {
    formations: "programs",
    "emploi-du-temps": "schedule",
    suivi: "progress",
    evaluations: "assessments",
    "vie-scolaire": "attendance",
    etudiants: "students",
    enseignants: "teachers",
    rapports: "reports",
    messagerie: "notifications",
    parametres: "settings",
    aide: "help",
  },
  admin: {
    utilisateurs: "users",
    etablissement: "organization",
    "formations-classes": "academics",
    "emploi-du-temps": "schedule",
    inscriptions: "admissions",
    suivi: "reports",
    evaluations: "assignments",
    rapports: "reports",
    messagerie: "notifications",
    parametres: "settings",
    aide: "help",
  },
};

export default async function LegacyCampusRedirect({ params }: { params: Params }) {
  const { path = [] } = await params;
  const role = ROLE_ALIASES[path[0] ?? ""];
  if (!role) redirect("/establishment");
  const section = path[1] ? SECTION_ALIASES[role]?.[path[1]] ?? path[1] : "";
  const rest = path.slice(2);
  redirect(["/establishment", role, section, ...rest].filter(Boolean).join("/"));
}
