"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(JSON.stringify({ event: "frontend_route_error", message: error.message, digest: error.digest, timestamp: new Date().toISOString() }));
  }, [error]);
  return <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 24 }}><section style={{ width: "min(540px,100%)", padding: 30, border: "1px solid #dceaea", borderRadius: 20, background: "#fff", textAlign: "center" }}><h1>Cette page n’a pas pu s’afficher</h1><p>Une erreur a été enregistrée. Vous pouvez réessayer sans perdre votre compte.</p><div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 10 }}><button type="button" onClick={reset} style={{ padding: "11px 16px", border: 0, borderRadius: 10, background: "#087c7b", color: "#fff", fontWeight: 800 }}>Réessayer</button><Link href="/dashboard" style={{ padding: "11px 16px", border: "1px solid #cfe3e1", borderRadius: 10, color: "#075e66", fontWeight: 800 }}>Retour à mon espace</Link></div>{error.digest ? <small>Référence : {error.digest}</small> : null}</section></main>;
}
