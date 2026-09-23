"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "../establishment/ui";
import styles from "./learning.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type Payment = {
  id: string;
  courseTitle: string;
  amountFcfa: number;
  status: string;
  createdAt: string;
  receiptAvailable: boolean;
};

export default function PaymentHistory() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem("kalatty_token");
    if (!token) return router.replace("/login?redirect=/learn/billing");
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/payments/mine`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.status === 401) return router.replace("/login?redirect=/learn/billing");
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? "Impossible de charger vos paiements.");
      setTransactions(body.transactions ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Connexion au serveur impossible.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const paidTotal = transactions.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amountFcfa, 0);
  const pendingCount = transactions.filter((item) => ["pending", "processing"].includes(item.status)).length;

  return <>
    <header className={styles.pageHead}><div><h1>Paiements & factures</h1><p>Historique réel de vos achats de formations et de leur statut.</p></div><button className={styles.smallButton} onClick={load}>Actualiser</button></header>
    {loading ? <section className={styles.loadingState}><span /><h2>Chargement des transactions</h2></section> : error ? <section className={styles.loadingState}><Icon name="alert" /><h2>Chargement impossible</h2><p>{error}</p><button onClick={load}>Réessayer</button></section> : <>
      <div className={styles.stats}><article className={styles.stat}><span className={styles.statIcon}><Icon name="euro" /></span><span><strong>{new Intl.NumberFormat("fr-FR").format(paidTotal)} FCFA</strong><small>Total payé</small></span></article><article className={styles.stat}><span className={`${styles.statIcon} ${styles.stat_blue}`}><Icon name="clipboard" /></span><span><strong>{transactions.length}</strong><small>Transactions</small></span></article><article className={styles.stat}><span className={`${styles.statIcon} ${styles.stat_orange}`}><Icon name="clock" /></span><span><strong>{pendingCount}</strong><small>En traitement</small></span></article><article className={styles.stat}><span className={`${styles.statIcon} ${styles.stat_purple}`}><Icon name="shield" /></span><span><strong>Serveur</strong><small>Confirmation sécurisée</small></span></article></div>
      <section className={styles.panel}><div className={styles.sectionHead}><h2>Historique</h2></div>{transactions.length ? <div className={styles.tableWrap}><table><thead><tr><th>Formation</th><th>Date</th><th>Montant</th><th>Statut</th><th>Document</th></tr></thead><tbody>{transactions.map((item) => <tr key={item.id}><td><strong>{item.courseTitle}</strong></td><td>{new Date(item.createdAt).toLocaleDateString("fr-FR")}</td><td>{new Intl.NumberFormat("fr-FR").format(item.amountFcfa)} FCFA</td><td><span className={item.status === "paid" ? styles.statusActive : styles.statusCertified}>{item.status}</span></td><td>{item.receiptAvailable ? "Reçu enregistré" : "Après confirmation"}</td></tr>)}</tbody></table></div> : <div className={styles.empty}><Icon name="euro" /><h3>Aucun paiement</h3><p>Vos achats apparaîtront ici après création de la transaction.</p></div>}</section>
    </>}
  </>;
}
