"use client";

import { useEffect, useState } from "react";
import styles from "../establishment.module.css";
import Shell from "../Shell";
import { useCampusContext, campusFetch } from "../useEstablishment";
import { Card, Icon } from "../ui";

type RoomSummary = { id: string; name: string; studentsCount: number; teacherNames: string[] };
type Formation = { id: string; name: string; level: string | null; rooms: RoomSummary[] };
type Subject = { id: string; name: string };
type Teacher = { id: string; name: string };

export default function FormationsPage() {
  const { loading, error, context, mismatch } = useCampusContext("admin");
  const [formations, setFormations] = useState<Formation[] | null>(null);
  const [unassignedRooms, setUnassignedRooms] = useState<RoomSummary[] | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [showFormationForm, setShowFormationForm] = useState(false);
  const [formationName, setFormationName] = useState("");
  const [formationLevel, setFormationLevel] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [roomFormFor, setRoomFormFor] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjectName, setSubjectName] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");

  const load = async (institutionId: string) => {
    setLoadingList(true);
    setListError(null);
    try {
      const [result, subjectResult, institution] = await Promise.all([
        campusFetch(`/campus/institutions/${institutionId}/formations`),
        campusFetch(`/campus/institutions/${institutionId}/subjects`),
        campusFetch(`/institutions/${institutionId}`),
      ]);
      setFormations(result.formations ?? []);
      setUnassignedRooms(result.unassignedRooms ?? []);
      const subjectList = subjectResult.subjects ?? [];
      const teacherList = (institution.members ?? [])
        .filter((member: { role: string }) => member.role === "teacher")
        .map((member: { profile?: { id: string; fullname?: string } | null }) => ({ id: member.profile?.id ?? "", name: member.profile?.fullname ?? "Professeur" }))
        .filter((teacher: Teacher) => teacher.id);
      setSubjects(subjectList);
      setTeachers(teacherList);
      setSelectedSubjectId((current) => current || subjectList[0]?.id || "");
      setSelectedTeacherId((current) => current || teacherList[0]?.id || "");
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Impossible de charger les formations.");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (context) void load(context.institutionId);
     
  }, [context]);

  const createFormation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!context) return;
    setBusy(true);
    setFormError(null);
    try {
      await campusFetch(`/campus/institutions/${context.institutionId}/formations`, {
        method: "POST",
        body: JSON.stringify({ name: formationName, level: formationLevel || undefined }),
      });
      setFormationName("");
      setFormationLevel("");
      setShowFormationForm(false);
      await load(context.institutionId);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Impossible de créer la formation.");
    } finally {
      setBusy(false);
    }
  };

  const createRoom = async (formationId: string) => {
    if (!context || !roomName.trim()) return;
    setBusy(true);
    setFormError(null);
    try {
      await campusFetch(`/campus/formations/${formationId}/rooms`, {
        method: "POST",
        body: JSON.stringify({ name: roomName }),
      });
      setRoomName("");
      setRoomFormFor(null);
      await load(context.institutionId);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Impossible de créer la classe.");
    } finally {
      setBusy(false);
    }
  };

  const assignRoom = async (roomId: string, formationId: string) => {
    if (!context) return;
    setBusy(true);
    try {
      await campusFetch(`/campus/rooms/${roomId}/formation`, {
        method: "PATCH",
        body: JSON.stringify({ formation_id: formationId }),
      });
      await load(context.institutionId);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Impossible de rattacher cette classe.");
    } finally {
      setBusy(false);
    }
  };

  const createSubject = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!context || !subjectName.trim()) return;
    setBusy(true);
    setFormError(null);
    try {
      const created = await campusFetch(`/campus/institutions/${context.institutionId}/subjects`, {
        method: "POST",
        body: JSON.stringify({ name: subjectName }),
      });
      setSubjectName("");
      setSelectedSubjectId(created.id);
      await load(context.institutionId);
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "Impossible de créer la matière.");
    } finally {
      setBusy(false);
    }
  };

  const assignSubject = async (roomId: string) => {
    if (!context || !selectedSubjectId || !selectedTeacherId) return;
    setBusy(true);
    setFormError(null);
    try {
      await campusFetch(`/campus/rooms/${roomId}/subjects`, {
        method: "POST",
        body: JSON.stringify({ subject_id: selectedSubjectId, teacher_id: selectedTeacherId }),
      });
      await load(context.institutionId);
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "Impossible d’affecter la matière et le professeur.");
    } finally {
      setBusy(false);
    }
  };

  if (mismatch) {
    return (
      <section className={`${styles.card} ${styles.soon}`} style={{ margin: 24 }}>
        <h2>Ce n&apos;est pas votre espace</h2>
        <p>Cette page est réservée au personnel de direction de l&apos;établissement.</p>
      </section>
    );
  }

  return (
    <Shell
      role="admin"
      activeSlug="academics"
      displayName={context?.displayName}
      institutionName={context?.institutionName}
      note={error ?? null}
    >
      {loading ? (
        <p>Chargement...</p>
      ) : (
        <>
          <div className={styles.pageHead}>
            <div>
              <h1 className={styles.headTitle}>Formations &amp; classes</h1>
              <p className={styles.headSub}>Regroupez vos classes par formation (ex. BTS MCO) pour le pilotage et le suivi.</p>
            </div>
            <button type="button" className={styles.btn} onClick={() => setShowFormationForm((s) => !s)}>
              <Icon name="cap" className={styles.navIcon} />
              Créer une formation
            </button>
          </div>

          {showFormationForm ? (
            <div className={styles.formCard}>
              <form onSubmit={createFormation} className={styles.fieldRow}>
                <label className={styles.field}>
                  Nom de la formation
                  <input
                    className={styles.input}
                    value={formationName}
                    onChange={(e) => setFormationName(e.target.value)}
                    placeholder="BTS MCO"
                    required
                  />
                </label>
                <label className={styles.field}>
                  Niveau (optionnel)
                  <input className={styles.input} value={formationLevel} onChange={(e) => setFormationLevel(e.target.value)} placeholder="Bac+2" />
                </label>
                <button type="submit" className={styles.btn} disabled={busy}>
                  {busy ? "Création..." : "Créer"}
                </button>
              </form>
            </div>
          ) : null}

          {formError ? <p className={styles.inlineError}>{formError}</p> : null}
          {listError ? <p className={styles.inlineError}>{listError}</p> : null}

          <Card title="Matières et professeurs">
            <p className={styles.headSub}>Créez une matière, choisissez son professeur puis affectez-les à la classe concernée.</p>
            <form onSubmit={createSubject} className={styles.fieldRow} style={{ marginTop: 12 }}>
              <label className={styles.field}>Nouvelle matière<input className={styles.input} value={subjectName} onChange={(event) => setSubjectName(event.target.value)} placeholder="Ex. Algorithmique" /></label>
              <button type="submit" className={`${styles.btn} ${styles.btnGhost}`} disabled={busy || !subjectName.trim()}>Créer la matière</button>
            </form>
            <div className={styles.fieldRow} style={{ marginTop: 12 }}>
              <label className={styles.field}>Matière<select className={styles.select} value={selectedSubjectId} onChange={(event) => setSelectedSubjectId(event.target.value)}><option value="">Choisir une matière</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
              <label className={styles.field}>Professeur<select className={styles.select} value={selectedTeacherId} onChange={(event) => setSelectedTeacherId(event.target.value)}><option value="">Choisir un professeur</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label>
            </div>
            {!teachers.length ? <p className={styles.inlineError}>Créez d’abord un compte professeur depuis « Utilisateurs ».</p> : null}
          </Card>

          {loadingList ? (
            <p>Chargement...</p>
          ) : !formations || formations.length === 0 ? (
            <Card title="Aucune formation pour l'instant">
              <p style={{ color: "var(--muted)", fontSize: 13 }}>
                Créez votre première formation avec le bouton ci-dessus, puis ajoutez-y des classes.
              </p>
            </Card>
          ) : (
            <div className={styles.stack}>
              {formations.map((f) => (
                <Card key={f.id} title={`${f.name}${f.level ? ` — ${f.level}` : ""}`}>
                  {f.rooms.length === 0 ? (
                    <p style={{ color: "var(--muted)", fontSize: 13 }}>Aucune classe dans cette formation.</p>
                  ) : (
                    <ul className={styles.list}>
                      {f.rooms.map((r) => (
                        <li key={r.id} className={styles.row}>
                          <span className={styles.rowMain}>
                            <strong>{r.name}</strong>
                            <small>
                              {r.studentsCount} étudiant(s)
                              {r.teacherNames.length ? ` • ${r.teacherNames.join(", ")}` : ""}
                            </small>
                          </span>
                          <button type="button" className={styles.quickBtn} disabled={busy || !selectedSubjectId || !selectedTeacherId} onClick={() => void assignSubject(r.id)}>Affecter la matière</button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {roomFormFor === f.id ? (
                    <div className={styles.fieldRow} style={{ marginTop: 8 }}>
                      <input
                        className={styles.input}
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        placeholder="Nom de la classe"
                        autoFocus
                      />
                      <button type="button" className={styles.btn} disabled={busy} onClick={() => createRoom(f.id)}>
                        Ajouter
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnGhost}`}
                      style={{ marginTop: 8 }}
                      onClick={() => setRoomFormFor(f.id)}
                    >
                      + Ajouter une classe
                    </button>
                  )}
                </Card>
              ))}
            </div>
          )}

          {unassignedRooms && unassignedRooms.length > 0 ? (
            <Card title="Classes sans formation">
              <ul className={styles.list}>
                {unassignedRooms.map((r) => (
                  <li key={r.id} className={styles.row}>
                    <span className={styles.rowMain}>
                      <strong>{r.name}</strong>
                      <small>{r.studentsCount} étudiant(s)</small>
                    </span>
                    {formations && formations.length > 0 ? (
                      <select
                        className={styles.select}
                        defaultValue=""
                        onChange={(e) => e.target.value && assignRoom(r.id, e.target.value)}
                      >
                        <option value="" disabled>
                          Rattacher à...
                        </option>
                        {formations.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </>
      )}
    </Shell>
  );
}
