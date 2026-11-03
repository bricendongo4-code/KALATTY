import { defineConfig } from "@playwright/test";
const base = process.env.KALATTY_QA_BASE_URL ?? "";
const url = new URL(base);
if (
  url.protocol !== "https:" ||
  !/^kalatty-frontend(?:-[a-zA-Z0-9-]+)?\.vercel\.app$/.test(url.hostname) ||
  url.username ||
  url.password ||
  url.port
)
  throw Error(
    "KALATTY_QA_BASE_URL doit désigner un déploiement HTTPS Kalatty.",
  );
export default defineConfig({
  testDir: "./tests/live",
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 60000,
  use: {
    baseURL: base,
    headless: true,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
});
