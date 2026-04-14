import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

const benefits = [
  {
    title: "Apprenants",
    text: "Une page d'accueil catalogue, un suivi de progression et un acces plus simple aux cours et exercices.",
  },
  {
    title: "Formateurs",
    text: "Un vrai studio de creation pour publier des cours, telecharger des videos et organiser le programme.",
  },
  {
    title: "Etablissements",
    text: "Des salles, des liens d'invitation, des devoirs et un pilotage proche d'un espace Teams educatif.",
  },
];

const highlights = [
  "Videos chargees directement sur la plateforme",
  "Salles de classe avec invitations par lien",
  "Recherche pour etudiants, enseignants et etablissements",
  "Approche mobile-ready pour la suite Flutter",
];

export default function Home() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <header className={styles.topbar}>
          <div className={styles.brand}>
            <Image
              src="/kalatty-logo.png"
              alt="Logo Kalatty"
              width={88}
              height={88}
              className={styles.brandLogo}
              priority
            />
            <div>
              <span className={styles.brandTag}>Plateforme educative</span>
              <strong className={styles.brandName}>Kalatty</strong>
            </div>
          </div>

          <nav className={styles.nav}>
            <Link href="/login" className={styles.navLink}>
              Connexion
            </Link>
            <Link href="/register" className={styles.navButton}>
              Commencer
            </Link>
          </nav>
        </header>

        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <span className={styles.kicker}>Apprendre, enseigner, administrer</span>
            <h1>
              Une plateforme Kalatty pensee pour les etudiants, les enseignants
              et les etablissements.
            </h1>
            <p>
              Kalatty centralise les cours, les videos, les salles, les
              exercices et le suivi pedagogique dans une interface moderne et
              plus proche des usages reels.
            </p>

            <div className={styles.ctas}>
              <Link href="/register" className={styles.primaryCta}>
                Creer un compte
              </Link>
              <Link href="/login" className={styles.secondaryCta}>
                Se connecter
              </Link>
            </div>

            <div className={styles.highlightList}>
              {highlights.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>

          <div className={styles.heroPanel}>
            <div className={styles.heroCard}>
              <span>Studio formateur</span>
              <strong>Creation de cours guidee</strong>
              <p>
                Landing page, programme, upload video et verification avant
                publication.
              </p>
            </div>
            <div className={styles.heroCardAccent}>
              <span>Campus digital</span>
              <strong>Salles, profs et etudiants relies</strong>
              <p>
                Invitations par lien, devoirs par salle et organisation des
                groupes en un seul endroit.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.benefitSection}>
        <div className={styles.sectionIntro}>
          <span>Pourquoi Kalatty</span>
          <h2>Une experience complete, pas juste un depot de cours</h2>
          <p>
            La plateforme evolue autour de trois besoins: apprendre facilement,
            publier proprement et administrer des groupes avec precision.
          </p>
        </div>

        <div className={styles.benefitGrid}>
          {benefits.map((benefit) => (
            <article key={benefit.title} className={styles.benefitCard}>
              <span>{benefit.title}</span>
              <h3>{benefit.title}</h3>
              <p>{benefit.text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
