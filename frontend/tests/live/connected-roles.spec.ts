import { test, expect } from "@playwright/test";
const paths: Record<string, string> = {
  learner: "/learn",
  creator: "/creator",
  student: "/establishment/student",
  teacher: "/establishment/teacher",
  pedagogy: "/establishment/pedagogy",
  admin: "/establishment/admin",
};
const api = process.env.KALATTY_QA_API_BASE_URL ?? "";
if (api !== "https://kalatty-backend-production.up.railway.app")
  throw Error(
    "Configurez explicitement le backend Kalatty autorisé pour les tests connectés.",
  );
let accounts: Record<string, { email: string; password: string }>;
try {
  accounts = JSON.parse(process.env.KALATTY_QA_ACCOUNTS ?? "");
} catch {
  throw Error("Configurez six comptes QA dédiés dans KALATTY_QA_ACCOUNTS.");
}
for (const [role, path] of Object.entries(paths)) {
  const account = accounts[role];
  if (
    !account ||
    typeof account.email !== "string" ||
    typeof account.password !== "string"
  )
    throw Error("Compte QA manquant pour le rôle " + role);
  test("parcours connecté en lecture : " + role, async ({ page, request }) => {
    const login = await request.post(api + "/auth/login", { data: account });
    if (!login.ok()) throw Error("Connexion QA refusée pour " + role);
    const session = await login.json();
    if (typeof session.token !== "string")
      throw Error("Session QA absente pour " + role);
    await page.addInitScript(
      (token) => localStorage.setItem("kalatty_token", token),
      session.token,
    );
    await page.goto("/dashboard");
    await expect(page).toHaveURL(new RegExp(path + "$"));
    await expect(page.locator("aside").first()).toBeVisible();
    const context = await request.get(
      api +
        (role === "learner" || role === "creator"
          ? "/dashboard"
          : "/campus/context"),
      { headers: { Authorization: "Bearer " + session.token } },
    );
    if (!context.ok()) throw Error("Contexte QA inaccessible pour " + role);
    const body = await context.json();
    expect(
      role === "learner" || role === "creator" ? body.role : body.campusRole,
    ).toBe(
      role === "learner" ? "student" : role === "creator" ? "teacher" : role,
    );
    // Only read existing records: no enrollment, message, attendance, payment or AI action.
    const search = await request.get(api + "/search", {
      params: {
        q: "formation",
        scope:
          role === "creator"
            ? "creator"
            : role === "learner"
              ? "learn"
              : "campus",
      },
      headers: { Authorization: "Bearer " + session.token },
    });
    expect(search.status()).toBe(200);
    expect(Array.isArray((await search.json()).results)).toBe(true);
  });
}
