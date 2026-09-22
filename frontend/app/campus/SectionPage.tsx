"use client";

import Link from "next/link";
import { useState } from "react";
import Shell from "./Shell";
import { ROLES, type RoleSlug } from "./roles";
import { Icon, Progress } from "./ui";
import { useCampusHome } from "./useCampusHome";
import styles from "./sections.module.css";

type JsonRecord = Record<string, unknown>;
type SectionRow = {
  id: string;
  title: string;
  subtitle: string;
  meta?: string;
  status?: string;
};

const SECTION_DETAILS: Partial<
  Record<RoleSlug, Record<string, { description: string; tabs: string[]; permission: string }>>
> = {
  etudiant: {
    "emploi-du-temps": { description: "Votre planning personnel, mis à jour par l’établissement.", tabs: ["Jour", "Semaine", "Calendrier"], permission: "Consultation de votre propre planning uniquement." },
    cours: { description: "Vos matières, ressources et accès e-learning associés.", tabs: ["Matières", "Ressources", "E-learning"], permission: "Seuls les contenus publiés par vos professeurs sont visibles." },
    evaluations: { description: "Évaluations à venir, passées et éventuels rattrapages.", tabs: ["À venir", "Passées", "Rattrapages"], permission: "Les notes restent masquées jusqu’à leur publication." },
    resultats: { description: "Notes, moyennes, appréciations et progression académique.", tabs: ["Notes", "Moyennes", "Appréciations", "Progression"], permission: "Vous consultez uniquement vos propres résultats publiés." },
    classe: { description: "Le contexte de votre classe, ses matières et ses annonces.", tabs: ["Vue d’ensemble", "Membres", "Annonces"], permission: "Les données privées des autres étudiants ne sont jamais affichées." },
    documents: { description: "Documents personnels et documents officiels partagés.", tabs: ["Mes documents", "Documents officiels"], permission: "Les documents restent limités à votre dossier et à votre classe." },
    messagerie: { description: "Échanges avec vos professeurs et votre responsable pédagogique.", tabs: ["Conversations", "Non lus", "Archivés"], permission: "Les destinataires proposés respectent vos affectations." },
    actualites: { description: "Annonces publiées par votre établissement.", tabs: ["Toutes", "Ma classe", "Mon établissement"], permission: "Les annonces sont filtrées selon votre audience." },
    ressources: { description: "Supports et ressources pédagogiques autorisés.", tabs: ["Récentes", "Par matière", "Téléchargées"], permission: "Les ressources privées des enseignants ne sont pas visibles." },
    aide: { description: "Aide, accompagnement et demandes de support.", tabs: ["Centre d’aide", "Mes demandes"], permission: "Vos demandes sont visibles uniquement par les équipes autorisées." },
  },
  professeur: {
    "emploi-du-temps": { description: "Séances affectées, changements et accès rapides au mode Classe.", tabs: ["Jour", "Semaine", "Calendrier"], permission: "Vous consultez les séances auxquelles vous êtes affecté." },
    preparer: { description: "Préparez objectifs, contenu, ressources et activités avant la séance.", tabs: ["Informations", "Objectifs", "Contenu", "Ressources", "Activités", "Publication"], permission: "Le brouillon reste privé ; seuls les éléments publiés deviennent visibles." },
    seances: { description: "Démarrez la séance, faites l’appel et complétez le cahier de texte.", tabs: ["À venir", "En cours", "Terminées"], permission: "Vous gérez uniquement vos classes et matières affectées." },
    travaux: { description: "Créez, publiez, corrigez et rendez les travaux de vos classes.", tabs: ["Brouillons", "Publiés", "À corriger", "Corrigés"], permission: "La publication et la correction déclenchent les notifications prévues." },
    suivi: { description: "Suivi pédagogique individuel, présence, résultats et observations.", tabs: ["Tous", "À surveiller", "Progression", "Observations"], permission: "Les informations administratives non nécessaires restent masquées." },
    ressources: { description: "Bibliothèque de supports réutilisables et partagés.", tabs: ["Mes ressources", "Classe", "Établissement", "E-learning"], permission: "La visibilité choisie s’applique à chaque ressource." },
    messagerie: { description: "Conversations avec vos classes et étudiants concernés.", tabs: ["Conversations", "Classes", "Non lus"], permission: "Seules vos affectations peuvent être contactées." },
    actualites: { description: "Annonces pédagogiques concernant vos classes.", tabs: ["Toutes", "Mes classes", "Établissement"], permission: "Les annonces respectent le périmètre de vos classes." },
    parametres: { description: "Profil, notifications, sécurité et préférences de travail.", tabs: ["Profil", "Notifications", "Sécurité"], permission: "Les paramètres institutionnels restent réservés à la direction." },
    aide: { description: "Documentation et demandes d’assistance.", tabs: ["Guides", "Mes demandes"], permission: "Vos échanges de support restent privés." },
  },
  pedagogie: {
    formations: { description: "Structure académique et formations de votre périmètre.", tabs: ["Formations", "Promotions", "Matières"], permission: "La création structurelle finale peut rester réservée à la direction." },
    "emploi-du-temps": { description: "Cohérence des plannings, conflits et modifications.", tabs: ["Planning", "Conflits", "Modifications"], permission: "Chaque modification validée est historisée et notifiée." },
    suivi: { description: "Avancement des programmes par formation, classe et matière.", tabs: ["Par formation", "Par classe", "Par matière", "Par professeur"], permission: "Les indicateurs restent traçables jusqu’aux séances sources." },
    evaluations: { description: "Supervision des évaluations, résultats et périodes.", tabs: ["Calendrier", "Notes", "Cohérence", "Périodes"], permission: "La correction reste au professeur sauf permission explicite." },
    "vie-scolaire": { description: "Présences, absences, retards, justificatifs et situations.", tabs: ["Présences", "Absences", "Retards", "Justificatifs", "Situations"], permission: "Les décisions mettent immédiatement à jour le dossier étudiant." },
    etudiants: { description: "Suivi des situations pédagogiques et d’assiduité.", tabs: ["Tous", "À surveiller", "Absences récurrentes", "Résultats"], permission: "Les critères d’alerte sont explicables et liés aux données sources." },
    enseignants: { description: "Affectations, activité et progression déclarée des enseignants.", tabs: ["Tous", "Affectations", "Progression"], permission: "Seuls les enseignants de votre périmètre sont visibles." },
    documents: { description: "Documents pédagogiques et institutionnels autorisés.", tabs: ["Récents", "Pédagogiques", "Officiels"], permission: "L’accès dépend de votre périmètre et de la visibilité du document." },
    rapports: { description: "Indicateurs consolidés de présence, progression et résultats.", tabs: ["Présence", "Progression", "Résultats", "Activité"], permission: "Chaque indicateur doit ouvrir ses données sources." },
    messagerie: { description: "Communication avec professeurs et étudiants de votre périmètre.", tabs: ["Conversations", "Groupes", "Non lus"], permission: "Les audiences sont limitées à votre responsabilité." },
    parametres: { description: "Préférences, notifications et sécurité.", tabs: ["Profil", "Notifications", "Sécurité"], permission: "La configuration globale reste réservée à la direction." },
    aide: { description: "Guides de pilotage et assistance.", tabs: ["Guides", "Mes demandes"], permission: "Vos demandes de support restent privées." },
  },
  direction: {
    etablissement: { description: "Identité, campus, années académiques, périodes et règles générales.", tabs: ["Informations", "Campus", "Années académiques", "Périodes", "Paramètres"], permission: "Les changements structurants sont réservés à la direction." },
    "emploi-du-temps": { description: "Planification générale des classes, salles et enseignants.", tabs: ["Planning", "Conflits", "Modifications"], permission: "Les changements sont historisés et notifiés aux personnes concernées." },
    inscriptions: { description: "Demandes, validations, affectations et compléments de dossier.", tabs: ["Demandes", "À valider", "Acceptées", "Refusées", "Affectations"], permission: "L’acceptation ouvre les droits et l’affectation scolaire correspondante." },
    suivi: { description: "Vue consolidée de l’activité et de la progression académique.", tabs: ["Progression", "Présence", "Classes", "Alertes"], permission: "Les indicateurs conduisent toujours aux listes sources." },
    evaluations: { description: "Périodes, évaluations, bulletins et publication des résultats.", tabs: ["Évaluations", "Périodes", "Bulletins", "Publication"], permission: "Les périodes verrouillées nécessitent une autorisation supérieure." },
    documents: { description: "Modèles, documents officiels et publications institutionnelles.", tabs: ["Modèles", "À générer", "Publiés", "Archives"], permission: "La génération et la publication sont historisées." },
    finances: { description: "Configuration financière optionnelle de l’établissement.", tabs: ["Vue d’ensemble", "Paramètres", "Historique"], permission: "Aucune donnée financière sensible n’est exposée sans configuration." },
    communication: { description: "Annonces et messages ciblés à l’échelle de l’établissement.", tabs: ["Annonces", "Messages", "Groupes"], permission: "Chaque publication conserve son auteur et son audience." },
    rapports: { description: "Rapports de présence, activité, effectifs et progression.", tabs: ["Effectifs", "Présence", "Progression", "Activité"], permission: "Les exports respectent les droits et le périmètre sélectionné." },
    parametres: { description: "Règles institutionnelles, sécurité et intégrations.", tabs: ["Général", "Rôles", "Notifications", "Sécurité", "Intégrations"], permission: "Accès réservé aux administrateurs autorisés." },
    aide: { description: "Documentation d’administration et support.", tabs: ["Guides", "Mes demandes"], permission: "Les demandes restent associées à l’établissement." },
  },
};

function asArray(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter((item): item is JsonRecord => !!item && typeof item === "object") : [];
}

function text(value: unknown, fallback = "—") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function rowsFor(role: RoleSlug, slug: string, data: JsonRecord): SectionRow[] {
  if (role === "etudiant") {
    if (["emploi-du-temps", "cours", "classe", "ressources"].includes(slug)) {
      return asArray(data.today).map((row, index) => ({ id: text(row.id, String(index)), title: text(row.title, "Cours"), subtitle: `${text(row.startsAt)}–${text(row.endsAt)} · ${text(row.room, "Classe")}`, meta: text(row.location, "Planning"), status: text(row.status, "prévu") }));
    }
    if (["evaluations", "resultats"].includes(slug)) {
      return asArray(data.pendingWork).map((row, index) => ({ id: text(row.id, String(index)), title: text(row.title, "Évaluation"), subtitle: text(row.room, "Classe"), meta: row.dueAt ? new Date(String(row.dueAt)).toLocaleDateString("fr-FR") : "Sans échéance", status: "à venir" }));
    }
    if (["messagerie", "actualites"].includes(slug)) {
      const rows = asArray(data.messages).map((row, index) => ({ id: text(row.id, String(index)), title: text(row.title, "Message"), subtitle: text(row.body, ""), meta: "Notification", status: "nouveau" }));
      const announcement = data.announcement as JsonRecord | null;
      if (announcement && typeof announcement === "object") rows.unshift({ id: "announcement", title: text(announcement.title, "Annonce"), subtitle: text(announcement.body, ""), meta: "Établissement", status: "publié" });
      return rows;
    }
  }

  if (role === "professeur") {
    if (["emploi-du-temps", "seances", "preparer"].includes(slug)) {
      const next = data.nextCourse as JsonRecord | null;
      return next ? [{ id: text(next.roomId, "next"), title: text(next.title, "Prochaine séance"), subtitle: `${text(next.startsAt)}–${text(next.endsAt)} · ${text(next.room)}`, meta: `${text(next.studentsCount, "0")} étudiants`, status: text(next.status, "prévue") }] : [];
    }
    if (["suivi", "travaux", "ressources", "actualites"].includes(slug)) {
      const watch = asArray(data.watch).map((row, index) => ({ id: text(row.id, String(index)), title: text(row.name, "Étudiant"), subtitle: text(row.reason, "Suivi pédagogique"), meta: "À examiner", status: text(row.kind, "attention") }));
      if (watch.length) return watch;
      return asArray(data.classes).map((row, index) => ({ id: text(row.roomId, String(index)), title: text(row.name, "Classe"), subtitle: text(row.subject, "Matière"), meta: `${text(row.studentsCount, "0")} étudiants`, status: `${text(row.progressPct, "0")}%` }));
    }
  }

  if (role === "pedagogie" || role === "direction") {
    if (["formations", "etablissement", "emploi-du-temps"].includes(slug)) {
      return asArray(data.formations).map((row, index) => ({ id: text(row.id, String(index)), title: text(row.name, "Formation"), subtitle: "Formation active", meta: "Structure académique", status: "active" }));
    }
    if (["suivi", "evaluations", "rapports"].includes(slug)) {
      return asArray(data.progressBySubject).map((row, index) => ({ id: String(index), title: text(row.subject, "Matière"), subtitle: "Progression du programme", meta: `${text(row.pct, "0")}% réalisé`, status: Number(row.pct ?? 0) < 50 ? "attention" : "conforme" }));
    }
    if (["etudiants", "enseignants", "vie-scolaire"].includes(slug)) {
      return asArray(data.rooms).map((row, index) => ({ id: text(row.id, String(index)), title: text(row.name, "Classe"), subtitle: `${text(row.studentsCount, "0")} étudiants`, meta: "Périmètre actif", status: "suivi" }));
    }
    if (slug === "documents") {
      return asArray(data.documents).map((row, index) => ({ id: text(row.id, String(index)), title: text(row.title, "Document"), subtitle: text(row.category, "Document"), meta: row.createdAt ? new Date(String(row.createdAt)).toLocaleDateString("fr-FR") : "", status: "disponible" }));
    }
    if (slug === "messagerie" || slug === "communication") {
      return asArray(data.messages).map((row, index) => ({ id: text(row.id, String(index)), title: text(row.title, "Message"), subtitle: text(row.body, ""), meta: "Notification", status: "nouveau" }));
    }
    if (role === "direction" && slug === "inscriptions") {
      return asArray(data.inscriptions).map((row, index) => ({ id: text(row.id, String(index)), title: text(row.name, "Utilisateur"), subtitle: text(row.role, "Rôle"), meta: row.createdAt ? new Date(String(row.createdAt)).toLocaleDateString("fr-FR") : "", status: text(row.status, "à traiter") }));
    }
  }
  return [];
}

function kpisFor(role: RoleSlug, data: JsonRecord) {
  if (role === "etudiant") return [["calendar", text(data.todayCount, "0"), "Cours aujourd’hui"], ["edit", text(data.pendingWorkCount, "0"), "Travaux à rendre"], ["clipboard", text(data.upcomingEvalCount, "0"), "Évaluations à venir"], ["chart", `${text(data.progressPct, "0")}%`, "Progression"]];
  if (role === "professeur") return [["users", text(data.totalStudents, "0"), "Étudiants"], ["calendar", text(data.todayCount, "0"), "Cours aujourd’hui"], ["clipboard", text(data.toCorrect, "0"), "À corriger"], ["alert", text(asArray(data.watch).length, "0"), "À suivre"]];
  return [["users", text(data.studentsCount, "0"), "Étudiants"], ["layers", text(data.classesCount, "0"), "Classes"], ["cap", text(data.formationsCount, "0"), "Formations"], ["chart", `${text(data.overallProgress, "0")}%`, "Progression"]];
}

export default function CampusSectionPage({ role, slug }: { role: RoleSlug; slug: string }) {
  const { loading, error, context, data, mismatch } = useCampusHome<JsonRecord>(role);
  const item = [...ROLES[role].nav, ...ROLES[role].foot].find((entry) => entry.slug === slug)!;
  const detail = SECTION_DETAILS[role]?.[slug] ?? { description: `Consultez et gérez ${item.label.toLowerCase()} dans votre périmètre.`, tabs: ["Vue d’ensemble", "Activité"], permission: "Les données affichées respectent votre rôle et vos affectations." };
  const [activeTab, setActiveTab] = useState(detail.tabs[0]);

  if (mismatch) {
    return <section className={styles.standalone}><h1>Espace non autorisé</h1><p>Votre compte correspond au rôle {ROLES[mismatch.campusRole].name}.</p><Link href={`/campus/${mismatch.campusRole}`}>Ouvrir mon espace</Link></section>;
  }

  const rows = data ? rowsFor(role, slug, data) : [];
  const kpis = data ? kpisFor(role, data) : [];

  return <Shell role={role} activeSlug={slug} displayName={context?.displayName} institutionName={context?.institutionName} note={error ? null : context ? `Connecté à ${context.institutionName}.` : "Chargement de vos données…"}>
    <header className={styles.pageHead}>
      <div><span>{ROLES[role].name}</span><h1>{item.label}</h1><p>{detail.description}</p></div>
      <Link href={`/campus/${role}`} className={styles.secondaryButton}>Retour à l’accueil</Link>
    </header>

    <nav className={styles.tabs} aria-label={`Sections de ${item.label}`}>
      {detail.tabs.map((tab) => <button type="button" className={activeTab === tab ? styles.tabActive : ""} onClick={() => setActiveTab(tab)} key={tab}>{tab}</button>)}
    </nav>

    {loading ? <section className={styles.stateCard}><span className={styles.loader} /><h2>Chargement des données</h2><p>Les informations de votre établissement sont en cours de récupération.</p></section> : error ? <section className={styles.stateCard}><Icon name="alert" /><h2>Impossible de charger cet écran</h2><p>{error}</p><button type="button" onClick={() => window.location.reload()}>Réessayer</button></section> : data ? <>
      <div className={styles.kpis}>{kpis.map(([icon, value, label]) => <article key={label}><span><Icon name={icon} /></span><div><strong>{value}</strong><small>{label}</small></div></article>)}</div>

      <section className={styles.contentCard}>
        <div className={styles.cardHead}><div><h2>{activeTab}</h2><p>Données synchronisées avec le contexte actif.</p></div><button type="button" onClick={() => window.location.reload()}>Actualiser</button></div>
        {rows.length ? <div className={styles.rows}>{rows.map((row) => <article key={row.id}><span className={styles.rowIcon}><Icon name={item.icon} /></span><div><strong>{row.title}</strong><small>{row.subtitle}</small></div><span className={styles.rowMeta}>{row.meta}</span><b>{row.status}</b></article>)}</div> : <div className={styles.empty}><span><Icon name={item.icon} /></span><h3>Aucun élément pour le moment</h3><p>Cette rubrique est opérationnelle, mais aucune donnée ne correspond encore à votre contexte ou aux filtres sélectionnés.</p></div>}
      </section>

      {slug === "resultats" && role === "etudiant" ? <section className={styles.progressCard}><div><h2>Progression globale</h2><p>Calculée à partir des leçons et activités terminées.</p></div><div><Progress value={Number(data.progressPct ?? 0)} color="green" /><strong>{text(data.progressPct, "0")}%</strong></div></section> : null}

      <aside className={styles.permission}><Icon name="shield" /><div><strong>Accès et confidentialité</strong><p>{detail.permission}</p></div></aside>
    </> : null}
  </Shell>;
}
