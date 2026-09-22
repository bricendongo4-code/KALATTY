"use client";

import Link from "next/link";
import Shell from "../Shell";
import { useCampusHome } from "../useCampusHome";
import type { RoleSlug } from "../roles";
import { Icon } from "../ui";
import styles from "../etudiant/student-pages.module.css";

type Report = { studentsCount: number; teachersCount: number; classesCount: number; formationsCount: number; attendancePct: number; overallProgress: number; progressBySubject: Array<{ subject: string; pct: number }>; rooms: Array<{ id: string; name: string; studentsCount: number }> };
export default function ReportsPage({ role, section }: { role: Extract<RoleSlug, "direction" | "pedagogie">; section: "suivi" | "rapports" }) {
  const { context, data, loading, error, mismatch, reload } = useCampusHome<Report>(role);
  if (mismatch) return <section className={styles.standalone}>Cette page ne correspond pas à votre rôle. <Link href={`/campus/${mismatch.campusRole}`}>Ouvrir mon espace</Link></section>;
  return <Shell role={role} activeSlug={section} displayName={context?.displayName} institutionName={context?.institutionName} note={error ?? null}>
    <header className={styles.head}><div><small>ESPACE {role.toUpperCase()}</small><h1>{section === "rapports" ? "Rapports" : "Suivi académique"}</h1><p>Indicateurs issus des classes, séances et affectations enregistrées.</p></div><button type="button" className={styles.back} onClick={reload}>Actualiser</button></header>
    {loading ? <section className={styles.state}>Chargement…</section> : error ? <section className={styles.state} role="alert">{error}</section> : data ? <><div className={styles.grid}><article className={styles.tile}><span className={styles.icon}><Icon name="users" /></span><h2>{data.studentsCount} étudiants</h2><p>{data.teachersCount} enseignants · {data.classesCount} classes · {data.formationsCount} formations</p></article><article className={styles.tile}><span className={styles.icon}><Icon name="checkCircle" /></span><h2>{data.attendancePct}% de présence</h2><p>À partir des appels enregistrés.</p></article><article className={styles.tile}><span className={styles.icon}><Icon name="chart" /></span><h2>{data.overallProgress}% d’avancement</h2><p>Séances terminées dans les matières suivies.</p></article></div><div className={styles.stack}>{data.progressBySubject.map((item, index) => <article className={styles.card} key={`${item.subject}-${index}`}><strong className={styles.score}>{item.pct}%</strong><div><h2>{item.subject}</h2><p>Progression des séances enregistrées</p></div></article>)}</div><div className={styles.actions}><Link href={`/campus/${role}/${role === "direction" ? "formations-classes" : "classes"}`}>Voir les classes →</Link><Link href={`/campus/${role}/evaluations`}>Voir les évaluations →</Link></div></> : null}
  </Shell>;
}
