"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { commerceFetch, money, statuses } from "./api";
import s from "./ui.module.css";
type Transaction = {
  id: string;
  kind: string;
  label: string;
  user_id: string;
  teacher_id: string | null;
  payer_name: string;
  teacher_name: string | null;
  amount_fcfa: number;
  provider_fee_fcfa: number | null;
  platform_fee_fcfa: number;
  teacher_earning_fcfa: number;
  status: string;
  verification_source: string;
  verified_at: string | null;
  created_at: string;
};
type Expense = {
  id: string;
  label: string;
  category: string;
  amount_fcfa: number;
  expense_date: string;
  status: string;
  reference: string;
  voided_at: string | null;
};
type Withdrawal = {
  id: string;
  amount_fcfa: number;
  status: string;
  phone: string;
  holder_name: string;
  method: string;
  profiles: { fullname: string } | null;
};
type Data = {
  totals: Record<string, number>;
  ledger: { transactions: Transaction[]; total: number };
  expenses: Expense[];
  withdrawals: Withdrawal[];
  settings: { withdrawal_min_fcfa: number; withdrawal_hold_days: number };
};
function csvCell(v: unknown) {
  let x = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(x)) x = "'" + x;
  return '"' + x.replace(/"/g, '""') + '"';
}
export default function FinanceWorkspace() {
  const [range, setRange] = useState(() => {
      const n = new Date();
      return {
        from: new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1))
          .toISOString()
          .slice(0, 10),
        to: new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 1, 1))
          .toISOString()
          .slice(0, 10),
      };
    }),
    [page, setPage] = useState(0),
    [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setError("");
    setData(
      await commerceFetch<Data>(
        `/commerce/owner/finance?from=${range.from}&to=${range.to}&page=${page}`,
      ),
    );
  }, [range, page]);
  useEffect(() => {
    void load().catch((e) => {
      setData(null);
      setError(e.message);
    });
  }, [load]);
  async function mutate(path: string, body: unknown, method = "POST") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await commerceFetch(`/commerce/owner${path}`, body, method);
      setNotice(
        "Enregistrement effectué. Le journal conserve cette opération.",
      );
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action impossible.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  function exportPage() {
    if (!data) return;
    const rows = [
      [
        "Transaction",
        "Type",
        "Libellé",
        "Payeur",
        "ID payeur",
        "Professeur",
        "Brut XAF",
        "Part Kalatty XAF",
        "Part professeur XAF",
        "Statut",
        "Vérification",
        "Date",
      ],
      ...data.ledger.transactions.map((t) => [
        t.id,
        t.kind,
        t.label,
        t.payer_name,
        t.user_id,
        t.teacher_name,
        t.amount_fcfa,
        t.platform_fee_fcfa,
        t.teacher_earning_fcfa,
        t.status,
        t.verification_source,
        t.verified_at ?? t.created_at,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n")],
        { type: "text/csv;charset=utf-8;" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `kalatty-transactions-page-${page + 1}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  async function expense(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form);
    if (
      await mutate("/expenses", {
        label: f.get("label"),
        category: f.get("category"),
        amountFcfa: Number(f.get("amount")),
        date: f.get("date"),
        status: f.get("status"),
        reference: f.get("reference"),
      })
    )
      form.reset();
  }
  return (
    <section className={s.workspace}>
      <header className={s.head}>
        <div>
          <h1>Finance de Kalatty</h1>
          <p>
            Encaissements vérifiés, parts des formateurs, dépenses déclarées et
            suivi des transactions.
          </p>
        </div>
        <button
          className={s.secondary}
          onClick={() => void load().catch((e) => setError(e.message))}
        >
          Actualiser
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
      <form
        className={s.panel}
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setPage(0);
          setRange({ from: String(f.get("from")), to: String(f.get("to")) });
        }}
      >
        <div className={s.row}>
          <label>
            Début inclus (UTC)
            <input name="from" type="date" required defaultValue={range.from} />
          </label>
          <label>
            Fin exclue (UTC)
            <input name="to" type="date" required defaultValue={range.to} />
          </label>
          <button>Appliquer la période</button>
        </div>
      </form>
      {data ? (
        <>
          <div className={s.metrics}>
            {[
              ["Encaissements bruts vérifiés", "grossCollectedFcfa"],
              ["Chiffre d’affaires Kalatty", "kalattyRevenueFcfa"],
              ["Part des professeurs sur la période", "teacherShareFcfa"],
              ["Dépenses payées déclarées", "paidExpensesFcfa"],
              ["Frais prestataire renseignés", "providerFeesFcfa"],
              ["Résultat de gestion provisoire", "operatingResultFcfa"],
            ].map(([label, key]) => (
              <div className={s.metric} key={key}>
                <span>{label}</span>
                <strong>{money(data.totals[key] ?? 0)}</strong>
              </div>
            ))}
          </div>
          <p className={s.note}>
            Le chiffre d’affaires comprend les commissions des cours et les
            forfaits établissements confirmés. Le résultat déduit les dépenses
            payées déclarées et les frais renseignés ; il ne remplace pas les
            comptes comptables ni le solde bancaire.{" "}
            {data.totals.unknownProviderFees} transaction(s) sans frais
            prestataire renseignés. {data.totals.unverifiedPaidCount} ancien(s)
            paiement(s) « payé » sans confirmation prestataire enregistrée,
            exclus des revenus vérifiés. Dépenses prévisionnelles :{" "}
            {money(data.totals.plannedExpensesFcfa)}. Sommes dues aux
            professeurs toutes périodes :{" "}
            {money(data.totals.teacherLiabilityFcfa)} dont{" "}
            {money(data.totals.reservedPayoutsFcfa)} réservés pour retrait.
          </p>
          <section className={s.panel}>
            <div className={s.head}>
              <h2>Qui a réalisé quelle transaction ?</h2>
              <button className={s.secondary} onClick={exportPage}>
                Exporter cette page CSV
              </button>
            </div>
            <p>
              {data.ledger.total} transaction(s) · page {page + 1} · 50 lignes
              par page
            </p>
            {data.ledger.transactions.length ? (
              <div className={s.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Transaction</th>
                      <th>Payeur</th>
                      <th>Bénéficiaire</th>
                      <th>Brut</th>
                      <th>Part Kalatty</th>
                      <th>Part professeur</th>
                      <th>Confirmation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ledger.transactions.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <strong>{t.label}</strong>
                          <small>
                            {t.kind === "course"
                              ? "Cours"
                              : "Forfait établissement"}
                          </small>
                          <small>{t.id}</small>
                          <small>
                            {new Date(
                              t.verified_at ?? t.created_at,
                            ).toLocaleString("fr-FR")}
                          </small>
                        </td>
                        <td>
                          {t.payer_name ?? "Compte Kalatty"}
                          <small>{t.user_id}</small>
                        </td>
                        <td>
                          {t.teacher_name ?? "Kalatty"}
                          <small>{t.teacher_id}</small>
                        </td>
                        <td>{money(t.amount_fcfa)}</td>
                        <td>{money(t.platform_fee_fcfa)}</td>
                        <td>{money(t.teacher_earning_fcfa)}</td>
                        <td>
                          {statuses[t.status] ?? t.status}
                          <small>
                            {t.verification_source === "cinetpay"
                              ? "Confirmé par CinetPay"
                              : t.verification_source === "demo"
                                ? "Démonstration · exclu"
                                : "Non vérifié · exclu des totaux"}
                          </small>
                          {t.verification_source === "cinetpay" &&
                            t.status === "paid" && (
                              <details>
                                <summary>
                                  Frais :{" "}
                                  {t.provider_fee_fcfa === null
                                    ? "à renseigner"
                                    : money(t.provider_fee_fcfa)}
                                </summary>
                                <form
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    const f = new FormData(e.currentTarget);
                                    void mutate(`/transactions/${t.id}/fee`, {
                                      kind: t.kind,
                                      feeFcfa: Number(f.get("fee")),
                                      expectedFee: t.provider_fee_fcfa,
                                      reference: f.get("reference"),
                                    });
                                  }}
                                >
                                  <label>
                                    Frais prestataire FCFA
                                    <input
                                      name="fee"
                                      type="number"
                                      required
                                      min="0"
                                      max={t.amount_fcfa}
                                      step="1"
                                      defaultValue={
                                        t.provider_fee_fcfa ?? undefined
                                      }
                                    />
                                  </label>
                                  <label>
                                    Référence de rapprochement
                                    <input
                                      name="reference"
                                      required
                                      minLength={3}
                                      maxLength={250}
                                    />
                                  </label>
                                  <button disabled={busy}>
                                    Enregistrer les frais
                                  </button>
                                </form>
                              </details>
                            )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>Aucune transaction sur cette période.</p>
            )}
            <div className={s.pagination}>
              <button
                className={s.secondary}
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Précédent
              </button>
              <button
                className={s.secondary}
                disabled={(page + 1) * 50 >= data.ledger.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Suivant
              </button>
            </div>
          </section>
          <div className={s.columns}>
            <section className={s.panel}>
              <h2>Enregistrer une dépense</h2>
              <p className={s.muted}>
                Saisissez le montant réellement payé en XAF et une référence de
                facture. Pour une facture en euros, utilisez le montant XAF
                effectivement débité et conservez le taux dans la référence.
                Évitez de compter deux fois des frais déjà déduits.
              </p>
              <form onSubmit={(e) => void expense(e)}>
                <fieldset disabled={busy}>
                  <label>
                    Libellé
                    <input
                      name="label"
                      required
                      minLength={3}
                      maxLength={160}
                    />
                  </label>
                  <label>
                    Catégorie
                    <select name="category">
                      <option value="hosting">Hébergement</option>
                      <option value="ai">API et IA</option>
                      <option value="payment_fees">
                        Frais de paiement non déjà déduits
                      </option>
                      <option value="marketing">Marketing</option>
                      <option value="operations">Fonctionnement</option>
                      <option value="other">Autre</option>
                    </select>
                  </label>
                  <label>
                    Montant FCFA
                    <input
                      name="amount"
                      type="number"
                      required
                      min="1"
                      step="1"
                    />
                  </label>
                  <label>
                    Date
                    <input name="date" type="date" required />
                  </label>
                  <label>
                    État
                    <select name="status">
                      <option value="paid">Payée</option>
                      <option value="planned">Prévisionnelle</option>
                    </select>
                  </label>
                  <label>
                    Référence / justificatif
                    <input
                      name="reference"
                      required
                      minLength={3}
                      maxLength={250}
                    />
                  </label>
                  <button>Ajouter la dépense</button>
                </fieldset>
              </form>
            </section>
            <section className={s.panel}>
              <h2>Conditions des retraits</h2>
              <p className={s.muted}>
                Ces règles s’appliquent aux nouvelles demandes. Modifier le
                délai ou le minimum n’annule pas les montants déjà réservés.
              </p>
              <form
                key={JSON.stringify(data.settings)}
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void mutate(
                    "/settings",
                    {
                      minimumFcfa: Number(f.get("minimum")),
                      holdDays: Number(f.get("days")),
                    },
                    "PATCH",
                  );
                }}
              >
                <fieldset disabled={busy}>
                  <label>
                    Minimum de retrait FCFA
                    <input
                      name="minimum"
                      type="number"
                      required
                      min="500"
                      max="700000"
                      step="1"
                      defaultValue={data.settings.withdrawal_min_fcfa}
                    />
                  </label>
                  <label>
                    Délai de disponibilité en jours
                    <input
                      name="days"
                      type="number"
                      required
                      min="0"
                      max="90"
                      step="1"
                      defaultValue={data.settings.withdrawal_hold_days}
                    />
                  </label>
                  <button>Enregistrer les règles</button>
                </fieldset>
              </form>
              <p className={s.note}>
                Prestataire de versement non connecté : approuver une demande ne
                transfère pas d’argent. Le statut « payé » nécessitera une
                confirmation du prestataire.
              </p>
            </section>
          </div>
          <section className={s.panel}>
            <h2>Dépenses récentes de la période (100 maximum)</h2>
            {data.expenses.length ? (
              data.expenses.map((e) => (
                <article key={e.id} className={s.panel}>
                  <strong>
                    {e.label} · {money(e.amount_fcfa)}
                  </strong>
                  <p>
                    {e.expense_date} · {statuses[e.status]} · {e.reference}
                  </p>
                  {e.voided_at ? (
                    <p>Dépense annulée, conservée au journal.</p>
                  ) : (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        const f = new FormData(event.currentTarget);
                        void mutate(`/expenses/${e.id}/void`, {
                          reason: f.get("reason"),
                        });
                      }}
                    >
                      <label>
                        Motif d’annulation
                        <input
                          name="reason"
                          minLength={3}
                          maxLength={250}
                          required
                        />
                      </label>
                      <button className={s.secondary} disabled={busy}>
                        Annuler cette saisie
                      </button>
                    </form>
                  )}
                </article>
              ))
            ) : (
              <p>
                Aucune dépense saisie. Un total à zéro ne signifie pas qu’il
                n’existe aucun coût.
              </p>
            )}
          </section>
          <section className={s.panel}>
            <h2>Demandes de retrait récentes (100 maximum)</h2>
            {data.withdrawals.length ? (
              data.withdrawals.map((w) => (
                <article className={s.panel} key={w.id}>
                  <h3>
                    {w.profiles?.fullname ?? w.holder_name} ·{" "}
                    {money(w.amount_fcfa)}
                  </h3>
                  <p>
                    {w.method === "orange_money" ? "Orange Money" : "MTN MoMo"}{" "}
                    · …{w.phone.slice(-4)} · {statuses[w.status]}
                  </p>
                  {["requested", "approved"].includes(w.status) && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        void mutate(`/withdrawals/${w.id}/decision`, {
                          status: f.get("status"),
                          note: f.get("note"),
                        });
                      }}
                    >
                      <fieldset disabled={busy}>
                        <label>
                          Décision
                          <select
                            name="status"
                            defaultValue={
                              w.status === "approved" ? "rejected" : "approved"
                            }
                          >
                            {w.status === "requested" && (
                              <option value="approved">
                                Approuver la demande, sans transfert
                              </option>
                            )}
                            <option value="rejected">
                              Refuser et libérer la réservation
                            </option>
                          </select>
                        </label>
                        <label>
                          Motif visible par le formateur
                          <input
                            name="note"
                            required
                            minLength={3}
                            maxLength={500}
                          />
                        </label>
                        <button>Enregistrer la décision</button>
                      </fieldset>
                    </form>
                  )}
                </article>
              ))
            ) : (
              <p>Aucune demande de retrait.</p>
            )}
          </section>
        </>
      ) : !error ? (
        <p role="status">Chargement des données financières…</p>
      ) : null}
    </section>
  );
}
