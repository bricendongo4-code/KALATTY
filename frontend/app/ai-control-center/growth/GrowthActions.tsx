"use client";
import { useState } from "react";
import type { Action, GrowthSnapshot, Mutate } from "./types";
import { states, localDate, isoDate, calendar, download } from "./types";
import styles from "./growth.module.css";
function ActionCard({
  a,
  mutate,
  busy,
}: {
  a: Action;
  mutate: Mutate;
  busy: boolean;
}) {
  const [now] = useState(() => Date.now());
  const [edit, setEdit] = useState({
    subject: a.subject,
    body: a.body,
    recipient: a.recipient,
    scheduled_for: localDate(a.scheduled_for),
  });
  const mutable = ["draft", "approved", "rejected", "failed"].includes(
    a.status,
  );
  return (
    <article className={styles.panel}>
      <div className={styles.cardHead}>
        <div>
          <h3>{a.subject}</h3>
          <p>
            {a.channel === "email"
              ? "Email"
              : a.channel === "linkedin"
                ? "LinkedIn"
                : "Contenu à exporter"}{" "}
            ·{" "}
            {a.generation_mode === "ai" ? "Brouillon IA" : "Brouillon sans IA"}
          </p>
        </div>
        <span className={styles.badge}>{states[a.status] ?? a.status}</span>
      </div>
      <dl>
        <dt>Expéditeur</dt>
        <dd>{a.sender || "À connecter avant envoi"}</dd>
        {a.channel === "email" && (
          <>
            <dt>Destinataire</dt>
            <dd>
              {a.recipient ||
                "Email à renseigner et sourcer dans la fiche prospect"}
            </dd>
          </>
        )}
        <dt>Date prévue</dt>
        <dd>
          {a.scheduled_for
            ? new Date(a.scheduled_for).toLocaleString("fr-FR")
            : "Exécution manuelle après approbation"}
        </dd>
      </dl>
      <p className={styles.message}>{a.body}</p>
      {a.provider_id && (
        <p>
          Référence fournisseur : {a.provider_id}. Ce statut ne confirme ni la
          lecture ni une vente.
        </p>
      )}
      {a.error && <p role="alert">{a.error}</p>}
      {mutable && (
        <details>
          <summary>Modifier le brouillon et sa date</summary>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void mutate(
                "/actions/" + a.id,
                {
                  ...edit,
                  scheduled_for: isoDate(edit.scheduled_for),
                  digest: a.digest,
                },
                "PATCH",
              );
            }}
          >
            <label>
              Titre ou objet
              <input
                required
                maxLength={200}
                value={edit.subject}
                onChange={(e) => setEdit({ ...edit, subject: e.target.value })}
              />
            </label>
            {a.channel === "email" && (
              <label>
                Email destinataire
                <input
                  type="email"
                  value={edit.recipient}
                  onChange={(e) =>
                    setEdit({ ...edit, recipient: e.target.value })
                  }
                />
              </label>
            )}
            <label>
              Texte
              <textarea
                required
                rows={9}
                maxLength={3000}
                value={edit.body}
                onChange={(e) => setEdit({ ...edit, body: e.target.value })}
              />
            </label>
            <label>
              Programmer l’exécution après approbation
              <input
                type="datetime-local"
                value={edit.scheduled_for}
                onChange={(e) =>
                  setEdit({ ...edit, scheduled_for: e.target.value })
                }
              />
            </label>
            <p>
              Toute modification annule l’approbation précédente. L’identité
              d’envoi est relue depuis le canal configuré.
            </p>
            <button disabled={busy}>Enregistrer une nouvelle version</button>
          </form>
        </details>
      )}
      <div className={styles.buttons}>
        {a.status === "draft" && (
          <button
            disabled={busy}
            onClick={() => {
              if (
                confirm(
                  `Valider exactement ce texte, le canal ${a.channel}, l’expéditeur et le destinataire affichés ?${a.scheduled_for ? " L’action sera exécutée automatiquement à la date prévue." : " L’exécution restera à déclencher."}`,
                )
              )
                void mutate("/actions/" + a.id + "/decision", {
                  digest: a.digest,
                  decision: "approve",
                });
            }}
          >
            Approuver ce contenu
          </button>
        )}
        {["draft", "approved"].includes(a.status) && (
          <button
            className={styles.secondary}
            disabled={busy}
            onClick={() =>
              void mutate("/actions/" + a.id + "/decision", {
                digest: a.digest,
                decision: "reject",
              })
            }
          >
            Refuser
          </button>
        )}
        {a.status === "approved" &&
          (!a.scheduled_for || Date.parse(a.scheduled_for) <= now) && (
            <button
              disabled={busy}
              onClick={() => {
                if (
                  confirm(
                    a.channel === "export"
                      ? "Autoriser l’export de ce contenu validé ?"
                      : "Exécuter maintenant cette action approuvée auprès du fournisseur ?",
                  )
                )
                  void mutate("/actions/" + a.id + "/execute", {
                    digest: a.digest,
                  });
              }}
            >
              {a.channel === "export"
                ? "Autoriser l’export"
                : "Exécuter maintenant"}
            </button>
          )}
        {a.status === "exported" && (
          <button
            onClick={() =>
              download("kalatty-contenu.txt", a.subject + "\n\n" + a.body)
            }
          >
            Télécharger le contenu
          </button>
        )}
        {a.scheduled_for && (
          <button
            className={styles.secondary}
            onClick={() => calendar(a.id, a.subject, a.scheduled_for!)}
          >
            Exporter la date (.ics)
          </button>
        )}
      </div>
      <small>
        Version : {a.digest.slice(0, 12)} · aucun renvoi automatique en cas
        d’erreur incertaine.
      </small>
    </article>
  );
}
export default function GrowthActions({
  data,
  mutate,
  busy,
}: {
  data: GrowthSnapshot;
  mutate: Mutate;
  busy: boolean;
}) {
  const [channel, setChannel] = useState("export"),
    [lead, setLead] = useState(""),
    [ai, setAI] = useState(false),
    [filter, setFilter] = useState("all");
  return (
    <>
      <form
        className={styles.panel}
        onSubmit={(e) => {
          e.preventDefault();
          void mutate("/drafts", { channel, lead_id: lead || undefined, ai });
        }}
      >
        <h2>Préparer un contenu ou un premier contact</h2>
        <div className={styles.toolbar}>
          <label>
            Canal
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              <option value="export">Contenu à exporter · tous réseaux</option>
              <option value="linkedin">Publication LinkedIn</option>
              <option value="email">Email professionnel</option>
            </select>
          </label>
          <label>
            Prospect
            <select
              value={lead}
              required={channel === "email"}
              onChange={(e) => setLead(e.target.value)}
            >
              <option value="">Contenu général</option>
              {data.leads
                .filter((x) => !x.opt_out)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.company}
                  </option>
                ))}
            </select>
          </label>
          <button disabled={busy}>Préparer le brouillon</button>
        </div>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={ai}
            onChange={(e) => setAI(e.target.checked)}
          />
          Utiliser l’IA · appel payant possible après activation et recharge
        </label>
        <p>
          Sans IA, le message utilise uniquement votre brief enregistré. Aucun
          envoi n’a lieu lors de la préparation.
        </p>
      </form>
      <label className={styles.filter}>
        Afficher
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Tous les contenus · 100 derniers</option>
          {Object.entries(states).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.cards}>
        {data.actions
          .filter((a) => filter === "all" || a.status === filter)
          .map((a) => (
            <ActionCard
              key={a.id + ":" + a.updated_at}
              a={a}
              mutate={mutate}
              busy={busy}
            />
          ))}
      </div>
      {!data.actions.length && (
        <p className={styles.panel}>
          Aucun contenu préparé. Enregistrez votre brief puis préparez un
          brouillon.
        </p>
      )}
    </>
  );
}
