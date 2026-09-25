import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "../legal.module.css";

export const metadata: Metadata = { title: "Conditions d’utilisation | Kalatty", description: "Conditions générales d’utilisation de Kalatty." };

export default function TermsPage() {
  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.header}><Link href="/" className={styles.brand}><Image src="/kalatty-logo.png" alt="Kalatty" width={58} height={58} /><span>Kalatty</span></Link><Link href="/privacy" className={styles.back}>Confidentialité</Link></header>
    <section className={styles.hero}><span className={styles.eyebrow}>Cadre d’utilisation</span><h1>Conditions générales d’utilisation</h1><p>Ces conditions définissent les règles applicables aux apprenants, formateurs et établissements utilisant Kalatty.</p><small className={styles.updated}>Version du 25 septembre 2026</small></section>
    <section className={styles.section}>
      <div><h2>Compte et sécurité</h2><p>Chaque utilisateur protège ses identifiants, fournit des informations exactes et signale rapidement toute utilisation non autorisée. Les comptes établissement sont personnels même lorsqu’ils sont créés par un administrateur.</p></div>
      <div><h2>Rôles et responsabilités</h2><ul><li>Le formateur garantit disposer des droits nécessaires sur les contenus publiés.</li><li>L’établissement gère ses classes et les habilitations de son personnel.</li><li>L’apprenant utilise les ressources dans un cadre personnel et pédagogique.</li><li>Toute fraude, violence, harcèlement ou tentative d’accès non autorisé est interdite.</li></ul></div>
      <div><h2>Contenus pédagogiques</h2><p>Les cours restent la propriété de leurs auteurs ou titulaires. L’accès à une vidéo ne transfère aucun droit de copie, redistribution ou revente. Kalatty peut retirer un contenu manifestement illicite ou dangereux.</p></div>
      <div><h2>Disponibilité</h2><p>Kalatty met en œuvre des moyens raisonnables pour assurer la continuité du service. Des interruptions peuvent néanmoins intervenir pour maintenance, incident réseau ou dépendance externe.</p></div>
      <div><h2>Suspension et fermeture</h2><p>Un compte peut être limité en cas de violation grave, risque de sécurité ou obligation légale. L’utilisateur peut déposer une demande de suppression depuis la page « Mes données ».</p></div>
      <div><h2>Évolution des conditions</h2><p>Les modifications importantes seront annoncées sur la plateforme. La version applicable et sa date restent accessibles sur cette page.</p></div>
      <p className={styles.notice}>Les informations juridiques définitives de l’exploitant et les conditions commerciales devront être validées par un professionnel du droit avant la commercialisation.</p>
    </section>
  </div></main>;
}
