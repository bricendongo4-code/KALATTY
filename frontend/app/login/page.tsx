"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import styles from "../auth.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const res = await fetch(`${apiBaseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message ?? "Impossible de se connecter pour le moment.");
        return;
      }

      if (data.token) {
        localStorage.setItem("kalatty_token", data.token);
        localStorage.setItem("kalatty_user", JSON.stringify(data.user ?? null));
        startTransition(() => {
          router.push("/dashboard");
        });
        return;
      }

      setMessage(data.message ?? "Connexion reussie.");
    } catch {
      setMessage(
        "Le serveur est inaccessible. Verifie que le backend tourne sur le port 4000.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <Link href="/" className={styles.brandLink}>
          <Image
            src="/kalatty-logo.png"
            alt="Logo Kalatty"
            width={160}
            height={160}
            className={styles.brandLogo}
            priority
          />
          <span className={styles.brandLine}>Kalatty</span>
        </Link>
        <span className={styles.badge}>Plateforme Kalatty</span>
        <h1 className={styles.title}>
          Etudier, progresser, reussir avec des parcours penses pour l&apos;Afrique.
        </h1>
        <p className={styles.subtitle}>
          Une plateforme d&apos;apprentissage qui parle concret: revision mobile,
          accompagnement local et contenus utiles pour les eleves, etudiants et
          jeunes professionnels du Cameroun et d&apos;Afrique francophone.
        </p>
        <div className={styles.highlights}>
          <div className={styles.highlightCard}>
            <strong>Revision flexible</strong>
            <span>Cours accessibles meme avec une connexion modeste.</span>
          </div>
          <div className={styles.highlightCard}>
            <strong>Objectifs clairs</strong>
            <span>
              Preparation examens, competences numeriques et progression suivie.
            </span>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <p className={styles.eyebrow}>Connexion</p>
          <h2>Heureux de te revoir</h2>
          <p>
            Entre dans ton espace Kalatty pour reprendre tes cours et tes
            exercices.
          </p>
        </div>

        <form onSubmit={handleLogin} className={styles.form}>
          <label className={styles.field}>
            <span>Email</span>
            <input
              type="email"
              placeholder="exemple@ecole.cm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className={styles.field}>
            <span>Mot de passe</span>
            <input
              type="password"
              placeholder="Votre mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button
            className={styles.primaryButton}
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? "Connexion..." : "Se connecter"}
          </button>

          {message ? <p className={styles.feedback}>{message}</p> : null}
        </form>

        <p className={styles.switchText}>
          Pas encore de compte ? <Link href="/register">Choisir mon inscription</Link>
        </p>
      </section>
    </main>
  );
}
