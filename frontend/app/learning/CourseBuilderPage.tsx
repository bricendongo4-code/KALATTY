"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useState } from "react";
import { Icon } from "../establishment/ui";
import styles from "./learning.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const LOCAL_DRAFT_KEY = "kalatty_creator_course_draft_v1";

type LessonDraft = { id?: string; title: string; content: string; video_path?: string; duration_seconds?: number | null; is_preview?: boolean };
type ModuleDraft = { id?: string; title: string; description: string; lessons: LessonDraft[]; exercises?: Array<{ id?: string; title: string; instructions?: string; correction?: string }> };
type StoredDraft = { title: string; description: string; shortDescription: string; objectives: string; prerequisites: string; level: string; price: number; thumbnailPath: string; modules: ModuleDraft[] };

const EMPTY_MODULES: ModuleDraft[] = [{ title: "Module 1", description: "", lessons: [{ title: "Introduction", content: "" }] }];

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
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [currentStatus, setCurrentStatus] = useState<"draft" | "published" | "archived">("draft");
  const [modules, setModules] = useState<ModuleDraft[]>(EMPTY_MODULES);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) {
      const stored = localStorage.getItem(LOCAL_DRAFT_KEY);
      if (stored) {
        try {
          const draft = JSON.parse(stored) as StoredDraft;
          setTitle(draft.title ?? ""); setDescription(draft.description ?? ""); setShortDescription(draft.shortDescription ?? "");
          setObjectives(draft.objectives ?? ""); setPrerequisites(draft.prerequisites ?? ""); setLevel(draft.level || "Débutant");
          setPrice(Number(draft.price ?? 0)); setThumbnailPath(draft.thumbnailPath ?? ""); setModules(draft.modules?.length ? draft.modules : EMPTY_MODULES);
          setMessage("Votre création interrompue a été restaurée automatiquement.");
        } catch { localStorage.removeItem(LOCAL_DRAFT_KEY); }
      }
      setDraftReady(true);
      return;
    }

    const load = async () => {
      const token = localStorage.getItem("kalatty_token");
      if (!token) return router.replace(`/login?redirect=/creator/courses/${courseId}/builder`);
      setSaving(true);
      try {
        const response = await fetch(`${API_BASE}/courses/${courseId}/edit`, { headers: { Authorization: `Bearer ${token}` } });
        const body = await response.json();
        if (!response.ok) throw new Error(body.message ?? "Formation inaccessible.");
        setTitle(body.title ?? ""); setDescription(body.description ?? ""); setShortDescription(body.short_description ?? "");
        setObjectives(body.objectives ?? ""); setPrerequisites(body.prerequisites ?? ""); setLevel(body.level || "Débutant");
        setPrice(Number(body.price_fcfa ?? 0)); setThumbnailPath(body.thumbnail_path ?? ""); setCurrentStatus(body.status ?? "draft");
        setModules((body.modules ?? []).length ? body.modules : EMPTY_MODULES);
      } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Chargement impossible."); }
      finally { setSaving(false); setDraftReady(true); }
    };
    void load();
  }, [courseId, router]);

  useEffect(() => {
    if (courseId || !draftReady) return;
    const timeout = window.setTimeout(() => {
      const draft: StoredDraft = { title, description, shortDescription, objectives, prerequisites, level, price, thumbnailPath, modules };
      localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(draft));
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [courseId, description, draftReady, level, modules, objectives, prerequisites, price, shortDescription, thumbnailPath, title]);

  const updateModule = (index: number, patch: Partial<ModuleDraft>) => setModules((current) => current.map((module, i) => i === index ? { ...module, ...patch } : module));
  const updateLesson = (moduleIndex: number, lessonIndex: number, patch: Partial<LessonDraft>) => setModules((current) => current.map((module, i) => i === moduleIndex ? { ...module, lessons: module.lessons.map((lesson, j) => j === lessonIndex ? { ...lesson, ...patch } : lesson) } : module));
  const addModule = () => setModules((current) => [...current, { title: `Module ${current.length + 1}`, description: "", lessons: [] }]);
  const addLesson = (moduleIndex: number) => setModules((current) => current.map((module, i) => i === moduleIndex ? { ...module, lessons: [...module.lessons, { title: `Leçon ${module.lessons.length + 1}`, content: "" }] } : module));

  async function upload(file: File, endpoint: "upload-thumbnail" | "upload-video") {
    const token = localStorage.getItem("kalatty_token");
    if (!token) throw new Error("Votre session a expiré.");
    const form = new FormData(); form.append("file", file);
    const response = await fetch(`${API_BASE}/courses/${endpoint}`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message ?? "Import impossible.");
    return String(body.path ?? "");
  }

  async function uploadThumbnail(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    setUploading("thumbnail"); setMessage(null);
    try { setThumbnailPath(await upload(file, "upload-thumbnail")); setThumbnailPreview(URL.createObjectURL(file)); setMessage("Miniature ajoutée."); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : "Import impossible."); }
    finally { setUploading(null); event.target.value = ""; }
  }

  async function uploadLessonVideo(moduleIndex: number, lessonIndex: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    const uploadId = `${moduleIndex}-${lessonIndex}`; setUploading(uploadId); setMessage(null);
    try { updateLesson(moduleIndex, lessonIndex, { video_path: await upload(file, "upload-video") }); setMessage(`Vidéo « ${file.name} » ajoutée à la leçon.`); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : "Import impossible."); }
    finally { setUploading(null); event.target.value = ""; }
  }

  const save = async (status: "draft" | "published") => {
    const token = localStorage.getItem("kalatty_token");
    if (!token) return router.replace("/login?redirect=/creator/courses/new");
    if (!title.trim()) return setMessage("Le titre de la formation est obligatoire.");
    if (status === "published" && (!description.trim() || !shortDescription.trim() || !modules.some((module) => module.lessons.some((lesson) => lesson.video_path)))) return setMessage("Ajoutez un résumé, une description et au moins une leçon vidéo avant publication.");
    setSaving(true); setMessage(null);
    try {
      const response = await fetch(courseId ? `${API_BASE}/courses/${courseId}` : `${API_BASE}/courses`, {
        method: courseId ? "PATCH" : "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), short_description: shortDescription.trim(), objectives: objectives.trim(), prerequisites: prerequisites.trim(), level, price_fcfa: Number(price), thumbnail_path: thumbnailPath, status, modules: modules.map((module) => ({ ...module, title: module.title.trim(), lessons: module.lessons.map((lesson) => ({ ...lesson, title: lesson.title.trim() })) })) }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? "Enregistrement impossible.");
      localStorage.removeItem(LOCAL_DRAFT_KEY);
      setMessage(status === "published" ? "Formation publiée avec succès." : "Brouillon enregistré sur votre compte.");
      window.setTimeout(() => router.push("/creator/courses"), 700);
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Enregistrement impossible."); }
    finally { setSaving(false); }
  };

  async function deleteCourse() {
    if (!courseId) return;
    const confirmation = window.prompt(`Pour supprimer cette formation, saisissez exactement : ${title}`);
    if (confirmation !== title) return setMessage("Suppression annulée : le titre saisi ne correspond pas.");
    const token = localStorage.getItem("kalatty_token"); if (!token) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/courses/${courseId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const body = await response.json(); if (!response.ok) throw new Error(body.message ?? "Suppression impossible.");
      router.replace("/creator/courses");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Suppression impossible."); setSaving(false); }
  }

  return <>
    <header className={styles.pageHead}><div><h1>{courseId ? "Modifier la formation" : "Créer une formation"}</h1><p>Le brouillon est conservé automatiquement sur cet appareil jusqu’à son enregistrement.</p></div><div className={styles.builderHeaderActions}>{courseId ? <Link href={`/creator/courses/${courseId}/preview`} className={styles.smallButton}><Icon name="eye" /> Prévisualiser</Link> : null}<button type="button" disabled={saving || Boolean(uploading)} className={styles.smallButton} onClick={() => void save(currentStatus === "published" ? "published" : "draft")}>Enregistrer</button></div></header>
    <ol className={styles.steps}><li className={styles.stepActive}><b>1</b> Informations</li><li className={styles.stepActive}><b>2</b> Contenu</li><li><b>3</b> Vérification</li><li><b>4</b> Publication</li></ol>
    {message ? <p className={styles.builderMessage}>{message}</p> : null}
    <div className={styles.builderConnected}>
      <section className={styles.builderForm}><h2>Informations générales</h2><label>Titre de la formation<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex. Marketing digital" /></label><label>Résumé<input value={shortDescription} onChange={(event) => setShortDescription(event.target.value)} placeholder="Une phrase pour présenter la formation" /></label><label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} /></label><div className={styles.formGrid}><label>Niveau<select value={level} onChange={(event) => setLevel(event.target.value)}><option>Débutant</option><option>Intermédiaire</option><option>Avancé</option></select></label><label>Prix en FCFA<input type="number" min={0} value={price} onChange={(event) => setPrice(Number(event.target.value))} /></label></div><label>Miniature du cours<span className={styles.thumbnailUploader}>{thumbnailPreview ? <span style={{ backgroundImage: `url(${thumbnailPreview})` }} /> : <Icon name="file" />}<strong>{uploading === "thumbnail" ? "Import en cours…" : thumbnailPath ? "Remplacer la miniature" : "Choisir une image"}</strong><small>{thumbnailPath || "JPG, PNG ou WebP"}</small><input type="file" accept="image/*" onChange={(event) => void uploadThumbnail(event)} disabled={Boolean(uploading)} /></span></label><label>Objectifs<textarea value={objectives} onChange={(event) => setObjectives(event.target.value)} rows={3} placeholder="Ce que l’apprenant saura faire" /></label><label>Prérequis<textarea value={prerequisites} onChange={(event) => setPrerequisites(event.target.value)} rows={3} placeholder="Aucun prérequis ou connaissances attendues" /></label></section>
      <section className={styles.moduleBuilder}><div className={styles.sectionHead}><h2>Modules et leçons</h2><button type="button" onClick={addModule}><Icon name="plus" /> Ajouter un module</button></div>{modules.map((module, moduleIndex) => <article key={module.id ?? moduleIndex} className={styles.moduleCard}><div className={styles.moduleTitle}><span>{moduleIndex + 1}</span><input value={module.title} onChange={(event) => updateModule(moduleIndex, { title: event.target.value })} /><button type="button" onClick={() => setModules((current) => current.filter((_, index) => index !== moduleIndex))} disabled={modules.length === 1}>Supprimer</button></div><textarea value={module.description} onChange={(event) => updateModule(moduleIndex, { description: event.target.value })} placeholder="Description du module" rows={2} /><div className={styles.lessonList}>{module.lessons.map((lesson, lessonIndex) => <div key={lesson.id ?? lessonIndex} className={styles.lessonDraft}><Icon name="video" /><input value={lesson.title} onChange={(event) => updateLesson(moduleIndex, lessonIndex, { title: event.target.value })} placeholder="Titre de la leçon" /><textarea value={lesson.content} onChange={(event) => updateLesson(moduleIndex, lessonIndex, { content: event.target.value })} placeholder="Contenu ou résumé" rows={2} /><button type="button" onClick={() => updateModule(moduleIndex, { lessons: module.lessons.filter((_, index) => index !== lessonIndex) })} aria-label="Supprimer la leçon">×</button><div className={styles.lessonMedia}><label><Icon name="video" />{uploading === `${moduleIndex}-${lessonIndex}` ? "Import en cours…" : lesson.video_path ? "Remplacer la vidéo" : "Ajouter une vidéo"}<input type="file" accept="video/*" onChange={(event) => void uploadLessonVideo(moduleIndex, lessonIndex, event)} disabled={Boolean(uploading)} /></label>{lesson.video_path ? <><small>Vidéo prête</small><button type="button" onClick={() => updateLesson(moduleIndex, lessonIndex, { video_path: "" })}>Retirer</button></> : <small>Aucune vidéo</small>}</div></div>)}</div><button type="button" className={styles.addLesson} onClick={() => addLesson(moduleIndex)}>+ Ajouter une leçon</button></article>)}</section>
    </div>
    {courseId ? <section className={styles.dangerZone}><div><small>ZONE DANGEREUSE</small><h2>Supprimer cette formation</h2><p>Cette action supprime le contenu sans historique financier ou archive la formation lorsque des justificatifs doivent être conservés.</p></div><button type="button" disabled={saving} onClick={() => void deleteCourse()}>Supprimer la formation</button></section> : null}
    <div className={styles.publishBar}><span><Icon name="shield" /> Publication possible après ajout du résumé, de la description et d’une vidéo.</span><button type="button" disabled={saving || Boolean(uploading)} className={styles.primaryButton} onClick={() => void save("published")}>{saving ? "Enregistrement…" : "Publier la formation"}</button></div>
  </>;
}
