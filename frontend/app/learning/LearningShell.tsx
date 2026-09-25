"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Avatar, Icon } from "../establishment/ui";
import { logoutKalatty } from "../sessionSecurity";
import NotificationBell from "../NotificationBell";
import { useAccountIdentity } from "../useAccountIdentity";
import GlobalSearch from "../GlobalSearch";
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
  const searchItems = useMemo(() => config.nav.map((item) => ({
    label: item.label,
    href: item.slug ? `${basePath}/${item.slug}` : basePath,
    icon: item.icon,
    category: config.title,
  })), [basePath, config.nav, config.title]);

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
          <button type="button" className={styles.sidebarLogout} onClick={logoutKalatty}>
            <Icon name="logout" />
            Se déconnecter
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <button type="button" className={styles.menuButton} onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
            <Icon name="menu" />
          </button>
          <GlobalSearch className={styles.searchSlot} items={searchItems} placeholder={config.search} />
          <NotificationBell allHref={`${basePath}/notifications`} />
          <button type="button" className={styles.mobileLogout} onClick={logoutKalatty} aria-label="Se déconnecter" title="Se déconnecter">
            <Icon name="logout" />
          </button>
          <details className={styles.profileMenu}>
            <summary>
              <Avatar name={identity.name} src={identity.avatarUrl} size={38} />
              <span className={styles.profileIdentity}><strong>{identity.name}</strong><small>{config.userSub}</small></span>
              <Icon name="chevron" />
            </summary>
            <div className={styles.profilePopover}>
              <span>Mon compte</span>
              <strong className={styles.currentSpace}>{config.name}</strong>
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
