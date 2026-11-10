import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1024, height: 720 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(process.env.TEST_BASE_URL || "http://127.0.0.1:4173");
  await page.locator("canvas").waitFor();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  for (const quality of ["Low", "Medium", "High", "Ultra", "Low"]) {
    await page.getByLabel("Graphics preset").selectOption(quality);
    await page.waitForTimeout(700);
    console.log(`Graphics preset: ${quality}`);
  }
  await page.getByRole("button", { name: "Close dialog" }).click();
  const pixels = await page
    .locator("canvas")
    .evaluate((c) => c.toDataURL().length);
  assert.ok(pixels > 15000, "The rendered canvas must contain scene detail");
  assert.deepEqual(errors, []);
  console.log("All four graphics presets rendered without browser errors.");
} finally {
  await browser.close();
}
