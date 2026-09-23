"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "../establishment/ui";
import styles from "./learning.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type CourseSummary = { id: string; title: string; lessonsCount: number; status: string };
type LessonEdit = { id?: string; title: string; content?: string; video_path?: string; duration_seconds?: number | null; is_preview?: boolean };
type ModuleEdit = { id?: string; title: string; description?: string; lessons: LessonEdit[]; exercises?: Array<{ id?: string; title: string; instructions?: string; correction?: string }> };
type CourseEdit = { id: string; title: string; description: string; short_description: string; price_fcfa: number; thumbnail_path: string; status: "draft" | "published" | "archived"; objectives: string; prerequisites: string; level: string; modules: ModuleEdit[] };
type Scene = { id: string; title: string; objective: string; durationSeconds: number };
type ProjectSummary = { id: string; courseId: string; lessonId?: string | null; title: string; status: string; version: number; updatedAt: string; courseTitle: string; lessonTitle: string };
type StudioProject = { id: string; courseId: string; lessonId?: string | null; title: string; status: "draft" | "ready" | "published" | "archived"; script: string; transcript: string; scenes: Scene[]; videoPath: string; version: number; updatedAt: string };
type AiResult = { title: string; summary: string; script: string; outline: Array<{ title: string; objective: string; durationSeconds: number }>; quiz: Array<{ question: string; choices: string[]; answerIndex: number; explanation: string }> };

export default function StudioPage({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [course, setCourse] = useState<CourseEdit | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [project, setProject] = useState<StudioProject | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [aiAction, setAiAction] = useState<"outline" | "script" | "quiz">("outline");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const saveTimer = useRef<number | null>(null);

  const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("kalatty_token") ?? ""}` });
  const lessons = useMemo(() => course?.modules.flatMap((module) => module.lessons.map((lesson) => ({ ...lesson, moduleTitle: module.title }))) ?? [], [course]);
  const selectedLesson = lessons.find((lesson) => lesson.id === (project?.lessonId ?? selectedLessonId));

  const loadCourse = useCallback(async (courseId: string) => {
    const response = await fetch(`${API_BASE}/courses/${courseId}/edit`, { headers: auth() });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message ?? "Formation inaccessible.");
    setCourse(body as CourseEdit);
    setSelectedCourseId(courseId);
    const firstLesson = (body.modules ?? []).flatMap((module: ModuleEdit) => module.lessons ?? [])[0];
    setSelectedLessonId(firstLesson?.id ?? "");
  }, []);

  const loadProject = useCallback(async (id: string) => {
    const response = await fetch(`${API_BASE}/studio/projects/${id}`, { headers: auth() });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message ?? "Projet Studio inaccessible.");
    setProject(body as StudioProject);
    setDirty(false);
    setAiResult(null);
    await loadCourse(body.courseId);
  }, [loadCourse]);

  const bootstrap = useCallback(async () => {
    try {
      const headers = auth();
      const [coursesResponse, projectsResponse] = await Promise.all([
        fetch(`${API_BASE}/courses/mine`, { headers }),
        fetch(`${API_BASE}/studio/projects`, { headers }),
      ]);
      const [coursesBody, projectsBody] = await Promise.all([coursesResponse.json(), projectsResponse.json()]);
      if (!coursesResponse.ok || !projectsResponse.ok) throw new Error(coursesBody.message ?? projectsBody.message ?? "Studio inaccessible.");
      setCourses(coursesBody);
      setProjects(projectsBody.projects ?? []);
      if (projectId) await loadProject(projectId);
      else if (projectsBody.projects?.[0]?.id) router.replace(`/creator/studio/${projectsBody.projects[0].id}`);
      else if (coursesBody[0]?.id) await loadCourse(coursesBody[0].id);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [loadCourse, loadProject, projectId, router]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void bootstrap(), 0);
    return () => window.clearTimeout(timeout);
  }, [bootstrap]);

  const saveProject = useCallback(async (nextProject: StudioProject, silent = false) => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/studio/projects/${nextProject.id}`, {
        method: "PATCH",
        headers: { ...auth(), "Content-Type": "application/json" },
        body: JSON.stringify({ version: nextProject.version, title: nextProject.title, status: nextProject.status, script: nextProject.script, transcript: nextProject.transcript, scenes: nextProject.scenes, videoPath: nextProject.videoPath }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? "Enregistrement impossible.");
      setProject(body as StudioProject);
      setDirty(false);
      setProjects((current) => current.map((item) => item.id === body.id ? { ...item, title: body.title, status: body.status, version: body.version, updatedAt: body.updatedAt } : item));
      if (!silent) setMessage("Projet Studio enregistré.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    if (!project || !dirty || saving) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void saveProject(project, true), 1400);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [dirty, project, saveProject, saving]);

  const updateProject = (updates: Partial<StudioProject>) => {
    setProject((current) => current ? { ...current, ...updates } : current);
    setDirty(true);
  };

  const createProject = async () => {
    if (!selectedCourseId || !selectedLessonId) return setMessage("Choisissez une formation et une leçon.");
    const lesson = lessons.find((item) => item.id === selectedLessonId);
    const response = await fetch(`${API_BASE}/studio/projects`, {
      method: "POST",
      headers: { ...auth(), "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: selectedCourseId, lessonId: selectedLessonId, title: lesson ? `Vidéo · ${lesson.title}` : "Nouveau projet Studio" }),
    });
    const body = await response.json();
    if (!response.ok) return setMessage(body.message ?? "Création impossible.");
    router.push(`/creator/studio/${body.id}`);
  };

  const saveCourse = async (nextCourse: CourseEdit) => {
    const response = await fetch(`${API_BASE}/courses/${nextCourse.id}`, { method: "PATCH", headers: { ...auth(), "Content-Type": "application/json" }, body: JSON.stringify(nextCourse) });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message ?? "Association à la leçon impossible.");
  };

  const uploadVideo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !course || !project || !selectedLesson?.id) return;
    setUploading(true); setMessage(null);
    try {
      const formData = new FormData(); formData.append("file", file);
      const uploadResponse = await fetch(`${API_BASE}/courses/upload-video`, { method: "POST", headers: auth(), body: formData });
      const uploaded = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(uploaded.message ?? "Import vidéo impossible.");
      const modules = course.modules.map((module) => ({ ...module, lessons: module.lessons.map((lesson) => lesson.id === selectedLesson.id ? { ...lesson, video_path: uploaded.path } : lesson) }));
      await saveCourse({ ...course, modules });
      const nextProject = { ...project, videoPath: uploaded.path };
      setCourse({ ...course, modules });
      setProject(nextProject);
      await saveProject(nextProject);
      setMessage("Vidéo importée, sauvegardée et liée à la leçon.");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Import impossible."); }
    finally { setUploading(false); event.target.value = ""; }
  };

  const addScene = () => {
    if (!project) return;
    updateProject({ scenes: [...project.scenes, { id: crypto.randomUUID(), title: `Scène ${project.scenes.length + 1}`, objective: "", durationSeconds: 60 }] });
  };

  const updateScene = (id: string, updates: Partial<Scene>) => {
    if (!project) return;
    updateProject({ scenes: project.scenes.map((scene) => scene.id === id ? { ...scene, ...updates } : scene) });
  };

  const generateAi = async () => {
    if (!project) return;
    setAiLoading(true); setMessage(null);
    try {
      const response = await fetch(`${API_BASE}/studio/projects/${project.id}/ai`, { method: "POST", headers: { ...auth(), "Content-Type": "application/json" }, body: JSON.stringify({ action: aiAction, prompt: aiPrompt }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? "Assistant IA indisponible.");
      setAiResult(body.result as AiResult);
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Assistant IA indisponible."); }
    finally { setAiLoading(false); }
  };

  const applyAi = () => {
    if (!project || !aiResult) return;
    if (aiAction === "outline") updateProject({ scenes: aiResult.outline.map((scene) => ({ ...scene, id: crypto.randomUUID() })) });
    if (aiAction === "script") updateProject({ script: aiResult.script });
    setMessage(aiAction === "quiz" ? "Quiz généré : copiez les questions utiles dans l’éditeur de cours." : "Suggestion IA appliquée au brouillon. Vérifiez-la avant publication.");
  };

  if (loading) return <section className={styles.loadingState}><span /><h1>Ouverture du Studio</h1></section>;
  if (!courses.length) return <section className={styles.emptyLearning}><Icon name="video" /><div><h1>Kalatty Studio</h1><p>Créez d’abord une formation et une leçon.</p></div><Link href="/creator/courses/new" className={styles.primaryButton}>Créer une formation</Link></section>;

  if (!project) return <>
    <header className={styles.pageHead}><div><h1>Kalatty Studio</h1><p>Préparez une vidéo pédagogique et reprenez votre brouillon à tout moment.</p></div></header>
    {message ? <p className={styles.builderMessage}>{message}</p> : null}
    <section className={styles.studioStart}><Icon name="video" /><h2>Nouveau projet vidéo</h2><p>Le projet sera lié à une leçon existante afin de conserver une seule source de vérité.</p><label>Formation<select value={selectedCourseId} onChange={(event) => void loadCourse(event.target.value)}>{courses.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label>Leçon<select value={selectedLessonId} onChange={(event) => setSelectedLessonId(event.target.value)}>{lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.moduleTitle} · {lesson.title}</option>)}</select></label><button type="button" className={styles.primaryButton} onClick={() => void createProject()}>Créer le projet</button></section>
  </>;

  return <>
    <header className={styles.pageHead}><div><span className={styles.eyebrow}>KALATTY STUDIO</span><h1>{project.title}</h1><p>{saving ? "Enregistrement…" : dirty ? "Modifications non enregistrées" : `Brouillon enregistré · version ${project.version}`}</p></div><div className={styles.builderHeaderActions}><Link href="/creator/studio" className={styles.smallButton}>Nouveau projet</Link><button type="button" className={styles.smallButton} disabled={saving || !dirty} onClick={() => void saveProject(project)}>{saving ? "Enregistrement…" : "Enregistrer"}</button></div></header>
    {message ? <p className={styles.builderMessage}>{message}</p> : null}
    <div className={styles.studioWorkspace}>
      <aside className={styles.studioProjects}><div className={styles.sectionHead}><h2>Projets</h2><span>{projects.length}</span></div>{projects.map((item) => <Link key={item.id} href={`/creator/studio/${item.id}`} className={item.id === project.id ? styles.projectActive : ""}><strong>{item.title}</strong><small>{item.courseTitle} · {new Date(item.updatedAt).toLocaleDateString("fr-FR")}</small></Link>)}</aside>
      <main className={styles.studioEditor}>
        <section className={styles.studioCanvas}><div><label>Titre du projet<input value={project.title} onChange={(event) => updateProject({ title: event.target.value })} /></label><label>Script de la vidéo<textarea rows={12} value={project.script} onChange={(event) => updateProject({ script: event.target.value })} placeholder="Rédigez ce que vous allez expliquer à l’écran…" /></label><label>Transcription<textarea rows={6} value={project.transcript} onChange={(event) => updateProject({ transcript: event.target.value })} placeholder="La transcription pourra être corrigée ici…" /></label></div><aside><div className={styles.studioPreview}>{project.videoPath ? <div className={styles.studioVideoReady}><Icon name="video" /><strong>Vidéo attachée</strong><small>{project.videoPath.split("/").pop()}</small></div> : <div className={styles.studioVideoReady}><Icon name="video" /><strong>Aucune vidéo</strong><small>Importez le média final de cette leçon.</small></div>}</div><label className={styles.studioUpload}>{uploading ? "Import en cours…" : project.videoPath ? "Remplacer la vidéo" : "Importer une vidéo"}<input type="file" accept="video/*" disabled={uploading} onChange={uploadVideo} /></label><label>État<select value={project.status} onChange={(event) => updateProject({ status: event.target.value as StudioProject["status"] })}><option value="draft">Brouillon</option><option value="ready">Prêt à vérifier</option><option value="published">Publié</option></select></label></aside></section>
        <section className={styles.sceneEditor}><div className={styles.sectionHead}><div><h2>Découpage en scènes</h2><p>{project.scenes.length} scène(s)</p></div><button type="button" onClick={addScene}>+ Ajouter</button></div>{project.scenes.length ? project.scenes.map((scene, index) => <article key={scene.id}><span>{String(index + 1).padStart(2, "0")}</span><input value={scene.title} onChange={(event) => updateScene(scene.id, { title: event.target.value })} aria-label={`Titre scène ${index + 1}`} /><textarea rows={2} value={scene.objective} onChange={(event) => updateScene(scene.id, { objective: event.target.value })} aria-label={`Objectif scène ${index + 1}`} /><label>Durée<input type="number" min={10} max={3600} value={scene.durationSeconds} onChange={(event) => updateScene(scene.id, { durationSeconds: Number(event.target.value) })} /></label><button type="button" aria-label={`Supprimer scène ${index + 1}`} onClick={() => updateProject({ scenes: project.scenes.filter((item) => item.id !== scene.id) })}>×</button></article>) : <div className={styles.empty}><Icon name="video" /><h3>Aucune scène</h3><p>Ajoutez une scène ou demandez un plan à l’assistant IA.</p></div>}</section>
      </main>
      <aside className={styles.aiPanel}><span className={styles.aiBadge}>IA</span><h2>Assistant pédagogique</h2><p>Générez une base de travail, puis vérifiez et adaptez toujours le résultat.</p><div className={styles.aiActions}>{(["outline", "script", "quiz"] as const).map((action) => <button type="button" key={action} className={aiAction === action ? styles.aiActionActive : ""} onClick={() => { setAiAction(action); setAiResult(null); }}>{action === "outline" ? "Plan" : action === "script" ? "Script" : "Quiz"}</button>)}</div><textarea rows={5} value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} placeholder="Précisez le niveau, le ton ou les points importants…" /><button type="button" className={styles.primaryButton} disabled={aiLoading} onClick={() => void generateAi()}>{aiLoading ? "Génération…" : "Générer"}</button>{aiResult ? <div className={styles.aiResult}><strong>{aiResult.title}</strong><p>{aiResult.summary}</p>{aiAction === "outline" ? <ol>{aiResult.outline.map((item) => <li key={item.title}>{item.title} · {item.durationSeconds}s</li>)}</ol> : null}{aiAction === "script" ? <p>{aiResult.script.slice(0, 500)}{aiResult.script.length > 500 ? "…" : ""}</p> : null}{aiAction === "quiz" ? <ol>{aiResult.quiz.map((item) => <li key={item.question}>{item.question}</li>)}</ol> : null}<button type="button" onClick={applyAi}>{aiAction === "quiz" ? "Conserver le résultat" : "Appliquer au brouillon"}</button></div> : null}</aside>
    </div>
  </>;
}
