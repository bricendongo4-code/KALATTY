"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon, Progress } from "../campus/ui";
import styles from "./learning.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
type Lesson = { id: string; title: string; content: string; videoPath: string; durationSeconds: number; progressStatus: string };
type Course = { id: string; title: string; description: string; shortDescription?: string; priceFcfa: number; teacherName?: string; progressPercentage: number; enrolled: boolean; institutionAccess?: boolean; modules: Array<{ id: string; title: string; description: string; lessons: Lesson[]; exercises: Array<{ id: string; title: string; instructions: string }> }> };

export default function CoursePlayerPage({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessMessage, setAccessMessage] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);

  const load = useCallback(async () => {
    const token = localStorage.getItem("kalatty_token");
    if (!token) return router.replace(`/login?redirect=/learning/apprenant/formations/${courseId}`);
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/courses/${courseId}`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? "Formation introuvable.");
      setCourse(body as Course);
      const lessons = (body.modules ?? []).flatMap((module: { lessons?: Lesson[] }) => module.lessons ?? []);
      const firstIncomplete = lessons.find((lesson: Lesson) => lesson.progressStatus !== "completed") ?? lessons[0];
      setActiveLessonId(firstIncomplete?.id ?? null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  }, [courseId, router]);

  useEffect(() => { load(); }, [load]);
  const lessons = useMemo(() => course?.modules.flatMap((module) => module.lessons.map((lesson) => ({ ...lesson, moduleTitle: module.title }))) ?? [], [course]);
  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) ?? lessons[0];

  const updateProgress = async (status: "started" | "completed") => {
    if (!activeLesson) return;
    const token = localStorage.getItem("kalatty_token");
    if (!token) return;
    const response = await fetch(`${API_BASE}/courses/${courseId}/lessons/${activeLesson.id}/progress`, { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (response.ok && status === "completed") await load();
  };

  const activateAccess = async () => {
    if (!course) return;
    const token = localStorage.getItem("kalatty_token");
    if (!token) return router.replace(`/login?redirect=/learning/apprenant/formations/${courseId}`);
    setBuying(true);
    setAccessMessage(null);
    try {
      if (course.priceFcfa <= 0) {
        const response = await fetch(`${API_BASE}/courses/${courseId}/enroll`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ courseId }) });
        const body = await response.json();
        if (!response.ok) throw new Error(body.message ?? "Inscription impossible.");
      } else {
        const checkoutResponse = await fetch(`${API_BASE}/payments/course-checkout`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ courseId }) });
        const checkout = await checkoutResponse.json();
        if (!checkoutResponse.ok) throw new Error(checkout.message ?? "Paiement impossible.");
        if (!checkout.alreadyEnrolled && checkout.paymentId) {
          const confirmResponse = await fetch(`${API_BASE}/payments/${checkout.paymentId}/confirm-demo`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
          const confirmation = await confirmResponse.json();
          if (!confirmResponse.ok) throw new Error(confirmation.message ?? "Confirmation impossible.");
        }
      }
      setAccessMessage("Accès activé. Votre formation est prête.");
      await load();
    } catch (reason) {
      setAccessMessage(reason instanceof Error ? reason.message : "Activation impossible.");
    } finally {
      setBuying(false);
    }
  };

  if (loading) return <section className={styles.loadingState}><span /><h1>Chargement de la formation</h1></section>;
  if (error) return <section className={styles.loadingState}><Icon name="alert" /><h1>Lecture impossible</h1><p>{error}</p><button onClick={load}>Réessayer</button></section>;
  if (!course) return null;

  if (!course.enrolled && !course.institutionAccess) return <>
    <div className={styles.playerHeader}><Link href="/learning/apprenant/explorer">← Retour au catalogue</Link></div>
    <section className={styles.courseAccessHero}><div><span className={styles.eyebrow}>Formation en ligne</span><h1>{course.title}</h1><p>{course.shortDescription || course.description}</p><small>Par {course.teacherName ?? "Formateur Kalatty"} · {lessons.length} leçon(s)</small></div><aside><strong>{course.priceFcfa > 0 ? `${new Intl.NumberFormat("fr-FR").format(course.priceFcfa)} FCFA` : "Gratuit"}</strong><button disabled={buying} className={styles.primaryButton} onClick={activateAccess}>{buying ? "Traitement…" : course.priceFcfa > 0 ? "Acheter la formation" : "S’inscrire gratuitement"}</button>{accessMessage ? <p>{accessMessage}</p> : null}<small>L’accès est activé uniquement après confirmation du serveur.</small></aside></section>
    <div className={styles.twoColumns}><section className={styles.panel}><h2>À propos de cette formation</h2><p className={styles.courseLongCopy}>{course.description}</p></section><section className={styles.panel}><h2>Programme</h2><div className={styles.publicProgram}>{course.modules.map((module) => <div key={module.id}><strong>{module.title}</strong><span>{module.lessons.length} leçon(s)</span></div>)}</div></section></div>
  </>;

  return <>
    <div className={styles.playerHeader}><Link href="/learning/apprenant/formations">← Mes formations</Link><span>{course.progressPercentage}% terminé</span></div>
    <header className={styles.pageHead}><div><h1>{course.title}</h1><p>{activeLesson?.moduleTitle} · {activeLesson?.title}</p></div><div className={styles.playerProgress}><Progress value={course.progressPercentage} color="green" /><b>{course.progressPercentage}%</b></div></header>
    <div className={styles.playerLayout}>
      <section>
        <div className={styles.realVideoFrame}>{activeLesson?.videoPath ? <video controls src={activeLesson.videoPath} onPlay={() => updateProgress("started")} onEnded={() => updateProgress("completed")} /> : <div><Icon name="video" /><h2>Vidéo non ajoutée</h2><p>Le contenu textuel de la leçon reste disponible ci-dessous.</p></div>}</div>
        <article className={styles.lessonCopy}><h2>{activeLesson?.title ?? "Leçon"}</h2><p>{activeLesson?.content || course.description || "Aucun contenu textuel pour cette leçon."}</p><button className={styles.primaryButton} onClick={() => updateProgress("completed")}>Marquer comme terminée</button></article>
      </section>
      <aside className={styles.chapterPanel}><div className={styles.sectionHead}><h2>Programme</h2><b>{lessons.length} leçon(s)</b></div>{course.modules.map((module) => <div key={module.id} className={styles.moduleChapters}><h3>{module.title}</h3>{module.lessons.map((lesson, index) => <button key={lesson.id} className={lesson.id === activeLesson?.id ? styles.chapterActive : ""} onClick={() => setActiveLessonId(lesson.id)}><span>{lesson.progressStatus === "completed" ? "✓" : index + 1}</span><strong>{lesson.title}</strong></button>)}{module.exercises.map((exercise) => <div key={exercise.id} className={styles.exerciseRow}><Icon name="clipboard" /><span><strong>{exercise.title}</strong><small>{exercise.instructions}</small></span></div>)}</div>)}</aside>
    </div>
  </>;
}
