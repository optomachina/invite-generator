import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "..", "..");
const taskSlug = process.env.EVIDENCE_TASK || "manual";
const artifactDir = path.join(repoRoot, ".context", "artifacts", taskSlug);
const outputDir = path.join(artifactDir, "playwright-output");
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3001";
const videoMode = process.env.EVIDENCE_VIDEO === "1" ? "on" : "retain-on-failure";

export default defineConfig({
  testDir: "./tests",
  testMatch: [
    "**/*.spec.ts",
    "**/*.spec.tsx",
    "**/*.capture.ts",
    "**/*.capture.tsx",
  ],
  outputDir,
  fullyParallel: false,
  retries: 1,
  reporter: "line",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: "on-first-retry",
    video: videoMode,
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 14"],
        browserName: "webkit",
      },
    },
  ],
  webServer: {
    command: "bun run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
