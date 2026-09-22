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
    user: string;
    userSub: string;
    search: string;
    nav: LearningNavItem[];
  }
> = {
  apprenant: {
    name: "Apprenant indépendant",
    title: "Espace apprenant",
    tagline: "Apprendre aujourd'hui, construire demain.",
    user: "Joss Ndongo",
    userSub: "Apprenant",
    search: "Rechercher une formation ou un formateur...",
    nav: [
      { slug: "", label: "Accueil", icon: "home" },
      { slug: "explorer", label: "Explorer", icon: "search" },
      { slug: "formations", label: "Mes formations", icon: "book" },
      { slug: "certificats", label: "Mes certificats", icon: "award" },
      { slug: "favoris", label: "Favoris", icon: "shield" },
      { slug: "messages", label: "Notifications", icon: "bell" },
      { slug: "notifications", label: "Notifications", icon: "bell" },
      { slug: "paiements", label: "Paiements & factures", icon: "euro" },
      { slug: "profil", label: "Mon profil", icon: "user" },
    ],
  },
  formateur: {
    name: "Formateur / Créateur",
    title: "Espace formateur",
    tagline: "Partager le savoir, faire grandir les talents.",
    user: "Prof. Martin E.T.",
    userSub: "Formateur",
    search: "Rechercher un apprenant ou une formation...",
    nav: [
      { slug: "", label: "Accueil", icon: "home" },
      { slug: "formations", label: "Mes formations", icon: "book" },
      { slug: "studio", label: "Studio", icon: "video" },
      { slug: "mediatheque", label: "Médiathèque", icon: "folder" },
      { slug: "apprenants", label: "Apprenants", icon: "users" },
      { slug: "evaluations", label: "Évaluations", icon: "clipboard" },
      { slug: "messages", label: "Notifications", icon: "bell" },
      { slug: "analytics", label: "Analytics", icon: "chart" },
      { slug: "revenus", label: "Revenus", icon: "euro" },
      { slug: "ressources", label: "Ressources", icon: "layers" },
      { slug: "profil", label: "Profil formateur", icon: "user" },
    ],
  },
};

export function isLearningRole(value: string): value is LearningRole {
  return value === "apprenant" || value === "formateur";
}
