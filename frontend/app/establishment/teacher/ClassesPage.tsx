"use client";

import { useEffect, useState } from "react";
import styles from "../establishment.module.css";
import Shell from "../Shell";
import { useEstablishmentHome, campusFetch, campusUpload } from "../useEstablishment";
import type { TeacherHomeData } from "../views";
import { Avatar, Badge, Card, Icon, Row } from "../ui";

type RoomDetails = {
  id: string;
  name: string;
  courses: Array<{ id: string; course: { id: string; title: string; description?: string } | null }>;
  members: Array<{ id: string; role: string; profile: { id: string; fullname: string; email: string } | null }>;
  assignments: Array<{
    id: string;
    title: string;
    due_at: string | null;
    max_score: number | null;
    status: string;
    submissionCount: number;
    reviewedCount: number;
    pendingCount: number;
  }>;
  recentSubmissions: Array<{
    id: string;
    status: string;
    submittedAt: string | null;
    score: number | null;
    content: string | null;
    filePath: string | null;
    assignmentTitle: string;
    studentName: string;
  }>;
};

export default function ClassesPage({ section = "classes" }: { section?: "classes" | "travaux" | "suivi" | "ressources" | "preparer" } = {}) {
  const { loading, error, context, mismatch, data } = useEstablishmentHome<TeacherHomeData>("teacher");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);

  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [maxScore, setMaxScore] = useState("20");
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [reviewFor, setReviewFor] = useState<string | null>(null);
  const [reviewScore, setReviewScore] = useState("");
  const [reviewFeedback, setReviewFeedback] = useState("");

  useEffect(() => {
    if (data && data.classes.length > 0 && !roomId) {
      setRoomId(data.classes[0].roomId);
    }
  }, [data, roomId]);

  const loadRoom = async (id: string) => {
    setRoomError(null);
    try {
      const result = await campusFetch(`/institutions/rooms/${id}`);
      setRoom(result);
    } catch (e) {
      setRoomError(e instanceof Error ? e.message : "Impossible de charger cette classe.");
    }
  };

  useEffect(() => {
    if (roomId) void loadRoom(roomId);
  }, [roomId]);

  const createAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId) return;
    setBusy(true);
    setFormError(null);
    try {
      const uploaded = assignmentFile
        ? await campusUpload(`/institutions/rooms/${roomId}/assignment-files`, assignmentFile)
        : null;
      await campusFetch(`/institutions/rooms/${roomId}/assignments`, {
        method: "POST",
        body: JSON.stringify({
          title,
          instructions: instructions || undefined,
          due_at: dueAt ? new Date(dueAt).toISOString() : undefined,
          max_score: maxScore ? Number(maxScore) : undefined,
          attachment_path: uploaded?.path,
          attachment_name: uploaded?.name,
          attachment_type: uploaded?.mimetype,
        }),
      });
      setTitle("");
      setInstructions("");
      setDueAt("");
      setAssignmentFile(null);
      setShowAssignmentForm(false);
      await loadRoom(roomId);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Impossible de publier ce devoir.");
    } finally {
      setBusy(false);
    }
  };

  const submitReview = async (submissionId: string, status: "reviewed" | "returned") => {
    setBusy(true);
    try {
      await campusFetch(`/institutions/submissions/${submissionId}/review`, {
        method: "PATCH",
        body: JSON.stringify({
          score: reviewScore ? Number(reviewScore) : undefined,
          feedback: reviewFeedback || undefined,
          status,
        }),
      });
      setReviewFor(null);
      setReviewScore("");
      setReviewFeedback("");
      if (roomId) await loadRoom(roomId);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Impossible d'enregistrer la correction.");
    } finally {
      setBusy(false);
    }
  };

  if (mismatch) {
    return (
      <section className={`${styles.card} ${styles.soon}`} style={{ margin: 24 }}>
        <h2>Ce n&apos;est pas votre espace</h2>
        <p>Cette page est réservée aux comptes professeur.</p>
      </section>
    );
  }

  return (
    <Shell role="teacher" activeSlug={section} displayName={context?.displayName} institutionName={context?.institutionName} note={error ?? null}>
      {loading ? (
        <p>Chargement...</p>
      ) : !data || data.classes.length === 0 ? (
        <Card title="Aucune classe affectée">
          <p style={{ color: "var(--muted)", fontSize: 13 }}>Vous n&apos;êtes affecté à aucune classe pour l&apos;instant.</p>
        </Card>
      ) : (
        <>
          <div className={styles.pageHead}>
            <div>
              <h1 className={styles.headTitle}>{section === "travaux" ? "Travaux et corrections" : section === "suivi" ? "Suivi de mes étudiants" : section === "ressources" ? "Ressources de mes classes" : section === "preparer" ? "Préparer mes activités" : "Mes classes"}</h1>
              <p className={styles.headSub}>Effectif, devoirs et corrections, classe par classe.</p>
            </div>
            <select className={styles.select} value={roomId ?? ""} onChange={(e) => setRoomId(e.target.value)}>
              {data.classes.map((c) => (
                <option key={c.roomId} value={c.roomId}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {roomError ? <p className={styles.inlineError}>{roomError}</p> : null}

          {!room ? (
            <p>Chargement de la classe...</p>
          ) : (
            <div className={styles.grid2}>
              <div className={styles.stack}>
                <Card
                  title={`Devoirs — ${room.name}`}
                >
                  {showAssignmentForm ? (
                    <form onSubmit={createAssignment} className={styles.stack} style={{ marginBottom: 12 }}>
                      <input className={styles.input} placeholder="Titre du devoir" value={title} onChange={(e) => setTitle(e.target.value)} required />
                      <textarea
                        className={styles.select}
                        style={{ height: 60 }}
                        placeholder="Consignes (optionnel)"
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                      />
                      <div className={styles.fieldRow}>
                        <label className={styles.field}>
                          Échéance
                          <input className={styles.input} type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
                        </label>
                        <label className={styles.field}>
                          Barème
                          <input className={styles.input} type="number" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
                        </label>
                        <button type="submit" className={styles.btn} disabled={busy}>
                          {busy ? "Publication..." : "Publier"}
                        </button>
                      </div>
                      <label className={styles.field}>
                        Support ou sujet à joindre
                        <input className={styles.input} type="file" accept="application/pdf,image/png,image/jpeg,.doc,.docx" onChange={(event) => setAssignmentFile(event.target.files?.[0] ?? null)} />
                        <small>PDF, image ou document Word. Le fichier reste privé et accessible uniquement aux étudiants de la classe.</small>
                      </label>
                      {formError ? <p className={styles.inlineError}>{formError}</p> : null}
                      <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setShowAssignmentForm(false)}>Fermer le formulaire</button>
                    </form>
                  ) : (
                    <button type="button" className={`${styles.btn} ${styles.btnGhost}`} style={{ marginBottom: 12 }} onClick={() => setShowAssignmentForm(true)}>
                      <Icon name="edit" className={styles.navIcon} />
                      Publier un devoir
                    </button>
                  )}

                  {room.assignments.length === 0 ? (
                    <p style={{ color: "var(--muted)", fontSize: 13 }}>Aucun devoir publié pour l&apos;instant.</p>
                  ) : (
                    <ul className={styles.list}>
                      {room.assignments.map((a) => (
                        <Row
                          key={a.id}
                          lead={<Icon name="clipboard" className={styles.navIcon} />}
                          title={a.title}
                          sub={`${a.submissionCount} remise(s) • ${a.reviewedCount} corrigée(s)`}
                          side={a.pendingCount > 0 ? <Badge kind="urgent">{a.pendingCount} à corriger</Badge> : <Badge kind="ok">À jour</Badge>}
                        />
                      ))}
                    </ul>
                  )}
                </Card>

                <Card title="Effectif de la classe">
                  {room.members.filter((m) => m.role === "student").length === 0 ? (
                    <p style={{ color: "var(--muted)", fontSize: 13 }}>Aucun étudiant dans cette classe.</p>
                  ) : (
                    <ul className={styles.list}>
                      {room.members
                        .filter((m) => m.role === "student")
                        .map((m) => (
                          <Row key={m.id} lead={<Avatar name={m.profile?.fullname ?? "?"} />} title={m.profile?.fullname ?? "Étudiant"} sub={m.profile?.email} />
                        ))}
                    </ul>
                  )}
                </Card>
                {section === "ressources" ? <Card title="Formations affectées à la classe">{room.courses?.length ? <ul className={styles.list}>{room.courses.map((entry) => <Row key={entry.id} title={entry.course?.title ?? "Formation"} sub={entry.course?.description ?? "Support attribué à la classe"} />)}</ul> : <p>Aucune formation affectée à cette classe.</p>}</Card> : null}
              </div>

              <Card title="Remises récentes à corriger">
                {room.recentSubmissions.length === 0 ? (
                  <p style={{ color: "var(--muted)", fontSize: 13 }}>Aucune remise pour l&apos;instant.</p>
                ) : (
                  <ul className={styles.list}>
                    {room.recentSubmissions.map((s) => (
                      <li key={s.id} className={styles.row} style={{ flexWrap: "wrap" }}>
                        <span className={styles.rowMain}>
                          <strong>{s.studentName}</strong>
                          <small>
                            {s.assignmentTitle} •{" "}
                            <Badge kind={s.status === "reviewed" ? "ok" : "pending"}>{s.status === "reviewed" ? `Corrigé (${s.score ?? "?"})` : "À corriger"}</Badge>
                          </small>
                        </span>
                        {s.status === "submitted" ? (
                          reviewFor === s.id ? (
                            <div style={{ display: "grid", gap: 6, width: "100%", marginTop: 6 }}>
                              {s.content ? <p style={{ fontSize: 12, color: "var(--muted)" }}>« {s.content} »</p> : null}
                              <div className={styles.fieldRow}>
                                <input className={styles.input} type="number" placeholder="Note" value={reviewScore} onChange={(e) => setReviewScore(e.target.value)} />
                                <input className={styles.input} placeholder="Commentaire" value={reviewFeedback} onChange={(e) => setReviewFeedback(e.target.value)} />
                              </div>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button type="button" className={styles.btn} disabled={busy} onClick={() => submitReview(s.id, "reviewed")}>
                                  Valider la correction
                                </button>
                                <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setReviewFor(null)}>
                                  Annuler
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button type="button" className={styles.quickBtn} onClick={() => setReviewFor(s.id)}>
                              Corriger
                            </button>
                          )
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
