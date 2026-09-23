"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Shell from "../Shell";
import { campusFetch, useCampusContext } from "../useEstablishment";
import { Icon } from "../ui";
import styles from "./student-pages.module.css";

type Room = { id: string; name: string; description: string; teachers: string[] };
type Schedule = { id: string; roomId: string; roomName: string; title: string; weekday: number; startsAt: string; endsAt: string | null; location: string };
type Course = { id: string; title: string; description: string; roomName: string };
type Grade = { id: string; title: string; roomName: string; score: number; maxScore: number; feedback: string; reviewedAt: string | null };
type Overview = { rooms: Room[]; schedule: Schedule[]; courses: Course[]; grades: Grade[] };
type Section = "schedule" | "subjects" | "class" | "results" | "documents";
const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const TITLES: Record<Section, string> = { schedule: "Mon emploi du temps", subjects: "Mes matières", class: "Ma classe", results: "Mes résultats", documents: "Mes documents" };

export default function StudentPages({ section }: { section: Section }) {
  const { loading: contextLoading, error: contextError, context, mismatch } = useCampusContext("student");
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

  if (mismatch) return <section className={styles.standalone}>Cette page est réservée aux étudiants. <Link href={`/establishment/${mismatch.campusRole}`}>Ouvrir mon espace</Link></section>;

  const daily = data?.schedule.filter((item) => item.weekday === selectedDay) ?? [];
  return <Shell role="student" activeSlug={section} displayName={context?.displayName} institutionName={context?.institutionName} note={contextError ?? null}>
    <header className={styles.head}><div><small>ESPACE ÉTUDIANT</small><h1>{TITLES[section]}</h1><p>{context?.institutionName ?? "Votre établissement"}</p></div><Link href="/establishment/student" className={styles.back}>← Accueil</Link></header>
    {loading || contextLoading ? <div className={styles.state}>Chargement des données de votre établissement…</div> : error || contextError ? <div className={styles.state} role="alert">{error ?? contextError}</div> : !data ? null : <>
      {section === "schedule" ? <><nav className={styles.days} aria-label="Jours de la semaine">{DAYS.map((day, index) => <button type="button" key={day} className={selectedDay === index + 1 ? styles.selected : ""} onClick={() => setSelectedDay(index + 1)}>{day}</button>)}</nav>{daily.length ? <div className={styles.stack}>{daily.map((item) => <article className={styles.card} key={item.id}><time>{item.startsAt} – {item.endsAt ?? "—"}</time><div><h2>{item.title}</h2><p>{item.roomName}{item.location ? ` · ${item.location}` : ""}</p></div><Icon name="calendar" /></article>)}</div> : <Empty text={`Aucun cours prévu ${DAYS[selectedDay - 1].toLowerCase()}.`} />}</> : null}
      {section === "subjects" ? data.courses.length ? <div className={styles.grid}>{data.courses.map((course) => <article className={styles.tile} key={course.id}><span className={styles.icon}><Icon name="book" /></span><small>{course.roomName}</small><h2>{course.title}</h2><p>{course.description || "Formation attribuée à votre classe."}</p><Link href={`/learning/apprenant/formations/${course.id}`}>Ouvrir la formation →</Link></article>)}</div> : <Empty text="Aucun cours en ligne n’est encore attribué à votre classe." /> : null}
      {section === "class" ? data.rooms.length ? <div className={styles.grid}>{data.rooms.map((room) => <article className={styles.tile} key={room.id}><span className={styles.icon}><Icon name="users" /></span><h2>{room.name}</h2><p>{room.description || "Votre classe dans l’établissement."}</p><strong>Professeur{room.teachers.length > 1 ? "s" : ""}</strong><p>{room.teachers.length ? room.teachers.join(", ") : "Aucun professeur affecté"}</p><Link href="/establishment/student/schedule">Voir le planning →</Link></article>)}</div> : <Empty text="Vous n’êtes pas encore affecté à une classe." /> : null}
      {section === "results" ? data.grades.length ? <div className={styles.stack}>{data.grades.map((grade) => <article className={styles.card} key={grade.id}><span className={styles.score}>{grade.score}/{grade.maxScore || "—"}</span><div><h2>{grade.title}</h2><p>{grade.roomName}{grade.feedback ? ` · ${grade.feedback}` : ""}</p></div><Icon name="award" /></article>)}</div> : <Empty text="Aucune note publiée pour le moment. Les résultats apparaîtront après correction." /> : null}      {section === "documents" ? <div className={styles.tile}><span className={styles.icon}><Icon name="file" /></span><h2>Pièces de vos travaux</h2><p>Consultez vos devoirs, leurs consignes et les remises effectuées. Aucun document officiel personnel n’est actuellement disponible dans cet espace.</p><Link href="/establishment/student/assignments">Consulter mes travaux →</Link></div> : null}    </>}
  </Shell>;
}

function Empty({ text }: { text: string }) { return <section className={styles.state}><Icon name="book" /><h2>Aucun élément</h2><p>{text}</p></section>; }
