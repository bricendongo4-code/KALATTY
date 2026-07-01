"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./dashboard.module.css";

type LessonDraft = {
  id?: string;
  title: string;
  video_path: string;
  content: string;
  duration_seconds: string;
  is_preview: boolean;
  uploading: boolean;
};

type ModuleDraft = {
  id?: string;
  title: string;
  description: string;
  lessons: LessonDraft[];
};

type BuilderStep = "landing" | "basics" | "curriculum" | "publish";
type CourseDraftSnapshot = {
  step: BuilderStep;
  courseTitle: string;
  courseDescription: string;
  courseShortDescription: string;
  coursePrice: string;
  courseStatus: "draft" | "published" | "archived";
  thumbnailPath: string;
  modules: ModuleDraft[];
  savedAt: string;
};

const COURSE_BUILDER_DRAFT_KEY = "kalatty_teacher_course_builder_draft_v1";

const createLesson = (): LessonDraft => ({
  title: "",
  video_path: "",
  content: "",
  duration_seconds: "",
  is_preview: false,
  uploading: false,
});

const createModule = (): ModuleDraft => ({
  title: "",
  description: "",
  lessons: [createLesson()],
});

type Props = {
  apiBaseUrl: string;
  onCourseCreated: () => Promise<void> | void;
  editingCourseId?: string | null;
  onCancelEdit?: () => void;
};

export default function TeacherCourseBuilder({
  apiBaseUrl,
  onCourseCreated,
  editingCourseId,
  onCancelEdit,
}: Props) {
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState<BuilderStep>("landing");
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseShortDescription, setCourseShortDescription] = useState("");
  const [coursePrice, setCoursePrice] = useState("");
  const [courseStatus, setCourseStatus] = useState<
    "draft" | "published" | "archived"
  >("published");
  const [thumbnailPath, setThumbnailPath] = useState("");
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [modules, setModules] = useState<ModuleDraft[]>([createModule()]);
  const [courseMessage, setCourseMessage] = useState("");
  const [courseLoading, setCourseLoading] = useState(false);
  const [loadingCourseDraft, setLoadingCourseDraft] = useState(false);
  const [localDraftReady, setLocalDraftReady] = useState(false);
  const [localDraftMessage, setLocalDraftMessage] = useState("");
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [courseDeleting, setCourseDeleting] = useState(false);

  const totalLessons = useMemo(
    () =>
      modules.reduce(
        (sum, currentModule) =>
          sum +
          currentModule.lessons.filter((lesson) => lesson.title.trim()).length,
        0,
      ),
    [modules],
  );

  const uploadedVideos = useMemo(
    () =>
      modules.reduce(
        (sum, currentModule) =>
          sum +
          currentModule.lessons.filter((lesson) => lesson.video_path.trim())
            .length,
        0,
      ),
    [modules],
  );

  const checklist = useMemo(
    () => [
      {
        label: "Titre du cours",
        done: courseTitle.trim().length > 0,
        hint: "Un titre simple, clair et precis.",
      },
      {
        label: "Sous-titre vendeur",
        done: courseShortDescription.trim().length > 0,
        hint: "Explique la promesse du cours en une phrase.",
      },
      {
        label: "Miniature",
        done: thumbnailPath.trim().length > 0,
        hint: "Ajoute une couverture pour rassurer l'apprenant.",
      },
      {
        label: "Premiere video",
        done: uploadedVideos > 0,
        hint: "Charge au moins une video directement dans Kalatty.",
      },
    ],
    [courseShortDescription, courseTitle, thumbnailPath, uploadedVideos],
  );

  const completedChecklist = checklist.filter((item) => item.done).length;

  const hasMeaningfulDraft = useMemo(
    () =>
      courseTitle.trim().length > 0 ||
      courseDescription.trim().length > 0 ||
      courseShortDescription.trim().length > 0 ||
      coursePrice.trim().length > 0 ||
      thumbnailPath.trim().length > 0 ||
      modules.some(
        (currentModule) =>
          currentModule.title.trim().length > 0 ||
          currentModule.description.trim().length > 0 ||
          currentModule.lessons.some(
            (lesson) =>
              lesson.title.trim().length > 0 ||
              lesson.content.trim().length > 0 ||
              lesson.video_path.trim().length > 0,
          ),
      ),
    [
      courseDescription,
      coursePrice,
      courseShortDescription,
      courseTitle,
      modules,
      thumbnailPath,
    ],
  );

  const resetBuilder = () => {
    setCourseTitle("");
    setCourseDescription("");
    setCourseShortDescription("");
    setCoursePrice("");
    setCourseStatus("published");
    setThumbnailPath("");
    setModules([createModule()]);
    setStep("landing");
    setDeleteConfirmationOpen(false);
    setDeleteConfirmationText("");
  };

  const clearLocalDraft = () => {
    localStorage.removeItem(COURSE_BUILDER_DRAFT_KEY);
    resetBuilder();
    setLocalDraftMessage("Brouillon local efface.");
  };

  useEffect(() => {
    const token = localStorage.getItem("kalatty_token");

    if (!editingCourseId) {
      const rawDraft = localStorage.getItem(COURSE_BUILDER_DRAFT_KEY);

      if (!rawDraft) {
        resetBuilder();
        setLocalDraftReady(true);
        setLocalDraftMessage("");
        return;
      }

      try {
        const draft = JSON.parse(rawDraft) as Partial<CourseDraftSnapshot>;
        setCourseTitle(String(draft.courseTitle ?? ""));
        setCourseDescription(String(draft.courseDescription ?? ""));
        setCourseShortDescription(String(draft.courseShortDescription ?? ""));
        setCoursePrice(String(draft.coursePrice ?? ""));
        setCourseStatus(
          draft.courseStatus === "draft" || draft.courseStatus === "archived"
            ? draft.courseStatus
            : "published",
        );
        setThumbnailPath(String(draft.thumbnailPath ?? ""));
        setModules(
          Array.isArray(draft.modules) && draft.modules.length > 0
            ? draft.modules.map((module) => ({
                id: module.id,
                title: String(module.title ?? ""),
                description: String(module.description ?? ""),
                lessons:
                  Array.isArray(module.lessons) && module.lessons.length > 0
                    ? module.lessons.map((lesson) => ({
                        id: lesson.id,
                        title: String(lesson.title ?? ""),
                        video_path: String(lesson.video_path ?? ""),
                        content: String(lesson.content ?? ""),
                        duration_seconds: String(lesson.duration_seconds ?? ""),
                        is_preview: Boolean(lesson.is_preview),
                        uploading: false,
                      }))
                    : [createLesson()],
              }))
            : [createModule()],
        );
        setStep(
          draft.step === "basics" ||
            draft.step === "curriculum" ||
            draft.step === "publish"
            ? draft.step
            : "landing",
        );
        setLocalDraftMessage(
          "Brouillon retrouve automatiquement sur cet appareil.",
        );
      } catch {
        localStorage.removeItem(COURSE_BUILDER_DRAFT_KEY);
        resetBuilder();
        setLocalDraftMessage("Ancien brouillon illisible, il a ete nettoye.");
      }

      setLocalDraftReady(true);
      return;
    }

    if (!token) {
      setCourseMessage("Session introuvable. Reconnecte-toi.");
      return;
    }

    const loadCourseDraft = async () => {
      setLoadingCourseDraft(true);
      setCourseMessage("");

      try {
        const res = await fetch(
          `${apiBaseUrl}/courses/${editingCourseId}/edit`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const data = await res.json();

        if (!res.ok) {
          setCourseMessage(
            typeof data.message === "string"
              ? data.message
              : "Impossible de charger ce cours pour modification.",
          );
          return;
        }

        setCourseTitle(String(data.title ?? ""));
        setCourseDescription(String(data.description ?? ""));
        setCourseShortDescription(String(data.short_description ?? ""));
        setCoursePrice(
          data.price_fcfa !== null && data.price_fcfa !== undefined
            ? String(data.price_fcfa)
            : "",
        );
        setThumbnailPath(String(data.thumbnail_path ?? ""));
        setCourseStatus(
          data.status === "draft" || data.status === "archived"
            ? data.status
            : "published",
        );
        setModules(
          Array.isArray(data.modules) && data.modules.length > 0
            ? data.modules.map((module: Record<string, unknown>) => ({
                id: String(module.id ?? ""),
                title: String(module.title ?? ""),
                description: String(module.description ?? ""),
                lessons:
                  Array.isArray(module.lessons) && module.lessons.length > 0
                    ? module.lessons.map((lesson: Record<string, unknown>) => ({
                        id: String(lesson.id ?? ""),
                        title: String(lesson.title ?? ""),
                        video_path: String(lesson.video_path ?? ""),
                        content: String(lesson.content ?? ""),
                        duration_seconds:
                          lesson.duration_seconds !== null &&
                          lesson.duration_seconds !== undefined
                            ? String(lesson.duration_seconds)
                            : "",
                        is_preview: Boolean(lesson.is_preview),
                        uploading: false,
                      }))
                    : [createLesson()],
              }))
            : [createModule()],
        );
        setStep("basics");
        setCourseMessage("Cours charge dans le studio. Tu peux le modifier.");
      } catch {
        setCourseMessage("Le cours n'a pas pu etre charge pour edition.");
      } finally {
        setLoadingCourseDraft(false);
      }
    };

    void loadCourseDraft();
  }, [apiBaseUrl, editingCourseId]);

  useEffect(() => {
    if (editingCourseId || !localDraftReady) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (!hasMeaningfulDraft) {
        localStorage.removeItem(COURSE_BUILDER_DRAFT_KEY);
        return;
      }

      const draft: CourseDraftSnapshot = {
        step,
        courseTitle,
        courseDescription,
        courseShortDescription,
        coursePrice,
        courseStatus,
        thumbnailPath,
        modules: modules.map((module) => ({
          ...module,
          lessons: module.lessons.map((lesson) => ({
            ...lesson,
            uploading: false,
          })),
        })),
        savedAt: new Date().toISOString(),
      };

      localStorage.setItem(COURSE_BUILDER_DRAFT_KEY, JSON.stringify(draft));
      setLocalDraftMessage("Brouillon sauvegarde automatiquement.");
    }, 600);

    return () => window.clearTimeout(timer);
  }, [
    courseDescription,
    coursePrice,
    courseShortDescription,
    courseStatus,
    courseTitle,
    editingCourseId,
    hasMeaningfulDraft,
    localDraftReady,
    modules,
    step,
    thumbnailPath,
  ]);

  const updateModule = (index: number, nextModule: ModuleDraft) => {
    setModules((current) =>
      current.map((currentModule, moduleIndex) =>
        moduleIndex === index ? nextModule : currentModule,
      ),
    );
  };

  const uploadFile = async (file: File, kind: "thumbnail" | "video") => {
    const token = localStorage.getItem("kalatty_token");
    if (!token) {
      throw new Error("Session introuvable. Reconnecte-toi.");
    }

    const formData = new FormData();
    formData.append("file", file);

    const endpoint = kind === "thumbnail" ? "upload-thumbnail" : "upload-video";

    const res = await fetch(`${apiBaseUrl}/courses/${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = (await res.json()) as { path?: string; message?: string };

    if (!res.ok || !data.path) {
      throw new Error(
        data.message ??
          "L'upload a echoue. Verifie Storage et la cle service role du backend.",
      );
    }

    return data.path;
  };

  const handleThumbnailUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setThumbnailUploading(true);
    setCourseMessage("");

    try {
      const path = await uploadFile(file, "thumbnail");
      setThumbnailPath(path);
      setCourseMessage("Miniature envoyee avec succes.");
    } catch (error) {
      setCourseMessage(
        error instanceof Error ? error.message : "Upload miniature impossible.",
      );
    } finally {
      setThumbnailUploading(false);
      event.target.value = "";
    }
  };

  const handleLessonVideoUpload = async (
    moduleIndex: number,
    lessonIndex: number,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setCourseMessage("");
    updateModule(moduleIndex, {
      ...modules[moduleIndex],
      lessons: modules[moduleIndex].lessons.map((lesson, index) =>
        index === lessonIndex ? { ...lesson, uploading: true } : lesson,
      ),
    });

    try {
      const path = await uploadFile(file, "video");
      const currentModule = modules[moduleIndex];

      updateModule(moduleIndex, {
        ...currentModule,
        lessons: currentModule.lessons.map((lesson, index) =>
          index === lessonIndex
            ? { ...lesson, video_path: path, uploading: false }
            : lesson,
        ),
      });
      setCourseMessage("Video envoyee avec succes.");
    } catch (error) {
      const currentModule = modules[moduleIndex];
      updateModule(moduleIndex, {
        ...currentModule,
        lessons: currentModule.lessons.map((lesson, index) =>
          index === lessonIndex ? { ...lesson, uploading: false } : lesson,
        ),
      });
      setCourseMessage(
        error instanceof Error ? error.message : "Upload video impossible.",
      );
    } finally {
      event.target.value = "";
    }
  };

  const handleCreateCourse = async (event: React.FormEvent) => {
    event.preventDefault();
    const token = localStorage.getItem("kalatty_token");

    if (!token) {
      setCourseMessage("Session introuvable. Reconnecte-toi.");
      return;
    }

    setCourseLoading(true);
    setCourseMessage("");

    try {
      const isEditing = Boolean(editingCourseId);
      const endpoint = isEditing
        ? `${apiBaseUrl}/courses/${editingCourseId}`
        : `${apiBaseUrl}/courses`;
      const res = await fetch(endpoint, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: courseTitle,
          description: courseDescription,
          short_description: courseShortDescription,
          price_fcfa: Number(coursePrice || 0),
          status: courseStatus,
          thumbnail_path: thumbnailPath,
          modules: modules.map((currentModule) => ({
            id: currentModule.id,
            title: currentModule.title,
            description: currentModule.description,
            lessons: currentModule.lessons
              .filter((lesson) => lesson.title.trim())
              .map((lesson) => ({
                id: lesson.id,
                title: lesson.title,
                content: lesson.content,
                video_path: lesson.video_path,
                duration_seconds: lesson.duration_seconds
                  ? Number(lesson.duration_seconds)
                  : null,
                is_preview: lesson.is_preview,
              })),
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCourseMessage(
          typeof data.message === "string"
            ? data.message
            : isEditing
              ? "Impossible de modifier le cours pour le moment."
              : "Impossible de creer le cours pour le moment.",
        );
        return;
      }

      await onCourseCreated();
      if (!isEditing) {
        localStorage.removeItem(COURSE_BUILDER_DRAFT_KEY);
        setLocalDraftMessage("");
      }
      resetBuilder();
      setCourseMessage(
        isEditing
          ? "Cours modifie avec succes."
          : courseStatus === "published"
            ? "Cours publie : il est maintenant visible par les etudiants."
            : courseStatus === "draft"
              ? "Brouillon enregistre. Il reste prive jusqu'a sa publication."
              : "Cours enregistre comme archive.",
      );
      onCancelEdit?.();
    } catch {
      setCourseMessage(
        editingCourseId
          ? "Le cours n'a pas pu etre modifie."
          : "Le cours n'a pas pu etre cree.",
      );
    } finally {
      setCourseLoading(false);
    }
  };

  const handleDeleteCourse = async () => {
    const token = localStorage.getItem("kalatty_token");
    if (!token || !editingCourseId) {
      setCourseMessage("Session ou cours introuvable.");
      return;
    }

    if (deleteConfirmationText.trim() !== courseTitle.trim()) {
      setCourseMessage("Saisis exactement le titre du cours pour confirmer.");
      return;
    }

    setCourseDeleting(true);
    setCourseMessage("");

    try {
      const res = await fetch(`${apiBaseUrl}/courses/${editingCourseId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { message?: string };

      if (!res.ok) {
        setCourseMessage(data.message ?? "Le cours n'a pas pu etre supprime.");
        return;
      }

      await onCourseCreated();
      resetBuilder();
      setCourseMessage("Cours supprime definitivement.");
      onCancelEdit?.();
    } catch {
      setCourseMessage("La suppression du cours a echoue.");
    } finally {
      setCourseDeleting(false);
    }
  };

  const steps = [
    { id: "landing", label: "Plan du cours", note: "Vue globale du projet" },
    {
      id: "basics",
      label: "Landing page",
      note: "Titre, description, prix et miniature",
    },
    {
      id: "curriculum",
      label: "Programme",
      note: "Modules, lecons et videos",
    },
    {
      id: "publish",
      label: "Publication",
      note: "Controle final avant creation",
    },
  ] as const;

  return (
    <section className={styles.card}>
      <div className={styles.courseStudioShell}>
        <aside className={styles.courseStudioSidebar}>
          <p className={styles.sectionLabel}>Kalatty instructor studio</p>
          <h2>
            {editingCourseId ? "Modification de cours" : "Creation de cours"}
          </h2>
          <p className={styles.paragraph}>
            Une experience plus proche d&apos;Udemy pour construire le cours,
            charger les videos et verifier l&apos;etat avant publication.
          </p>
          {editingCourseId ? (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => {
                resetBuilder();
                setCourseMessage("");
                onCancelEdit?.();
              }}
            >
              Quitter l&apos;edition
            </button>
          ) : null}

          {!editingCourseId && localDraftMessage ? (
            <div className={styles.draftRecoveryCard}>
              <strong>Brouillon intelligent</strong>
              <small>{localDraftMessage}</small>
              <button type="button" onClick={clearLocalDraft}>
                Effacer et repartir a zero
              </button>
            </div>
          ) : null}

          <div className={styles.courseStudioSnapshot}>
            <span>Progression du setup</span>
            <strong>
              {completedChecklist}/{checklist.length}
            </strong>
            <small>
              {uploadedVideos} video{uploadedVideos > 1 ? "s" : ""} deja envoyee
              {uploadedVideos > 1 ? "s" : ""}
            </small>
          </div>

          <div className={styles.courseStudioNav}>
            {steps.map((item) => (
              <button
                key={item.id}
                type="button"
                className={
                  step === item.id
                    ? styles.courseStudioNavActive
                    : styles.courseStudioNavItem
                }
                onClick={() => setStep(item.id)}
              >
                <span>{item.label}</span>
                <small>{item.note}</small>
              </button>
            ))}
          </div>

          <div className={styles.courseStudioSummary}>
            <span>{modules.length} modules</span>
            <span>{totalLessons} lecons</span>
            <span>
              {thumbnailPath ? "Miniature prete" : "Miniature manquante"}
            </span>
          </div>
        </aside>

        <form onSubmit={handleCreateCourse} className={styles.courseStudioMain}>
          <input
            ref={thumbnailInputRef}
            type="file"
            accept="image/*"
            onChange={handleThumbnailUpload}
            className={styles.visuallyHiddenInput}
          />

          {loadingCourseDraft ? (
            <section className={styles.courseStudioPanel}>
              <p className={styles.paragraph}>
                Chargement du cours en cours...
              </p>
            </section>
          ) : null}

          {!loadingCourseDraft ? (
            <>
              {step === "landing" ? (
                <section className={styles.courseStudioPanel}>
                  <div className={styles.courseStudioTopbar}>
                    <div>
                      <p className={styles.sectionLabel}>Plan du cours</p>
                      <h3>Configure ton espace enseignant</h3>
                    </div>
                    <span className={styles.courseStudioChip}>
                      {editingCourseId ? "Edition" : "Brouillon"}
                    </span>
                  </div>

                  <p className={styles.paragraph}>
                    Commence par la page de presentation, puis structure le
                    programme et envoie les videos directement depuis la
                    plateforme.
                  </p>

                  <div className={styles.courseStudioHero}>
                    <div>
                      <strong>{courseTitle || "Ton prochain cours"}</strong>
                      <p>
                        {courseShortDescription ||
                          "Ajoute un sous-titre clair pour donner envie de rejoindre le cours."}
                      </p>
                    </div>
                    <div className={styles.courseStudioBadgeStack}>
                      <span>{Number(coursePrice || 0)} FCFA</span>
                      <span>
                        {courseStatus === "published"
                          ? "Publie"
                          : courseStatus === "draft"
                            ? "Brouillon"
                            : "Archive"}
                      </span>
                      <button
                        type="button"
                        className={styles.thumbnailQuickAction}
                        onClick={() => thumbnailInputRef.current?.click()}
                        disabled={thumbnailUploading}
                      >
                        {thumbnailPath
                          ? "Miniature envoyee"
                          : "Miniature a envoyer"}
                      </button>
                    </div>
                  </div>

                  <div className={styles.courseStudioMetrics}>
                    <article className={styles.courseStudioMetric}>
                      <span>Landing page</span>
                      <strong>
                        {courseShortDescription ? "Presque prete" : "A remplir"}
                      </strong>
                      <small>
                        Le titre, la promesse et la miniature vendent le cours.
                      </small>
                    </article>
                    <article className={styles.courseStudioMetric}>
                      <span>Programme</span>
                      <strong>
                        {modules.length} module{modules.length > 1 ? "s" : ""}
                      </strong>
                      <small>
                        Structure le contenu avec une progression logique.
                      </small>
                    </article>
                    <article className={styles.courseStudioMetric}>
                      <span>Contenu video</span>
                      <strong>
                        {uploadedVideos} video{uploadedVideos > 1 ? "s" : ""}
                      </strong>
                      <small>
                        Plus besoin de lien externe, tout passe par Kalatty.
                      </small>
                    </article>
                  </div>

                  <button
                    type="button"
                    className={styles.submitButton}
                    onClick={() => setStep("basics")}
                  >
                    Commencer l&apos;edition
                  </button>
                </section>
              ) : null}

              {step === "basics" ? (
                <section className={styles.courseStudioPanel}>
                  <div className={styles.courseStudioTopbar}>
                    <div>
                      <p className={styles.sectionLabel}>Course landing page</p>
                      <h3>Presenter le cours comme sur une marketplace</h3>
                    </div>
                    <span className={styles.courseStudioChip}>Etape 1</span>
                  </div>

                  <div className={styles.courseStudioHintBlock}>
                    <strong>Ce qu&apos;il faut montrer ici</strong>
                    <p>
                      Un bon titre, un sous-titre oriente resultat, une
                      description utile et une miniature propre. Cette page doit
                      donner envie de commencer le cours.
                    </p>
                  </div>

                  <label className={styles.formField}>
                    <span>Titre du cours</span>
                    <input
                      type="text"
                      value={courseTitle}
                      onChange={(event) => setCourseTitle(event.target.value)}
                      required
                    />
                  </label>

                  <label className={styles.formField}>
                    <span>Sous-titre</span>
                    <input
                      type="text"
                      value={courseShortDescription}
                      onChange={(event) =>
                        setCourseShortDescription(event.target.value)
                      }
                      placeholder="Ce que l'apprenant va concretement obtenir"
                    />
                  </label>

                  <label className={styles.formField}>
                    <span>Description complete</span>
                    <textarea
                      className={styles.formTextarea}
                      rows={6}
                      value={courseDescription}
                      onChange={(event) =>
                        setCourseDescription(event.target.value)
                      }
                      placeholder="Explique le contenu, le public cible et les resultats attendus"
                    />
                  </label>

                  <div className={styles.metaFields}>
                    <label className={styles.formField}>
                      <span>Prix (FCFA)</span>
                      <input
                        type="number"
                        min="0"
                        value={coursePrice}
                        onChange={(event) => setCoursePrice(event.target.value)}
                      />
                    </label>

                    <label className={styles.formField}>
                      <span>Statut du cours</span>
                      <select
                        value={courseStatus}
                        onChange={(event) =>
                          setCourseStatus(
                            event.target.value === "draft" ||
                              event.target.value === "archived"
                              ? event.target.value
                              : "published",
                          )
                        }
                      >
                        <option value="published">Publie</option>
                        <option value="draft">Brouillon</option>
                        <option value="archived">Archive</option>
                      </select>
                      <small>
                        {courseStatus === "published"
                          ? "Visible dans le catalogue etudiant apres enregistrement."
                          : courseStatus === "draft"
                            ? "Le brouillon reste prive et ne sera pas visible par les etudiants."
                            : "Un cours archive est retire du catalogue etudiant."}
                      </small>
                    </label>

                    <label className={styles.formField}>
                      <span>Miniature du cours</span>
                      <button
                        type="button"
                        className={styles.thumbnailDropzone}
                        onClick={() => thumbnailInputRef.current?.click()}
                        disabled={thumbnailUploading}
                      >
                        <strong>
                          {thumbnailPath
                            ? "Changer la miniature"
                            : "Cliquer pour ajouter une miniature"}
                        </strong>
                        <small>
                          {thumbnailUploading
                            ? "Envoi de l'image en cours..."
                            : thumbnailPath ||
                              "Facultatif : le logo Kalatty sera utilise par defaut."}
                        </small>
                      </button>
                    </label>
                  </div>

                  {thumbnailPath ? (
                    <div className={styles.inlineAssetStatus}>
                      Miniature enregistree: {thumbnailPath}
                    </div>
                  ) : null}

                  <div className={styles.courseStudioActions}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => setStep("landing")}
                    >
                      Retour
                    </button>
                    <button
                      type="button"
                      className={styles.submitButton}
                      disabled={thumbnailUploading}
                      onClick={() => setStep("curriculum")}
                    >
                      {thumbnailUploading ? "Upload..." : "Passer au programme"}
                    </button>
                  </div>
                </section>
              ) : null}

              {step === "curriculum" ? (
                <section className={styles.courseStudioPanel}>
                  <div className={styles.courseStudioTopbar}>
                    <div>
                      <p className={styles.sectionLabel}>Programme du cours</p>
                      <h3>Modules, lecons et uploads video</h3>
                    </div>
                    <span className={styles.courseStudioChip}>Etape 2</span>
                  </div>

                  <div className={styles.courseStudioHintBlock}>
                    <strong>Approche recommandee</strong>
                    <p>
                      Cree un module par grande competence, puis une lecon video
                      par sujet. Le formateur charge sa video ici directement
                      sans coller de lien externe.
                    </p>
                  </div>

                  <div className={styles.sectionHeader}>
                    <div>
                      <p className={styles.sectionLabel}>Curriculum</p>
                      <h3>Structure du contenu</h3>
                    </div>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() =>
                        setModules((current) => [...current, createModule()])
                      }
                    >
                      Ajouter un module
                    </button>
                  </div>

                  <div className={styles.moduleList}>
                    {modules.map((currentModule, moduleIndex) => (
                      <section
                        key={`module-${moduleIndex}`}
                        className={styles.moduleCard}
                      >
                        <div className={styles.moduleHeader}>
                          <div>
                            <p className={styles.sectionLabel}>
                              Module {moduleIndex + 1}
                            </p>
                            <h3>{currentModule.title || "Nouveau module"}</h3>
                          </div>
                          {modules.length > 1 ? (
                            <button
                              type="button"
                              className={styles.secondaryButton}
                              onClick={() =>
                                setModules((current) =>
                                  current.filter(
                                    (_, index) => index !== moduleIndex,
                                  ),
                                )
                              }
                            >
                              Supprimer
                            </button>
                          ) : null}
                        </div>

                        <label className={styles.formField}>
                          <span>Titre du module</span>
                          <input
                            type="text"
                            value={currentModule.title}
                            onChange={(event) =>
                              updateModule(moduleIndex, {
                                ...currentModule,
                                title: event.target.value,
                              })
                            }
                          />
                        </label>

                        <label className={styles.formField}>
                          <span>Description du module</span>
                          <textarea
                            className={styles.formTextarea}
                            rows={3}
                            value={currentModule.description}
                            onChange={(event) =>
                              updateModule(moduleIndex, {
                                ...currentModule,
                                description: event.target.value,
                              })
                            }
                          />
                        </label>

                        <div className={styles.subsection}>
                          <div className={styles.subsectionHeader}>
                            <h4>Lecons</h4>
                            <button
                              type="button"
                              className={styles.secondaryButton}
                              onClick={() =>
                                updateModule(moduleIndex, {
                                  ...currentModule,
                                  lessons: [
                                    ...currentModule.lessons,
                                    createLesson(),
                                  ],
                                })
                              }
                            >
                              Ajouter une video
                            </button>
                          </div>

                          {currentModule.lessons.map((lesson, lessonIndex) => (
                            <div
                              key={`lesson-${lessonIndex}`}
                              className={styles.nestedCard}
                            >
                              <div className={styles.nestedHeader}>
                                <div>
                                  <strong>Lecon {lessonIndex + 1}</strong>
                                  <small>
                                    {lesson.video_path
                                      ? "Video chargee"
                                      : "Video manquante"}
                                  </small>
                                </div>
                                <button
                                  type="button"
                                  className={styles.secondaryButton}
                                  disabled={currentModule.lessons.length <= 1}
                                  onClick={() =>
                                    updateModule(moduleIndex, {
                                      ...currentModule,
                                      lessons: currentModule.lessons.filter(
                                        (_, index) => index !== lessonIndex,
                                      ),
                                    })
                                  }
                                >
                                  Supprimer la lecon
                                </button>
                              </div>

                              <label className={styles.formField}>
                                <span>Titre</span>
                                <input
                                  type="text"
                                  value={lesson.title}
                                  onChange={(event) =>
                                    updateModule(moduleIndex, {
                                      ...currentModule,
                                      lessons: currentModule.lessons.map(
                                        (item, index) =>
                                          index === lessonIndex
                                            ? {
                                                ...item,
                                                title: event.target.value,
                                              }
                                            : item,
                                      ),
                                    })
                                  }
                                />
                              </label>

                              <div className={styles.metaFields}>
                                <label className={styles.formField}>
                                  <span>Duree (secondes)</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={lesson.duration_seconds}
                                    onChange={(event) =>
                                      updateModule(moduleIndex, {
                                        ...currentModule,
                                        lessons: currentModule.lessons.map(
                                          (item, index) =>
                                            index === lessonIndex
                                              ? {
                                                  ...item,
                                                  duration_seconds:
                                                    event.target.value,
                                                }
                                              : item,
                                        ),
                                      })
                                    }
                                  />
                                </label>

                                <label className={styles.formField}>
                                  <span>Video de la lecon</span>
                                  <input
                                    type="file"
                                    accept="video/*"
                                    onChange={(event) =>
                                      void handleLessonVideoUpload(
                                        moduleIndex,
                                        lessonIndex,
                                        event,
                                      )
                                    }
                                  />
                                </label>
                              </div>

                              <label className={styles.formField}>
                                <span>Contenu / notes</span>
                                <textarea
                                  className={styles.formTextarea}
                                  rows={4}
                                  value={lesson.content}
                                  onChange={(event) =>
                                    updateModule(moduleIndex, {
                                      ...currentModule,
                                      lessons: currentModule.lessons.map(
                                        (item, index) =>
                                          index === lessonIndex
                                            ? {
                                                ...item,
                                                content: event.target.value,
                                              }
                                            : item,
                                      ),
                                    })
                                  }
                                />
                              </label>

                              <label className={styles.checkboxRow}>
                                <input
                                  type="checkbox"
                                  checked={lesson.is_preview}
                                  onChange={(event) =>
                                    updateModule(moduleIndex, {
                                      ...currentModule,
                                      lessons: currentModule.lessons.map(
                                        (item, index) =>
                                          index === lessonIndex
                                            ? {
                                                ...item,
                                                is_preview:
                                                  event.target.checked,
                                              }
                                            : item,
                                      ),
                                    })
                                  }
                                />
                                <span>
                                  Rendre cette lecon visible en apercu
                                </span>
                              </label>

                              {lesson.video_path ? (
                                <div className={styles.inlineAssetStatus}>
                                  Video enregistree: {lesson.video_path}
                                </div>
                              ) : null}

                              {lesson.uploading ? (
                                <div className={styles.inlineAssetStatus}>
                                  Upload de la video en cours...
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>

                  <div className={styles.courseStudioActions}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => setStep("basics")}
                    >
                      Retour
                    </button>
                    <button
                      type="button"
                      className={styles.submitButton}
                      onClick={() => setStep("publish")}
                    >
                      Passer a la publication
                    </button>
                  </div>
                </section>
              ) : null}

              {step === "publish" ? (
                <section className={styles.courseStudioPanel}>
                  <div className={styles.courseStudioTopbar}>
                    <div>
                      <p className={styles.sectionLabel}>Publication</p>
                      <h3>Verifier avant mise en ligne</h3>
                    </div>
                    <span className={styles.courseStudioChip}>Etape 3</span>
                  </div>

                  <div className={styles.publishChecklist}>
                    <article className={styles.publishCard}>
                      <span>Titre</span>
                      <strong>{courseTitle || "A completer"}</strong>
                    </article>
                    <article className={styles.publishCard}>
                      <span>Miniature</span>
                      <strong>{thumbnailPath ? "OK" : "Manquante"}</strong>
                    </article>
                    <article className={styles.publishCard}>
                      <span>Modules</span>
                      <strong>{modules.length}</strong>
                    </article>
                    <article className={styles.publishCard}>
                      <span>Lecons</span>
                      <strong>{totalLessons}</strong>
                    </article>
                    <article className={styles.publishCard}>
                      <span>Videos envoyees</span>
                      <strong>{uploadedVideos}</strong>
                    </article>
                    <article className={styles.publishCard}>
                      <span>Etat</span>
                      <strong>
                        {completedChecklist === checklist.length
                          ? "Pret a creer"
                          : "Encore incomplet"}
                      </strong>
                    </article>
                  </div>

                  <div className={styles.courseStudioChecklist}>
                    {checklist.map((item) => (
                      <div
                        key={item.label}
                        className={styles.courseStudioChecklistItem}
                      >
                        <strong>{item.done ? "OK" : "A faire"}</strong>
                        <div>
                          <span>{item.label}</span>
                          <small>{item.hint}</small>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className={styles.courseStudioActions}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => setStep("curriculum")}
                    >
                      Retour
                    </button>
                    <button
                      type="submit"
                      className={styles.submitButton}
                      disabled={courseLoading}
                    >
                      {courseLoading
                        ? editingCourseId
                          ? "Mise a jour..."
                          : "Publication..."
                        : editingCourseId
                          ? "Enregistrer les modifications"
                          : courseStatus === "published"
                            ? "Publier le cours"
                            : courseStatus === "draft"
                              ? "Enregistrer le brouillon"
                              : "Archiver le cours"}
                    </button>
                  </div>
                </section>
              ) : null}
            </>
          ) : null}

          {courseMessage ? (
            <p className={styles.inlineMessage}>{courseMessage}</p>
          ) : null}

          {editingCourseId ? (
            <section className={styles.courseDangerZone}>
              <div>
                <span>Zone dangereuse</span>
                <strong>Supprimer entierement ce cours</strong>
                <p>
                  Le cours, ses lecons et ses inscriptions seront supprimes. Les
                  devoirs deja remis resteront conserves sans lien au cours.
                </p>
              </div>

              {!deleteConfirmationOpen ? (
                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={() => setDeleteConfirmationOpen(true)}
                >
                  Demander la suppression
                </button>
              ) : (
                <div className={styles.courseDeleteConfirmation}>
                  <label className={styles.formField}>
                    <span>
                      Saisis <strong>{courseTitle}</strong> pour confirmer
                    </span>
                    <input
                      type="text"
                      value={deleteConfirmationText}
                      onChange={(event) =>
                        setDeleteConfirmationText(event.target.value)
                      }
                      autoComplete="off"
                    />
                  </label>
                  <div className={styles.courseStudioActions}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => {
                        setDeleteConfirmationOpen(false);
                        setDeleteConfirmationText("");
                      }}
                      disabled={courseDeleting}
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      className={styles.dangerButton}
                      onClick={() => void handleDeleteCourse()}
                      disabled={
                        courseDeleting ||
                        deleteConfirmationText.trim() !== courseTitle.trim()
                      }
                    >
                      {courseDeleting
                        ? "Suppression..."
                        : "Supprimer definitivement"}
                    </button>
                  </div>
                </div>
              )}
            </section>
          ) : null}
        </form>
      </div>
    </section>
  );
}
