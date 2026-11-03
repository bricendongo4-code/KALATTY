import { test, expect } from "@playwright/test";
const id = "00000000-0000-4000-8000-000000000001";
for (const outcome of ["blocked", "review_ready"])
  test(`approving a recommendation starts preparation and shows ${outcome}`, async ({
    page,
  }) => {
    const parentId = "00000000-0000-4000-8000-000000000002";
    let approved = false;
    const calls: string[] = [];
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization,content-type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    };
    await page.route("**/ai-control-center/proposals", (route) =>
      route.fulfill({
        headers,
        json: {
          proposals: [
            {
              id: parentId,
              department: "ux",
              title: "Clarifier le catalogue",
              rationale: "Clarifier le titre de la liste des cours.",
              created_at: "2026-11-03T10:00:00Z",
              status: approved ? "approved" : "pending",
              execution_status: approved ? outcome : "not_applicable",
              execution_error:
                approved && outcome === "blocked"
                  ? "Quota IA du jour épuisé. Relancez demain."
                  : null,
              implementation_proposal_id:
                approved && outcome === "review_ready" ? id : null,
            },
            ...(approved && outcome === "review_ready"
              ? [
                  {
                    id,
                    department: "developer",
                    title: "Correction du titre préparée",
                    rationale: "Le titre sera plus explicite.",
                    created_at: "2026-11-03T10:01:00Z",
                    status: "pending",
                    execution_status: "awaiting_approval",
                    patch: {
                      file: "frontend/app/courses/page.tsx",
                      oldText: "Cours",
                      newText: "Tous les cours",
                      digest: "a".repeat(64),
                    },
                  },
                ]
              : []),
          ],
        },
      }),
    );
    await page.route(
      `**/ai-control-center/proposals/${parentId}/decision`,
      (route) => {
        if (route.request().method() === "OPTIONS")
          return route.fulfill({ status: 204, headers });
        calls.push("decision");
        expect(route.request().postDataJSON()).toMatchObject({
          decision: "approved",
          prepareImplementation: true,
        });
        approved = true;
        return route.fulfill({
          headers,
          json: { preparationQueued: true, productionModified: false },
        });
      },
    );
    await page.route(
      `**/ai-control-center/proposals/${parentId}/retry`,
      (route) => {
        if (route.request().method() === "OPTIONS")
          return route.fulfill({ status: 204, headers });
        calls.push("retry");
        return route.fulfill({ headers, json: { queued: true } });
      },
    );
    await page.goto("/ai-control-center");
    await page
      .getByRole("navigation", { name: "Navigation du Control Center" })
      .getByRole("button", { name: /Centre de validation/ })
      .click();
    await expect(
      page.getByText(/lancer la recherche et la préparation/),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Valider et préparer une modification" })
      .click();
    if (outcome === "blocked") {
      await expect(
        page.getByText("Quota IA du jour épuisé. Relancez demain."),
      ).toBeVisible();
      await page
        .getByRole("button", {
          name: "Relancer la préparation de la modification",
        })
        .click();
      expect(calls).toEqual(["decision", "retry"]);
    } else {
      await expect(
        page.getByText("Correction préparée · changement exact à approuver"),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Voir la correction liée" })
        .click();
      await expect(
        page.getByRole("heading", { name: "Correction du titre préparée" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Approuver la correction" }),
      ).toBeVisible();
      expect(calls).toEqual(["decision"]);
    }
    await expect(
      page.getByRole("button", {
        name: "Publier la correction après les tests",
      }),
    ).toHaveCount(0);
  });
for (const response of [
  {
    body: JSON.stringify({
      message: "Quota IA quotidien atteint ou indisponible",
    }),
    expected: "Quota IA quotidien atteint ou indisponible",
  },
  {
    body: "Service unavailable",
    expected: "Analyse indisponible (503). Réessayez plus tard.",
  },
])
  test(`analysis failure displays its cause: ${response.expected}`, async ({
    page,
  }) => {
    await page.route("**/ai-control-center/analyze", (route) => {
      const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization,content-type",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
      };
      return route.fulfill({
        status: route.request().method() === "OPTIONS" ? 204 : 503,
        body: route.request().method() === "OPTIONS" ? "" : response.body,
        headers,
      });
    });
    await page.goto("/ai-control-center");
    await page
      .getByRole("navigation", { name: "Navigation du Control Center" })
      .getByRole("button", { name: /Analyses IA/ })
      .click();
    await page.getByRole("button", { name: /Lancer une analyse/ }).click();
    await expect(
      page.getByText(response.expected, { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/Vérifiez vos crédits/)).toHaveCount(0);
  });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("kalatty_token", "test-only"),
  );
  await page.route("**/ai-control-center/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith("/signals")
      ? {
          agents: [
            {
              department: "security",
              available: true,
              sources: [
                { table: "privacy_requests", available: true, count: 2 },
              ],
            },
          ],
        }
      : path.endsWith("/proposals")
        ? {
            proposals: [
              {
                id,
                department: "developer",
                title: "Correction du catalogue",
                rationale:
                  "Constat de test pour vérifier le parcours de validation.",
                status: "pending",
                created_at: "2026-11-03T08:00:00Z",
                patch: {
                  file: "frontend/app/courses/page.tsx",
                  oldText: "old",
                  newText: "new",
                  digest: "a".repeat(64),
                },
                execution_status: "awaiting_approval",
              },
            ],
          }
        : path.endsWith("/supervision")
          ? {
              enabled: true,
              ai_enabled: false,
              brainConfigured: true,
              githubConfigured: false,
              last_run_at: "2026-11-03T08:00:00Z",
              runs: [],
            }
          : { reports: [] };
    await route.fulfill({
      json: data,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization,content-type",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      },
    });
  });
});
for (const width of [320, 768, 1024, 1440])
  test(`Kalatty branding, navigation and approval at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/ai-control-center");
    await expect(
      page.getByRole("heading", { name: "Vue générale", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Supervision des agents" }),
    ).toBeVisible();
    await expect(
      page.getByText("Désactivée · aucun appel payant"),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const logo = page.getByRole("img", { name: "Kalatty", exact: true });
    await expect(logo.last()).toBeAttached();
    await page
      .getByRole("button", { name: /Sécurité/ })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: /Agent Sécurité/ }),
    ).toBeVisible();
    if (width < 700)
      await page
        .getByRole("navigation", { name: "Navigation mobile" })
        .getByRole("button", { name: /Validations/ })
        .click();
    else
      await page
        .getByRole("navigation", { name: "Navigation du Control Center" })
        .getByRole("button", { name: /Centre de validation/ })
        .click();
    await expect(
      page.getByRole("heading", { name: "Correction du catalogue" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Constat de test pour vérifier le parcours de validation.",
      ),
    ).toBeVisible();
    await expect(
      page.getByText("Ce que votre validation autorise :"),
    ).toBeVisible();
    await expect(
      page.getByText(/préparer uniquement le changement de code joint/),
    ).toBeVisible();
    await page
      .getByText("Changement exact · frontend/app/courses/page.tsx")
      .click();
    await expect(
      page.getByRole("heading", { name: "Avant", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 320 || width === 1440)
      await page.screenshot({
        path: `/tmp/kalatty-agents-${width}.png`,
        fullPage: true,
      });
  });
test("a refused confirmation never sends an approval", async ({ page }) => {
  await page.goto("/ai-control-center");
  await page
    .getByRole("navigation", { name: "Navigation du Control Center" })
    .getByRole("button", { name: /Centre de validation/ })
    .click();
  let mutations = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/decision")) mutations++;
  });
  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("button", { name: "Approuver la correction" }).click();
  expect(mutations).toBe(0);
});

test("mobile menu keeps the complete logo and every section visible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ai-control-center");
  await expect(
    page.getByRole("heading", { name: "Vue générale", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "/tmp/kalatty-brand-overview-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Ouvrir le menu", exact: true })
    .click();
  const sidebar = page.locator("aside");
  const logo = sidebar.getByRole("img", { name: "Kalatty", exact: true });
  await expect(logo).toBeVisible();
  const [container, art] = await Promise.all([
    sidebar.boundingBox(),
    logo.boundingBox(),
  ]);
  expect(art!.x).toBeGreaterThanOrEqual(container!.x);
  expect(art!.x + art!.width).toBeLessThanOrEqual(
    container!.x + container!.width,
  );
  expect(await logo.evaluate((e) => getComputedStyle(e).transform)).toBe(
    "none",
  );
  for (const name of [
    "Vue générale",
    "Départements & agents",
    "Analyses IA",
    "Centre de validation",
    "Rapports",
    "Paramètres",
  ]) {
    const box = await sidebar
      .getByRole("button", { name: new RegExp(name) })
      .boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  }
  await page.screenshot({ path: "/tmp/kalatty-brand-drawer-mobile.png" });
  await sidebar.getByRole("button", { name: /Paramètres/ }).click();
  await expect(
    page.getByRole("heading", { name: "Paramètres", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Supervision des agents", exact: true }),
  ).toBeVisible();
  const button = page.getByRole("button", { name: "Contrôler maintenant" });
  expect(
    await button.evaluate((e) => getComputedStyle(e).backgroundImage),
  ).toContain("255, 106, 31");
  await page.screenshot({
    path: "/tmp/kalatty-brand-settings-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("navigation", { name: "Navigation mobile" })
    .getByRole("button", { name: /Validations/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Correction du catalogue" }),
  ).toBeVisible();
  await page.screenshot({
    path: "/tmp/kalatty-brand-approvals-mobile.png",
    fullPage: true,
  });
});

test("each workspace retains its own layout on mobile and desktop", async ({
  page,
}) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/ai-control-center");
    for (const [menu, title, key] of [
      ["Départements & agents", "Vos agents IA", "agents"],
      ["Analyses IA", "Analyses IA", "analysis"],
      ["Rapports", "Rapports", "reports"],
    ]) {
      if (width < 700)
        await page
          .getByRole("button", { name: "Ouvrir le menu", exact: true })
          .click();
      await page
        .getByRole("navigation", { name: "Navigation du Control Center" })
        .getByRole("button", { name: new RegExp(menu) })
        .click();
      await expect(
        page.getByRole("heading", { name: title, exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `/tmp/kalatty-brand-${key}-${width}.png`,
        fullPage: true,
      });
    }
  }
});

test("homepage uses the same complete Kalatty artwork", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const logo = page
    .locator("main")
    .getByRole("img", { name: "Logo Kalatty", exact: true });
  await expect(logo).toBeVisible();
  expect((await logo.boundingBox())!.width).toBeGreaterThan(50);
  await page.screenshot({ path: "/tmp/kalatty-brand-home-mobile.png" });
});

for (const configured of [false, true])
  test(`Groq connection diagnostic keeps automatic AI disabled (key configured: ${configured})`, async ({
    page,
  }) => {
    const mutations: string[] = [];
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization,content-type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    };
    await page.route("**/ai-control-center/supervision", (route) =>
      route.fulfill({
        headers: cors,
        json: {
          enabled: true,
          ai_enabled: false,
          brainConfigured: configured,
          brainProvider: "groq",
          brainModel: "openai/gpt-oss-20b",
          githubConfigured: true,
          runs: [],
        },
      }),
    );
    await page.route("**/ai-control-center/brain/check", (route) => {
      if (route.request().method() === "OPTIONS")
        return route.fulfill({ status: 204, headers: cors });
      mutations.push("check");
      return route.fulfill({
        headers: cors,
        json: {
          connected: true,
          message:
            "Connexion IA vérifiée. Les analyses automatiques restent sous votre contrôle.",
        },
      });
    });
    await page.route("**/ai-control-center/supervision/configure", (route) => {
      mutations.push("configure");
      return route.fulfill({ headers: cors, json: {} });
    });
    await page.goto("/ai-control-center");
    await page
      .getByRole("navigation", { name: "Navigation du Control Center" })
      .getByRole("button", { name: "Paramètres", exact: true })
      .click();
    await expect(page.getByText("Groq", { exact: true })).toBeVisible();
    const automatic = page.getByRole("checkbox", {
      name: /Analyses IA automatiques/,
    });
    await expect(automatic).not.toBeChecked();
    const check = page.getByRole("button", { name: "Tester la connexion IA" });
    if (configured) {
      await check.click();
      await expect(page.getByRole("status")).toContainText(
        "Connexion IA vérifiée",
      );
      expect(mutations).toEqual(["check"]);
      await expect(automatic).not.toBeChecked();
    } else {
      await expect(check).toBeDisabled();
      await expect(automatic).toBeDisabled();
      await expect(
        page.getByText("Clé GROQ_API_KEY à ajouter dans Railway"),
      ).toBeVisible();
      expect(mutations).toEqual([]);
    }
  });
