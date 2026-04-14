"use client";

import { useMemo, useState } from "react";
import styles from "./dashboard.module.css";

type DashboardResponse = {
  stats: Record<string, number>;
  courses: Array<Record<string, unknown>>;
};

type LessonDraft = {
  title: string;
  video_path: string;
  content: string;
  duration_seconds: string;
  is_preview: boolean;
  uploading: boolean;
};

type ModuleDraft = {
  title: string;
  description: string;
  lessons: LessonDraft[];
};

type BuilderStep = "landing" | "basics" | "curriculum" | "publish";

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
  onCourseCreated: (updater: (current: DashboardResponse | null) => DashboardResponse | null) => void;
};

export default function TeacherCourseBuilder({
  apiBaseUrl,
  onCourseCreated,
}: Props) {
  const [step, setStep] = useState<BuilderStep>("landing");
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseShortDescription, setCourseShortDescription] = useState("");
  const [coursePrice, setCoursePrice] = useState("");
  const [thumbnailPath, setThumbnailPath] = useState("");
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [modules, setModules] = useState<ModuleDraft[]>([createModule()]);
  const [courseMessage, setCourseMessage] = useState("");
  const [courseLoading, setCourseLoading] = useState(false);

  const totalLessons = useMemo(
    () =>
      modules.reduce(
        (sum, currentModule) =>
          sum + currentModule.lessons.filter((lesson) => lesson.title.trim()).length,
        0,
      ),
    [modules],
  );

  const uploadedVideos = useMemo(
    () =>
      modules.reduce(
        (sum, currentModule) =>
          sum +
          currentModule.lessons.filter((lesson) => lesson.video_path.trim()).length,
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
      const res = await fetch(`${apiBaseUrl}/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: courseTitle,
          description: courseDescription,
          short_description: courseShortDescription,
          price_fcfa: Number(coursePrice || 0),
          thumbnail_path: thumbnailPath,
          modules: modules.map((currentModule) => ({
            title: currentModule.title,
            description: currentModule.description,
            lessons: currentModule.lessons
              .filter((lesson) => lesson.title.trim())
              .map((lesson) => ({
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
            : "Impossible de creer le cours pour le moment.",
        );
        return;
      }

      onCourseCreated((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          stats: {
            ...current.stats,
            publishedCourses: (current.stats.publishedCourses ?? 0) + 1,
          },
          courses: [data, ...current.courses],
        };
      });

      setCourseTitle("");
      setCourseDescription("");
      setCourseShortDescription("");
      setCoursePrice("");
      setThumbnailPath("");
      setModules([createModule()]);
      setStep("landing");
      setCourseMessage("Cours cree avec succes.");
    } catch {
      setCourseMessage("Le cours n'a pas pu etre cree.");
    } finally {
      setCourseLoading(false);
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
          <h2>Creation de cours</h2>
          <p className={styles.paragraph}>
            Une experience plus proche d&apos;Udemy pour construire le cours,
            charger les videos et verifier l&apos;etat avant publication.
          </p>

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
            <span>{thumbnailPath ? "Miniature prete" : "Miniature manquante"}</span>
          </div>
        </aside>

        <form onSubmit={handleCreateCourse} className={styles.courseStudioMain}>
          {step === "landing" ? (
            <section className={styles.courseStudioPanel}>
              <div className={styles.courseStudioTopbar}>
                <div>
                  <p className={styles.sectionLabel}>Plan du cours</p>
                  <h3>Configure ton espace enseignant</h3>
                </div>
                <span className={styles.courseStudioChip}>Brouillon</span>
              </div>

              <p className={styles.paragraph}>
                Commence par la page de presentation, puis structure le programme
                et envoie les videos directement depuis la plateforme.
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
                  <span>{thumbnailPath ? "Miniature envoyee" : "Miniature a envoyer"}</span>
                </div>
              </div>

              <div className={styles.courseStudioMetrics}>
                <article className={styles.courseStudioMetric}>
                  <span>Landing page</span>
                  <strong>{courseShortDescription ? "Presque prete" : "A remplir"}</strong>
                  <small>Le titre, la promesse et la miniature vendent le cours.</small>
                </article>
                <article className={styles.courseStudioMetric}>
                  <span>Programme</span>
                  <strong>{modules.length} module{modules.length > 1 ? "s" : ""}</strong>
                  <small>Structure le contenu avec une progression logique.</small>
                </article>
                <article className={styles.courseStudioMetric}>
                  <span>Contenu video</span>
                  <strong>{uploadedVideos} video{uploadedVideos > 1 ? "s" : ""}</strong>
                  <small>Plus besoin de lien externe, tout passe par Kalatty.</small>
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
                  Un bon titre, un sous-titre orienté resultat, une description
                  utile et une miniature propre. Cette page doit donner envie de
                  commencer le cours.
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
                  onChange={(event) => setCourseShortDescription(event.target.value)}
                  placeholder="Ce que l'apprenant va concretement obtenir"
                />
              </label>

              <label className={styles.formField}>
                <span>Description complete</span>
                <textarea
                  className={styles.formTextarea}
                  rows={6}
                  value={courseDescription}
                  onChange={(event) => setCourseDescription(event.target.value)}
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
                  <span>Miniature du cours</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailUpload}
                  />
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
                  Cree un module par grande competence, puis une lecon video par
                  sujet. Le formateur charge sa video ici directement sans coller
                  de lien externe.
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
                  onClick={() => setModules((current) => [...current, createModule()])}
                >
                  Ajouter un module
                </button>
              </div>

              <div className={styles.moduleList}>
                {modules.map((currentModule, moduleIndex) => (
                  <section key={`module-${moduleIndex}`} className={styles.moduleCard}>
                    <div className={styles.moduleHeader}>
                      <div>
                        <p className={styles.sectionLabel}>Module {moduleIndex + 1}</p>
                        <h3>{currentModule.title || "Nouveau module"}</h3>
                      </div>
                      {modules.length > 1 ? (
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() =>
                            setModules((current) =>
                              current.filter((_, index) => index !== moduleIndex),
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
                              lessons: [...currentModule.lessons, createLesson()],
                            })
                          }
                        >
                          Ajouter une video
                        </button>
                      </div>

                      {currentModule.lessons.map((lesson, lessonIndex) => (
                        <div key={`lesson-${lessonIndex}`} className={styles.nestedCard}>
                          <div className={styles.nestedHeader}>
                            <strong>Lecon {lessonIndex + 1}</strong>
                            <small>
                              {lesson.video_path ? "Video chargee" : "Video manquante"}
                            </small>
                          </div>

                          <label className={styles.formField}>
                            <span>Titre</span>
                            <input
                              type="text"
                              value={lesson.title}
                              onChange={(event) =>
                                updateModule(moduleIndex, {
                                  ...currentModule,
                                  lessons: currentModule.lessons.map((item, index) =>
                                    index === lessonIndex
                                      ? { ...item, title: event.target.value }
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
                                    lessons: currentModule.lessons.map((item, index) =>
                                      index === lessonIndex
                                        ? {
                                            ...item,
                                            duration_seconds: event.target.value,
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
                                  lessons: currentModule.lessons.map((item, index) =>
                                    index === lessonIndex
                                      ? { ...item, content: event.target.value }
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
                                  lessons: currentModule.lessons.map((item, index) =>
                                    index === lessonIndex
                                      ? {
                                          ...item,
                                          is_preview: event.target.checked,
                                        }
                                      : item,
                                  ),
                                })
                              }
                            />
                            <span>Rendre cette lecon visible en apercu</span>
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
                  <div key={item.label} className={styles.courseStudioChecklistItem}>
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
                  {courseLoading ? "Publication..." : "Creer le cours"}
                </button>
              </div>
            </section>
          ) : null}

          {courseMessage ? <p className={styles.inlineMessage}>{courseMessage}</p> : null}
        </form>
      </div>
    </section>
  );
}
