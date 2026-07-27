"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { useAuthEntryHistoryGuard } from "../../sessionSecurity";
import styles from "../../auth.module.css";

export default function InstitutionRegisterPage() {
  const router = useRouter();
  useAuthEntryHistoryGuard();
  const [institutionName, setInstitutionName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [institutionType, setInstitutionType] = useState("");
  const [description, setDescription] = useState("");
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
          fullname: institutionName,
          email,
          password,
          role: "institution",
          country: "Cameroun",
          school_name: institutionName,
          expertise: institutionType,
          bio: description,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message ?? "Impossible de creer l'espace etablissement.");
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

      setMessage(data.message ?? "Espace etablissement cree avec succes.");
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
        <span className={styles.badge}>Parcours etablissement</span>
        <h1 className={styles.title}>Cree un campus digital pour tes classes et tes filieres.</h1>
        <p className={styles.subtitle}>
          Ouvre un espace institutionnel pour regrouper les apprenants, creer des
          salles, attribuer des cours et suivre les exercices comme dans un hub
          de travail educatif.
        </p>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <p className={styles.eyebrow}>Inscription etablissement</p>
          <h2>Ouvre ton espace institutionnel</h2>
          <p>Quelques informations suffisent pour preparer ton campus sur Kalatty.</p>
        </div>

        <form onSubmit={handleRegister} className={styles.form}>
          <label className={styles.field}>
            <span>Nom de l&apos;etablissement</span>
            <input
              type="text"
              placeholder="Ex: Institut Horizon"
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              required
            />
          </label>

          <label className={styles.field}>
            <span>Email principal</span>
            <input
              type="email"
              placeholder="contact@etablissement.cm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className={styles.field}>
            <span>Type d&apos;etablissement</span>
            <input
              type="text"
              placeholder="Ex: Lycee, universite, centre de formation"
              value={institutionType}
              onChange={(e) => setInstitutionType(e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>Description rapide</span>
            <textarea
              className={styles.textarea}
              placeholder="Parle de tes classes, filieres ou besoins pedagogiques"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
            {isLoading ? "Creation..." : "Creer mon espace etablissement"}
          </button>

          {message ? <p className={styles.feedback}>{message}</p> : null}
        </form>

        <p className={styles.switchText}>
          Je cherche un autre profil ? <Link href="/register">Choisir un autre espace</Link>
        </p>
      </section>
    </main>
  );
}
