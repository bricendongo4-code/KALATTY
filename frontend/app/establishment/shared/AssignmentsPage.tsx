"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Shell from "../Shell";
import { campusFetch, useCampusContext } from "../useEstablishment";
import type { RoleSlug } from "../roles";
import { Icon } from "../ui";
import styles from "../student/student-pages.module.css";

type Assignment = { id: string; title: string; roomName: string; status: string; dueAt: string | null; maxScore: number | null; submissionCount: number; pendingCount: number; reviewedCount: number; publishedCount: number };
export default function AssignmentsPage({ role }: { role: Extract<RoleSlug, "admin" | "pedagogy"> }) {
  const { context, loading, error: contextError, mismatch } = useCampusContext(role);
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roomFilter, setRoomFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");
  useEffect(() => {
    if (!context) return;
    campusFetch("/campus/staff/assignments").then((result) => setAssignments(result.assignments ?? []))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Évaluations indisponibles."));
  }, [context]);
  if (mismatch) return <section className={styles.standalone}>Cette page ne correspond pas à votre rôle. <Link href={`/establishment/${mismatch.campusRole}`}>Ouvrir mon espace</Link></section>;
  const rooms = [...new Set((assignments ?? []).map((item) => item.roomName))].sort();
  const visible = (assignments ?? []).filter((item) => (roomFilter === "all" || item.roomName === roomFilter) && (statusFilter === "all" || (statusFilter === "pending" ? item.pendingCount > 0 : item.submissionCount > 0 && item.pendingCount === 0)));
  const pending = (assignments ?? []).reduce((sum, item) => sum + item.pendingCount, 0);
  const reviewed = (assignments ?? []).reduce((sum, item) => sum + item.reviewedCount, 0);
  return <Shell role={role} activeSlug={role === "admin" ? "assignments" : "assessments"} displayName={context?.displayName} institutionName={context?.institutionName} note={contextError ?? null}>
    <header className={styles.head}><div><small>{role === "admin" ? "SUPERVISION DIRECTION" : "PILOTAGE PÉDAGOGIQUE"}</small><h1>Évaluations et travaux</h1><p>Suivez les publications, les remises et l’avancement des corrections dans votre périmètre.</p></div><Link href={`/establishment/${role}`} className={styles.back}>← Accueil</Link></header>
    {loading || !assignments && !error ? <section className={styles.state}>Chargement…</section> : error ? <section className={styles.state} role="alert">{error}</section> : assignments?.length ? <>
      <section className={styles.attendanceSummary} aria-label="Synthèse des évaluations"><article><span>Travaux publiés</span><strong>{assignments.filter((item) => item.status === "published").length}</strong></article><article><span>Copies à corriger</span><strong>{pending}</strong></article><article><span>Copies corrigées</span><strong>{reviewed}</strong></article></section>
      <div className={styles.assignmentFilters}><label>Classe<select value={roomFilter} onChange={(event) => setRoomFilter(event.target.value)}><option value="all">Toutes les classes</option>{rooms.map((room) => <option key={room} value={room}>{room}</option>)}</select></label><div className={styles.reviewToolbar}><button type="button" className={statusFilter === "all" ? styles.reviewFilterActive : ""} onClick={() => setStatusFilter("all")}>Tous</button><button type="button" className={statusFilter === "pending" ? styles.reviewFilterActive : ""} onClick={() => setStatusFilter("pending")}>À corriger</button><button type="button" className={statusFilter === "completed" ? styles.reviewFilterActive : ""} onClick={() => setStatusFilter("completed")}>À jour</button></div></div>
      {visible.length ? <div className={styles.stack}>{visible.map((item) => <article className={styles.card} key={item.id}><span className={styles.icon}><Icon name="clipboard" /></span><div><h2>{item.title}</h2><p>{item.roomName} · {item.status === "published" ? "Publié" : "Brouillon"}{item.dueAt ? ` · Échéance ${new Date(item.dueAt).toLocaleDateString("fr-FR")}` : ""}</p><p>{item.submissionCount} remise(s) · {item.pendingCount} à corriger · {item.publishedCount} résultat(s) publié(s)</p></div>{item.pendingCount ? <strong>{item.pendingCount} en attente</strong> : <strong>À jour</strong>}</article>)}</div> : <section className={styles.state}><h2>Aucun résultat pour ce filtre</h2><p>Modifiez la classe ou l’état sélectionné.</p></section>}
    </> : <section className={styles.state}><h2>Aucun devoir enregistré</h2></section>}
  </Shell>;
}
