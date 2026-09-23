"use client";

import Link from "next/link";
import Shell from "../Shell";
import { useEstablishmentHome } from "../useEstablishment";
import { SessionPanel, type TeacherHomeData } from "../views";
import { Icon } from "../ui";
import styles from "../student/student-pages.module.css";

export default function SessionsPage() {
  const { context, data, loading, error, mismatch, reload } = useEstablishmentHome<TeacherHomeData>("teacher");
  if (mismatch) return <section className={styles.standalone}>Cette page ne correspond pas à votre rôle. <Link href={`/establishment/${mismatch.campusRole}`}>Ouvrir mon espace</Link></section>;
  const next = data?.nextCourse;
  return <Shell role="teacher" activeSlug="seances" displayName={context?.displayName} institutionName={context?.institutionName} note={error ?? null}>
    <header className={styles.head}><div><small>ESPACE PROFESSEUR</small><h1>Séances et présences</h1><p>Appel et cahier de texte du prochain créneau de vos classes aujourd’hui.</p></div><Link href="/establishment/teacher" className={styles.back}>← Accueil</Link></header>
    {loading ? <section className={styles.state}>Chargement…</section> : error ? <section className={styles.state} role="alert">{error}</section> : next ? <article className={styles.tile}><span className={styles.icon}><Icon name="calendar" /></span><small>{next.startsAt}{next.endsAt ? ` – ${next.endsAt}` : ""} · {next.room}</small><h2>{next.title}</h2>{next.roomSubjectId ? <SessionPanel roomId={next.roomId} roomSubjectId={next.roomSubjectId} onDone={reload} /> : <p>Aucune matière affectée à cette classe. Demandez son affectation à la direction.</p>}</article> : <section className={styles.state}><h2>Aucune séance à venir aujourd’hui</h2><Link href="/establishment/teacher/schedule">Voir le planning de mes classes →</Link></section>}
  </Shell>;
}
