"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Shell from "../Shell";
import { campusFetch, useCampusContext } from "../useCampusHome";
import type { RoleSlug } from "../roles";
import { Icon } from "../ui";
import styles from "../etudiant/student-pages.module.css";

type Document = { id: string; title: string; category: string; createdAt: string; url: string | null };
export default function DocumentsPage({ role }: { role: Extract<RoleSlug, "direction" | "pedagogie"> }) {
  const { context, loading: contextLoading, error: contextError, mismatch } = useCampusContext(role);
  const [documents, setDocuments] = useState<Document[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("general");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await campusFetch("/campus/documents");
      setDocuments(result.documents ?? []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Documents indisponibles."); }
  }, []);
  useEffect(() => { if (context) void load(); }, [context, load]);
  const upload = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) return;
    setSending(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("title", title);
      form.append("category", category);
      const token = localStorage.getItem("kalatty_token");
      const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
      const response = await fetch(`${base}/campus/documents`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message ?? "Envoi impossible.");
      setTitle(""); setFile(null);
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Envoi impossible."); }
    finally { setSending(false); }
  };
  if (mismatch) return <section className={styles.standalone}>Cette page ne correspond pas à votre rôle. <Link href={`/campus/${mismatch.campusRole}`}>Ouvrir mon espace</Link></section>;
  return <Shell role={role} activeSlug="documents" displayName={context?.displayName} institutionName={context?.institutionName} note={contextError ?? null}>
    <header className={styles.head}><div><small>ESPACE {role.toUpperCase()}</small><h1>Documents de l’établissement</h1><p>Documents déposés par la direction et consultables par le personnel autorisé.</p></div><Link href={`/campus/${role}`} className={styles.back}>← Accueil</Link></header>
    {role === "direction" ? <form className={styles.tile} onSubmit={(event) => void upload(event)}><h2>Déposer un document</h2><input required maxLength={160} placeholder="Titre du document" value={title} onChange={(event) => setTitle(event.target.value)} /><input maxLength={80} placeholder="Catégorie" value={category} onChange={(event) => setCategory(event.target.value)} /><input required type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><button disabled={sending} type="submit">{sending ? "Envoi…" : "Déposer"}</button></form> : null}
    {error ? <section className={styles.state} role="alert">{error}</section> : contextLoading || !documents ? <section className={styles.state}>Chargement des documents…</section> : documents.length ? <div className={styles.stack}>{documents.map((doc) => <article className={styles.tile} key={doc.id}><small>{doc.category} · {new Date(doc.createdAt).toLocaleDateString("fr-FR")}</small><h2>{doc.title}</h2>{doc.url ? <a href={doc.url} target="_blank" rel="noopener noreferrer">Ouvrir le document →</a> : <p>Fichier temporairement indisponible.</p>}</article>)}</div> : <section className={styles.state}><Icon name="file" /><h2>Aucun document publié</h2></section>}
  </Shell>;
}
