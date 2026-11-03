"use client";
import { useCallback, useEffect, useState } from "react";
import styles from "./approval-center.module.css";
type Proposal = {
  id: string;
  department: string;
  title: string;
  rationale: string;
  status: "pending" | "approved" | "rejected" | "revision_requested";
  decision_note: string | null;
  created_at: string;
  decided_at: string | null;
  evidence?: {
    source: string;
    available: boolean;
    count?: number;
    detail?: string;
  }[];
  patch?: { file: string; oldText: string; newText: string; digest: string };
  execution_status?: string;
  execution_error?: string;
  pull_request_url?: string;
};
const labels: Record<string, string> = {
  security: "Sécurité",
  qa: "Qualité",
  developer: "Développeur",
  ux: "UX/UI",
  product: "Produit",
  marketing: "Marketing",
  sales: "Commercial",
  support: "Support",
  finance: "Finance",
  analytics: "Analytics",
  crm: "CRM",
};
const execution: Record<string, string> = {
  awaiting_approval: "Correction à approuver",
  queued: "Correction en attente de préparation",
  preparing: "Préparation sur une branche isolée",
  pr_ready: "Correction préparée · vérifications GitHub à consulter",
  failed: "Préparation interrompue",
  merged: "Fusion effectuée · consulter le déploiement",
  not_applicable: "Recommandation sans correction de code",
};
const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
export default function ApprovalCenter({
  onChange,
}: {
  onChange?: () => Promise<void>;
}) {
  const [items, setItems] = useState<Proposal[]>([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState<string | null>(null),
    [filter, setFilter] = useState("pending"),
    [note, setNote] = useState<Record<string, string>>({}),
    [ready, setReady] = useState(false);
  const load = useCallback(async () => {
    const token = localStorage.getItem("kalatty_token");
    if (!token) {
      setError("Connectez-vous pour consulter les validations.");
      return;
    }
    try {
      const res = await fetch(API + "/ai-control-center/proposals", {
        headers: { Authorization: "Bearer " + token },
        cache: "no-store",
      });
      if (!res.ok)
        throw Error(
          res.status === 403
            ? "Accès réservé au propriétaire."
            : "Service de validation indisponible (" + res.status + ").",
        );
      const body = (await res.json()) as { proposals?: Proposal[] };
      setItems(Array.isArray(body.proposals) ? body.proposals : []);
      setError("");
      setReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    }
  }, []);
  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      void load();
    }, 15000);
    return () => clearInterval(timer);
  }, [load]);
  async function action(
    p: Proposal,
    path: string,
    body: unknown,
    message: string,
  ) {
    if (busy) return;
    setBusy(p.id);
    setError("");
    setNotice("");
    try {
      const res = await fetch(
        API +
          "/ai-control-center/proposals/" +
          encodeURIComponent(p.id) +
          "/" +
          path,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + localStorage.getItem("kalatty_token"),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw Error(
          typeof detail.message === "string"
            ? detail.message
            : "Action refusée (" + res.status + ").",
        );
      }
      setNotice(message);
      await load();
      await onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de décision");
    } finally {
      setBusy(null);
    }
  }
  async function decide(
    p: Proposal,
    decision: "approved" | "rejected" | "revision_requested",
  ) {
    if (
      decision === "approved" &&
      p.patch &&
      !confirm(
        "Approuver ce changement exact et préparer sa correction sur une branche isolée ? La publication sera à valider après les tests.",
      )
    )
      return;
    await action(
      p,
      "decision",
      { decision, note: note[p.id] ?? "" },
      decision === "approved" && p.patch
        ? "Correction approuvée et mise en préparation."
        : "Décision enregistrée.",
    );
    if (decision === "approved") setFilter("all");
  }
  const visible = items.filter((p) => filter === "all" || p.status === filter);
  return (
    <section
      className={styles.root}
      aria-label="Centre de validation des agents"
    >
      <div className={styles.stats}>
        <div>
          <strong>{items.filter((p) => p.status === "pending").length}</strong>
          <span>À examiner</span>
        </div>
        <div>
          <strong>{items.filter((p) => p.status === "approved").length}</strong>
          <span>Approuvées</span>
        </div>
        <div>
          <strong>{items.filter((p) => p.status === "rejected").length}</strong>
          <span>Refusées</span>
        </div>
      </div>
      <div className={styles.head}>
        <h2>Propositions des agents</h2>
        <button onClick={() => void load()} type="button">
          Actualiser
        </button>
      </div>
      <div className={styles.filters}>
        <label htmlFor="proposal-filter">Afficher</label>
        <select
          id="proposal-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="pending">En attente</option>
          <option value="all">Toutes</option>
          <option value="approved">Approuvées</option>
          <option value="rejected">Refusées</option>
          <option value="revision_requested">Modifications demandées</option>
        </select>
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {ready && visible.length === 0 && (
        <p className={styles.empty}>Aucune proposition dans cette catégorie.</p>
      )}
      <div className={styles.list}>
        {visible.map((p) => (
          <article key={p.id} className={styles.item}>
            <div className={styles.itemTop}>
              <div className={styles.itemMain}>
                <div className={styles.itemHead}>
                  <span>{labels[p.department] ?? p.department}</span>
                  <span>
                    {p.status === "pending"
                      ? "En attente"
                      : p.status === "approved"
                        ? "Approuvée"
                        : p.status === "rejected"
                          ? "Refusée"
                          : "Modification demandée"}
                  </span>
                </div>
                <h3>{p.title}</h3>
                <small>{new Date(p.created_at).toLocaleString("fr-FR")}</small>
              </div>
              {p.status === "pending" && (
                <div className={styles.actions}>
                  <button
                    disabled={busy !== null}
                    onClick={() => void decide(p, "approved")}
                  >
                    {p.patch
                      ? "Approuver la correction"
                      : "Valider la recommandation"}
                  </button>
                  <button
                    disabled={busy !== null}
                    className={styles.reject}
                    onClick={() => void decide(p, "rejected")}
                  >
                    Refuser
                  </button>
                </div>
              )}
            </div>
            <details className={styles.proposalDetails}>
              <summary>Voir l’analyse et les preuves</summary>
              <p>{p.rationale}</p>
              {!!p.evidence?.length && (
                <ul>
                  {p.evidence.map((e, i) => (
                    <li key={i}>
                      {e.source} :{" "}
                      {e.available
                        ? (e.count ?? e.detail ?? "Disponible")
                        : "Indisponible"}
                    </li>
                  ))}
                </ul>
              )}
              {p.patch && (
                <details className={styles.patchDetails}>
                  <summary>Changement exact · {p.patch.file}</summary>
                  <h4>Avant</h4>
                  <pre>{p.patch.oldText}</pre>
                  <h4>Après</h4>
                  <pre>{p.patch.newText}</pre>
                  <small>Empreinte : {p.patch.digest}</small>
                </details>
              )}
              {p.decision_note && (
                <p>
                  <strong>Votre commentaire :</strong> {p.decision_note}
                </p>
              )}
              {p.status === "pending" && (
                <>
                  <label className={styles.note}>
                    Demander un ajustement
                    <textarea
                      maxLength={2000}
                      value={note[p.id] ?? ""}
                      onChange={(e) =>
                        setNote((prev) => ({ ...prev, [p.id]: e.target.value }))
                      }
                      placeholder="Précisez ce que l’agent doit modifier"
                    />
                  </label>
                  <button
                    className={styles.revision}
                    disabled={busy !== null || !(note[p.id] ?? "").trim()}
                    onClick={() => void decide(p, "revision_requested")}
                  >
                    Demander une modification
                  </button>
                </>
              )}
            </details>
            {p.status !== "pending" && p.execution_status && (
              <p className={styles.execution}>
                <strong>
                  {execution[p.execution_status] ?? p.execution_status}
                </strong>
              </p>
            )}
            {p.execution_error && (
              <p className={styles.error}>{p.execution_error}</p>
            )}
            {p.pull_request_url &&
              /^https:\/\/github\.com\/bricendongo4-code\/KALATTY\/pull\/\d+$/.test(
                p.pull_request_url,
              ) && (
                <a href={p.pull_request_url} target="_blank" rel="noreferrer">
                  Consulter la correction et les tests ↗
                </a>
              )}
            {p.status === "approved" && p.execution_status === "failed" && (
              <div className={styles.actions}>
                <button
                  disabled={busy !== null}
                  onClick={() =>
                    void action(p, "retry", {}, "Préparation relancée.")
                  }
                >
                  Réessayer la préparation
                </button>
              </div>
            )}
            {p.status === "approved" && p.execution_status === "pr_ready" && (
              <div className={styles.actions}>
                <button
                  disabled={busy !== null}
                  onClick={() => {
                    if (
                      confirm(
                        "Publier cette correction dans Kalatty ? La version approuvée et les tests requis seront vérifiés avant fusion.",
                      )
                    )
                      void action(
                        p,
                        "release",
                        {},
                        "Correction fusionnée. Consultez le déploiement pour confirmer sa mise en ligne.",
                      );
                  }}
                >
                  Publier la correction après les tests
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
      <div className={styles.safety}>
        <strong>Votre validation, à chaque étape</strong>
        <p>
          Approuver prépare la correction. Sa publication reste une décision
          séparée, après les tests.
        </p>
      </div>
    </section>
  );
}
