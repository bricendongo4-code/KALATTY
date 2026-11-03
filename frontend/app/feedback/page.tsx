"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import KalattyLogo from "../_components/KalattyLogo";
import SessionAwareHomeLink from "../SessionAwareHomeLink";
import { commerceFetch, departments, statuses } from "../commerce/api";
import s from "../commerce/ui.module.css";
type Review = {
  id: string;
  rating: number;
  category: string;
  body: string;
  status: string;
  assigned_department: string | null;
  decision_note: string;
  created_at: string;
};
export default function FeedbackPage() {
  const [reviews, setReviews] = useState<Review[] | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(
    async () =>
      setReviews(await commerceFetch<Review[]>("/commerce/feedback/mine")),
    [],
  );
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [load]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      data = new FormData(form);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await commerceFetch("/commerce/feedback", {
        rating: Number(data.get("rating")),
        category: data.get("category"),
        body: data.get("body"),
      });
      form.reset();
      setNotice(
        "Votre avis a été transmis au support. Merci de nous aider à améliorer Kalatty.",
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className={`${s.workspace} ${s.standalone}`}>
      <header className={s.top}>
        <KalattyLogo />
        <SessionAwareHomeLink>Retour à mon compte</SessionAwareHomeLink>
      </header>
      <div className={s.head}>
        <div>
          <h1>Votre avis sur Kalatty</h1>
          <p>
            Un problème, une idée ou un retour d’expérience ? Le support lit vos
            retours et propose leur prise en charge au service concerné.
          </p>
        </div>
      </div>
      {error && (
        <p className={s.error} role="alert">
          {error} <Link href="/login?redirect=/feedback">Se connecter</Link>
        </p>
      )}
      {notice && (
        <p className={s.notice} role="status">
          {notice}
        </p>
      )}
      <div className={s.columns}>
        <section className={s.panel}>
          <h2>Donner mon avis</h2>
          <p className={s.muted}>
            Vos avis sont privés : vous et l’équipe autorisée pouvez les
            consulter. Ne transmettez aucun mot de passe, code Mobile Money ni
            numéro de carte.
          </p>
          <form onSubmit={submit}>
            <fieldset disabled={busy}>
              <label>
                Votre note
                <select name="rating" defaultValue="5">
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} / 5
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Sujet
                <select name="category">
                  <option value="other">Autre / à qualifier</option>
                  <option value="bug">Problème technique</option>
                  <option value="payment">Paiement ou retrait</option>
                  <option value="usability">Navigation et présentation</option>
                  <option value="course">Formation et contenu</option>
                  <option value="suggestion">Idée d’amélioration</option>
                </select>
              </label>
              <label>
                Votre retour
                <textarea
                  name="body"
                  required
                  minLength={10}
                  maxLength={3000}
                  rows={6}
                  placeholder="Expliquez ce qui s’est passé et ce que vous souhaiteriez améliorer."
                />
              </label>
              <p className={s.muted}>
                10 à 3 000 caractères · 5 avis maximum par jour.
              </p>
              <button type="submit">
                {busy ? "Envoi…" : "Transmettre mon avis"}
              </button>
            </fieldset>
          </form>
        </section>
        <section className={s.panel}>
          <h2>Suivre mes avis</h2>
          {!reviews && !error ? (
            <p role="status">Chargement…</p>
          ) : reviews?.length ? (
            reviews.map((r) => (
              <article className={s.panel} key={r.id}>
                <div className={s.row}>
                  <strong>{r.rating} / 5</strong>
                  <span className={s.badge}>
                    {statuses[r.status] ?? r.status}
                  </span>
                  <small>
                    {new Date(r.created_at).toLocaleDateString("fr-FR")}
                  </small>
                </div>
                <p className={s.quote}>{r.body}</p>
                {r.assigned_department && (
                  <p>Service : {departments[r.assigned_department]}</p>
                )}
                {r.decision_note && <p>Suivi : {r.decision_note}</p>}
              </article>
            ))
          ) : (
            <p>Aucun avis envoyé pour le moment.</p>
          )}
          <button
            className={s.secondary}
            onClick={() => void load().catch((e) => setError(e.message))}
          >
            Actualiser le suivi
          </button>
        </section>
      </div>
    </main>
  );
}
