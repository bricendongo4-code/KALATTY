import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ROLES, isRoleSlug } from "../../roles";
import CampusHome from "../../CampusHome";
import DirectionUsersPage from "../../direction/UsersPage";
import DirectionFormationsPage from "../../direction/FormationsPage";
import StudentAssignmentsPage from "../../etudiant/AssignmentsPage";
import TeacherClassesPage from "../../professeur/ClassesPage";
import PedagogyClassesPage from "../../pedagogie/ClassesPage";
import CampusSectionPage from "../../SectionPage";
import StudentPages from "../../etudiant/StudentPages";
import StudentActivityPage from "../../etudiant/ActivityPage";
import TeacherSchedulePage from "../../professeur/SchedulePage";

type Params = Promise<{ role: string; section?: string[] }>;

const BUILT_SECTIONS: Partial<Record<string, () => React.JSX.Element>> = {
  "direction/utilisateurs": DirectionUsersPage,
  "direction/formations-classes": DirectionFormationsPage,
  "etudiant/travaux": StudentAssignmentsPage,
  "professeur/classes": TeacherClassesPage,
  "professeur/travaux": () => <TeacherClassesPage section="travaux" />,
  "professeur/suivi": () => <TeacherClassesPage section="suivi" />,
  "professeur/emploi-du-temps": TeacherSchedulePage,
  "pedagogie/classes": PedagogyClassesPage,
};

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { role } = await params;
  if (!isRoleSlug(role)) return { title: "Espace Établissement - Kalatty" };
  return { title: `${ROLES[role].topTitle} - Kalatty` };
}

export default async function CampusRolePage({ params }: { params: Params }) {
  const { role, section } = await params;
  if (!isRoleSlug(role)) notFound();

  const cfg = ROLES[role];
  const slug = section?.[0] ?? "";
  const item = [...cfg.nav, ...cfg.foot].find((n) => n.slug === slug);
  if (!item) notFound();

  if (slug === "") {
    return <CampusHome role={role} />;
  }

  if (role === "etudiant" && ["emploi-du-temps", "cours", "classe", "resultats", "evaluations", "ressources", "documents", "aide"].includes(slug)) {
    return <StudentPages section={slug as "emploi-du-temps" | "cours" | "classe" | "resultats" | "evaluations" | "ressources" | "documents" | "aide"} />;
  }
  if (role === "etudiant" && ["actualites", "messagerie"].includes(slug)) {
    return <StudentActivityPage section={slug as "actualites" | "messagerie"} />;
  }

  const Built = BUILT_SECTIONS[`${role}/${slug}`];
  if (Built) {
    return <Built />;
  }

  return <CampusSectionPage role={role} slug={slug} />;
}
