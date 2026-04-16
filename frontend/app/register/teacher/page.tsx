"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import styles from "../../auth.module.css";

export default function TeacherRegisterPage() {
  const router = useRouter();
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [expertise, setExpertise] = useState("");
  const [bio, setBio] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const res = await fetch(`${apiBaseUrl}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullname,
          email,
          password,
          role: "teacher",
          country: "Cameroun",
          expertise,
          bio,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message ?? "Impossible de creer le compte enseignant.");
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

      setMessage(data.message ?? "Compte enseignant cree avec succes.");
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
            width={148}
            height={148}
            className={styles.brandLogo}
            priority
          />
          <span className={styles.brandLine}>Kalatty</span>
        </Link>
        <span className={styles.badge}>Parcours enseignant</span>
        <h1 className={styles.title}>Partage ton savoir avec une vraie interface formateur.</h1>
        <p className={styles.subtitle}>
          Cree ton espace enseignant pour publier des cours, accompagner des
          apprenants et suivre les performances de tes contenus.
        </p>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <p className={styles.eyebrow}>Inscription enseignant</p>
          <h2>Ouvre ton espace formateur</h2>
          <p>Renseigne ton profil pour preparer la mise en ligne de tes cours.</p>
        </div>

        <form onSubmit={handleRegister} className={styles.form}>
          <label className={styles.field}>
            <span>Nom complet</span>
            <input
              type="text"
              placeholder="Ex: M. Ndzi"
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              required
            />
          </label>

          <label className={styles.field}>
            <span>Email</span>
            <input
              type="email"
              placeholder="exemple@formation.cm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className={styles.field}>
            <span>Domaine principal</span>
            <input
              type="text"
              placeholder="Ex: Mathematiques, Anglais, Bureautique"
              value={expertise}
              onChange={(e) => setExpertise(e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>Presentation rapide</span>
            <textarea
              className={styles.textarea}
              placeholder="Decris ton experience ou les cours que tu veux publier"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
            />
          </label>

          <label className={styles.field}>
            <span>Mot de passe</span>
            <input
              type="password"
              placeholder="Au moins 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button className={styles.primaryButton} type="submit" disabled={isLoading}>
            {isLoading ? "Creation..." : "Creer mon compte enseignant"}
          </button>

          {message ? <p className={styles.feedback}>{message}</p> : null}
        </form>

        <p className={styles.switchText}>
          Je cherche a apprendre ? <Link href="/register/student">Espace etudiant</Link>
        </p>
      </section>
    </main>
  );
}
