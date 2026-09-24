"use client";

import { useEffect, useState } from "react";
import styles from "../establishment.module.css";
import Shell from "../Shell";
import { useCampusContext, campusFetch } from "../useEstablishment";
import { Card, Icon } from "../ui";

type RoomSummary = { id: string; name: string; studentsCount: number; teacherNames: string[] };
type Formation = { id: string; name: string; level: string | null; rooms: RoomSummary[] };
type RoomDetails = {
  id: string;
  name: string;
  description: string | null;
  members: Array<{ id: string; role: string; status?: string; profile?: { fullname?: string; email?: string } | null }>;
  courses: Array<{ id: string; course?: { title?: string } | null }>;
  assignments: Array<{ id: string; title: string; submissionCount: number; pendingCount: number; reviewedCount: number }>;
};

/** Vue lecture seule : le responsable pedagogique consulte les formations et
 * classes de l'etablissement, sans pouvoir en creer (reserve a la direction). */
export default function PedagogyClassesPage() {
  const { loading, error, context, mismatch } = useCampusContext("pedagogy");
  const [formations, setFormations] = useState<Formation[] | null>(null);
  const [unassignedRooms, setUnassignedRooms] = useState<RoomSummary[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!context) return;
    campusFetch(`/campus/institutions/${context.institutionId}/formations`)
      .then((result) => {
        setFormations(result.formations ?? []);
        setUnassignedRooms(result.unassignedRooms ?? []);
      })
      .catch((e) => setListError(e instanceof Error ? e.message : "Impossible de charger les classes."));
  }, [context]);

  async function openRoom(roomId: string) {
    setDetailLoading(true);
    setListError(null);
    try {
      setSelectedRoom(await campusFetch(`/institutions/rooms/${roomId}`));
    } catch (reason) {
      setListError(reason instanceof Error ? reason.message : "Impossible d’ouvrir cette classe.");
    } finally {
      setDetailLoading(false);
    }
  }

  if (mismatch) {
    return (
      <section className={`${styles.card} ${styles.soon}`} style={{ margin: 24 }}>
        <h2>Ce n&apos;est pas votre espace</h2>
        <p>Cette page est réservée au responsable pédagogique.</p>
      </section>
    );
  }

  return (
    <Shell role="pedagogy" activeSlug="classes" displayName={context?.displayName} institutionName={context?.institutionName} note={error ?? null}>
      {loading ? (
        <p>Chargement...</p>
      ) : (
        <>
          <div className={styles.pageHead}>
            <div>
              <h1 className={styles.headTitle}>Classes &amp; promotions</h1>
              <p className={styles.headSub}>Vue d&apos;ensemble des formations et classes de l&apos;établissement.</p>
            </div>
          </div>

          {listError ? <p className={styles.inlineError}>{listError}</p> : null}

          {!formations ? (
            <p>Chargement...</p>
          ) : formations.length === 0 && (!unassignedRooms || unassignedRooms.length === 0) ? (
            <Card title="Aucune formation pour l'instant">
              <p style={{ color: "var(--muted)", fontSize: 13 }}>L&apos;administrateur n&apos;a pas encore créé de formation.</p>
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
                          <button type="button" className={styles.quickBtn} onClick={() => void openRoom(r.id)}>Voir le détail</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              ))}
              {unassignedRooms && unassignedRooms.length > 0 ? (
                <Card title="Classes sans formation">
                  <ul className={styles.list}>
                    {unassignedRooms.map((r) => (
                      <li key={r.id} className={styles.row}>
                        <span className={styles.rowMain}>
                          <strong>{r.name}</strong>
                          <small>{r.studentsCount} étudiant(s)</small>
                        </span>
                        <button type="button" className={styles.quickBtn} onClick={() => void openRoom(r.id)}>Voir le détail</button>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}
            </div>
          )}

          {detailLoading ? <Card title="Chargement de la classe…"><p>Récupération de l’effectif, des cours et des travaux.</p></Card> : selectedRoom ? <section className={styles.detailPanel} aria-labelledby="room-detail-title">
            <div className={styles.detailPanelHead}><div><small>VUE PÉDAGOGIQUE</small><h2 id="room-detail-title">{selectedRoom.name}</h2><p>{selectedRoom.description || "Suivi détaillé de cette classe."}</p></div><button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setSelectedRoom(null)}>Fermer</button></div>
            <div className={styles.kpis}>
              <article><Icon name="users" /><strong>{selectedRoom.members.filter((item) => item.role === "student").length}</strong><span>Étudiants</span></article>
              <article><Icon name="user" /><strong>{selectedRoom.members.filter((item) => item.role === "teacher").length}</strong><span>Professeurs</span></article>
              <article><Icon name="book" /><strong>{selectedRoom.courses.length}</strong><span>Cours affectés</span></article>
              <article><Icon name="clipboard" /><strong>{selectedRoom.assignments.length}</strong><span>Travaux</span></article>
            </div>
            <div className={styles.grid2}>
              <Card title="Équipe et effectif"><ul className={styles.list}>{selectedRoom.members.length ? selectedRoom.members.map((member) => <li className={styles.row} key={member.id}><span className={styles.rowMain}><strong>{member.profile?.fullname ?? "Membre"}</strong><small>{member.role === "teacher" ? "Professeur" : member.role === "student" ? "Étudiant" : member.role}{member.status ? ` · ${member.status}` : ""}</small></span></li>) : <li>Aucun membre affecté.</li>}</ul></Card>
              <Card title="Travaux et corrections"><ul className={styles.list}>{selectedRoom.assignments.length ? selectedRoom.assignments.map((assignment) => <li className={styles.row} key={assignment.id}><span className={styles.rowMain}><strong>{assignment.title}</strong><small>{assignment.submissionCount} remise(s) · {assignment.reviewedCount} corrigée(s)</small></span>{assignment.pendingCount ? <strong>{assignment.pendingCount} à corriger</strong> : null}</li>) : <li>Aucun travail publié.</li>}</ul></Card>
            </div>
          </section> : null}
        </>
      )}
    </Shell>
  );
}
