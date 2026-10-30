"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import styles from "./control-center.module.css";

type Department = {
  department: string;
  status: "reported" | "error";
  findings: number;
  queue: number;
  source: string;
  dataMode: "synthetic" | "unverified";
  reviewRequired: boolean;
  externalActionsPerformed: boolean;
};
type Report = {
  version: number;
  generatedAt: string;
  dataMode: "synthetic" | "unverified";
  summary: { total: number; reported: number; errors: number; reviewRequired: number };
  departments: Department[];
  errors: { department: string; code: string; message: string }[];
  mergeAuthorized: false;
  deployAuthorized: false;
  liveMonitoringEnabled: false;
};

const labels: Record<string, string> = {
  security: "Sécurité", qa: "Qualité", ux: "UX / UI", product: "Produit",
  marketing: "Marketing", sales: "Commercial", support: "Support",
  finance: "Finance", analytics: "Analytics", crm: "CRM", developer: "Développeur",
};
const permitted = new Set(Object.keys(labels));
const MAX_SIZE = 1024 * 1024;
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

function validate(value: unknown): Report {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Le rapport doit être un objet JSON.");
  const report = value as Record<string, unknown>;
  if (report.version !== 2 || !Array.isArray(report.departments) || !Array.isArray(report.errors)) {
    throw Error("Format non reconnu : rapport Control Center v2 attendu.");
  }
  if (report.dataMode !== "synthetic" && report.dataMode !== "unverified") throw Error("Mode de données invalide.");
  if (typeof report.generatedAt !== "string" || Number.isNaN(Date.parse(report.generatedAt))) throw Error("Date du rapport invalide.");
  if (report.mergeAuthorized !== false || report.deployAuthorized !== false || report.liveMonitoringEnabled !== false) {
    throw Error("Ce tableau de bord accepte uniquement les rapports sans autorisation d'exécution.");
  }
  const departments = report.departments as unknown[];
  if (departments.length > permitted.size) throw Error("Trop de départements.");
  const seen = new Set<string>();
  for (const item of departments) {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw Error("Département invalide.");
    const d = item as Record<string, unknown>;
    if (typeof d.department !== "string" || !permitted.has(d.department) || seen.has(d.department)) throw Error("Département inconnu ou dupliqué.");
    seen.add(d.department);
    if (d.status !== "reported" && d.status !== "error") throw Error("Statut invalide.");
    if (!Number.isSafeInteger(d.findings) || (d.findings as number) < 0 || !Number.isSafeInteger(d.queue) || (d.queue as number) < 0) throw Error("Compteurs invalides.");
    if (typeof d.reviewRequired !== "boolean" || typeof d.externalActionsPerformed !== "boolean") throw Error("Indicateurs invalides.");
    if (d.dataMode !== report.dataMode || typeof d.source !== "string") throw Error("Source du rapport invalide.");
  }
  const errors = report.errors as unknown[];
  for (const item of errors) {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw Error("Erreur de rapport invalide.");
    const e = item as Record<string, unknown>;
    if (typeof e.department !== "string" || !seen.has(e.department) || typeof e.code !== "string" || typeof e.message !== "string") throw Error("Entrée d'erreur invalide.");
  }
  const expected = {
    total: departments.length,
    reported: departments.filter(item => (item as Department).status === "reported").length,
    errors: errors.length,
    reviewRequired: departments.filter(item => (item as Department).reviewRequired).length,
  };
  if (!report.summary || typeof report.summary !== "object") throw Error("Résumé manquant.");
  const summary = report.summary as Record<string, unknown>;
  if (Object.entries(expected).some(([key, count]) => summary[key] !== count)) throw Error("Les totaux ne correspondent pas aux rapports.");
  return report as Report;
}

export default function ControlCenterPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [sourceMode, setSourceMode] = useState<'local' | 'server'>('local');
  useEffect(() => {
    let active = true;
    async function loadHistory() {
      const token = localStorage.getItem('kalatty_token');
      if (!token) return;
      try {
        const response = await fetch(API_BASE + '/ai-control-center/reports', {
          headers: { Authorization: 'Bearer ' + token }, cache: 'no-store',
        });
        if (response.status === 401 || response.status === 403) return;
        if (!response.ok) throw Error('Historique indisponible');
        const body: unknown = await response.json();
        if (!body || typeof body !== 'object' || !('reports' in body)) throw Error('Format serveur invalide');
        const rows = (body as { reports: unknown }).reports;
        if (!Array.isArray(rows) || !rows.length) return;
        const stored = rows[0]?.report as Record<string, unknown> | undefined;
        if (!stored || !Array.isArray(stored.departments)) throw Error('Rapport serveur invalide');
        const normalized = { ...stored, departments: stored.departments.map((d: Record<string, unknown>) =>
          ({ ...d, source: 'Stockage privé', externalActionsPerformed: false })) };
        const valid = validate(normalized);
        if (active) { setReport(valid); setSourceMode('server'); }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Erreur de chargement');
      }
    }
    void loadHistory();
    return () => { active = false; };
  }, []);

  const visible = useMemo(() => report?.departments.filter(item =>
    filter === "all" || (filter === "review" ? item.reviewRequired : item.status === filter)
  ) ?? [], [report, filter]);

  async function load(event: ChangeEvent<HTMLInputElement>) {
    setError("");
    setReport(null);
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > MAX_SIZE) throw Error("Fichier trop volumineux (1 Mo maximum).");
      const parsed: unknown = JSON.parse(await file.text());
      setReport(validate(parsed));
      setSourceMode("local");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de lire le fichier.");
    } finally {
      event.target.value = "";
    }
  }

  return <main className={styles.page}>
    <div className={styles.wrap}>
      <Link href="/" className={styles.back}>← Retour à Kalatty</Link>
      <div className={styles.heading}>
        <div><p className={styles.eyebrow}>KALATTY · AI OPERATIONS</p><h1>Control Center</h1>
          <p>Supervision des rapports d'agents, anomalies et validations humaines.</p></div>
        <span className={styles.badge}>v4 · historique sécurisé</span>
      </div>
      <div className={styles.notice}><strong>Accès protégé aux rapports enregistrés.</strong> Importez un fichier
        <code> control-center.json </code> généré par le script de supervision. Le fichier est traité uniquement dans votre navigateur :
        aucune donnée n'est envoyée à Kalatty. Aucun agent ne peut être exécuté, fusionné ou déployé depuis cette page.
        Ne chargez pas de données confidentielles sur un poste partagé.</div>
      <section className={styles.upload}>
        <label htmlFor="report">Importer un rapport JSON (1 Mo max.)</label>
        <input id="report" type="file" accept=".json,application/json" onChange={load} />
        {error && <p role="alert" className={styles.error}>{error}</p>}
      </section>
      {!report ? <section className={styles.empty}>Aucun rapport chargé. Le tableau de bord ne présente pas de données fictives comme des résultats réels.</section> : <>
        <p className={styles.meta}>Rapport du {new Date(report.generatedAt).toLocaleString("fr-FR")} ·
          <strong> {report.dataMode === "synthetic" ? "Données synthétiques" : "Origine non vérifiée"}</strong> · {sourceMode === "server" ? "Historique sécurisé" : "Fichier local"} · Supervision en direct désactivée</p>
        <div className={styles.cards}>
          {([["Agents", report.summary.total], ["Rapports disponibles", report.summary.reported],
            ["Erreurs", report.summary.errors], ["À examiner", report.summary.reviewRequired]] as const)
            .map(([label, count]) => <div className={styles.card} key={label}><span>{label}</span><strong>{count}</strong></div>)}
        </div>
        <section className={styles.panel}>
          <div className={styles.panelHead}><h2>Départements</h2>
            <label>Filtrer <select value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">Tous</option><option value="reported">Rapport disponible</option>
              <option value="error">En erreur</option><option value="review">Validation nécessaire</option>
            </select></label></div>
          <div className={styles.tableWrap}><table><thead><tr><th>Agent</th><th>État</th><th>Constats</th><th>File</th><th>Revue</th><th>Source</th></tr></thead>
            <tbody>{visible.map(item => <tr key={item.department}>
              <td><strong>{labels[item.department]}</strong></td><td>{item.status === "reported" ? "Rapport reçu" : "Erreur"}</td>
              <td>{item.findings}</td><td>{item.queue}</td><td>{item.reviewRequired ? "Requise" : "Non signalée"}</td>
              <td title={item.source}>{sourceMode === "server" ? "Historique sécurisé" : "Fichier local"}</td>
            </tr>)}</tbody></table>{visible.length === 0 && <p>Aucun résultat pour ce filtre.</p>}</div>
        </section>
        <section className={styles.panel}><h2>Anomalies signalées</h2>
          {report.errors.length === 0 ? <p>Aucune erreur signalée par ce rapport.</p> :
            <ul>{report.errors.map((item, index) => <li key={index}><strong>{labels[item.department]} · {item.code}</strong> — {item.message}</li>)}</ul>}
        </section>
      </>}
    </div>
  </main>;
}
