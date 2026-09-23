"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "../establishment/ui";
import styles from "./learning.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
type LessonDraft = { id?: string; title: string; content: string; video_path?: string; duration_seconds?: number | null; is_preview?: boolean };
type ModuleDraft = { id?: string; title: string; description: string; lessons: LessonDraft[]; exercises?: Array<{ id?: string; title: string; instructions?: string; correction?: string }> };

export default function CourseBuilderPage({ courseId }: { courseId?: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [objectives, setObjectives] = useState("");
  const [prerequisites, setPrerequisites] = useState("");
  const [level, setLevel] = useState("Débutant");
  const [price, setPrice] = useState(0);
  const [thumbnailPath, setThumbnailPath] = useState("");
  const [currentStatus, setCurrentStatus] = useState<"draft" | "published" | "archived">("draft");
  const [modules, setModules] = useState<ModuleDraft[]>([{ title: "Module 1", description: "", lessons: [{ title: "Introduction", content: "" }] }]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;
    const load = async () => {
      const token = localStorage.getItem("kalatty_token");
      if (!token) return router.replace(`/login?redirect=/learning/formateur/formations/${courseId}`);
      setSaving(true);
      try {
        const response = await fetch(`${API_BASE}/courses/${courseId}/edit`, { headers: { Authorization: `Bearer ${token}` } });
        const body = await response.json();
        if (!response.ok) throw new Error(body.message ?? "Formation inaccessible.");
        setTitle(body.title ?? ""); setDescription(body.description ?? ""); setShortDescription(body.short_description ?? ""); setObjectives(body.objectives ?? ""); setPrerequisites(body.prerequisites ?? ""); setLevel(body.level || "Débutant"); setPrice(Number(body.price_fcfa ?? 0)); setThumbnailPath(body.thumbnail_path ?? ""); setCurrentStatus(body.status ?? "draft");
        setModules((body.modules ?? []).length ? body.modules : [{ title: "Module 1", description: "", lessons: [] }]);
      } catch (reason) {
        setMessage(reason instanceof Error ? reason.message : "Chargement impossible.");
      } finally { setSaving(false); }
    };
    load();
  }, [courseId, router]);

  const updateModule = (index: number, patch: Partial<ModuleDraft>) => setModules((current) => current.map((module, i) => i === index ? { ...module, ...patch } : module));
  const updateLesson = (moduleIndex: number, lessonIndex: number, patch: Partial<LessonDraft>) => setModules((current) => current.map((module, i) => i === moduleIndex ? { ...module, lessons: module.lessons.map((lesson, j) => j === lessonIndex ? { ...lesson, ...patch } : lesson) } : module));
  const addModule = () => setModules((current) => [...current, { title: `Module ${current.length + 1}`, description: "", lessons: [] }]);
  const addLesson = (moduleIndex: number) => setModules((current) => current.map((module, i) => i === moduleIndex ? { ...module, lessons: [...module.lessons, { title: `Leçon ${module.lessons.length + 1}`, content: "" }] } : module));

  const save = async (status: "draft" | "published") => {
    const token = localStorage.getItem("kalatty_token");
    if (!token) return router.replace("/login?redirect=/learning/formateur/formations/builder");
    if (!title.trim()) return setMessage("Le titre de la formation est obligatoire.");
    if (status === "published" && (!description.trim() || !modules.some((module) => module.lessons.length))) return setMessage("Ajoutez une description et au moins une leçon avant publication.");
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(courseId ? `${API_BASE}/courses/${courseId}` : `${API_BASE}/courses`, {
        method: courseId ? "PATCH" : "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), short_description: shortDescription.trim(), objectives: objectives.trim(), prerequisites: prerequisites.trim(), level, price_fcfa: Number(price), thumbnail_path: thumbnailPath, status, modules: modules.map((module) => ({ ...module, title: module.title.trim(), lessons: module.lessons.map((lesson) => ({ ...lesson, title: lesson.title.trim() })) })) }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? "Enregistrement impossible.");
      setMessage(status === "published" ? "Formation publiée avec succès." : "Brouillon enregistré.");
      setTimeout(() => router.push("/learning/formateur/formations"), 600);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  return <>
    <header className={styles.pageHead}><div><h1>{courseId ? "Modifier la formation" : "Créer une formation"}</h1><p>Construisez la formation, ses modules et ses leçons avant publication.</p></div><button disabled={saving} className={styles.smallButton} onClick={() => save(currentStatus === "published" ? "published" : "draft")}>Enregistrer</button></header>
    <ol className={styles.steps}><li className={styles.stepActive}><b>1</b> Informations</li><li className={styles.stepActive}><b>2</b> Contenu</li><li><b>3</b> Vérification</li><li><b>4</b> Publication</li></ol>
    {message ? <p className={styles.builderMessage}>{message}</p> : null}
    <div className={styles.builderConnected}>
      <section className={styles.builderForm}><h2>Informations générales</h2><label>Titre de la formation<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex. Marketing digital" /></label><label>Résumé<input value={shortDescription} onChange={(event) => setShortDescription(event.target.value)} placeholder="Une phrase pour présenter la formation" /></label><label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} /></label><div className={styles.formGrid}><label>Niveau<select value={level} onChange={(event) => setLevel(event.target.value)}><option>Débutant</option><option>Intermédiaire</option><option>Avancé</option></select></label><label>Prix en FCFA<input type="number" min={0} value={price} onChange={(event) => setPrice(Number(event.target.value))} /></label></div><label>Objectifs<textarea value={objectives} onChange={(event) => setObjectives(event.target.value)} rows={3} placeholder="Ce que l’apprenant saura faire" /></label><label>Prérequis<textarea value={prerequisites} onChange={(event) => setPrerequisites(event.target.value)} rows={3} placeholder="Aucun prérequis ou connaissances attendues" /></label></section>
      <section className={styles.moduleBuilder}><div className={styles.sectionHead}><h2>Modules et leçons</h2><button onClick={addModule}><Icon name="plus" /> Ajouter un module</button></div>{modules.map((module, moduleIndex) => <article key={moduleIndex} className={styles.moduleCard}><div className={styles.moduleTitle}><span>{moduleIndex + 1}</span><input value={module.title} onChange={(event) => updateModule(moduleIndex, { title: event.target.value })} /><button onClick={() => setModules((current) => current.filter((_, index) => index !== moduleIndex))} disabled={modules.length === 1}>Supprimer</button></div><textarea value={module.description} onChange={(event) => updateModule(moduleIndex, { description: event.target.value })} placeholder="Description du module" rows={2} /><div className={styles.lessonList}>{module.lessons.map((lesson, lessonIndex) => <div key={lessonIndex} className={styles.lessonDraft}><Icon name="video" /><input value={lesson.title} onChange={(event) => updateLesson(moduleIndex, lessonIndex, { title: event.target.value })} placeholder="Titre de la leçon" /><textarea value={lesson.content} onChange={(event) => updateLesson(moduleIndex, lessonIndex, { content: event.target.value })} placeholder="Contenu ou résumé" rows={2} /><button onClick={() => updateModule(moduleIndex, { lessons: module.lessons.filter((_, index) => index !== lessonIndex) })}>×</button></div>)}</div><button className={styles.addLesson} onClick={() => addLesson(moduleIndex)}>+ Ajouter une leçon</button></article>)}</section>
    </div>
    <div className={styles.publishBar}><span><Icon name="shield" /> La publication vérifie le titre, la description et la présence d’une leçon.</span><button disabled={saving} className={styles.primaryButton} onClick={() => save("published")}>{saving ? "Enregistrement…" : "Publier la formation"}</button></div>
  </>;
}
