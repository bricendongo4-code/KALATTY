"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import Shell from "../Shell";
import { campusFetch, useCampusContext } from "../useEstablishment";
import styles from "../student/student-pages.module.css";

type Institution = { name: string; contact_email: string | null; description: string | null; institution_type: string | null };
export default function InstitutionPage() {
  const { context, loading, error: contextError, mismatch } = useCampusContext("admin");
  const [form, setForm] = useState<Institution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!context) return;
    campusFetch(`/institutions/${context.institutionId}`).then((result) => {
      const institution = result.institution ?? result;
      setForm({ name: institution.name ?? "", contact_email: institution.contact_email ?? "", description: institution.description ?? "", institution_type: institution.institution_type ?? "" });
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "Impossible de charger l’établissement."));
  }, [context]);
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (!context || !form) return;
    setSaving(true); setError(null); setNotice(null);
    try {
      await campusFetch(`/institutions/${context.institutionId}`, { method: "PATCH", body: JSON.stringify(form) });
      setNotice("Informations enregistrées.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Enregistrement impossible."); }
    finally { setSaving(false); }
  };
  if (mismatch) return <section className={styles.standalone}>Cette page ne correspond pas à votre rôle. <Link href={`/establishment/${mismatch.campusRole}`}>Ouvrir mon espace</Link></section>;
  return <Shell role="admin" activeSlug="organization" displayName={context?.displayName} institutionName={context?.institutionName} note={contextError ?? null}>
    <header className={styles.head}><div><small>DIRECTION</small><h1>Mon établissement</h1><p>Informations publiques et coordonnées de l’établissement.</p></div><Link href="/establishment/admin" className={styles.back}>← Accueil</Link></header>
    {loading || !form && !error ? <section className={styles.state}>Chargement…</section> : form ? <form className={styles.tile} onSubmit={(event) => void save(event)}><label>Nom<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Email de contact<input type="email" value={form.contact_email ?? ""} onChange={(event) => setForm({ ...form, contact_email: event.target.value })} /></label><label>Type d’établissement<input value={form.institution_type ?? ""} onChange={(event) => setForm({ ...form, institution_type: event.target.value })} /></label><label>Description<textarea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><button disabled={saving} type="submit">{saving ? "Enregistrement…" : "Enregistrer"}</button>{notice ? <p role="status">{notice}</p> : null}</form> : null}
    {error ? <section className={styles.state} role="alert">{error}</section> : null}
  </Shell>;
}
