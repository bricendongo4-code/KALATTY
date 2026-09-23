import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CourseBuilderPage from "../../learning/CourseBuilderPage";
import CoursePlayerPage from "../../learning/CoursePlayerPage";
import LearningHome from "../../learning/LearningHome";
import LearningSectionPage from "../../learning/LearningSectionPage";
import LearningShell from "../../learning/LearningShell";
import RevenueDashboard from "../../learning/RevenueDashboard";
import StudioPage from "../../learning/StudioPage";

type Params = Promise<{ path?: string[] }>;

export const metadata: Metadata = {
  title: "Espace formateur - Kalatty",
  description: "Créer, publier et piloter ses formations avec Kalatty.",
};

const SECTIONS = new Set(["courses", "media", "learners", "assessments", "notifications", "analytics", "profile"]);

export default async function CreatorPage({ params }: { params: Params }) {
  const { path = [] } = await params;
  const [section = "", id, action] = path;
  let view: React.ReactNode;

  if (!section) view = <LearningHome role="formateur" />;
  else if (section === "courses" && id === "new" && !action) view = <CourseBuilderPage />;
  else if (section === "courses" && id && action === "builder") view = <CourseBuilderPage courseId={id} />;
  else if (section === "courses" && id && action === "preview") view = <CoursePlayerPage courseId={id} />;
  else if (section === "studio" && !id) view = <StudioPage />;
  else if (section === "revenue" && !id) view = <RevenueDashboard />;
  else if (SECTIONS.has(section) && !id) view = <LearningSectionPage role="formateur" slug={section} />;
  else notFound();

  return <LearningShell role="formateur" activeSlug={section}>{view}</LearningShell>;
}
