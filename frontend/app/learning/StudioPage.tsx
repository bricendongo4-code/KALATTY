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
  const [aiAction, setAiAction] = useState<"outline" | "script">("outline");
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
    setMessage("Suggestion appliquée au brouillon. Relisez-la et adaptez-la avant de finaliser la vidéo.");
  };

  const workflowSteps = project ? [
    { label: "Leçon choisie", detail: selectedLesson?.title ?? "À vérifier", done: Boolean(selectedLesson?.id) },
    { label: "Contenu préparé", detail: "Script ou scènes", done: Boolean(project.script.trim() || project.scenes.length) },
    { label: "Vidéo importée", detail: "Fichier lié à la leçon", done: Boolean(project.videoPath) },
    { label: "Projet finalisé", detail: "Prêt pour le cours", done: project.status === "ready" || project.status === "published" },
  ] : [];

  if (loading) return <section className={styles.loadingState}><span /><h1>Ouverture du Studio</h1></section>;
  if (!courses.length) return <section className={styles.emptyLearning}><Icon name="video" /><div><h1>Studio vidéo</h1><p>Le Studio prépare les vidéos d&apos;une formation existante. Créez d&apos;abord une formation avec au moins une leçon.</p></div><Link href="/creator/courses/new" className={styles.primaryButton}>Créer une formation</Link></section>;

  if (!project) return <>
    <header className={styles.pageHead}><div><span className={styles.eyebrow}>ATELIER DU FORMATEUR</span><h1>Studio vidéo</h1><p>Préparez le contenu d&apos;une vidéo, importez-la puis rattachez-la à une leçon existante.</p></div><Link href="/creator/courses" className={styles.smallButton}>Gérer mes formations</Link></header>
    {message ? <p className={styles.builderMessage}>{message}</p> : null}
    <section className={styles.studioPurpose}>
      <div><Icon name="video" /><span><small>À quoi sert cet espace ?</small><h2>Une vidéo prête pour une leçon</h2></span></div>
      <p>Le Studio ne crée pas une deuxième formation. Il vous aide à préparer une vidéo pédagogique, puis l&apos;ajoute directement à la leçon que vous choisissez.</p>
      <ol>
        <li><b>1</b><span><strong>Choisir la leçon</strong><small>La formation et la leçon existent déjà.</small></span></li>
        <li><b>2</b><span><strong>Préparer la vidéo</strong><small>Rédigez un script ou un découpage simple.</small></span></li>
        <li><b>3</b><span><strong>Importer le fichier</strong><small>La vidéo est automatiquement liée à la leçon.</small></span></li>
      </ol>
    </section>
    <section className={styles.studioStart}>
      <span className={styles.studioStepBadge}>Étape 1</span>
      <h2>Choisir la leçon à illustrer</h2>
      <p>Vous pourrez interrompre votre travail et reprendre ce projet plus tard.</p>
      <label>Formation<select value={selectedCourseId} onChange={(event) => void loadCourse(event.target.value)}>{courses.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      <label>Leçon<select value={selectedLessonId} onChange={(event) => setSelectedLessonId(event.target.value)}>{lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.moduleTitle} · {lesson.title}</option>)}</select></label>
      {!lessons.length ? <p className={styles.studioWarning}>Cette formation ne contient aucune leçon. Ajoutez-en une depuis « Mes formations ».</p> : null}
      <button type="button" className={styles.primaryButton} disabled={!selectedLessonId} onClick={() => void createProject()}>Commencer la préparation</button>
    </section>
  </>;

  return <>
    <header className={styles.pageHead}><div><span className={styles.eyebrow}>STUDIO VIDÉO</span><h1>{project.title}</h1><p>{course?.title}{selectedLesson ? ` · ${selectedLesson.title}` : ""}</p></div><div className={`${styles.builderHeaderActions} ${styles.studioHeaderActions}`}><Link href="/creator/courses" className={styles.smallButton}>Mes formations</Link><Link href="/creator/studio" className={styles.smallButton}>Nouveau projet</Link><button type="button" className={styles.smallButton} disabled={saving || !dirty} onClick={() => void saveProject(project)}>{saving ? "Enregistrement…" : dirty ? "Enregistrer" : "Enregistré"}</button></div></header>
    {message ? <p className={styles.builderMessage}>{message}</p> : null}
    <section className={styles.studioStatus} aria-label="Avancement du projet vidéo">
      <div><strong>{saving ? "Enregistrement en cours…" : dirty ? "Modifications à enregistrer" : `Brouillon sauvegardé · version ${project.version}`}</strong><span>La vidéo sera disponible dans la leçon choisie après son import.</span></div>
      <ol>{workflowSteps.map((step, index) => <li key={step.label} className={step.done ? styles.studioStepDone : ""}><b>{step.done ? "✓" : index + 1}</b><span><strong>{step.label}</strong><small>{step.detail}</small></span></li>)}</ol>
    </section>
    <div className={styles.studioWorkspace}>
      <aside className={styles.studioProjects}><div className={styles.sectionHead}><h2>Projets</h2><span>{projects.length}</span></div>{projects.map((item) => <Link key={item.id} href={`/creator/studio/${item.id}`} className={item.id === project.id ? styles.projectActive : ""}><strong>{item.title}</strong><small>{item.courseTitle} · {new Date(item.updatedAt).toLocaleDateString("fr-FR")}</small></Link>)}</aside>
      <main className={styles.studioEditor}>
        <section className={styles.studioCanvas}>
          <div>
            <div className={styles.studioSectionTitle}><b>1</b><span><h2>Préparer le contenu</h2><p>Écrivez ce que vous souhaitez expliquer. Tout est sauvegardé en brouillon.</p></span></div>
            <label>Titre du projet<input value={project.title} onChange={(event) => updateProject({ title: event.target.value })} /></label>
            <label>Script de la vidéo<textarea rows={12} value={project.script} onChange={(event) => updateProject({ script: event.target.value })} placeholder="Rédigez ce que vous allez expliquer à l’écran…" /></label>
            <label>Transcription, si elle existe<textarea rows={6} value={project.transcript} onChange={(event) => updateProject({ transcript: event.target.value })} placeholder="Vous pourrez corriger ici le texte prononcé dans la vidéo…" /></label>
          </div>
          <aside>
            <div className={styles.studioSectionTitle}><b>2</b><span><h2>Importer la vidéo</h2><p>Le fichier sera directement rattaché à « {selectedLesson?.title ?? "la leçon choisie"} ».</p></span></div>
            <div className={styles.studioPreview}>{project.videoPath ? <div className={styles.studioVideoReady}><Icon name="video" /><strong>Vidéo liée à la leçon</strong><small>{project.videoPath.split("/").pop()}</small></div> : <div className={styles.studioVideoReady}><Icon name="video" /><strong>Vidéo non importée</strong><small>Formats vidéo acceptés par Kalatty.</small></div>}</div>
            <label className={styles.studioUpload}>{uploading ? "Import en cours…" : project.videoPath ? "Remplacer la vidéo" : "Choisir une vidéo"}<input type="file" accept="video/*" disabled={uploading} onChange={uploadVideo} /></label>
            <label>Avancement du projet<select value={project.status} onChange={(event) => updateProject({ status: event.target.value as StudioProject["status"] })}><option value="draft">En préparation</option><option value="ready">Prêt à relire</option><option value="published">Finalisé</option></select><small className={styles.studioHelper}>Ce statut organise votre travail. La publication de la formation se fait dans « Mes formations ».</small></label>
          </aside>
        </section>
        <section className={styles.sceneEditor}><div className={styles.sectionHead}><div><div className={styles.studioSectionTitle}><b>Option</b><span><h2>Organiser le déroulé</h2><p>Découpez votre explication en parties courtes uniquement si cela vous aide à préparer le tournage.</p></span></div></div><button type="button" onClick={addScene}>+ Ajouter une partie</button></div>{project.scenes.length ? project.scenes.map((scene, index) => <article key={scene.id}><span>{String(index + 1).padStart(2, "0")}</span><input value={scene.title} onChange={(event) => updateScene(scene.id, { title: event.target.value })} aria-label={`Titre scène ${index + 1}`} /><textarea rows={2} value={scene.objective} onChange={(event) => updateScene(scene.id, { objective: event.target.value })} aria-label={`Objectif scène ${index + 1}`} /><label>Durée<input type="number" min={10} max={3600} value={scene.durationSeconds} onChange={(event) => updateScene(scene.id, { durationSeconds: Number(event.target.value) })} /></label><button type="button" aria-label={`Supprimer scène ${index + 1}`} onClick={() => updateProject({ scenes: project.scenes.filter((item) => item.id !== scene.id) })}>×</button></article>) : <div className={styles.studioEmptyStep}><Icon name="video" /><span><h3>Le découpage est facultatif</h3><p>Ajoutez des parties si vous souhaitez préparer votre tournage, ou importez directement une vidéo déjà terminée.</p></span><button type="button" onClick={addScene}>Créer la première partie</button></div>}</section>
      </main>
      <aside className={styles.aiPanel}><span className={styles.aiBadge}>AIDE IA</span><h2>Besoin d&apos;un point de départ ?</h2><p>Cette aide est facultative. Elle propose un plan ou un script, mais ne publie rien automatiquement.</p><div className={styles.aiActions}>{(["outline", "script"] as const).map((action) => <button type="button" key={action} className={aiAction === action ? styles.aiActionActive : ""} onClick={() => { setAiAction(action); setAiResult(null); }}>{action === "outline" ? "Plan de la vidéo" : "Script"}</button>)}</div><textarea rows={5} value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} placeholder="Exemple : niveau débutant, ton simple, expliquer les fractions…" /><button type="button" className={styles.primaryButton} disabled={aiLoading} onClick={() => void generateAi()}>{aiLoading ? "Génération…" : "Proposer une base"}</button>{aiResult ? <div className={styles.aiResult}><strong>{aiResult.title}</strong><p>{aiResult.summary}</p>{aiAction === "outline" ? <ol>{aiResult.outline.map((item) => <li key={item.title}>{item.title} · {item.durationSeconds}s</li>)}</ol> : null}{aiAction === "script" ? <p>{aiResult.script.slice(0, 500)}{aiResult.script.length > 500 ? "…" : ""}</p> : null}<button type="button" onClick={applyAi}>Utiliser cette proposition</button></div> : null}</aside>
    </div>
  </>;
}
