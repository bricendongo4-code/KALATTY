import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "../info.module.css";

const institutionPlans = [
  {
    name: "Starter",
    price: "25 000 FCFA",
    audience: "Petite ecole ou centre",
    features: [
      "100 etudiants",
      "10 classes",
      "Comptes internes",
      "Devoirs et corrections",
    ],
  },
  {
    name: "Growth",
    price: "65 000 FCFA",
    audience: "Etablissement en croissance",
    features: [
      "500 etudiants",
      "30 classes",
      "Professeurs par classe",
      "Suivi pedagogique",
    ],
  },
  {
    name: "Campus",
    price: "120 000 FCFA",
    audience: "Grand campus",
    features: [
      "2 000 etudiants",
      "120 classes",
      "Organisation multi-niveaux",
      "Priorite support",
    ],
  },
];

export const metadata: Metadata = {
  title: "Tarifs | Kalatty",
  description:
    "Plans Kalatty pour cours individuels, formateurs et etablissements.",
};

export default function PricingPage() {
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
              <Link href="/contact">Contact</Link>
              <Link href="/login">Connexion</Link>
            </div>
          </nav>
          <span className={styles.eyebrow}>Tarifs</span>
          <h1>
            Des prix simples pour apprendre seul ou piloter un etablissement.
          </h1>
          <p className={styles.lead}>
            Les cours sont fixes par les formateurs. Les etablissements
            disposent d&apos;un abonnement pour creer des classes, ajouter des
            comptes internes et suivre les devoirs.
          </p>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.eyebrow}>Cours individuels</span>
            <h2>Payer uniquement les cours qui t&apos;interessent.</h2>
            <p>
              Un etudiant peut consulter la vitrine, ouvrir une fiche cours puis
              payer ou s&apos;inscrire selon le prix defini par le formateur.
            </p>
          </div>
          <div className={styles.grid}>
            <article className={styles.card}>
              <h3>Cours gratuits</h3>
              <strong className={styles.price}>0 FCFA</strong>
              <p>
                Inscription directe, lecture video et progression personnelle.
              </p>
            </article>
            <article className={styles.card}>
              <h3>Cours payants</h3>
              <strong className={styles.price}>Variable</strong>
              <p>Paiement par cours, acces active apres confirmation.</p>
            </article>
            <article className={styles.card}>
              <h3>Formateurs</h3>
              <strong className={styles.price}>15%</strong>
              <p>Commission plateforme demo calculee sur les cours payants.</p>
            </article>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.eyebrow}>Etablissements</span>
            <h2>Plans pour gerer des classes et comptes internes.</h2>
          </div>
          <div className={styles.pricingGrid}>
            {institutionPlans.map((plan) => (
              <article key={plan.name} className={styles.card}>
                <h3>{plan.name}</h3>
                <strong className={styles.price}>{plan.price}</strong>
                <p>{plan.audience}</p>
                <ul className={styles.list}>
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <Link
                  href="/register/institution"
                  className={styles.primaryLink}
                >
                  Choisir {plan.name}
                </Link>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
