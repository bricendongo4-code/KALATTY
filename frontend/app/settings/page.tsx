"use client";

import Image from "next/image";
import Link from "next/link";
import AccountSettings from "../AccountSettings";
import styles from "./settings.module.css";

export default function SettingsPage() {
  return <main className={styles.page}><header className={styles.top}><Link href="/dashboard" aria-label="Retour à mon espace"><Image src="/kalatty-logo-campus.png" alt="Kalatty" width={130} height={100} priority /></Link><div><h1>Profil &amp; sécurité</h1><p>Gérez votre identité, votre photo et votre mot de passe pour tous vos espaces Kalatty.</p></div><Link href="/dashboard" className={styles.back}>Retour à mon espace</Link></header><AccountSettings /></main>;
}
