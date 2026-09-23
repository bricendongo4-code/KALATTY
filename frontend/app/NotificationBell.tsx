"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "./establishment/ui";
import styles from "./notification-bell.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  href?: string;
  createdAt: string;
  read: boolean;
};

export default function NotificationBell({ allHref }: { allHref: string }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem("kalatty_token");
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/notifications`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? "Notifications indisponibles.");
      setItems((body.notifications ?? []).slice(0, 6));
      setUnread(Number(body.unreadCount ?? 0));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Notifications indisponibles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (item: NotificationItem) => {
    if (!item.read) {
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry));
      setUnread((current) => Math.max(0, current - 1));
      const token = localStorage.getItem("kalatty_token");
      if (token) await fetch(`${API_BASE}/notifications/${encodeURIComponent(item.id)}/read`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
    }
    if (item.href) window.location.assign(item.href);
  };

  return <details className={styles.root} onToggle={(event) => { if (event.currentTarget.open) load(); }}>
    <summary className={styles.bell} aria-label={`${unread} notification${unread > 1 ? "s" : ""}`}><Icon name="bell" />{unread > 0 ? <span>{unread > 9 ? "9+" : unread}</span> : null}</summary>
    <div className={styles.popover}>
      <header><div><strong>Notifications</strong><small>{unread ? `${unread} non lue${unread > 1 ? "s" : ""}` : "Tout est à jour"}</small></div><button type="button" onClick={load} aria-label="Actualiser"><Icon name="refresh" /></button></header>
      {loading && !items.length ? <p className={styles.state}>Chargement…</p> : error ? <p className={styles.state}>{error}</p> : items.length ? <div className={styles.list}>{items.map((item) => <button type="button" key={item.id} className={item.read ? styles.read : styles.unread} onClick={() => markRead(item)}><span><Icon name={item.read ? "mail" : "bell"} /></span><div><strong>{item.title}</strong><p>{item.message}</p><small>{new Date(item.createdAt).toLocaleDateString("fr-FR")}</small></div></button>)}</div> : <p className={styles.state}>Aucune notification pour le moment.</p>}
      <Link href={allHref} className={styles.allLink}>Voir toutes les notifications</Link>
    </div>
  </details>;
}
