"use client";
import { useCallback, useEffect, useState } from "react";
import { GrowthBrief, GrowthConnections } from "./growth/GrowthSettings";
import GrowthLeads from "./growth/GrowthLeads";
import GrowthActions from "./growth/GrowthActions";
import type { GrowthSnapshot, Mutate } from "./growth/types";
import styles from "./growth/growth.module.css";
const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
export default function GrowthWorkspace() {
  const [now] = useState(() => Date.now());
  const [data, setData] = useState<GrowthSnapshot | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState("brief");
  const load = useCallback(async () => {
    const r = await fetch(API + "/ai-control-center/growth", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("kalatty_token"),
      },
      cache: "no-store",
    });
    if (!r.ok)
      throw Error(
        r.status === 403
          ? "Cet espace est réservé au propriétaire de Kalatty."
          : "Impossible de charger l’espace commercial.",
      );
    setData(await r.json());
  }, []);
  useEffect(() => {
    let live = true;
    void load().catch((e) => {
      if (live) setError(e.message);
    });
    return () => {
      live = false;
    };
  }, [load]);
  const mutate: Mutate = async (path, body = {}, method = "POST") => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch(API + "/ai-control-center/growth" + path, {
        method,
        headers: {
          Authorization: "Bearer " + localStorage.getItem("kalatty_token"),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const result = await r.json();
      if (!r.ok)
        throw Error(
          Array.isArray(result.message)
            ? result.message.join(" · ")
            : (result.message ?? "Action impossible."),
        );
      setNotice(
        path === "/discover"
          ? `${result.found} pistes trouvées, ${result.created} nouvelles fiches et ${result.drafts} brouillons préparés.`
          : "Action enregistrée.",
      );
      await load();
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action impossible.");
      return null;
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className={styles.workspace}>
      <div className={styles.heading}>
        <span>MARKETING · COMMUNICATION · COMMERCIAL · CRM</span>
        <h1>Prospection & campagnes</h1>
        <p>
          Des pistes sourcées, des messages à examiner, puis des actions dont
          vous gardez la maîtrise.
        </p>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
      {!data && !error && (
        <p role="status">Chargement des prospects et des campagnes…</p>
      )}
      {data && (
        <>
          <div className={styles.metrics}>
            <div>
              <strong>{data.leads.length}</strong>
              <span>Prospects chargés · 200 derniers</span>
            </div>
            <div>
              <strong>
                {
                  data.leads.filter(
                    (x) =>
                      !x.opt_out &&
                      x.next_followup_at &&
                      Date.parse(x.next_followup_at) <= now &&
                      !["won", "lost"].includes(x.stage),
                  ).length
                }
              </strong>
              <span>Relances à préparer</span>
            </div>
            <div>
              <strong>
                {data.actions.filter((x) => x.status === "approved").length}
              </strong>
              <span>Contenus approuvés</span>
            </div>
            <div>
              <strong>
                {data.usage.deliveries} / {data.limits.dailyDeliveries}
              </strong>
              <span>Exécutions aujourd’hui · UTC</span>
            </div>
          </div>
          <div
            className={styles.tabs}
            role="tablist"
            aria-label="Gestion commerciale"
          >
            {[
              ["brief", "Brief & autonomie"],
              ["leads", "Prospects"],
              ["actions", "Contenus & validations"],
              ["connections", "Connexions"],
            ].map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                aria-controls={"growth-" + id}
                id={"growth-tab-" + id}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div
            role="tabpanel"
            id={"growth-" + tab}
            aria-labelledby={"growth-tab-" + tab}
          >
            {tab === "brief" && (
              <GrowthBrief
                key={data.settings.updated_at}
                data={data}
                mutate={mutate}
                busy={busy}
              />
            )}
            {tab === "leads" && (
              <GrowthLeads data={data} mutate={mutate} busy={busy} />
            )}
            {tab === "actions" && (
              <GrowthActions data={data} mutate={mutate} busy={busy} />
            )}
            {tab === "connections" && (
              <GrowthConnections data={data} mutate={mutate} busy={busy} />
            )}
          </div>
          <details className={styles.journal}>
            <summary>Journal des actions · 100 derniers événements</summary>
            {data.events.length ? (
              <ol>
                {data.events.map((e) => (
                  <li key={e.id}>
                    <time>
                      {new Date(e.created_at).toLocaleString("fr-FR")}
                    </time>{" "}
                    ·{" "}
                    {e.entity_type === "ai_growth_leads"
                      ? "Prospect"
                      : "Contenu"}{" "}
                    · {e.event === "created" ? "Création" : "Modification"}
                    {e.details.status ? " · " + e.details.status : ""}
                  </li>
                ))}
              </ol>
            ) : (
              <p>Aucune action enregistrée.</p>
            )}
          </details>
        </>
      )}
    </section>
  );
}
