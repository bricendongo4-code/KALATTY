"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Shell from "../Shell";
import { campusFetch, useCampusContext } from "../useEstablishment";
import { Icon } from "../ui";
import styles from "../student/student-pages.module.css";
import type { RoleSlug } from "../roles";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
type Slot = { id: string; title: string; roomName: string; weekday: number; startsAt: string; endsAt: string | null; location: string };

export default function TeacherSchedulePage({ role = "teacher" }: { role?: Extract<RoleSlug, "teacher" | "pedagogy" | "admin"> } = {}) {
  const { context, loading: contextLoading, error: contextError, mismatch } = useCampusContext(role);
  const [schedule, setSchedule] = useState<Slot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [day, setDay] = useState(new Date().getDay() || 7);
  useEffect(() => {
    if (!context) return;
    let active = true;
    campusFetch(role === "teacher" ? "/campus/teacher/schedule" : "/campus/staff/schedule").then((result) => { if (active) setSchedule(result.schedule ?? []); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Planning indisponible."); });
    return () => { active = false; };
  }, [context, role]);
  if (mismatch) return <section className={styles.standalone}>Cette page ne correspond pas à votre rôle. <Link href={`/establishment/${mismatch.campusRole}`}>Ouvrir mon espace</Link></section>;
  const daily = schedule?.filter((item) => item.weekday === day) ?? [];
  return <Shell role={role} activeSlug="schedule" displayName={context?.displayName} institutionName={context?.institutionName} note={contextError ?? null}>
    <header className={styles.head}><div><small>ESPACE {role.toUpperCase()}</small><h1>{role === "teacher" ? "Planning de mes classes" : "Emplois du temps"}</h1><p>{role === "teacher" ? "Créneaux des classes auxquelles vous êtes affecté." : "Créneaux des classes de votre périmètre."}</p></div><Link href={`/establishment/${role}`} className={styles.back}>← Accueil</Link></header>
    {contextLoading || !schedule && !error && !contextError ? <div className={styles.state}>Chargement du planning…</div> : error || contextError ? <div className={styles.state} role="alert">{error ?? contextError}</div> : <><nav className={styles.days} aria-label="Jours de la semaine">{DAYS.map((label, index) => <button type="button" key={label} className={day === index + 1 ? styles.selected : ""} onClick={() => setDay(index + 1)}>{label}</button>)}</nav>{daily.length ? <div className={styles.stack}>{daily.map((slot) => <article className={styles.card} key={slot.id}><time>{slot.startsAt} – {slot.endsAt ?? "—"}</time><div><h2>{slot.title}</h2><p>{slot.roomName}{slot.location ? ` · ${slot.location}` : ""}</p></div><Icon name="calendar" /></article>)}</div> : <section className={styles.state}><h2>Aucun créneau {DAYS[day - 1].toLowerCase()}</h2><p>Le planning est mis à jour par votre établissement.</p></section>}</>}
  </Shell>;
}
