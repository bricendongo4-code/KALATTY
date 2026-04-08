"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import TeacherCourseBuilder from "./TeacherCourseBuilder";
import styles from "./dashboard.module.css";

type DashboardRole = "student" | "teacher";

type StoredUser = {
  email?: string;
  fullname?: string;
  role?: string;
  level?: string | null;
  school_name?: string | null;
  expertise?: string | null;
};

type DashboardResponse = {
  role: DashboardRole;
  profile: StoredUser;
  stats: Record<string, number>;
  courses: Array<Record<string, unknown>>;
  tasks: string[];
};

const fallbackStudentTimeline = [
  { day: "Lun", topic: "Revision math", time: "19h00" },
  { day: "Mer", topic: "Quiz anglais", time: "18h30" },
  { day: "Sam", topic: "Serie bureautique", time: "09h00" },
];

const fallbackTeacherInsights = [
  {
    title: "Matiere la plus suivie",
    value: "Maths",
    note: "Tres forte demande sur les classes d'examen.",
  },
  {
    title: "Format prefere",
    value: "Courtes videos",
    note: "Les capsules de 8 a 12 min retiennent mieux l'attention.",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

  const [user] = useState<StoredUser | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const rawUser = localStorage.getItem("kalatty_user");
    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser) as StoredUser;
    } catch {
      return null;
    }
  });
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("kalatty_token");

    if (!token) {
      startTransition(() => {
        router.push("/login");
      });
      return;
    }

    const fetchDashboard = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/dashboard`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          if (res.status === 401) {
            localStorage.removeItem("kalatty_token");
            localStorage.removeItem("kalatty_user");
            startTransition(() => {
              router.push("/login");
            });
            return;
          }

          setError(data.message ?? "Impossible de charger le dashboard.");
          return;
        }

        setDashboardData(data as DashboardResponse);
        localStorage.setItem("kalatty_user", JSON.stringify(data.profile));
      } catch {
        setError("Le dashboard n'a pas pu etre charge.");
      } finally {
        setLoading(false);
      }
    };

    void fetchDashboard();
  }, [apiBaseUrl, router]);

  const role: DashboardRole =
    dashboardData?.role ?? (user?.role === "teacher" ? "teacher" : "student");
  const profile = dashboardData?.profile ?? user;
  const displayName =
    profile?.fullname?.trim() || (role === "teacher" ? "Formateur" : "Apprenant");

  const handleLogout = () => {
    localStorage.removeItem("kalatty_token");
    localStorage.removeItem("kalatty_user");
    localStorage.removeItem("kalatty_role");
    startTransition(() => {
      router.push("/login");
    });
  };

  if (loading) {
    return (
      <main className={styles.dashboardShell}>
        <section className={styles.card}>
          <h2>Chargement du dashboard...</h2>
          <p className={styles.paragraph}>
            Nous recuperons ton profil, tes cours et tes indicateurs depuis Kallaty.
          </p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.dashboardShell}>
        <section className={styles.card}>
          <h2>Impossible de charger le dashboard</h2>
          <p className={styles.paragraph}>{error}</p>
          <button type="button" className={styles.logoutButtonDark} onClick={handleLogout}>
            Retour a la connexion
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.dashboardShell}>
      <section className={styles.hero}>
        <div className={styles.heroTop}>
          <div>
            <p className={styles.kicker}>Dashboard Kallaty</p>
            <h1>
              {role === "student"
                ? `Bon retour, ${displayName}`
                : `Espace formateur, ${displayName}`}
            </h1>
            <p className={styles.heroText}>
              {role === "student"
                ? "Retrouve tes cours, ton rythme de revision et les actions qui te rapprochent de tes objectifs."
                : "Pilote tes contenus, suis les apprenants actifs et fais grandir ton academie locale."}
            </p>
          </div>

          <div className={styles.actions}>
            <div className={styles.roleBadge}>
              {role === "student" ? "Interface etudiant" : "Interface enseignant"}
            </div>
            <button type="button" className={styles.logoutButton} onClick={handleLogout}>
              Se deconnecter
            </button>
          </div>
        </div>

        <div className={styles.heroMeta}>
          <div className={styles.profileCard}>
            <span className={styles.profileLabel}>Compte connecte</span>
            <strong>{displayName}</strong>
            <span>{profile?.email ?? "email non disponible"}</span>
          </div>
          <div className={styles.profileCard}>
            <span className={styles.profileLabel}>Profil Kallaty</span>
            <strong>{role === "student" ? "Etudiant" : "Enseignant"}</strong>
            <span>
              {role === "student"
                ? profile?.level || "Niveau a completer dans le profil"
                : profile?.expertise || "Expertise a completer dans le profil"}
            </span>
          </div>
        </div>
      </section>

      {role === "student" ? (
        <section className={styles.grid}>
          <div className={styles.primaryColumn}>
            <section className={styles.card}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionLabel}>Vue etudiant</p>
                  <h2>Mes cours en cours</h2>
                </div>
                <span className={styles.sectionHint}>
                  {profile?.school_name || "Connectivite legere, revision mobile"}
                </span>
              </div>

              <div className={styles.statsRow}>
                <article className={styles.statCard}>
                  <span>Cours inscrits</span>
                  <strong>{dashboardData?.stats.enrolledCourses ?? 0}</strong>
                  <small>Parcours actuellement actives</small>
                </article>
                <article className={styles.statCard}>
                  <span>Lecons terminees</span>
                  <strong>{dashboardData?.stats.completedLessons ?? 0}</strong>
                  <small>Progression reelle depuis Supabase</small>
                </article>
                <article className={styles.statCard}>
                  <span>Progression moyenne</span>
                  <strong>{dashboardData?.stats.progressAverage ?? 0}%</strong>
                  <small>Total des modules engages</small>
                </article>
              </div>

              <div className={styles.courseList}>
                {(dashboardData?.courses ?? []).length > 0 ? (
                  (dashboardData?.courses ?? []).map((course) => (
                    <article key={String(course.id)} className={styles.courseCard}>
                      <div className={styles.courseHead}>
                        <div>
                          <h3>{String(course.title ?? "Cours sans titre")}</h3>
                          <p>{String(course.nextLesson ?? "Aucune lecon commencee")}</p>
                        </div>
                        <span>{Number(course.progress ?? 0)}%</span>
                      </div>
                      <div className={styles.progressTrack}>
                        <div
                          className={styles.progressFill}
                          style={{ width: `${Number(course.progress ?? 0)}%` }}
                        />
                      </div>
                      <small>{String(course.description ?? "Cours en progression")}</small>
                    </article>
                  ))
                ) : (
                  <p className={styles.paragraph}>
                    Aucun cours n&apos;est encore lie a ce compte. Les inscriptions
                    apparaitront ici des que la table `enrollments` sera alimentee.
                  </p>
                )}
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionLabel}>Planification</p>
                  <h2>Mon rythme de la semaine</h2>
                </div>
              </div>

              <div className={styles.timeline}>
                {fallbackStudentTimeline.map((item) => (
                  <div key={`${item.day}-${item.topic}`} className={styles.timelineItem}>
                    <strong>{item.day}</strong>
                    <div>
                      <p>{item.topic}</p>
                      <span>{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className={styles.sideColumn}>
            <section className={styles.cardAccent}>
              <p className={styles.sectionLabel}>A faire maintenant</p>
              <h2>Focus du jour</h2>
              <ul className={styles.simpleList}>
                {(dashboardData?.tasks ?? []).map((task) => (
                  <li key={task}>{task}</li>
                ))}
              </ul>
            </section>
          </div>
        </section>
      ) : (
        <section className={styles.grid}>
          <div className={styles.primaryColumn}>
            <section className={styles.card}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionLabel}>Vue enseignant</p>
                  <h2>Pilotage des cours</h2>
                </div>
                <span className={styles.sectionHint}>
                  {profile?.expertise || "Creation, suivi, diffusion"}
                </span>
              </div>

              <div className={styles.statsRow}>
                <article className={styles.statCard}>
                  <span>Cours publies</span>
                  <strong>{dashboardData?.stats.publishedCourses ?? 0}</strong>
                  <small>Recuperes depuis Supabase</small>
                </article>
                <article className={styles.statCard}>
                  <span>Apprenants totaux</span>
                  <strong>{dashboardData?.stats.totalLearners ?? 0}</strong>
                  <small>Somme des inscriptions sur tes cours</small>
                </article>
                <article className={styles.statCard}>
                  <span>Moyenne / cours</span>
                  <strong>{dashboardData?.stats.averageLearners ?? 0}</strong>
                  <small>Apprenants par cours publie</small>
                </article>
              </div>

              <div className={styles.teacherCourseGrid}>
                {(dashboardData?.courses ?? []).length > 0 ? (
                  (dashboardData?.courses ?? []).map((course) => (
                    <article key={String(course.id)} className={styles.teacherCourseCard}>
                      <div className={styles.teacherMeta}>
                        <span>{Number(course.lessonsCount ?? 0)} lecons</span>
                        <strong>{Number(course.learners ?? 0)} apprenants</strong>
                      </div>
                      <h3>{String(course.title ?? "Cours sans titre")}</h3>
                      <p>{String(course.description ?? "Description a completer")}</p>
                      <div className={styles.courseMetaGrid}>
                        <span>{Number(course.priceFcfa ?? 0)} FCFA</span>
                        <span>
                          {String(course.videoUrl ?? "")
                            ? "Video reliee"
                            : "Video a ajouter"}
                        </span>
                        <span>
                          {String(course.thumbnailUrl ?? "")
                            ? "Miniature prete"
                            : "Miniature manquante"}
                        </span>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className={styles.paragraph}>
                    Aucun cours n&apos;est encore rattache a cet enseignant. Les cours
                    apparaitront ici quand `courses.teacher_id` pointera sur ton profil.
                  </p>
                )}
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionLabel}>Insights</p>
                  <h2>Tendances utiles</h2>
                </div>
              </div>

              <div className={styles.insightGrid}>
                {fallbackTeacherInsights.map((insight) => (
                  <article key={insight.title} className={styles.insightCard}>
                    <span>{insight.title}</span>
                    <strong>{insight.value}</strong>
                    <p>{insight.note}</p>
                  </article>
                ))}
              </div>
            </section>

            <TeacherCourseBuilder
              apiBaseUrl={apiBaseUrl}
              onCourseCreated={(updater) => setDashboardData(updater)}
            />
          </div>

          <div className={styles.sideColumn}>
            <section className={styles.cardAccent}>
              <p className={styles.sectionLabel}>Operations du jour</p>
              <h2>Checklist formateur</h2>
              <ul className={styles.simpleList}>
                {(dashboardData?.tasks ?? []).map((task) => (
                  <li key={task}>{task}</li>
                ))}
              </ul>
            </section>

            <section className={styles.card}>
              <p className={styles.sectionLabel}>Revenus</p>
              <h2>Remuneration enseignant</h2>
              <div className={styles.revenueGrid}>
                <article className={styles.revenueCard}>
                  <span>Montant cumule</span>
                  <strong>{dashboardData?.stats.totalRevenue ?? 0} FCFA</strong>
                  <small>Somme totale generee par tes cours</small>
                </article>
                <article className={styles.revenueCard}>
                  <span>Ce mois-ci</span>
                  <strong>{dashboardData?.stats.monthRevenue ?? 0} FCFA</strong>
                  <small>Revenus recents des inscriptions payantes</small>
                </article>
              </div>
              <p className={styles.paragraph}>
                Ces chiffres passeront en reel des qu&apos;on branchera la table des
                paiements ou les prix par cours.
              </p>
            </section>
          </div>
        </section>
      )}
    </main>
  );
}
