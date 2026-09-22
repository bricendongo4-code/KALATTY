"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Shell from "../Shell";
import { campusFetch, useCampusContext } from "../useCampusHome";
import { Icon } from "../ui";
import styles from "../etudiant/student-pages.module.css";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
type Slot = { id: string; title: string; roomName: string; weekday: number; startsAt: string; endsAt: string | null; location: string };

export default function TeacherSchedulePage() {
  const { context, loading: contextLoading, error: contextError, mismatch } = useCampusContext("professeur");
  const [schedule, setSchedule] = useState<Slot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [day, setDay] = useState(new Date().getDay() || 7);
  useEffect(() => {
    if (!context) return;
    let active = true;
    campusFetch("/campus/teacher/schedule").then((result) => { if (active) setSchedule(result.schedule ?? []); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Planning indisponible."); });
    return () => { active = false; };
  }, [context]);
  if (mismatch) return <section className={styles.standalone}>Cette page est réservée aux professeurs. <Link href={`/campus/${mismatch.campusRole}`}>Ouvrir mon espace</Link></section>;
  const daily = schedule?.filter((item) => item.weekday === day) ?? [];
  return <Shell role="professeur" activeSlug="emploi-du-temps" displayName={context?.displayName} institutionName={context?.institutionName} note={contextError ?? null}>
    <header className={styles.head}><div><small>ESPACE PROFESSEUR</small><h1>Planning de mes classes</h1><p>Créneaux des classes auxquelles vous êtes affecté.</p></div><Link href="/campus/professeur" className={styles.back}>← Accueil</Link></header>
    {contextLoading || !schedule && !error && !contextError ? <div className={styles.state}>Chargement du planning…</div> : error || contextError ? <div className={styles.state} role="alert">{error ?? contextError}</div> : <><nav className={styles.days} aria-label="Jours de la semaine">{DAYS.map((label, index) => <button type="button" key={label} className={day === index + 1 ? styles.selected : ""} onClick={() => setDay(index + 1)}>{label}</button>)}</nav>{daily.length ? <div className={styles.stack}>{daily.map((slot) => <article className={styles.card} key={slot.id}><time>{slot.startsAt} – {slot.endsAt ?? "—"}</time><div><h2>{slot.title}</h2><p>{slot.roomName}{slot.location ? ` · ${slot.location}` : ""}</p></div><Icon name="calendar" /></article>)}</div> : <section className={styles.state}><h2>Aucun créneau {DAYS[day - 1].toLowerCase()}</h2><p>Le planning est mis à jour par votre établissement.</p></section>}</>}
  </Shell>;
}
