import Image from "next/image";
import Link from "next/link";
import styles from "./learning.module.css";

export const metadata = {
  title: "Formation en ligne - Kalatty",
  description: "Choisissez votre espace de formation en ligne Kalatty.",
};

export default function LearningPicker() {
  return (
    <main className={styles.picker}>
      <section className={styles.pickerPanel}>
        <Image src="/kalatty-logo-campus.png" alt="Kalatty" width={170} height={140} className={styles.pickerLogo} priority />
        <span className={styles.eyebrow}>Formation en ligne</span>
        <h1>Un compte. Plusieurs façons d&apos;apprendre et de transmettre.</h1>
        <p>Choisissez le contexte que vous souhaitez ouvrir. Votre identité reste la même ; les outils et les données s&apos;adaptent à votre rôle.</p>
        <div className={styles.pickerCards}>
          <Link href="/learning/apprenant" className={styles.pickerCard}>
            <span className={styles.pickerIcon}><span>▶</span></span>
            <strong>Je suis apprenant</strong>
            <small>Explorer, apprendre, pratiquer et obtenir mes certificats.</small>
            <em>Ouvrir mon espace →</em>
          </Link>
          <Link href="/learning/formateur" className={`${styles.pickerCard} ${styles.pickerCardOrange}`}>
            <span className={styles.pickerIcon}><span>✦</span></span>
            <strong>Je suis formateur</strong>
            <small>Créer, publier, suivre mes apprenants et piloter mes revenus.</small>
            <em>Ouvrir mon studio →</em>
          </Link>
        </div>
        <Link href="/establishment" className={styles.backCampus}>Accéder plutôt à l&apos;Espace Établissement</Link>
      </section>
    </main>
  );
}
