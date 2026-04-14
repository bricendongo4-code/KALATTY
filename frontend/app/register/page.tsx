import Image from "next/image";
import Link from "next/link";
import styles from "../auth.module.css";

const options = [
  {
    href: "/register/student",
    label: "Je suis etudiant",
    title: "Creer un espace apprenant",
    description:
      "Suivre des cours, revoir ses lecons, progresser sur mobile et garder un rythme d'etude adapte.",
  },
  {
    href: "/register/teacher",
    label: "Je suis enseignant",
    title: "Publier et piloter mes cours",
    description:
      "Mettre en ligne des modules, suivre les apprenants, partager des ressources et construire une academie locale.",
  },
  {
    href: "/register/institution",
    label: "Je suis un etablissement",
    title: "Ouvrir un campus digital",
    description:
      "Regrouper des classes, suivre les eleves, attribuer des cours, creer des salles et organiser les exercices.",
  },
];

export default function RegisterChoicePage() {
  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <div className={styles.brandBlock}>
          <Image
            src="/kalatty-logo.png"
            alt="Logo Kalatty"
            width={160}
            height={160}
            className={styles.brandLogo}
            priority
          />
          <span className={styles.brandLine}>Kalatty</span>
        </div>
        <span className={styles.badge}>Choix du parcours</span>
        <h1 className={styles.title}>
          Kalatty accueille les apprenants comme les createurs de cours.
        </h1>
        <p className={styles.subtitle}>
          Choisis le parcours qui correspond a ton besoin aujourd&apos;hui. Tu pourras
          ensuite avoir une interface adaptee a ton role.
        </p>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <p className={styles.eyebrow}>Inscription</p>
          <h2>Quel espace veux-tu ouvrir ?</h2>
          <p>Selectionne ton profil pour lancer une inscription guidee.</p>
        </div>

        <div className={styles.choiceList}>
          {options.map((option) => (
            <Link key={option.href} href={option.href} className={styles.choiceCard}>
              <span className={styles.choiceTag}>{option.label}</span>
              <strong>{option.title}</strong>
              <p>{option.description}</p>
            </Link>
          ))}
        </div>

        <p className={styles.switchText}>
          Deja un compte ? <Link href="/login">Se connecter</Link>
        </p>
      </section>
    </main>
  );
}
