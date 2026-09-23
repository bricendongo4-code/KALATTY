"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import Shell from "../Shell";
import { Icon } from "../ui";
import { campusFetch, useCampusContext } from "../useEstablishment";
import styles from "./student-pages.module.css";

type Justification = {
  id: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewNote: string | null;
  attachmentUrl: string | null;
};

type AttendanceRecord = {
  id: string;
  roomName: string;
  sessionTitle: string;
  sessionDate: string | null;
  status: "present" | "late" | "absent" | "excused";
  note: string | null;
  justification: Justification | null;
};

const ATTENDANCE_LABELS: Record<AttendanceRecord["status"], string> = {
  present: "Présent",
  late: "En retard",
  absent: "Absent",
  excused: "Absence justifiée",
};

const JUSTIFICATION_LABELS: Record<Justification["status"], string> = {
  pending: "En cours d’examen",
  approved: "Accepté",
  rejected: "Refusé",
};

export default function StudentAttendancePage() {
  const { loading: contextLoading, error: contextError, context, mismatch } = useCampusContext("student");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!context) return;
    setLoading(true);
    setError(null);
    try {
      const result = await campusFetch("/campus/student/attendance");
      setRecords(result.attendance ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chargement des présences impossible.");
    } finally {
      setLoading(false);
    }
  }, [context]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(recordId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusyId(recordId);
    setMessage(null);
    try {
      await campusFetch(`/campus/student/attendance/${encodeURIComponent(recordId)}/justification`, {
        method: "POST",
        body: data,
      });
      setMessage("Votre justificatif a bien été transmis à l’établissement.");
      setEditingId(null);
      form.reset();
      await load();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Envoi du justificatif impossible.");
    } finally {
      setBusyId(null);
    }
  }

  if (mismatch) {
    return <section className={styles.standalone}>Cette page est réservée aux étudiants. <Link href={`/establishment/${mismatch.campusRole}`}>Ouvrir mon espace</Link></section>;
  }

  const total = records.length;
  const present = records.filter((item) => item.status === "present").length;
  const issues = records.filter((item) => item.status === "absent" || item.status === "late").length;
  const rate = total ? Math.round(((present + records.filter((item) => item.status === "excused").length) / total) * 100) : 0;

  return <Shell role="student" activeSlug="attendance" displayName={context?.displayName} institutionName={context?.institutionName} note={contextError ?? null}>
    <header className={styles.head}>
      <div><small>VIE SCOLAIRE</small><h1>Mes présences</h1><p>Consultez vos appels et transmettez un justificatif à votre établissement.</p></div>
      <Link href="/establishment/student" className={styles.back}>← Accueil</Link>
    </header>

    {message ? <p className={styles.feedback} role="status">{message}</p> : null}
    {loading || contextLoading ? <section className={styles.state}>Chargement de votre historique…</section> : error || contextError ? <section className={styles.state} role="alert">{error ?? contextError}</section> : <>
      <section className={styles.attendanceSummary} aria-label="Synthèse de présence">
        <article><span>Taux de présence</span><strong>{rate}%</strong></article>
        <article><span>Appels enregistrés</span><strong>{total}</strong></article>
        <article><span>Retards ou absences</span><strong>{issues}</strong></article>
      </section>

      {records.length ? <div className={styles.attendanceList}>{records.map((record) => {
        const canSubmit = (record.status === "absent" || record.status === "late") && (!record.justification || record.justification.status === "rejected");
        return <article className={styles.attendanceCard} key={record.id}>
          <div className={styles.attendanceDate}>
            <Icon name={record.status === "present" || record.status === "excused" ? "checkCircle" : "alert"} />
            <time>{record.sessionDate ? new Date(`${record.sessionDate}T12:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "Date non renseignée"}</time>
          </div>
          <div className={styles.attendanceMain}>
            <div><small>{record.roomName}</small><h2>{record.sessionTitle}</h2>{record.note ? <p>{record.note}</p> : null}</div>
            <span className={`${styles.statusPill} ${styles[`status_${record.status}`]}`}>{ATTENDANCE_LABELS[record.status]}</span>
          </div>

          {record.justification ? <div className={styles.justificationState}>
            <div><strong>{JUSTIFICATION_LABELS[record.justification.status]}</strong><p>{record.justification.reason}</p>{record.justification.reviewNote ? <small>Réponse : {record.justification.reviewNote}</small> : null}</div>
            {record.justification.attachmentUrl ? <a href={record.justification.attachmentUrl} target="_blank" rel="noreferrer">Voir la pièce</a> : null}
          </div> : null}

          {canSubmit ? editingId === record.id ? <form className={styles.justificationForm} onSubmit={(event) => void submit(record.id, event)}>
            <label>Motif<textarea name="reason" required minLength={10} maxLength={1000} rows={4} placeholder="Expliquez la raison de votre absence ou de votre retard…" /></label>
            <label>Pièce facultative<input name="file" type="file" accept="application/pdf,image/png,image/jpeg" /><small>PDF, PNG ou JPEG, 5 Mo maximum.</small></label>
            <div><button type="submit" disabled={busyId === record.id}>{busyId === record.id ? "Envoi…" : "Transmettre"}</button><button type="button" className={styles.secondaryButton} onClick={() => setEditingId(null)}>Annuler</button></div>
          </form> : <button type="button" className={styles.justifyButton} onClick={() => { setEditingId(record.id); setMessage(null); }}>Justifier cette {record.status === "late" ? "arrivée tardive" : "absence"}</button> : null}
        </article>;
      })}</div> : <section className={styles.state}><Icon name="checkCircle" /><h2>Aucun appel enregistré</h2><p>Votre historique apparaîtra après le premier appel effectué par un professeur.</p></section>}
    </>}
  </Shell>;
}
