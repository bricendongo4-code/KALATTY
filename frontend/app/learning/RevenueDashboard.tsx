"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "../establishment/ui";
import styles from "./learning.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type Revenue = {
  currency: string;
  grossPaidFcfa: number;
  feesPaidFcfa: number;
  netPaidFcfa: number;
  pendingNetFcfa: number;
  refundsFcfa: number;
  paidSalesCount: number;
  transactions: Array<{ id: string; courseTitle: string; amountGrossFcfa: number; platformFeeFcfa: number; trainerNetFcfa: number; status: string; createdAt: string }>;
};

const money = (value: number) => `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`;

export default function RevenueDashboard() {
  const router = useRouter();
  const [data, setData] = useState<Revenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem("kalatty_token");
    if (!token) return router.replace("/login?redirect=/learning/formateur/revenus");
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/payments/teacher/revenue-summary`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.status === 401) return router.replace("/login?redirect=/learning/formateur/revenus");
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? "Impossible de charger vos revenus.");
      setData(body as Revenue);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Connexion au serveur impossible.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  return <>
    <header className={styles.pageHead}><div><h1>Aperçu des revenus</h1><p>Montant brut, frais et revenu net sont séparés à partir des transactions réelles.</p></div><button className={styles.smallButton} onClick={load}>Actualiser</button></header>
    {loading ? <section className={styles.loadingState}><span /><h2>Calcul des revenus</h2></section> : error ? <section className={styles.loadingState}><Icon name="alert" /><h2>Chargement impossible</h2><p>{error}</p><button onClick={load}>Réessayer</button></section> : data ? <>
      <div className={styles.stats}><article className={styles.stat}><span className={styles.statIcon}><Icon name="chart" /></span><span><strong>{money(data.grossPaidFcfa)}</strong><small>Ventes brutes payées</small></span></article><article className={styles.stat}><span className={`${styles.statIcon} ${styles.stat_orange}`}><Icon name="euro" /></span><span><strong>{money(data.feesPaidFcfa)}</strong><small>Frais plateforme</small></span></article><article className={styles.stat}><span className={`${styles.statIcon} ${styles.stat_blue}`}><Icon name="euro" /></span><span><strong>{money(data.netPaidFcfa)}</strong><small>Revenu net</small></span></article><article className={styles.stat}><span className={`${styles.statIcon} ${styles.stat_purple}`}><Icon name="clock" /></span><span><strong>{money(data.pendingNetFcfa)}</strong><small>En attente</small></span></article></div>
      <section className={styles.panel}><div className={styles.sectionHead}><h2>Transactions ({data.transactions.length})</h2><span className={styles.mutedText}>{data.paidSalesCount} vente(s) confirmée(s)</span></div>{data.transactions.length ? <div className={styles.tableWrap}><table><thead><tr><th>Formation</th><th>Date</th><th>Brut</th><th>Frais</th><th>Net</th><th>Statut</th></tr></thead><tbody>{data.transactions.map((item) => <tr key={item.id}><td><strong>{item.courseTitle}</strong></td><td>{new Date(item.createdAt).toLocaleDateString("fr-FR")}</td><td>{money(item.amountGrossFcfa)}</td><td>{money(item.platformFeeFcfa)}</td><td>{money(item.trainerNetFcfa)}</td><td><span className={item.status === "paid" ? styles.statusActive : styles.statusCertified}>{item.status}</span></td></tr>)}</tbody></table></div> : <div className={styles.empty}><Icon name="chart" /><h3>Aucune transaction</h3><p>Les revenus apparaîtront après la confirmation serveur d’un paiement.</p></div>}</section>
    </> : null}
  </>;
}
