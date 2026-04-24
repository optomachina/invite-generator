import fs from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const taskSlug = process.env.EVIDENCE_TASK || "manual";
const targetPath = process.env.EVIDENCE_PATH || "/";
const artifactDir = path.join(repoRoot, ".context", "artifacts", taskSlug);

function screenshotName(projectName: string): string {
  return projectName === "mobile" ? "mobile-final.png" : "desktop-final.png";
}

test("capture final state evidence", async ({ page }, testInfo) => {
  await fs.mkdir(artifactDir, { recursive: true });

  await page.goto(targetPath, { waitUntil: "networkidle" });
  await expect(page.locator("main").first()).toBeVisible();
  await page.screenshot({
    path: path.join(artifactDir, screenshotName(testInfo.project.name)),
    fullPage: true,
  });
});
