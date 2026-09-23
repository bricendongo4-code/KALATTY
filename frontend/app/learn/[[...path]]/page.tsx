import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CoursePlayerPage from "../../learning/CoursePlayerPage";
import LearningHome from "../../learning/LearningHome";
import LearningSectionPage from "../../learning/LearningSectionPage";
import LearningShell from "../../learning/LearningShell";
import PaymentHistory from "../../learning/PaymentHistory";

type Params = Promise<{ path?: string[] }>;

export const metadata: Metadata = {
  title: "Espace apprenant - Kalatty",
  description: "Apprendre, pratiquer et suivre sa progression avec Kalatty.",
};

const SECTIONS = new Set(["explore", "my-courses", "activities", "certificates", "notifications", "profile"]);

export default async function LearnerPage({ params }: { params: Params }) {
  const { path = [] } = await params;
  const [section = "", id, child, lessonId] = path;
  let view: React.ReactNode;

  if (!section) view = <LearningHome role="apprenant" />;
  else if (section === "courses" && id && (!child || (child === "lessons" && lessonId))) view = <CoursePlayerPage courseId={id} />;
  else if (section === "billing" && !id) view = <PaymentHistory />;
  else if (SECTIONS.has(section) && !id) view = <LearningSectionPage role="apprenant" slug={section} />;
  else notFound();

  return <LearningShell role="apprenant" activeSlug={section === "courses" ? "my-courses" : section}>{view}</LearningShell>;
}
