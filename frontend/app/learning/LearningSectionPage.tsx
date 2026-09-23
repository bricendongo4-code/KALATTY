"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import AccountSettings from "../AccountSettings";
import { Icon, Progress } from "../establishment/ui";
import { LEARNING_ROLES, type LearningRole } from "./config";
import type { LearningDashboardData } from "./views";
import styles from "./learning.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type CourseData = {
  id?: string;
  title?: string;
  description?: string;
  progress?: number;
  priceFcfa?: number;
  teacherName?: string;
  learners?: number;
  lessonsCount?: number;
  thumbnailUrl?: string;
  status?: string;
};

type Dashboard = Omit<LearningDashboardData, "courses"> & {
  courses?: CourseData[];
  catalogCourses?: CourseData[];
};

type Notification = {
  id: string;
  title?: string;
  message?: string;
  createdAt?: string;
  read?: boolean;
  type?: string;
  href?: string;
};

type TeacherQuestion = {
  id: string;
  courseId: string;
  courseTitle: string;
  lessonTitle: string;
  authorName: string;
  body: string;
  status: string;
  answer?: string;
  createdAt?: string;
};

type Certificate = { id: string; courseId: string; courseTitle: string; verificationCode: string; issuedAt: string };
type LearnerActivity = { id: string; courseId: string; courseTitle: string; title: string; instructions: string; submissionId?: string | null; answer: string; status: string; score?: number | null; feedback?: string; submittedAt?: string | null };
type TeacherSubmission = { id: string; exerciseTitle: string; courseTitle: string; learnerName: string; answer: string; status: string; score?: number | null; feedback?: string; submitted_at?: string };
type TeacherInsights = {
  summary: { learners: number; activeLearners: number; averageProgress: number; completions: number };
  learners: Array<{ enrollmentId: string; name: string; email: string; courseTitle: string; enrolledAt?: string | null; lastActivity?: string | null; completedLessons: number; totalLessons: number; progress: number; completed: boolean }>;
  courses: Array<{ id: string; title: string; status: string; learners: number; activeLearners: number; completions: number; averageProgress: number }>;
};

const DETAILS: Record<LearningRole, Record<string, { title: string; text: string; tabs: string[] }>> = {
  apprenant: {
    explore: { title: "Explorer les formations", text: "Découvrez les formations publiées et choisissez votre prochain objectif.", tabs: ["Toutes", "Gratuites", "Payantes", "Nouveautés"] },
    "my-courses": { title: "Mes formations", text: "Reprenez vos formations depuis votre progression enregistrée.", tabs: ["En cours", "Terminées", "Toutes"] },
    activities: { title: "Mes activités", text: "Retrouvez les exercices, quiz et travaux associés à vos formations.", tabs: ["À faire", "Terminées"] },
    certificates: { title: "Mes certificats", text: "Retrouvez vos parcours terminés et vos preuves de réussite.", tabs: ["Obtenus", "En cours"] },
    notifications: { title: "Notifications", text: "Toutes les actions importantes de votre apprentissage.", tabs: ["Toutes", "Non lues", "Cours", "Paiements"] },
    billing: { title: "Paiements et factures", text: "Historique de vos transactions.", tabs: ["Transactions"] },
    profile: { title: "Mon profil", text: "Identité, préférences, sécurité et contextes Kalatty.", tabs: ["Identité"] },
  },
  formateur: {
    courses: { title: "Mes formations", text: "Créez, structurez, publiez et améliorez vos formations.", tabs: ["Brouillons", "Publiées", "Archivées"] },
    media: { title: "Médiathèque", text: "Vos vidéos, images et documents réutilisables.", tabs: ["Tous les médias", "Vidéos", "Images", "Documents"] },
    learners: { title: "Mes apprenants", text: "Suivez les inscriptions et la progression par formation.", tabs: ["Tous", "Actifs", "À relancer", "Certifiés"] },
    assessments: { title: "Évaluations", text: "Travaux remis, questions des apprenants et historique des corrections.", tabs: ["À corriger", "Questions", "Historique"] },
    notifications: { title: "Notifications", text: "Informations et alertes liées à vos formations.", tabs: ["Toutes", "Non lues"] },
    analytics: { title: "Analytics", text: "Mesurez l’activité et la performance réelle de vos formations.", tabs: ["Vue d’ensemble", "Par formation", "Progression"] },
    profile: { title: "Profil formateur", text: "Bio, expertise, identité publique et paramètres de versement.", tabs: ["Profil public"] },
  },
};

function CourseCard({ course, trainer }: { course: CourseData; trainer: boolean }) {
  const progress = Number(course.progress ?? 0);
  const learnerHref = course.id
    ? progress > 0 ? `/learn/courses/${course.id}` : `/learn/catalog/${course.id}`
    : "/learn/explore";
  return <article className={styles.liveCourseCard}>
    <div className={styles.liveCourseCover}>{course.thumbnailUrl ? <span style={{ backgroundImage: `url(${course.thumbnailUrl})` }} /> : <Icon name="book" />}</div>
    <div className={styles.liveCourseBody}>
      <small>{trainer ? `${course.learners ?? 0} apprenant(s) · ${course.status === "published" ? "Publiée" : course.status === "archived" ? "Archivée" : "Brouillon"}` : course.teacherName ?? "Formateur Kalatty"}</small>
      <h2>{course.title ?? "Formation"}</h2>
      <p>{course.description || `${course.lessonsCount ?? 0} leçon(s) disponible(s).`}</p>
      {!trainer ? <div className={styles.liveProgress}><Progress value={progress} color={progress > 55 ? "green" : "orange"} /><b>{progress}%</b></div> : null}
      <div><strong>{course.priceFcfa ? `${new Intl.NumberFormat("fr-FR").format(course.priceFcfa)} FCFA` : trainer ? `${course.lessonsCount ?? 0} leçon(s)` : "Inclus"}</strong>{trainer ? <span className={styles.courseCardActions}><Link href={course.id ? `/creator/courses/${course.id}/preview` : "/creator/courses/new"}>Aperçu</Link><Link href={course.id ? `/creator/courses/${course.id}/builder` : "/creator/courses/new"}>Modifier</Link></span> : <Link href={learnerHref}>{progress ? "Continuer" : "Découvrir"}</Link>}</div>
    </div>
  </article>;
}

export default function LearningSectionPage({ role, slug }: { role: LearningRole; slug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const basePath = role === "apprenant" ? "/learn" : "/creator";
  const expectedRole = role === "apprenant" ? "student" : "teacher";
  const details = DETAILS[role][slug] ?? { title: LEARNING_ROLES[role].nav.find((item) => item.slug === slug)?.label ?? "Kalatty", text: "Votre espace Kalatty.", tabs: ["Vue d’ensemble"] };
  const [activeTab, setActiveTab] = useState(details.tabs[0]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [teacherQuestions, setTeacherQuestions] = useState<TeacherQuestion[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [learnerActivities, setLearnerActivities] = useState<LearnerActivity[]>([]);
  const [activityAnswers, setActivityAnswers] = useState<Record<string, string>>({});
  const [teacherSubmissions, setTeacherSubmissions] = useState<TeacherSubmission[]>([]);
  const [teacherInsights, setTeacherInsights] = useState<TeacherInsights | null>(null);
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, { score: string; feedback: string }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchQuery = (searchParams.get("q") ?? "").trim().toLocaleLowerCase("fr");

  const load = useCallback(async () => {
    const token = localStorage.getItem("kalatty_token");
    if (!token) return router.replace(`/login?redirect=${basePath}/${slug}`);
    setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [dashboardResponse, notificationsResponse] = await Promise.all([
        fetch(`${API_BASE}/dashboard`, { headers }),
        fetch(`${API_BASE}/notifications`, { headers }),
      ]);
      if (dashboardResponse.status === 401) return router.replace(`/login?redirect=${basePath}/${slug}`);
      const body = await dashboardResponse.json();
      if (!dashboardResponse.ok) throw new Error(body.message ?? "Impossible de charger cet écran.");
      setDashboard(body as Dashboard);
      if (notificationsResponse.ok) {
        const notificationBody = await notificationsResponse.json();
        setNotifications(Array.isArray(notificationBody) ? notificationBody : notificationBody.notifications ?? []);
      }
      if (role === "formateur" && slug === "assessments") {
        const [questionsResponse, activitiesResponse] = await Promise.all([fetch(`${API_BASE}/courses/teacher/questions`, { headers }), fetch(`${API_BASE}/courses/teacher/activities`, { headers })]);
        const [questionsBody, activitiesBody] = await Promise.all([questionsResponse.json(), activitiesResponse.json()]);
        if (!questionsResponse.ok || !activitiesResponse.ok) throw new Error(questionsBody.message ?? activitiesBody.message ?? "Impossible de charger les évaluations.");
        setTeacherQuestions(questionsBody.questions ?? []);
        setTeacherSubmissions(activitiesBody.submissions ?? []);
      }
      if (role === "formateur" && ["learners", "analytics"].includes(slug)) {
        const insightsResponse = await fetch(`${API_BASE}/courses/teacher/insights`, { headers });
        const insightsBody = await insightsResponse.json();
        if (!insightsResponse.ok) throw new Error(insightsBody.message ?? "Impossible de charger le suivi des apprenants.");
        setTeacherInsights(insightsBody as TeacherInsights);
      }
      if (role === "apprenant" && slug === "certificates") {
        const certificatesResponse = await fetch(`${API_BASE}/courses/learner/certificates`, { headers });
        const certificatesBody = await certificatesResponse.json();
        if (!certificatesResponse.ok) throw new Error(certificatesBody.message ?? "Impossible de charger les certificats.");
        setCertificates(certificatesBody.certificates ?? []);
      }
      if (role === "apprenant" && slug === "activities") {
        const activitiesResponse = await fetch(`${API_BASE}/courses/learner/activities`, { headers });
        const activitiesBody = await activitiesResponse.json();
        if (!activitiesResponse.ok) throw new Error(activitiesBody.message ?? "Impossible de charger les activités.");
        setLearnerActivities(activitiesBody.activities ?? []);
        setActivityAnswers(Object.fromEntries((activitiesBody.activities ?? []).map((item: LearnerActivity) => [item.id, item.answer ?? ""])));
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Connexion au serveur impossible.");
    } finally {
      setLoading(false);
    }
  }, [basePath, role, router, slug]);

  useEffect(() => { void load(); }, [load]);

  const courses = useMemo(() => {
    if (!dashboard) return [];
    return role === "apprenant" && slug === "explore" ? dashboard.catalogCourses ?? [] : dashboard.courses ?? [];
  }, [dashboard, role, slug]);

  if (loading) return <section className={styles.loadingState}><span /><h1>Chargement de {details.title.toLowerCase()}</h1></section>;
  if (error) return <section className={styles.loadingState}><Icon name="alert" /><h1>Chargement impossible</h1><p>{error}</p><button onClick={() => void load()}>Réessayer</button></section>;
  if (!dashboard) return null;
  if (dashboard.role !== expectedRole) return <section className={styles.loadingState}><h1>Espace non autorisé</h1><p>Ce profil correspond à un autre contexte Kalatty.</p><Link className={styles.primaryButton} href={dashboard.role === "teacher" ? "/creator" : dashboard.role === "student" ? "/learn" : "/establishment"}>Ouvrir mon espace</Link></section>;

  const completedCourses = courses.filter((course) => Number(course.progress ?? 0) >= 100);
  const tabCourses = slug === "certificates" ? completedCourses : slug === "explore" && activeTab === "Gratuites" ? courses.filter((course) => !Number(course.priceFcfa ?? 0)) : slug === "explore" && activeTab === "Payantes" ? courses.filter((course) => Number(course.priceFcfa ?? 0) > 0) : slug === "explore" && activeTab === "Nouveautés" ? courses.slice(0, 6) : slug === "my-courses" && activeTab === "Terminées" ? completedCourses : slug === "my-courses" && activeTab === "En cours" ? courses.filter((course) => Number(course.progress ?? 0) < 100) : role === "formateur" && activeTab === "Publiées" ? courses.filter((course) => course.status === "published") : role === "formateur" && activeTab === "Brouillons" ? courses.filter((course) => course.status === "draft") : role === "formateur" && activeTab === "Archivées" ? courses.filter((course) => course.status === "archived") : courses;
  const visibleCourses = searchQuery ? tabCourses.filter((course) => `${course.title ?? ""} ${course.description ?? ""} ${course.teacherName ?? ""}`.toLocaleLowerCase("fr").includes(searchQuery)) : tabCourses;
  const visibleNotifications = activeTab === "Non lues" ? notifications.filter((item) => !item.read) : activeTab === "Cours" ? notifications.filter((item) => item.type === "course") : activeTab === "Paiements" ? notifications.filter((item) => item.type === "payment") : notifications;
  const showCourses = ["explore", "my-courses", "courses"].includes(slug);
  const visibleTeacherSubmissions = activeTab === "Historique"
    ? teacherSubmissions.filter((item) => item.status === "reviewed")
    : teacherSubmissions.filter((item) => item.status !== "reviewed");

  async function openNotification(item: Notification) {
    const token = localStorage.getItem("kalatty_token");
    setNotifications((current) => current.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry));
    if (token && !item.read) await fetch(`${API_BASE}/notifications/${encodeURIComponent(item.id)}/read`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
    if (item.href?.startsWith("/") && !item.href.startsWith("//")) router.push(item.href);
  }

  async function answerQuestion(item: TeacherQuestion) {
    const answer = (questionAnswers[item.id] ?? "").trim();
    if (answer.length < 2) return;
    const token = localStorage.getItem("kalatty_token");
    if (!token) return;
    const response = await fetch(`${API_BASE}/courses/teacher/questions/${item.id}`, { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ answer }) });
    const body = await response.json();
    if (!response.ok) return setError(body.message ?? "Réponse impossible.");
    setTeacherQuestions((current) => current.map((questionItem) => questionItem.id === item.id ? { ...questionItem, status: "answered", answer } : questionItem));
    setQuestionAnswers((current) => ({ ...current, [item.id]: "" }));
  }

  async function shareCertificate(item: Certificate) {
    const text = `Certificat Kalatty · ${item.courseTitle} · Code ${item.verificationCode}`;
    if (navigator.share) await navigator.share({ title: "Certificat Kalatty", text });
    else { await navigator.clipboard.writeText(text); setError(null); }
  }

  async function submitActivity(item: LearnerActivity) {
    const answer = (activityAnswers[item.id] ?? "").trim();
    if (answer.length < 2) return;
    const token = localStorage.getItem("kalatty_token"); if (!token) return;
    const response = await fetch(`${API_BASE}/courses/learner/activities/${item.id}/submit`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ answer }) });
    const body = await response.json();
    if (!response.ok) return setError(body.message ?? "Remise impossible.");
    setLearnerActivities((current) => current.map((activity) => activity.id === item.id ? { ...activity, answer, submissionId: body.submissionId, status: "submitted", score: null, feedback: "", submittedAt: body.submittedAt } : activity));
  }

  async function reviewActivity(item: TeacherSubmission) {
    const draft = reviewDrafts[item.id] ?? { score: "", feedback: "" };
    if (!draft.feedback.trim()) return;
    const token = localStorage.getItem("kalatty_token"); if (!token) return;
    const response = await fetch(`${API_BASE}/courses/teacher/activities/${item.id}`, { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ score: draft.score === "" ? undefined : Number(draft.score), feedback: draft.feedback.trim() }) });
    const body = await response.json();
    if (!response.ok) return setError(body.message ?? "Correction impossible.");
    setTeacherSubmissions((current) => current.map((submission) => submission.id === item.id ? { ...submission, status: "reviewed", score: body.score, feedback: body.feedback } : submission));
  }

  return <>
    <header className={styles.pageHead}><div><h1>{details.title}</h1><p>{details.text}</p></div>{role === "formateur" && slug === "courses" ? <Link href="/creator/courses/new" className={styles.primaryButton}><Icon name="plus" /> Créer une formation</Link> : null}</header>
    {searchQuery ? <p className={styles.builderMessage}>Résultats pour « {searchParams.get("q")} »</p> : null}
    {["explore", "my-courses", "courses", "activities", "notifications"].includes(slug) ? <nav className={styles.tabs}>{details.tabs.map((tab) => <button key={tab} type="button" className={activeTab === tab ? styles.tabActive : ""} onClick={() => setActiveTab(tab)}>{tab}</button>)}</nav> : null}
    {slug === "profile" ? <AccountSettings /> : null}
    {slug === "notifications" ? <section className={styles.panel}><div className={styles.sectionHead}><h2>Activité récente</h2><button onClick={() => void load()}>Actualiser</button></div>{visibleNotifications.length ? <div className={styles.notificationList}>{visibleNotifications.map((item) => <button type="button" key={item.id} onClick={() => void openNotification(item)}><span><Icon name={item.read ? "mail" : "bell"} /></span><div><strong>{item.title ?? "Notification"}</strong><p>{item.message ?? ""}</p></div><small>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("fr-FR") : ""}</small></button>)}</div> : <div className={styles.empty}><Icon name="mail" /><h3>Aucune notification</h3><p>Vous êtes à jour.</p></div>}</section> : null}
    {showCourses ? visibleCourses.length ? <div className={styles.liveCourseGrid}>{visibleCourses.map((course) => <CourseCard key={course.id ?? course.title} course={course} trainer={role === "formateur"} />)}</div> : <section className={`${styles.panel} ${styles.empty}`}><Icon name={slug === "certificates" ? "award" : "book"} /><h3>{slug === "certificates" ? "Aucun certificat disponible" : "Aucun élément disponible"}</h3><p>{slug === "certificates" ? "Un certificat apparaîtra après validation des conditions de réussite." : "Créez ou rejoignez une formation pour alimenter cette rubrique."}</p>{role === "apprenant" ? <Link href="/learn/explore" className={styles.smallButton}>Explorer les formations</Link> : <Link href="/creator/courses/new" className={styles.smallButton}>Créer une formation</Link>}</section> : null}
    {role === "apprenant" && slug === "certificates" ? certificates.length ? <div className={styles.certGrid}>{certificates.map((item) => <article className={styles.certificate} key={item.id}><Icon name="award" /><small>Certificat de réussite</small><h2>{item.courseTitle}</h2><strong>{item.verificationCode}</strong><small>Délivré le {new Date(item.issuedAt).toLocaleDateString("fr-FR")}</small><div><Link href={`/learn/courses/${item.courseId}`}>Revoir la formation</Link><button type="button" onClick={() => void shareCertificate(item)}>Partager</button></div></article>)}</div> : <section className={`${styles.panel} ${styles.empty}`}><Icon name="award" /><h3>Aucun certificat disponible</h3><p>Terminez toutes les leçons d’une formation pour recevoir automatiquement votre certificat.</p><Link href="/learn/my-courses" className={styles.smallButton}>Continuer mes formations</Link></section> : null}
    {role === "apprenant" && slug === "activities" ? <section className={styles.activityWorkspace}>{learnerActivities.filter((item) => activeTab === "Terminées" ? item.status === "reviewed" : item.status !== "reviewed").length ? learnerActivities.filter((item) => activeTab === "Terminées" ? item.status === "reviewed" : item.status !== "reviewed").map((item) => <article key={item.id}><header><span><small>{item.courseTitle}</small><h2>{item.title}</h2></span><b className={item.status === "reviewed" ? styles.statusActive : styles.statusCertified}>{item.status === "reviewed" ? "Corrigée" : item.submissionId ? "Remise" : "À faire"}</b></header><p>{item.instructions || "Répondez à l’activité en vous appuyant sur la formation."}</p><textarea rows={6} value={activityAnswers[item.id] ?? ""} onChange={(event) => setActivityAnswers((current) => ({ ...current, [item.id]: event.target.value }))} disabled={item.status === "reviewed"} placeholder="Votre réponse…" />{item.status === "reviewed" ? <div className={styles.activityFeedback}><strong>{item.score == null ? "Correction disponible" : `${item.score}/100`}</strong><p>{item.feedback}</p></div> : <button type="button" disabled={(activityAnswers[item.id] ?? "").trim().length < 2} onClick={() => void submitActivity(item)}>{item.submissionId ? "Mettre à jour ma remise" : "Remettre l’activité"}</button>}</article>) : <div className={`${styles.panel} ${styles.empty}`}><Icon name="clipboard" /><h3>{activeTab === "Terminées" ? "Aucune activité corrigée" : "Aucune activité à rendre"}</h3><p>Les exercices associés à vos formations apparaîtront ici.</p><Link href="/learn/my-courses" className={styles.smallButton}>Voir mes formations</Link></div>}</section> : null}
    {role === "formateur" && slug === "media" ? <section className={styles.panel}><h2>{details.title}</h2><p>Les médias sont liés aux leçons de vos formations et aux projets du Studio.</p><Link href="/creator/studio" className={styles.primaryButton}>Ouvrir le studio</Link></section> : null}
    {role === "formateur" && slug === "assessments" ? <>{activeTab !== "Questions" ? <section className={styles.reviewWorkspace}><div className={styles.sectionHead}><div><h2>{activeTab === "Historique" ? "Corrections publiées" : "Travaux à corriger"}</h2><p>{visibleTeacherSubmissions.length} remise(s)</p></div></div>{visibleTeacherSubmissions.length ? visibleTeacherSubmissions.map((item) => <article key={item.id}><header><span><strong>{item.learnerName}</strong><small>{item.courseTitle} · {item.exerciseTitle}</small></span><b className={item.status === "reviewed" ? styles.statusActive : styles.statusCertified}>{item.status === "reviewed" ? "Corrigée" : "À corriger"}</b></header><p>{item.answer}</p>{item.status === "reviewed" ? <div className={styles.activityFeedback}><strong>{item.score == null ? "Sans note" : `${item.score}/100`}</strong><p>{item.feedback}</p></div> : <div className={styles.reviewComposer}><label>Note sur 100<input type="number" min={0} max={100} value={reviewDrafts[item.id]?.score ?? ""} onChange={(event) => setReviewDrafts((current) => ({ ...current, [item.id]: { score: event.target.value, feedback: current[item.id]?.feedback ?? "" } }))} /></label><label>Retour à l’apprenant<textarea rows={3} value={reviewDrafts[item.id]?.feedback ?? ""} onChange={(event) => setReviewDrafts((current) => ({ ...current, [item.id]: { score: current[item.id]?.score ?? "", feedback: event.target.value } }))} /></label><button type="button" disabled={!(reviewDrafts[item.id]?.feedback ?? "").trim()} onClick={() => void reviewActivity(item)}>Publier la correction</button></div>}</article>) : <div className={styles.empty}><Icon name="checkCircle" /><h3>{activeTab === "Historique" ? "Aucune correction publiée" : "Aucune remise en attente"}</h3><p>Les travaux correspondants apparaîtront ici.</p></div>}</section> : null}{activeTab === "Questions" ? <section className={styles.questionInbox}><div className={styles.sectionHead}><div><h2>Questions des apprenants</h2><p>{teacherQuestions.filter((item) => item.status !== "answered").length} question(s) en attente</p></div><Link href="/creator/courses">Gérer les contenus</Link></div>{teacherQuestions.length ? teacherQuestions.map((item) => <article key={item.id}><header><span><strong>{item.authorName}</strong><small>{item.courseTitle} · {item.lessonTitle}</small></span><time>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("fr-FR") : ""}</time></header><p>{item.body}</p>{item.status === "answered" ? <div className={styles.answerPublished}><Icon name="checkCircle" /><span><small>Réponse envoyée</small><strong>{item.answer}</strong></span></div> : <div className={styles.answerComposer}><textarea rows={3} value={questionAnswers[item.id] ?? ""} onChange={(event) => setQuestionAnswers((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Rédigez une réponse claire et utile…" /><button type="button" disabled={(questionAnswers[item.id] ?? "").trim().length < 2} onClick={() => void answerQuestion(item)}>Envoyer la réponse</button></div>}</article>) : <div className={styles.empty}><Icon name="checkCircle" /><h3>Aucune question</h3><p>Les questions posées depuis le lecteur apparaîtront ici.</p></div>}</section> : null}</> : null}
    {role === "formateur" && ["learners", "analytics"].includes(slug) && teacherInsights ? <>
      <section className={styles.insightStats}>
        <article><small>Apprenants uniques</small><strong>{teacherInsights.summary.learners}</strong><span>Toutes formations</span></article>
        <article><small>Actifs sur 30 jours</small><strong>{teacherInsights.summary.activeLearners}</strong><span>Activité enregistrée</span></article>
        <article><small>Progression moyenne</small><strong>{teacherInsights.summary.averageProgress}%</strong><span>Leçons terminées</span></article>
        <article><small>Parcours terminés</small><strong>{teacherInsights.summary.completions}</strong><span>Certifiables</span></article>
      </section>
      {slug === "learners" ? <section className={styles.panel}><div className={styles.sectionHead}><div><h2>Suivi individuel</h2><p>Progression réelle par inscription</p></div></div>{teacherInsights.learners.length ? <div className={styles.tableWrap}><table><thead><tr><th>Apprenant</th><th>Formation</th><th>Progression</th><th>Dernière activité</th><th>État</th></tr></thead><tbody>{teacherInsights.learners.map((item) => <tr key={item.enrollmentId}><td><strong>{item.name}</strong><small className={styles.tableSubline}>{item.email}</small></td><td>{item.courseTitle}</td><td><div className={styles.tableProgress}><Progress value={item.progress} color={item.progress >= 70 ? "green" : "orange"} /><b>{item.progress}%</b></div><small className={styles.tableSubline}>{item.completedLessons}/{item.totalLessons} leçons</small></td><td>{item.lastActivity ? new Date(item.lastActivity).toLocaleDateString("fr-FR") : "Pas encore démarrée"}</td><td><b className={item.completed ? styles.statusActive : styles.statusCertified}>{item.completed ? "Terminée" : "En cours"}</b></td></tr>)}</tbody></table></div> : <div className={styles.empty}><Icon name="users" /><h3>Aucun apprenant inscrit</h3><p>Les nouvelles inscriptions apparaîtront ici avec leur progression.</p></div>}</section> : <section className={styles.courseAnalytics}>{teacherInsights.courses.length ? teacherInsights.courses.map((item) => <article key={item.id}><header><span><small>{item.status === "published" ? "PUBLIÉE" : "BROUILLON"}</small><h2>{item.title}</h2></span><Link href={`/creator/courses/${item.id}/builder`}>Ouvrir</Link></header><div className={styles.analyticsMetrics}><span><strong>{item.learners}</strong><small>inscrits</small></span><span><strong>{item.activeLearners}</strong><small>actifs</small></span><span><strong>{item.completions}</strong><small>terminés</small></span></div><div className={styles.analyticsProgress}><span><small>Progression moyenne</small><b>{item.averageProgress}%</b></span><Progress value={item.averageProgress} color={item.averageProgress >= 70 ? "green" : "orange"} /></div></article>) : <div className={`${styles.panel} ${styles.empty}`}><Icon name="chart" /><h3>Aucune donnée à analyser</h3><p>Publiez une formation pour commencer à suivre sa performance.</p></div>}</section>}
    </> : null}
  </>;
}
