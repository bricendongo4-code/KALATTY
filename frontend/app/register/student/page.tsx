"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import styles from "../../auth.module.css";

export default function StudentRegisterPage() {
  const router = useRouter();
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [level, setLevel] = useState("");
  const [schoolName, setSchoolName] = useState("");
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
          role: "student",
          country: "Cameroun",
          level,
          school_name: schoolName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message ?? "Impossible de creer le compte etudiant.");
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

      setMessage(data.message ?? "Compte etudiant cree avec succes.");
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
        <span className={styles.badge}>Parcours etudiant</span>
        <h1 className={styles.title}>Commence ton parcours d&apos;apprentissage.</h1>
        <p className={styles.subtitle}>
          Cree ton espace pour suivre tes cours, reprendre tes revisions et garder
          une progression claire sur Kallaty.
        </p>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <p className={styles.eyebrow}>Inscription etudiant</p>
          <h2>Ouvre ton espace apprenant</h2>
          <p>Quelques infos suffisent pour personnaliser ton experience.</p>
        </div>

        <form onSubmit={handleRegister} className={styles.form}>
          <label className={styles.field}>
            <span>Nom complet</span>
            <input
              type="text"
              placeholder="Ex: Amina Njoya"
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              required
            />
          </label>

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

          <div className={styles.inlineFields}>
            <label className={styles.field}>
              <span>Niveau</span>
              <input
                type="text"
                placeholder="Ex: Terminale, Licence 2"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              />
            </label>

            <label className={styles.field}>
              <span>Etablissement</span>
              <input
                type="text"
                placeholder="Nom de l'ecole"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
              />
            </label>
          </div>

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
            {isLoading ? "Creation..." : "Creer mon compte etudiant"}
          </button>

          {message ? <p className={styles.feedback}>{message}</p> : null}
        </form>

        <p className={styles.switchText}>
          Je veux plutot enseigner ? <Link href="/register/teacher">Espace enseignant</Link>
        </p>
      </section>
    </main>
  );
}
