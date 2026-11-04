"use client";
import { useCallback, useEffect, useState } from "react";
import styles from "./supervision.module.css";
type Run = {
  id: string;
  created_at: string;
  status: string;
  error?: string;
  evidence?: {
    department: string;
    source: string;
    available: boolean;
    count?: number;
    detail?: string;
  }[];
};
type State = {
  enabled: boolean;
  ai_enabled: boolean;
  last_run_at: string | null;
  next_run_at: string;
  last_error: string | null;
  lease_until: string | null;
  brainConfigured: boolean;
  brainProvider?: string;
  brainModel?: string;
  dailyAiCallLimit?: number;
  automaticDailyAiCallLimit?: number;
  reservedManualAiCalls?: number;
  githubConfigured: boolean;
  runs: Run[];
};
const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
export default function SupervisionPanel({
  compact = false,
  onRefresh,
}: {
  compact?: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [state, setState] = useState<State | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const request = useCallback(async (path: string, body?: unknown) => {
    const r = await fetch(API + "/ai-control-center/" + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Authorization:
          "Bearer " + (localStorage.getItem("kalatty_token") ?? ""),
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      cache: "no-store",
    });
    const result = await r.json().catch(() => ({}));
    if (!r.ok)
      throw Error(
        typeof result.message === "string"
          ? result.message
          : "Supervision indisponible. Vérifiez votre connexion.",
      );
    return result;
  }, []);
  const load = useCallback(async () => {
    try {
      setState(await request("supervision"));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de supervision");
    }
  }, [request]);
  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      void load();
    }, 15000);
    return () => clearInterval(timer);
  }, [load]);
  async function action(path: string, body: unknown) {
    setBusy(true);
    setNotice("");
    try {
      const result = await request(path, body);
      setNotice(
        path === "brain/check"
          ? (result.message ?? "Connexion IA vérifiée.")
          : path.endsWith("run")
            ? "Contrôle demandé. Le rapport apparaîtra à la fin du cycle."
            : "Configuration enregistrée.",
      );
      await load();
      await onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action impossible");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className={styles.panel + (compact ? " " + styles.compact : "")}
      aria-label="Supervision autonome"
    >
      <div className={styles.header}>
        <div>
          <h2>Supervision des agents</h2>
          <p>
            {state
              ? state.enabled
                ? "Contrôles automatiques chaque heure"
                : "Supervision en pause"
              : "Vérification de la supervision…"}
          </p>
        </div>
        <button
          disabled={busy || !state}
          onClick={() => void action("supervision/run", {})}
        >
          {compact ? "Contrôler" : "Contrôler maintenant"}
        </button>
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {state && (
        <>
          <div className={styles.status}>
            {!compact && (
              <span>
                Dernier contrôle :{" "}
                <b>
                  {state.last_run_at
                    ? new Date(state.last_run_at).toLocaleString("fr-FR")
                    : "Pas encore terminé"}
                </b>
              </span>
            )}
            <span>
              IA :{" "}
              <b>
                {state.ai_enabled
                  ? state.brainConfigured
                    ? `Activée · ${state.dailyAiCallLimit ?? 12} appels/jour maximum`
                    : "Configuration manquante"
                  : state.brainProvider
                    ? "Analyses automatiques désactivées"
                    : "Désactivée · aucun appel payant"}
              </b>
            </span>
            {!compact && (
              <span>
                Préparation des corrections :{" "}
                <b>
                  {state.githubConfigured
                    ? "Accès configuré"
                    : "Accès à configurer"}
                </b>
              </span>
            )}
          </div>
          {!compact && state.brainProvider && (
            <div className={styles.connection}>
              <span>
                Fournisseur :{" "}
                <b>
                  {state.brainProvider === "groq"
                    ? "Groq"
                    : state.brainProvider === "openai"
                      ? "OpenAI"
                      : "Configuration non prise en charge"}
                </b>
                {state.brainModel ? ` · ${state.brainModel}` : ""}
                <br />
                {state.brainConfigured
                  ? "Clé serveur présente"
                  : state.brainProvider === "groq"
                    ? "Clé GROQ_API_KEY à ajouter dans Railway"
                    : "Configuration serveur à compléter"}
              </span>
              <button
                disabled={busy || !state.brainConfigured}
                onClick={() => void action("brain/check", {})}
              >
                Tester la connexion IA
              </button>
            </div>
          )}
          {state.last_error && (
            <p role="alert" className={styles.error}>
              {state.last_error}
            </p>
          )}
          {!compact && (
            <>
              <div className={styles.options}>
                <label>
                  <input
                    type="checkbox"
                    checked={state.enabled}
                    disabled={busy}
                    onChange={(e) =>
                      void action("supervision/configure", {
                        enabled: e.target.checked,
                        aiEnabled: state.ai_enabled,
                      })
                    }
                  />{" "}
                  Contrôles automatiques
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={state.ai_enabled}
                    disabled={busy || !state.brainConfigured}
                    onChange={(e) =>
                      void action("supervision/configure", {
                        enabled: state.enabled,
                        aiEnabled: e.target.checked,
                      })
                    }
                  />{" "}
                  Analyses IA automatiques (plafond de{" "}
                  {state.automaticDailyAiCallLimit ??
                    state.dailyAiCallLimit ??
                    12}{" "}
                  appels/jour)
                </label>
              </div>
              {state.reservedManualAiCalls !== undefined && (
                <p>
                  Budget partagé : {state.dailyAiCallLimit} appels/jour, dont{" "}
                  {state.reservedManualAiCalls} réservés aux analyses manuelles,
                  diagnostics et préparations de corrections. Les limites du
                  fournisseur peuvent être atteintes avant ce plafond.
                </p>
              )}
              <details className={styles.explanation}>
                <summary>Que vérifient les agents ?</summary>
                <p>
                  Les contrôles gratuits lisent les compteurs, la CI et les
                  pages publiques. Les parcours connectés et les paiements
                  nécessitent des tests dédiés. L’agent développeur peut
                  proposer une correction sur un fichier inspecté par cycle ;
                  vous voyez le changement exact avant de décider.
                </p>
              </details>
              <h3>Derniers contrôles</h3>
              {state.runs.length === 0 && <p>Aucun contrôle enregistré.</p>}
              {state.runs.map((run) => (
                <details key={run.id} className={styles.run}>
                  <summary>
                    {new Date(run.created_at).toLocaleString("fr-FR")} ·{" "}
                    {run.status === "completed"
                      ? "Terminé"
                      : run.status === "failed"
                        ? "Échec"
                        : "En cours"}
                  </summary>
                  {run.error && <p className={styles.error}>{run.error}</p>}
                  <ul>
                    {run.evidence?.map((e, i) => (
                      <li key={i}>
                        <b>{e.department}</b> · {e.source} :{" "}
                        {e.available
                          ? (e.count ?? e.detail ?? "Disponible")
                          : "Indisponible"}
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </>
          )}
        </>
      )}
    </section>
  );
}
