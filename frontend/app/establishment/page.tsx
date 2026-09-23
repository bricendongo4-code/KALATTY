import type { Metadata } from "next";
import Link from "next/link";
import styles from "./establishment.module.css";
import { ROLES, ROLE_ORDER } from "./roles";

export const metadata: Metadata = {
  title: "Espace Établissement - Kalatty",
  description:
    "Espace Établissement Kalatty : Étudiant, Professeur, Responsable pédagogique, Direction.",
};

export default function CampusPicker() {
  return (
    <main className={styles.picker}>
      <div className={styles.pickerInner}>
        <h1>Espace Établissement</h1>
        <p>
          Quatre rôles connectés autour des mêmes objets (établissement, classe,
          séance, présence, devoir, évaluation, note, document) avec des droits
          et des vues différents. Chaque écran répond d&apos;abord à la question
          « qu&apos;est-ce que je dois faire maintenant ? ».
        </p>
        <div className={styles.pickerGrid}>
          {ROLE_ORDER.map((slug) => (
            <Link
              key={slug}
              href={`/establishment/${slug}`}
              className={styles.pickCard}
              style={{ ["--pick" as string]: ROLES[slug].pickColor }}
            >
              <strong>{ROLES[slug].name}</strong>
              <span>{ROLES[slug].pitch}</span>
            </Link>
          ))}
        </div>
        <Link href="/learn" className={styles.btn} style={{ marginTop: 22 }}>
          Ouvrir l&apos;univers Formation en ligne
        </Link>
      </div>
    </main>
  );
}
