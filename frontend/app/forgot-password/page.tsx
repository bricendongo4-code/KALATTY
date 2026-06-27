"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import styles from "../auth.module.css";

export default function ForgotPasswordPage() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      setMessage(
        data.message ??
          (response.ok
            ? "Verifie ta boite email pour continuer."
            : "Impossible d'envoyer le lien pour le moment."),
      );
    } catch {
      setMessage("Le service de recuperation est momentanement indisponible.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <Link href="/" className={styles.brandLink}>
          <Image src="/kalatty-logo.png" alt="Logo Kalatty" width={160} height={160} className={styles.brandLogo} priority />
          <span className={styles.brandLine}>Kalatty</span>
        </Link>
        <span className={styles.badge}>Securite du compte</span>
        <h1 className={styles.title}>Retrouve rapidement l&apos;acces a ton espace.</h1>
        <p className={styles.subtitle}>
          Nous t&apos;enverrons un lien temporaire et personnel pour choisir un nouveau mot de passe.
        </p>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <p className={styles.eyebrow}>Recuperation</p>
          <h2>Mot de passe oublie</h2>
          <p>Saisis l&apos;adresse email utilisee pour ton compte Kalatty.</p>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.field}>
            <span>Email</span>
            <input type="email" autoComplete="email" placeholder="exemple@ecole.cm" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <button className={styles.primaryButton} type="submit" disabled={isLoading}>
            {isLoading ? "Envoi..." : "Recevoir le lien"}
          </button>
          {message ? <p className={styles.feedback}>{message}</p> : null}
        </form>
        <p className={styles.switchText}><Link href="/login">Retour a la connexion</Link></p>
      </section>
    </main>
  );
}
