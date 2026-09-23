import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ROLES, isRoleSlug } from "../../roles";
import CampusHome from "../../CampusHome";
import DirectionUsersPage from "../../direction/UsersPage";
import DirectionFormationsPage from "../../direction/FormationsPage";
import StudentAssignmentsPage from "../../etudiant/AssignmentsPage";
import TeacherClassesPage from "../../professeur/ClassesPage";
import PedagogyClassesPage from "../../pedagogie/ClassesPage";
import StudentPages from "../../etudiant/StudentPages";
import StudentActivityPage from "../../etudiant/ActivityPage";
import TeacherSchedulePage from "../../professeur/SchedulePage";
import DocumentsPage from "../../shared/DocumentsPage";
import InstitutionPage from "../../direction/InstitutionPage";
import DirectoryPage from "../../pedagogie/DirectoryPage";
import StaffAssignmentsPage from "../../shared/AssignmentsPage";
import FinancePage from "../../direction/FinancePage";
import AttendancePage from "../../pedagogie/AttendancePage";
import SessionsPage from "../../professeur/SessionsPage";
import ReportsPage from "../../shared/ReportsPage";
import HelpPage from "../../shared/HelpPage";
import StudentAttendancePage from "../../etudiant/AttendancePage";

type Params = Promise<{ role: string; section?: string[] }>;

const BUILT_SECTIONS: Partial<Record<string, () => React.JSX.Element>> = {
  "direction/utilisateurs": DirectionUsersPage,
  "direction/formations-classes": DirectionFormationsPage,
  "etudiant/travaux": StudentAssignmentsPage,
  "etudiant/presences": StudentAttendancePage,
  "professeur/classes": TeacherClassesPage,
  "professeur/travaux": () => <TeacherClassesPage section="travaux" />,
  "professeur/suivi": () => <TeacherClassesPage section="suivi" />,
  "professeur/ressources": () => <TeacherClassesPage section="ressources" />,
  "professeur/preparer": () => <TeacherClassesPage section="preparer" />,
  "professeur/emploi-du-temps": TeacherSchedulePage,
  "pedagogie/emploi-du-temps": () => <TeacherSchedulePage role="pedagogie" />,
  "direction/emploi-du-temps": () => <TeacherSchedulePage role="direction" />,
  "pedagogie/classes": PedagogyClassesPage,
  "pedagogie/formations": PedagogyClassesPage,
  "direction/inscriptions": () => <DirectionUsersPage section="inscriptions" />,
  "direction/documents": () => <DocumentsPage role="direction" />,
  "pedagogie/documents": () => <DocumentsPage role="pedagogie" />,
  "direction/etablissement": InstitutionPage,
  "pedagogie/etudiants": () => <DirectoryPage section="etudiants" />,
  "pedagogie/enseignants": () => <DirectoryPage section="enseignants" />,
  "pedagogie/evaluations": () => <StaffAssignmentsPage role="pedagogie" />,
  "direction/evaluations": () => <StaffAssignmentsPage role="direction" />,
  "direction/finances": FinancePage,
  "pedagogie/vie-scolaire": AttendancePage,
  "professeur/seances": SessionsPage,
  "pedagogie/suivi": () => <ReportsPage role="pedagogie" section="suivi" />,
  "pedagogie/rapports": () => <ReportsPage role="pedagogie" section="rapports" />,
  "direction/suivi": () => <ReportsPage role="direction" section="suivi" />,
  "direction/rapports": () => <ReportsPage role="direction" section="rapports" />,
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
  if (slug === "parametres") redirect("/settings");
  if (slug === "aide") return <HelpPage role={role} />;

  if (role === "etudiant" && ["emploi-du-temps", "cours", "classe", "resultats", "evaluations", "ressources", "documents", "aide"].includes(slug)) {
    return <StudentPages section={slug as "emploi-du-temps" | "cours" | "classe" | "resultats" | "evaluations" | "ressources" | "documents" | "aide"} />;
  }
  if (["actualites", "messagerie", "communication"].includes(slug)) {
    return <StudentActivityPage role={role} section={slug as "actualites" | "messagerie" | "communication"} />;
  }

  const Built = BUILT_SECTIONS[`${role}/${slug}`];
  if (Built) {
    return <Built />;
  }

  notFound();
}
