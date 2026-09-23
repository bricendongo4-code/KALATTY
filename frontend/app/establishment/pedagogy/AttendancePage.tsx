"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Shell from "../Shell";
import { campusFetch, useCampusContext } from "../useEstablishment";
import { Icon } from "../ui";
import styles from "../student/student-pages.module.css";

type ReviewStatus = "pending" | "approved" | "rejected";
type Justification = {
  id: string;
  studentName: string;
  roomName: string;
  sessionTitle: string;
  sessionDate: string | null;
  reason: string;
  status: ReviewStatus;
  note: string | null;
  attachmentUrl: string | null;
  createdAt: string;
};

const STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: "À traiter",
  approved: "Accepté",
  rejected: "Refusé",
};

export default function AttendancePage() {
  const { context, loading, error: contextError, mismatch } = useCampusContext("pedagogy");
  const [items, setItems] = useState<Justification[] | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await campusFetch("/campus/staff/justifications");
      setItems(result.justifications ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Justificatifs indisponibles.");
    }
  }, []);

  useEffect(() => {
    if (context) void load();
  }, [context, load]);

  async function review(id: string, status: "approved" | "rejected", note?: string) {
    setBusy(id);
    setError(null);
    setMessage(null);
    try {
      await campusFetch(`/campus/staff/justifications/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status, note: note?.trim() || undefined }),
      });
      setMessage(status === "approved" ? "Le justificatif a été accepté et l’absence est régularisée." : "Le refus a été transmis à l’étudiant.");
      setRejectingId(null);
      setRejectionNote("");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Décision impossible.");
    } finally {
      setBusy(null);
    }
  }

  if (mismatch) return <section className={styles.standalone}>Cette page ne correspond pas à votre rôle. <Link href={`/establishment/${mismatch.campusRole}`}>Ouvrir mon espace</Link></section>;

  const pendingCount = items?.filter((item) => item.status === "pending").length ?? 0;
  const visible = filter === "pending" ? items?.filter((item) => item.status === "pending") : items;

  return <Shell role="pedagogy" activeSlug="vie-scolaire" displayName={context?.displayName} institutionName={context?.institutionName} note={contextError ?? null}>
    <header className={styles.head}>
      <div><small>RESPONSABLE PÉDAGOGIQUE</small><h1>Justificatifs d’absence</h1><p>Contrôlez les pièces et régularisez les présences des classes de votre périmètre.</p></div>
      <Link href="/establishment/pedagogy" className={styles.back}>← Accueil</Link>
    </header>

    <section className={styles.reviewToolbar} aria-label="Filtres des justificatifs">
      <button type="button" className={filter === "pending" ? styles.reviewFilterActive : ""} onClick={() => setFilter("pending")}>À traiter <strong>{pendingCount}</strong></button>
      <button type="button" className={filter === "all" ? styles.reviewFilterActive : ""} onClick={() => setFilter("all")}>Historique <strong>{items?.length ?? 0}</strong></button>
    </section>

    {message ? <p className={styles.feedback} role="status">{message}</p> : null}
    {error || contextError ? <p className={styles.reviewError} role="alert">{error ?? contextError}</p> : null}
    {loading || !items && !error ? <section className={styles.state}>Chargement…</section> : visible?.length ? <div className={styles.reviewList}>{visible.map((item) => <article className={styles.reviewCard} key={item.id}>
      <div className={styles.reviewIdentity}><span className={styles.icon}><Icon name="shield" /></span><div><small>{item.roomName}</small><h2>{item.studentName}</h2><p>{item.sessionTitle}{item.sessionDate ? ` · ${new Date(`${item.sessionDate}T12:00:00`).toLocaleDateString("fr-FR")}` : ""}</p></div></div>
      <span className={`${styles.reviewStatus} ${styles[`reviewStatus_${item.status}`]}`}>{STATUS_LABELS[item.status]}</span>
      <blockquote>{item.reason}</blockquote>
      <div className={styles.reviewMeta}><small>Envoyé le {new Date(item.createdAt).toLocaleDateString("fr-FR")}</small>{item.attachmentUrl ? <a href={item.attachmentUrl} target="_blank" rel="noreferrer"><Icon name="file" /> Consulter la pièce</a> : <small>Aucune pièce jointe</small>}</div>
      {item.note ? <p className={styles.reviewDecision}><strong>Décision :</strong> {item.note}</p> : null}
      {item.status === "pending" ? rejectingId === item.id ? <div className={styles.rejectForm}>
        <label htmlFor={`rejection-${item.id}`}>Motif du refus</label>
        <textarea id={`rejection-${item.id}`} value={rejectionNote} onChange={(event) => setRejectionNote(event.target.value)} minLength={3} maxLength={1000} rows={3} placeholder="Expliquez clairement ce qui manque ou pourquoi la demande est refusée." />
        <div><button type="button" disabled={busy === item.id || rejectionNote.trim().length < 3} onClick={() => void review(item.id, "rejected", rejectionNote)}>Confirmer le refus</button><button type="button" className={styles.secondaryButton} onClick={() => { setRejectingId(null); setRejectionNote(""); }}>Annuler</button></div>
      </div> : <div className={styles.reviewActions}><button type="button" disabled={busy === item.id} onClick={() => void review(item.id, "approved")}>{busy === item.id ? "Traitement…" : "Accepter et régulariser"}</button><button type="button" className={styles.rejectButton} disabled={busy === item.id} onClick={() => { setRejectingId(item.id); setRejectionNote(""); }}>Refuser</button></div> : null}
    </article>)}</div> : <section className={styles.state}><Icon name="checkCircle" /><h2>{filter === "pending" ? "Tout est traité" : "Aucun justificatif"}</h2><p>{filter === "pending" ? "Aucune demande n’attend votre décision." : "Les demandes transmises par les étudiants apparaîtront ici."}</p></section>}
  </Shell>;
}
