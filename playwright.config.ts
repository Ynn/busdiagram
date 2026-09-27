import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

// Use system Chromium locally for visual regression snapshots; in CI, use
// CHROMIUM_PATH or the browser installed by npx playwright install chromium.
const chromium =
  process.env.CHROMIUM_PATH ??
  (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["demo.spec.ts", "lifecycle.spec.ts", "site.spec.ts"],
  fullyParallel: false,
  reporter: "line",
  use: {
    headless: true,
    // Use a French browser locale to verify that first use still defaults to English; language tests switch explicitly.
    locale: "fr-FR",
    launchOptions: chromium ? { executablePath: chromium } : {},
  },
});
