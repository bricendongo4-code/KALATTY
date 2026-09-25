"use client";

import { FormEvent, KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "./establishment/ui";
import styles from "./global-search.module.css";

export type GlobalSearchItem = {
  label: string;
  href: string;
  icon?: string;
  category?: string;
  keywords?: string;
};

const ICON_KEYWORDS: Record<string, string> = {
  users: "utilisateur étudiant élève apprenant professeur enseignant classe groupe",
  user: "profil compte utilisateur professeur formateur",
  userPlus: "inscription admission nouvel étudiant créer compte",
  book: "cours formation matière module leçon programme",
  cap: "formation filière cursus diplôme programme",
  folder: "document fichier pdf ressource vidéo médiathèque",
  file: "document fichier pdf justificatif",
  clipboard: "devoir travail exercice évaluation correction copie",
  award: "note résultat bulletin certificat évaluation",
  calendar: "emploi du temps calendrier planning séance semaine",
  checkCircle: "présence absence retard appel séance",
  shield: "vie scolaire présence absence blocage discipline",
  chart: "statistique progression performance suivi résultat",
  euro: "paiement facture revenu prix abonnement",
  video: "studio vidéo tournage leçon",
  megaphone: "annonce actualité communication message",
  bell: "notification alerte message",
  building: "établissement école campus organisation",
  layers: "classe promotion salle structure académique",
  sliders: "paramètre réglage configuration sécurité",
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .trim();
}

export default function GlobalSearch({
  items,
  placeholder,
  className,
}: {
  items: GlobalSearchItem[];
  placeholder: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [contextItems, setContextItems] = useState<GlobalSearchItem[]>([]);

  useEffect(() => {
    const collect = () => {
      const discovered = Array.from(document.querySelectorAll<HTMLElement>("main a[href]"))
        .map((anchor) => ({
          label: anchor.innerText.replace(/\s+/g, " ").trim(),
          href: anchor.getAttribute("href") ?? "",
          category: "Dans cette page",
          icon: "search",
        }))
        .filter((item) => item.label.length >= 3 && item.href.startsWith("/"));
      const unique = Array.from(new Map(discovered.map((item) => [`${item.href}|${item.label}`, item])).values());
      setContextItems(unique.slice(0, 80));
    };
    collect();
    const main = document.querySelector("main");
    if (!main) return;
    let timer = 0;
    const observer = new MutationObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(collect, 150);
    });
    observer.observe(main, { childList: true, subtree: true, characterData: true });
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [pathname]);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const shortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        desktopInputRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", shortcut);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", shortcut);
    };
  }, []);

  const mergedItems = useMemo(() => {
    const map = new Map<string, GlobalSearchItem>();
    [...items, ...contextItems].forEach((item) => {
      if (!map.has(item.href)) map.set(item.href, item);
    });
    return Array.from(map.values());
  }, [contextItems, items]);

  const results = useMemo(() => {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    if (!terms.length) return mergedItems.slice(0, 7);
    return mergedItems
      .map((item) => {
        const haystack = normalize(`${item.label} ${item.category ?? ""} ${item.keywords ?? ""} ${ICON_KEYWORDS[item.icon ?? ""] ?? ""}`);
        const score = terms.reduce((total, term) => total + (haystack.startsWith(term) ? 4 : haystack.includes(term) ? 1 : -20), 0);
        return { item, score };
      })
      .filter(({ score }) => score >= terms.length)
      .sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label, "fr"))
      .slice(0, 8)
      .map(({ item }) => item);
  }, [mergedItems, query]);

  const choose = (item: GlobalSearchItem) => {
    setOpen(false);
    setMobileOpen(false);
    setQuery("");
    router.push(item.href);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const item = results[activeIndex] ?? results[0];
    if (item) choose(item);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, Math.max(0, results.length - 1)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Escape") {
      setOpen(false);
      setMobileOpen(false);
    }
  };

  const resultList = (mobile = false) => (
    <div className={mobile ? styles.mobileResults : styles.results} id={mobile ? `${listId}-mobile` : listId} role="listbox" aria-label="Résultats de recherche">
      <div className={styles.resultHead}>{query.trim() ? `${results.length} résultat${results.length > 1 ? "s" : ""}` : "Accès rapides"}<span>Entrée pour ouvrir</span></div>
      {results.length ? results.map((item, index) => (
        <button
          type="button"
          role="option"
          aria-selected={index === activeIndex}
          className={index === activeIndex ? styles.activeResult : undefined}
          key={`${item.href}-${item.label}`}
          onMouseEnter={() => setActiveIndex(index)}
          onClick={() => choose(item)}
        >
          <span className={styles.resultIcon}><Icon name={item.icon ?? "search"} /></span>
          <span><strong>{item.label}</strong><small>{item.category ?? "Navigation"}</small></span>
          <Icon name="chevron" />
        </button>
      )) : <div className={styles.empty}><Icon name="search" /><strong>Aucun résultat</strong><span>Essayez un autre mot ou utilisez le menu principal.</span></div>}
    </div>
  );

  return (
    <div ref={rootRef} className={`${styles.root} ${className ?? ""}`}>
      <form className={styles.desktopForm} role="search" onSubmit={submit}>
        <Icon name="search" />
        <input
          ref={desktopInputRef}
          type="search"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); setOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Recherche globale"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          autoComplete="off"
        />
        <kbd>Ctrl K</kbd>
      </form>
      {open ? resultList() : null}
      <button type="button" className={styles.mobileTrigger} onClick={() => { setMobileOpen(true); window.setTimeout(() => mobileInputRef.current?.focus(), 0); }} aria-label="Ouvrir la recherche">
        <Icon name="search" />
      </button>
      {mobileOpen ? <div className={styles.mobileOverlay} role="dialog" aria-modal="true" aria-label="Recherche globale">
        <form className={styles.mobileForm} role="search" onSubmit={submit}>
          <Icon name="search" />
          <input ref={mobileInputRef} type="search" value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }} onKeyDown={handleKeyDown} placeholder={placeholder} aria-label="Recherche globale" autoComplete="off" />
          <button type="button" onClick={() => setMobileOpen(false)} aria-label="Fermer la recherche"><Icon name="x" /></button>
        </form>
        {resultList(true)}
      </div> : null}
    </div>
  );
}
