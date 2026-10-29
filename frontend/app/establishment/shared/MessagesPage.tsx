"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import Shell from "../Shell";
import { campusFetch, useCampusContext } from "../useEstablishment";
import type { RoleSlug } from "../roles";
import styles from "../student/student-pages.module.css";

type Thread = { id: string; institution_id: string; created_at: string };
type Message = { id: string; sender_id: string; body: string; created_at: string };

export default function MessagesPage({ role }: { role: RoleSlug }) {
  const { context, loading: contextLoading, error: contextError, mismatch } = useCampusContext(role);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [recipient, setRecipient] = useState("");
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
    } catch (e) { setError(e instanceof Error ? e.message : "Messages indisponibles."); }
  }, [active]);

  useEffect(() => { void refreshThreads(); }, [refreshThreads]);
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

  if (mismatch) return <p>Accès réservé à votre rôle. <Link href={`/establishment/${mismatch.campusRole}`}>Mon espace</Link></p>;
  return <Shell role={role} activeSlug="messages" displayName={context?.displayName} institutionName={context?.institutionName} note={contextError ?? null}>
    <header className={styles.head}><div><small>ESPACE {role.toUpperCase()}</small><h1>Messagerie privée</h1><p>Échanges entre membres du même établissement.</p></div></header>
    {contextLoading ? <p>Chargement…</p> : null}
    {error ? <p role="alert">{error}</p> : null}
    <section className={styles.tile}>
      <h2>Nouvelle conversation</h2>
      <form onSubmit={start}>
        <label>Identifiant du destinataire (UUID)
          <input required value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="Identifiant du membre" />
        </label>
        <button type="submit" disabled={busy || !context}>Démarrer</button>
      </form>
    </section>
    <section className={styles.tile}>
      <h2>Mes conversations</h2>
      {threads.length === 0 ? <p>Aucune conversation.</p> : threads.map(thread =>
        <button key={thread.id} type="button" onClick={() => { setActive(thread.id); setMessages([]); }}>
          Conversation du {new Date(thread.created_at).toLocaleDateString("fr-FR")} — {thread.id.slice(0, 8)}
        </button>
      )}
    </section>
    {active ? <section className={styles.tile}>
      <h2>Conversation</h2>
      <button type="button" onClick={() => void refreshMessages()}>Actualiser</button>
      <div aria-live="polite">{messages.map(message =>
        <article key={message.id}><strong>{message.sender_id === context?.userId ? "Vous" : "Correspondant"}</strong>
          <p>{message.body}</p><small>{new Date(message.created_at).toLocaleString("fr-FR")}</small>
        </article>
      )}</div>
      <form onSubmit={send}><label>Votre message
        <textarea required maxLength={4000} value={body} onChange={e => setBody(e.target.value)} />
      </label><button type="submit" disabled={busy || !body.trim()}>Envoyer</button></form>
    </section> : null}
  </Shell>;
}
