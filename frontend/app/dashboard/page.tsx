"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import styles from "./router.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

const CAMPUS_ROLE_ROUTES: Record<string, string> = {
  student: "/establishment/student",
  teacher: "/establishment/teacher",
  pedagogy: "/establishment/pedagogy",
  admin: "/establishment/admin",
};

export default function DashboardRouter() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const resolveSpace = useCallback(async () => {
    const token = localStorage.getItem("kalatty_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };
    try {
      const campusResponse = await fetch(`${API_BASE}/campus/context`, { headers });
      if (campusResponse.ok) {
        const campus = await campusResponse.json();
        const campusRoute = CAMPUS_ROLE_ROUTES[String(campus.campusRole)];
        if (campusRoute) {
          router.replace(campusRoute);
          return;
        }
      }

      const dashboardResponse = await fetch(`${API_BASE}/dashboard`, { headers });
      if (dashboardResponse.status === 401) {
        localStorage.removeItem("kalatty_token");
        router.replace("/login");
        return;
      }
      const dashboard = await dashboardResponse.json();
      if (!dashboardResponse.ok) {
        throw new Error(dashboard.message ?? "Impossible de déterminer votre espace.");
      }
      if (dashboard.role === "teacher") {
        router.replace("/creator");
        return;
      }
      if (dashboard.role === "student") {
        router.replace("/learn");
        return;
      }
      router.replace("/establishment/admin");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Connexion au serveur impossible.");
    }
  }, [router]);

  useEffect(() => {
    resolveSpace();
  }, [resolveSpace]);

  return <main className={styles.page}>
    <section className={styles.card}>
      <Image src="/kalatty-logo-campus.png" alt="Kalatty" width={156} height={126} priority />
      {error ? <><h1>Nous n’avons pas pu ouvrir votre espace</h1><p>{error}</p><div><button onClick={resolveSpace}>Réessayer</button><Link href="/">Retour à l’accueil</Link></div></> : <><span className={styles.loader} /><h1>Ouverture de votre espace Kalatty</h1><p>Votre rôle et votre contexte actif sont en cours de vérification.</p></>}
    </section>
  </main>;
}
