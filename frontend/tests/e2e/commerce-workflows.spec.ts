import { test, expect, type Page } from "@playwright/test";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,content-type",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
};
const uuid = "11111111-1111-4111-8111-111111111111";
async function setup(page: Page) {
  const calls: { path: string; body: Record<string, unknown> }[] = [];
  const review = {
    id: uuid,
    rating: 2,
    category: "payment",
    body: "Mon paiement Orange Money est débité mais le cours reste inaccessible.",
    status: "new",
    suggested_department: "finance",
    routing_reason: "Paiement à examiner.",
    assigned_department: null as string | null,
    decision_note: "",
    proposal_id: null as string | null,
    version: 1,
    created_at: "2026-11-03T09:00:00Z",
    profiles: { fullname: "Compte de test" },
  };
  const wallet = {
    wallet: {
      confirmedEarningsFcfa: 17000,
      availableFcfa: 17000,
      heldFcfa: 0,
      reservedFcfa: 0,
      withdrawnFcfa: 0,
      minimumFcfa: 5000,
      holdDays: 7,
      payoutConnected: false,
    },
    account: {
      method: "orange_money",
      phone: "237699123456",
      holder_name: "Compte de test",
    },
    requests: [] as Record<string, unknown>[],
  };
  const plans = {
    coursePayments: {
      enabled: false,
      methods: [
        {
          code: "mobile_money",
          label: "Orange Money / MTN MoMo",
          enabled: false,
        },
        { code: "card", label: "Carte bancaire", enabled: false },
      ],
    },
    institutionPlans: [
      {
        code: "starter",
        label: "Starter",
        amountFcfa: 25000,
        maxStudents: 100,
        maxRooms: 10,
        durationDays: 30,
      },
    ],
  };
  const finance = {
    totals: {
      grossCollectedFcfa: 45000,
      kalattyRevenueFcfa: 28000,
      teacherShareFcfa: 17000,
      paidExpensesFcfa: 1000,
      providerFeesFcfa: 0,
      operatingResultFcfa: 27000,
      unknownProviderFees: 2,
      unverifiedPaidCount: 9,
      plannedExpensesFcfa: 0,
      teacherLiabilityFcfa: 17000,
      reservedPayoutsFcfa: 0,
    },
    ledger: {
      total: 1,
      transactions: [
        {
          id: uuid,
          kind: "course",
          label: "Formation de test",
          payer_name: "Apprenant de test",
          teacher_name: "Formateur de test",
          user_id: uuid,
          teacher_id: uuid,
          amount_fcfa: 20000,
          platform_fee_fcfa: 3000,
          teacher_earning_fcfa: 17000,
          provider_fee_fcfa: null,
          status: "paid",
          verification_source: "cinetpay",
          created_at: "2026-11-03T09:00:00Z",
          verified_at: "2026-11-03T09:00:00Z",
        },
      ],
    },
    expenses: [] as Record<string, unknown>[],
    withdrawals: [],
    settings: { withdrawal_min_fcfa: 5000, withdrawal_hold_days: 7 },
  };
  await page.addInitScript(() =>
    localStorage.setItem("kalatty_token", "fixture-only"),
  );
  await page.route("http://localhost:4000/**", async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    if (req.method() === "OPTIONS")
      return route.fulfill({ status: 204, headers: cors });
    const body = req.postDataJSON();
    if (body) calls.push({ path, body });
    let result: unknown = {
      agents: [],
      proposals: [],
      reports: [],
      runs: [],
      enabled: true,
      ai_enabled: false,
    };
    if (path === "/commerce/feedback/mine")
      result = calls.some((c) => c.path === "/commerce/feedback")
        ? [review]
        : [];
    if (path === "/commerce/feedback") {
      Object.assign(review, body);
      result = review;
    }
    if (path === "/commerce/owner/support")
      result = { reviews: [review], total: 1, page: 0 };
    if (path.endsWith("/route")) {
      review.assigned_department = String(body.department);
      review.proposal_id = uuid;
      review.status = "routed";
      review.version++;
      result = review;
    }
    if (path === "/commerce/wallet") result = wallet;
    if (path === "/commerce/wallet/requests") {
      wallet.wallet.availableFcfa -= Number(body.amountFcfa);
      wallet.wallet.reservedFcfa += Number(body.amountFcfa);
      wallet.requests.push({
        id: uuid,
        amount_fcfa: body.amountFcfa,
        method: "orange_money",
        phone: "237699123456",
        status: "requested",
        created_at: new Date().toISOString(),
        decision_note: "",
      });
      result = wallet.requests[0];
    }
    if (path === "/commerce/owner/finance") result = finance;
    if (path === "/commerce/owner/expenses") {
      finance.expenses.push({
        id: uuid,
        label: body.label,
        category: body.category,
        amount_fcfa: body.amountFcfa,
        expense_date: body.date,
        status: body.status,
        reference: body.reference,
        voided_at: null,
      });
      result = finance.expenses[0];
    }
    if (path === "/payments/plans") result = plans;
    if (path.startsWith("/courses/"))
      result = { title: "Formation de test", priceFcfa: 20000 };
    if (path === "/payments/teacher/revenue-summary")
      result = {
        currency: "XAF",
        grossPaidFcfa: 20000,
        feesPaidFcfa: 3000,
        netPaidFcfa: 17000,
        pendingNetFcfa: 0,
        refundsFcfa: 0,
        paidSalesCount: 1,
        transactions: [],
      };
    if (path === "/campus/context")
      result = {
        userId: uuid,
        displayName: "Responsable de test",
        institutionId: uuid,
        institutionName: "École de test",
        institutionRole: "owner",
        campusRole: "admin",
      };
    if (path.endsWith("/billing-summary"))
      result = {
        id: uuid,
        plan_name: "starter",
        subscription_status: "active",
        max_students: 100,
        max_rooms: 10,
        paid_until: "2099-01-01T00:00:00Z",
      };
    if (path.endsWith("/billing")) result = [];
    if (path === "/auth/me")
      result = { id: uuid, fullname: "Compte de test", role: "teacher" };
    if (path === "/payments/course-checkout")
      result = { paymentUrl: "https://checkout.cinetpay.com/fixture-payment" };
    await route.fulfill({ json: result, headers: cors });
  });
  return { calls, review, wallet, plans, finance };
}
async function nav(page: Page, label: string) {
  if ((page.viewportSize()?.width ?? 1440) < 701)
    await page
      .getByRole("button", { name: "Ouvrir le menu", exact: true })
      .click();
  await page
    .getByRole("navigation", { name: "Navigation du Control Center" })
    .getByRole("button", { name: label, exact: true })
    .click();
}

test("a learner submits app feedback and follows its private status", async ({
  page,
}) => {
  const { calls } = await setup(page);
  await page.goto("/feedback");
  await page
    .getByLabel("Votre retour")
    .fill("Le menu est difficile à lire sur mon téléphone.");
  await page.getByLabel("Sujet").selectOption("usability");
  await page.getByRole("button", { name: "Transmettre mon avis" }).click();
  await expect(page.getByRole("status")).toContainText("transmis au support");
  await expect(
    page.getByRole("heading", { name: "Suivre mes avis" }),
  ).toBeVisible();
  await expect(
    page.getByText("Le menu est difficile à lire sur mon téléphone.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(
    calls.find((c) => c.path === "/commerce/feedback")?.body,
  ).toMatchObject({ category: "usability", rating: 5 });
});

test("the owner reads content and can correct the suggested department before routing", async ({
  page,
}) => {
  const { calls } = await setup(page);
  await page.goto("/ai-control-center");
  await nav(page, "Avis & support");
  await expect(
    page.getByText(
      "Mon paiement Orange Money est débité mais le cours reste inaccessible.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByLabel("Orienter vers").selectOption("developer");
  await page.getByRole("button", { name: "Confirmer l’orientation" }).click();
  await expect(page.getByRole("status")).toContainText("Orientation confirmée");
  expect(calls.find((c) => c.path.endsWith("/route"))?.body).toMatchObject({
    department: "developer",
    version: 1,
  });
  await expect(
    page.getByRole("button", { name: "Enregistrer le suivi" }),
  ).toBeVisible();
});

test("finance separates Kalatty revenue from professor funds and records an expense", async ({
  page,
}) => {
  const { calls } = await setup(page);
  await page.goto("/ai-control-center");
  await nav(page, "Suivi financier");
  await expect(page.getByText("28 000 FCFA", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("cell", { name: /^Apprenant de test/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: /^Formateur de test/ }),
  ).toBeVisible();
  await page
    .getByLabel("Libellé", { exact: true })
    .fill("Hébergement novembre");
  await page
    .getByRole("combobox", { name: /^Catégorie/ })
    .selectOption("hosting");
  await page.getByLabel("Montant FCFA", { exact: true }).fill("1000");
  await page.getByLabel("Date", { exact: true }).fill("2026-11-01");
  await page.getByLabel("Référence / justificatif").fill("FACTURE-TEST-001");
  await page.getByRole("button", { name: "Ajouter la dépense" }).click();
  await expect(
    page.getByText("Hébergement novembre · 1 000 FCFA", { exact: true }),
  ).toBeVisible();
  expect(
    calls.find((c) => c.path === "/commerce/owner/expenses")?.body,
  ).toMatchObject({ amountFcfa: 1000, status: "paid", category: "hosting" });
});

test("a withdrawal reserves earnings without claiming a transfer", async ({
  page,
}) => {
  const { calls } = await setup(page);
  await page.goto("/creator/revenue");
  await page.getByLabel("Montant en FCFA", { exact: true }).fill("5000");
  await page.getByRole("button", { name: "Enregistrer la demande" }).click();
  await expect(page.getByRole("status")).toContainText(
    "sans transfert effectué",
  );
  await expect(page.getByText("12 000 FCFA", { exact: true })).toBeVisible();
  expect(
    calls.find((c) => c.path === "/commerce/wallet/requests")?.body,
  ).toMatchObject({ amountFcfa: 5000, requestKey: expect.any(String) });
  await expect(page.getByRole("cell", { name: "Demande reçue" })).toBeVisible();
});

test("unconnected payment providers are explicit and cannot initiate payment", async ({
  page,
}) => {
  const { calls } = await setup(page);
  await page.goto("/checkout?course=" + uuid);
  await expect(
    page.getByText("Le prestataire de paiement n’est pas encore connecté.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continuer vers le paiement sécurisé" }),
  ).toBeDisabled();
  expect(calls.some((c) => c.path === "/payments/course-checkout")).toBe(false);
});

for (const width of [320, 1440])
  test(`support and finance remain usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await setup(page);
    await page.goto("/ai-control-center");
    await nav(page, "Suivi financier");
    await expect(
      page.getByRole("heading", { name: "Finance de Kalatty" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `/tmp/kalatty-finance-${width}.png`,
      fullPage: true,
    });
    await nav(page, "Avis & support");
    await expect(
      page.getByRole("heading", { name: "Avis & support", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  });

test("institution managers choose a prepaid plan without charging each internal account", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/establishment/admin/finances");
  await expect(
    page.getByRole("heading", { name: "Abonnement de l’établissement" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Choisir / renouveler ce forfait →" })
    .click();
  await expect(page).toHaveURL(/checkout\?institution=.*plan=starter/);
  await expect(
    page.getByRole("heading", { name: "Forfait Starter" }),
  ).toBeVisible();
  await expect(
    page.getByText("pour 30 jours, sans prélèvement automatique", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continuer vers le paiement sécurisé" }),
  ).toBeDisabled();
});
