"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./campus.module.css";
import { campusFetch } from "./useCampusHome";
import {
  Avatar,
  Badge,
  Card,
  Donut,
  Icon,
  Kpi,
  LineChart,
  Progress,
  Row,
  RowIcon,
  Todo,
  colorForValue,
} from "./ui";

/* Les composants ci-dessous rendent les donnees reelles renvoyees par
   GET /campus/home (voir backend/src/campus/campus.service.ts). Chaque
   section prevoit un etat vide honnete plutot que des valeurs inventees. */

function todayLabel() {
  const d = new Date();
  const weekday = new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(
    d,
  );
  const rest = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
  return { weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1), rest };
}

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.round(diffMs / 3_600_000);
  if (hours < 1) return "À l'instant";
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Hier" : `Il y a ${days} j`;
}

function formatDueDate(iso: string | null) {
  if (!iso) return "Sans échéance";
  return `À rendre le ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(iso))}`;
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: "var(--muted)", fontSize: 13, padding: "8px 0" }}>
      {children}
    </p>
  );
}

const STATUS_BADGE = {
  live: <Badge kind="live">En cours</Badge>,
  upcoming: <Badge kind="soon">À venir</Badge>,
  done: <Badge kind="info">Terminé</Badge>,
} as const;

/* =====================================================================
   ÉTUDIANT
   ===================================================================== */
export type StudentHomeData = {
  today: Array<{
    id: string;
    title: string;
    room: string;
    location: string | null;
    startsAt: string;
    endsAt: string | null;
    status: "live" | "upcoming" | "done";
  }>;
  todayCount: number;
  pendingWork: Array<{
    id: string;
    title: string;
    room: string;
    dueAt: string | null;
  }>;
  pendingWorkCount: number;
  upcomingEvalCount: number;
  progressPct: number;
  messages: Array<{
    id: string;
    title: string;
    body: string;
    createdAt: string;
  }>;
  announcement: { title: string; body: string } | null;
};

export function StudentHome({ data }: { data: StudentHomeData }) {
  const { weekday, rest } = todayLabel();
  return (
    <>
      <section className={styles.banner}>
        <div>
          <h1 className={styles.bannerTitle}>Bonjour 👋</h1>
          <p className={styles.bannerText}>
            Une nouvelle journée pour progresser !
          </p>
          <p className={styles.bannerQuote}>
            « La discipline d&apos;aujourd&apos;hui, les opportunités de demain.
            »
          </p>
        </div>
        <div className={styles.bannerRight}>
          <div className={styles.dateCard}>
            <strong>{weekday}</strong>
            <span>{rest}</span>
            <small>Reste constant, tes efforts paient.</small>
          </div>
        </div>
      </section>

      <div className={styles.kpis}>
        <Kpi
          icon="calendar"
          tone="blue"
          value={String(data.todayCount)}
          label="Cours aujourd'hui"
          link={{
            label: "Voir mon emploi du temps",
            href: "/campus/etudiant/emploi-du-temps",
          }}
        />
        <Kpi
          icon="edit"
          tone="orange"
          value={String(data.pendingWorkCount)}
          label="Travaux à rendre"
          link={{ label: "Voir mes travaux", href: "/campus/etudiant/travaux" }}
        />
        <Kpi
          icon="clipboard"
          tone="violet"
          value={String(data.upcomingEvalCount)}
          label="Évaluation à venir"
          link={{
            label: "Voir mes évaluations",
            href: "/campus/etudiant/evaluations",
          }}
        />
        <Kpi
          icon="chart"
          tone="green"
          value={`${data.progressPct}%`}
          label="Progression globale"
          link={{
            label: "Voir mes statistiques",
            href: "/campus/etudiant/resultats",
          }}
        />
      </div>

      <div className={styles.grid3}>
        <div className={styles.rowSpan2}>
          <Card
            title="Mon emploi du temps du jour"
            link={{
              label: "Voir tout",
              href: "/campus/etudiant/emploi-du-temps",
            }}
          >
            {data.today.length === 0 ? (
              <Empty>Aucun cours programmé aujourd&apos;hui.</Empty>
            ) : (
              <ol className={styles.timeline}>
                {data.today.map((s) => (
                  <li key={s.id} className={styles.tlItem}>
                    <span className={styles.tlTime}>
                      {s.startsAt}
                      {s.endsAt ? ` - ${s.endsAt}` : ""}
                    </span>
                    <span
                      className={`${styles.tlDot} ${s.status === "live" ? styles.tlDotLive : ""}`}
                    />
                    <span className={styles.tlBody}>
                      <strong>{s.title}</strong>
                      <small>{s.room}</small>
                    </span>
                    {STATUS_BADGE[s.status]}
                  </li>
                ))}
              </ol>
            )}
            <Link
              href="/campus/etudiant/emploi-du-temps"
              className={`${styles.btn} ${styles.btnGhost} ${styles.btnBlock}`}
            >
              Voir tout l&apos;emploi du temps
            </Link>
          </Card>
        </div>

        <Card
          title="Mes travaux"
          link={{ label: "Voir tout", href: "/campus/etudiant/travaux" }}
        >
          {data.pendingWork.length === 0 ? (
            <Empty>Aucun travail en attente : tu es à jour.</Empty>
          ) : (
            <ul className={styles.list}>
              {data.pendingWork.slice(0, 4).map((w) => (
                <Row
                  key={w.id}
                  lead={<RowIcon icon="edit" tone="red" />}
                  title={w.title}
                  sub={`${w.room} • ${formatDueDate(w.dueAt)}`}
                />
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Notifications récentes"
          link={{ label: "Voir tout", href: "/campus/etudiant/messagerie" }}
        >
          {data.messages.length === 0 ? (
            <Empty>Aucune notification pour l&apos;instant.</Empty>
          ) : (
            <ul className={styles.list}>
              {data.messages.map((m) => (
                <Row
                  key={m.id}
                  lead={<RowIcon icon="bell" tone="blue" />}
                  title={m.title}
                  sub={m.body}
                  side={relativeTime(m.createdAt)}
                />
              ))}
            </ul>
          )}
        </Card>

        {data.announcement ? (
          <div className={styles.span2}>
            <div className={styles.resource}>
              <span className={styles.resourceCover}>
                <Icon name="megaphone" />
              </span>
              <span>
                <small>Actualité de l&apos;établissement</small>
                <strong>{data.announcement.title}</strong>
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

/* =====================================================================
   PROFESSEUR
   ===================================================================== */
export type TeacherHomeData = {
  classes: Array<{
    roomId: string;
    roomSubjectId: string | null;
    name: string;
    subject: string;
    studentsCount: number;
    progressPct: number;
  }>;
  todayCount: number;
  totalStudents: number;
  toCorrect: number;
  upcomingEvalCount: number;
  nextCourse: {
    roomId: string;
    title: string;
    room: string;
    startsAt: string;
    endsAt: string | null;
    status: "live" | "upcoming" | "done";
    studentsCount: number;
    roomSubjectId: string | null;
    sessionId: string | null;
    sessionStatus: string | null;
  } | null;
  watch: Array<{
    id: string;
    name: string;
    reason: string;
    kind: "bad" | "warn" | "ok";
  }>;
};

type RosterEntry = {
  studentId: string;
  name: string;
  status: string | null;
  note: string | null;
};

function SessionPanel({
  roomId,
  roomSubjectId,
  onDone,
}: {
  roomId: string;
  roomSubjectId: string;
  onDone: () => void;
}) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [roster, setRoster] = useState<RosterEntry[] | null>(null);
  const [content, setContent] = useState("");
  const [homework, setHomework] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const started = await campusFetch(
        `/campus/rooms/${roomId}/sessions/start`,
        {
          method: "POST",
          body: JSON.stringify({ room_subject_id: roomSubjectId }),
        },
      );
      setSessionId(started.id);
      const details = await campusFetch(
        `/campus/sessions/${started.id}/roster`,
      );
      setRoster(details.roster);
      setContent(details.contentDone ?? "");
      setHomework(details.homework ?? "");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Impossible de démarrer la séance.",
      );
    } finally {
      setBusy(false);
    }
  };

  const setStatus = (studentId: string, status: string) => {
    setRoster(
      (r) =>
        r?.map((s) => (s.studentId === studentId ? { ...s, status } : s)) ?? r,
    );
  };

  const saveAttendance = async () => {
    if (!sessionId || !roster) return;
    setBusy(true);
    setError(null);
    try {
      await campusFetch(`/campus/sessions/${sessionId}/attendance`, {
        method: "POST",
        body: JSON.stringify({
          records: roster
            .filter((r) => r.status)
            .map((r) => ({ student_id: r.studentId, status: r.status })),
        }),
      });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Impossible d'enregistrer les présences.",
      );
    } finally {
      setBusy(false);
    }
  };

  const end = async () => {
    if (!sessionId) return;
    setBusy(true);
    setError(null);
    try {
      await saveAttendance();
      await campusFetch(`/campus/sessions/${sessionId}/end`, {
        method: "POST",
        body: JSON.stringify({ content_done: content, homework }),
      });
      onDone();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Impossible de clôturer la séance.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (!sessionId || !roster) {
    return (
      <>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnDark} ${styles.btnBlock}`}
          onClick={start}
          disabled={busy}
        >
          <Icon name="play" className={styles.navIcon} />
          {busy ? "Démarrage..." : "Démarrer la séance"}
        </button>
        {error ? <Empty>{error}</Empty> : null}
      </>
    );
  }

  const statusOptions: Array<{ value: string; label: string }> = [
    { value: "present", label: "Présent" },
    { value: "late", label: "Retard" },
    { value: "absent", label: "Absent" },
    { value: "excused", label: "Excusé" },
  ];

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <strong style={{ fontSize: 13 }}>Faire l&apos;appel</strong>
      <ul className={styles.list}>
        {roster.map((s) => (
          <li
            key={s.studentId}
            className={styles.row}
            style={{ flexWrap: "wrap", gap: 8 }}
          >
            <Avatar name={s.name} />
            <span className={styles.rowMain}>
              <strong>{s.name}</strong>
            </span>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(s.studentId, opt.value)}
                  className={styles.quickBtn}
                  style={{
                    padding: "4px 8px",
                    fontSize: 11,
                    background:
                      s.status === opt.value ? "var(--accent)" : undefined,
                    color: s.status === opt.value ? "#fff" : undefined,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <label style={{ fontSize: 12, fontWeight: 700 }}>
        Cahier de texte
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Contenu réalisé pendant la séance"
          className={styles.select}
          style={{ width: "100%", height: 60, marginTop: 4 }}
        />
      </label>
      <label style={{ fontSize: 12, fontWeight: 700 }}>
        Devoirs donnés
        <textarea
          value={homework}
          onChange={(e) => setHomework(e.target.value)}
          placeholder="Travail à faire pour la prochaine fois"
          className={styles.select}
          style={{ width: "100%", height: 50, marginTop: 4 }}
        />
      </label>
      {error ? <Empty>{error}</Empty> : null}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnGhost}`}
          onClick={saveAttendance}
          disabled={busy}
        >
          Enregistrer les présences
        </button>
        <button
          type="button"
          className={styles.btn}
          onClick={end}
          disabled={busy}
        >
          Clôturer la séance
        </button>
      </div>
    </div>
  );
}

export function TeacherHome({ data }: { data: TeacherHomeData }) {
  const [sessionActive, setSessionActive] = useState(
    Boolean(data.nextCourse?.sessionId),
  );

  return (
    <>
      <section className={styles.banner}>
        <div>
          <h1 className={styles.bannerTitle}>Bonjour,</h1>
          <p className={styles.bannerText}>Voici votre activité du jour.</p>
        </div>
        <p
          className={styles.bannerQuote}
          style={{ margin: 0, maxWidth: 260, textAlign: "right" }}
        >
          « Enseigner, c&apos;est allumer une lumière, pas remplir un vase. »
        </p>
      </section>

      <div className={styles.kpis}>
        <Kpi
          icon="calendar"
          tone="blue"
          value={String(data.todayCount)}
          label="Cours aujourd'hui"
          link={{
            label: "Voir mon planning",
            href: "/campus/professeur/emploi-du-temps",
          }}
        />
        <Kpi
          icon="users"
          tone="green"
          value={String(data.totalStudents)}
          label="Étudiants au total"
          link={{
            label: "Toutes mes classes",
            href: "/campus/professeur/classes",
          }}
        />
        <Kpi
          icon="edit"
          tone="red"
          value={String(data.toCorrect)}
          label="Travaux à corriger"
          link={{
            label: "Voir les travaux",
            href: "/campus/professeur/travaux",
          }}
        />
        <Kpi
          icon="checkCircle"
          tone="teal"
          value={String(data.upcomingEvalCount)}
          label="Évaluations à venir"
          link={{
            label: "Voir le calendrier",
            href: "/campus/professeur/travaux",
          }}
        />
      </div>

      <div className={styles.grid3wide}>
        <Card title="Mon prochain cours">
          {!data.nextCourse ? (
            <Empty>Aucun cours programmé aujourd&apos;hui.</Empty>
          ) : (
            <div className={styles.nextCourse}>
              <span className={styles.nextHead}>
                <span className={styles.pulse} />
                {data.nextCourse.status === "live"
                  ? "En cours"
                  : `À ${data.nextCourse.startsAt}`}
              </span>
              <div className={styles.nextBox}>
                <RowIcon icon="megaphone" tone="blue" />
                <span className={styles.rowMain}>
                  <strong>{data.nextCourse.title}</strong>
                  <small>
                    {data.nextCourse.startsAt}
                    {data.nextCourse.endsAt
                      ? ` - ${data.nextCourse.endsAt}`
                      : ""}{" "}
                    • {data.nextCourse.room} • {data.nextCourse.studentsCount}{" "}
                    étudiants
                  </small>
                </span>
              </div>
              {data.nextCourse.roomSubjectId && !sessionActive ? (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnDark} ${styles.btnBlock}`}
                  onClick={() => setSessionActive(true)}
                >
                  <Icon name="play" className={styles.navIcon} />
                  Démarrer la séance
                </button>
              ) : null}
              {sessionActive && data.nextCourse.roomSubjectId ? (
                <SessionPanel
                  roomId={data.nextCourse.roomId}
                  roomSubjectId={data.nextCourse.roomSubjectId}
                  onDone={() => setSessionActive(false)}
                />
              ) : null}
              {!data.nextCourse.roomSubjectId ? (
                <Empty>
                  Aucune matière affectée à cette classe pour l&apos;instant.
                </Empty>
              ) : null}
            </div>
          )}
        </Card>

        <Card
          title="Mes classes"
          link={{ label: "Voir toutes", href: "/campus/professeur/classes" }}
        >
          {data.classes.length === 0 ? (
            <Empty>Aucune classe affectée pour l&apos;instant.</Empty>
          ) : (
            <ul className={styles.list}>
              {data.classes.map((c) => (
                <li key={c.roomId} className={styles.row}>
                  <RowIcon
                    icon="clipboard"
                    tone={c.progressPct >= 60 ? "blue" : "orange"}
                  />
                  <span className={styles.rowMain}>
                    <strong>{c.name}</strong>
                    <small>
                      {c.studentsCount} étudiants • {c.subject}
                    </small>
                  </span>
                  <span style={{ width: 96 }}>
                    <Progress
                      value={c.progressPct}
                      color={colorForValue(c.progressPct)}
                    />
                  </span>
                  <span className={styles.progVal}>{c.progressPct}%</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Tâches prioritaires">
          {data.toCorrect === 0 && data.upcomingEvalCount === 0 ? (
            <Empty>Rien d&apos;urgent pour l&apos;instant.</Empty>
          ) : (
            <>
              {data.toCorrect > 0 ? (
                <Todo
                  icon="edit"
                  tone="red"
                  action={{ label: "›", href: "/campus/professeur/travaux" }}
                >
                  <strong>{data.toCorrect} copie(s) à corriger</strong>
                </Todo>
              ) : null}
              {data.upcomingEvalCount > 0 ? (
                <Todo
                  icon="clipboard"
                  tone="green"
                  action={{ label: "›", href: "/campus/professeur/travaux" }}
                >
                  <strong>
                    {data.upcomingEvalCount} évaluation(s) à venir
                  </strong>
                </Todo>
              ) : null}
            </>
          )}
        </Card>
      </div>

      <div className={styles.grid2}>
        <Card
          title="Étudiants nécessitant une attention"
          link={{ label: "Voir le suivi", href: "/campus/professeur/suivi" }}
        >
          {data.watch.length === 0 ? (
            <Empty>
              Aucun signal d&apos;alerte sur l&apos;assiduité récente.
            </Empty>
          ) : (
            <div className={styles.attnGrid}>
              {data.watch.map((w) => (
                <div key={w.id} className={styles.attnCard}>
                  <Avatar name={w.name} size={40} />
                  <span>
                    <strong>{w.name}</strong>
                    <small className={styles[`reason_${w.kind}`]}>
                      {w.reason}
                    </small>
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card
          title="Ressources récentes"
          link={{ label: "Voir tout", href: "/campus/professeur/ressources" }}
        >
          <Empty>Aucune ressource récente.</Empty>
        </Card>
      </div>
    </>
  );
}

/* =====================================================================
   RESPONSABLE PÉDAGOGIQUE
   ===================================================================== */
export type InstitutionAggregate = {
  formations: Array<{ id: string; name: string }>;
  formationsCount: number;
  classesCount: number;
  studentsCount: number;
  teachersCount: number;
  overallProgress: number;
  progressBySubject: Array<{ subject: string; pct: number }>;
  attendancePct: number;
  attendance: { present: number; late: number; absent: number };
  pendingJustifications: number;
  rooms: Array<{
    id: string;
    name: string;
    formationId: string | null;
    studentsCount: number;
  }>;
};

export type PedagogyHomeData = InstitutionAggregate & {
  lowProgressClasses: number;
  messages: Array<{
    id: string;
    title: string;
    body: string;
    createdAt: string;
  }>;
  documents: Array<{
    id: string;
    title: string;
    category: string;
    createdAt: string;
  }>;
};

export function PedagogyHome({ data }: { data: PedagogyHomeData }) {
  return (
    <>
      <section className={`${styles.banner} ${styles.bannerStrip}`}>
        <div className={styles.headRow}>
          <div>
            <h1 className={styles.headTitle}>Bonjour,</h1>
            <p className={styles.headSub}>
              Voici la vue pédagogique de votre établissement.
            </p>
          </div>
        </div>
      </section>

      <div className={styles.kpis}>
        <Kpi
          icon="users"
          tone="green"
          value={String(data.studentsCount)}
          label="Étudiants"
        />
        <Kpi
          icon="cap"
          tone="blue"
          value={String(data.formationsCount)}
          label="Formations actives"
        />
        <Kpi
          icon="layers"
          tone="violet"
          value={String(data.classesCount)}
          label="Classes"
        />
        <Kpi
          icon="user"
          tone="blue"
          value={String(data.teachersCount)}
          label="Enseignants"
        />
        <Kpi
          icon="chart"
          tone="green"
          value={`${data.overallProgress}%`}
          label="Programmes avancés"
        />
      </div>

      <div className={styles.grid3}>
        <Card
          title="Progression des programmes"
          link={{ label: "Voir le détail", href: "/campus/pedagogie/suivi" }}
        >
          {data.progressBySubject.length === 0 ? (
            <Empty>Aucune matière affectée pour l&apos;instant.</Empty>
          ) : (
            data.progressBySubject.map((p) => (
              <div key={p.subject} className={styles.progRow}>
                <span>{p.subject}</span>
                <Progress value={p.pct} color={colorForValue(p.pct)} />
                <span className={styles.progVal}>{p.pct}%</span>
              </div>
            ))
          )}
        </Card>

        <Card title="Taux de présence (30 derniers jours)">
          {data.attendance.present +
            data.attendance.late +
            data.attendance.absent ===
          0 ? (
            <Empty>Aucune séance enregistrée sur cette période.</Empty>
          ) : (
            <Donut
              segments={[
                {
                  label: "Présents",
                  value: data.attendance.present,
                  color: "#22b573",
                },
                {
                  label: "Retards",
                  value: data.attendance.late,
                  color: "#f59e0b",
                },
                {
                  label: "Absences",
                  value: data.attendance.absent,
                  color: "#ef5b5b",
                },
              ]}
              centerValue={`${data.attendancePct}%`}
              centerLabel="Présence globale"
            />
          )}
        </Card>

        <Card
          title="Documents récents"
          link={{ label: "Voir tout", href: "/campus/pedagogie/documents" }}
        >
          {data.documents.length === 0 ? (
            <Empty>Aucun document publié pour l&apos;instant.</Empty>
          ) : (
            <ul className={styles.list}>
              {data.documents.map((d) => (
                <Row
                  key={d.id}
                  lead={<RowIcon icon="file" tone="red" />}
                  title={d.title}
                  sub={relativeTime(d.createdAt)}
                />
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className={styles.grid3}>
        <Card title="Alertes & actions">
          {data.lowProgressClasses === 0 && data.pendingJustifications === 0 ? (
            <Empty>Aucune alerte pour l&apos;instant.</Empty>
          ) : (
            <>
              {data.lowProgressClasses > 0 ? (
                <Todo
                  icon="alert"
                  tone="red"
                  action={{
                    label: "Voir les détails",
                    href: "/campus/pedagogie/suivi",
                  }}
                >
                  {data.lowProgressClasses} matière(s) en retard de programme
                </Todo>
              ) : null}
              {data.pendingJustifications > 0 ? (
                <Todo
                  icon="shield"
                  tone="blue"
                  action={{
                    label: "Suivre",
                    href: "/campus/pedagogie/vie-scolaire",
                  }}
                >
                  {data.pendingJustifications} justificatif(s) d&apos;absence à
                  traiter
                </Todo>
              ) : null}
            </>
          )}
        </Card>

        <Card title="Derniers messages">
          {data.messages.length === 0 ? (
            <Empty>Aucun message pour l&apos;instant.</Empty>
          ) : (
            <ul className={styles.list}>
              {data.messages.map((m) => (
                <Row
                  key={m.id}
                  lead={<RowIcon icon="mail" tone="blue" />}
                  title={m.title}
                  sub={m.body}
                  side={relativeTime(m.createdAt)}
                />
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Classes de l'établissement"
          link={{ label: "Voir tout", href: "/campus/pedagogie/classes" }}
        >
          {data.rooms.length === 0 ? (
            <Empty>Aucune classe pour l&apos;instant.</Empty>
          ) : (
            <ul className={styles.list}>
              {data.rooms.map((r) => (
                <Row
                  key={r.id}
                  lead={<RowIcon icon="layers" tone="violet" />}
                  title={r.name}
                  sub={`${r.studentsCount} étudiants`}
                />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

/* =====================================================================
   ADMINISTRATEUR / DIRECTION
   ===================================================================== */
export type DirectionHomeData = InstitutionAggregate & {
  lowProgressClasses: number;
  inscriptions: Array<{
    id: string;
    name: string;
    role: string;
    status: string;
    createdAt: string;
  }>;
  pendingManagedUsers: number;
  effectifsParFormation: Array<{ name: string; value: number }>;
  activity: { labels: string[]; values: number[] };
};

const DONUT_COLORS = ["#0f9d9a", "#1a7fa8", "#ffb020", "#ff6a1f", "#7a4df0"];

const STATUS_LABEL: Record<string, string> = {
  active: "Actif",
  invited: "Invité (jamais connecté)",
  suspended: "Suspendu",
};

export function DirectionHome({ data }: { data: DirectionHomeData }) {
  const totalActivity = data.activity.values.reduce((a, b) => a + b, 0);
  return (
    <>
      <section className={`${styles.banner} ${styles.bannerStrip}`}>
        <div className={styles.headRow}>
          <div>
            <h1 className={styles.headTitle}>Bonjour,</h1>
            <p className={styles.headSub}>
              Voici la vue d&apos;ensemble de votre établissement.
            </p>
          </div>
        </div>
      </section>

      <div className={styles.kpis}>
        <Kpi
          icon="users"
          tone="blue"
          value={String(data.studentsCount)}
          label="Étudiants"
        />
        <Kpi
          icon="user"
          tone="violet"
          value={String(data.teachersCount)}
          label="Enseignants"
        />
        <Kpi
          icon="cap"
          tone="orange"
          value={String(data.formationsCount)}
          label="Formations"
        />
        <Kpi
          icon="layers"
          tone="green"
          value={String(data.classesCount)}
          label="Classes"
        />
        <Kpi
          icon="checkCircle"
          tone="green"
          value={`${data.attendancePct}%`}
          label="Taux de présence"
        />
        <Kpi
          icon="chart"
          tone="violet"
          value={`${data.overallProgress}%`}
          label="Programmes avancés"
        />
      </div>

      <div className={styles.grid3lead}>
        <Card
          title="Inscriptions récentes"
          link={{
            label: "Voir toutes",
            href: "/campus/direction/inscriptions",
          }}
        >
          {data.inscriptions.length === 0 ? (
            <Empty>Aucune inscription récente.</Empty>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Rôle</th>
                    <th>Statut</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.inscriptions.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <span className={styles.person}>
                          <Avatar name={i.name} size={28} />
                          {i.name}
                        </span>
                      </td>
                      <td>{i.role}</td>
                      <td>
                        <Badge kind={i.status === "active" ? "ok" : i.status === "suspended" ? "bad" : "pending"}>
                          {STATUS_LABEL[i.status] ?? i.status}
                        </Badge>
                      </td>
                      <td>{relativeTime(i.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card
          title="Effectifs par formation"
          link={{
            label: "Voir le détail",
            href: "/campus/direction/formations-classes",
          }}
        >
          {data.effectifsParFormation.length === 0 ? (
            <Empty>Aucun étudiant réparti pour l&apos;instant.</Empty>
          ) : (
            <Donut
              segments={data.effectifsParFormation.map((f, i) => ({
                label: f.name,
                value: f.value,
                color: DONUT_COLORS[i % DONUT_COLORS.length],
              }))}
              centerValue={String(data.studentsCount)}
              centerLabel="Étudiants"
            />
          )}
        </Card>

        <Card title="Activité pédagogique">
          {totalActivity === 0 ? (
            <Empty>Aucune séance tenue sur les 7 derniers jours.</Empty>
          ) : (
            <LineChart
              color="#0f9d9a"
              labels={data.activity.labels}
              values={data.activity.values}
            />
          )}
          <span className={`${styles.badge} ${styles.b_ok}`}>
            Séances tenues (7 derniers jours) : {totalActivity}
          </span>
        </Card>
      </div>

      <div className={styles.grid3}>
        <Card title="Tâches administratives">
          {data.pendingManagedUsers === 0 &&
          data.pendingJustifications === 0 ? (
            <Empty>Aucune tâche en attente.</Empty>
          ) : (
            <>
              {data.pendingManagedUsers > 0 ? (
                <Todo
                  icon="userPlus"
                  tone="blue"
                  action={{
                    label: "Voir",
                    href: "/campus/direction/inscriptions",
                  }}
                >
                  Comptes créés jamais connectés ({data.pendingManagedUsers})
                </Todo>
              ) : null}
              {data.pendingJustifications > 0 ? (
                <Todo
                  icon="shield"
                  tone="blue"
                  action={{ label: "Voir", href: "/campus/direction/suivi" }}
                >
                  Traiter les justificatifs d&apos;absence (
                  {data.pendingJustifications})
                </Todo>
              ) : null}
            </>
          )}
        </Card>

        <Card title="Alertes">
          {data.lowProgressClasses === 0 ? (
            <Empty>Aucune alerte pour l&apos;instant.</Empty>
          ) : (
            <Todo icon="alert" tone="orange">
              {data.lowProgressClasses} matière(s) en retard de programme
            </Todo>
          )}
        </Card>

        <Card title="Accès rapides">
          <div className={styles.quickGrid}>
            <Link
              href="/campus/direction/inscriptions"
              className={styles.quickTile}
            >
              <Icon name="userPlus" />
              Ajouter un étudiant
            </Link>
            <Link
              href="/campus/direction/formations-classes"
              className={styles.quickTile}
            >
              <Icon name="layers" />
              Créer une classe
            </Link>
            <Link
              href="/campus/direction/emploi-du-temps"
              className={styles.quickTile}
            >
              <Icon name="calendar" />
              Planifier un cours
            </Link>
            <Link
              href="/campus/direction/communication"
              className={styles.quickTile}
            >
              <Icon name="send" />
              Envoyer une annonce
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
}
