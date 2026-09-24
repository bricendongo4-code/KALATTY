"use client";

import Link from "next/link";
import { useState } from "react";
import Shell from "../Shell";
import { useEstablishmentHome } from "../useEstablishment";
import { SessionPanel, type TeacherHomeData } from "../views";
import { Icon } from "../ui";
import styles from "../student/student-pages.module.css";

export default function SessionsPage() {
  const { context, data, loading, error, mismatch, reload } = useEstablishmentHome<TeacherHomeData>("teacher");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [modeOpen, setModeOpen] = useState(false);

  if (mismatch) return <section className={styles.standalone}>Cette page ne correspond pas à votre rôle. <Link href={`/establishment/${mismatch.campusRole}`}>Ouvrir mon espace</Link></section>;
  const next = data?.nextCourse;
  const effectiveRoomId = selectedRoomId || next?.roomId || data?.classes[0]?.roomId || "";
  const selectedClass = data?.classes.find((item) => item.roomId === effectiveRoomId) ?? null;
  return <Shell role="teacher" activeSlug="sessions" displayName={context?.displayName} institutionName={context?.institutionName} note={error ?? null}>
    <header className={styles.head}><div><small>MODE CLASSE</small><h1>Séances et présences</h1><p>Démarrez une séance, faites l’appel puis complétez le cahier de texte avant de la clôturer.</p></div><Link href="/establishment/teacher" className={styles.back}>← Accueil</Link></header>
    {loading ? <section className={styles.state}>Chargement…</section> : error ? <section className={styles.state} role="alert">{error}</section> : !data?.classes.length ? <section className={styles.state}><Icon name="users" /><h2>Aucune classe affectée</h2><p>La direction doit d’abord vous affecter à une classe et à une matière.</p></section> : <div className={styles.sessionWorkspace}>
      {next ? <article className={styles.sessionNext}><span className={styles.icon}><Icon name="calendar" /></span><div><small>PROCHAIN CRÉNEAU · {next.startsAt}{next.endsAt ? ` – ${next.endsAt}` : ""}</small><h2>{next.title}</h2><p>{next.room} · {next.studentsCount} étudiant(s)</p></div><button type="button" onClick={() => { setSelectedRoomId(next.roomId); setModeOpen(true); }}>Ouvrir cette séance</button></article> : <article className={styles.sessionNext}><div><small>AUJOURD’HUI</small><h2>Aucun créneau à venir</h2><p>Vous pouvez néanmoins ouvrir une séance pour l’une de vos classes ci-dessous.</p></div><Link href="/establishment/teacher/schedule">Voir le planning</Link></article>}
      <section className={styles.sessionPicker}>
        <div><small>CLASSE ET MATIÈRE</small><h2>Choisir le groupe</h2><p>Seules les classes qui vous sont réellement affectées sont proposées.</p></div>
        <select value={effectiveRoomId} onChange={(event) => { setSelectedRoomId(event.target.value); setModeOpen(false); }}>
          {data.classes.map((item) => <option key={item.roomId} value={item.roomId}>{item.name} · {item.subject}</option>)}
        </select>
      </section>
      {selectedClass ? <article className={styles.tile}><div className={styles.sessionClassHead}><span className={styles.icon}><Icon name="users" /></span><div><small>{selectedClass.studentsCount} ÉTUDIANT(S)</small><h2>{selectedClass.name}</h2><p>{selectedClass.subject}</p></div></div>{selectedClass.roomSubjectId ? modeOpen ? <SessionPanel roomId={selectedClass.roomId} roomSubjectId={selectedClass.roomSubjectId} onDone={() => { setModeOpen(false); reload(); }} /> : <button type="button" className={styles.primarySessionButton} onClick={() => setModeOpen(true)}><Icon name="play" /> Démarrer le mode classe</button> : <p className={styles.sessionWarning}>Aucune matière ne vous est affectée dans cette classe. La direction doit compléter l’affectation avant l’appel.</p>}</article> : null}
    </div>}
  </Shell>;
}
