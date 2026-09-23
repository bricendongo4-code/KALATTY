import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ROLES, isRoleSlug } from "../../roles";
import EstablishmentHome from "../../EstablishmentHome";
import AdminUsersPage from "../../admin/UsersPage";
import AdminAcademicsPage from "../../admin/FormationsPage";
import StudentAssignmentsPage from "../../student/AssignmentsPage";
import TeacherClassesPage from "../../teacher/ClassesPage";
import PedagogyClassesPage from "../../pedagogy/ClassesPage";
import StudentPages from "../../student/StudentPages";
import ActivityPage from "../../student/ActivityPage";
import TeacherSchedulePage from "../../teacher/SchedulePage";
import DocumentsPage from "../../shared/DocumentsPage";
import OrganizationPage from "../../admin/InstitutionPage";
import DirectoryPage from "../../pedagogy/DirectoryPage";
import StaffAssignmentsPage from "../../shared/AssignmentsPage";
import AttendancePage from "../../pedagogy/AttendancePage";
import SessionsPage from "../../teacher/SessionsPage";
import ReportsPage from "../../shared/ReportsPage";
import HelpPage from "../../shared/HelpPage";
import StudentAttendancePage from "../../student/AttendancePage";

type Params = Promise<{ role: string; section?: string[] }>;

const BUILT_SECTIONS: Record<string, () => React.JSX.Element> = {
  "student/schedule": () => <StudentPages section="schedule" />,
  "student/subjects": () => <StudentPages section="subjects" />,
  "student/class": () => <StudentPages section="class" />,
  "student/results": () => <StudentPages section="results" />,
  "student/documents": () => <StudentPages section="documents" />,
  "student/assignments": StudentAssignmentsPage,
  "student/attendance": StudentAttendancePage,
  "student/notifications": () => <ActivityPage role="student" section="notifications" />,
  "student/announcements": () => <ActivityPage role="student" section="announcements" />,
  "teacher/classes": TeacherClassesPage,
  "teacher/assignments": () => <TeacherClassesPage section="travaux" />,
  "teacher/assessments": () => <TeacherClassesPage section="travaux" />,
  "teacher/progress": () => <TeacherClassesPage section="suivi" />,
  "teacher/resources": () => <TeacherClassesPage section="ressources" />,
  "teacher/lesson-plans": () => <TeacherClassesPage section="preparer" />,
  "teacher/schedule": TeacherSchedulePage,
  "teacher/sessions": SessionsPage,
  "teacher/notifications": () => <ActivityPage role="teacher" section="notifications" />,
  "teacher/announcements": () => <ActivityPage role="teacher" section="announcements" />,
  "pedagogy/programs": PedagogyClassesPage,
  "pedagogy/classes": PedagogyClassesPage,
  "pedagogy/schedule": () => <TeacherSchedulePage role="pedagogy" />,
  "pedagogy/progress": () => <ReportsPage role="pedagogy" section="suivi" />,
  "pedagogy/assessments": () => <StaffAssignmentsPage role="pedagogy" />,
  "pedagogy/attendance": AttendancePage,
  "pedagogy/students": () => <DirectoryPage section="etudiants" />,
  "pedagogy/teachers": () => <DirectoryPage section="enseignants" />,
  "pedagogy/documents": () => <DocumentsPage role="pedagogy" />,
  "pedagogy/reports": () => <ReportsPage role="pedagogy" section="rapports" />,
  "pedagogy/notifications": () => <ActivityPage role="pedagogy" section="notifications" />,
  "admin/users": AdminUsersPage,
  "admin/organization": OrganizationPage,
  "admin/academics": AdminAcademicsPage,
  "admin/admissions": () => <AdminUsersPage section="inscriptions" />,
  "admin/assignments": () => <StaffAssignmentsPage role="admin" />,
  "admin/schedule": () => <TeacherSchedulePage role="admin" />,
  "admin/documents": () => <DocumentsPage role="admin" />,
  "admin/communication": () => <ActivityPage role="admin" section="communication" />,
  "admin/reports": () => <ReportsPage role="admin" section="rapports" />,
  "admin/notifications": () => <ActivityPage role="admin" section="notifications" />,
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { role } = await params;
  if (!isRoleSlug(role)) return { title: "Espace Établissement - Kalatty" };
  return { title: `${ROLES[role].topTitle} - Kalatty` };
}

export default async function EstablishmentRolePage({ params }: { params: Params }) {
  const { role, section } = await params;
  if (!isRoleSlug(role)) notFound();
  const slug = section?.[0] ?? "";
  const item = [...ROLES[role].nav, ...ROLES[role].foot].find((entry) => entry.slug === slug);
  if (!item) notFound();
  if (!slug) return <EstablishmentHome role={role} />;
  if (slug === "settings") redirect("/settings");
  if (slug === "help") return <HelpPage role={role} />;
  const Built = BUILT_SECTIONS[`${role}/${slug}`];
  if (!Built) notFound();
  return <Built />;
}
