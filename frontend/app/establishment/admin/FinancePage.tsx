"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Shell from "../Shell";
import { campusFetch, useCampusContext } from "../useEstablishment";
import { Icon } from "../ui";
import styles from "../student/student-pages.module.css";

type Plan = { plan_name: string; subscription_status: string; max_students: number; max_rooms: number };
export default function FinancePage() {
  const { context, loading, error: contextError, mismatch } = useCampusContext("admin");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!context) return;
    campusFetch(`/institutions/${context.institutionId}`).then((result) => setPlan(result))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Abonnement indisponible."));
  }, [context]);
  if (mismatch) return <section className={styles.standalone}>Cette page ne correspond pas à votre rôle. <Link href={`/establishment/${mismatch.campusRole}`}>Ouvrir mon espace</Link></section>;
  return <Shell role="admin" activeSlug="finances" displayName={context?.displayName} institutionName={context?.institutionName} note={contextError ?? null}>
    <header className={styles.head}><div><small>DIRECTION</small><h1>Abonnement de l’établissement</h1><p>Formule et capacités de votre espace.</p></div><Link href="/establishment/admin" className={styles.back}>← Accueil</Link></header>
    {loading || !plan && !error ? <section className={styles.state}>Chargement…</section> : error ? <section className={styles.state} role="alert">{error}</section> : plan ? <div className={styles.grid}><article className={styles.tile}><span className={styles.icon}><Icon name="euro" /></span><small>Formule</small><h2>{plan.plan_name}</h2><p>Statut : {plan.subscription_status}</p></article><article className={styles.tile}><span className={styles.icon}><Icon name="users" /></span><h2>Capacités</h2><p>{plan.max_students} étudiants · {plan.max_rooms} classes</p></article></div> : null}
    <p>Les règlements des apprenants en ligne et les revenus des formateurs sont consultables dans leurs espaces respectifs.</p>
  </Shell>;
}
