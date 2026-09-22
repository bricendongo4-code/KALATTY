"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Shell from "../Shell";
import { campusFetch, useCampusContext } from "../useCampusHome";
import { Icon } from "../ui";
import styles from "./student-pages.module.css";

type Room = { id: string; name: string; description: string; teachers: string[] };
type Schedule = { id: string; roomId: string; roomName: string; title: string; weekday: number; startsAt: string; endsAt: string | null; location: string };
type Course = { id: string; title: string; description: string; roomName: string };
type Grade = { id: string; title: string; roomName: string; score: number; maxScore: number; feedback: string; reviewedAt: string | null };
type Overview = { rooms: Room[]; schedule: Schedule[]; courses: Course[]; grades: Grade[] };
type Section = "emploi-du-temps" | "cours" | "classe" | "resultats" | "evaluations";
const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const TITLES: Record<Section, string> = { "emploi-du-temps": "Mon emploi du temps", cours: "Mes cours", classe: "Ma classe", resultats: "Mes résultats", evaluations: "Mes évaluations" };

export default function StudentPages({ section }: { section: Section }) {
  const { loading: contextLoading, error: contextError, context, mismatch } = useCampusContext("etudiant");
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() || 7);

  useEffect(() => {
    if (!context) return;
    let active = true;
    campusFetch("/campus/student/overview")
      .then((result) => { if (active) setData(result as Overview); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Chargement impossible."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [context]);

  if (mismatch) return <section className={styles.standalone}>Cette page est réservée aux étudiants. <Link href={`/campus/${mismatch.campusRole}`}>Ouvrir mon espace</Link></section>;

  const daily = data?.schedule.filter((item) => item.weekday === selectedDay) ?? [];
  return <Shell role="etudiant" activeSlug={section} displayName={context?.displayName} institutionName={context?.institutionName} note={contextError ?? null}>
    <header className={styles.head}><div><small>ESPACE ÉTUDIANT</small><h1>{TITLES[section]}</h1><p>{context?.institutionName ?? "Votre établissement"}</p></div><Link href="/campus/etudiant" className={styles.back}>← Accueil</Link></header>
    {loading || contextLoading ? <div className={styles.state}>Chargement des données de votre établissement…</div> : error || contextError ? <div className={styles.state} role="alert">{error ?? contextError}</div> : !data ? null : <>
      {section === "emploi-du-temps" ? <><nav className={styles.days} aria-label="Jours de la semaine">{DAYS.map((day, index) => <button type="button" key={day} className={selectedDay === index + 1 ? styles.selected : ""} onClick={() => setSelectedDay(index + 1)}>{day}</button>)}</nav>{daily.length ? <div className={styles.stack}>{daily.map((item) => <article className={styles.card} key={item.id}><time>{item.startsAt} – {item.endsAt ?? "—"}</time><div><h2>{item.title}</h2><p>{item.roomName}{item.location ? ` · ${item.location}` : ""}</p></div><Icon name="calendar" /></article>)}</div> : <Empty text={`Aucun cours prévu ${DAYS[selectedDay - 1].toLowerCase()}.`} />}</> : null}
      {section === "cours" ? data.courses.length ? <div className={styles.grid}>{data.courses.map((course) => <article className={styles.tile} key={course.id}><span className={styles.icon}><Icon name="book" /></span><small>{course.roomName}</small><h2>{course.title}</h2><p>{course.description || "Formation attribuée à votre classe."}</p><Link href={`/learning/apprenant/formations/${course.id}`}>Ouvrir la formation →</Link></article>)}</div> : <Empty text="Aucun cours en ligne n’est encore attribué à votre classe." /> : null}
      {section === "classe" ? data.rooms.length ? <div className={styles.grid}>{data.rooms.map((room) => <article className={styles.tile} key={room.id}><span className={styles.icon}><Icon name="users" /></span><h2>{room.name}</h2><p>{room.description || "Votre classe dans l’établissement."}</p><strong>Professeur{room.teachers.length > 1 ? "s" : ""}</strong><p>{room.teachers.length ? room.teachers.join(", ") : "Aucun professeur affecté"}</p><Link href="/campus/etudiant/emploi-du-temps">Voir le planning →</Link></article>)}</div> : <Empty text="Vous n’êtes pas encore affecté à une classe." /> : null}
      {section === "resultats" ? data.grades.length ? <div className={styles.stack}>{data.grades.map((grade) => <article className={styles.card} key={grade.id}><span className={styles.score}>{grade.score}/{grade.maxScore || "—"}</span><div><h2>{grade.title}</h2><p>{grade.roomName}{grade.feedback ? ` · ${grade.feedback}` : ""}</p></div><Icon name="award" /></article>)}</div> : <Empty text="Aucune note publiée pour le moment. Les résultats apparaîtront après correction." /> : null}
      {section === "evaluations" ? <div className={styles.tile}><span className={styles.icon}><Icon name="clipboard" /></span><h2>Évaluations et travaux</h2><p>Les devoirs publiés, leurs échéances et vos remises se trouvent dans « Mes travaux ». Vos notes corrigées apparaissent dans « Mes résultats ».</p><div className={styles.actions}><Link href="/campus/etudiant/travaux">Voir mes travaux →</Link><Link href="/campus/etudiant/resultats">Voir mes résultats →</Link></div></div> : null}
    </>}
  </Shell>;
}

function Empty({ text }: { text: string }) { return <section className={styles.state}><Icon name="book" /><h2>Aucun élément</h2><p>{text}</p></section>; }
