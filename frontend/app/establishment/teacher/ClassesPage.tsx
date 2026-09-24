"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "../establishment.module.css";
import Shell from "../Shell";
import { campusFetch, campusUpload, useEstablishmentHome } from "../useEstablishment";
import type { TeacherHomeData } from "../views";
import { Avatar, Badge, Card, Icon, Row } from "../ui";

type TeacherSection = "classes" | "travaux" | "evaluations" | "suivi" | "ressources" | "preparer";
type StudentMember = {
  id: string;
  role: string;
  access?: { status: string; reason?: string };
  profile: { id: string; fullname: string; email: string; avatar_url?: string } | null;
};
type RoomDetails = {
  id: string;
  name: string;
  courses: Array<{ id: string; course: { id: string; title: string; description?: string } | null }>;
  members: StudentMember[];
  assignments: Array<{ id: string; title: string; due_at: string | null; max_score: number | null; status: string; submissionCount: number; reviewedCount: number; pendingCount: number }>;
  recentSubmissions: Array<{ id: string; status: string; submittedAt: string | null; score: number | null; content: string | null; filePath: string | null; assignmentTitle: string; studentName: string }>;
};

const SECTION_META: Record<TeacherSection, { active: string; eyebrow: string; title: string; description: string }> = {
  classes: { active: "classes", eyebrow: "ESPACE DE CLASSE", title: "Mes classes", description: "Retrouvez les effectifs, les matières et les actions utiles de chaque classe." },
  travaux: { active: "assignments", eyebrow: "TRAVAUX", title: "Devoirs et corrections", description: "Publiez un sujet, suivez les remises et corrigez sans changer d’écran." },
  evaluations: { active: "assessments", eyebrow: "ÉVALUATIONS", title: "Évaluations et notes", description: "Suivez les échéances, les copies reçues et l’avancement des corrections." },
  suivi: { active: "progress", eyebrow: "SUIVI INDIVIDUEL", title: "Suivi des étudiants", description: "Ouvrez la fiche d’un étudiant et repérez rapidement les situations à traiter." },
  ressources: { active: "resources", eyebrow: "RESSOURCES", title: "Ressources pédagogiques", description: "Consultez les formations et supports déjà affectés à vos classes." },
  preparer: { active: "lesson-plans", eyebrow: "PRÉPARATION", title: "Préparer un cours", description: "Partez de la classe concernée, vérifiez les ressources puis programmez l’activité." },
};

const WORKSPACE_TABS = [
  { href: "/establishment/teacher/classes", section: "classes", label: "Vue de classe" },
  { href: "/establishment/teacher/assignments", section: "travaux", label: "Travaux" },
  { href: "/establishment/teacher/assessments", section: "evaluations", label: "Évaluations" },
  { href: "/establishment/teacher/progress", section: "suivi", label: "Suivi" },
  { href: "/establishment/teacher/resources", section: "ressources", label: "Ressources" },
] as const;

export default function ClassesPage({ section = "classes" }: { section?: TeacherSection } = {}) {
  const { loading, error, context, mismatch, data } = useEstablishmentHome<TeacherHomeData>("teacher");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
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
  const meta = SECTION_META[section];

  useEffect(() => {
    if (data?.classes.length && !roomId) setRoomId(data.classes[0].roomId);
  }, [data, roomId]);

  const loadRoom = async (id: string) => {
    setRoomError(null);
    try {
      const result = await campusFetch(`/institutions/rooms/${id}`);
      setRoom(result);
      setSelectedStudentId((current) => current && result.members.some((member: StudentMember) => member.profile?.id === current) ? current : null);
    } catch (reason) {
      setRoomError(reason instanceof Error ? reason.message : "Impossible de charger cette classe.");
    }
  };

  useEffect(() => {
    if (roomId) void loadRoom(roomId);
  }, [roomId]);

  const createAssignment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!roomId) return;
    setBusy(true);
    setFormError(null);
    try {
      const uploaded = assignmentFile ? await campusUpload(`/institutions/rooms/${roomId}/assignment-files`, assignmentFile) : null;
      await campusFetch(`/institutions/rooms/${roomId}/assignments`, {
        method: "POST",
        body: JSON.stringify({ title, instructions: instructions || undefined, due_at: dueAt ? new Date(dueAt).toISOString() : undefined, max_score: maxScore ? Number(maxScore) : undefined, attachment_path: uploaded?.path, attachment_name: uploaded?.name, attachment_type: uploaded?.mimetype }),
      });
      setTitle("");
      setInstructions("");
      setDueAt("");
      setAssignmentFile(null);
      setShowAssignmentForm(false);
      await loadRoom(roomId);
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "Impossible de publier ce devoir.");
    } finally {
      setBusy(false);
    }
  };

  const submitReview = async (submissionId: string) => {
    setBusy(true);
    try {
      await campusFetch(`/institutions/submissions/${submissionId}/review`, { method: "PATCH", body: JSON.stringify({ score: reviewScore ? Number(reviewScore) : undefined, feedback: reviewFeedback || undefined, status: "reviewed" }) });
      setReviewFor(null);
      setReviewScore("");
      setReviewFeedback("");
      if (roomId) await loadRoom(roomId);
    } catch (reason) {
      window.alert(reason instanceof Error ? reason.message : "Impossible d’enregistrer la correction.");
    } finally {
      setBusy(false);
    }
  };

  if (mismatch) return <section className={`${styles.card} ${styles.soon}`} style={{ margin: 24 }}><h2>Ce n&apos;est pas votre espace</h2><p>Cette page est réservée aux comptes professeur.</p></section>;

  const students = room?.members.filter((member) => member.role === "student") ?? [];
  const selectedStudent = students.find((member) => member.profile?.id === selectedStudentId) ?? null;
  const pendingCount = room?.assignments.reduce((total, assignment) => total + assignment.pendingCount, 0) ?? 0;

  const assignmentPanel = room ? <Card title={`Travaux — ${room.name}`}>
    {showAssignmentForm ? <form onSubmit={createAssignment} className={styles.teacherAssignmentForm}>
      <label className={styles.field}>Titre du travail<input className={styles.input} value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
      <label className={styles.field}>Consignes<textarea className={styles.select} value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Objectif, consignes et critères de réussite" /></label>
      <div className={styles.fieldRow}><label className={styles.field}>Échéance<input className={styles.input} type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label><label className={styles.field}>Barème<input className={styles.input} type="number" min="1" value={maxScore} onChange={(event) => setMaxScore(event.target.value)} /></label></div>
      <label className={styles.field}>Sujet ou support<input className={styles.input} type="file" accept="application/pdf,image/png,image/jpeg,.doc,.docx" onChange={(event) => setAssignmentFile(event.target.files?.[0] ?? null)} /><small>PDF, image ou document Word, visible uniquement par la classe.</small></label>
      {formError ? <p className={styles.inlineError}>{formError}</p> : null}
      <div className={styles.teacherFormActions}><button type="submit" className={styles.btn} disabled={busy}>{busy ? "Publication…" : "Publier le travail"}</button><button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setShowAssignmentForm(false)}>Annuler</button></div>
    </form> : <button type="button" className={styles.teacherPrimaryAction} onClick={() => setShowAssignmentForm(true)}><Icon name="edit" /> Publier un nouveau travail</button>}
    {room.assignments.length ? <ul className={styles.list}>{room.assignments.map((assignment) => <Row key={assignment.id} lead={<Icon name="clipboard" className={styles.navIcon} />} title={assignment.title} sub={`${assignment.submissionCount} remise(s) · ${assignment.reviewedCount} corrigée(s)${assignment.due_at ? ` · échéance ${new Date(assignment.due_at).toLocaleDateString("fr-FR")}` : ""}`} side={assignment.pendingCount ? <Badge kind="urgent">{assignment.pendingCount} à corriger</Badge> : <Badge kind="ok">À jour</Badge>} />)}</ul> : <p className={styles.teacherEmptyText}>Aucun travail publié pour cette classe.</p>}
  </Card> : null;

  const correctionsPanel = room ? <Card title="Copies et corrections">
    {room.recentSubmissions.length ? <ul className={styles.list}>{room.recentSubmissions.map((submission) => <li key={submission.id} className={styles.teacherSubmission}>
      <span className={styles.rowMain}><strong>{submission.studentName}</strong><small>{submission.assignmentTitle} · {submission.status === "reviewed" ? `corrigé (${submission.score ?? "—"})` : "à corriger"}</small></span>
      {submission.status === "submitted" ? reviewFor === submission.id ? <div className={styles.teacherReviewForm}>{submission.content ? <p>« {submission.content} »</p> : null}<div className={styles.fieldRow}><input className={styles.input} type="number" placeholder="Note" value={reviewScore} onChange={(event) => setReviewScore(event.target.value)} /><input className={styles.input} placeholder="Commentaire" value={reviewFeedback} onChange={(event) => setReviewFeedback(event.target.value)} /></div><div className={styles.teacherFormActions}><button type="button" className={styles.btn} disabled={busy} onClick={() => void submitReview(submission.id)}>Valider</button><button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setReviewFor(null)}>Annuler</button></div></div> : <button type="button" className={styles.quickBtn} onClick={() => setReviewFor(submission.id)}>Corriger</button> : <Badge kind="ok">Corrigé</Badge>}
    </li>)}</ul> : <p className={styles.teacherEmptyText}>Aucune copie reçue pour l’instant.</p>}
  </Card> : null;

  return <Shell role="teacher" activeSlug={meta.active} displayName={context?.displayName} institutionName={context?.institutionName} note={error ?? null}>
    {loading ? <section className={styles.state}>Chargement de votre espace professeur…</section> : !data?.classes.length ? <section className={styles.teacherOnboarding}><span><Icon name="users" /></span><small>COMPTE PROFESSEUR ACTIF</small><h1>Votre espace est prêt</h1><p>La direction doit maintenant vous affecter à une classe et à une matière. Dès cette affectation, les étudiants, le planning, l’appel et les travaux apparaîtront ici automatiquement.</p><div><Link href="/establishment/teacher/notifications" className={styles.btn}>Voir mes notifications</Link><Link href="/establishment/teacher/help" className={`${styles.btn} ${styles.btnGhost}`}>Contacter l’établissement</Link></div></section> : <>
      <header className={styles.teacherPageHead}><div><small>{meta.eyebrow}</small><h1>{meta.title}</h1><p>{meta.description}</p></div><Link href="/establishment/teacher/sessions" className={styles.teacherModeButton}><Icon name="play" /> Ouvrir une séance</Link></header>
      <nav className={styles.teacherWorkspaceTabs} aria-label="Outils de classe">{WORKSPACE_TABS.map((tabItem) => <Link key={tabItem.section} href={tabItem.href} className={section === tabItem.section ? styles.teacherTabActive : ""}>{tabItem.label}</Link>)}</nav>
      <section className={styles.teacherClassSwitcher} aria-label="Choisir une classe">{data.classes.map((item) => <button type="button" key={item.roomId} className={roomId === item.roomId ? styles.teacherClassActive : ""} onClick={() => { setRoomId(item.roomId); setRoom(null); setSelectedStudentId(null); }}><span><strong>{item.name}</strong><small>{item.subject}</small></span><b>{item.studentsCount}</b><small>étudiants</small></button>)}</section>
      {roomError ? <p className={styles.inlineError}>{roomError}</p> : !room ? <section className={styles.state}>Ouverture de la classe…</section> : <>
        <section className={styles.teacherMetrics}><article><Icon name="users" /><span><strong>{students.length}</strong><small>Étudiants</small></span></article><article><Icon name="clipboard" /><span><strong>{room.assignments.length}</strong><small>Travaux publiés</small></span></article><article><Icon name="edit" /><span><strong>{pendingCount}</strong><small>Copies à corriger</small></span></article><article><Icon name="book" /><span><strong>{room.courses.length}</strong><small>Ressources liées</small></span></article></section>

        {section === "classes" ? <div className={styles.grid2}><Card title={`Effectif — ${room.name}`}>{students.length ? <ul className={styles.list}>{students.map((student) => <li key={student.id} className={styles.teacherStudentRow}><Avatar name={student.profile?.fullname ?? "Étudiant"} src={student.profile?.avatar_url} /><span className={styles.rowMain}><strong>{student.profile?.fullname ?? "Étudiant"}</strong><small>{student.profile?.email ?? "Compte établissement"}</small></span><Badge kind={student.access?.status === "blocked" ? "bad" : "ok"}>{student.access?.status === "blocked" ? "Bloqué" : "Actif"}</Badge></li>)}</ul> : <p className={styles.teacherEmptyText}>Aucun étudiant dans cette classe.</p>}</Card><Card title="Accès rapides"><div className={styles.teacherQuickGrid}><Link href="/establishment/teacher/sessions"><Icon name="checkCircle" /><span><strong>Faire l’appel</strong><small>Présences et cahier de texte</small></span></Link><Link href="/establishment/teacher/assignments"><Icon name="edit" /><span><strong>Publier un travail</strong><small>PDF, échéance et barème</small></span></Link><Link href="/establishment/teacher/schedule"><Icon name="calendar" /><span><strong>Modifier le planning</strong><small>Créneaux de la semaine</small></span></Link><Link href="/establishment/teacher/progress"><Icon name="chart" /><span><strong>Suivre les étudiants</strong><small>Situation individuelle</small></span></Link></div></Card></div> : null}
        {section === "travaux" || section === "evaluations" ? <div className={styles.grid2}>{assignmentPanel}{correctionsPanel}</div> : null}
        {section === "suivi" ? <div className={styles.teacherFollowLayout}><Card title="Étudiants de la classe">{students.length ? <div className={styles.teacherStudentButtons}>{students.map((student) => <button type="button" key={student.id} className={selectedStudentId === student.profile?.id ? styles.teacherStudentActive : ""} onClick={() => setSelectedStudentId(student.profile?.id ?? null)}><Avatar name={student.profile?.fullname ?? "Étudiant"} src={student.profile?.avatar_url} /><span><strong>{student.profile?.fullname ?? "Étudiant"}</strong><small>{student.access?.status === "blocked" ? "Accès bloqué" : "Compte actif"}</small></span><Icon name="chevron" /></button>)}</div> : <p className={styles.teacherEmptyText}>Aucun étudiant dans cette classe.</p>}</Card><Card title="Fiche de suivi">{selectedStudent ? <div className={styles.teacherStudentProfile}><Avatar name={selectedStudent.profile?.fullname ?? "Étudiant"} src={selectedStudent.profile?.avatar_url} size={64} /><div><small>ÉTUDIANT</small><h2>{selectedStudent.profile?.fullname}</h2><p>{selectedStudent.profile?.email}</p></div><dl><div><dt>Accès</dt><dd>{selectedStudent.access?.status === "blocked" ? "Bloqué" : "Actif"}</dd></div><div><dt>Copies récentes</dt><dd>{room.recentSubmissions.filter((item) => item.studentName === selectedStudent.profile?.fullname).length}</dd></div><div><dt>Classe</dt><dd>{room.name}</dd></div></dl>{selectedStudent.access?.reason ? <p className={styles.inlineError}>{selectedStudent.access.reason}</p> : null}</div> : <p className={styles.teacherEmptyText}>Sélectionnez un étudiant pour consulter sa situation.</p>}</Card></div> : null}
        {section === "ressources" || section === "preparer" ? <div className={styles.grid2}><Card title={`Formations affectées — ${room.name}`}>{room.courses.length ? <ul className={styles.list}>{room.courses.map((entry) => <Row key={entry.id} lead={<Icon name="book" className={styles.navIcon} />} title={entry.course?.title ?? "Formation"} sub={entry.course?.description ?? "Ressource disponible pour la classe"} />)}</ul> : <p className={styles.teacherEmptyText}>Aucune formation n’est encore affectée à cette classe. La direction peut l’ajouter depuis la structure académique.</p>}</Card><Card title={section === "preparer" ? "Préparer la prochaine activité" : "Utiliser les ressources"}><ol className={styles.teacherChecklist}><li><b>1</b><span><strong>Choisir la classe</strong><small>{room.name} est sélectionnée.</small></span></li><li><b>2</b><span><strong>Vérifier le support</strong><small>{room.courses.length ? `${room.courses.length} ressource(s) disponible(s).` : "Aucun support affecté."}</small></span></li><li><b>3</b><span><strong>Programmer l’activité</strong><small>Ajoutez le créneau ou publiez le travail.</small></span></li></ol><div className={styles.teacherFormActions}><Link href="/establishment/teacher/schedule" className={styles.btn}>Planifier</Link><Link href="/establishment/teacher/assignments" className={`${styles.btn} ${styles.btnGhost}`}>Créer un travail</Link></div></Card></div> : null}
      </>}
    </>}
  </Shell>;
}
