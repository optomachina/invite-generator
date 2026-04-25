import fs from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

const taskSlug = process.env.EVIDENCE_TASK || "manual";
const targetPath = process.env.EVIDENCE_PATH || "/";

function screenshotName(projectName: string): string {
  return projectName === "mobile" ? "mobile-final.png" : "desktop-final.png";
}

test("capture final state evidence", async ({ page }, testInfo) => {
  const repoRoot = path.resolve(testInfo.config.rootDir, "..", "..", "..");
  const artifactDir = path.join(repoRoot, ".context", "artifacts", taskSlug);
  await fs.mkdir(artifactDir, { recursive: true });

  await page.goto(targetPath, { waitUntil: "domcontentloaded" });
  await expect(page.locator("main").first()).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: /Invite/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Generate/i })).toBeVisible();
  await page.screenshot({
    path: path.join(artifactDir, screenshotName(testInfo.project.name)),
    fullPage: true,
  });
});
