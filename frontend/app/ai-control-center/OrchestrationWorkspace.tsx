"use client";
import { useCallback, useEffect, useState } from "react";
import styles from "./orchestration.module.css";
const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const names: Record<string, string> = {
  security: "Sécurité",
  qa: "Qualité",
  developer: "Développeur",
  ux: "UX / UI",
  product: "Produit",
  marketing: "Marketing",
  sales: "Commercial",
  support: "Support",
  finance: "Finance",
  analytics: "Analytics",
  crm: "CRM",
};
const states: Record<string, string> = {
  active: "En cours",
  awaiting_approval: "À valider",
  completed: "Diagnostic terminé",
  blocked: "Bloquée",
  cancelled: "Annulée",
  queued: "En attente",
  running: "En cours",
};
type Task = {
  id: string;
  department: string;
  stage: string;
  status: string;
  attempts: number;
  retry_at?: string;
  last_error?: string;
  result?: { summary: string; recommendation: string; capturedAt: string };
};
type Mission = {
  id: string;
  title: string;
  objective: string;
  origin: string;
  status: string;
  created_at: string;
  proposal_id?: string;
  tasks: Task[];
  change?: {
    id: string;
    status: string;
    execution_status: string;
    execution_error?: string;
    pull_request_url?: string;
  };
};
type Dashboard = {
  state: {
    enabled: boolean;
    auto_assign: boolean;
    last_cycle_at?: string;
    last_error?: string;
  };
  usage?: { calls: number; automaticCalls: number };
  missions: Mission[];
  dailyAiCallLimit: number;
  automaticDailyAiCallLimit: number;
  brainProvider: string;
  brainModel: string;
  brainConfigured: boolean;
};
function date(value?: string) {
  return value ? new Date(value).toLocaleString("fr-FR") : "Pas encore exécuté";
}
export default function OrchestrationWorkspace({
  onReview,
}: {
  onReview: (id: string) => void;
}) {
  const [data, setData] = useState<Dashboard | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [title, setTitle] = useState(""),
    [objective, setObjective] = useState(""),
    [department, setDepartment] = useState("developer"),
    [priority, setPriority] = useState("normal"),
    [requestKey, setRequestKey] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const request = useCallback(async (path: string, body?: unknown) => {
    const token = localStorage.getItem("kalatty_token");
    if (!token) throw Error("Connectez-vous pour consulter les missions.");
    const r = await fetch(API + "/ai-control-center/orchestration" + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const result = await r.json().catch(() => ({}));
    if (!r.ok)
      throw Error(
        typeof result.message === "string"
          ? result.message
          : "Suivi des missions indisponible.",
      );
    return result;
  }, []);
  const load = useCallback(async () => {
    try {
      setData(await request(""));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible");
    }
  }, [request]);
  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      void load();
    }, 20000);
    return () => clearInterval(timer);
  }, [load]);
  async function action(path: string, body: unknown, message: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await request(path, body);
      setNotice(message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action impossible");
    } finally {
      setBusy(false);
    }
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const key = requestKey || crypto.randomUUID();
    setRequestKey(key);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await request("/missions", {
        title,
        objective,
        department,
        priority,
        requestKey: key,
      });
      setTitle("");
      setObjective("");
      setRequestKey("");
      setNotice("Mission créée : analyse puis contrôle par un second agent.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Création impossible");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.workspace} aria-label="Orchestration des agents">
      <header>
        <p className={styles.eyebrow}>PILOTAGE DES MISSIONS</p>
        <h1>Orchestration des agents</h1>
        <p>
          Confiez un objectif à un agent. Un second agent contrôle son analyse ;
          les changements justifiés arrivent ensuite dans votre centre de
          validation.
        </p>
      </header>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className={styles.notice}>
          {notice}
        </p>
      )}
      {data && (
        <div className={styles.panel}>
          <div className={styles.row}>
            <h2>
              {data.state.enabled
                ? "Orchestrateur actif"
                : "Orchestrateur en pause"}
            </h2>
            <button
              disabled={busy}
              onClick={() =>
                void action(
                  "/configure",
                  {
                    enabled: !data.state.enabled,
                    autoAssign: data.state.auto_assign,
                  },
                  "Configuration enregistrée. Une tâche déjà lancée peut terminer.",
                )
              }
            >
              {data.state.enabled ? "Mettre en pause" : "Reprendre"}
            </button>
          </div>
          <p>
            {data.brainProvider} · {data.brainModel} ·{" "}
            {data.brainConfigured
              ? "Clé configurée"
              : "Connexion IA à configurer"}
          </p>
          <p>
            <strong>
              {data.usage?.calls ?? 0} / {data.dailyAiCallLimit}
            </strong>{" "}
            appels utilisés aujourd’hui (UTC), dont{" "}
            {data.usage?.automaticCalls ?? 0} / {data.automaticDailyAiCallLimit}{" "}
            automatiques. Une mission utilise normalement deux appels. Les
            limites du fournisseur restent applicables.
          </p>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={data.state.auto_assign}
              disabled={busy}
              onChange={(e) =>
                void action(
                  "/configure",
                  { enabled: data.state.enabled, autoAssign: e.target.checked },
                  "Attribution automatique mise à jour.",
                )
              }
            />
            Créer des missions à partir des alertes de supervision
          </label>
          <p className={styles.muted}>
            Les missions automatiques nécessitent aussi l’activation des
            analyses automatiques dans les paramètres. Une seule tâche est
            lancée par minute. Dernier passage :{" "}
            {date(data.state.last_cycle_at)}.
          </p>
          {data.state.last_error && (
            <p role="status" className={styles.error}>
              {data.state.last_error}
            </p>
          )}
          <button
            disabled={busy || !data.state.enabled}
            onClick={() =>
              void action(
                "/run",
                {},
                "Passage demandé. Le délai d’une minute entre deux tâches est conservé.",
              )
            }
          >
            Vérifier les tâches en attente
          </button>
        </div>
      )}
      <form onSubmit={create} className={styles.panel}>
        <h2>Confier une mission</h2>
        <label>
          Titre
          <input
            required
            minLength={3}
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Examiner les revenus du mois"
          />
        </label>
        <label>
          Objectif et résultat attendu
          <textarea
            required
            minLength={10}
            maxLength={2000}
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Décrivez le problème, les preuves disponibles et ce que vous attendez."
          />
        </label>
        <div className={styles.fields}>
          <label>
            Agent responsable
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              {Object.entries(names).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priorité
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="normal">Normale</option>
              <option value="high">Haute</option>
            </select>
          </label>
        </div>
        <p className={styles.muted}>
          L’analyse consulte les indicateurs de supervision et, pour Finance,
          les totaux du mois. Les avis et transactions individuels ne sont pas
          transmis à l’IA. Une source manquante est signalée comme un blocage.
        </p>
        <button
          type="submit"
          disabled={busy || !data}
          className={styles.primary}
        >
          {busy ? "Enregistrement…" : "Créer la mission"}
        </button>
      </form>
      <div aria-live="polite">
        <h2>Missions suivies</h2>
        {data?.missions.length === 0 && (
          <p>
            Aucune mission pour le moment. Confiez un objectif ou laissez les
            alertes vérifiées déclencher une mission.
          </p>
        )}
      </div>
      {data?.missions.map((m) => (
        <article className={styles.panel} key={m.id}>
          <div className={styles.row}>
            <h3>{m.title}</h3>
            <span className={styles.badge}>{states[m.status] ?? m.status}</span>
          </div>
          <p>{m.objective}</p>
          <p className={styles.muted}>
            {m.origin === "automatic"
              ? "Alerte de supervision"
              : "Mission confiée"}{" "}
            · {date(m.created_at)}
          </p>
          <ol className={styles.tasks}>
            {[...m.tasks]
              .sort((a, b) =>
                a.stage === "analysis" ? -1 : b.stage === "analysis" ? 1 : 0,
              )
              .map((t) => (
                <li key={t.id}>
                  <div className={styles.row}>
                    <strong>
                      {t.stage === "analysis"
                        ? "1. Analyse"
                        : "2. Contrôle de l’analyse"}{" "}
                      · {names[t.department]}
                    </strong>
                    <span>{states[t.status] ?? t.status}</span>
                  </div>
                  <p className={styles.muted}>
                    {t.attempts} / 3 tentatives
                    {t.stage === "review" && t.status === "queued"
                      ? " · Attend la fin de l’analyse"
                      : ""}
                    {t.retry_at
                      ? " · Reprise prévue : " + date(t.retry_at)
                      : ""}
                  </p>
                  {t.last_error && (
                    <p className={styles.error}>{t.last_error}</p>
                  )}
                  {t.result && (
                    <>
                      <p>{t.result.summary}</p>
                      <details>
                        <summary>Lire le résultat détaillé</summary>
                        <p className={styles.result}>
                          {t.result.recommendation}
                        </p>
                        <p className={styles.muted}>
                          Données de supervision du {date(t.result.capturedAt)}.
                          Aucune modification effectuée à cette étape.
                        </p>
                      </details>
                    </>
                  )}
                </li>
              ))}
          </ol>
          {m.status === "completed" && (
            <p>
              Diagnostic terminé. Ce statut ne signifie pas qu’une modification
              a été appliquée.
            </p>
          )}
          {m.change && (
            <>
              <p>
                Proposition :{" "}
                {m.change.status === "pending"
                  ? "votre décision est attendue"
                  : m.change.status === "approved"
                    ? "approuvée"
                    : m.change.status === "rejected"
                      ? "refusée"
                      : "à reprendre"}
                .{" "}
                {(
                  {
                    planning_queued: "Préparation du changement en attente.",
                    planning: "Préparation en cours.",
                    review_ready: "Changement exact prêt à examiner.",
                    pr_ready: "Branche préparée ; vérifications à consulter.",
                    merged: "Fusion effectuée ; déploiement à vérifier.",
                    blocked: "Préparation bloquée.",
                  } as Record<string, string>
                )[m.change.execution_status] ?? ""}
              </p>
              {m.change.execution_error && (
                <p className={styles.error}>{m.change.execution_error}</p>
              )}
              <button
                className={styles.primary}
                onClick={() => onReview(m.change!.id)}
              >
                Voir la proposition à valider
              </button>
            </>
          )}
          {!m.proposal_id && ["active", "blocked"].includes(m.status) && (
            <div className={styles.controls}>
              {m.status === "blocked" && (
                <>
                  <label>
                    Précision pour la relance
                    <textarea
                      maxLength={1000}
                      value={notes[m.id] ?? ""}
                      onChange={(e) =>
                        setNotes({ ...notes, [m.id]: e.target.value })
                      }
                    />
                  </label>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void action(
                        `/missions/${m.id}/control`,
                        { action: "retry", note: notes[m.id] ?? "" },
                        "Mission relancée : l’analyse et son contrôle seront repris.",
                      )
                    }
                  >
                    Relancer avec ces précisions
                  </button>
                </>
              )}
              <button
                disabled={busy}
                onClick={() =>
                  void action(
                    `/missions/${m.id}/control`,
                    { action: "cancel", note: "" },
                    "Mission annulée.",
                  )
                }
              >
                Annuler la mission
              </button>
            </div>
          )}
        </article>
      ))}
      <p className={styles.muted}>
        Votre validation reste nécessaire pour préparer une modification. Le
        changement exact et sa publication conservent leurs étapes de
        validation. Les agents ne déclenchent ici ni paiement ni envoi de
        message.
      </p>
    </section>
  );
}
