"use client";
import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import KalattyLogo from "../_components/KalattyLogo";
import SessionAwareHomeLink from "../SessionAwareHomeLink";
import { commerceFetch, money } from "../commerce/api";
import s from "../commerce/ui.module.css";
type Plans = {
  coursePayments: {
    enabled: boolean;
    methods?: { code: string; label: string; enabled: boolean }[];
  };
  institutionPlans: {
    code: string;
    label: string;
    amountFcfa: number;
    maxStudents: number;
    maxRooms: number;
    durationDays: number;
  }[];
};
function Checkout() {
  const params = useSearchParams(),
    courseId = params.get("course"),
    institutionId = params.get("institution"),
    plan = params.get("plan") ?? "starter";
  const [plans, setPlans] = useState<Plans | null>(null),
    [course, setCourse] = useState<{ title: string; priceFcfa: number } | null>(
      null,
    ),
    [method, setMethod] = useState("mobile_money"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const chosen = plans?.institutionPlans.find((p) => p.code === plan);
  const load = useCallback(async () => {
    setPlans(await commerceFetch<Plans>("/payments/plans"));
    if (courseId)
      setCourse(
        await commerceFetch(`/courses/${encodeURIComponent(courseId)}`),
      );
  }, [courseId]);
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [load]);
  async function pay(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const f = new FormData(e.currentTarget),
        body: Record<string, unknown> = { paymentMethod: method };
      if (method === "card") for (const [k, v] of f.entries()) body[k] = v;
      const r = await commerceFetch<{
        paymentUrl?: string;
        alreadyEnrolled?: boolean;
      }>(
        courseId
          ? "/payments/course-checkout"
          : `/payments/institutions/${encodeURIComponent(institutionId ?? "")}/checkout`,
        { ...body, ...(courseId ? { courseId } : { planName: plan }) },
      );
      if (r.alreadyEnrolled) {
        window.location.assign(
          `/learn/courses/${encodeURIComponent(courseId ?? "")}`,
        );
        return;
      }
      if (!r.paymentUrl)
        throw Error(
          "Le prestataire n’a pas fourni de page de paiement. Aucun accès payant n’est confirmé.",
        );
      const url = new URL(r.paymentUrl);
      if (
        url.protocol !== "https:" ||
        !(
          url.hostname === "checkout.cinetpay.com" ||
          url.hostname.endsWith(".cinetpay.com")
        )
      )
        throw Error("Page de paiement inattendue.");
      window.location.assign(url.toString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Paiement indisponible.");
    } finally {
      setBusy(false);
    }
  }
  const valid = Boolean(
    (courseId && !institutionId && course) ||
    (institutionId && !courseId && chosen),
  );
  return (
    <main className={`${s.workspace} ${s.standalone}`}>
      <header className={s.top}>
        <KalattyLogo />
        <SessionAwareHomeLink>Retour à mon compte</SessionAwareHomeLink>
      </header>
      <div className={s.head}>
        <div>
          <h1>Payer avec Kalatty</h1>
          <p>
            Montants en FCFA (XAF). La confirmation du prestataire déclenche
            l’accès.
          </p>
        </div>
      </div>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      {plans ? (
        <section className={s.panel}>
          {valid ? (
            <>
              <h2>{course?.title ?? `Forfait ${chosen?.label}`}</h2>
              <p>
                <strong>
                  {money(course?.priceFcfa ?? chosen?.amountFcfa ?? 0)}
                </strong>
                {institutionId
                  ? " pour 30 jours, sans prélèvement automatique"
                  : ""}
              </p>
              {institutionId && (
                <p>
                  Le responsable de l’établissement règle le forfait pour son
                  espace. Les comptes internes bénéficient des capacités du
                  forfait ; ils ne paient pas chacun cet abonnement.
                </p>
              )}
              <p className={s.note}>
                {plans.coursePayments.enabled
                  ? "Vous serez redirigé vers le guichet sécurisé CinetPay. Le retour sur Kalatty seul ne confirme jamais le paiement."
                  : "Le prestataire de paiement n’est pas encore connecté. Aucun débit réel ne peut être lancé."}
              </p>
              <form onSubmit={(e) => void pay(e)}>
                <fieldset disabled={busy}>
                  <label>
                    Moyen de paiement
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                    >
                      {(
                        plans.coursePayments.methods ?? [
                          {
                            code: "mobile_money",
                            label: "Orange Money / MTN MoMo",
                            enabled: plans.coursePayments.enabled,
                          },
                        ]
                      ).map((m) => (
                        <option
                          key={m.code}
                          value={m.code}
                          disabled={!m.enabled}
                        >
                          {m.label}
                          {!m.enabled ? " · à activer" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className={s.muted}>
                    Orange Money ou MTN MoMo : choisissez votre opérateur au
                    guichet du prestataire. Les options disponibles dépendent de
                    votre pays et du compte marchand.
                  </p>
                  {method === "card" && (
                    <fieldset>
                      <legend>Coordonnées de facturation</legend>
                      <div className={s.columns}>
                        {[
                          ["customerName", "Nom"],
                          ["customerSurname", "Prénom"],
                          ["customerEmail", "Email"],
                          ["customerPhone", "Téléphone international"],
                          ["customerAddress", "Adresse"],
                          ["customerCity", "Ville"],
                          ["customerCountry", "Code pays (CM, FR…)"],
                          ["customerZipCode", "Code postal"],
                        ].map(([name, label]) => (
                          <label key={name}>
                            {label}
                            <input
                              name={name}
                              required
                              maxLength={name === "customerCountry" ? 2 : 150}
                              type={name === "customerEmail" ? "email" : "text"}
                            />
                          </label>
                        ))}
                      </div>
                      <p className={s.muted}>
                        La carte, sa date et son code de sécurité sont saisis
                        uniquement chez le prestataire.
                      </p>
                    </fieldset>
                  )}
                  <button
                    disabled={
                      !plans.coursePayments.enabled ||
                      !plans.coursePayments.methods?.find(
                        (m) => m.code === method,
                      )?.enabled ||
                      busy
                    }
                  >
                    {busy
                      ? "Préparation…"
                      : "Continuer vers le paiement sécurisé"}
                  </button>
                </fieldset>
              </form>
            </>
          ) : (
            <p>
              Choisissez d’abord une formation ou un forfait depuis votre
              espace.
            </p>
          )}
        </section>
      ) : !error ? (
        <p role="status">Chargement des moyens de paiement…</p>
      ) : null}
      <Link href="/feedback">
        Un problème avec un paiement ? Contacter le support
      </Link>
    </main>
  );
}
export default function CheckoutPage() {
  return (
    <Suspense fallback={<p>Chargement du paiement…</p>}>
      <Checkout />
    </Suspense>
  );
}
