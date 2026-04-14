"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import InstitutionWorkspace from "./InstitutionWorkspace";
import TeacherCourseBuilder from "./TeacherCourseBuilder";
import styles from "./dashboard.module.css";

type DashboardRole = "student" | "teacher" | "institution";
type StudentView = "home" | "progress" | "institutions";
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

const studentTimeline = [
  { day: "Lun", topic: "Revision math", time: "19h00" },
  { day: "Mer", topic: "Quiz anglais", time: "18h30" },
  { day: "Sam", topic: "Serie bureautique", time: "09h00" },
];
const teacherInsights = [
  { title: "Matiere la plus suivie", value: "Maths", note: "Forte demande sur les classes d'examen." },
  { title: "Format prefere", value: "Courtes videos", note: "Les capsules de 8 a 12 min retiennent mieux l'attention." },
];
const fallbackDiscovery = [
  { id: "1", title: "Maths Terminale C", description: "Annales, videos et exercices corriges.", progress: 0, badge: "Populaire", category: "Examen" },
  { id: "2", title: "Anglais pratique", description: "Grammaire, oral et quiz rapides.", progress: 0, badge: "Nouveau", category: "Langues" },
  { id: "3", title: "Bureautique efficace", description: "Word, Excel et presentations.", progress: 0, badge: "Essentiel", category: "Competences" },
];
const institutionPrograms = [
  { name: "Campus partenaire", type: "Liaison etablissement", note: "Relier une promotion et suivre les inscriptions." },
  { name: "Espace administration", type: "Pilotage", note: "Vue globale sur etudiants, cours et completion." },
  { name: "Catalogues dedies", type: "Contenus", note: "Afficher des cours reserves a un etablissement." },
];
const institutionRooms = [
  { name: "Salle Premiere C", members: "42 apprenants", action: "Exercices de mathematiques a remettre vendredi" },
  { name: "Salle Licence 1 Informatique", members: "68 apprenants", action: "Parcours bureautique et algorithmique active" },
  { name: "Salle Anglais intensif", members: "25 apprenants", action: "Serie de quiz oraux et supports audio" },
];
const includesSearch = (values: unknown[], query: string) =>
  values.map((value) => String(value ?? "")).join(" ").toLowerCase().includes(query);

export default function DashboardPage() {
  const router = useRouter();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const [user] = useState<StoredUser | null>(() => {
    if (typeof window === "undefined") return null;
    const rawUser = localStorage.getItem("kalatty_user");
    if (!rawUser) return null;
    try {
      return JSON.parse(rawUser) as StoredUser;
    } catch {
      return null;
    }
  });
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentView, setStudentView] = useState<StudentView>("home");
  const [studentSearch, setStudentSearch] = useState("");
  const [teacherSearch, setTeacherSearch] = useState("");
  const [institutionSearch, setInstitutionSearch] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("kalatty_token");
    if (!token) {
      startTransition(() => router.push("/login"));
      return;
    }
    const fetchDashboard = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 401) {
            localStorage.removeItem("kalatty_token");
            localStorage.removeItem("kalatty_user");
            startTransition(() => router.push("/login"));
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
    dashboardData?.role ??
    (user?.role === "teacher" ? "teacher" : user?.role === "institution" ? "institution" : "student");
  const profile = dashboardData?.profile ?? user;
  const displayName =
    profile?.fullname?.trim() || (role === "teacher" ? "Formateur" : role === "institution" ? "Etablissement" : "Apprenant");
  const studentCourses = dashboardData?.courses ?? [];
  const teacherCourses = dashboardData?.courses ?? [];
  const heroCourse = studentCourses[0];
  const discoveryCourses =
    studentCourses.length > 0
      ? studentCourses.slice(0, 3).map((course, index) => ({
          id: String(course.id ?? `course-${index}`),
          title: String(course.title ?? "Cours sans titre"),
          description: String(course.description ?? "Parcours a decouvrir sur Kalatty."),
          progress: Number(course.progress ?? 0),
          badge: index === 0 ? "Continue" : "Recommande",
          category: index === 0 ? "Mes cours" : "Pour toi",
        }))
      : fallbackDiscovery;
  const studentQuery = studentSearch.trim().toLowerCase();
  const teacherQuery = teacherSearch.trim().toLowerCase();
  const filteredDiscovery = discoveryCourses.filter((course) =>
    includesSearch([course.title, course.description, course.category, course.badge], studentQuery),
  );
  const filteredStudentCourses = studentCourses.filter((course) =>
    includesSearch([course.title, course.description, course.nextLesson], studentQuery),
  );
  const filteredTeacherCourses = teacherCourses.filter((course) =>
    includesSearch([course.title, course.description, course.priceFcfa, course.learners], teacherQuery),
  );
  const institutionQuery = institutionSearch.trim().toLowerCase();
  const filteredInstitutionRooms = institutionRooms.filter((room) =>
    includesSearch([room.name, room.members, room.action], institutionQuery),
  );
  const handleLogout = () => {
    localStorage.removeItem("kalatty_token");
    localStorage.removeItem("kalatty_user");
    localStorage.removeItem("kalatty_role");
    startTransition(() => router.push("/login"));
  };

  if (loading) {
    return (
      <main className={styles.dashboardShell}>
        <section className={styles.card}>
          <h2>Chargement du dashboard...</h2>
          <p className={styles.paragraph}>Nous recuperons ton profil, tes cours et tes indicateurs depuis Kalatty.</p>
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
      <section className={styles.dashboardMasthead}>
        <div className={styles.dashboardMastheadBrand}>
          <Image
            src="/kalatty-logo.png"
            alt="Logo Kalatty"
            width={56}
            height={56}
            className={styles.dashboardMastheadLogo}
            priority
          />
          <div>
            <span className={styles.dashboardMastheadTag}>Plateforme Kalatty</span>
            <strong className={styles.dashboardMastheadName}>Learning workspace</strong>
          </div>
        </div>
        <div className={styles.dashboardMastheadMeta}>
          <span>{role === "student" ? "Espace etudiant" : role === "teacher" ? "Espace formateur" : "Espace etablissement"}</span>
          <span>{displayName}</span>
        </div>
      </section>

      <section className={styles.hero}>
        <div className={styles.heroTop}>
          <div>
            <div className={styles.heroBrand}>
              <Image
                src="/kalatty-logo.png"
                alt="Logo Kalatty"
                width={84}
                height={84}
                className={styles.heroBrandLogo}
                priority
              />
              <div>
                <p className={styles.kicker}>Dashboard Kalatty</p>
                <strong className={styles.heroBrandName}>Kalatty</strong>
              </div>
            </div>
            <h1>
              {role === "student"
                ? `Bon retour, ${displayName}`
                : role === "teacher"
                  ? `Espace formateur, ${displayName}`
                  : `Campus digital, ${displayName}`}
            </h1>
            <p className={styles.heroText}>
              {role === "student"
                ? "Accueil catalogue, reprise des cours et lien avec l'etablissement."
                : role === "teacher"
                  ? "Pilote tes contenus, retrouve tes cours et filtre rapidement."
                  : "Regroupe tes eleves, cree des salles et organise les exercices."}
            </p>
          </div>

          <div className={styles.actions}>
            {role === "student" ? (
              <label className={styles.viewPicker}>
                <span>Menu etudiant</span>
                <select value={studentView} onChange={(event) => setStudentView(event.target.value as StudentView)}>
                  <option value="home">Accueil</option>
                  <option value="progress">Suivi des cours</option>
                  <option value="institutions">Etablissements</option>
                </select>
              </label>
            ) : null}
            <div className={styles.roleBadge}>
              {role === "student" ? "Interface etudiant" : role === "teacher" ? "Interface enseignant" : "Interface etablissement"}
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
            <span className={styles.profileLabel}>Profil Kalatty</span>
            <strong>{role === "student" ? "Etudiant" : role === "teacher" ? "Enseignant" : "Etablissement"}</strong>
            <span>
              {role === "student"
                ? profile?.level || "Niveau a completer dans le profil"
                : role === "teacher"
                  ? profile?.expertise || "Expertise a completer dans le profil"
                  : profile?.expertise || profile?.school_name || "Type d'etablissement a completer"}
            </span>
          </div>
        </div>
      </section>

      {role === "student" ? (
        <>
          <section className={styles.studentSwitch}>
            <div className={styles.studentTabs}>
              <button type="button" className={studentView === "home" ? styles.activeTab : styles.studentTab} onClick={() => setStudentView("home")}>Accueil</button>
              <button type="button" className={studentView === "progress" ? styles.activeTab : styles.studentTab} onClick={() => setStudentView("progress")}>Suivi des cours</button>
              <button type="button" className={studentView === "institutions" ? styles.activeTab : styles.studentTab} onClick={() => setStudentView("institutions")}>Etablissements</button>
            </div>
          </section>

          {studentView === "home" ? (
            <section className={styles.grid}>
              <div className={styles.primaryColumn}>
                <section className={styles.studentShowcase}>
                  <div className={styles.showcaseCopy}>
                    <p className={styles.sectionLabel}>Accueil etudiant</p>
                    <h2>Reprendre vite et decouvrir la suite</h2>
                    <p className={styles.paragraph}>Une page d&apos;accueil plus catalogue, inspiree des plateformes de cours.</p>
                    <div className={styles.showcaseStats}>
                      <article className={styles.showcaseStat}><span>Cours actifs</span><strong>{dashboardData?.stats.enrolledCourses ?? 0}</strong></article>
                      <article className={styles.showcaseStat}><span>Lecons terminees</span><strong>{dashboardData?.stats.completedLessons ?? 0}</strong></article>
                      <article className={styles.showcaseStat}><span>Progression</span><strong>{dashboardData?.stats.progressAverage ?? 0}%</strong></article>
                    </div>
                  </div>
                  <div className={styles.showcaseCourse}>
                    <span className={styles.showcaseBadge}>A reprendre</span>
                    <h3>{String(heroCourse?.title ?? "Ton prochain cours t'attend")}</h3>
                    <p>{String(heroCourse?.nextLesson ?? "Retrouve ici le prochain cours et les raccourcis utiles.")}</p>
                    <div className={styles.progressTrack}>
                      <div className={styles.progressFill} style={{ width: `${Number(heroCourse?.progress ?? 0)}%` }} />
                    </div>
                    <small>{Number(heroCourse?.progress ?? 0)}% complete</small>
                  </div>
                </section>

                <section className={styles.card}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <p className={styles.sectionLabel}>Pour toi</p>
                      <h2>Parcours a la une</h2>
                    </div>
                    <span className={styles.sectionHint}>{profile?.school_name || "Selection adaptee au profil etudiant"}</span>
                  </div>
                  <label className={styles.searchBar}>
                    <span>Recherche etudiant</span>
                    <input type="search" placeholder="Rechercher un cours, une lecon ou un parcours" value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} />
                  </label>
                  <div className={styles.discoveryGrid}>
                    {filteredDiscovery.map((course) => (
                      <article key={course.id} className={styles.discoveryCard}>
                        <div className={styles.discoveryTop}>
                          <span className={styles.discoveryBadge}>{course.badge}</span>
                          <small>{course.category}</small>
                        </div>
                        <h3>{course.title}</h3>
                        <p>{course.description}</p>
                        <div className={styles.discoveryFooter}>
                          <strong>{course.progress}%</strong>
                          <span>Reprendre</span>
                        </div>
                      </article>
                    ))}
                  </div>
                  {filteredDiscovery.length === 0 ? <p className={styles.paragraph}>Aucun parcours ne correspond a cette recherche.</p> : null}
                </section>
              </div>

              <div className={styles.sideColumn}>
                <section className={styles.cardAccent}>
                  <p className={styles.sectionLabel}>A faire maintenant</p>
                  <h2>Focus du jour</h2>
                  <ul className={styles.simpleList}>{(dashboardData?.tasks ?? []).map((task) => <li key={task}>{task}</li>)}</ul>
                </section>
                <section className={styles.card}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <p className={styles.sectionLabel}>Planification</p>
                      <h2>Mon rythme de la semaine</h2>
                    </div>
                  </div>
                  <div className={styles.timeline}>
                    {studentTimeline.map((item) => (
                      <div key={`${item.day}-${item.topic}`} className={styles.timelineItem}>
                        <strong>{item.day}</strong>
                        <div><p>{item.topic}</p><span>{item.time}</span></div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </section>
          ) : null}

          {studentView === "progress" ? (
            <section className={styles.grid}>
              <div className={styles.primaryColumn}>
                <section className={styles.card}>
                  <div className={styles.sectionHeader}>
                    <div><p className={styles.sectionLabel}>Suivi des cours</p><h2>Mes cours en cours</h2></div>
                    <span className={styles.sectionHint}>Pret pour un detail de modules et lecons</span>
                  </div>
                  <label className={styles.searchBar}>
                    <span>Recherche etudiant</span>
                    <input type="search" placeholder="Filtrer mes cours et prochaines lecons" value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} />
                  </label>
                  <div className={styles.statsRow}>
                    <article className={styles.statCard}><span>Cours inscrits</span><strong>{dashboardData?.stats.enrolledCourses ?? 0}</strong><small>Parcours actuellement actives</small></article>
                    <article className={styles.statCard}><span>Lecons terminees</span><strong>{dashboardData?.stats.completedLessons ?? 0}</strong><small>Progression reelle depuis Supabase</small></article>
                    <article className={styles.statCard}><span>Progression moyenne</span><strong>{dashboardData?.stats.progressAverage ?? 0}%</strong><small>Total des modules engages</small></article>
                  </div>
                  <div className={styles.courseList}>
                    {filteredStudentCourses.length > 0 ? filteredStudentCourses.map((course) => (
                      <article key={String(course.id)} className={styles.courseCard}>
                        <div className={styles.courseHead}>
                          <div><h3>{String(course.title ?? "Cours sans titre")}</h3><p>{String(course.nextLesson ?? "Aucune lecon commencee")}</p></div>
                          <span>{Number(course.progress ?? 0)}%</span>
                        </div>
                        <div className={styles.progressTrack}>
                          <div className={styles.progressFill} style={{ width: `${Number(course.progress ?? 0)}%` }} />
                        </div>
                        <small>{String(course.description ?? "Cours en progression")}</small>
                      </article>
                    )) : <p className={styles.paragraph}>{studentCourses.length > 0 ? "Aucun cours ne correspond a cette recherche." : "Aucun cours n'est encore lie a ce compte."}</p>}
                  </div>
                </section>
              </div>
              <div className={styles.sideColumn}>
                <section className={styles.card}>
                  <p className={styles.sectionLabel}>Lecture rapide</p>
                  <h2>Prochaine etape</h2>
                  <p className={styles.paragraph}>La prochaine evolution logique est un menu deroulant par cours avec modules, lecons et exercices.</p>
                </section>
              </div>
            </section>
          ) : null}

          {studentView === "institutions" ? (
            <section className={styles.grid}>
              <div className={styles.primaryColumn}>
                <section className={styles.card}>
                  <div className={styles.sectionHeader}>
                    <div><p className={styles.sectionLabel}>Etablissements</p><h2>Espace de liaison etudiant</h2></div>
                    <span className={styles.sectionHint}>Concu pour lycees, universites et centres partenaires</span>
                  </div>
                  <label className={styles.searchBar}>
                    <span>Recherche institutionnelle</span>
                    <input type="search" placeholder="Rechercher une salle, un groupe ou une action" value={institutionSearch} onChange={(event) => setInstitutionSearch(event.target.value)} />
                  </label>
                  <div className={styles.institutionGrid}>
                    {institutionPrograms.map((item) => (
                      <article key={item.name} className={styles.institutionCard}>
                        <span>{item.type}</span><h3>{item.name}</h3><p>{item.note}</p>
                      </article>
                    ))}
                  </div>
                </section>
                <section className={styles.card}>
                  <div className={styles.sectionHeader}>
                    <div><p className={styles.sectionLabel}>Salles et groupes</p><h2>Ce qu&apos;on pourra brancher ensuite</h2></div>
                  </div>
                  <div className={styles.roadmapList}>
                    {filteredInstitutionRooms.map((room) => (
                      <article key={room.name} className={styles.roadmapItem}>
                        <strong>{room.name}</strong><p>{room.members}</p><p>{room.action}</p>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
              <div className={styles.sideColumn}>
                <section className={styles.cardAccent}>
                  <p className={styles.sectionLabel}>Profil rattache</p>
                  <h2>Mon etablissement</h2>
                  <p className={styles.paragraph}>{profile?.school_name ? `Compte actuellement relie a ${profile.school_name}.` : "Aucun etablissement n'est encore relie a ce compte."}</p>
                </section>
              </div>
            </section>
          ) : null}
        </>
      ) : role === "teacher" ? (
        <section className={styles.grid}>
          <div className={styles.primaryColumn}>
            <section className={styles.card}>
              <div className={styles.sectionHeader}>
                <div><p className={styles.sectionLabel}>Vue enseignant</p><h2>Pilotage des cours</h2></div>
                <span className={styles.sectionHint}>{profile?.expertise || "Creation, suivi, diffusion"}</span>
              </div>
              <label className={styles.searchBar}>
                <span>Recherche enseignant</span>
                <input type="search" placeholder="Rechercher un cours, un prix ou un groupe d'apprenants" value={teacherSearch} onChange={(event) => setTeacherSearch(event.target.value)} />
              </label>
              <div className={styles.statsRow}>
                <article className={styles.statCard}><span>Cours publies</span><strong>{dashboardData?.stats.publishedCourses ?? 0}</strong><small>Recuperes depuis Supabase</small></article>
                <article className={styles.statCard}><span>Apprenants totaux</span><strong>{dashboardData?.stats.totalLearners ?? 0}</strong><small>Somme des inscriptions sur tes cours</small></article>
                <article className={styles.statCard}><span>Moyenne / cours</span><strong>{dashboardData?.stats.averageLearners ?? 0}</strong><small>Apprenants par cours publie</small></article>
              </div>
              <div className={styles.teacherCourseGrid}>
                {filteredTeacherCourses.length > 0 ? filteredTeacherCourses.map((course) => (
                  <article key={String(course.id)} className={styles.teacherCourseCard}>
                    <div className={styles.teacherMeta}><span>{Number(course.lessonsCount ?? 0)} lecons</span><strong>{Number(course.learners ?? 0)} apprenants</strong></div>
                    <h3>{String(course.title ?? "Cours sans titre")}</h3>
                    <p>{String(course.description ?? "Description a completer")}</p>
                    <div className={styles.courseMetaGrid}>
                      <span>{Number(course.priceFcfa ?? 0)} FCFA</span>
                      <span>{String(course.videoUrl ?? "") ? "Video reliee" : "Video a ajouter"}</span>
                      <span>{String(course.thumbnailUrl ?? "") ? "Miniature prete" : "Miniature manquante"}</span>
                    </div>
                  </article>
                )) : <p className={styles.paragraph}>{teacherCourses.length > 0 ? "Aucun cours ne correspond a cette recherche." : "Aucun cours n'est encore rattache a cet enseignant."}</p>}
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.sectionHeader}>
                <div><p className={styles.sectionLabel}>Insights</p><h2>Tendances utiles</h2></div>
              </div>
              <div className={styles.insightGrid}>
                {teacherInsights.map((insight) => (
                  <article key={insight.title} className={styles.insightCard}>
                    <span>{insight.title}</span><strong>{insight.value}</strong><p>{insight.note}</p>
                  </article>
                ))}
              </div>
            </section>

            <TeacherCourseBuilder
              apiBaseUrl={apiBaseUrl}
              onCourseCreated={(updater) =>
                setDashboardData((current) => {
                  if (!current) return current;
                  const next = updater({ stats: current.stats, courses: current.courses });
                  if (!next) return current;
                  return { ...current, stats: next.stats, courses: next.courses };
                })
              }
            />
          </div>

          <div className={styles.sideColumn}>
            <section className={styles.cardAccent}>
              <p className={styles.sectionLabel}>Operations du jour</p>
              <h2>Checklist formateur</h2>
              <ul className={styles.simpleList}>{(dashboardData?.tasks ?? []).map((task) => <li key={task}>{task}</li>)}</ul>
            </section>
            <section className={styles.card}>
              <p className={styles.sectionLabel}>Revenus</p>
              <h2>Remuneration enseignant</h2>
              <div className={styles.revenueGrid}>
                <article className={styles.revenueCard}><span>Montant cumule</span><strong>{dashboardData?.stats.totalRevenue ?? 0} FCFA</strong><small>Somme totale generee par tes cours</small></article>
                <article className={styles.revenueCard}><span>Ce mois-ci</span><strong>{dashboardData?.stats.monthRevenue ?? 0} FCFA</strong><small>Revenus recents des inscriptions payantes</small></article>
              </div>
            </section>
          </div>
        </section>
      ) : (
        <InstitutionWorkspace apiBaseUrl={apiBaseUrl} />
      )}
    </main>
  );
}
