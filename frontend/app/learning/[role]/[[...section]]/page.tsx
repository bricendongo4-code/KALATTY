import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LearningShell from "../../LearningShell";
import LearningHome from "../../LearningHome";
import PaymentHistory from "../../PaymentHistory";
import RevenueDashboard from "../../RevenueDashboard";
import LearningSectionPage from "../../LearningSectionPage";
import CourseBuilderPage from "../../CourseBuilderPage";
import CoursePlayerPage from "../../CoursePlayerPage";
import StudioPage from "../../StudioPage";
import { LEARNING_ROLES, isLearningRole } from "../../config";

type Params = Promise<{ role: string; section?: string[] }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { role } = await params;
  if (!isLearningRole(role)) return { title: "Formation en ligne - Kalatty" };
  return { title: `${LEARNING_ROLES[role].title} - Kalatty` };
}

export default async function LearningPage({ params }: { params: Params }) {
  const { role, section = [] } = await params;
  if (!isLearningRole(role)) notFound();
  const slug = section[0] ?? "";
  const child = section[1] ?? "";
  const item = LEARNING_ROLES[role].nav.find((entry) => entry.slug === slug);
  if (!item && slug !== "") notFound();

  let view: React.ReactNode;
  if (slug === "") view = <LearningHome role={role} />;
  else if (role === "apprenant" && slug === "formations" && child) view = <CoursePlayerPage courseId={child} />;
  else if (role === "formateur" && slug === "formations" && child === "builder") view = <CourseBuilderPage />;
  else if (role === "formateur" && slug === "formations" && child) view = <CourseBuilderPage courseId={child} />;
  else if (role === "formateur" && slug === "studio") view = <StudioPage />;
  else if (role === "apprenant" && slug === "paiements") view = <PaymentHistory />;
  else if (role === "formateur" && slug === "revenus") view = <RevenueDashboard />;
  else view = <LearningSectionPage role={role} slug={slug} />;

  return <LearningShell role={role} activeSlug={slug}>{view}</LearningShell>;
}
