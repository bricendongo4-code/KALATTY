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
    assessments: { title: "Évaluations", text: "Quiz, exercices, projets et éléments à corriger.", tabs: ["À corriger", "Quiz", "Projets", "Résultats"] },
    notifications: { title: "Notifications", text: "Informations et alertes liées à vos formations.", tabs: ["Toutes", "Non lues"] },
    analytics: { title: "Analytics", text: "Mesurez l’activité et la performance réelle de vos formations.", tabs: ["Vue d’ensemble", "Par formation", "Progression"] },
    profile: { title: "Profil formateur", text: "Bio, expertise, identité publique et paramètres de versement.", tabs: ["Profil public"] },
  },
};

function CourseCard({ course, trainer }: { course: CourseData; trainer: boolean }) {
  const progress = Number(course.progress ?? 0);
  const href = trainer
    ? course.id ? `/creator/courses/${course.id}/builder` : "/creator/courses/new"
    : course.id ? `/learn/courses/${course.id}` : "/learn/explore";
  return <article className={styles.liveCourseCard}>
    <div className={styles.liveCourseCover}>{course.thumbnailUrl ? <span style={{ backgroundImage: `url(${course.thumbnailUrl})` }} /> : <Icon name="book" />}</div>
    <div className={styles.liveCourseBody}>
      <small>{trainer ? `${course.learners ?? 0} apprenant(s)` : course.teacherName ?? "Formateur Kalatty"}</small>
      <h2>{course.title ?? "Formation"}</h2>
      <p>{course.description || `${course.lessonsCount ?? 0} leçon(s) disponible(s).`}</p>
      {!trainer ? <div className={styles.liveProgress}><Progress value={progress} color={progress > 55 ? "green" : "orange"} /><b>{progress}%</b></div> : null}
      <div><strong>{course.priceFcfa ? `${new Intl.NumberFormat("fr-FR").format(course.priceFcfa)} FCFA` : trainer ? `${course.lessonsCount ?? 0} leçon(s)` : "Inclus"}</strong><Link href={href}>{trainer ? "Gérer" : progress ? "Continuer" : "Découvrir"}</Link></div>
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
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Connexion au serveur impossible.");
    } finally {
      setLoading(false);
    }
  }, [basePath, router, slug]);

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
  const tabCourses = slug === "certificates" ? completedCourses : slug === "explore" && activeTab === "Gratuites" ? courses.filter((course) => !Number(course.priceFcfa ?? 0)) : slug === "explore" && activeTab === "Payantes" ? courses.filter((course) => Number(course.priceFcfa ?? 0) > 0) : slug === "my-courses" && activeTab === "Terminées" ? completedCourses : slug === "my-courses" && activeTab === "En cours" ? courses.filter((course) => Number(course.progress ?? 0) < 100) : role === "formateur" && activeTab === "Publiées" ? courses.filter((course) => course.status === "published") : role === "formateur" && activeTab === "Brouillons" ? courses.filter((course) => course.status !== "published") : courses;
  const visibleCourses = searchQuery ? tabCourses.filter((course) => `${course.title ?? ""} ${course.description ?? ""} ${course.teacherName ?? ""}`.toLocaleLowerCase("fr").includes(searchQuery)) : tabCourses;
  const visibleNotifications = activeTab === "Non lues" ? notifications.filter((item) => !item.read) : activeTab === "Cours" ? notifications.filter((item) => item.type === "course") : activeTab === "Paiements" ? notifications.filter((item) => item.type === "payment") : notifications;
  const showCourses = ["explore", "my-courses", "certificates", "courses"].includes(slug);

  async function openNotification(item: Notification) {
    const token = localStorage.getItem("kalatty_token");
    setNotifications((current) => current.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry));
    if (token && !item.read) await fetch(`${API_BASE}/notifications/${encodeURIComponent(item.id)}/read`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
    if (item.href?.startsWith("/") && !item.href.startsWith("//")) router.push(item.href);
  }

  return <>
    <header className={styles.pageHead}><div><h1>{details.title}</h1><p>{details.text}</p></div>{role === "formateur" && slug === "courses" ? <Link href="/creator/courses/new" className={styles.primaryButton}><Icon name="plus" /> Créer une formation</Link> : null}</header>
    {searchQuery ? <p className={styles.builderMessage}>Résultats pour « {searchParams.get("q")} »</p> : null}
    {["explore", "my-courses", "courses", "notifications"].includes(slug) ? <nav className={styles.tabs}>{details.tabs.map((tab) => <button key={tab} type="button" className={activeTab === tab ? styles.tabActive : ""} onClick={() => setActiveTab(tab)}>{tab}</button>)}</nav> : null}
    {slug === "profile" ? <AccountSettings /> : null}
    {slug === "notifications" ? <section className={styles.panel}><div className={styles.sectionHead}><h2>Activité récente</h2><button onClick={() => void load()}>Actualiser</button></div>{visibleNotifications.length ? <div className={styles.notificationList}>{visibleNotifications.map((item) => <button type="button" key={item.id} onClick={() => void openNotification(item)}><span><Icon name={item.read ? "mail" : "bell"} /></span><div><strong>{item.title ?? "Notification"}</strong><p>{item.message ?? ""}</p></div><small>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("fr-FR") : ""}</small></button>)}</div> : <div className={styles.empty}><Icon name="mail" /><h3>Aucune notification</h3><p>Vous êtes à jour.</p></div>}</section> : null}
    {showCourses ? visibleCourses.length ? <div className={styles.liveCourseGrid}>{visibleCourses.map((course) => <CourseCard key={course.id ?? course.title} course={course} trainer={role === "formateur"} />)}</div> : <section className={`${styles.panel} ${styles.empty}`}><Icon name={slug === "certificates" ? "award" : "book"} /><h3>{slug === "certificates" ? "Aucun certificat disponible" : "Aucun élément disponible"}</h3><p>{slug === "certificates" ? "Un certificat apparaîtra après validation des conditions de réussite." : "Créez ou rejoignez une formation pour alimenter cette rubrique."}</p>{role === "apprenant" ? <Link href="/learn/explore" className={styles.smallButton}>Explorer les formations</Link> : <Link href="/creator/courses/new" className={styles.smallButton}>Créer une formation</Link>}</section> : null}
    {role === "apprenant" && slug === "activities" ? <section className={`${styles.panel} ${styles.empty}`}><Icon name="clipboard" /><h3>Aucune activité à rendre</h3><p>Les quiz et exercices de vos formations apparaîtront ici.</p><Link href="/learn/my-courses" className={styles.smallButton}>Voir mes formations</Link></section> : null}
    {role === "formateur" && ["media", "assessments"].includes(slug) ? <section className={styles.panel}><h2>{details.title}</h2><p>Les médias et évaluations sont liés aux leçons de vos formations.</p><Link href={slug === "media" ? "/creator/studio" : "/creator/courses"} className={styles.primaryButton}>{slug === "media" ? "Ouvrir le studio" : "Gérer mes formations"}</Link></section> : null}
    {role === "formateur" && ["learners", "analytics"].includes(slug) ? <section className={styles.panel}><h2>{slug === "learners" ? "Inscriptions par formation" : "Activité de mes formations"}</h2>{courses.length ? <div className={styles.notificationList}>{courses.map((course) => <Link key={course.id ?? course.title} href={course.id ? `/creator/courses/${course.id}/builder` : "/creator/courses"}><strong>{course.title}</strong> · {course.learners ?? 0} apprenant(s) · {course.lessonsCount ?? 0} leçon(s)</Link>)}</div> : <p>Aucune formation créée pour le moment.</p>}</section> : null}
  </>;
}
