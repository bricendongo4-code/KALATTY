"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

type CourseDetail = {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  priceFcfa: number;
  thumbnailUrl: string;
  teacherName: string;
  teacherExpertise: string;
  status: string;
  lessonsCount: number;
  enrolled: boolean;
  courseRatingAverage: number;
  teacherRatingAverage: number;
  completedLessons: number;
  startedLessons: number;
  progressPercentage: number;
  courseReviews: Array<ReviewItem>;
  teacherReviews: Array<ReviewItem>;
  modules: Array<{
    id: string;
    title: string;
    description: string;
    lessons: Array<{
      id: string;
      title: string;
      content: string;
      videoPath: string;
      durationSeconds: number;
      isPreview: boolean;
      progressStatus: "not_started" | "started" | "completed";
    }>;
    exercises: Array<{
      id: string;
      title: string;
      instructions: string;
      correction: string;
      files: Array<{
        id: string;
        name: string;
        filePath: string;
        fileType: string;
      }>;
    }>;
  }>;
};

type ReviewItem = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  authorName: string;
};

export default function CourseDetailPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const router = useRouter();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const storageBaseUrl =
    `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://njoucnnjlrwbbhnktaho.supabase.co"}/storage/v1/object/public`;
  const [courseId, setCourseId] = useState("");
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [activeLessonId, setActiveLessonId] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [role, setRole] = useState("");
  const [courseRating, setCourseRating] = useState("5");
  const [courseComment, setCourseComment] = useState("");
  const [teacherRating, setTeacherRating] = useState("5");
  const [teacherComment, setTeacherComment] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [submittingCourseReview, setSubmittingCourseReview] = useState(false);
  const [submittingTeacherReview, setSubmittingTeacherReview] = useState(false);
  const [lessonActionLoading, setLessonActionLoading] = useState(false);
  const [videoStarted, setVideoStarted] = useState(false);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const lastTrackedSecondRef = useRef(0);

  const buildStorageUrl = (bucket: string, path: string) => {
    if (!path) {
      return "";
    }

    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }

    const normalizedPath = path
      .split("/")
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join("/");

    return `${storageBaseUrl}/${bucket}/${normalizedPath}`;
  };

  const getSupportFileUrl = (path: string) =>
    path.startsWith("http://") || path.startsWith("https://")
      ? path
      : buildStorageUrl("course-videos", path);

  const getAccessibleLessons = (nextCourse: CourseDetail) =>
    nextCourse.modules
      .flatMap((module) => module.lessons)
      .filter((lesson) => lesson.videoPath && (nextCourse.enrolled || lesson.isPreview));

  const pickLessonToResume = (nextCourse: CourseDetail, preferredLessonId?: string) => {
    const accessibleLessons = getAccessibleLessons(nextCourse);

    if (preferredLessonId) {
      const preferredLesson = accessibleLessons.find(
        (lesson) => lesson.id === preferredLessonId,
      );
      if (preferredLesson) {
        return preferredLesson;
      }
    }

    const inProgressLesson = accessibleLessons.find(
      (lesson) => lesson.progressStatus === "started",
    );
    if (inProgressLesson) {
      return inProgressLesson;
    }

    const nextIncompleteLesson = accessibleLessons.find(
      (lesson) => lesson.progressStatus !== "completed",
    );
    if (nextIncompleteLesson) {
      return nextIncompleteLesson;
    }

    return accessibleLessons[0] ?? null;
  };

  const saveLastLesson = (nextCourseId: string, lessonId: string) => {
    if (typeof window === "undefined" || !nextCourseId || !lessonId) {
      return;
    }

    localStorage.setItem(`kalatty_last_lesson_${nextCourseId}`, lessonId);
  };

  const getSavedLastLesson = (nextCourseId: string) => {
    if (typeof window === "undefined" || !nextCourseId) {
      return "";
    }

    return localStorage.getItem(`kalatty_last_lesson_${nextCourseId}`) ?? "";
  };

  const getVideoPositionKey = (nextCourseId: string, lessonId: string) =>
    `kalatty_video_position_${nextCourseId}_${lessonId}`;

  const saveVideoPosition = (
    nextCourseId: string,
    lessonId: string,
    currentTime: number,
    duration?: number,
  ) => {
    if (
      typeof window === "undefined" ||
      !nextCourseId ||
      !lessonId ||
      !Number.isFinite(currentTime) ||
      currentTime <= 0
    ) {
      return;
    }

    if (Number.isFinite(duration) && Number(duration) - currentTime <= 2) {
      localStorage.removeItem(getVideoPositionKey(nextCourseId, lessonId));
      return;
    }

    localStorage.setItem(
      getVideoPositionKey(nextCourseId, lessonId),
      String(Math.floor(currentTime)),
    );
  };

  const getSavedVideoPosition = (nextCourseId: string, lessonId: string) => {
    if (typeof window === "undefined" || !nextCourseId || !lessonId) {
      return 0;
    }

    const rawValue = localStorage.getItem(getVideoPositionKey(nextCourseId, lessonId));
    const parsedValue = Number(rawValue ?? 0);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  };

  const clearSavedVideoPosition = (nextCourseId: string, lessonId: string) => {
    if (typeof window === "undefined" || !nextCourseId || !lessonId) {
      return;
    }

    localStorage.removeItem(getVideoPositionKey(nextCourseId, lessonId));
  };

  useEffect(() => {
    if (typeof (params as Promise<{ id: string }>).then === "function") {
      void (params as Promise<{ id: string }>).then((resolved) =>
        setCourseId(resolved.id),
      );
      return;
    }

    setCourseId((params as { id: string }).id);
  }, [params]);

  useEffect(() => {
    const rawUser = localStorage.getItem("kalatty_user");
    if (!rawUser) {
      return;
    }

    try {
      const parsedUser = JSON.parse(rawUser) as { role?: string };
      setRole(parsedUser.role ?? "");
    } catch {
      setRole("");
    }
  }, []);

  useEffect(() => {
    if (!courseId) {
      return;
    }

    const token = localStorage.getItem("kalatty_token");
    if (!token) {
      startTransition(() => router.push("/login"));
      return;
    }

    const loadCourse = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/courses/${courseId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();

        if (!res.ok) {
          setMessage(
            typeof data.message === "string"
              ? data.message
              : "Impossible de charger le detail du cours.",
          );
          return;
        }

        const nextCourse = data as CourseDetail;
        setCourse(nextCourse);
        const lessonToResume = pickLessonToResume(
          nextCourse,
          getSavedLastLesson(nextCourse.id),
        );
        setActiveLessonId(lessonToResume?.id ?? "");
        setVideoStarted(false);
      } catch {
        setMessage("Le detail du cours n'a pas pu etre charge.");
      } finally {
        setLoading(false);
      }
    };

    void loadCourse();
  }, [apiBaseUrl, courseId, router]);

  useEffect(() => {
    lastTrackedSecondRef.current = 0;
  }, [activeLessonId]);

  useEffect(() => {
    return () => {
      if (course?.id && activeLessonId && videoElementRef.current) {
        saveVideoPosition(
          course.id,
          activeLessonId,
          videoElementRef.current.currentTime,
          videoElementRef.current.duration,
        );
      }
    };
  }, [activeLessonId, course?.id]);

  const handleEnroll = async () => {
    const token = localStorage.getItem("kalatty_token");
    if (!token || !course) {
      return;
    }

    setEnrolling(true);
    setMessage("");

    try {
      const res = await fetch(`${apiBaseUrl}/courses/${course.id}/enroll`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ courseId: course.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(
          typeof data.message === "string"
            ? data.message
            : "Impossible de s'inscrire a ce cours.",
        );
        return;
      }

      setCourse((current) =>
        current ? { ...current, enrolled: true } : current,
      );
      setMessage("Inscription reussie. Tu peux maintenant suivre ce cours.");
      await reloadCourse();
    } catch {
      setMessage("L'inscription au cours a echoue.");
    } finally {
      setEnrolling(false);
    }
  };

  const handlePayment = async () => {
    const token = localStorage.getItem("kalatty_token");
    if (!token || !course) {
      return;
    }

    setPaymentLoading(true);
    setMessage("");

    try {
      const checkoutRes = await fetch(`${apiBaseUrl}/payments/course-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ courseId: course.id }),
      });
      const checkoutData = await checkoutRes.json();

      if (!checkoutRes.ok) {
        setMessage(
          typeof checkoutData.message === "string"
            ? checkoutData.message
            : "Impossible de preparer le paiement.",
        );
        return;
      }

      if (checkoutData.alreadyEnrolled) {
        setCourse((current) => (current ? { ...current, enrolled: true } : current));
        setMessage("Tu es deja inscrit a ce cours.");
        return;
      }

      const confirmRes = await fetch(
        `${apiBaseUrl}/payments/${checkoutData.paymentId}/confirm-demo`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const confirmData = await confirmRes.json();

      if (!confirmRes.ok) {
        setMessage(
          typeof confirmData.message === "string"
            ? confirmData.message
            : "Impossible de confirmer le paiement.",
        );
        return;
      }

      setCourse((current) => (current ? { ...current, enrolled: true } : current));
      setMessage("Paiement confirme. Le cours est maintenant disponible.");
      await reloadCourse();
    } catch {
      setMessage("Le paiement n'a pas pu etre finalise.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const canReview = role === "student" || role === "admin";
  const canAccessFullCourse =
    role === "teacher" || role === "admin" || Boolean(course?.enrolled);
  const allLessons = course?.modules.flatMap((module) => module.lessons) ?? [];
  const activeLesson = allLessons.find((lesson) => lesson.id === activeLessonId) ?? null;
  const accessibleLessons = course ? getAccessibleLessons(course) : [];
  const activeLessonIndex = accessibleLessons.findIndex(
    (lesson) => lesson.id === activeLessonId,
  );
  const nextLesson =
    activeLessonIndex >= 0 ? accessibleLessons[activeLessonIndex + 1] ?? null : null;
  const canPlayActiveLesson = Boolean(
    activeLesson && activeLesson.videoPath && (canAccessFullCourse || activeLesson.isPreview),
  );

  const formatReviewDate = (value: string) => {
    if (!value) {
      return "Date indisponible";
    }

    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  };

  const setLessonProgressLocally = (
    lessonId: string,
    status: "started" | "completed",
  ) => {
    setCourse((current) => {
      if (!current) {
        return current;
      }

      const modules = current.modules.map((module) => ({
        ...module,
        lessons: module.lessons.map((lesson) => {
          if (lesson.id !== lessonId) {
            return lesson;
          }

          if (lesson.progressStatus === "completed") {
            return lesson;
          }

          return {
            ...lesson,
            progressStatus: status,
          };
        }),
      }));

      const updatedLessons = modules.flatMap((module) => module.lessons);
      const completedLessons = updatedLessons.filter(
        (lesson) => lesson.progressStatus === "completed",
      ).length;
      const engagedLessons = updatedLessons.filter(
        (lesson) =>
          lesson.progressStatus === "started" || lesson.progressStatus === "completed",
      ).length;

      return {
        ...current,
        modules,
        completedLessons,
        startedLessons: engagedLessons,
        progressPercentage:
          updatedLessons.length > 0
            ? Math.round((engagedLessons / updatedLessons.length) * 100)
            : 0,
      };
    });
  };

  const persistLessonProgress = async (
    lessonId: string,
    status: "started" | "completed",
  ) => {
    const token = localStorage.getItem("kalatty_token");
    if (!token || !course) {
      return false;
    }

    try {
      const res = await fetch(
        `${apiBaseUrl}/courses/${course.id}/lessons/${lessonId}/progress`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        },
      );
      const data = await res.json();

      if (!res.ok) {
        setMessage(
          typeof data.message === "string"
            ? data.message
            : "Impossible d'enregistrer la progression de la lecon.",
        );
        return false;
      }

      setLessonProgressLocally(lessonId, data.status === "completed" ? "completed" : status);
      return true;
    } catch {
      setMessage("La progression de la lecon n'a pas pu etre enregistree.");
      return false;
    }
  };

  const reloadCourse = async () => {
    const token = localStorage.getItem("kalatty_token");
    if (!token || !courseId) {
      return;
    }

    const res = await fetch(`${apiBaseUrl}/courses/${courseId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();

    if (res.ok) {
      const refreshedCourse = data as CourseDetail;
      setCourse(refreshedCourse);
      setVideoStarted(false);
      const lessonToResume = pickLessonToResume(
        refreshedCourse,
        activeLessonId || getSavedLastLesson(refreshedCourse.id),
      );
      setActiveLessonId(lessonToResume?.id ?? "");
    }
  };

  const handleStartCourse = () => {
    if (!course) {
      return;
    }

    const firstAvailableLesson = pickLessonToResume(
      course,
      activeLessonId || getSavedLastLesson(course.id),
    );

    if (!firstAvailableLesson) {
      setMessage(
        course.enrolled
          ? "Aucune video n'est encore disponible sur ce cours."
          : "Inscris-toi pour demarrer les lecons de ce cours.",
      );
      return;
    }

    setActiveLessonId(firstAvailableLesson.id);
    saveLastLesson(course.id, firstAvailableLesson.id);
    setVideoStarted(false);
    setMessage("");
    void persistLessonProgress(firstAvailableLesson.id, "started");
  };

  const handleLessonSelect = (lessonId: string) => {
    if (!course) {
      return;
    }

    const selectedLesson = allLessons.find((lesson) => lesson.id === lessonId);
    setActiveLessonId(lessonId);
    saveLastLesson(course.id, lessonId);
    setVideoStarted(false);
    setMessage("");

    if (
      selectedLesson?.videoPath &&
      (canAccessFullCourse || selectedLesson.isPreview)
    ) {
      void persistLessonProgress(lessonId, "started");
    }
  };

  const moveToNextLesson = (options?: { completedCourse?: boolean }) => {
    if (!course) {
      return;
    }

    if (!nextLesson) {
      if (options?.completedCourse) {
        setMessage("Bravo, tu as termine toutes les videos disponibles de ce cours.");
      } else {
        setMessage("Cette lecon est la derniere video disponible pour le moment.");
      }
      return;
    }

    setActiveLessonId(nextLesson.id);
    saveLastLesson(course.id, nextLesson.id);
    setVideoStarted(false);
    setMessage(
      options?.completedCourse
        ? "Lecon terminee. Passage automatique a la suite."
        : "Passage a la lecon suivante.",
    );
    void persistLessonProgress(nextLesson.id, "started");
  };

  const handleMarkLessonCompleted = async () => {
    if (!activeLesson || !course) {
      return;
    }

    setLessonActionLoading(true);
    const updated = await persistLessonProgress(activeLesson.id, "completed");
    if (updated) {
      clearSavedVideoPosition(course.id, activeLesson.id);
      moveToNextLesson({ completedCourse: true });
    }
    setLessonActionLoading(false);
  };

  const submitReview = async (
    endpoint: "reviews" | "teacher-reviews",
    payload: { rating: number; comment: string },
    onStart: (value: boolean) => void,
  ) => {
    const token = localStorage.getItem("kalatty_token");
    if (!token || !course) {
      return;
    }

    onStart(true);
    setReviewMessage("");

    try {
      const res = await fetch(`${apiBaseUrl}/courses/${course.id}/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setReviewMessage(
          typeof data.message === "string"
            ? data.message
            : "Impossible d'enregistrer cet avis.",
        );
        return;
      }

      setReviewMessage(
        endpoint === "reviews"
          ? "Ton avis sur le cours a bien ete enregistre."
          : "Ton avis sur le professeur a bien ete enregistre.",
      );
      await reloadCourse();
    } catch {
      setReviewMessage("L'enregistrement de l'avis a echoue.");
    } finally {
      onStart(false);
    }
  };

  const handleCourseReview = async (event: React.FormEvent) => {
    event.preventDefault();
    await submitReview(
      "reviews",
      {
        rating: Number(courseRating),
        comment: courseComment,
      },
      setSubmittingCourseReview,
    );
    setCourseComment("");
  };

  const handleTeacherReview = async (event: React.FormEvent) => {
    event.preventDefault();
    await submitReview(
      "teacher-reviews",
      {
        rating: Number(teacherRating),
        comment: teacherComment,
      },
      setSubmittingTeacherReview,
    );
    setTeacherComment("");
  };

  if (loading) {
    return (
      <main className={styles.page}>
        <section className={styles.panel}>
          <h1>Chargement du cours...</h1>
        </section>
      </main>
    );
  }

  if (!course) {
    return (
      <main className={styles.page}>
        <section className={styles.panel}>
          <h1>Cours introuvable</h1>
          <p>{message || "Le cours demande n'est pas disponible."}</p>
          <Link href="/dashboard" className={styles.secondaryAction}>
            Retour au dashboard
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.heroTopLinks}>
            <Link href="/" className={styles.brandLink}>
              <Image
                src="/kalatty-logo.png"
                alt="Logo Kalatty"
                width={52}
                height={52}
                className={styles.heroLogo}
                priority
              />
              <strong>Kalatty</strong>
            </Link>
            <Link href="/dashboard" className={styles.backLink}>
              Retour au dashboard
            </Link>
          </div>
          <span className={styles.statusChip}>{course.status}</span>
        </div>

        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <span className={styles.kicker}>Fiche cours</span>
            <h1>{course.title}</h1>
            <p className={styles.subtitle}>
              {course.shortDescription || course.description || "Cours Kalatty"}
            </p>

            <div className={styles.metaRow}>
              <span>{course.priceFcfa} FCFA</span>
              <span>{course.teacherName}</span>
              <span>{course.lessonsCount} lecons</span>
              <span>{course.courseRatingAverage}/5 cours</span>
              <span>{course.teacherRatingAverage}/5 prof</span>
            </div>

            <div className={styles.progressHero}>
              <div className={styles.progressHeroTop}>
                <strong>Progression du parcours</strong>
                <span>{course.progressPercentage}%</span>
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${course.progressPercentage}%` }}
                />
              </div>
              <small>
                {course.completedLessons} lecon(s) terminee(s) sur {course.lessonsCount}
              </small>
            </div>

            <p className={styles.description}>
              {course.description || "Description detaillee indisponible pour le moment."}
            </p>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryAction}
                disabled={enrolling || paymentLoading || course.enrolled}
                onClick={() =>
                  void (course.priceFcfa > 0 ? handlePayment() : handleEnroll())
                }
                hidden={role === "teacher"}
              >
                {course.priceFcfa > 0
                  ? course.enrolled
                    ? "Deja debloque"
                    : paymentLoading
                      ? "Paiement..."
                      : "Payer et debloquer"
                  : course.enrolled
                    ? "Deja inscrit"
                    : enrolling
                      ? "Inscription..."
                      : "S'inscrire au cours"}
              </button>
              <button
                type="button"
                className={styles.secondaryActionButton}
                onClick={course.priceFcfa > 0 && !course.enrolled ? () => void handlePayment() : handleStartCourse}
              >
                {course.priceFcfa > 0 && !course.enrolled
                  ? "Lancer le paiement"
                  : canAccessFullCourse
                    ? "Commencer le cours"
                    : "Voir l'apercu"}
              </button>
              <Link href="/dashboard" className={styles.secondaryAction}>
                Voir mes cours
              </Link>
            </div>

            {message ? <p className={styles.inlineMessage}>{message}</p> : null}
          </div>

          <aside className={styles.heroCard}>
            {course.thumbnailUrl ? (
              <Image
                src={buildStorageUrl("course-thumbnails", course.thumbnailUrl)}
                alt={course.title}
                width={520}
                height={320}
                className={styles.coverImage}
              />
            ) : (
              <div className={styles.coverFallback}>Kalatty</div>
            )}
            <div className={styles.teacherCard}>
              <strong>{course.teacherName}</strong>
              <span>{course.teacherExpertise || "Formateur Kalatty"}</span>
            </div>
          </aside>
        </div>
      </section>

      <section className={styles.contentGrid}>
        <section className={styles.panel}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionLabel}>Lecture</span>
              <h2>Video du cours</h2>
            </div>
          </div>

          <div className={styles.playerShell}>
            {canPlayActiveLesson && activeLesson ? (
              <>
                <div className={styles.videoWrapper}>
                  <video
                    ref={videoElementRef}
                    key={activeLesson.id}
                    className={styles.videoPlayer}
                    controls
                    preload="metadata"
                    src={buildStorageUrl("course-videos", activeLesson.videoPath)}
                    onLoadedMetadata={(event) => {
                      if (!course) {
                        return;
                      }

                      const savedPosition = getSavedVideoPosition(course.id, activeLesson.id);
                      const player = event.currentTarget;

                      if (
                        savedPosition > 0 &&
                        Number.isFinite(player.duration) &&
                        savedPosition < player.duration - 2
                      ) {
                        player.currentTime = savedPosition;
                        lastTrackedSecondRef.current = savedPosition;
                      }
                    }}
                    onTimeUpdate={(event) => {
                      if (!course) {
                        return;
                      }

                      const player = event.currentTarget;
                      const currentSecond = Math.floor(player.currentTime);
                      if (currentSecond - lastTrackedSecondRef.current >= 5) {
                        saveVideoPosition(
                          course.id,
                          activeLesson.id,
                          player.currentTime,
                          player.duration,
                        );
                        lastTrackedSecondRef.current = currentSecond;
                      }
                    }}
                    onPlay={() => {
                      if (!videoStarted) {
                        setVideoStarted(true);
                        if (course) {
                          saveLastLesson(course.id, activeLesson.id);
                        }
                        void persistLessonProgress(activeLesson.id, "started");
                      }
                    }}
                    onPause={(event) => {
                      if (course) {
                        saveVideoPosition(
                          course.id,
                          activeLesson.id,
                          event.currentTarget.currentTime,
                          event.currentTarget.duration,
                        );
                      }
                    }}
                    onEnded={() => {
                      if (course) {
                        clearSavedVideoPosition(course.id, activeLesson.id);
                      }
                      void handleMarkLessonCompleted();
                    }}
                  />
                </div>
                <div className={styles.playerMeta}>
                  <strong>{activeLesson.title}</strong>
                  <span>
                    {activeLesson.durationSeconds > 0
                      ? `${activeLesson.durationSeconds} sec`
                      : "Duree non renseignee"}
                  </span>
                  <div className={styles.lessonBadgeRow}>
                    <span className={styles.lessonBadge}>
                      {activeLesson.progressStatus === "completed"
                        ? "Terminee"
                        : activeLesson.progressStatus === "started"
                          ? "En cours"
                          : "Non commencee"}
                    </span>
                    {activeLesson.isPreview ? (
                      <span className={styles.lessonBadge}>Apercu</span>
                    ) : null}
                  </div>
                  <p>
                    {activeLesson.content || "Le professeur n'a pas encore ajoute de description pour cette lecon."}
                  </p>
                  {nextLesson ? (
                    <p>
                      Suite conseillee: <strong>{nextLesson.title}</strong>
                    </p>
                  ) : (
                    <p>
                      Cette lecon clot actuellement le parcours video disponible.
                    </p>
                  )}
                  {canAccessFullCourse ? (
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.primaryAction}
                        onClick={() => void handleMarkLessonCompleted()}
                        disabled={
                          lessonActionLoading ||
                          activeLesson.progressStatus === "completed"
                        }
                      >
                        {activeLesson.progressStatus === "completed"
                          ? "Lecon deja terminee"
                          : lessonActionLoading
                            ? "Mise a jour..."
                            : "Marquer comme terminee"}
                      </button>
                      {nextLesson ? (
                        <button
                          type="button"
                          className={styles.secondaryAction}
                          onClick={() => moveToNextLesson()}
                        >
                          Lecon suivante
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className={styles.playerFallback}>
                <strong>
                  {course.enrolled
                    ? "Choisis une lecon video pour commencer."
                    : "Inscris-toi pour debloquer la lecture complete du cours."}
                </strong>
                <p>
                  {course.enrolled
                    ? "La video selectionnee s'affichera ici avec les informations de la lecon."
                    : "Les apercus gratuits et les avis restent visibles depuis cette fiche."}
                </p>
              </div>
            )}
          </div>

          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionLabel}>Programme</span>
              <h2>Contenu du cours</h2>
            </div>
          </div>

          <div className={styles.moduleList}>
            {course.modules.length > 0 ? (
              course.modules.map((module, moduleIndex) => (
                <article key={module.id} className={styles.moduleCard}>
                  <div className={styles.moduleHeader}>
                    <span>Module {moduleIndex + 1}</span>
                    <strong>{module.title}</strong>
                  </div>
                  {module.description ? <p>{module.description}</p> : null}

                  <div className={styles.lessonList}>
                    {module.lessons.map((lesson, lessonIndex) => (
                      <button
                        key={lesson.id}
                        type="button"
                        className={
                          lesson.id === activeLessonId
                            ? styles.lessonCardActive
                            : styles.lessonCard
                        }
                        onClick={() => handleLessonSelect(lesson.id)}
                      >
                        <strong>
                          Lecon {lessonIndex + 1}: {lesson.title}
                        </strong>
                        <span>
                          {lesson.durationSeconds > 0
                            ? `${lesson.durationSeconds} sec`
                            : "Duree a definir"}
                        </span>
                        <small>
                          {lesson.videoPath
                            ? lesson.isPreview && !course.enrolled
                              ? "Apercu video disponible"
                              : canAccessFullCourse || lesson.isPreview
                                ? "Lecture disponible"
                                : "Inscription necessaire"
                            : "Video non ajoutee"}
                        </small>
                        <small>
                          {lesson.progressStatus === "completed"
                            ? "Statut: terminee"
                            : lesson.progressStatus === "started"
                              ? "Statut: en cours"
                              : "Statut: non commencee"}
                        </small>
                      </button>
                    ))}
                  </div>

                  <div className={styles.lessonList}>
                    <strong>Exercices du module</strong>
                    {module.exercises.length > 0 ? (
                      module.exercises.map((exercise, exerciseIndex) => (
                        <article key={exercise.id} className={styles.reviewCard}>
                          <div className={styles.reviewCardTop}>
                            <strong>
                              Exercice {exerciseIndex + 1}: {exercise.title}
                            </strong>
                            <span>{exercise.files.length} fichier(s)</span>
                          </div>
                          <p>
                            {exercise.instructions ||
                              "Aucune consigne detaillee fournie pour cet exercice."}
                          </p>
                          {exercise.files.length > 0 ? (
                            <div className={styles.reviewList}>
                              {exercise.files.map((file) => (
                                <a
                                  key={file.id}
                                  href={getSupportFileUrl(file.filePath)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={styles.secondaryAction}
                                >
                                  Ouvrir {file.name}
                                </a>
                              ))}
                            </div>
                          ) : null}
                          {canAccessFullCourse && exercise.correction ? (
                            <p>
                              <strong>Correction:</strong> {exercise.correction}
                            </p>
                          ) : null}
                        </article>
                      ))
                    ) : (
                      <p className={styles.reviewHint}>
                        Aucun exercice n&apos;est encore rattache a ce module.
                      </p>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <p>Aucun module n&apos;est encore visible pour ce cours.</p>
            )}
          </div>
        </section>

        <aside className={styles.sidePanel}>
          <section className={styles.panel}>
            <span className={styles.sectionLabel}>Ce que tu obtiens</span>
            <ul className={styles.simpleList}>
              <li>Acces au programme du cours</li>
              <li>Lecture video directe depuis la fiche cours</li>
              <li>Suivi de progression dans ton dashboard</li>
              <li>Exercices et supports associes aux modules</li>
              <li>Notes et commentaires apres inscription</li>
            </ul>
          </section>

          <section className={styles.panel}>
            <span className={styles.sectionLabel}>Notes globales</span>
            <div className={styles.ratingSummaryGrid}>
              <div className={styles.ratingCard}>
                <small>Cours</small>
                <strong>{course.courseRatingAverage}/5</strong>
                <span>{course.courseReviews.length} avis</span>
              </div>
              <div className={styles.ratingCard}>
                <small>Professeur</small>
                <strong>{course.teacherRatingAverage}/5</strong>
                <span>{course.teacherReviews.length} avis</span>
              </div>
            </div>
            {reviewMessage ? <p className={styles.reviewMessage}>{reviewMessage}</p> : null}
          </section>
        </aside>
      </section>

      <section className={styles.reviewGrid}>
        <section className={styles.panel}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionLabel}>Avis apprenants</span>
              <h2>Commentaires sur le cours</h2>
            </div>
          </div>

          {canReview && course.enrolled ? (
            <form className={styles.reviewForm} onSubmit={(event) => void handleCourseReview(event)}>
              <div className={styles.formRow}>
                <label className={styles.formField}>
                  <span>Note</span>
                  <select
                    value={courseRating}
                    onChange={(event) => setCourseRating(event.target.value)}
                  >
                    {[5, 4, 3, 2, 1].map((value) => (
                      <option key={value} value={value}>
                        {value}/5
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className={styles.formField}>
                <span>Commentaire</span>
                <textarea
                  value={courseComment}
                  onChange={(event) => setCourseComment(event.target.value)}
                  rows={4}
                  placeholder="Dis ce que tu as pense du rythme, du contenu et de la clarte."
                />
              </label>
              <button
                type="submit"
                className={styles.primaryAction}
                disabled={submittingCourseReview}
              >
                {submittingCourseReview ? "Envoi..." : "Publier mon avis sur le cours"}
              </button>
            </form>
          ) : (
            <p className={styles.reviewHint}>
              Les avis sont reserves aux etudiants inscrits a ce cours.
            </p>
          )}

          <div className={styles.reviewList}>
            {course.courseReviews.length > 0 ? (
              course.courseReviews.map((review) => (
                <article key={review.id} className={styles.reviewCard}>
                  <div className={styles.reviewCardTop}>
                    <strong>{review.authorName}</strong>
                    <span>{review.rating}/5</span>
                  </div>
                  <small>{formatReviewDate(review.createdAt)}</small>
                  <p>{review.comment || "Aucun commentaire detaille laisse pour le moment."}</p>
                </article>
              ))
            ) : (
              <p className={styles.reviewHint}>Aucun avis n&apos;a encore ete publie pour ce cours.</p>
            )}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionLabel}>Avis enseignant</span>
              <h2>Commentaires sur le professeur</h2>
            </div>
          </div>

          {canReview && course.enrolled ? (
            <form className={styles.reviewForm} onSubmit={(event) => void handleTeacherReview(event)}>
              <div className={styles.formRow}>
                <label className={styles.formField}>
                  <span>Note</span>
                  <select
                    value={teacherRating}
                    onChange={(event) => setTeacherRating(event.target.value)}
                  >
                    {[5, 4, 3, 2, 1].map((value) => (
                      <option key={value} value={value}>
                        {value}/5
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className={styles.formField}>
                <span>Commentaire</span>
                <textarea
                  value={teacherComment}
                  onChange={(event) => setTeacherComment(event.target.value)}
                  rows={4}
                  placeholder="Partage ton ressenti sur la pedagogie, la clarte et l'accompagnement."
                />
              </label>
              <button
                type="submit"
                className={styles.primaryAction}
                disabled={submittingTeacherReview}
              >
                {submittingTeacherReview ? "Envoi..." : "Publier mon avis sur le professeur"}
              </button>
            </form>
          ) : (
            <p className={styles.reviewHint}>
              Il faut etre inscrit au cours pour noter le professeur.
            </p>
          )}

          <div className={styles.reviewList}>
            {course.teacherReviews.length > 0 ? (
              course.teacherReviews.map((review) => (
                <article key={review.id} className={styles.reviewCard}>
                  <div className={styles.reviewCardTop}>
                    <strong>{review.authorName}</strong>
                    <span>{review.rating}/5</span>
                  </div>
                  <small>{formatReviewDate(review.createdAt)}</small>
                  <p>{review.comment || "Aucun commentaire detaille laisse pour le moment."}</p>
                </article>
              ))
            ) : (
              <p className={styles.reviewHint}>
                Aucun avis n&apos;a encore ete publie pour ce professeur sur ce cours.
              </p>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
