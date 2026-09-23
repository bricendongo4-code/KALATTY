"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Avatar, Icon } from "../establishment/ui";
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
  const basePath = role === "apprenant" ? "/learn" : "/creator";
  const identity = useAccountIdentity("Compte Kalatty");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const search = (event: FormEvent) => { event.preventDefault(); const value = query.trim(); router.push(value ? `${pathname}?q=${encodeURIComponent(value)}` : pathname); };

  return (
    <div className={styles.app} data-role={role}>
      {open ? <button className={styles.scrim} onClick={() => setOpen(false)} aria-label="Fermer le menu" /> : null}
      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ""}`}>
        <Link href={basePath} className={styles.logoLink} aria-label="Accueil Kalatty">
          <Image src="/kalatty-logo-campus.png" alt="Kalatty" width={148} height={124} className={styles.logo} priority />
        </Link>
        <nav className={styles.nav} aria-label={config.title}>
          {config.nav.map((item) => (
            <Link
              key={item.slug || "home"}
              href={item.slug ? `${basePath}/${item.slug}` : basePath}
              className={`${styles.navItem} ${activeSlug === item.slug ? styles.navActive : ""}`}
              onClick={() => setOpen(false)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className={styles.sidebarFoot}>
          <p>{config.tagline}</p>
          <Link href="/establishment" className={styles.switchLink}>
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
          <form className={styles.search} onSubmit={search} role="search">
            <Icon name="search" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={config.search} aria-label="Recherche" />
          </form>
          <NotificationBell allHref={`${basePath}/notifications`} />
          <details className={styles.profileMenu}>
            <summary>
              <Avatar name={identity.name} src={identity.avatarUrl} size={38} />
              <span><strong>{identity.name}</strong><small>{config.userSub}</small></span>
              <Icon name="chevron" />
            </summary>
            <div className={styles.profilePopover}>
              <span>Changer d&apos;espace</span>
              <Link href="/learn">Apprenant indépendant</Link>
              <Link href="/creator">Formateur / Créateur</Link>
              <Link href="/establishment">Espace Établissement</Link>
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
