import { notFound, redirect } from "next/navigation";

type Params = Promise<{ role: string; section?: string[] }>;

const LEARNER_SECTIONS: Record<string, string> = {
  explorer: "explore",
  formations: "my-courses",
  activites: "activities",
  certificats: "certificates",
  notifications: "notifications",
  paiements: "billing",
  profil: "profile",
};

const CREATOR_SECTIONS: Record<string, string> = {
  formations: "courses",
  studio: "studio",
  mediatheque: "media",
  apprenants: "learners",
  evaluations: "assessments",
  notifications: "notifications",
  analytics: "analytics",
  revenus: "revenue",
  profil: "profile",
};

export default async function LegacyRolePage({ params }: { params: Params }) {
  const { role, section = [] } = await params;
  const [slug, child] = section;
  if (role === "apprenant") {
    if (slug === "formations" && child) redirect(`/learn/courses/${child}`);
    redirect(slug ? `/learn/${LEARNER_SECTIONS[slug] ?? slug}` : "/learn");
  }
  if (role === "formateur") {
    if (slug === "formations" && child === "builder") redirect("/creator/courses/new");
    if (slug === "formations" && child) redirect(`/creator/courses/${child}/builder`);
    redirect(slug ? `/creator/${CREATOR_SECTIONS[slug] ?? slug}` : "/creator");
  }
  notFound();
}
