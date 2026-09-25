import { expect, test } from "@playwright/test";

test("les pages publiques et juridiques restent accessibles", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Kalatty/);
  await expect(page.getByRole("link", { name: "Confidentialité", exact: true }).first()).toBeVisible();
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Politique de confidentialité" })).toBeVisible();
  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "Conditions générales d’utilisation" })).toBeVisible();
  await page.goto("/cookies");
  await expect(page.getByRole("heading", { name: "Cookies et technologies similaires" })).toBeVisible();
});

test("un espace protégé redirige vers la connexion", async ({ page }) => {
  await page.goto("/creator");
  await expect(page).toHaveURL(/\/login\?redirect=%2Fcreator|\/login\?redirect=\/creator/);
  await expect(page.getByRole("heading", { name: /Heureux de te revoir/i })).toBeVisible();
});

test("la recherche par rôle fonctionne au clavier", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("kalatty_token", "e2e-token"));
  await page.route("http://localhost:4000/**", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "API simulée pour le test" }) }));
  await page.goto("/creator");
  const search = page.getByRole("combobox", { name: "Recherche globale" });
  await search.fill("vidéo");
  await page.getByRole("option", { name: /Studio vidéo/ }).click();
  await expect(page).toHaveURL(/\/creator\/studio/);
});

test("la recherche mobile ne crée aucun débordement horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem("kalatty_token", "e2e-token"));
  await page.route("http://localhost:4000/**", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "API simulée pour le test" }) }));
  await page.goto("/creator");
  await page.getByRole("button", { name: "Ouvrir la recherche" }).click();
  await page.getByRole("searchbox", { name: "Recherche globale" }).fill("apprenant");
  await expect(page.getByRole("option", { name: /Apprenants/ })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
