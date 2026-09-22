"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import styles from "./campus.module.css";
import { ROLES } from "./roles";
import type { RoleSlug } from "./roles";
import { Avatar, Icon } from "./ui";

export default function Shell({
  role,
  activeSlug,
  children,
}: {
  role: RoleSlug;
  activeSlug: string;
  children: ReactNode;
}) {
  const cfg = ROLES[role];
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
          <div className={styles.sideFoot}>{cfg.foot.map(renderItem)}</div>
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
            <button
              type="button"
              className={styles.bell}
              aria-label={`${cfg.notifications} notifications`}
            >
              <Icon name="bell" />
              <span className={styles.bellDot}>{cfg.notifications}</span>
            </button>
            <div className={styles.userChip}>
              <Avatar name={cfg.user.name} size={38} />
              <span className={styles.userText}>
                <strong>{cfg.user.name}</strong>
                <small>{cfg.user.sub}</small>
              </span>
            </div>
          </div>
        </header>

        <main className={styles.content}>
          <span className={styles.demoNote}>
            Maquette interactive : données de démonstration, branchement sur les
            vraies données en cours
          </span>
          {children}
        </main>
      </div>
    </div>
  );
}
