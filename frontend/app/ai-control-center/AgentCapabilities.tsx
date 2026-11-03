"use client";
import { useEffect, useState } from "react";
import styles from "./capabilities.module.css";
const descriptions: Record<
  string,
  { observes: string; proposes: string; missing: string }
> = {
  security: {
    observes: "Indicateurs de gouvernance et exposition des tables sans RLS.",
    proposes: "Points de sécurité à examiner.",
    missing:
      "Pas de test d’intrusion ni de contrôle complet des parcours connectés.",
  },
  qa: {
    observes:
      "Indicateurs d’activité, CI GitHub et disponibilité des pages publiques.",
    proposes: "Anomalies et priorités de tests.",
    missing: "Pas de robot qui parcourt tous les comptes et tous les boutons.",
  },
  developer: {
    observes: "Activité du studio et un fichier de code inspecté par cycle IA.",
    proposes: "Un remplacement exact de code, présenté avant approbation.",
    missing:
      "Accès GitHub par jeton ou GitHub App requis. Vérifiez sa connexion dans Prospection & campagnes → Connexions.",
  },
  ux: {
    observes: "Compteurs de progression et favoris.",
    proposes: "Hypothèses d’amélioration des parcours.",
    missing:
      "Pas d’observation des écrans ni d’enregistrements de sessions connectés.",
  },
  product: {
    observes: "Compteurs de cours, modules et leçons.",
    proposes: "Priorités à examiner pour le catalogue.",
    missing:
      "Pas de carnet de produit ou de modification automatique des cours.",
  },
  marketing: {
    observes: "Avis, favoris et contenus commerciaux préparés.",
    proposes: "Pistes de campagnes et brouillons issus du brief commercial.",
    missing:
      "Prospection sourcée, contenus et dates disponibles dans Prospection & campagnes. Connectez les canaux pour exécuter les publications approuvées.",
  },
  sales: {
    observes: "Inscriptions, paiements, prospects et actions commerciales.",
    proposes:
      "Messages personnalisés à examiner, qualification et relances à suivre.",
    missing:
      "Le pipeline et les rappels sont disponibles. Le statut Gagné est déclaré manuellement ; il ne confirme pas un paiement.",
  },
  support: {
    observes: "Compteurs de questions et de demandes de confidentialité.",
    proposes: "Priorités de support.",
    missing: "Aucun traitement ni réponse automatique aux utilisateurs.",
  },
  finance: {
    observes: "Nombre de paiements.",
    proposes: "Points de rapprochement à vérifier.",
    missing:
      "Pas de comptabilité complète, de transfert ou de remboursement automatique.",
  },
  analytics: {
    observes: "Compteurs d’inscriptions, de progression et de cours.",
    proposes: "Hypothèses et indicateurs à comparer.",
    missing:
      "Pas d’attribution des campagnes ni d’analyse de tout l’historique.",
  },
  crm: {
    observes:
      "Profils, inscriptions, fiches prospects et historique commercial.",
    proposes: "Pistes de fidélisation et préparation des prochains contacts.",
    missing:
      "Le suivi des prospects est disponible. Les emails doivent être sourcés et les contacts refusant les sollicitations sont bloqués.",
  },
};
type State = {
  enabled: boolean;
  ai_enabled: boolean;
  brainConfigured: boolean;
  githubConfigured: boolean;
  last_run_at: string | null;
};
export default function AgentCapabilities({
  department,
}: {
  department: string;
}) {
  const [state, setState] = useState<State | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    fetch(
      (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000") +
        "/ai-control-center/supervision",
      {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("kalatty_token"),
        },
        signal: abort.signal,
        cache: "no-store",
      },
    )
      .then(async (r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then(setState)
      .catch(() => {
        if (!abort.signal.aborted)
          setError("État des connexions indisponible.");
      });
    return () => abort.abort();
  }, []);
  const info = descriptions[department];
  if (!info) return null;
  return (
    <section className={styles.panel} aria-label="Capacités réelles de l’agent">
      <h2>Ce que cet agent fait aujourd’hui</h2>
      <dl>
        <div>
          <dt>Il observe</dt>
          <dd>{info.observes}</dd>
        </div>
        <div>
          <dt>Il peut proposer avec l’IA</dt>
          <dd>{info.proposes}</dd>
        </div>
        <div>
          <dt>Ce qui reste à connecter ou développer</dt>
          <dd>{info.missing}</dd>
        </div>
      </dl>
      {error && <p role="alert">{error}</p>}
      {state && (
        <div className={styles.status}>
          <span>
            Supervision : <b>{state.enabled ? "activée" : "en pause"}</b>
          </span>
          <span>
            Analyse IA automatique :{" "}
            <b>
              {state.ai_enabled
                ? state.brainConfigured
                  ? "activée — crédits à vérifier"
                  : "configuration manquante"
                : "désactivée"}
            </b>
          </span>
          {department === "developer" && (
            <span>
              Accès GitHub des agents :{" "}
              <b>{state.githubConfigured ? "configuré" : "non configuré"}</b>
            </span>
          )}
        </div>
      )}
      <p className={styles.note}>
        Une recommandation n’est pas une action exécutée. Toute préparation ou
        publication de correction doit apparaître avec son état réel dans le
        centre de validation.
      </p>
    </section>
  );
}
