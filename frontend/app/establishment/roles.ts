export type RoleSlug = "student" | "teacher" | "pedagogy" | "admin";

export type NavItem = { slug: string; label: string; icon: string };

export type RoleConfig = {
  slug: RoleSlug;
  /** Nom du rôle affiché dans le sélecteur. */
  name: string;
  /** Titre de la barre supérieure. */
  topTitle: string;
  /** Sous-titre de la marque dans la barre latérale. */
  brandSub: string;
  pickColor: string;
  pitch: string;
  user: { name: string; sub: string };
  notifications: number;
  nav: NavItem[];
  foot: NavItem[];
  searchPlaceholder: string;
};

/** Navigation et identité de chaque rôle, d'après l'architecture fonctionnelle de l'Espace Établissement. */
export const ROLES: Record<RoleSlug, RoleConfig> = {
  student: {
    slug: "student",
    name: "Étudiant",
    topTitle: "Espace étudiant",
    brandSub: "Apprendre aujourd'hui, construire demain",
    pickColor: "#0f9d9a",
    pitch:
      "Bureau scolaire numérique : journée, emploi du temps, cours, travaux, évaluations, résultats et vie scolaire.",
    user: { name: "Joss NDONGO", sub: "BTS MCO - 1ère année" },
    notifications: 2,
    searchPlaceholder: "Rechercher un cours, un document, un enseignant...",
    nav: [
      { slug: "", label: "Accueil", icon: "home" },
      {
        slug: "schedule",
        label: "Mon emploi du temps",
        icon: "calendar",
      },
      { slug: "subjects", label: "Mes matières", icon: "book" },
      { slug: "assignments", label: "Mes travaux", icon: "edit" },
      { slug: "results", label: "Mes résultats", icon: "chart" },
      { slug: "class", label: "Ma classe", icon: "users" },
      { slug: "attendance", label: "Mes présences", icon: "checkCircle" },
      { slug: "documents", label: "Mes documents", icon: "file" },
      { slug: "notifications", label: "Notifications", icon: "bell" },
      { slug: "announcements", label: "Actualités", icon: "megaphone" },
    ],
    foot: [{ slug: "help", label: "Aide & support", icon: "help" }],
  },
  teacher: {
    slug: "teacher",
    name: "Professeur",
    topTitle: "Espace Professeur",
    brandSub: "Transmettre, accompagner, faire grandir",
    pickColor: "#1a7fa8",
    pitch:
      "Gestion complète de ses classes : préparation, séances, appel, cahier de texte, travaux, évaluations et suivi individuel.",
    user: { name: "Prof. Martin E.T.", sub: "Professeur" },
    notifications: 3,
    searchPlaceholder: "Rechercher un étudiant, une classe, un document...",
    nav: [
      { slug: "", label: "Accueil", icon: "home" },
      { slug: "classes", label: "Mes classes", icon: "users" },
      {
        slug: "schedule",
        label: "Mon emploi du temps",
        icon: "calendar",
      },
      { slug: "lesson-plans", label: "Préparer un cours", icon: "pen" },
      { slug: "sessions", label: "Séances & présences", icon: "checkCircle" },
      { slug: "assignments", label: "Travaux", icon: "clipboard" },
      { slug: "assessments", label: "Évaluations & notes", icon: "award" },
      { slug: "progress", label: "Suivi des étudiants", icon: "chart" },
      { slug: "resources", label: "Ressources pédagogiques", icon: "folder" },
      { slug: "notifications", label: "Notifications", icon: "bell" },
      { slug: "announcements", label: "Actualités", icon: "megaphone" },
    ],
    foot: [
      { slug: "settings", label: "Paramètres", icon: "sliders" },
      { slug: "help", label: "Aide", icon: "help" },
    ],
  },
  pedagogy: {
    slug: "pedagogy",
    name: "Responsable pédagogique",
    topTitle: "Espace Responsable pédagogique",
    brandSub: "Piloter aujourd'hui pour révéler demain.",
    pickColor: "#1fa35c",
    pitch:
      "Pilotage académique et vie scolaire : programmes, progression, emplois du temps, présence, justificatifs et suivi des situations.",
    user: { name: "Mme Laura M.", sub: "Responsable pédagogique" },
    notifications: 5,
    searchPlaceholder: "Rechercher une classe, une formation...",
    nav: [
      { slug: "", label: "Accueil", icon: "home" },
      { slug: "programs", label: "Formations", icon: "cap" },
      { slug: "classes", label: "Classes & promotions", icon: "layers" },
      { slug: "schedule", label: "Emplois du temps", icon: "calendar" },
      { slug: "progress", label: "Suivi pédagogique", icon: "chart" },
      { slug: "assessments", label: "Évaluations", icon: "clipboard" },
      { slug: "attendance", label: "Vie scolaire", icon: "shield" },
      { slug: "students", label: "Étudiants", icon: "users" },
      { slug: "teachers", label: "Enseignants", icon: "user" },
      { slug: "documents", label: "Documents", icon: "file" },
      { slug: "reports", label: "Rapports & statistiques", icon: "list" },
      { slug: "notifications", label: "Notifications", icon: "bell" },
    ],
    foot: [
      { slug: "settings", label: "Paramètres", icon: "sliders" },
      { slug: "help", label: "Aide", icon: "help" },
    ],
  },
  admin: {
    slug: "admin",
    name: "Administrateur / Direction",
    topTitle: "Espace Administrateur",
    brandSub: "Gérer, structurer, faire avancer",
    pickColor: "#ff6a1f",
    pitch:
      "Établissement numérique : structure, comptes, inscriptions, affectations, calendriers, documents, communication et pilotage global.",
    user: { name: "Admin", sub: "Direction" },
    notifications: 4,
    searchPlaceholder: "Rechercher un utilisateur, une classe, un document...",
    nav: [
      { slug: "", label: "Accueil", icon: "home" },
      { slug: "users", label: "Utilisateurs", icon: "users" },
      { slug: "organization", label: "Établissement", icon: "building" },
      {
        slug: "academics",
        label: "Structure académique",
        icon: "layers",
      },
      { slug: "schedule", label: "Emplois du temps", icon: "calendar" },
      { slug: "admissions", label: "Inscriptions", icon: "userPlus" },
      {
        slug: "assignments",
        label: "Évaluations & travaux",
        icon: "clipboard",
      },
      { slug: "attendance", label: "Vie scolaire", icon: "shield" },
      { slug: "documents", label: "Documents officiels", icon: "file" },
      { slug: "communication", label: "Communication", icon: "megaphone" },
      { slug: "reports", label: "Rapports", icon: "list" },
      { slug: "settings", label: "Paramètres", icon: "sliders" },
    ],
    foot: [{ slug: "notifications", label: "Notifications", icon: "bell" }, { slug: "help", label: "Aide", icon: "help" }],
  },
};

export const ROLE_ORDER: RoleSlug[] = [
  "student",
  "teacher",
  "pedagogy",
  "admin",
];

export function isRoleSlug(value: string): value is RoleSlug {
  return value in ROLES;
}
