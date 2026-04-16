"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import styles from "../../auth.module.css";

export default function InviteRedeemPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("Verification de l'invitation...");
  const [loading, setLoading] = useState(true);
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

  useEffect(() => {
    void params.then((resolved) => setToken(resolved.token));
  }, [params]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const authToken = localStorage.getItem("kalatty_token");
    if (!authToken) {
      setMessage("Connecte-toi d'abord pour rejoindre la salle.");
      setLoading(false);
      return;
    }

    const redeem = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/institutions/invites/${token}/redeem`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        const data = await res.json();

        if (!res.ok) {
          setMessage(data.message ?? "Impossible d'accepter l'invitation.");
          return;
        }

        setMessage(
          `Invitation acceptee. Tu rejoins ${data.roomName ?? "la salle"} comme ${data.role ?? "membre"}.`,
        );

        startTransition(() => {
          router.push("/dashboard");
        });
      } catch {
        setMessage("La validation du lien a echoue.");
      } finally {
        setLoading(false);
      }
    };

    void redeem();
  }, [apiBaseUrl, router, token]);

  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <Link href="/" className={styles.brandLink}>
          <Image
            src="/kalatty-logo.png"
            alt="Logo Kalatty"
            width={148}
            height={148}
            className={styles.brandLogo}
            priority
          />
          <span className={styles.brandLine}>Kalatty</span>
        </Link>
        <span className={styles.badge}>Invitation Kalatty</span>
        <h1 className={styles.title}>Rejoindre une salle</h1>
        <p className={styles.subtitle}>
          Kalatty verifie le lien d&apos;invitation avant de te rattacher a la salle.
        </p>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <p className={styles.eyebrow}>Acces</p>
          <h2>Lien d&apos;invitation</h2>
          <p>{message}</p>
        </div>

        {!loading ? (
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => router.push("/dashboard")}
          >
            Aller au dashboard
          </button>
        ) : null}
      </section>
    </main>
  );
}
