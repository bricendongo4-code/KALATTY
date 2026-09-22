"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Shell from "../Shell";
import { campusFetch, useCampusContext } from "../useCampusHome";
import { Icon } from "../ui";
import styles from "./student-pages.module.css";

type Announcement = { id: string; title: string; body: string; createdAt: string; roomId: string | null };
type Notification = { id: string; title: string; message: string; createdAt: string; href?: string; read: boolean };

export default function StudentActivityPage({ section }: { section: "actualites" | "messagerie" }) {
  const { loading: contextLoading, error: contextError, context, mismatch } = useCampusContext("etudiant");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (section === "actualites") {
        const result = await campusFetch("/campus/student/announcements");
        setAnnouncements(result.announcements ?? []);
      } else {
        const result = await campusFetch("/notifications");
        setNotifications(result.notifications ?? []);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => { if (context) void load(); }, [context, load]);

  const openNotification = async (item: Notification) => {
    if (!item.read) {
      try {
        await campusFetch(`/notifications/${encodeURIComponent(item.id)}/read`, { method: "PATCH" });
        setNotifications((items) => items.map((current) => current.id === item.id ? { ...current, read: true } : current));
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Impossible de marquer la notification comme lue.");
        return;
      }
    }
    if (item.href?.startsWith("/") && !item.href.startsWith("//")) window.location.assign(item.href);
  };

  if (mismatch) return <section className={styles.standalone}>Cette page est réservée aux étudiants. <Link href={`/campus/${mismatch.campusRole}`}>Ouvrir mon espace</Link></section>;

  return <Shell role="etudiant" activeSlug={section} displayName={context?.displayName} institutionName={context?.institutionName} note={contextError ?? null}>
    <header className={styles.head}><div><small>ESPACE ÉTUDIANT</small><h1>{section === "actualites" ? "Actualités" : "Notifications"}</h1><p>{section === "actualites" ? "Annonces de votre établissement et de vos classes." : "Informations et alertes liées à votre compte."}</p></div><Link href="/campus/etudiant" className={styles.back}>← Accueil</Link></header>
    {loading || contextLoading ? <section className={styles.state}>Chargement…</section> : error || contextError ? <section className={styles.state} role="alert"><p>{error ?? contextError}</p><button type="button" onClick={() => void load()}>Réessayer</button></section> : section === "actualites" ? announcements.length ? <div className={styles.stack}>{announcements.map((item) => <article className={styles.tile} key={item.id}><small>{item.roomId ? "Ma classe" : "Établissement"} · {new Date(item.createdAt).toLocaleDateString("fr-FR")}</small><h2>{item.title}</h2><p>{item.body}</p></article>)}</div> : <section className={styles.state}><Icon name="megaphone" /><h2>Aucune actualité</h2><p>Les annonces publiées pour votre établissement apparaîtront ici.</p></section> : notifications.length ? <div className={styles.stack}>{notifications.map((item) => <button type="button" className={`${styles.notification} ${!item.read ? styles.unread : ""}`} key={item.id} onClick={() => void openNotification(item)}><Icon name="bell" /><span><strong>{item.title}</strong><small>{item.message}</small><small>{new Date(item.createdAt).toLocaleDateString("fr-FR")}</small></span>{item.href ? <Icon name="chevron" /> : null}</button>)}</div> : <section className={styles.state}><Icon name="bell" /><h2>Aucune notification</h2><p>Vous êtes à jour.</p></section>}
  </Shell>;
}
