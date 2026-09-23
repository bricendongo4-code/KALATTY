export type RoleSlug = "etudiant" | "professeur" | "pedagogie" | "direction";

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
  etudiant: {
    slug: "etudiant",
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
        slug: "emploi-du-temps",
        label: "Mon emploi du temps",
        icon: "calendar",
      },
      { slug: "cours", label: "Mes cours", icon: "book" },
      { slug: "travaux", label: "Mes travaux", icon: "edit" },
      { slug: "evaluations", label: "Mes évaluations", icon: "clipboard" },
      { slug: "resultats", label: "Mes résultats", icon: "chart" },
      { slug: "classe", label: "Ma classe", icon: "users" },
      { slug: "presences", label: "Mes présences", icon: "checkCircle" },
      { slug: "documents", label: "Mes documents", icon: "file" },
      { slug: "messagerie", label: "Notifications", icon: "bell" },
      { slug: "actualites", label: "Actualités", icon: "megaphone" },
      { slug: "ressources", label: "Ressources", icon: "folder" },
    ],
    foot: [{ slug: "aide", label: "Aide & support", icon: "help" }],
  },
  professeur: {
    slug: "professeur",
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
        slug: "emploi-du-temps",
        label: "Mon emploi du temps",
        icon: "calendar",
      },
      { slug: "preparer", label: "Préparer un cours", icon: "pen" },
      { slug: "seances", label: "Séances & présences", icon: "checkCircle" },
      { slug: "travaux", label: "Travaux & évaluations", icon: "clipboard" },
      { slug: "suivi", label: "Suivi des étudiants", icon: "chart" },
      { slug: "ressources", label: "Ressources pédagogiques", icon: "folder" },
      { slug: "messagerie", label: "Notifications", icon: "bell" },
      { slug: "actualites", label: "Actualités", icon: "megaphone" },
    ],
    foot: [
      { slug: "parametres", label: "Paramètres", icon: "sliders" },
      { slug: "aide", label: "Aide", icon: "help" },
    ],
  },
  pedagogie: {
    slug: "pedagogie",
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
      { slug: "formations", label: "Formations", icon: "cap" },
      { slug: "classes", label: "Classes & promotions", icon: "layers" },
      { slug: "emploi-du-temps", label: "Emplois du temps", icon: "calendar" },
      { slug: "suivi", label: "Suivi pédagogique", icon: "chart" },
      { slug: "evaluations", label: "Évaluations", icon: "clipboard" },
      { slug: "vie-scolaire", label: "Vie scolaire", icon: "shield" },
      { slug: "etudiants", label: "Étudiants", icon: "users" },
      { slug: "enseignants", label: "Enseignants", icon: "user" },
      { slug: "documents", label: "Documents", icon: "file" },
      { slug: "rapports", label: "Rapports & statistiques", icon: "list" },
      { slug: "messagerie", label: "Notifications", icon: "bell" },
    ],
    foot: [
      { slug: "parametres", label: "Paramètres", icon: "sliders" },
      { slug: "aide", label: "Aide", icon: "help" },
    ],
  },
  direction: {
    slug: "direction",
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
      { slug: "utilisateurs", label: "Utilisateurs", icon: "users" },
      { slug: "etablissement", label: "Établissement", icon: "building" },
      {
        slug: "formations-classes",
        label: "Formations & classes",
        icon: "layers",
      },
      { slug: "emploi-du-temps", label: "Emplois du temps", icon: "calendar" },
      { slug: "inscriptions", label: "Inscriptions", icon: "userPlus" },
      { slug: "suivi", label: "Suivi académique", icon: "chart" },
      {
        slug: "evaluations",
        label: "Évaluations & bulletins",
        icon: "clipboard",
      },
      { slug: "documents", label: "Documents officiels", icon: "file" },
      { slug: "finances", label: "Finances (optionnel)", icon: "euro" },
      { slug: "communication", label: "Communication", icon: "megaphone" },
      { slug: "rapports", label: "Rapports", icon: "list" },
      { slug: "parametres", label: "Paramètres", icon: "sliders" },
    ],
    foot: [{ slug: "messagerie", label: "Notifications", icon: "bell" }, { slug: "aide", label: "Aide", icon: "help" }],
  },
};

export const ROLE_ORDER: RoleSlug[] = [
  "etudiant",
  "professeur",
  "pedagogie",
  "direction",
];

export function isRoleSlug(value: string): value is RoleSlug {
  return value in ROLES;
}
