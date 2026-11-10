import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.TEST_BASE_URL || "http://127.0.0.1:5173");
  await page.locator("canvas").waitFor();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Graphics preset").selectOption("Low");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Enter the workshop" }).click();
  await page.getByRole("button", { name: "Start a new build" }).click();
  const before = await page.locator(".transform-readout").textContent();
  await page.getByRole("button", { name: "Drag part", exact: true }).click();
  await page.screenshot({ path: "artifacts/drag-before.png" });
  await page.mouse.move(970, 500);
  await page.mouse.down();
  await page.mouse.move(870, 500, { steps: 6 });
  await page.mouse.up();
  await page.waitForFunction(
    (before) =>
      document.querySelector(".transform-readout")?.textContent !== before,
    before,
  );
  const after = await page.locator(".transform-readout").textContent();
  assert.notEqual(
    after,
    before,
    "Pointer drag must update the selected component position",
  );
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  const assembly = await page.evaluate(
    () => JSON.parse(localStorage.getItem("formworks.save.v1")).assembly,
  );
  await page.getByLabel("Assembly mode").selectOption("Inspection");
  await page.keyboard.press("Control+z");
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  const inspected = await page.evaluate(
    () => JSON.parse(localStorage.getItem("formworks.save.v1")).assembly,
  );
  assert.deepEqual(
    inspected,
    assembly,
    "Inspection mode must reject keyboard undo",
  );
  await page.getByLabel("Assembly mode").selectOption("Free assembly");
  await page.getByRole("button", { name: "Move right", exact: true }).click();
  assert.notEqual(
    await page.locator(".transform-readout").textContent(),
    after,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Pointer dragging, precision movement, and read-only inspection keyboard checks passed.",
  );
} finally {
  await browser.close();
}
