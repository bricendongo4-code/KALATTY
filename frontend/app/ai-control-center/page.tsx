"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import KalattyLogo from "../_components/KalattyLogo";
import AgentIcon from "./AgentIcon";
import SupervisionPanel from "./SupervisionPanel";
import ApprovalCenter from "./ApprovalCenter";
import styles from "./control-center.module.css";
type Screen =
  | "overview"
  | "agents"
  | "analysis"
  | "approvals"
  | "reports"
  | "settings";
type Proposal = {
  id: string;
  status: string;
  department: string;
  title: string;
  created_at: string;
};
type Agent = {
  department: string;
  available: boolean;
  sources?: { table: string; available: boolean; count?: number }[];
};
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
const missions: Record<string, string> = {
  security: "Accès, risques et vulnérabilités",
  qa: "Tests, anomalies et régressions",
  developer: "Code, maintenance et performance",
  ux: "Parcours, interfaces et ergonomie",
  product: "Fonctionnalités et priorités",
  marketing: "Acquisition et campagnes",
  sales: "Prospects et conversions",
  support: "Tickets et satisfaction",
  finance: "Revenus, paiements et coûts",
  analytics: "Indicateurs et tendances",
  crm: "Relations et fidélisation",
};
const nav: { id: Screen; name: string; icon: string }[] = [
  { id: "overview", name: "Vue générale", icon: "▦" },
  { id: "agents", name: "Départements & agents", icon: "◈" },
  { id: "analysis", name: "Analyses IA", icon: "✦" },
  { id: "approvals", name: "Centre de validation", icon: "✓" },
  { id: "reports", name: "Rapports", icon: "▤" },
  { id: "settings", name: "Paramètres", icon: "⚙" },
];
const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
function auth() {
  return localStorage.getItem("kalatty_token") ?? "";
}
export default function ControlCenterPage() {
  const [screen, setScreen] = useState<Screen>("overview"),
    [mobileNav, setMobileNav] = useState(false),
    [selected, setSelected] = useState<string | null>(null),
    [tab, setTab] = useState("overview");
  const [agents, setAgents] = useState<Agent[]>([]),
    [proposals, setProposals] = useState<Proposal[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const [aiBusy, setAiBusy] = useState(false),
    [aiResult, setAiResult] = useState(""),
    [aiSuccess, setAiSuccess] = useState(false),
    [saving, setSaving] = useState(false),
    [notice, setNotice] = useState(""),
    [version, setVersion] = useState(0);
  const [reports, setReports] = useState<
    { id?: string; created_at?: string; report?: unknown }[]
  >([]);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    const token = auth();
    if (!token) {
      setError("Connectez-vous pour accéder aux données du Control Center.");
      setLoading(false);
      return;
    }
    const headers = { Authorization: "Bearer " + token };
    try {
      const results = await Promise.allSettled([
        fetch(API + "/ai-control-center/signals", {
          headers,
          cache: "no-store",
        }),
        fetch(API + "/ai-control-center/proposals", {
          headers,
          cache: "no-store",
        }),
        fetch(API + "/ai-control-center/reports", {
          headers,
          cache: "no-store",
        }),
      ]);
      if (results[0].status === "fulfilled" && results[0].value.ok) {
        const x = (await results[0].value.json()) as { agents?: Agent[] };
        setAgents(Array.isArray(x.agents) ? x.agents : []);
      } else
        setError(
          "Les sources des agents sont indisponibles. Vérifiez votre connexion et les droits du compte.",
        );
      if (results[1].status === "fulfilled" && results[1].value.ok) {
        const x = (await results[1].value.json()) as { proposals?: Proposal[] };
        setProposals(Array.isArray(x.proposals) ? x.proposals : []);
      } else setError("Les validations sont momentanément indisponibles.");
      if (results[2].status === "fulfilled" && results[2].value.ok) {
        const x = (await results[2].value.json()) as {
          reports?: { id?: string; created_at?: string; report?: unknown }[];
        };
        setReports(Array.isArray(x.reports) ? x.reports : []);
      }
    } catch {
      setError("Impossible de charger les données.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, 30000);
    return () => clearInterval(timer);
  }, [refresh]);
  useEffect(() => {
    if (!mobileNav) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNav(false);
    };
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", close);
    };
  }, [mobileNav]);
  function navigate(next: Screen) {
    setScreen(next);
    if (next !== "analysis") setSelected(null);
    setMobileNav(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function openAgent(id: string) {
    setSelected(id);
    setTab("overview");
    setScreen("agents");
    setMobileNav(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function analyze() {
    if (aiBusy) return;
    setAiBusy(true);
    setAiResult("");
    setAiSuccess(false);
    setNotice("");
    try {
      const r = await fetch(API + "/ai-control-center/analyze", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + auth(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ department: selected ?? "security" }),
      });
      if (!r.ok)
        throw Error(
          "Analyse indisponible (" +
            r.status +
            "). Vérifiez vos crédits et l'accès.",
        );
      const x = (await r.json()) as {
        status: string;
        analysis?: string;
        reason?: string;
      };
      if (x.status === "analyzed" && x.analysis) {
        setAiResult(x.analysis);
        setAiSuccess(true);
      } else setAiResult(x.reason ?? "Aucune analyse disponible.");
    } catch (e) {
      setAiResult(e instanceof Error ? e.message : "Erreur d'analyse");
    } finally {
      setAiBusy(false);
    }
  }
  async function submit() {
    if (!aiSuccess || !aiResult || saving) return;
    setSaving(true);
    try {
      const r = await fetch(API + "/ai-control-center/proposals", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + auth(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          department: selected ?? "security",
          title: "Analyse " + names[selected ?? "security"] + " à examiner",
          rationale: aiResult.slice(0, 4000),
        }),
      });
      if (!r.ok) throw Error("Enregistrement impossible (" + r.status + ")");
      setNotice("Proposition transmise au Centre de validation.");
      setVersion((v) => v + 1);
      await refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }
  const pending = proposals.filter((p) => p.status === "pending").length;
  const current = agents.find((a) => a.department === selected);
  const analysisAgent = agents.find(
    (a) => a.department === (selected ?? "security"),
  );
  const active = nav.find((n) => n.id === screen);
  return (
    <main className={styles.shell}>
      {mobileNav && (
        <button
          className={styles.scrim}
          aria-label="Fermer le menu"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside
        className={styles.sidebar + " " + (mobileNav ? styles.sidebarOpen : "")}
      >
        <div className={styles.brand}>
          <Link
            href="/"
            className={styles.brandLogo}
            aria-label="Kalatty, accueil"
          >
            <KalattyLogo />
          </Link>
          <span className={styles.brandLabel}>Pilotage des agents</span>
          <button
            className={styles.closeNav}
            onClick={() => setMobileNav(false)}
            aria-label="Fermer"
          >
            <AgentIcon name="close" />
          </button>
        </div>
        <div className={styles.sideCaption}>ESPACE DE PILOTAGE</div>
        <nav
          className={styles.navigation}
          aria-label="Navigation du Control Center"
        >
          {nav.map((n) => (
            <button
              key={n.id}
              className={screen === n.id ? styles.navActive : ""}
              onClick={() => navigate(n.id)}
            >
              <span className={styles.navIcon}>
                <AgentIcon name={n.id} />
              </span>
              <span>{n.name}</span>
              {n.id === "approvals" && pending > 0 && <b>{pending}</b>}
            </button>
          ))}
        </nav>
        <div className={styles.sideBottom}>
          <div className={styles.safeIcon}>
            <AgentIcon name="approvals" />
          </div>
          <div>
            <strong>MODE SÉCURISÉ</strong>
            <small>Validation humaine obligatoire</small>
          </div>
        </div>
        <Link className={styles.backLink} href="/">
          ← Retour à Kalatty
        </Link>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.topLeft}>
            <button
              className={styles.menuButton}
              onClick={() => setMobileNav(true)}
              aria-label="Ouvrir le menu"
              aria-expanded={mobileNav}
            >
              <AgentIcon name="menu" />
            </button>
            <Link
              href="/"
              className={styles.mobileLogo}
              aria-label="Kalatty, accueil"
            >
              <KalattyLogo />
            </Link>
            <span className={styles.breadcrumb}>{active?.name}</span>
          </div>
          <span className={styles.humanBadge}>
            <AgentIcon name="security" />
            <span>Validation requise</span>
          </span>
        </header>
        <div className={styles.content}>
          {error && (
            <div className={styles.alert} role="alert">
              {error}{" "}
              <Link href="/login?next=%2Fai-control-center">Se connecter</Link>
            </div>
          )}
          {screen === "overview" && (
            <>
              <div className={styles.pageHeading}>
                <div>
                  <div className={styles.overline}>TABLEAU DE BORD</div>
                  <h1>Vue générale</h1>
                  <p>Pilotez vos 11 agents IA depuis un seul espace.</p>
                </div>
                <button
                  className={styles.secondaryButton}
                  onClick={() => void refresh()}
                >
                  ↻ Actualiser
                </button>
              </div>

              <div className={styles.kpis}>
                <div className={styles.kpi}>
                  <span>Agents IA</span>
                  <strong>11</strong>
                  <small>Départements configurés</small>
                </div>
                <div className={styles.kpi}>
                  <span>Propositions à valider</span>
                  <strong>{pending}</strong>
                  <small>En attente de décision</small>
                </div>
                <div className={styles.kpi}>
                  <span>Décisions prises</span>
                  <strong>{proposals.length - pending}</strong>
                  <small>Historique enregistré</small>
                </div>
                <div className={styles.kpi}>
                  <span>Rapports</span>
                  <strong>{reports.length}</strong>
                  <small>Documents disponibles</small>
                </div>
              </div>
              <div className={styles.sectionHeading}>
                <div>
                  <h2>Vos départements</h2>
                  <p>Accédez directement à l'espace de chaque agent.</p>
                </div>
                <button
                  className={styles.textButton}
                  onClick={() => navigate("agents")}
                >
                  Voir les 11 agents →
                </button>
              </div>
              <div className={styles.agentGrid}>
                {Object.entries(names)
                  .slice(0, 6)
                  .map(([id, name]) => (
                    <button
                      key={id}
                      className={styles.agentCard}
                      onClick={() => openAgent(id)}
                    >
                      <span className={styles.agentIcon}>
                        <AgentIcon name={id} />
                      </span>
                      <span className={styles.agentTitle}>{name}</span>
                      <small>{missions[id]}</small>
                      <span className={styles.cardFoot}>
                        Ouvrir l'agent <span>↗</span>
                      </span>
                    </button>
                  ))}
              </div>
              <div className={styles.overviewSupervision}>
                <SupervisionPanel compact onRefresh={refresh} />
              </div>
              <div className={styles.quickPanel}>
                <div>
                  <strong>Décisions en attente</strong>
                  <p>
                    {pending
                      ? pending + " proposition(s) attendent votre validation."
                      : "Aucune proposition en attente actuellement."}
                  </p>
                </div>
                <button
                  className={styles.primaryButton}
                  onClick={() => navigate("approvals")}
                >
                  Centre de validation →
                </button>
              </div>
            </>
          )}
          {screen === "agents" && !selected && (
            <>
              <div className={styles.pageHeading}>
                <div>
                  <div className={styles.overline}>DÉPARTEMENTS</div>
                  <h1>Vos agents IA</h1>
                  <p>Onze expertises, chacune avec son espace de travail.</p>
                </div>
              </div>
              <div className={styles.agentGrid + " " + styles.directoryGrid}>
                {Object.entries(names).map(([id, name]) => (
                  <button
                    key={id}
                    className={styles.agentCard}
                    onClick={() => openAgent(id)}
                  >
                    <span className={styles.agentIcon}>
                      <AgentIcon name={id} />
                    </span>
                    <span className={styles.agentTitle}>{name}</span>
                    <small>{missions[id]}</small>
                    <span className={styles.cardFoot}>
                      {agents.find((a) => a.department === id)?.available
                        ? "Sources disponibles"
                        : "Consulter l'agent"}{" "}
                      <span>↗</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
          {screen === "agents" && selected && (
            <>
              <button
                className={styles.textButton}
                onClick={() => setSelected(null)}
              >
                ← Tous les agents
              </button>
              <div className={styles.pageHeading}>
                <div>
                  <div className={styles.overline}>ESPACE INDIVIDUEL</div>
                  <h1>
                    <span className={styles.headingIcon}>
                      <AgentIcon name={selected} />
                    </span>{" "}
                    Agent {names[selected]}
                  </h1>
                  <p>{missions[selected]}</p>
                </div>
                <button
                  className={styles.primaryButton}
                  onClick={() => navigate("analysis")}
                >
                  Lancer une analyse ↗
                </button>
              </div>
              <div className={styles.kpis + " " + styles.agentKpis}>
                <div className={styles.kpi}>
                  <span>Sources suivies</span>
                  <strong>{current?.sources?.length ?? "—"}</strong>
                </div>
                <div className={styles.kpi}>
                  <span>Propositions</span>
                  <strong>
                    {proposals.filter((p) => p.department === selected).length}
                  </strong>
                </div>
                <div className={styles.kpi}>
                  <span>À valider</span>
                  <strong>
                    {
                      proposals.filter(
                        (p) =>
                          p.department === selected && p.status === "pending",
                      ).length
                    }
                  </strong>
                </div>
              </div>
              <div
                className={styles.tabs}
                role="tablist"
                aria-label="Espace de l'agent"
              >
                {[
                  ["overview", "Vue d'ensemble"],
                  ["analysis", "Analyses"],
                  ["history", "Historique"],
                  ["settings", "Configuration"],
                ].map(([id, label]) => (
                  <button
                    role="tab"
                    aria-selected={tab === id}
                    key={id}
                    onClick={() => setTab(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className={styles.detailGrid}>
                <section className={styles.darkPanel}>
                  <h2>
                    {tab === "overview"
                      ? "Sources et indicateurs"
                      : tab === "analysis"
                        ? "Analyse de l'agent"
                        : tab === "history"
                          ? "Historique des décisions"
                          : "Configuration de l'agent"}
                  </h2>
                  {tab === "overview" ? (
                    current?.sources?.length ? (
                      <div className={styles.sourceList}>
                        {current.sources.map((s, i) => (
                          <div key={s.table ?? i}>
                            <span>{s.table}</span>
                            <b>
                              {s.available
                                ? (s.count ?? 0) + " éléments"
                                : "Indisponible"}
                            </b>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>Aucune source détaillée disponible pour le moment.</p>
                    )
                  ) : tab === "analysis" ? (
                    <>
                      <p>
                        Les contrôles automatiques alimentent les propositions.
                        Vous pouvez aussi demander une analyse ciblée.
                      </p>
                      <button
                        className={styles.primaryButton}
                        onClick={() => navigate("analysis")}
                      >
                        Ouvrir les analyses →
                      </button>
                    </>
                  ) : tab === "history" ? (
                    <div className={styles.sourceList}>
                      {proposals
                        .filter((p) => p.department === selected)
                        .map((p) => (
                          <div key={p.id}>
                            <span>{p.title}</span>
                            <b>{p.status}</b>
                          </div>
                        ))}
                      {!proposals.some((p) => p.department === selected) && (
                        <p>Aucune proposition enregistrée.</p>
                      )}
                    </div>
                  ) : (
                    <p>
                      Accès en lecture seule. Les paramètres techniques et les
                      autorisations sont contrôlés côté serveur.
                    </p>
                  )}
                </section>
                <aside className={styles.darkPanel}>
                  <h2>Garde-fous</h2>
                  <p>✓ Contrôles automatiques chaque heure</p>
                  <p>✓ Corrections isolées après approbation</p>
                  <p>✓ Validation du propriétaire requise</p>
                  <button
                    className={styles.secondaryButton}
                    onClick={() => navigate("approvals")}
                  >
                    Voir les validations →
                  </button>
                </aside>
              </div>
            </>
          )}
          {screen === "analysis" && (
            <>
              <div className={styles.pageHeading}>
                <div>
                  <div className={styles.overline}>
                    INTELLIGENCE ARTIFICIELLE
                  </div>
                  <h1>Analyses IA</h1>
                  <p>
                    Examinez les signaux et soumettez des recommandations à
                    validation.
                  </p>
                </div>
              </div>
              <div className={styles.analysisWorkspace}>
                <section
                  className={styles.darkPanel + " " + styles.analysisPanel}
                >
                  <h2>Analyse de l’agent</h2>
                  <label htmlFor="agent-select">Agent à analyser</label>
                  <select
                    id="agent-select"
                    value={selected ?? "security"}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    {Object.entries(names).map(([id, name]) => (
                      <option value={id} key={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <p>
                    Chaque analyse est manuelle et peut entraîner des frais
                    d'API.
                  </p>
                  <button
                    className={styles.primaryButton}
                    disabled={aiBusy}
                    onClick={() => void analyze()}
                  >
                    {aiBusy ? "Analyse en cours…" : "✦ Lancer une analyse"}
                  </button>
                  {aiResult && (
                    <div className={styles.analysisResult}>
                      <h3>Résultat</h3>
                      <p>{aiResult}</p>
                      {aiSuccess && (
                        <button
                          className={styles.primaryButton}
                          disabled={saving}
                          onClick={() => void submit()}
                        >
                          {saving
                            ? "Enregistrement…"
                            : "Soumettre à validation →"}
                        </button>
                      )}
                    </div>
                  )}
                  {notice && <p role="status">{notice}</p>}
                </section>
                <aside className={styles.darkPanel}>
                  <h2>Preuves &amp; contexte</h2>
                  <p>
                    Les indicateurs disponibles pour l’agent{" "}
                    {names[selected ?? "security"].toLowerCase()}.
                  </p>
                  <div className={styles.sourceList}>
                    {analysisAgent?.sources?.length ? (
                      analysisAgent.sources.map((source) => (
                        <div key={source.table}>
                          <span>{source.table}</span>
                          <b>
                            {source.available
                              ? (source.count ?? 0) + " éléments"
                              : "Indisponible"}
                          </b>
                        </div>
                      ))
                    ) : (
                      <p>Aucune source disponible pour le moment.</p>
                    )}
                  </div>
                  <p className={styles.contextNote}>
                    Les analyses s’appuient sur ces données agrégées. Toute
                    correction reste soumise à votre validation.
                  </p>
                </aside>
              </div>
            </>
          )}
          {screen === "approvals" && (
            <>
              <div className={styles.pageHeading}>
                <div>
                  <div className={styles.overline}>DÉCISIONS HUMAINES</div>
                  <h1>Centre de validation</h1>
                  <p>
                    Examinez les propositions et gardez le contrôle sur chaque
                    décision.
                  </p>
                </div>
              </div>
              <ApprovalCenter key={version} onChange={refresh} />
            </>
          )}
          {screen === "reports" && (
            <>
              <div className={styles.pageHeading}>
                <div>
                  <div className={styles.overline}>HISTORIQUE</div>
                  <h1>Rapports</h1>
                  <p>Rapports enregistrés dans l'espace sécurisé.</p>
                </div>
              </div>
              <SupervisionPanel onRefresh={refresh} />
              <section className={styles.darkPanel}>
                <h2>Rapports enregistrés par les workflows</h2>
                {reports.length ? (
                  reports.map((r, i) => (
                    <div className={styles.reportRow} key={r.id ?? i}>
                      <span>Rapport #{i + 1}</span>
                      <small>
                        {r.created_at
                          ? new Date(r.created_at).toLocaleString("fr-FR")
                          : "Date indisponible"}
                      </small>
                    </div>
                  ))
                ) : (
                  <p>Aucun rapport enregistré.</p>
                )}
              </section>
            </>
          )}
          {screen === "settings" && (
            <>
              <div className={styles.pageHeading}>
                <div>
                  <div className={styles.overline}>
                    VOTRE ESPACE DE PILOTAGE
                  </div>
                  <h1>Paramètres</h1>
                  <p>Supervision et contrôle des accès.</p>
                </div>
              </div>
              <SupervisionPanel onRefresh={refresh} />
              <section className={styles.infoPanel}>
                <h2>Vous gardez la main</h2>
                <p>
                  Les agents proposent. Vous approuvez les corrections et leur
                  publication depuis le centre de validation.
                </p>
                <button
                  className={styles.textButton}
                  onClick={() => navigate("approvals")}
                >
                  Voir les propositions →
                </button>
              </section>
            </>
          )}
          {loading && (
            <div className={styles.loading}>Actualisation des indicateurs…</div>
          )}
        </div>
      </div>
      <nav className={styles.mobileBar} aria-label="Navigation mobile">
        {[
          { id: "overview", name: "Accueil", icon: "▦" },
          { id: "agents", name: "Agents", icon: "◈" },
          { id: "analysis", name: "Analyses", icon: "✦" },
          { id: "approvals", name: "Validations", icon: "✓" },
        ].map((n) => (
          <button
            key={n.id}
            aria-current={screen === n.id ? "page" : undefined}
            onClick={() => navigate(n.id as Screen)}
          >
            <span>
              <AgentIcon name={n.id} />
            </span>
            <small>{n.name}</small>
            {n.id === "approvals" && pending > 0 && <b>{pending}</b>}
          </button>
        ))}
      </nav>
    </main>
  );
}
