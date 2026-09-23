"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Shell from "../Shell";
import { campusFetch, useCampusContext } from "../useEstablishment";
import type { RoleSlug } from "../roles";
import { Icon } from "../ui";
import styles from "./student-pages.module.css";

type Announcement = { id: string; title: string; body: string; createdAt: string; roomId: string | null };
type Notification = { id: string; title: string; message: string; createdAt: string; href?: string; read: boolean };

export default function ActivityPage({ section, role = "student" }: { section: "announcements" | "notifications" | "communication"; role?: RoleSlug }) {
  const { loading: contextLoading, error: contextError, context, mismatch } = useCampusContext(role);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("all");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const isNews = section !== "notifications";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isNews) {
        const result = await campusFetch("/campus/announcements");
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
  }, [isNews]);
  useEffect(() => { if (context) void load(); }, [context, load]);

  const publish = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    setError(null);
    setNotice(null);
    try {
      await campusFetch("/campus/announcements", { method: "POST", body: JSON.stringify({ title, body: message, audience }) });
      setTitle("");
      setMessage("");
      setNotice("Annonce publiée.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Publication impossible.");
    } finally {
      setSending(false);
    }
  };

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

  if (mismatch) return <section className={styles.standalone}>Cette page ne correspond pas à votre rôle. <Link href={`/establishment/${mismatch.campusRole}`}>Ouvrir mon espace</Link></section>;

  return <Shell role={role} activeSlug={section} displayName={context?.displayName} institutionName={context?.institutionName} note={contextError ?? null}>
    <header className={styles.head}><div><small>ESPACE {role.toUpperCase()}</small><h1>{isNews ? "Actualités" : "Notifications"}</h1><p>{isNews ? "Annonces de votre établissement et de vos classes." : "Informations et alertes liées à votre compte."}</p></div><Link href={`/establishment/${role}`} className={styles.back}>← Accueil</Link></header>
    {role === "admin" && isNews ? <form className={styles.tile} onSubmit={(event) => void publish(event)}><h2>Publier une annonce</h2><input required maxLength={160} placeholder="Titre" value={title} onChange={(event) => setTitle(event.target.value)} /><textarea required maxLength={5000} rows={4} placeholder="Message" value={message} onChange={(event) => setMessage(event.target.value)} /><label>Destinataires <select value={audience} onChange={(event) => setAudience(event.target.value)}><option value="all">Tous</option><option value="students">Étudiants</option><option value="teachers">Professeurs</option></select></label><button type="submit" disabled={sending}>{sending ? "Publication…" : "Publier"}</button>{notice ? <p role="status">{notice}</p> : null}</form> : null}
    {loading || contextLoading ? <section className={styles.state}>Chargement…</section> : error || contextError ? <section className={styles.state} role="alert"><p>{error ?? contextError}</p><button type="button" onClick={() => void load()}>Réessayer</button></section> : isNews ? announcements.length ? <div className={styles.stack}>{announcements.map((item) => <article className={styles.tile} key={item.id}><small>{item.roomId ? "Classe" : "Établissement"} · {new Date(item.createdAt).toLocaleDateString("fr-FR")}</small><h2>{item.title}</h2><p>{item.body}</p></article>)}</div> : <section className={styles.state}><Icon name="megaphone" /><h2>Aucune actualité</h2><p>Les annonces publiées apparaîtront ici.</p></section> : notifications.length ? <div className={styles.stack}>{notifications.map((item) => <button type="button" className={`${styles.notification} ${!item.read ? styles.unread : ""}`} key={item.id} onClick={() => void openNotification(item)}><Icon name="bell" /><span><strong>{item.title}</strong><small>{item.message}</small><small>{new Date(item.createdAt).toLocaleDateString("fr-FR")}</small></span>{item.href ? <Icon name="chevron" /> : null}</button>)}</div> : <section className={styles.state}><Icon name="bell" /><h2>Aucune notification</h2><p>Vous êtes à jour.</p></section>}
  </Shell>;
}
