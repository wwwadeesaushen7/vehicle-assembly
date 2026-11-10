import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
try {
  const context = await browser.newContext({
    viewport: { width: 1024, height: 720 },
    hasTouch: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.TEST_BASE_URL || "http://127.0.0.1:4173");
  await page.locator("canvas").waitFor();
  await page.evaluate(() => navigator.serviceWorker.ready);

  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page.getByRole("button", { name: "Enter the workshop" }).click();
  await page.getByRole("button", { name: "Start a new build" }).click();
  await page.locator("canvas").waitFor();
  await page.getByRole("button", { name: "Guide to mount" }).click();
  await page.getByRole("button", { name: "Snap", exact: true }).click();
  await page.getByRole("button", { name: "Tighten next fastener" }).click();
  assert.equal(await page.locator(".bolt-dots .tightened").count(), 1);
  assert.deepEqual(errors, []);
  console.log(
    "Production PWA: service worker activated, offline reload, WebGL canvas and assembly interaction passed.",
  );
} finally {
  await browser.close();
}
