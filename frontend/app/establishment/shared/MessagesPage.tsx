"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import Shell from "../Shell";
import { campusFetch, campusUpload, useCampusContext } from "../useEstablishment";
import type { RoleSlug } from "../roles";
import styles from "../student/student-pages.module.css";

type Thread = { id: string; institution_id: string; created_at: string; recipients?: { id: string; name: string }[]; lastReadAt?: string | null };
type Message = { id: string; sender_id: string; body: string; created_at: string; attachment_name?: string | null };
type Member = { id: string; name: string; role: string };

export default function MessagesPage({ role }: { role: RoleSlug }) {
  const { context, loading: contextLoading, error: contextError, mismatch } = useCampusContext(role);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [recipient, setRecipient] = useState("");
  const [directory, setDirectory] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshThreads = useCallback(async () => {
    if (!context) return;
    try {
      const data = await campusFetch(`/messaging/institutions/${encodeURIComponent(context.institutionId)}/threads`);
      setThreads(data.threads ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Conversations indisponibles."); }
  }, [context]);

  const refreshMessages = useCallback(async () => {
    if (!active) return;
    try {
      const data = await campusFetch(`/messaging/threads/${encodeURIComponent(active)}/messages`);
      setMessages(data.messages ?? []);
      await campusFetch(`/messaging/threads/${encodeURIComponent(active)}/read`, { method: "PATCH" });
    } catch (e) { setError(e instanceof Error ? e.message : "Messages indisponibles."); }
  }, [active]);

  useEffect(() => { void refreshThreads(); }, [refreshThreads]);
  useEffect(() => {
    if (!context) return;
    let cancelled = false;
    void campusFetch(`/messaging/institutions/${encodeURIComponent(context.institutionId)}/directory?q=${encodeURIComponent(search)}`)
      .then(data => { if (!cancelled) setDirectory(data.members ?? []); })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : "Annuaire indisponible."); });
    return () => { cancelled = true; };
  }, [context, search]);
  useEffect(() => { void refreshMessages(); }, [refreshMessages]);

  const start = async (event: FormEvent) => {
    event.preventDefault();
    if (!context || busy) return;
    setBusy(true); setError(null);
    try {
      const data = await campusFetch("/messaging/threads", {
        method: "POST",
        body: JSON.stringify({ institutionId: context.institutionId, recipientId: recipient.trim() }),
      });
      setActive(data.thread.id); setRecipient(""); setMessages([]);
      await refreshThreads();
    } catch (e) { setError(e instanceof Error ? e.message : "Création impossible."); }
    finally { setBusy(false); }
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!active || !body.trim() || busy) return;
    setBusy(true); setError(null);
    try {
      await campusFetch(`/messaging/threads/${encodeURIComponent(active)}/messages`, {
        method: "POST", body: JSON.stringify({ body: body.trim() }),
      });
      setBody(""); await refreshMessages();
    } catch (e) { setError(e instanceof Error ? e.message : "Envoi impossible."); }
    finally { setBusy(false); }
  };

  const attach = async (event: FormEvent) => {
    event.preventDefault();
    if (!active || !file || busy) return;
    setBusy(true); setError(null);
    try {
      if (file.size < 1 || file.size > 10 * 1024 * 1024) throw new Error("Fichier trop volumineux ou vide (10 Mo maximum).");
      if (!["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Format non autorisé.");
      await campusUpload(`/messaging/threads/${encodeURIComponent(active)}/attachments`, file);
      setFile(null); await refreshMessages();
    } catch (e) { setError(e instanceof Error ? e.message : "Transfert impossible."); }
    finally { setBusy(false); }
  };
  const download = async (messageId: string) => {
    if (!active) return;
    try {
      const data = await campusFetch(`/messaging/threads/${encodeURIComponent(active)}/messages/${encodeURIComponent(messageId)}/download`);
      if (typeof data.url === "string") window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e) { setError(e instanceof Error ? e.message : "Téléchargement impossible."); }
  };

  if (mismatch) return <p>Accès réservé à votre rôle. <Link href={`/establishment/${mismatch.campusRole}`}>Mon espace</Link></p>;
  return <Shell role={role} activeSlug="messages" displayName={context?.displayName} institutionName={context?.institutionName} note={contextError ?? null}>
    <header className={styles.head}><div><small>ESPACE {role.toUpperCase()}</small><h1>Messagerie privée</h1><p>Échanges entre membres du même établissement.</p></div></header>
    {contextLoading ? <p>Chargement…</p> : null}
    {error ? <p role="alert">{error}</p> : null}
    <section className={styles.tile}>
      <h2>Nouvelle conversation</h2>
      <form onSubmit={start}>
        <label>Rechercher un membre
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom du membre" />
        </label>
        <label>Destinataire
          <select required value={recipient} onChange={e => setRecipient(e.target.value)}><option value="">Choisir une personne</option>{directory.map(member => <option key={member.id} value={member.id}>{member.name} ({member.role})</option>)}</select>
        </label>
        <button type="submit" disabled={busy || !context}>Démarrer</button>
      </form>
    </section>
    <section className={styles.tile}>
      <h2>Mes conversations</h2>
      {threads.length === 0 ? <p>Aucune conversation.</p> : threads.map(thread =>
        <button key={thread.id} type="button" onClick={() => { setActive(thread.id); setMessages([]); }}>
          {thread.recipients?.map(person => person.name).join(", ") || "Conversation"} — {new Date(thread.created_at).toLocaleDateString("fr-FR")}
        </button>
      )}
    </section>
    {active ? <section className={styles.tile}>
      <h2>Conversation</h2>
      <button type="button" onClick={() => void refreshMessages()}>Actualiser</button>
      <div aria-live="polite">{messages.map(message =>
        <article key={message.id}><strong>{message.sender_id === context?.userId ? "Vous" : "Correspondant"}</strong>
          <p>{message.body}</p>{message.attachment_name ? <button type="button" onClick={() => void download(message.id)}>Télécharger : {message.attachment_name}</button> : null}<small>{new Date(message.created_at).toLocaleString("fr-FR")}</small>
        </article>
      )}</div>
      <form onSubmit={send}><label>Votre message
        <textarea required maxLength={4000} value={body} onChange={e => setBody(e.target.value)} />
      </label><button type="submit" disabled={busy || !body.trim()}>Envoyer</button></form>
      <form onSubmit={attach}><label>Pièce jointe (PDF ou image, 10 Mo maximum)
        <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={e => setFile(e.target.files?.[0] ?? null)} />
      </label><button type="submit" disabled={busy || !file}>Joindre</button></form>
    </section> : null}
  </Shell>;
}
