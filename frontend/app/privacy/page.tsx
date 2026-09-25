import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "../legal.module.css";

export const metadata: Metadata = { title: "Confidentialité | Kalatty", description: "Politique de confidentialité de la plateforme Kalatty." };

export default function PrivacyPage() {
  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.header}><Link href="/" className={styles.brand}><Image src="/kalatty-logo.png" alt="Kalatty" width={58} height={58} /><span>Kalatty</span></Link><Link href="/data-rights" className={styles.back}>Mes données</Link></header>
    <section className={styles.hero}><span className={styles.eyebrow}>Confiance et transparence</span><h1>Politique de confidentialité</h1><p>Cette politique explique quelles données Kalatty traite, pourquoi elles sont nécessaires et comment exercer vos droits.</p><small className={styles.updated}>Dernière mise à jour : 25 septembre 2026</small></section>
    <section className={styles.section}>
      <div><h2>Responsable du traitement</h2><p>Kalatty exploite la plateforme e-learning accessible sur kalatty-frontend.vercel.app. Les demandes relatives aux données peuvent être déposées depuis la page « Mes données » ou adressées à support@kalatty.com.</p></div>
      <div><h2>Données traitées</h2><ul><li>Identité, adresse électronique, rôle, photo de profil et informations de compte.</li><li>Inscriptions, classes, devoirs, notes, présences, progression et certificats.</li><li>Contenus déposés : vidéos, documents, réponses, commentaires et messages pédagogiques.</li><li>Données techniques nécessaires à la sécurité, au diagnostic et au fonctionnement du service.</li><li>Informations de paiement limitées aux références, montants et statuts ; Kalatty ne conserve pas les secrets de paiement du prestataire.</li></ul></div>
      <div><h2>Finalités et bases</h2><p>Les traitements servent à fournir le service demandé, sécuriser les comptes, organiser la relation pédagogique, respecter les obligations légales et améliorer la plateforme. Les communications facultatives reposent sur le consentement lorsqu’il est requis.</p></div>
      <div><h2>Destinataires et hébergement</h2><p>Les données sont accessibles selon les rôles : apprenant, formateur et personnel autorisé de l’établissement. Kalatty s’appuie notamment sur Supabase pour les données et fichiers, Railway pour l’API et Vercel pour l’interface. Les accès sont limités aux besoins techniques et contractuels.</p></div>
      <div><h2>Conservation et sécurité</h2><p>Les données sont conservées pendant la durée du compte et selon les besoins pédagogiques, contractuels ou légaux. Les médias privés sont fournis au moyen de liens temporaires. Les mots de passe sont gérés par le système d’authentification et ne sont pas affichés en clair.</p></div>
      <div><h2>Vos droits</h2><p>Vous pouvez demander l’accès, l’export, la rectification ou la suppression de vos données, sous réserve des obligations de conservation applicables. Kalatty s’inscrit dans le cadre de la loi camerounaise n° 2024/017 du 23 décembre 2024 relative à la protection des données à caractère personnel.</p><div className={styles.actions}><Link className={styles.primary} href="/data-rights">Exercer mes droits</Link><Link className={styles.secondary} href="/contact">Contacter Kalatty</Link></div></div>
      <p className={styles.notice}>Cette politique devra être complétée avec l’identité juridique définitive, l’adresse du siège et le contact officiel du responsable de la protection des données avant l’ouverture commerciale.</p>
    </section>
  </div></main>;
}
