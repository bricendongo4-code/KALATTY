"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { commerceFetch, money } from "../../commerce/api";
import commerce from "../../commerce/ui.module.css";
import Shell from "../Shell";
import { useCampusContext } from "../useEstablishment";
import { Icon } from "../ui";
import styles from "../student/student-pages.module.css";

type Offer = {
  code: string;
  label: string;
  amountFcfa: number;
  maxStudents: number;
  maxRooms: number;
};
type Plan = {
  paid_until?: string;
  plan_name: string;
  subscription_status: string;
  max_students: number;
  max_rooms: number;
};
export default function FinancePage() {
  const {
    context,
    loading,
    error: contextError,
    mismatch,
  } = useCampusContext("admin");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [billing, setBilling] = useState<
    {
      id: string;
      amount_fcfa: number;
      plan_name: string;
      status: string;
      created_at: string;
    }[]
  >([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!context) return;
    void commerceFetch<{ institutionPlans: Offer[] }>("/payments/plans")
      .then((r) => setOffers(r.institutionPlans))
      .catch((reason) => setError(reason.message));
    void commerceFetch<typeof billing>(
      `/payments/institutions/${context.institutionId}/billing`,
    )
      .then(setBilling)
      .catch((reason) => setError(reason.message));
    commerceFetch<Plan>(
      `/payments/institutions/${context.institutionId}/billing-summary`,
    )
      .then((result) => setPlan(result))
      .catch((reason) =>
        setError(
          reason instanceof Error ? reason.message : "Abonnement indisponible.",
        ),
      );
  }, [context]);
  if (mismatch)
    return (
      <section className={styles.standalone}>
        Cette page ne correspond pas à votre rôle.{" "}
        <Link href={`/establishment/${mismatch.campusRole}`}>
          Ouvrir mon espace
        </Link>
      </section>
    );
  return (
    <Shell
      role="admin"
      activeSlug="finances"
      displayName={context?.displayName}
      institutionName={context?.institutionName}
      note={contextError ?? null}
    >
      <header className={styles.head}>
        <div>
          <small>DIRECTION</small>
          <h1>Abonnement de l’établissement</h1>
          <p>Formule et capacités de votre espace.</p>
        </div>
        <Link href="/establishment/admin" className={styles.back}>
          ← Accueil
        </Link>
      </header>
      {loading || (!plan && !error) ? (
        <section className={styles.state}>Chargement…</section>
      ) : error ? (
        <section className={styles.state} role="alert">
          {error}
        </section>
      ) : plan ? (
        <div className={styles.grid}>
          <article className={styles.tile}>
            <span className={styles.icon}>
              <Icon name="euro" />
            </span>
            <small>Formule</small>
            <h2>{plan.plan_name}</h2>
            <p>Statut : {plan.subscription_status}</p>
          </article>
          <article className={styles.tile}>
            <span className={styles.icon}>
              <Icon name="users" />
            </span>
            <h2>Capacités</h2>
            <p>
              {plan.max_students} étudiants · {plan.max_rooms} classes
            </p>
          </article>
        </div>
      ) : null}
      {plan?.paid_until && (
        <p>
          Accès payé jusqu’au{" "}
          {new Date(plan.paid_until).toLocaleDateString("fr-FR")}. Le
          renouvellement ajoute 30 jours au forfait actuel.
        </p>
      )}
      <section className={commerce.workspace}>
        <div className={commerce.columns}>
          {offers.map((o) => (
            <article key={o.code} className={commerce.panel}>
              <h2>{o.label}</h2>
              <strong>{money(o.amountFcfa)} / 30 jours</strong>
              <p>
                {o.maxStudents} étudiants · {o.maxRooms} classes
              </p>
              <Link
                href={`/checkout?institution=${context?.institutionId}&plan=${o.code}`}
              >
                Choisir / renouveler ce forfait →
              </Link>
            </article>
          ))}
        </div>
        <p>
          Le paiement est réalisé par le responsable. Aucun prélèvement
          automatique. Le forfait est activé uniquement après confirmation du
          prestataire ; le changement de formule pendant une période payée
          nécessite d’attendre son échéance.
        </p>
        <section className={commerce.panel}>
          <h2>Historique des règlements</h2>
          {billing.length ? (
            billing.map((p) => (
              <p key={p.id}>
                {p.plan_name} · {money(p.amount_fcfa)} · {p.status} ·{" "}
                {new Date(p.created_at).toLocaleDateString("fr-FR")}
                <small> · {p.id}</small>
              </p>
            ))
          ) : (
            <p>Aucun règlement enregistré.</p>
          )}
        </section>
      </section>
      <p>
        Les règlements des apprenants en ligne et les revenus des formateurs
        sont consultables dans leurs espaces respectifs.
      </p>
    </Shell>
  );
}
