"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { LearningRole } from "./config";
import { LearnerHome, TrainerHome, type LearningDashboardData } from "./views";
import styles from "./learning.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export default function LearningHome({ role }: { role: LearningRole }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LearningDashboardData | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem("kalatty_token");
    if (!token) {
      router.replace(`/login?redirect=/learning/${role}`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        localStorage.removeItem("kalatty_token");
        router.replace(`/login?redirect=/learning/${role}`);
        return;
      }
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? "Impossible de charger votre espace.");
      setData(body as LearningDashboardData);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Connexion au serveur impossible.");
    } finally {
      setLoading(false);
    }
  }, [role, router]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <section className={styles.loadingState}><span /><h1>Chargement de votre espace</h1><p>Nous préparons vos formations et vos prochaines actions.</p></section>;
  if (error) return <section className={styles.loadingState}><h1>Impossible de charger votre espace</h1><p>{error}</p><button onClick={load}>Réessayer</button></section>;
  if (!data) return null;

  const expected = role === "apprenant" ? "student" : "teacher";
  if (data.role !== expected) {
    const target = data.role === "teacher" ? "/learning/formateur" : data.role === "student" ? "/learning/apprenant" : "/establishment";
    return <section className={styles.loadingState}><h1>Ce n&apos;est pas votre espace actif</h1><p>Votre profil actuel correspond à un autre contexte Kalatty.</p><Link href={target} className={styles.primaryButton}>Ouvrir mon espace</Link></section>;
  }

  return role === "apprenant" ? <LearnerHome data={data} /> : <TrainerHome data={data} />;
}
