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

type Params = Promise<{ role: string; section?: string[] }>;

const BUILT_SECTIONS: Partial<Record<string, () => React.JSX.Element>> = {
  "direction/utilisateurs": DirectionUsersPage,
  "direction/formations-classes": DirectionFormationsPage,
  "etudiant/travaux": StudentAssignmentsPage,
  "professeur/classes": TeacherClassesPage,
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

  const Built = BUILT_SECTIONS[`${role}/${slug}`];
  if (Built) {
    return <Built />;
  }

  return <CampusSectionPage role={role} slug={slug} />;
}
