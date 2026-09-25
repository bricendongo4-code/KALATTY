"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import styles from "../legal.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

const subscribeToSession = () => () => undefined;
const getSessionToken = () => localStorage.getItem("kalatty_token");
const getServerSessionToken = () => null;

export default function DataRightsPage() {
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const token = useSyncExternalStore(subscribeToSession, getSessionToken, getServerSessionToken);

  const exportData = async () => {
    if (!token) return;
    setBusy("export"); setMessage(null);
    try {
      const response = await fetch(`${API_BASE}/privacy/export`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? "Export impossible.");
      const url = URL.createObjectURL(new Blob([JSON.stringify(body, null, 2)], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `kalatty-donnees-${new Date().toISOString().slice(0, 10)}.json`; anchor.click();
      URL.revokeObjectURL(url);
      setMessage("Votre export a été généré sur cet appareil.");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Export impossible."); }
    finally { setBusy(null); }
  };

  const request = async (requestType: "deletion" | "rectification") => {
    if (!token || (requestType === "deletion" && !confirmed)) return;
    setBusy(requestType); setMessage(null);
    try {
      const response = await fetch(`${API_BASE}/privacy/requests`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ requestType }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? "Demande impossible.");
      setMessage(body.message ?? "Demande enregistrée.");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Demande impossible."); }
    finally { setBusy(null); }
  };

  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.header}><Link href="/" className={styles.brand}><Image src="/kalatty-logo.png" alt="Kalatty" width={58} height={58} /><span>Kalatty</span></Link><Link href="/privacy" className={styles.back}>Politique de confidentialité</Link></header>
    <section className={styles.hero}><span className={styles.eyebrow}>Contrôle du compte</span><h1>Mes données personnelles</h1><p>Téléchargez les informations associées à votre compte ou transmettez une demande formelle à l’équipe Kalatty.</p></section>
    {!token ? <section className={styles.rightsPanel}><p className={styles.warning}>Connectez-vous pour vérifier votre identité avant d’accéder à ces actions.</p><Link href="/login?redirect=/data-rights" className={styles.primary}>Se connecter</Link></section> : <section className={styles.rightsPanel}>
      {message ? <p className={styles.status} role="status">{message}</p> : null}
      <article><h2>Exporter mes données</h2><p>Générez un fichier JSON contenant votre profil, vos inscriptions, votre progression, vos notes personnelles, questions, avis, établissements et références de paiement.</p><div className={styles.actions}><button className={styles.primary} disabled={busy !== null} onClick={() => void exportData()}>{busy === "export" ? "Génération…" : "Télécharger mon export"}</button></div></article>
      <article><h2>Demander une rectification</h2><p>Utilisez cette demande si une information ne peut pas être corrigée directement depuis votre profil.</p><div className={styles.actions}><button className={styles.secondary} disabled={busy !== null} onClick={() => void request("rectification")}>{busy === "rectification" ? "Envoi…" : "Déposer la demande"}</button></div></article>
      <article><h2>Demander la suppression</h2><p>La demande déclenche une vérification avant suppression. Certaines données peuvent être conservées lorsqu’une obligation légale, comptable ou pédagogique l’impose.</p><label><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> Je comprends que cette demande peut rendre mon compte et mes contenus inaccessibles après validation.</label><div className={styles.actions}><button className={styles.danger} disabled={!confirmed || busy !== null} onClick={() => void request("deletion")}>{busy === "deletion" ? "Envoi…" : "Demander la suppression"}</button></div></article>
    </section>}
  </div></main>;
}
