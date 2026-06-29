import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "../info.module.css";

export const metadata: Metadata = {
  title: "Contact | Kalatty",
  description:
    "Contacter Kalatty pour un cours, un compte formateur ou un espace etablissement.",
};

export default function ContactPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <nav className={styles.nav} aria-label="Navigation Kalatty">
            <Link href="/" className={styles.brand}>
              <Image
                src="/kalatty-logo.png"
                alt="Logo Kalatty"
                width={72}
                height={72}
              />
              <span>Kalatty</span>
            </Link>
            <div className={styles.navLinks}>
              <Link href="/about">A propos</Link>
              <Link href="/pricing">Tarifs</Link>
              <Link href="/dashboard">Dashboard</Link>
            </div>
          </nav>
          <span className={styles.eyebrow}>Contact</span>
          <h1>Une question sur Kalatty, un campus ou un cours ?</h1>
          <p className={styles.lead}>
            Utilise cette page comme point d&apos;entree pour orienter les
            demandes et preparer le futur support client de la plateforme.
          </p>
        </section>

        <section className={styles.section}>
          <div className={styles.contactGrid}>
            <article className={styles.card}>
              <h2>Canaux prioritaires</h2>
              <ul className={styles.list}>
                <li>
                  Etudiant : probleme d&apos;acces a un cours, paiement ou
                  video.
                </li>
                <li>Formateur : creation de cours, revenus, publication.</li>
                <li>Etablissement : comptes internes, classes, abonnement.</li>
              </ul>
              <div className={styles.actions}>
                <Link
                  href="/register/institution"
                  className={styles.primaryLink}
                >
                  Demarrer un campus
                </Link>
                <Link href="/login" className={styles.secondaryLink}>
                  Se connecter
                </Link>
              </div>
            </article>

            <form className={styles.form}>
              <label>
                <span>Nom complet</span>
                <input type="text" placeholder="Ex: Jean Ngo" />
              </label>
              <label>
                <span>Email</span>
                <input type="email" placeholder="nom@email.com" />
              </label>
              <label>
                <span>Profil</span>
                <select defaultValue="student">
                  <option value="student">Etudiant</option>
                  <option value="teacher">Formateur</option>
                  <option value="institution">Etablissement</option>
                </select>
              </label>
              <label>
                <span>Message</span>
                <textarea placeholder="Explique rapidement ta demande." />
              </label>
              <a
                className={styles.primaryLink}
                href="mailto:support@kalatty.com?subject=Demande%20Kalatty"
              >
                Envoyer par email
              </a>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
