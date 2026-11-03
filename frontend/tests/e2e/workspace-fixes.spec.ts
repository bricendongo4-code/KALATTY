import { test, expect } from "@playwright/test";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,content-type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("kalatty_token", "fixture-session"),
  );
  await page.route("http://localhost:4000/**", (route) =>
    route.fulfill({
      headers: cors,
      status: 503,
      json: { message: "Source indisponible de test" },
    }),
  );
});
for (const path of [
  "/learn",
  "/creator",
  "/establishment/student",
  "/establishment/teacher",
  "/establishment/pedagogy",
  "/establishment/admin",
  "/ai-control-center",
]) {
  test(`desktop sidebar follows the viewport: ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto(path);
    const side = page.locator("aside").first();
    await expect(side).toBeVisible();
    await page
      .locator("main")
      .first()
      .evaluate((el) => {
        const extension = document.createElement("div");
        extension.style.height = "3000px";
        el.append(extension);
      });
    await page.evaluate(() => window.scrollTo(0, 1800));
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(1000);
    const box = await side.boundingBox();
    expect(Math.abs(box!.y)).toBeLessThan(2);
    expect(box!.height).toBe(800);
    const last = side.locator("a,button").last();
    await last.scrollIntoViewIfNeeded();
    const lastBox = await last.boundingBox();
    expect(lastBox!.y).toBeGreaterThanOrEqual(0);
    expect(lastBox!.y + lastBox!.height).toBeLessThanOrEqual(801);
  });
}
test("search queries real records and Enter opens complete results", async ({
  page,
}) => {
  let requests = 0;
  await page.route("http://localhost:4000/search?**", async (route) => {
    requests++;
    expect(route.request().headers().authorization).toBe(
      "Bearer fixture-session",
    );
    expect(new URL(route.request().url()).searchParams.get("scope")).toBe(
      "creator",
    );
    await route.fulfill({
      headers: cors,
      json: {
        results: [
          {
            id: "course-fixture",
            type: "course",
            label: "Atelier SQL avancé",
            category: "Cours",
            snippet: "Jointures et exercices",
            href: "/search?q=Atelier&scope=creator&focus=course:course-fixture",
            targetHref: "/creator/courses/course-fixture/builder",
          },
        ],
        unavailableSources: [],
      },
    });
  });
  await page.goto("/creator");
  const input = page.getByRole("combobox", { name: "Recherche globale" });
  await input.fill("Atelier");
  await expect(
    page.getByRole("option", { name: /Atelier SQL avancé/ }),
  ).toBeVisible();
  await input.press("Enter");
  await expect(page).toHaveURL(/\/search\?q=Atelier&scope=creator/);
  await expect(
    page.getByRole("heading", { name: "Atelier SQL avancé" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Ouvrir le cours/ }),
  ).toHaveAttribute("href", "/creator/courses/course-fixture/builder");
  expect(requests).toBeGreaterThanOrEqual(2);
});
test("return from agents keeps the session and resolves the user's workspace", async ({
  page,
}) => {
  await page.route("http://localhost:4000/campus/context", (route) =>
    route.fulfill({ headers: cors, json: { campusRole: "admin" } }),
  );
  await page.goto("/ai-control-center");
  await page
    .getByRole("link", { name: "← Retour à mon compte", exact: true })
    .click();
  await expect(page).toHaveURL(/\/establishment\/admin$/);
  expect(await page.evaluate(() => localStorage.getItem("kalatty_token"))).toBe(
    "fixture-session",
  );
});
test("browser history at login preserves an existing session", async ({
  page,
}) => {
  await page.route("http://localhost:4000/campus/context", (route) =>
    route.fulfill({ headers: cors, json: { campusRole: "teacher" } }),
  );
  await page.goto("/login");
  await page.getByRole("heading", { name: /Heureux de te revoir/ }).waitFor();
  await page.getByRole("button", { name: "Afficher le mot de passe" }).click();
  await expect(
    page.getByRole("button", { name: "Masquer le mot de passe" }),
  ).toBeVisible();
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent("pageshow", { persisted: true }),
    ),
  );
  await expect(page).toHaveURL(/\/establishment\/teacher$/);
  expect(await page.evaluate(() => localStorage.getItem("kalatty_token"))).toBe(
    "fixture-session",
  );
});
