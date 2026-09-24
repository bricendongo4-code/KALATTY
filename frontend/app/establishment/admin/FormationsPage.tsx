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
type InstitutionMember = { id: string; role: string; name: string; email: string };
type RoomMember = { id: string; role: string; access?: { status: string; reason?: string }; profile?: { id: string; fullname?: string; email?: string; avatar_url?: string | null } | null };
type RoomDetail = {
  id: string;
  name: string;
  description: string | null;
  members: RoomMember[];
  subjects: Array<{ id: string; subject?: { id: string; name: string } | null; teacher?: { id: string; fullname?: string; email?: string } | null }>;
  courses: Array<{ id: string; course?: { id: string; title?: string; description?: string } | null }>;
  assignments: Array<{ id: string; title: string; submissionCount: number; pendingCount: number; reviewedCount: number }>;
  scheduleItems: Array<{ id: string; title: string; weekday: number; starts_at: string; ends_at?: string | null; location?: string | null }>;
  attendanceSessions: Array<{ id: string; title: string; session_date: string; status: string }>;
};

const WEEKDAYS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

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
  const [institutionMembers, setInstitutionMembers] = useState<InstitutionMember[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<RoomDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [memberToAdd, setMemberToAdd] = useState("");

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
      setInstitutionMembers((institution.members ?? []).map((member: { id: string; role: string; profile?: { id: string; fullname?: string; email?: string } | null }) => ({
        id: member.profile?.id ?? "",
        role: member.role,
        name: member.profile?.fullname ?? member.profile?.email ?? "Utilisateur",
        email: member.profile?.email ?? "",
      })).filter((member: InstitutionMember) => member.id && ["student", "teacher"].includes(member.role)));
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

  const openRoom = async (roomId: string) => {
    setDetailLoading(true);
    setFormError(null);
    try {
      const result = await campusFetch(`/institutions/rooms/${roomId}`) as RoomDetail;
      setSelectedRoom(result);
      setMemberToAdd("");
      window.setTimeout(() => document.getElementById("admin-room-detail")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "Impossible d’ouvrir la classe.");
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshRoom = async () => {
    if (selectedRoom) await openRoom(selectedRoom.id);
  };

  const addMember = async () => {
    if (!selectedRoom || !memberToAdd) return;
    const member = institutionMembers.find((item) => item.id === memberToAdd);
    if (!member) return;
    setBusy(true);
    setFormError(null);
    try {
      await campusFetch(`/institutions/rooms/${selectedRoom.id}/members`, {
        method: "POST",
        body: JSON.stringify({ user_id: member.id, role: member.role }),
      });
      setMemberToAdd("");
      await refreshRoom();
      if (context) await load(context.institutionId);
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "Impossible d’ajouter ce membre.");
    } finally {
      setBusy(false);
    }
  };

  const updateStudentAccess = async (member: RoomMember) => {
    if (!selectedRoom || !member.profile?.id) return;
    const blocked = member.access?.status === "blocked";
    const reason = blocked ? "" : window.prompt("Motif du blocage (visible par la direction)", "Décision administrative") ?? "";
    if (!blocked && reason === "") return;
    setBusy(true);
    try {
      await campusFetch(`/institutions/rooms/${selectedRoom.id}/members/${member.profile.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: blocked ? "active" : "blocked", reason }),
      });
      await refreshRoom();
    } catch (reasonValue) {
      setFormError(reasonValue instanceof Error ? reasonValue.message : "Impossible de modifier l’accès.");
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (member: RoomMember) => {
    if (!selectedRoom || !member.profile?.id || !window.confirm(`Retirer ${member.profile.fullname ?? "ce membre"} de la classe ?`)) return;
    setBusy(true);
    try {
      await campusFetch(`/institutions/rooms/${selectedRoom.id}/members/${member.profile.id}`, { method: "DELETE" });
      await refreshRoom();
      if (context) await load(context.institutionId);
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "Impossible de retirer ce membre.");
    } finally {
      setBusy(false);
    }
  };

  const removeSubject = async (roomSubjectId: string) => {
    if (!selectedRoom || !window.confirm("Retirer cette matière et son professeur de la classe ?")) return;
    setBusy(true);
    try {
      await campusFetch(`/campus/rooms/${selectedRoom.id}/subjects/${roomSubjectId}`, { method: "DELETE" });
      await refreshRoom();
      if (context) await load(context.institutionId);
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "Impossible de retirer cette matière.");
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
                          <span className={styles.roomRowActions}><button type="button" className={styles.quickBtn} onClick={() => void openRoom(r.id)}>Piloter la classe</button><button type="button" className={styles.quickBtn} disabled={busy || !selectedSubjectId || !selectedTeacherId} onClick={() => void assignSubject(r.id)}>Affecter la matière</button></span>
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

          {detailLoading ? <Card title="Ouverture de la classe"><p>Chargement de l’effectif et des activités…</p></Card> : selectedRoom ? (
            <section id="admin-room-detail" className={`${styles.detailPanel} ${styles.adminRoomDetail}`} aria-labelledby="admin-room-title">
              <div className={styles.detailPanelHead}><div><small>PILOTAGE DE CLASSE</small><h2 id="admin-room-title">{selectedRoom.name}</h2><p>{selectedRoom.description || "Effectif, enseignements et activité de la classe réunis au même endroit."}</p></div><button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setSelectedRoom(null)}>Fermer</button></div>
              <div className={styles.kpis}>
                <article className={styles.classKpi}><strong>{selectedRoom.members.filter((item) => item.role === "student").length}</strong><span>Étudiants</span></article>
                <article className={styles.classKpi}><strong>{selectedRoom.members.filter((item) => item.role === "teacher").length}</strong><span>Professeurs</span></article>
                <article className={styles.classKpi}><strong>{selectedRoom.subjects.length}</strong><span>Matières</span></article>
                <article className={styles.classKpi}><strong>{selectedRoom.assignments.length}</strong><span>Devoirs</span></article>
              </div>
              <Card title="Affecter un membre"><div className={styles.memberAssign}><label className={styles.field}>Utilisateur<select className={styles.select} value={memberToAdd} onChange={(event) => setMemberToAdd(event.target.value)}><option value="">Choisir un étudiant ou professeur</option>{institutionMembers.filter((candidate) => !selectedRoom.members.some((member) => member.profile?.id === candidate.id)).map((member) => <option value={member.id} key={member.id}>{member.name} · {member.role === "student" ? "Étudiant" : "Professeur"}</option>)}</select></label><button type="button" className={styles.btn} disabled={busy || !memberToAdd} onClick={() => void addMember()}>Ajouter à la classe</button></div></Card>
              <div className={styles.classDetailGrid}>
                <Card title="Équipe et effectif"><ul className={styles.list}>{selectedRoom.members.length ? selectedRoom.members.map((member) => <li className={`${styles.row} ${styles.memberRow}`} key={member.id}><span className={styles.rowMain}><strong>{member.profile?.fullname ?? member.profile?.email ?? "Membre"}</strong><small>{member.role === "student" ? "Étudiant" : member.role === "teacher" ? "Professeur" : "Assistant"}{member.access?.status === "blocked" ? ` · Bloqué${member.access.reason ? ` : ${member.access.reason}` : ""}` : " · Actif"}</small></span><span className={styles.memberActions}>{member.role === "student" ? <button type="button" onClick={() => void updateStudentAccess(member)} disabled={busy}>{member.access?.status === "blocked" ? "Réactiver" : "Bloquer"}</button> : null}<button type="button" className={styles.dangerAction} onClick={() => void removeMember(member)} disabled={busy}>Retirer</button></span></li>) : <li>Aucun membre affecté.</li>}</ul></Card>
                <Card title="Matières et professeurs"><ul className={styles.list}>{selectedRoom.subjects.length ? selectedRoom.subjects.map((item) => <li className={styles.row} key={item.id}><span className={styles.rowMain}><strong>{item.subject?.name ?? "Matière"}</strong><small>{item.teacher?.fullname ?? item.teacher?.email ?? "Aucun professeur"}</small></span><button type="button" className={styles.dangerAction} onClick={() => void removeSubject(item.id)} disabled={busy}>Retirer</button></li>) : <li>Aucune matière affectée.</li>}</ul></Card>
                <Card title="Cours numériques"><ul className={styles.list}>{selectedRoom.courses.length ? selectedRoom.courses.map((item) => <li className={styles.row} key={item.id}><span className={styles.rowMain}><strong>{item.course?.title ?? "Cours"}</strong><small>Accessible sans paiement aux étudiants de la classe</small></span></li>) : <li>Aucun cours numérique affecté.</li>}</ul></Card>
                <Card title="Devoirs et corrections"><ul className={styles.list}>{selectedRoom.assignments.length ? selectedRoom.assignments.map((item) => <li className={styles.row} key={item.id}><span className={styles.rowMain}><strong>{item.title}</strong><small>{item.submissionCount} remise(s) · {item.reviewedCount} corrigée(s)</small></span>{item.pendingCount ? <b>{item.pendingCount} à corriger</b> : null}</li>) : <li>Aucun devoir publié.</li>}</ul></Card>
                <Card title="Emploi du temps"><ul className={styles.list}>{selectedRoom.scheduleItems.length ? selectedRoom.scheduleItems.map((item) => <li className={styles.row} key={item.id}><span className={styles.rowMain}><strong>{item.title}</strong><small>{WEEKDAYS[item.weekday] ?? "Jour"} · {item.starts_at}{item.ends_at ? ` – ${item.ends_at}` : ""}{item.location ? ` · ${item.location}` : ""}</small></span></li>) : <li>Aucun créneau publié.</li>}</ul></Card>
                <Card title="Présences"><p className={styles.classMetric}><strong>{selectedRoom.attendanceSessions.length}</strong> séance(s) d’appel enregistrée(s).</p></Card>
              </div>
            </section>
          ) : null}
        </>
      )}
    </Shell>
  );
}
