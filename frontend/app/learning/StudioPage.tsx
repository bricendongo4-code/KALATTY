"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "../campus/ui";
import styles from "./learning.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type CourseSummary = { id: string; title: string; lessonsCount: number; status: string };
type LessonEdit = { id?: string; title: string; content?: string; video_path?: string; duration_seconds?: number | null; is_preview?: boolean };
type ModuleEdit = { id?: string; title: string; description?: string; lessons: LessonEdit[]; exercises?: Array<{ id?: string; title: string; instructions?: string; correction?: string }> };
type CourseEdit = { id: string; title: string; description: string; short_description: string; price_fcfa: number; thumbnail_path: string; status: "draft" | "published" | "archived"; objectives: string; prerequisites: string; level: string; modules: ModuleEdit[] };

export default function StudioPage() {
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [course, setCourse] = useState<CourseEdit | null>(null);
  const [activeModule, setActiveModule] = useState(0);
  const [activeLesson, setActiveLesson] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const selectedLesson = course?.modules[activeModule]?.lessons[activeLesson];

  const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("kalatty_token") ?? ""}` });

  const loadCourse = useCallback(async (courseId: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`${API_BASE}/courses/${courseId}/edit`, { headers: auth() });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? "Formation inaccessible.");
      setCourse(body);
      setActiveModule(0);
      setActiveLesson(0);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`${API_BASE}/courses/mine`, { headers: auth() });
        const body = await response.json();
        if (!response.ok) throw new Error(body.message ?? "Formations inaccessibles.");
        setCourses(body);
        if (body[0]?.id) await loadCourse(body[0].id);
        else setLoading(false);
      } catch (reason) {
        setMessage(reason instanceof Error ? reason.message : "Chargement impossible.");
        setLoading(false);
      }
    };
    load();
  }, [loadCourse]);

  const scenes = useMemo(() => course?.modules.flatMap((module, moduleIndex) => module.lessons.map((lesson, lessonIndex) => ({ module, lesson, moduleIndex, lessonIndex }))) ?? [], [course]);

  const saveCourse = async (nextCourse: CourseEdit) => {
    const response = await fetch(`${API_BASE}/courses/${nextCourse.id}`, {
      method: "PATCH",
      headers: { ...auth(), "Content-Type": "application/json" },
      body: JSON.stringify(nextCourse),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message ?? "Enregistrement impossible.");
  };

  const uploadVideo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !course || !selectedLesson) return;
    setUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadResponse = await fetch(`${API_BASE}/courses/upload-video`, { method: "POST", headers: auth(), body: formData });
      const uploaded = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(uploaded.message ?? "Import vidéo impossible.");
      const modules = course.modules.map((module, moduleIndex) => moduleIndex !== activeModule ? module : { ...module, lessons: module.lessons.map((lesson, lessonIndex) => lessonIndex === activeLesson ? { ...lesson, video_path: uploaded.path } : lesson) });
      const nextCourse = { ...course, modules };
      await saveCourse(nextCourse);
      setCourse(nextCourse);
      setMessage("Vidéo importée et attachée à la leçon.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Import impossible.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  if (loading) return <section className={styles.loadingState}><span /><h1>Ouverture du Studio</h1></section>;
  if (!course) return <section className={styles.emptyLearning}><Icon name="video" /><div><h1>Kalatty Studio</h1><p>Créez d’abord une formation et au moins une leçon pour importer vos vidéos.</p></div><Link href="/learning/formateur/formations/builder" className={styles.primaryButton}>Créer une formation</Link></section>;

  return <>
    <header className={styles.pageHead}><div><h1>Kalatty Studio</h1><p>Importez une vidéo, associez-la à une leçon et publiez-la sans quitter votre espace.</p></div><select className={styles.studioCourseSelect} value={course.id} onChange={(event) => loadCourse(event.target.value)}>{courses.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></header>
    {message ? <p className={styles.builderMessage}>{message}</p> : null}
    <div className={styles.studioLayout}>
      <aside className={styles.sceneList}><div className={styles.sectionHead}><h2>Leçons</h2><span>{scenes.length}</span></div>{scenes.map((scene, index) => <button key={scene.lesson.id ?? `${scene.moduleIndex}-${scene.lessonIndex}`} className={scene.moduleIndex === activeModule && scene.lessonIndex === activeLesson ? styles.sceneActive : ""} onClick={() => { setActiveModule(scene.moduleIndex); setActiveLesson(scene.lessonIndex); }}><span>{String(index + 1).padStart(2, "0")}</span><strong>{scene.lesson.title}</strong><small>{scene.module.title}</small></button>)}</aside>
      <section><div className={styles.studioPreview}>{selectedLesson?.video_path ? <div className={styles.studioVideoReady}><Icon name="video" /><strong>Vidéo attachée</strong><small>{selectedLesson.video_path.split("/").pop()}</small></div> : <div className={styles.studioVideoReady}><Icon name="video" /><strong>Aucune vidéo</strong><small>Importez le média de cette leçon.</small></div>}</div><div className={styles.studioLessonInfo}><small>{course.modules[activeModule]?.title}</small><h2>{selectedLesson?.title}</h2><p>{selectedLesson?.content || "Ajoutez le contenu détaillé depuis l’éditeur de formation."}</p></div></section>
      <aside className={styles.properties}><h2>Vidéo de la leçon</h2><p className={styles.mutedText}>Formats vidéo usuels, limite contrôlée par le serveur.</p><label className={styles.studioUpload}>{uploading ? "Import en cours…" : selectedLesson?.video_path ? "Remplacer la vidéo" : "Importer une vidéo"}<input type="file" accept="video/*" disabled={uploading || !selectedLesson} onChange={uploadVideo} /></label><dl className={styles.studioMeta}><div><dt>Formation</dt><dd>{course.title}</dd></div><div><dt>État</dt><dd>{course.status === "published" ? "Publiée" : "Brouillon"}</dd></div><div><dt>Leçon</dt><dd>{selectedLesson?.title ?? "Aucune"}</dd></div></dl></aside>
    </div>
  </>;
}
