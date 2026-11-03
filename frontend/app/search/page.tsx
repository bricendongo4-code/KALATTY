"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import SessionAwareHomeLink from "../SessionAwareHomeLink";
import KalattyLogo from "../_components/KalattyLogo";
import { buildLoginUrl } from "../authRedirect";
import styles from "./search.module.css";
type Result = {
  id: string;
  type: string;
  label: string;
  category: string;
  snippet: string;
  href: string;
  targetHref: string;
};
function SearchResults({
  query,
  scope,
  focus,
}: {
  query: string;
  scope: string;
  focus: string | null;
}) {
  const router = useRouter();
  const [input, setInput] = useState(query),
    [rows, setRows] = useState<Result[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [partial, setPartial] = useState(false);
  useEffect(() => {
    const token = localStorage.getItem("kalatty_token");
    if (!token) {
      router.replace(
        buildLoginUrl(
          "/search?q=" + encodeURIComponent(query) + "&scope=" + scope,
        ),
      );
      return;
    }
    const abort = new AbortController();
    fetch(
      (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000") +
        "/search?q=" +
        encodeURIComponent(query) +
        "&scope=" +
        encodeURIComponent(scope),
      {
        headers: { Authorization: "Bearer " + token },
        signal: abort.signal,
        cache: "no-store",
      },
    )
      .then(async (r) => {
        if (!r.ok)
          throw Error(
            r.status === 401
              ? "Votre session doit être renouvelée."
              : "Recherche indisponible (" + r.status + ").",
          );
        return r.json();
      })
      .then((body: { results?: Result[]; unavailableSources?: string[] }) => {
        if (!abort.signal.aborted) {
          setRows(body.results ?? []);
          setPartial(!!body.unavailableSources?.length);
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted)
          setError(e instanceof Error ? e.message : "Recherche indisponible");
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [query, scope, router]);
  return (
    <main className={styles.page}>
      <header>
        <SessionAwareHomeLink ariaLabel="Retour à mon compte Kalatty">
          <KalattyLogo className={styles.logo} />
        </SessionAwareHomeLink>
        <SessionAwareHomeLink>← Retour à mon compte</SessionAwareHomeLink>
      </header>
      <section className={styles.content}>
        <span className={styles.eyebrow}>VOS DONNÉES KALATTY</span>
        <h1>Résultats de recherche</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim().length >= 2)
              router.push(
                "/search?q=" +
                  encodeURIComponent(input.trim()) +
                  "&scope=" +
                  scope,
              );
          }}
        >
          <label htmlFor="search-query">Rechercher un titre ou un nom</label>
          <div>
            <input
              id="search-query"
              type="search"
              minLength={2}
              maxLength={100}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              required
            />
            <button>Rechercher</button>
          </div>
        </form>
        {loading && (
          <p role="status">Recherche dans vos données accessibles…</p>
        )}
        {error && <p role="alert">{error}</p>}
        {partial && (
          <p role="status">
            Certaines sources sont indisponibles ; les résultats peuvent être
            incomplets.
          </p>
        )}
        {!loading && !error && (
          <p>
            {rows.length} résultat(s) pour « {query} ». Les résultats respectent
            les accès de votre compte.
          </p>
        )}
        {!loading && !error && rows.length === 0 && (
          <div className={styles.empty}>
            Aucun titre ou nom correspondant. Essayez un terme plus court.
          </div>
        )}
        <div className={styles.results}>
          {rows.map((r) => (
            <article
              key={r.type + ":" + r.id}
              className={focus === r.type + ":" + r.id ? styles.focused : ""}
            >
              <span>{r.category}</span>
              <h2>{r.label}</h2>
              {r.snippet && <p>{r.snippet}</p>}
              {r.targetHref.startsWith("/") &&
                !r.targetHref.startsWith("//") && (
                  <Link href={r.targetHref}>
                    {r.type === "course"
                      ? "Ouvrir le cours"
                      : "Ouvrir la rubrique correspondante"}{" "}
                    →
                  </Link>
                )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
function SearchQuery() {
  const params = useSearchParams();
  const query = params.get("q") ?? "",
    scope = params.get("scope") ?? "learn";
  return (
    <SearchResults
      key={scope + ":" + query}
      query={query}
      scope={scope}
      focus={params.get("focus")}
    />
  );
}
export default function SearchPage() {
  return (
    <Suspense fallback={<p>Chargement de la recherche…</p>}>
      <SearchQuery />
    </Suspense>
  );
}
