export type LearningRole = "apprenant" | "formateur";

export type LearningNavItem = {
  slug: string;
  label: string;
  icon: string;
};

export const LEARNING_ROLES: Record<
  LearningRole,
  {
    name: string;
    title: string;
    tagline: string;
    userSub: string;
    search: string;
    nav: LearningNavItem[];
  }
> = {
  apprenant: {
    name: "Apprenant indépendant",
    title: "Espace apprenant",
    tagline: "Apprendre aujourd'hui, construire demain.",
    userSub: "Apprenant",
    search: "Rechercher une formation ou un formateur...",
    nav: [
      { slug: "", label: "Accueil", icon: "home" },
      { slug: "explore", label: "Explorer", icon: "search" },
      { slug: "my-courses", label: "Mes formations", icon: "book" },
      { slug: "activities", label: "Mes activités", icon: "clipboard" },
      { slug: "certificates", label: "Mes certificats", icon: "award" },
      { slug: "notifications", label: "Notifications", icon: "bell" },
      { slug: "billing", label: "Paiements & factures", icon: "euro" },
      { slug: "profile", label: "Mon profil", icon: "user" },
    ],
  },
  formateur: {
    name: "Formateur / Créateur",
    title: "Espace formateur",
    tagline: "Partager le savoir, faire grandir les talents.",
    userSub: "Formateur",
    search: "Rechercher un apprenant ou une formation...",
    nav: [
      { slug: "", label: "Accueil", icon: "home" },
      { slug: "courses", label: "Mes formations", icon: "book" },
      { slug: "studio", label: "Studio", icon: "video" },
      { slug: "media", label: "Médiathèque", icon: "folder" },
      { slug: "learners", label: "Apprenants", icon: "users" },
      { slug: "assessments", label: "Évaluations", icon: "clipboard" },
      { slug: "notifications", label: "Notifications", icon: "bell" },
      { slug: "analytics", label: "Analytics", icon: "chart" },
      { slug: "revenue", label: "Revenus", icon: "euro" },
      { slug: "profile", label: "Profil formateur", icon: "user" },
    ],
  },
};

export function isLearningRole(value: string): value is LearningRole {
  return value === "apprenant" || value === "formateur";
}
