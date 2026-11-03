import { test, expect } from "@playwright/test";
const leadId = "11111111-1111-4111-8111-111111111111",
  actionId = "22222222-2222-4222-8222-222222222222";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,content-type",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
};
const fixture = () => ({
  settings: {
    brief: {
      offer: "Kalatty pour vos formations",
      audience: "les établissements",
      benefit: "Organiser les cours",
      cta: "https://kalatty-frontend.vercel.app/",
      signature: "Équipe Kalatty",
    },
    discovery_enabled: false,
    provider: "directory_fr",
    country: "FR",
    query: "formation",
    updated_at: "2026-11-03T09:00:00Z",
    last_run_at: null,
    last_error: null,
    next_run_at: "2026-11-04T09:00:00Z",
  },
  leads: [
    {
      id: leadId,
      company: "Centre Formation Exemple",
      source_url: "https://example.org/",
      country: "FR",
      city: "Paris",
      industry: "Formation",
      qualification: "Source officielle · à qualifier",
      email: "contact@example.org",
      contact_source_url: "https://example.org/contact",
      opt_out: false,
      stage: "new",
      notes: "",
      next_followup_at: null,
      version: 1,
    },
  ],
  actions: [] as Record<string, unknown>[],
  events: [],
  usage: { deliveries: 0, discoveries: 0 },
  limits: { dailyDeliveries: 10, dailyDiscoveries: 5 },
  connections: {
    directory_fr: true,
    brave_web: false,
    email: false,
    linkedin: false,
    export: true,
  },
  sender: { email: "", linkedin: "" },
});
async function setup(page: import("@playwright/test").Page) {
  const data = fixture();
  const mutations: { path: string; body: Record<string, unknown> }[] = [];
  await page.addInitScript(() =>
    localStorage.setItem("kalatty_token", "fixture-only"),
  );
  await page.route("http://localhost:4000/**", async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    if (req.method() === "OPTIONS")
      return route.fulfill({ status: 204, headers: cors });
    let result: unknown = {
      agents: [],
      proposals: [],
      reports: [],
      enabled: true,
      ai_enabled: false,
      runs: [],
    };
    if (path === "/ai-control-center/growth") result = data;
    else if (path.startsWith("/ai-control-center/growth/")) {
      const body = req.postDataJSON() ?? {};
      mutations.push({ path, body });
      if (path.endsWith("/drafts")) {
        data.actions.push({
          id: actionId,
          lead_id: leadId,
          channel: body.channel,
          sender: "",
          recipient: "contact@example.org",
          subject: "Kalatty — présentation",
          body: "Bonjour, découvrez Kalatty.",
          scheduled_for: null,
          status: "draft",
          generation_mode: "template",
          digest: "a".repeat(64),
          provider_id: null,
          error: null,
          updated_at: "2026-11-03T09:00:00Z",
        });
        result = data.actions[0];
      } else if (path.endsWith("/decision")) {
        data.actions[0].status =
          body.decision === "approve" ? "approved" : "rejected";
        data.actions[0].updated_at = new Date().toISOString();
        result = { saved: true };
      } else if (req.method() === "PATCH" && path.includes("/actions/")) {
        Object.assign(data.actions[0], body, {
          digest: "b".repeat(64),
          status: "draft",
          updated_at: new Date().toISOString(),
        });
        result = { saved: true };
      } else if (path.endsWith("/execute")) {
        data.actions[0].status = "exported";
        data.actions[0].updated_at = new Date().toISOString();
        result = { status: "exported" };
      } else if (path.endsWith("/settings")) {
        Object.assign(data.settings, body, {
          updated_at: new Date().toISOString(),
        });
        result = { saved: true };
      } else if (path.endsWith("/check"))
        result = {
          configured: false,
          authenticated: false,
          message: "Accès GitHub non configuré.",
        };
    }
    await route.fulfill({ json: result, headers: cors });
  });
  await page.goto("/ai-control-center");
  return { data, mutations };
}
async function open(page: import("@playwright/test").Page, width: number) {
  if (width < 701)
    await page
      .getByRole("button", { name: "Ouvrir le menu", exact: true })
      .click();
  await page
    .getByRole("navigation", { name: "Navigation du Control Center" })
    .getByRole("button", { name: /Prospection & campagnes/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Prospection & campagnes", exact: true }),
  ).toBeVisible();
}
for (const width of [320, 768, 1024, 1440])
  test(`growth workspace at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await setup(page);
    await open(page, width);
    for (const name of [
      "Brief & autonomie",
      "Prospects",
      "Contenus & validations",
      "Connexions",
    ]) {
      await page.getByRole("tab", { name, exact: true }).click();
      await expect(page.getByRole("tabpanel")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page
      .getByRole("button", { name: "Vérifier l’accès au dépôt" })
      .click();
    await expect(page.getByText(/Accès GitHub non configuré/)).toBeVisible();
    if (width === 320 || width === 1440)
      await page.screenshot({
        path: `/tmp/kalatty-growth-connections-${width}.png`,
        fullPage: true,
      });
  });
test("commercial brief persists and drafting never sends", async ({ page }) => {
  const { mutations } = await setup(page);
  await open(page, 1280);
  await page
    .getByRole("textbox", { name: "Offre", exact: true })
    .fill("Kalatty pour les centres de formation");
  await page
    .getByRole("button", { name: "Enregistrer le brief et les réglages" })
    .click();
  await expect(page.getByRole("status")).toContainText("Action enregistrée");
  expect(
    mutations.find((x) => x.path.endsWith("/settings"))?.body,
  ).toMatchObject({
    discovery_enabled: false,
    brief: { offer: "Kalatty pour les centres de formation" },
  });
  await page.getByRole("tab", { name: "Prospects", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Consulter la source" }),
  ).toHaveAttribute("href", "https://example.org/");
  await page
    .getByRole("button", { name: "Préparer un email", exact: true })
    .click();
  await page.getByRole("tab", { name: "Contenus & validations" }).click();
  await expect(
    page.getByRole("heading", { name: "Kalatty — présentation" }),
  ).toBeVisible();
  expect(mutations.some((x) => x.path.endsWith("/execute"))).toBe(false);
  expect(mutations.find((x) => x.path.endsWith("/drafts"))?.body.ai).toBe(
    false,
  );
});
test("approval is explicit, revision resets approval and approved export is executable once", async ({
  page,
}) => {
  const { mutations } = await setup(page);
  await open(page, 1280);
  await page.getByRole("tab", { name: "Contenus & validations" }).click();
  await page.getByRole("button", { name: "Préparer le brouillon" }).click();
  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("button", { name: "Approuver ce contenu" }).click();
  expect(mutations.some((x) => x.path.endsWith("/decision"))).toBe(false);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Approuver ce contenu" }).click();
  await expect(
    page.getByRole("button", { name: "Autoriser l’export" }),
  ).toBeVisible();
  await page
    .getByText("Modifier le brouillon et sa date", { exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Texte", exact: true })
    .fill("Texte révisé");
  await page
    .getByRole("button", { name: "Enregistrer une nouvelle version" })
    .click();
  await expect(
    page.getByRole("button", { name: "Approuver ce contenu" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Autoriser l’export" }),
  ).toHaveCount(0);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Approuver ce contenu" }).click();
  await expect(
    page.getByRole("button", { name: "Autoriser l’export" }),
  ).toBeVisible();
  expect(
    mutations.filter((x) => x.path.endsWith("/decision")).at(-1)?.body.digest,
  ).toBe("b".repeat(64));
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Autoriser l’export" }).click();
  await expect(
    page.getByRole("button", { name: "Télécharger le contenu" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Autoriser l’export" }),
  ).toHaveCount(0);
});
