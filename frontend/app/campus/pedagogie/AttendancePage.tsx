"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Shell from "../Shell";
import { campusFetch, useCampusContext } from "../useCampusHome";
import { Icon } from "../ui";
import styles from "../etudiant/student-pages.module.css";

type Justification = { id: string; studentName: string; reason: string; status: string; note: string | null; createdAt: string };
export default function AttendancePage() {
  const { context, loading, error: contextError, mismatch } = useCampusContext("pedagogie");
  const [items, setItems] = useState<Justification[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    setError(null);
    try { const result = await campusFetch("/campus/staff/justifications"); setItems(result.justifications ?? []); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Justificatifs indisponibles."); }
  }, []);
  useEffect(() => { if (context) void load(); }, [context, load]);
  const review = async (id: string, status: "approved" | "rejected") => {
    setBusy(id); setError(null);
    try { await campusFetch(`/campus/staff/justifications/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status }) }); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Décision impossible."); }
    finally { setBusy(null); }
  };
  if (mismatch) return <section className={styles.standalone}>Cette page ne correspond pas à votre rôle. <Link href={`/campus/${mismatch.campusRole}`}>Ouvrir mon espace</Link></section>;
  return <Shell role="pedagogie" activeSlug="vie-scolaire" displayName={context?.displayName} institutionName={context?.institutionName} note={contextError ?? null}>
    <header className={styles.head}><div><small>RESPONSABLE PÉDAGOGIQUE</small><h1>Vie scolaire</h1><p>Justificatifs d’absence des classes de votre périmètre.</p></div><Link href="/campus/pedagogie" className={styles.back}>← Accueil</Link></header>
    {error ? <section className={styles.state} role="alert">{error}</section> : null}
    {loading || !items && !error ? <section className={styles.state}>Chargement…</section> : items?.length ? <div className={styles.stack}>{items.map((item) => <article className={styles.tile} key={item.id}><span className={styles.icon}><Icon name="shield" /></span><small>{new Date(item.createdAt).toLocaleDateString("fr-FR")} · {item.status === "pending" ? "En attente" : item.status === "approved" ? "Accepté" : "Refusé"}</small><h2>{item.studentName}</h2><p>{item.reason}</p>{item.note ? <p>{item.note}</p> : null}{item.status === "pending" ? <div className={styles.actions}><button type="button" disabled={busy === item.id} onClick={() => void review(item.id, "approved")}>Accepter</button><button type="button" disabled={busy === item.id} onClick={() => void review(item.id, "rejected")}>Refuser</button></div> : null}</article>)}</div> : <section className={styles.state}><h2>Aucun justificatif</h2><p>Les demandes transmises par les étudiants apparaîtront ici.</p></section>}
  </Shell>;
}
