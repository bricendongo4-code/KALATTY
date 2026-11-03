"use client";
import { useState } from "react";
import type { GrowthSnapshot, Mutate } from "./types";
import styles from "./growth.module.css";
export function GrowthBrief({
  data,
  mutate,
  busy,
}: {
  data: GrowthSnapshot;
  mutate: Mutate;
  busy: boolean;
}) {
  const [b, setB] = useState({
    offer:
      "Kalatty, plateforme de formation en ligne et de gestion d’établissement.",
    audience: "les établissements et les formateurs",
    benefit:
      "Présentez vos cours et organisez les apprentissages dans un même espace.",
    cta: "https://kalatty-frontend.vercel.app",
    signature: "L’équipe Kalatty",
    ...data.settings.brief,
  });
  const [provider, setProvider] = useState(data.settings.provider),
    [country, setCountry] = useState(data.settings.country),
    [query, setQuery] = useState(data.settings.query),
    [enabled, setEnabled] = useState(data.settings.discovery_enabled);
  return (
    <div className={styles.columns}>
      <form
        className={styles.panel}
        onSubmit={(e) => {
          e.preventDefault();
          void mutate("/settings", {
            brief: b,
            provider,
            country,
            query,
            discovery_enabled: enabled,
          });
        }}
      >
        <h2>Votre brief commercial</h2>
        <p>
          Ces informations servent de référence aux brouillons. Vérifiez vos
          promesses et votre offre avant de les enregistrer.
        </p>
        {[
          ["offer", "Offre", 500],
          ["audience", "Public cible", 500],
          ["benefit", "Bénéfice et fonctions à présenter", 1000],
          ["cta", "Lien à proposer", 2000],
          ["signature", "Signature", 300],
        ].map(([key, label, max]) => (
          <label key={key}>
            <span>{label}</span>
            <textarea
              rows={key === "benefit" ? 3 : 2}
              required
              maxLength={Number(max)}
              value={b[key as keyof typeof b]}
              onChange={(e) => setB({ ...b, [key]: e.target.value })}
            />
          </label>
        ))}
        <h3>Recherche de prospects</h3>
        <label>
          Source
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            <option value="directory_fr">
              Annuaire officiel · France · sans clé
            </option>
            <option value="brave_web">
              Recherche web · plusieurs pays · clé Brave
            </option>
          </select>
        </label>
        <label>
          Pays
          <select value={country} onChange={(e) => setCountry(e.target.value)}>
            {[
              ["FR", "France"],
              ["CM", "Cameroun"],
              ["BE", "Belgique"],
              ["CA", "Canada"],
              ["SN", "Sénégal"],
              ["CI", "Côte d’Ivoire"],
              ["OTHER", "Autre pays · précisez dans la requête"],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Requête
          <input
            required
            maxLength={200}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Rechercher chaque jour et préparer jusqu’à 3 brouillons pour les
          nouvelles pistes
        </label>
        <button disabled={busy}>Enregistrer le brief et les réglages</button>
      </form>
      <aside className={styles.panel}>
        <h2>Autonomie sous contrôle</h2>
        <p>
          La prospection quotidienne ne contacte personne. Les relances échues
          des prospects qualifiés, contactés ou en rendez-vous préparent aussi
          un brouillon à valider. Elle conserve les sources, ignore les doublons
          et prépare des brouillons sans appel IA.
        </p>
        <p>
          Les résultats web sont des pistes à qualifier. Aucun email ni besoin
          commercial n’est inventé.
        </p>
        <dl>
          <dt>Prospection automatique</dt>
          <dd>{data.settings.discovery_enabled ? "Activée" : "En pause"}</dd>
          <dt>Dernier passage</dt>
          <dd>
            {data.settings.last_run_at
              ? new Date(data.settings.last_run_at).toLocaleString("fr-FR")
              : "Aucun"}
          </dd>
          <dt>Recherches aujourd’hui</dt>
          <dd>
            {data.usage.discoveries} / {data.limits.dailyDiscoveries}
          </dd>
        </dl>
        {data.settings.last_error && (
          <p role="alert">{data.settings.last_error}</p>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => void mutate("/discover")}
        >
          Chercher maintenant
        </button>
        <p>
          Enregistrez le brief avant la première recherche. Les envois et
          publications nécessitent une validation du texte, du canal, du
          destinataire et de la date.
        </p>
        <p>
          Un contenu approuvé avec une date sera exécuté à échéance si son canal
          est connecté. Sans date, vous déclenchez son exécution.
        </p>
      </aside>
    </div>
  );
}
export function GrowthConnections({
  data,
  mutate,
  busy,
}: {
  data: GrowthSnapshot;
  mutate: Mutate;
  busy: boolean;
}) {
  const [check, setCheck] = useState<Record<string, unknown> | null>(null);
  return (
    <div className={styles.panel}>
      <h2>Connexions des agents hébergés</h2>
      <p>
        Les identifiants sont configurés directement dans Railway. Cette
        interface ne demande et n’affiche aucun secret. « Configuré » indique
        leur présence ; les permissions et le crédit restent à vérifier auprès
        du fournisseur.
      </p>
      <div className={styles.connection}>
        <h3>GitHub</h3>
        <p>
          Jeton limité au dépôt ou GitHub App avec renouvellement des jetons
          d’installation.
        </p>
        <button
          disabled={busy}
          onClick={async () =>
            setCheck(await mutate("/connections/github/check"))
          }
        >
          Vérifier l’accès au dépôt
        </button>
        {check && (
          <p role="status">
            {String(check.message)} ·{" "}
            {check.authenticated
              ? "Authentification vérifiée"
              : "Accès non vérifié"}
          </p>
        )}
        <code>KALATTY_AGENT_GITHUB_TOKEN</code>
        <p>ou</p>
        <code>
          KALATTY_GITHUB_APP_ID
          <br />
          KALATTY_GITHUB_INSTALLATION_ID
          <br />
          KALATTY_GITHUB_APP_PRIVATE_KEY
        </code>
      </div>
      {[
        [
          "brave_web",
          "Recherche web internationale",
          "KALATTY_BRAVE_SEARCH_KEY",
          "Les pistes gardent le lien source. Les contacts sont à vérifier.",
        ],
        [
          "email",
          "Email professionnel · Resend",
          "KALATTY_RESEND_API_KEY + KALATTY_GROWTH_FROM_EMAIL",
          "Un domaine expéditeur validé chez Resend est nécessaire.",
        ],
        [
          "linkedin",
          "Publication LinkedIn",
          "KALATTY_LINKEDIN_ACCESS_TOKEN + KALATTY_LINKEDIN_AUTHOR_URN + KALATTY_LINKEDIN_API_VERSION",
          "Le compte ou la page doit autoriser la publication. La version API doit être une version LinkedIn encore supportée.",
        ],
      ].map(([key, title, vars, help]) => (
        <div key={key} className={styles.connection}>
          <h3>
            {title} · {data.connections[key] ? "Configuré" : "À connecter"}
          </h3>
          <p>{help}</p>
          <code>{vars}</code>
        </div>
      ))}
      <div className={styles.connection}>
        <h3>Disponible sans connexion payante</h3>
        <p>
          Annuaire d’entreprises françaises, import de pistes sourcées,
          pipeline, brouillons, export de contenus et rappels de calendrier au
          format .ics.
        </p>
      </div>
      <a
        href="https://railway.com/project/8ecbd6e0-cd28-4dcd-9f0f-2908387a80b6"
        target="_blank"
        rel="noreferrer"
      >
        Ouvrir le projet Railway ↗
      </a>
    </div>
  );
}
