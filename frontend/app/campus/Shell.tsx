"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import styles from "./campus.module.css";
import { ROLES } from "./roles";
import type { RoleSlug } from "./roles";
import { Avatar, Icon } from "./ui";
import { logoutKalatty } from "../sessionSecurity";
import NotificationBell from "../NotificationBell";
import { useAccountIdentity } from "../useAccountIdentity";

export default function Shell({
  role,
  activeSlug,
  children,
  displayName,
  institutionName,
  note,
}: {
  role: RoleSlug;
  activeSlug: string;
  children: ReactNode;
  /** Nom reel de l'utilisateur connecte (sinon repli sur le nom de demo). */
  displayName?: string;
  institutionName?: string;
  /** Bandeau sous la barre du haut ; null le masque. */
  note?: string | null;
}) {
  const cfg = ROLES[role];
  const user = displayName
    ? { name: displayName, sub: institutionName ?? cfg.user.sub }
    : cfg.user;
  const identity = useAccountIdentity(user.name);
  const noteText =
    note === undefined ? "Connecte a vos donnees Kalatty en temps reel." : note;
  const [open, setOpen] = useState(false);
  const href = (slug: string) =>
    slug ? `/campus/${role}/${slug}` : `/campus/${role}`;

  const renderItem = (item: { slug: string; label: string; icon: string }) => (
    <Link
      key={item.slug || "home"}
      href={href(item.slug)}
      className={`${styles.navItem} ${item.slug === activeSlug ? styles.navItemActive : ""}`}
      aria-current={item.slug === activeSlug ? "page" : undefined}
      onClick={() => setOpen(false)}
    >
      <Icon name={item.icon} className={styles.navIcon} />
      {item.label}
    </Link>
  );

  return (
    <div className={styles.app} data-role={role}>
      {open ? (
        <div
          className={styles.scrim}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={`${styles.side} ${open ? styles.sideOpen : ""}`}
        aria-label="Navigation principale"
      >
        <Link
          href="/campus"
          className={styles.brand}
          aria-label="Kalatty : choix du rôle"
        >
          <Image
            src="/kalatty-logo-campus.png"
            alt="Kalatty"
            width={150}
            height={128}
            className={styles.brandLogo}
            priority
          />
        </Link>

        <div className={styles.navPanel}>
          <nav className={styles.nav}>{cfg.nav.map(renderItem)}</nav>
          <div className={styles.sideFoot}>
            {cfg.foot.map(renderItem)}
          </div>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.top}>
          <button
            type="button"
            className={styles.burger}
            onClick={() => setOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Icon name="menu" />
          </button>
          <span className={styles.topTitleWrap}>
            <span className={styles.topTitle}>{cfg.topTitle}</span>
            <span className={styles.topSub}>{cfg.brandSub}</span>
          </span>
          <label className={styles.search}>
            <Icon name="search" className={styles.searchIcon} />
            <input
              type="search"
              placeholder={cfg.searchPlaceholder}
              aria-label="Recherche"
            />
          </label>
          <div className={styles.topRight}>
            <NotificationBell allHref={`/campus/${role}/${role === "direction" ? "communication" : role === "pedagogie" ? "messagerie" : "actualites"}`} />
            <details className={styles.contextMenu}>
              <summary className={styles.userChip}>
                <Avatar name={identity.name} src={identity.avatarUrl} size={38} />
                <span className={styles.userText}>
                  <strong>{identity.name}</strong>
                  <small>{user.sub}</small>
                </span>
                <Icon name="chevron" className={styles.contextChevron} />
              </summary>
              <div className={styles.contextPopover}>
                <span>Changer d&apos;espace</span>
                <Link href="/campus">Espace Établissement</Link>
                <Link href="/learning/apprenant">Apprenant indépendant</Link>
                <Link href="/learning/formateur">Formateur / Créateur</Link>
                <Link href="/settings">Profil &amp; sécurité</Link>
                <button type="button" className={styles.logoutButton} onClick={logoutKalatty}>
                  <Icon name="logout" />
                  Se déconnecter
                </button>
              </div>
            </details>
          </div>
        </header>

        <main className={styles.content}>
          {noteText ? (
            <span className={styles.demoNote}>{noteText}</span>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
