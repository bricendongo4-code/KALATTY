"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { commerceFetch, departments, statuses } from "./api";
import s from "./ui.module.css";
type Review = {
  id: string;
  rating: number;
  category: string;
  body: string;
  status: string;
  suggested_department: string;
  routing_reason: string;
  assigned_department: string | null;
  decision_note: string;
  proposal_id: string | null;
  version: number;
  created_at: string;
  profiles: { fullname: string } | null;
};
type Data = { reviews: Review[]; total: number; page: number };
export default function SupportWorkspace() {
  const [data, setData] = useState<Data | null>(null),
    [page, setPage] = useState(0),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(
    async () =>
      setData(
        await commerceFetch<Data>(`/commerce/owner/support?page=${page}`),
      ),
    [page],
  );
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [load]);
  async function action(e: FormEvent<HTMLFormElement>, r: Review) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      routing = !r.proposal_id;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await commerceFetch(
        `/commerce/owner/support/${r.id}${routing ? "/route" : ""}`,
        routing
          ? {
              department: f.get("department"),
              note: f.get("note"),
              version: r.version,
            }
          : {
              status: f.get("status"),
              note: f.get("note"),
              version: r.version,
            },
        routing ? "POST" : "PATCH",
      );
      setNotice(
        routing
          ? "Orientation confirmée. Une proposition attend l’examen du service dans le centre de validation."
          : "Suivi mis à jour.",
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={s.workspace}>
      <header className={s.head}>
        <div>
          <h1>Avis & support</h1>
          <p>
            Lire les retours, confirmer le service proposé et suivre leur
            traitement.
          </p>
        </div>
        <button
          className={s.secondary}
          onClick={() => void load().catch((e) => setError(e.message))}
        >
          Actualiser
        </button>
      </header>
      <p className={s.note}>
        Le classement initial repose sur le sujet et les mots du retour, sans
        appel IA payant. Vous pouvez le corriger avant orientation. Orienter un
        avis crée une proposition à examiner ; aucune correction n’est publiée
        automatiquement.
      </p>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className={s.notice} role="status">
          {notice}
        </p>
      )}
      {data ? (
        <>
          <p>
            {data.total} avis · page {page + 1}
          </p>
          {data.reviews.length ? (
            data.reviews.map((r) => (
              <article className={s.panel} key={r.id}>
                <div className={s.row}>
                  <h2>{r.profiles?.fullname ?? "Utilisateur Kalatty"}</h2>
                  <span className={s.badge}>{r.rating} / 5</span>
                  <span className={s.badge}>{statuses[r.status]}</span>
                  <small>
                    {new Date(r.created_at).toLocaleString("fr-FR")}
                  </small>
                </div>
                <p className={s.quote}>{r.body}</p>
                <p>
                  <strong>
                    Service proposé : {departments[r.suggested_department]}
                  </strong>{" "}
                  — {r.routing_reason}
                </p>
                <form onSubmit={(e) => void action(e, r)}>
                  <fieldset disabled={busy || r.status === "resolved"}>
                    {!r.proposal_id ? (
                      <label>
                        Orienter vers
                        <select
                          name="department"
                          defaultValue={r.suggested_department}
                        >
                          {Object.entries(departments).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <>
                        <p>
                          Service confirmé :{" "}
                          {departments[r.assigned_department ?? ""]} ·
                          Proposition : {r.proposal_id}
                        </p>
                        <label>
                          État du traitement
                          <select
                            name="status"
                            defaultValue={
                              r.status === "resolved"
                                ? "resolved"
                                : "in_progress"
                            }
                          >
                            <option value="in_progress">En cours</option>
                            <option value="resolved">Traité</option>
                          </select>
                        </label>
                      </>
                    )}
                    <label>
                      Note de suivi visible par l’auteur
                      <textarea
                        name="note"
                        required
                        minLength={3}
                        maxLength={500}
                        rows={2}
                        defaultValue={r.decision_note || r.routing_reason}
                      />
                    </label>
                    <button>
                      {r.status === "resolved"
                        ? "Avis traité"
                        : r.proposal_id
                          ? "Enregistrer le suivi"
                          : "Confirmer l’orientation"}
                    </button>
                  </fieldset>
                </form>
              </article>
            ))
          ) : (
            <section className={s.panel}>
              Aucun avis reçu. Les utilisateurs peuvent donner leur avis depuis
              leur menu Kalatty.
            </section>
          )}
          <div className={s.pagination}>
            <button
              className={s.secondary}
              disabled={page === 0 || busy}
              onClick={() => setPage((p) => p - 1)}
            >
              Précédent
            </button>
            <button
              className={s.secondary}
              disabled={(page + 1) * 50 >= data.total || busy}
              onClick={() => setPage((p) => p + 1)}
            >
              Suivant
            </button>
          </div>
        </>
      ) : !error ? (
        <p role="status">Chargement des avis…</p>
      ) : null}
    </section>
  );
}
