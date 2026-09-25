"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon, Progress } from "../establishment/ui";
import styles from "./learning.module.css";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
type Lesson = {
  id: string;
  title: string;
  content: string;
  videoPath: string;
  durationSeconds: number;
  progressStatus: string;
  lastPositionSeconds: number;
  progressPct: number;
};
type Course = {
  id: string;
  title: string;
  description: string;
  shortDescription?: string;
  objectives?: string;
  prerequisites?: string;
  level?: string;
  priceFcfa: number;
  teacherId?: string;
  teacherName?: string;
  teacherExpertise?: string;
  progressPercentage: number;
  enrolled: boolean;
  ownerPreview?: boolean;
  institutionAccess?: boolean;
  modules: Array<{
    id: string;
    title: string;
    description: string;
    lessons: Lesson[];
    exercises: Array<{ id: string; title: string; instructions: string }>;
  }>;
};
type LearnerQuestion = {
  id: string;
  body: string;
  status: string;
  answer?: string;
  createdAt?: string;
};

export default function CoursePlayerPage({
  courseId,
  initialLessonId,
}: {
  courseId: string;
  initialLessonId?: string;
}) {
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessMessage, setAccessMessage] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [paymentsEnabled, setPaymentsEnabled] = useState<boolean | null>(null);
  const [note, setNote] = useState("");
  const [question, setQuestion] = useState("");
  const [questions, setQuestions] = useState<LearnerQuestion[]>([]);
  const [favorite, setFavorite] = useState(false);
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null);
  const [workspaceSaving, setWorkspaceSaving] = useState(false);
  const [videoStatus, setVideoStatus] = useState<"idle" | "loading" | "ready" | "buffering" | "error">("idle");
  const [videoError, setVideoError] = useState<string | null>(null);
  const [connectionHint] = useState(() => {
    if (typeof navigator === "undefined") return null;
    const connection = (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } }).connection;
    return connection?.saveData || connection?.effectiveType === "2g" || connection?.effectiveType === "slow-2g"
      ? "Connexion limitée détectée : démarrez la vidéo puis laissez quelques secondes de mise en mémoire tampon."
      : null;
  });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSavedSecond = useRef(0);

  const load = useCallback(async () => {
    const token = localStorage.getItem("kalatty_token");
    if (!token)
      return router.replace(`/login?redirect=/learn/courses/${courseId}`);
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.message ?? "Formation introuvable.");
      setCourse(body as Course);
      if (
        Number(body.priceFcfa ?? 0) > 0 &&
        !body.enrolled &&
        !body.institutionAccess &&
        !body.ownerPreview
      ) {
        const plansResponse = await fetch(`${API_BASE}/payments/plans`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const plans = plansResponse.ok ? await plansResponse.json() : null;
        setPaymentsEnabled(Boolean(plans?.coursePayments?.enabled));
      } else {
        setPaymentsEnabled(true);
      }
      const lessons = (body.modules ?? []).flatMap(
        (module: { lessons?: Lesson[] }) => module.lessons ?? [],
      );
      const firstIncomplete =
        lessons.find((lesson: Lesson) => lesson.id === initialLessonId) ??
        lessons.find(
          (lesson: Lesson) => lesson.progressStatus !== "completed",
        ) ??
        lessons[0];
      setActiveLessonId(firstIncomplete?.id ?? null);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Connexion impossible.",
      );
    } finally {
      setLoading(false);
    }
  }, [courseId, initialLessonId, router]);

  useEffect(() => {
    load();
  }, [load]);
  const lessons = useMemo(
    () =>
      course?.modules.flatMap((module) =>
        module.lessons.map((lesson) => ({
          ...lesson,
          moduleTitle: module.title,
        })),
      ) ?? [],
    [course],
  );
  const activeLesson =
    lessons.find((lesson) => lesson.id === activeLessonId) ?? lessons[0];

  useEffect(() => {
    if (
      !activeLesson ||
      (!course?.enrolled && !course?.institutionAccess) ||
      course.ownerPreview
    )
      return;
    const token = localStorage.getItem("kalatty_token");
    if (!token) return;
    setWorkspaceMessage(null);
    fetch(
      `${API_BASE}/courses/${courseId}/lessons/${activeLesson.id}/engagement`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.message ?? "Espace de travail indisponible.");
        setNote(body.note ?? "");
        setQuestions(body.questions ?? []);
        setFavorite(Boolean(body.favorite));
      })
      .catch((reason) =>
        setWorkspaceMessage(
          reason instanceof Error
            ? reason.message
            : "Espace de travail indisponible.",
        ),
      );
  }, [
    activeLesson,
    course?.enrolled,
    course?.institutionAccess,
    course?.ownerPreview,
    courseId,
  ]);

  const updateProgress = async (
    status: "started" | "completed",
    currentTime?: number,
    duration?: number,
  ) => {
    if (!activeLesson) return;
    const token = localStorage.getItem("kalatty_token");
    if (!token) return;
    const positionSeconds = Math.max(
      0,
      Math.round(currentTime ?? videoRef.current?.currentTime ?? 0),
    );
    const total =
      duration ?? videoRef.current?.duration ?? activeLesson.durationSeconds;
    const progressPct =
      status === "completed"
        ? 100
        : total > 0
          ? Math.min(99, Math.round((positionSeconds / total) * 100))
          : 0;
    const response = await fetch(
      `${API_BASE}/courses/${courseId}/lessons/${activeLesson.id}/progress`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status, positionSeconds, progressPct }),
      },
    );
    if (response.ok && status === "completed") await load();
  };

  const saveNote = async () => {
    if (!activeLesson) return;
    const token = localStorage.getItem("kalatty_token");
    if (!token) return;
    setWorkspaceSaving(true);
    setWorkspaceMessage(null);
    try {
      const response = await fetch(
        `${API_BASE}/courses/${courseId}/lessons/${activeLesson.id}/note`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content: note }),
        },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.message ?? "Enregistrement impossible.");
      setWorkspaceMessage("Note personnelle enregistrée.");
    } catch (reason) {
      setWorkspaceMessage(
        reason instanceof Error ? reason.message : "Enregistrement impossible.",
      );
    } finally {
      setWorkspaceSaving(false);
    }
  };

  const sendQuestion = async () => {
    if (!activeLesson || question.trim().length < 3)
      return setWorkspaceMessage("Écrivez une question plus précise.");
    const token = localStorage.getItem("kalatty_token");
    if (!token) return;
    setWorkspaceSaving(true);
    setWorkspaceMessage(null);
    try {
      const response = await fetch(
        `${API_BASE}/courses/${courseId}/lessons/${activeLesson.id}/questions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ body: question.trim() }),
        },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? "Envoi impossible.");
      setQuestions((current) => [body, ...current]);
      setQuestion("");
      setWorkspaceMessage("Question envoyée au formateur.");
    } catch (reason) {
      setWorkspaceMessage(
        reason instanceof Error ? reason.message : "Envoi impossible.",
      );
    } finally {
      setWorkspaceSaving(false);
    }
  };

  const toggleFavorite = async () => {
    const token = localStorage.getItem("kalatty_token");
    if (!token) return;
    const response = await fetch(`${API_BASE}/courses/${courseId}/favorite`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await response.json();
    if (response.ok) setFavorite(Boolean(body.favorite));
    else
      setWorkspaceMessage(body.message ?? "Impossible de modifier le favori.");
  };

  const activateAccess = async () => {
    if (!course) return;
    const token = localStorage.getItem("kalatty_token");
    if (!token)
      return router.replace(`/login?redirect=/learn/courses/${courseId}`);
    setBuying(true);
    setAccessMessage(null);
    try {
      if (course.priceFcfa <= 0) {
        const response = await fetch(`${API_BASE}/courses/${courseId}/enroll`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ courseId }),
        });
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.message ?? "Inscription impossible.");
        setAccessMessage(
          "Inscription confirmée. Vous pouvez maintenant commencer le cours.",
        );
        await load();
        return;
      } else {
        if (paymentsEnabled !== true) {
          setAccessMessage(
            "Le paiement n’est pas encore disponible. Aucune demande et aucun débit n’ont été créés.",
          );
          return;
        }
        const checkoutResponse = await fetch(
          `${API_BASE}/payments/course-checkout`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ courseId }),
          },
        );
        const checkout = await checkoutResponse.json();
        if (!checkoutResponse.ok)
          throw new Error(checkout.message ?? "Paiement impossible.");
        if (!checkout.alreadyEnrolled) {
          if (checkout.paymentUrl) {
            window.location.assign(checkout.paymentUrl);
            return;
          }
          setAccessMessage(
            checkout.instructions ??
              "Votre demande de paiement est enregistrée. L’accès sera activé après confirmation du paiement.",
          );
          return;
        }
        setAccessMessage(
          "Paiement confirmé. Votre inscription au cours est maintenant active.",
        );
        await load();
        return;
      }
    } catch (reason) {
      setAccessMessage(
        reason instanceof Error ? reason.message : "Activation impossible.",
      );
    } finally {
      setBuying(false);
    }
  };

  if (loading)
    return (
      <section className={styles.loadingState}>
        <span />
        <h1>Chargement de la formation</h1>
      </section>
    );
  if (error)
    return (
      <section className={styles.loadingState}>
        <Icon name="alert" />
        <h1>Lecture impossible</h1>
        <p>{error}</p>
        <button onClick={load}>Réessayer</button>
      </section>
    );
  if (!course) return null;

  if (!course.enrolled && !course.institutionAccess && !course.ownerPreview)
    return (
      <>
        <div className={styles.playerHeader}>
          <Link href="/learn/explore">← Retour au catalogue</Link>
        </div>
        <section className={styles.courseAccessHero}>
          <div>
            <span className={styles.eyebrow}>Formation en ligne</span>
            <h1>{course.title}</h1>
            <p>{course.shortDescription || course.description}</p>
            <small>
              Par{" "}
              {course.teacherId ? (
                <Link href={`/learn/trainers/${course.teacherId}`}>
                  {course.teacherName ?? "Formateur Kalatty"}
                </Link>
              ) : (
                (course.teacherName ?? "Formateur Kalatty")
              )}{" "}
              · {lessons.length} leçon(s)
              {course.level ? ` · ${course.level}` : ""}
            </small>
          </div>
          <aside>
            <strong>
              {course.priceFcfa > 0
                ? `${new Intl.NumberFormat("fr-FR").format(course.priceFcfa)} FCFA`
                : "Gratuit"}
            </strong>
            <button
              disabled={
                buying || (course.priceFcfa > 0 && paymentsEnabled !== true)
              }
              className={styles.primaryButton}
              onClick={activateAccess}
            >
              {buying
                ? "Traitement…"
                : course.priceFcfa <= 0
                  ? "S’inscrire gratuitement"
                  : paymentsEnabled === null
                    ? "Vérification du paiement…"
                    : paymentsEnabled
                      ? "Acheter la formation"
                      : "Paiement bientôt disponible"}
            </button>
            {accessMessage ? <p role="status">{accessMessage}</p> : null}
            <small>
              {course.priceFcfa <= 0
                ? "L’inscription gratuite est activée immédiatement."
                : paymentsEnabled
                  ? "L’accès sera activé après confirmation sécurisée du paiement."
                  : "Aucun paiement ne peut être créé tant que le prestataire sécurisé n’est pas connecté."}
            </small>
          </aside>
        </section>
        <div className={styles.twoColumns}>
          <section className={styles.panel}>
            <h2>À propos de cette formation</h2>
            <p className={styles.courseLongCopy}>{course.description}</p>
            {course.objectives ? (
              <>
                <h3>Objectifs</h3>
                <p className={styles.courseLongCopy}>{course.objectives}</p>
              </>
            ) : null}
            {course.prerequisites ? (
              <>
                <h3>Prérequis</h3>
                <p className={styles.courseLongCopy}>{course.prerequisites}</p>
              </>
            ) : null}
          </section>
          <section className={styles.panel}>
            <h2>Programme</h2>
            <div className={styles.publicProgram}>
              {course.modules.map((module) => (
                <div key={module.id}>
                  <strong>{module.title}</strong>
                  <span>{module.lessons.length} leçon(s)</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </>
    );

  return (
    <>
      <div className={styles.playerHeader}>
        <Link href="/learn/my-courses">← Mes formations</Link>
        <span>{course.progressPercentage}% terminé</span>
      </div>
      <header className={styles.pageHead}>
        <div>
          <h1>{course.title}</h1>
          <p>
            {activeLesson?.moduleTitle} · {activeLesson?.title}
          </p>
        </div>
        <div className={styles.playerActions}>
          {!course.ownerPreview ? (
            <button
              type="button"
              className={favorite ? styles.favoriteActive : ""}
              onClick={toggleFavorite}
              aria-pressed={favorite}
            >
              <Icon name="heart" />{" "}
              {favorite ? "Dans mes favoris" : "Ajouter aux favoris"}
            </button>
          ) : (
            <span className={styles.previewBadge}>
              Prévisualisation formateur
            </span>
          )}
          <div className={styles.playerProgress}>
            <Progress value={course.progressPercentage} color="green" />
            <b>{course.progressPercentage}%</b>
          </div>
        </div>
      </header>
      <div className={styles.playerLayout}>
        <section>
          <div className={styles.realVideoFrame}>
            {activeLesson?.videoPath ? (
              <video
                key={activeLesson.id}
                ref={videoRef}
                controls
                controlsList="nodownload noremoteplayback"
                disablePictureInPicture
                playsInline
                preload="metadata"
                src={activeLesson.videoPath}
                onContextMenu={(event) => event.preventDefault()}
                onLoadStart={() => { setVideoStatus("loading"); setVideoError(null); }}
                onCanPlay={() => setVideoStatus("ready")}
                onPlaying={() => setVideoStatus("ready")}
                onWaiting={() => setVideoStatus("buffering")}
                onStalled={() => setVideoStatus("buffering")}
                onError={() => {
                  setVideoStatus("error");
                  setVideoError("La vidéo n’a pas pu être chargée. Le lien sécurisé peut avoir expiré ou la connexion peut être interrompue.");
                }}
                onLoadedMetadata={(event) => {
                  const target = event.currentTarget;
                  if (
                    activeLesson.lastPositionSeconds > 0 &&
                    activeLesson.lastPositionSeconds < target.duration - 3
                  )
                    target.currentTime = activeLesson.lastPositionSeconds;
                  lastSavedSecond.current = Math.floor(target.currentTime);
                }}
                onPlay={(event) =>
                  void updateProgress(
                    "started",
                    event.currentTarget.currentTime,
                    event.currentTarget.duration,
                  )
                }
                onPause={(event) =>
                  void updateProgress(
                    "started",
                    event.currentTarget.currentTime,
                    event.currentTarget.duration,
                  )
                }
                onTimeUpdate={(event) => {
                  const second = Math.floor(event.currentTarget.currentTime);
                  if (second - lastSavedSecond.current >= 10) {
                    lastSavedSecond.current = second;
                    void updateProgress(
                      "started",
                      second,
                      event.currentTarget.duration,
                    );
                  }
                }}
                onEnded={(event) =>
                  void updateProgress(
                    "completed",
                    event.currentTarget.duration,
                    event.currentTarget.duration,
                  )
                }
              />
            ) : (
              <div>
                <Icon name="video" />
                <h2>Vidéo non ajoutée</h2>
                <p>
                  Le contenu textuel de la leçon reste disponible ci-dessous.
                </p>
              </div>
            )}
            {activeLesson?.videoPath && videoStatus !== "ready" && videoStatus !== "idle" ? (
              <div className={`${styles.videoState} ${videoStatus === "error" ? styles.videoStateError : ""}`} role="status">
                {videoStatus === "error" ? <Icon name="alert" /> : <span className={styles.videoSpinner} />}
                <strong>{videoStatus === "error" ? "Lecture interrompue" : videoStatus === "buffering" ? "Mise en mémoire tampon…" : "Préparation de la vidéo…"}</strong>
                {videoError ? <p>{videoError}</p> : null}
                {videoStatus === "error" ? <button type="button" onClick={() => void load()}>Régénérer l’accès vidéo</button> : null}
              </div>
            ) : null}
          </div>
          {activeLesson?.videoPath ? <p className={styles.videoSecurityNote}><Icon name="shield" /> Accès temporaire et réservé à votre compte. {connectionHint}</p> : null}
          <article className={styles.lessonCopy}>
            <h2>{activeLesson?.title ?? "Leçon"}</h2>
            <p>
              {activeLesson?.content ||
                course.description ||
                "Aucun contenu textuel pour cette leçon."}
            </p>
            <button
              className={styles.primaryButton}
              onClick={() => updateProgress("completed")}
            >
              Marquer comme terminée
            </button>
          </article>
          {!course.ownerPreview ? (
            <section className={styles.learningWorkspace}>
              <article>
                <div className={styles.sectionHead}>
                  <div>
                    <small>ESPACE PRIVÉ</small>
                    <h2>Mes notes</h2>
                  </div>
                  <button
                    type="button"
                    disabled={workspaceSaving}
                    onClick={saveNote}
                  >
                    {workspaceSaving ? "Enregistrement…" : "Enregistrer"}
                  </button>
                </div>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={7}
                  maxLength={10000}
                  placeholder="Écrivez ici vos idées, définitions et points à revoir…"
                />
                <small>
                  {note.length.toLocaleString("fr-FR")} / 10 000 caractères
                </small>
              </article>
              <article>
                <div>
                  <small>ÉCHANGER</small>
                  <h2>Questions au formateur</h2>
                </div>
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Posez une question liée à cette leçon…"
                />
                <button
                  type="button"
                  className={styles.smallButton}
                  disabled={workspaceSaving || question.trim().length < 3}
                  onClick={sendQuestion}
                >
                  Envoyer la question
                </button>
                <div className={styles.questionList}>
                  {questions.length ? (
                    questions.map((item) => (
                      <div key={item.id}>
                        <strong>{item.body}</strong>
                        <small>
                          {item.status === "answered"
                            ? "Réponse reçue"
                            : "En attente de réponse"}
                        </small>
                        {item.answer ? <p>{item.answer}</p> : null}
                      </div>
                    ))
                  ) : (
                    <p>Aucune question pour cette leçon.</p>
                  )}
                </div>
              </article>
            </section>
          ) : null}
          {workspaceMessage ? (
            <p className={styles.builderMessage}>{workspaceMessage}</p>
          ) : null}
        </section>
        <aside className={styles.chapterPanel}>
          <div className={styles.sectionHead}>
            <h2>Programme</h2>
            <b>{lessons.length} leçon(s)</b>
          </div>
          {course.modules.map((module) => (
            <div key={module.id} className={styles.moduleChapters}>
              <h3>{module.title}</h3>
              {module.lessons.map((lesson, index) => (
                <button
                  key={lesson.id}
                  className={
                    lesson.id === activeLesson?.id ? styles.chapterActive : ""
                  }
                  onClick={() => {
                    setActiveLessonId(lesson.id);
                    if (!course.ownerPreview)
                      router.replace(
                        `/learn/courses/${courseId}/lessons/${lesson.id}`,
                        { scroll: false },
                      );
                  }}
                >
                  <span>
                    {lesson.progressStatus === "completed" ? "✓" : index + 1}
                  </span>
                  <strong>{lesson.title}</strong>
                </button>
              ))}
              {module.exercises.map((exercise) => (
                <div key={exercise.id} className={styles.exerciseRow}>
                  <Icon name="clipboard" />
                  <span>
                    <strong>{exercise.title}</strong>
                    <small>{exercise.instructions}</small>
                  </span>
                </div>
              ))}
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}
