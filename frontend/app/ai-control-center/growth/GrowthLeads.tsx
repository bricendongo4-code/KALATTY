"use client";
import { useState } from "react";
import type { GrowthSnapshot, Lead, Mutate } from "./types";
import { stages, calendar, localDate, isoDate } from "./types";
import styles from "./growth.module.css";
function LeadCard({
  lead,
  mutate,
  busy,
}: {
  lead: Lead;
  mutate: Mutate;
  busy: boolean;
}) {
  const [form, setForm] = useState({
    ...lead,
    next_followup_at: localDate(lead.next_followup_at),
  });
  return (
    <article className={styles.panel}>
      <div className={styles.cardHead}>
        <div>
          <h3>{lead.company}</h3>
          <p>
            {[lead.country, lead.city, lead.industry]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <span className={styles.badge}>
          {lead.opt_out ? "Ne pas contacter" : stages[lead.stage]}
        </span>
      </div>
      <p>{lead.qualification}</p>
      <a href={lead.source_url} target="_blank" rel="noreferrer">
        Consulter la source ↗
      </a>
      <details>
        <summary>Qualifier et suivre ce prospect</summary>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void mutate(
              "/leads/" + lead.id,
              { ...form, next_followup_at: isoDate(form.next_followup_at) },
              "PATCH",
            );
          }}
        >
          <label>
            Étape
            <select
              value={form.stage}
              onChange={(e) => setForm({ ...form, stage: e.target.value })}
            >
              {Object.entries(stages).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label>
            Email professionnel
            <input
              type="email"
              maxLength={254}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label>
            Source de cet email
            <input
              type="url"
              placeholder="https://…/contact"
              maxLength={2000}
              required={!!form.email}
              value={form.contact_source_url}
              onChange={(e) =>
                setForm({ ...form, contact_source_url: e.target.value })
              }
            />
          </label>
          <label>
            Notes et résultat commercial
            <textarea
              rows={3}
              maxLength={2000}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
          <label>
            Prochaine relance
            <input
              type="datetime-local"
              value={form.next_followup_at}
              onChange={(e) =>
                setForm({ ...form, next_followup_at: e.target.value })
              }
            />
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={form.opt_out}
              disabled={lead.opt_out}
              onChange={(e) => setForm({ ...form, opt_out: e.target.checked })}
            />
            Ce prospect refuse les sollicitations · exclusion conservée
          </label>
          <button disabled={busy}>Enregistrer la fiche</button>
        </form>
      </details>
      <div className={styles.buttons}>
        <button
          disabled={busy || lead.opt_out}
          onClick={() =>
            void mutate("/drafts", {
              channel: "email",
              lead_id: lead.id,
              ai: false,
            })
          }
        >
          Préparer un email
        </button>
        {lead.next_followup_at && (
          <button
            className={styles.secondary}
            onClick={() =>
              calendar(
                lead.id,
                "Relance Kalatty · " + lead.company,
                lead.next_followup_at!,
              )
            }
          >
            Exporter le rappel (.ics)
          </button>
        )}
      </div>
      <small>
        « Gagné » est un résultat déclaré manuellement ; ce statut ne confirme
        pas un paiement.
      </small>
    </article>
  );
}
export default function GrowthLeads({
  data,
  mutate,
  busy,
}: {
  data: GrowthSnapshot;
  mutate: Mutate;
  busy: boolean;
}) {
  const [filter, setFilter] = useState("all"),
    [term, setTerm] = useState("");
  const rows = data.leads.filter(
    (x) =>
      (filter === "all" || x.stage === filter) &&
      x.company.toLocaleLowerCase().includes(term.toLocaleLowerCase()),
  );
  return (
    <>
      <div className={styles.toolbar}>
        <label>
          Filtrer les prospects
          <input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Nom de l’organisation"
          />
        </label>
        <label>
          Étape
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Toutes les étapes</option>
            {Object.entries(stages).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <button disabled={busy} onClick={() => void mutate("/discover")}>
          Rechercher de nouvelles pistes
        </button>
      </div>
      <details className={styles.panel}>
        <summary>Ajouter un prospect avec sa source</summary>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = e.currentTarget;
            const values = Object.fromEntries(new FormData(f));
            if (await mutate("/leads", values)) f.reset();
          }}
        >
          {[
            ["company", "Organisation"],
            ["source_url", "URL de la source"],
            ["country", "Pays"],
            ["email", "Email professionnel · facultatif"],
            [
              "contact_source_url",
              "URL de la source de l’email · si renseigné",
            ],
          ].map(([name, label]) => (
            <label key={name}>
              {label}
              <input
                name={name}
                type={
                  name.includes("url")
                    ? "url"
                    : name === "email"
                      ? "email"
                      : "text"
                }
                maxLength={
                  name.includes("url")
                    ? 2000
                    : name === "country"
                      ? 40
                      : name === "email"
                        ? 254
                        : 200
                }
                required={["company", "source_url", "country"].includes(name)}
              />
            </label>
          ))}
          <label>
            Pertinence commerciale
            <textarea name="qualification" maxLength={1000} />
          </label>
          <button disabled={busy}>Ajouter le prospect</button>
        </form>
      </details>
      <div className={styles.cards}>
        {rows.map((lead) => (
          <LeadCard
            key={lead.id + ":" + lead.version}
            lead={lead}
            mutate={mutate}
            busy={busy}
          />
        ))}
      </div>
      {!rows.length && (
        <p className={styles.panel}>
          Aucun prospect correspondant. Lancez une recherche après avoir
          enregistré le brief, ou ajoutez une piste avec sa source.
        </p>
      )}
    </>
  );
}
