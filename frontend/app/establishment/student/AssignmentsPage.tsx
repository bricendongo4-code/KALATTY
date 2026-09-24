"use client";

import { useEffect, useState } from "react";
import styles from "../establishment.module.css";
import Shell from "../Shell";
import { useCampusContext, campusFetch, campusUpload } from "../useEstablishment";
import { Badge, Card, Icon } from "../ui";

type Submission = {
  id: string;
  status: string;
  content: string | null;
  filePath: string | null;
  score: number | null;
  feedback: string | null;
  submittedAt: string | null;
};

type Assignment = {
  id: string;
  roomId: string;
  roomName: string;
  title: string;
  instructions: string | null;
  dueAt: string | null;
  maxScore: number | null;
  attachments: Array<{ id: string; name: string; type: string; url: string | null }>;
  submission: Submission | null;
};

function dueLabel(dueAt: string | null) {
  if (!dueAt) return "Sans échéance";
  const date = new Date(dueAt);
  const overdue = date.getTime() < Date.now();
  const text = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(date);
  return overdue ? `Échéance dépassée (${text})` : `À rendre le ${text}`;
}

function statusBadge(a: Assignment) {
  if (!a.submission) return <Badge kind="urgent">À rendre</Badge>;
  if (a.submission.status === "reviewed" && a.submission.score !== null) {
    return <Badge kind="ok">Corrigé : {a.submission.score}/{a.maxScore ?? "?"}</Badge>;
  }
  if (a.submission.status === "returned") return <Badge kind="warn">À corriger de nouveau</Badge>;
  return <Badge kind="info">Rendu, en attente de correction</Badge>;
}

export default function AssignmentsPage() {
  const { loading, error, context, mismatch } = useCampusContext("student");
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = async () => {
    try {
      const result = await campusFetch("/campus/my-assignments");
      setAssignments(result.assignments ?? []);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Impossible de charger les devoirs.");
    }
  };

  useEffect(() => {
    if (context) void load();
     
  }, [context]);

  const submit = async (a: Assignment) => {
    const content = (drafts[a.id] ?? "").trim();
    const file = files[a.id] ?? null;
    if (!content && !file) {
      setSubmitError("Ajoute un texte ou un fichier avant de rendre ce devoir.");
      return;
    }
    setSubmitting(a.id);
    setSubmitError(null);
    try {
      let filePath = "";
      if (file) {
        const uploaded = await campusUpload(`/institutions/rooms/${a.roomId}/submission-files`, file);
        filePath = String(uploaded.path ?? "");
      }
      await campusFetch(`/institutions/rooms/${a.roomId}/assignments/${a.id}/submissions`, {
        method: "POST",
        body: JSON.stringify({ content: content || undefined, file_path: filePath || undefined }),
      });
      setOpenId(null);
      await load();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Impossible d'envoyer la remise.");
    } finally {
      setSubmitting(null);
    }
  };

  if (mismatch) {
    return (
      <section className={`${styles.card} ${styles.soon}`} style={{ margin: 24 }}>
        <h2>Ce n&apos;est pas votre espace</h2>
        <p>Cette page est réservée aux comptes étudiant.</p>
      </section>
    );
  }

  return (
    <Shell role="student" activeSlug="assignments" displayName={context?.displayName} institutionName={context?.institutionName} note={error ?? null}>
      {loading ? (
        <p>Chargement...</p>
      ) : (
        <>
          <div className={styles.pageHead}>
            <div>
              <h1 className={styles.headTitle}>Mes travaux</h1>
              <p className={styles.headSub}>Tous les devoirs publiés dans tes classes, avec leur état.</p>
            </div>
          </div>

          {listError ? <p className={styles.inlineError}>{listError}</p> : null}

          {!assignments ? (
            <p>Chargement...</p>
          ) : assignments.length === 0 ? (
            <Card title="Aucun devoir pour l'instant">
              <p style={{ color: "var(--muted)", fontSize: 13 }}>Rien à rendre : tes classes n&apos;ont pas encore publié de devoir.</p>
            </Card>
          ) : (
            <div className={styles.stack}>
              {assignments.map((a) => (
                <Card key={a.id} title={a.title}>
                  <div className={styles.rowMain} style={{ marginBottom: 8 }}>
                    <small>{a.roomName} • {dueLabel(a.dueAt)}</small>
                  </div>
                  {a.instructions ? <p style={{ fontSize: 13, marginBottom: 8 }}>{a.instructions}</p> : null}
                  {a.attachments?.length ? <div className={styles.assignmentAttachments}>{a.attachments.map((file) => file.url ? <a key={file.id} href={file.url} target="_blank" rel="noreferrer"><Icon name="file" className={styles.navIcon} /> {file.name}</a> : <span key={file.id}><Icon name="file" className={styles.navIcon} /> {file.name} indisponible</span>)}</div> : null}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    {statusBadge(a)}
                    {a.submission?.feedback ? <small style={{ color: "var(--muted)" }}>« {a.submission.feedback} »</small> : null}
                  </div>

                  {openId === a.id ? (
                    <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                      <textarea
                        className={styles.select}
                        style={{ width: "100%", height: 70 }}
                        placeholder="Ta réponse..."
                        value={drafts[a.id] ?? a.submission?.content ?? ""}
                        onChange={(e) => setDrafts((d) => ({ ...d, [a.id]: e.target.value }))}
                      />
                      <input
                        type="file"
                        onChange={(e) => setFiles((f) => ({ ...f, [a.id]: e.target.files?.[0] ?? null }))}
                      />
                      {submitError ? <p className={styles.inlineError}>{submitError}</p> : null}
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" className={styles.btn} disabled={submitting === a.id} onClick={() => submit(a)}>
                          {submitting === a.id ? "Envoi..." : a.submission ? "Renvoyer ce devoir" : "Rendre ce devoir"}
                        </button>
                        <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setOpenId(null)}>
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : !a.submission || ["returned", "draft"].includes(a.submission.status) ? (
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnGhost}`}
                      style={{ marginTop: 10 }}
                      onClick={() => setOpenId(a.id)}
                    >
                      <Icon name="edit" className={styles.navIcon} />
                      {a.submission ? "Corriger ma remise" : "Rendre ce devoir"}
                    </button>
                  ) : null}
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
