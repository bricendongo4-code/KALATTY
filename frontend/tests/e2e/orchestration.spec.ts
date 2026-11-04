import { test, expect } from "@playwright/test";
const id = "00000000-0000-4000-8000-000000000042";
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};
for (const width of [390, 1280])
  test(`mission creation and independent review at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() =>
      localStorage.setItem("kalatty_token", "test-only"),
    );
    let created = false;
    const mutations: { path: string; body: unknown }[] = [];
    await page.route("**/ai-control-center/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (route.request().method() === "OPTIONS")
        return route.fulfill({ status: 204, headers });
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        mutations.push({ path, body });
        if (path.endsWith("/missions")) {
          expect(body).toMatchObject({
            title: "Bilan financier",
            department: "finance",
            priority: "normal",
          });
          expect(body.requestKey).toMatch(/^[0-9a-f-]{36}$/);
          created = true;
        }
        return route.fulfill({ headers, json: { id, accepted: true } });
      }
      const data = path.endsWith("/orchestration")
        ? {
            state: { enabled: true, auto_assign: true },
            usage: { calls: 12, automaticCalls: 12 },
            dailyAiCallLimit: 100,
            automaticDailyAiCallLimit: 80,
            brainProvider: "groq",
            brainModel: "test",
            brainConfigured: true,
            missions: created
              ? [
                  {
                    id,
                    title: "Bilan financier",
                    objective: "Calculer le résultat du mois.",
                    origin: "manual",
                    status: "awaiting_approval",
                    created_at: "2026-11-04T17:00:00Z",
                    proposal_id: id,
                    change: {
                      id,
                      status: "pending",
                      execution_status: "not_applicable",
                    },
                    tasks: [
                      {
                        id: "a",
                        stage: "analysis",
                        department: "finance",
                        status: "completed",
                        attempts: 1,
                        result: {
                          summary: "Revenus analysés",
                          recommendation:
                            "Un diagnostic documenté sans transaction.",
                          capturedAt: "2026-11-04T17:00:00Z",
                        },
                      },
                      {
                        id: "b",
                        stage: "review",
                        department: "analytics",
                        status: "completed",
                        attempts: 1,
                        result: {
                          summary: "Analyse contrôlée",
                          recommendation:
                            "Proposition à examiner avant toute modification.",
                          capturedAt: "2026-11-04T17:00:00Z",
                        },
                      },
                    ],
                  },
                ]
              : [],
          }
        : path.endsWith("/signals")
          ? { agents: [] }
          : path.endsWith("/proposals")
            ? {
                proposals: created
                  ? [
                      {
                        id,
                        department: "finance",
                        title: "Mission : Bilan financier",
                        rationale: "Proposition contrôlée.",
                        status: "pending",
                        created_at: "2026-11-04T17:00:00Z",
                      },
                    ]
                  : [],
              }
            : path.endsWith("/supervision")
              ? { enabled: true, ai_enabled: true, runs: [] }
              : {};
      return route.fulfill({ headers, json: data });
    });
    await page.goto("/ai-control-center");
    if (width < 800)
      await page.getByRole("button", { name: /Ouvrir le menu/ }).click();
    await page
      .getByRole("navigation", { name: "Navigation du Control Center" })
      .getByRole("button", { name: "Orchestration", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Orchestration des agents" }),
    ).toBeVisible();
    await page.getByLabel("Titre", { exact: true }).fill("Bilan financier");
    await page
      .getByLabel("Objectif et résultat attendu")
      .fill("Calculer le résultat du mois.");
    await page.getByLabel("Agent responsable").selectOption("finance");
    await page
      .getByRole("button", { name: "Créer la mission", exact: true })
      .click();
    await expect(page.getByText("1. Analyse · Finance")).toBeVisible();
    await expect(
      page.getByText("2. Contrôle de l’analyse · Analytics"),
    ).toBeVisible();
    await expect(
      page.getByText("votre décision est attendue", { exact: false }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Voir la proposition à valider" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Mission : Bilan financier" }),
    ).toBeVisible();
    expect(mutations).toHaveLength(1);
  });
