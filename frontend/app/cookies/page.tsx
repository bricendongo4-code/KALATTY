import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "../legal.module.css";

export const metadata: Metadata = { title: "Cookies et stockage local | Kalatty" };

export default function CookiesPage() {
  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.header}><Link href="/" className={styles.brand}><Image src="/kalatty-logo.png" alt="Kalatty" width={58} height={58} /><span>Kalatty</span></Link><Link href="/privacy" className={styles.back}>Confidentialité</Link></header>
    <section className={styles.hero}><span className={styles.eyebrow}>Stockage du navigateur</span><h1>Cookies et technologies similaires</h1><p>Kalatty utilise uniquement les éléments nécessaires au fonctionnement et à la sécurité du compte dans sa version actuelle.</p></section>
    <section className={styles.section}>
      <div><h2>Éléments strictement nécessaires</h2><p>Le navigateur conserve temporairement les informations de session permettant de rester connecté, d’identifier l’espace autorisé et de sécuriser les appels à l’API. Leur suppression entraîne généralement une déconnexion.</p></div>
      <div><h2>Préférences locales</h2><p>Des préférences d’interface peuvent être enregistrées localement, par exemple l’état de navigation ou la reprise d’un parcours. La progression pédagogique principale reste enregistrée sur le serveur.</p></div>
      <div><h2>Mesure d’audience</h2><p>Aucun cookie publicitaire n’est annoncé dans la version actuelle. Si un outil d’analyse non essentiel est ajouté, Kalatty devra informer l’utilisateur et recueillir son choix avant activation lorsque la loi l’exige.</p></div>
      <div><h2>Gérer le stockage</h2><p>Vous pouvez effacer les données du site depuis les réglages de votre navigateur. Pour supprimer les données conservées sur les serveurs, utilisez la page dédiée aux droits personnels.</p><Link href="/data-rights" className={styles.primary}>Gérer mes données</Link></div>
    </section>
  </div></main>;
}
