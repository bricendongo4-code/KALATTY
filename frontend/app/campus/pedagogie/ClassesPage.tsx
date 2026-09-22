"use client";

import { useEffect, useState } from "react";
import styles from "../campus.module.css";
import Shell from "../Shell";
import { useCampusContext, campusFetch } from "../useCampusHome";
import { Card } from "../ui";

type RoomSummary = { id: string; name: string; studentsCount: number; teacherNames: string[] };
type Formation = { id: string; name: string; level: string | null; rooms: RoomSummary[] };

/** Vue lecture seule : le responsable pedagogique consulte les formations et
 * classes de l'etablissement, sans pouvoir en creer (reserve a la direction). */
export default function PedagogyClassesPage() {
  const { loading, error, context, mismatch } = useCampusContext("pedagogie");
  const [formations, setFormations] = useState<Formation[] | null>(null);
  const [unassignedRooms, setUnassignedRooms] = useState<RoomSummary[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    if (!context) return;
    campusFetch(`/campus/institutions/${context.institutionId}/formations`)
      .then((result) => {
        setFormations(result.formations ?? []);
        setUnassignedRooms(result.unassignedRooms ?? []);
      })
      .catch((e) => setListError(e instanceof Error ? e.message : "Impossible de charger les classes."));
  }, [context]);

  if (mismatch) {
    return (
      <section className={`${styles.card} ${styles.soon}`} style={{ margin: 24 }}>
        <h2>Ce n&apos;est pas votre espace</h2>
        <p>Cette page est réservée au responsable pédagogique.</p>
      </section>
    );
  }

  return (
    <Shell role="pedagogie" activeSlug="classes" displayName={context?.displayName} institutionName={context?.institutionName} note={error ?? null}>
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
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
