"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon, Progress } from "../campus/ui";
import { LEARNING_ROLES, type LearningRole } from "./config";
import type { LearningDashboardData } from "./views";
import AccountSettings from "../AccountSettings";
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
  tasks?: Array<{ label?: string; courseId?: string }>;
};

type Notification = { id: string; title?: string; message?: string; createdAt?: string; read?: boolean; type?: string; href?: string };

const DETAILS: Record<LearningRole, Record<string, { title: string; text: string; tabs: string[] }>> = {
  apprenant: {
    explorer: { title: "Explorer les formations", text: "Découvrez les formations publiées et choisissez votre prochain objectif.", tabs: ["Toutes", "Gratuites", "Payantes", "Nouveautés"] },
    formations: { title: "Mes formations", text: "Reprenez vos formations depuis votre progression enregistrée.", tabs: ["En cours", "Terminées", "Toutes"] },
    certificats: { title: "Mes certificats", text: "Retrouvez les parcours terminés et vos preuves de réussite.", tabs: ["Obtenus", "En cours"] },
    favoris: { title: "Mes favoris", text: "Les formations enregistrées pour plus tard apparaissent ici.", tabs: ["Formations", "Formateurs"] },
    messages: { title: "Messages", text: "Questions et échanges liés à vos formations.", tabs: ["Conversations", "Questions de cours", "Support"] },
    notifications: { title: "Notifications", text: "Toutes les actions importantes de votre apprentissage.", tabs: ["Toutes", "Non lues", "Cours", "Paiements"] },
    profil: { title: "Mon profil", text: "Identité, préférences, sécurité et contextes Kalatty.", tabs: ["Identité", "Préférences", "Sécurité", "Mes espaces"] },
    paiements: { title: "Paiements & factures", text: "Historique de vos transactions.", tabs: ["Transactions"] },
  },
  formateur: {
    formations: { title: "Mes formations", text: "Créez, structurez, publiez et améliorez vos formations.", tabs: ["Brouillons", "Publiées", "Archivées"] },
    mediatheque: { title: "Médiathèque", text: "Vos vidéos, images et documents réutilisables.", tabs: ["Tous les médias", "Vidéos", "Images", "Documents"] },
    apprenants: { title: "Mes apprenants", text: "Suivez les inscriptions et la progression par formation.", tabs: ["Tous", "Actifs", "À relancer", "Certifiés"] },
    evaluations: { title: "Évaluations", text: "Quiz, exercices, projets et éléments à corriger.", tabs: ["À corriger", "Quiz", "Projets", "Résultats"] },
    messages: { title: "Messages", text: "Questions et conversations liées à vos formations.", tabs: ["Conversations", "Questions", "Non lus"] },
    analytics: { title: "Analytics", text: "Mesurez l’activité et la performance réelle de vos formations.", tabs: ["Vue d’ensemble", "Par formation", "Progression"] },
    ressources: { title: "Ressources", text: "Documents et supports associés à vos formations.", tabs: ["Mes ressources", "Partagées", "Récentes"] },
    profil: { title: "Profil formateur", text: "Bio, expertise, identité publique et paramètres de versement.", tabs: ["Profil public", "Expertise", "Paiement", "Sécurité"] },
    studio: { title: "Kalatty Studio", text: "Production vidéo pédagogique.", tabs: ["Projets"] },
    revenus: { title: "Revenus", text: "Suivi des ventes et revenus.", tabs: ["Transactions"] },
  },
};

function CourseCard({ course, trainer }: { course: CourseData; trainer: boolean }) {
  const progress = Number(course.progress ?? 0);
  return <article className={styles.liveCourseCard}>
    <div className={styles.liveCourseCover}>{course.thumbnailUrl ? <span style={{ backgroundImage: `url(${course.thumbnailUrl})` }} /> : <Icon name="book" />}</div>
    <div className={styles.liveCourseBody}><small>{trainer ? `${course.learners ?? 0} apprenant(s)` : course.teacherName ?? "Formateur Kalatty"}</small><h2>{course.title ?? "Formation"}</h2><p>{course.description || `${course.lessonsCount ?? 0} leçon(s) disponible(s).`}</p>{!trainer ? <div className={styles.liveProgress}><Progress value={progress} color={progress > 55 ? "green" : "orange"} /><b>{progress}%</b></div> : null}<div><strong>{course.priceFcfa ? `${new Intl.NumberFormat("fr-FR").format(course.priceFcfa)} FCFA` : trainer ? `${course.lessonsCount ?? 0} leçon(s)` : "Inclus"}</strong><Link href={trainer ? course.id ? `/learning/formateur/formations/${course.id}` : "/learning/formateur/formations/builder" : course.id ? `/learning/apprenant/formations/${course.id}` : "/learning/apprenant/explorer"}>{trainer ? "Gérer" : progress ? "Continuer" : "Découvrir"}</Link></div></div>
  </article>;
}

export default function LearningSectionPage({ role, slug }: { role: LearningRole; slug: string }) {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const details = DETAILS[role][slug] ?? { title: LEARNING_ROLES[role].nav.find((item) => item.slug === slug)?.label ?? "Kalatty", text: "Votre espace Kalatty.", tabs: ["Vue d’ensemble"] };
  const [activeTab, setActiveTab] = useState(details.tabs[0]);

  const load = useCallback(async () => {
    const token = localStorage.getItem("kalatty_token");
    if (!token) return router.replace(`/login?redirect=/learning/${role}/${slug}`);
    setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [dashboardResponse, notificationsResponse] = await Promise.all([
        fetch(`${API_BASE}/dashboard`, { headers }),
        fetch(`${API_BASE}/notifications`, { headers }),
      ]);
      if (dashboardResponse.status === 401) return router.replace(`/login?redirect=/learning/${role}/${slug}`);
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
  }, [role, router, slug]);

  useEffect(() => { load(); }, [load]);

  const expectedRole = role === "apprenant" ? "student" : "teacher";
  const courses = useMemo(() => {
    if (!dashboard) return [];
    if (role === "apprenant" && slug === "explorer") return dashboard.catalogCourses ?? [];
    return dashboard.courses ?? [];
  }, [dashboard, role, slug]);

  if (loading) return <section className={styles.loadingState}><span /><h1>Chargement de {details.title.toLowerCase()}</h1></section>;
  if (error) return <section className={styles.loadingState}><Icon name="alert" /><h1>Chargement impossible</h1><p>{error}</p><button onClick={load}>Réessayer</button></section>;
  if (!dashboard) return null;
  if (dashboard.role !== expectedRole) return <section className={styles.loadingState}><h1>Espace non autorisé</h1><p>Ce profil correspond à un autre contexte Kalatty.</p><Link className={styles.primaryButton} href={dashboard.role === "teacher" ? "/learning/formateur" : dashboard.role === "student" ? "/learning/apprenant" : "/campus"}>Ouvrir mon espace</Link></section>;

  const isCourseScreen = ["explorer", "formations", "certificats", "favoris", "mediatheque", "apprenants", "evaluations", "analytics", "ressources"].includes(slug);
  const completedCourses = courses.filter((course) => Number(course.progress ?? 0) >= 100);
  const visibleCourses = slug === "certificats" ? completedCourses : ["favoris"].includes(slug) ? [] : slug === "explorer" && activeTab === "Gratuites" ? courses.filter((course) => !Number(course.priceFcfa ?? 0)) : slug === "explorer" && activeTab === "Payantes" ? courses.filter((course) => Number(course.priceFcfa ?? 0) > 0) : slug === "formations" && activeTab === "Terminées" ? completedCourses : slug === "formations" && activeTab === "En cours" ? courses.filter((course) => Number(course.progress ?? 0) < 100) : role === "formateur" && activeTab === "Publiées" ? courses.filter((course) => course.status === "published") : role === "formateur" && activeTab === "Brouillons" ? courses.filter((course) => course.status !== "published") : courses;
  const visibleNotifications = activeTab === "Non lues" ? notifications.filter((item) => !item.read) : activeTab === "Cours" ? notifications.filter((item) => item.type === "course") : activeTab === "Paiements" ? notifications.filter((item) => item.type === "payment") : notifications;
  const openNotification = async (item: Notification) => { const token = localStorage.getItem("kalatty_token"); setNotifications((current) => current.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry)); if (token && !item.read) await fetch(`${API_BASE}/notifications/${encodeURIComponent(item.id)}/read`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }); if (item.href) router.push(item.href); };

  return <>
    <header className={styles.pageHead}><div><h1>{details.title}</h1><p>{details.text}</p></div>{role === "formateur" && slug === "formations" ? <Link href="/learning/formateur/formations/builder" className={styles.primaryButton}><Icon name="plus" /> Créer une formation</Link> : null}</header>
    <nav className={styles.tabs}>{details.tabs.map((tab) => <button key={tab} className={activeTab === tab ? styles.tabActive : ""} onClick={() => setActiveTab(tab)}>{tab}</button>)}</nav>

    {slug === "profil" ? <AccountSettings /> : null}

    {["messages", "notifications"].includes(slug) ? <section className={styles.panel}><div className={styles.sectionHead}><h2>{slug === "messages" ? "Conversations et questions" : "Activité récente"}</h2><button onClick={load}>Actualiser</button></div>{visibleNotifications.length ? <div className={styles.notificationList}>{visibleNotifications.map((item) => <button type="button" key={item.id} onClick={() => openNotification(item)}><span><Icon name={item.read ? "mail" : "bell"} /></span><div><strong>{item.title ?? "Notification"}</strong><p>{item.message ?? ""}</p></div><small>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("fr-FR") : ""}</small></button>)}</div> : <div className={styles.empty}><Icon name="mail" /><h3>Aucun élément</h3><p>Aucune notification ne correspond à ce filtre.</p></div>}</section> : null}

    {isCourseScreen ? <>{visibleCourses.length ? <div className={styles.liveCourseGrid}>{visibleCourses.map((course) => <CourseCard key={course.id ?? course.title} course={course} trainer={role === "formateur"} />)}</div> : <section className={`${styles.panel} ${styles.empty}`}><Icon name={slug === "certificats" ? "award" : slug === "favoris" ? "shield" : "book"} /><h3>{slug === "certificats" ? "Aucun certificat disponible" : slug === "favoris" ? "Aucun favori enregistré" : "Aucun élément disponible"}</h3><p>{slug === "certificats" ? "Un certificat apparaîtra après validation des conditions de réussite." : slug === "favoris" ? "Ajoutez une formation à vos favoris depuis le catalogue." : "Créez ou rejoignez une formation pour alimenter cette rubrique."}</p>{role === "apprenant" ? <Link href="/learning/apprenant/explorer" className={styles.smallButton}>Explorer les formations</Link> : slug === "formations" ? <Link href="/learning/formateur/formations/builder" className={styles.smallButton}>Créer une formation</Link> : null}</section>}</> : null}
  </>;
}
