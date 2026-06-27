"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "../auth.module.css";

export default function ResetPasswordPage() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const [accessToken, setAccessToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const recoveryToken = hash.get("access_token") ?? "";
    setAccessToken(recoveryToken);
    if (!recoveryToken) {
      setMessage(
        hash.get("error_description")?.replace(/\+/g, " ") ??
          "Ce lien de recuperation est absent ou a expire.",
      );
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");

    if (password.length < 8) {
      setMessage("Le mot de passe doit contenir au moins 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setMessage("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, password }),
      });
      const data = await response.json();
      setMessage(data.message ?? "Impossible de modifier le mot de passe.");
      setIsComplete(response.ok);
      if (response.ok) {
        window.history.replaceState({}, "", "/reset-password");
      }
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
        <span className={styles.badge}>Nouveau mot de passe</span>
        <h1 className={styles.title}>Protege ton compte avec un nouvel acces.</h1>
        <p className={styles.subtitle}>Le lien recu par email est temporaire et ne peut servir qu&apos;a recuperer ton compte.</p>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <p className={styles.eyebrow}>Recuperation</p>
          <h2>Choisir un mot de passe</h2>
          <p>Utilise au moins 8 caracteres et evite un mot de passe deja utilise ailleurs.</p>
        </div>
        {isComplete ? (
          <div className={styles.form}>
            <p className={styles.feedback}>{message}</p>
            <Link href="/login" className={styles.primaryButton}>Se connecter</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.field}>
              <span>Nouveau mot de passe</span>
              <span className={styles.passwordField}>
                <input type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                <button type="button" className={styles.passwordToggle} aria-pressed={showPassword} aria-label={showPassword ? "Masquer les mots de passe" : "Afficher les mots de passe"} onClick={() => setShowPassword((current) => !current)}>
                  {showPassword ? "Masquer" : "Afficher"}
                </button>
              </span>
            </label>
            <label className={styles.field}>
              <span>Confirmer le mot de passe</span>
              <input type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
            </label>
            <button className={styles.primaryButton} type="submit" disabled={isLoading || !accessToken}>
              {isLoading ? "Modification..." : accessToken ? "Modifier le mot de passe" : "Lien invalide ou expire"}
            </button>
            {message ? <p className={styles.feedback}>{message}</p> : null}
          </form>
        )}
        <p className={styles.switchText}><Link href="/forgot-password">Demander un nouveau lien</Link></p>
      </section>
    </main>
  );
}
