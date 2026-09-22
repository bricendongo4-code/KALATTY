"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Shell from "../Shell";
import { campusFetch, useCampusContext } from "../useCampusHome";
import type { RoleSlug } from "../roles";
import { Icon } from "../ui";
import styles from "../etudiant/student-pages.module.css";

type Assignment = { id: string; title: string; roomName: string; status: string; dueAt: string | null; maxScore: number | null };
export default function AssignmentsPage({ role }: { role: Extract<RoleSlug, "direction" | "pedagogie"> }) {
  const { context, loading, error: contextError, mismatch } = useCampusContext(role);
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!context) return;
    campusFetch("/campus/staff/assignments").then((result) => setAssignments(result.assignments ?? []))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Évaluations indisponibles."));
  }, [context]);
  if (mismatch) return <section className={styles.standalone}>Cette page ne correspond pas à votre rôle. <Link href={`/campus/${mismatch.campusRole}`}>Ouvrir mon espace</Link></section>;
  return <Shell role={role} activeSlug="evaluations" displayName={context?.displayName} institutionName={context?.institutionName} note={contextError ?? null}>
    <header className={styles.head}><div><small>ESPACE {role.toUpperCase()}</small><h1>Évaluations</h1><p>Devoirs enregistrés dans les classes de votre périmètre.</p></div><Link href={`/campus/${role}`} className={styles.back}>← Accueil</Link></header>
    {loading || !assignments && !error ? <section className={styles.state}>Chargement…</section> : error ? <section className={styles.state} role="alert">{error}</section> : assignments?.length ? <div className={styles.stack}>{assignments.map((item) => <article className={styles.card} key={item.id}><span className={styles.icon}><Icon name="clipboard" /></span><div><h2>{item.title}</h2><p>{item.roomName} · {item.status === "published" ? "Publié" : "Brouillon"}{item.dueAt ? ` · Échéance ${new Date(item.dueAt).toLocaleDateString("fr-FR")}` : ""}</p></div></article>)}</div> : <section className={styles.state}><h2>Aucun devoir enregistré</h2></section>}
  </Shell>;
}
