"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import { Avatar, Icon } from "../campus/ui";
import { logoutKalatty } from "../sessionSecurity";
import NotificationBell from "../NotificationBell";
import { useAccountIdentity } from "../useAccountIdentity";
import { LEARNING_ROLES, type LearningRole } from "./config";
import styles from "./learning.module.css";

export default function LearningShell({
  role,
  activeSlug,
  children,
}: {
  role: LearningRole;
  activeSlug: string;
  children: ReactNode;
}) {
  const config = LEARNING_ROLES[role];
  const identity = useAccountIdentity(config.user);
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.app} data-role={role}>
      {open ? <button className={styles.scrim} onClick={() => setOpen(false)} aria-label="Fermer le menu" /> : null}
      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ""}`}>
        <Link href="/learning" className={styles.logoLink} aria-label="Changer d'espace Kalatty">
          <Image src="/kalatty-logo-campus.png" alt="Kalatty" width={148} height={124} className={styles.logo} priority />
        </Link>
        <nav className={styles.nav} aria-label={config.title}>
          {config.nav.map((item) => (
            <Link
              key={item.slug || "home"}
              href={item.slug ? `/learning/${role}/${item.slug}` : `/learning/${role}`}
              className={`${styles.navItem} ${activeSlug === item.slug ? styles.navActive : ""}`}
              onClick={() => setOpen(false)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.slug === "messages" ? <b>3</b> : null}
            </Link>
          ))}
        </nav>
        <div className={styles.sidebarFoot}>
          <p>{config.tagline}</p>
          <Link href="/campus" className={styles.switchLink}>
            <Icon name="layers" />
            Espace Établissement
          </Link>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <button type="button" className={styles.menuButton} onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
            <Icon name="menu" />
          </button>
          <label className={styles.search}>
            <Icon name="search" />
            <input type="search" placeholder={config.search} aria-label="Recherche" />
          </label>
          <NotificationBell allHref={role === "apprenant" ? "/learning/apprenant/notifications" : "/learning/formateur/messages"} />
          <details className={styles.profileMenu}>
            <summary>
              <Avatar name={identity.name} src={identity.avatarUrl} size={38} />
              <span><strong>{identity.name}</strong><small>{config.userSub}</small></span>
              <Icon name="chevron" />
            </summary>
            <div className={styles.profilePopover}>
              <span>Changer d&apos;espace</span>
              <Link href="/learning/apprenant">Apprenant indépendant</Link>
              <Link href="/learning/formateur">Formateur / Créateur</Link>
              <Link href="/campus">Espace Établissement</Link>
              <Link href="/settings">Profil &amp; sécurité</Link>
              <button type="button" className={styles.logoutButton} onClick={logoutKalatty}>
                <Icon name="logout" />
                Se déconnecter
              </button>
            </div>
          </details>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
