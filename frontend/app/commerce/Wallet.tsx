"use client";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { commerceFetch, money, statuses } from "./api";
import s from "./ui.module.css";
type Request = {
  id: string;
  amount_fcfa: number;
  method: string;
  phone: string;
  status: string;
  created_at: string;
  decision_note: string;
};
type Data = {
  wallet: {
    confirmedEarningsFcfa: number;
    availableFcfa: number;
    heldFcfa: number;
    reservedFcfa: number;
    withdrawnFcfa: number;
    minimumFcfa: number;
    holdDays: number;
    payoutConnected: boolean;
  };
  account: { method: string; phone: string; holder_name: string } | null;
  requests: Request[];
};
export default function Wallet() {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const pending = useRef<{ key: string; amount: number } | null>(null);
  const load = useCallback(
    async () => setData(await commerceFetch<Data>("/commerce/wallet")),
    [],
  );
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [load]);
  async function submit(e: FormEvent<HTMLFormElement>, account: boolean) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (account) {
        await commerceFetch("/commerce/wallet/account", {
          method: f.get("method"),
          phone: f.get("phone"),
          holderName: f.get("holder"),
        });
        setNotice(
          "Compte de retrait enregistré. Le bénéficiaire est figé sur chaque nouvelle demande.",
        );
      } else {
        const n = Number(f.get("amount"));
        if (!pending.current || pending.current.amount !== n)
          pending.current = { key: crypto.randomUUID(), amount: n };
        await commerceFetch("/commerce/wallet/requests", {
          amountFcfa: n,
          requestKey: pending.current.key,
        });
        pending.current = null;
        setNotice(
          "Demande enregistrée : le montant est réservé, sans transfert effectué. Vous pouvez suivre sa validation ci-dessous.",
        );
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={s.workspace}>
      <header className={s.head}>
        <div>
          <h2>Retirer mes revenus</h2>
          <p>
            Versement sur votre compte Orange Money ou MTN MoMo au Cameroun.
          </p>
        </div>
        <button
          className={s.secondary}
          onClick={() => void load().catch((e) => setError(e.message))}
        >
          Actualiser le solde
        </button>
      </header>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className={s.notice} role="status">
          {notice}
        </p>
      )}
      {data ? (
        <>
          <p className={s.note}>
            Les transferts attendent la connexion du prestataire de versement.
            Les demandes peuvent être préparées et examinées, mais aucun argent
            n’est envoyé ici. Seuls les paiements confirmés par le prestataire
            alimentent le solde. Délai de disponibilité : {data.wallet.holdDays}{" "}
            jours après confirmation. Minimum : {money(data.wallet.minimumFcfa)}
            .
          </p>
          <div className={s.metrics}>
            {[
              ["Disponible", data.wallet.availableFcfa],
              ["En délai de disponibilité", data.wallet.heldFcfa],
              ["Réservé pour retrait", data.wallet.reservedFcfa],
              ["Déjà versé", data.wallet.withdrawnFcfa],
            ].map(([label, n]) => (
              <div className={s.metric} key={label}>
                <span>{label}</span>
                <strong>{money(Number(n))}</strong>
              </div>
            ))}
          </div>
          <div className={s.columns}>
            <section className={s.panel}>
              <h3>Mon compte de retrait</h3>
              <form
                key={JSON.stringify(data.account)}
                onSubmit={(e) => void submit(e, true)}
              >
                <fieldset disabled={busy}>
                  <label>
                    Opérateur
                    <select
                      name="method"
                      defaultValue={data.account?.method ?? "orange_money"}
                    >
                      <option value="orange_money">Orange Money</option>
                      <option value="mtn_momo">MTN MoMo</option>
                    </select>
                  </label>
                  <label>
                    Nom du titulaire
                    <input
                      name="holder"
                      required
                      minLength={3}
                      maxLength={120}
                      defaultValue={data.account?.holder_name}
                    />
                  </label>
                  <label>
                    Numéro Mobile Money
                    <input
                      name="phone"
                      type="tel"
                      required
                      placeholder="+237 6XX XXX XXX"
                      defaultValue={data.account?.phone}
                    />
                  </label>
                  <p className={s.muted}>
                    Utilisez un compte à votre nom. Aucun code secret ne vous
                    sera demandé dans Kalatty.
                  </p>
                  <button>Enregistrer le compte</button>
                </fieldset>
              </form>
            </section>
            <section className={s.panel}>
              <h3>Demander un retrait</h3>
              <form onSubmit={(e) => void submit(e, false)}>
                <fieldset
                  disabled={
                    busy ||
                    !data.account ||
                    data.wallet.availableFcfa < data.wallet.minimumFcfa
                  }
                >
                  <label>
                    Montant en FCFA
                    <input
                      name="amount"
                      type="number"
                      required
                      step="1"
                      min={data.wallet.minimumFcfa}
                      max={Math.min(data.wallet.availableFcfa, 700000)}
                    />
                  </label>
                  <p className={s.muted}>
                    Le montant demandé sera réservé pour éviter une double
                    utilisation. Aucun frais de versement n’est estimé ici ; les
                    conditions seront affichées avant l’activation des
                    transferts.
                  </p>
                  <button>Enregistrer la demande</button>
                </fieldset>
              </form>
              {!data.account && (
                <p>Enregistrez d’abord votre compte de retrait.</p>
              )}
              {data.wallet.availableFcfa < data.wallet.minimumFcfa && (
                <p>
                  Le solde disponible doit atteindre{" "}
                  {money(data.wallet.minimumFcfa)}.
                </p>
              )}
            </section>
          </div>
          <section className={s.panel}>
            <h3>Mes demandes récentes</h3>
            {data.requests.length ? (
              <div className={s.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Montant</th>
                      <th>Destination</th>
                      <th>État</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.requests.map((r) => (
                      <tr key={r.id}>
                        <td>
                          {new Date(r.created_at).toLocaleDateString("fr-FR")}
                          <small>{r.id}</small>
                        </td>
                        <td>{money(r.amount_fcfa)}</td>
                        <td>
                          {r.method === "orange_money"
                            ? "Orange Money"
                            : "MTN MoMo"}
                          <small>…{r.phone.slice(-4)}</small>
                        </td>
                        <td>
                          {statuses[r.status] ?? r.status}
                          <small>{r.decision_note}</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>Aucune demande de retrait.</p>
            )}
          </section>
        </>
      ) : !error ? (
        <p role="status">Chargement du portefeuille…</p>
      ) : null}
    </section>
  );
}
