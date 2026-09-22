"use client";

import Link from "next/link";
import Shell from "../Shell";
import { useCampusContext } from "../useCampusHome";
import type { RoleSlug } from "../roles";
import { Icon } from "../ui";
import styles from "../etudiant/student-pages.module.css";

export default function HelpPage({ role }: { role: RoleSlug }) {
  const { context, error, mismatch } = useCampusContext(role);
  if (mismatch) return <section className={styles.standalone}>Cette page ne correspond pas à votre rôle. <Link href={`/campus/${mismatch.campusRole}`}>Ouvrir mon espace</Link></section>;
  return <Shell role={role} activeSlug="aide" displayName={context?.displayName} institutionName={context?.institutionName} note={error ?? null}>
    <header className={styles.head}><div><small>ESPACE {role.toUpperCase()}</small><h1>Aide & support</h1><p>Choisissez le parcours qui correspond à votre demande.</p></div><Link className={styles.back} href={`/campus/${role}`}>← Accueil</Link></header>
    <div className={styles.grid}><article className={styles.tile}><span className={styles.icon}><Icon name="user" /></span><h2>Mon compte</h2><p>Modifier votre profil, votre photo ou votre mot de passe.</p><Link href="/settings">Ouvrir mes paramètres →</Link></article><article className={styles.tile}><span className={styles.icon}><Icon name="help" /></span><h2>Assistance technique</h2><p>Expliquez la difficulté rencontrée avec votre compte ou votre espace.</p><a href="mailto:support@kalatty.com?subject=Aide%20Kalatty">Écrire au support →</a></article></div>
  </Shell>;
}
