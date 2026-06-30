"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import styles from "./dashboard.module.css";

export type MobileMenuItem = {
  id: string;
  label: string;
  icon: "home" | "book" | "folder" | "grid" | "user" | "card" | "settings";
};

type Props = {
  displayName: string;
  workspaceTitle: string;
  activeItem: string;
  items: MobileMenuItem[];
  onSelect: (id: string) => void;
  onLogout: () => void;
};

const iconPaths = {
  home: "M3 11.5 12 4l9 7.5V21h-6v-6H9v6H3v-9.5Z",
  book: "M4 5.5A3.5 3.5 0 0 1 7.5 2H12v18H7.5A3.5 3.5 0 0 0 4 23V5.5Zm16 0A3.5 3.5 0 0 0 16.5 2H12v18h4.5A3.5 3.5 0 0 1 20 23V5.5Z",
  folder: "M3 6h7l2 2h9v11H3V6Z",
  grid: "M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0",
  card: "M3 6h18v13H3V6Zm0 4h18M7 15h4",
  settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-12v2m0 13v2m8.5-8.5h-2m-13 0h-2m14.5-6-1.5 1.5m-9 9L6 18m12 0-1.5-1.5m-9-9L6 6",
};

function MenuIcon({ name }: { name: MobileMenuItem["icon"] }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.mobileMenuIcon}>
      <path d={iconPaths[name]} />
    </svg>
  );
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "K";

export default function MobileDashboardMenu({
  displayName,
  workspaceTitle,
  activeItem,
  items,
  onSelect,
  onLogout,
}: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const triggerElement = triggerRef.current;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      triggerElement?.focus();
    };
  }, [open]);

  const selectItem = (id: string) => {
    onSelect(id);
    setOpen(false);
  };

  return (
    <div className={styles.mobileMenuRoot}>
      <button
        type="button"
        ref={triggerRef}
        className={styles.mobileMenuTrigger}
        aria-label="Ouvrir le menu de navigation"
        aria-expanded={open}
        aria-controls="kalatty-mobile-menu"
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true" className={styles.mobileMenuBars} />
        <span>Menu</span>
      </button>

      {open ? (
        <div className={styles.mobileMenuLayer}>
          <button
            type="button"
            className={styles.mobileMenuBackdrop}
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
          />
          <aside
            id="kalatty-mobile-menu"
            className={styles.mobileMenuDrawer}
            aria-label="Navigation du tableau de bord"
            aria-modal="true"
            role="dialog"
          >
            <div className={styles.mobileMenuBrand}>
              <Image
                src="/kalatty-logo.png"
                alt="Logo Kalatty"
                width={52}
                height={52}
              />
              <strong>Kalatty</strong>
              <button
                type="button"
                ref={closeRef}
                className={styles.mobileMenuClose}
                aria-label="Fermer le menu"
                onClick={() => setOpen(false)}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <div className={styles.mobileMenuProfile}>
              <span className={styles.mobileMenuAvatar}>{getInitials(displayName)}</span>
              <div>
                <strong>{displayName}</strong>
                <small>{workspaceTitle}</small>
              </div>
            </div>

            <nav className={styles.mobileMenuNavigation} aria-label="Sections">
              <span className={styles.mobileMenuSectionLabel}>Navigation</span>
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={
                    activeItem === item.id
                      ? styles.mobileMenuItemActive
                      : styles.mobileMenuItem
                  }
                  aria-current={activeItem === item.id ? "page" : undefined}
                  onClick={() => selectItem(item.id)}
                >
                  <MenuIcon name={item.icon} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            <div className={styles.mobileMenuFooter}>
              <button type="button" onClick={onLogout}>
                Se deconnecter
              </button>
              <small>Kalatty, apprendre et piloter autrement.</small>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
