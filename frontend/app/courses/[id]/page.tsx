"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
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
      durationSeconds: number;
      isPreview: boolean;
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
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const [courseId, setCourseId] = useState("");
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [role, setRole] = useState("");
  const [courseRating, setCourseRating] = useState("5");
  const [courseComment, setCourseComment] = useState("");
  const [teacherRating, setTeacherRating] = useState("5");
  const [teacherComment, setTeacherComment] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [submittingCourseReview, setSubmittingCourseReview] = useState(false);
  const [submittingTeacherReview, setSubmittingTeacherReview] = useState(false);

  useEffect(() => {
    void params.then((resolved) => setCourseId(resolved.id));
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

        setCourse(data as CourseDetail);
      } catch {
        setMessage("Le detail du cours n'a pas pu etre charge.");
      } finally {
        setLoading(false);
      }
    };

    void loadCourse();
  }, [apiBaseUrl, courseId, router]);

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
    } catch {
      setMessage("L'inscription au cours a echoue.");
    } finally {
      setEnrolling(false);
    }
  };

  const canReview = role === "student" || role === "admin";

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
      setCourse(data as CourseDetail);
    }
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

            <p className={styles.description}>
              {course.description || "Description detaillee indisponible pour le moment."}
            </p>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryAction}
                disabled={enrolling || course.enrolled}
                onClick={() => void handleEnroll()}
              >
                {course.enrolled
                  ? "Deja inscrit"
                  : enrolling
                    ? "Inscription..."
                    : "S'inscrire au cours"}
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
                src={`https://njoucnnjlrwbbhnktaho.supabase.co/storage/v1/object/public/course-thumbnails/${course.thumbnailUrl}`}
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
                      <div key={lesson.id} className={styles.lessonCard}>
                        <strong>
                          Lecon {lessonIndex + 1}: {lesson.title}
                        </strong>
                        <span>
                          {lesson.durationSeconds > 0
                            ? `${lesson.durationSeconds} sec`
                            : "Duree a definir"}
                        </span>
                        {lesson.isPreview ? (
                          <small>Apercu disponible</small>
                        ) : null}
                      </div>
                    ))}
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
              <li>Suivi de progression dans ton dashboard</li>
              <li>Acces aux prochaines lecons apres inscription</li>
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

          {reviewMessage ? <p className={styles.reviewMessage}>{reviewMessage}</p> : null}

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
