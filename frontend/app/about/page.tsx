import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "../info.module.css";

export const metadata: Metadata = {
  title: "A propos | Kalatty",
  description:
    "Decouvrir la mission de Kalatty, plateforme e-learning pour etudiants, formateurs et etablissements.",
};

export default function AboutPage() {
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
              <Link href="/pricing">Tarifs</Link>
              <Link href="/contact">Contact</Link>
              <Link href="/login">Connexion</Link>
            </div>
          </nav>

          <span className={styles.eyebrow}>A propos</span>
          <h1>
            Une plateforme e-learning pensee pour apprendre, enseigner et
            piloter en ligne.
          </h1>
          <p className={styles.lead}>
            Kalatty aide les apprenants a suivre des cours video, les formateurs
            a publier leurs contenus et les etablissements a organiser leurs
            classes avec des comptes, devoirs, corrections et indicateurs.
          </p>
          <div className={styles.actions}>
            <Link href="/register/student" className={styles.primaryLink}>
              Commencer a apprendre
            </Link>
            <Link href="/register/institution" className={styles.secondaryLink}>
              Creer un campus
            </Link>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.eyebrow}>Mission</span>
            <h2>
              Rendre l&apos;apprentissage plus accessible, suivi et concret.
            </h2>
            <p>
              Kalatty se place entre la plateforme de cours ouverte et
              l&apos;espace institutionnel structure. L&apos;objectif est simple
              : chaque profil doit trouver son espace sans confusion.
            </p>
          </div>
          <div className={styles.grid}>
            <article className={styles.card}>
              <h3>Etudiants</h3>
              <p>
                Cours publies, progression, avis, lecture video et reprise de
                parcours.
              </p>
            </article>
            <article className={styles.card}>
              <h3>Formateurs</h3>
              <p>
                Studio de creation, upload video, modules, prix et suivi des
                inscriptions.
              </p>
            </article>
            <article className={styles.card}>
              <h3>Etablissements</h3>
              <p>
                Campus, classes, comptes internes, professeurs, devoirs et
                corrections.
              </p>
            </article>
          </div>
        </section>

        <section className={styles.ctaPanel}>
          <span className={styles.eyebrow}>Vision produit</span>
          <h2>
            La prochaine version doit etre mobile-first et accompagnee par
            l&apos;IA.
          </h2>
          <p>
            L&apos;objectif est de transformer Kalatty en assistant
            d&apos;apprentissage : resume de lecon, aide aux devoirs,
            recommandations et alertes de progression.
          </p>
          <Link href="/contact" className={styles.primaryLink}>
            Discuter du projet
          </Link>
        </section>
      </div>
    </main>
  );
}
