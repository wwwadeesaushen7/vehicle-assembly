import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:5173";
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
const errors = [];
async function record(page) {
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
}
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(30000);
await record(page);
try {
  if (process.env.TEST_SUITE !== "mobile") {
    await page.goto(base);
    await page.locator("canvas").waitFor();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByLabel("Graphics preset").selectOption("Low");
    await page.getByRole("button", { name: "Close dialog" }).click();
    await page.screenshot({ path: "artifacts/home.png" });
    await page.getByRole("button", { name: "Enter the workshop" }).click();
    await page.getByRole("button", { name: "Start a new build" }).click();
    await page.getByRole("button", { name: "Tighten next fastener" }).click();
    await page.getByRole("status").filter({ hasText: "13 cm" }).waitFor();
    await page.getByRole("button", { name: "Guide to mount" }).click();
    await page.getByRole("button", { name: "Rotate part right" }).click();
    await page.getByRole("button", { name: "Snap", exact: true }).click();
    await page
      .getByRole("status")
      .filter({ hasText: "Rotate the part" })
      .waitFor();
    await page.getByRole("button", { name: "Rotate part left" }).click();
    await page.getByRole("button", { name: "Snap", exact: true }).click();
    await page
      .getByRole("button", { name: "Select Hand", exact: true })
      .click();
    await page.getByRole("button", { name: "Tighten next fastener" }).click();
    await page
      .getByRole("status")
      .filter({ hasText: "Select the wrench" })
      .waitFor();
    const rows = page.locator(".part-row");
    const names = await rows.locator("strong").allTextContents();
    assert.equal(names.length, 26);
    for (let i = 1; i < names.length; i++) {
      await rows
        .filter({ has: page.getByText(names[i], { exact: true }) })
        .click();
      await page.getByRole("button", { name: "Guide to mount" }).click();
      await page.getByRole("button", { name: "Snap", exact: true }).click();
      const tool = (
        await page.locator(".fastener-info > span").textContent()
      ).trim();
      await page
        .getByRole("button", { name: `Select ${tool}`, exact: true })
        .click();
      const count = await page.locator(".bolt-dots > span").count();
      for (let b = 0; b < count; b++)
        await page
          .getByRole("button", {
            name:
              b === count - 1 ? "Fasten & install" : "Tighten next fastener",
            exact: true,
          })
          .click();
      assert.match(await page.locator(".part-state").innerText(), /Installed/);
      console.log(`Installed ${i + 1}/26: ${names[i]}`);
    }
    assert.match(await page.locator(".progress-block").innerText(), /100/);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    assert.match(await page.locator(".progress-block").innerText(), /96/);
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await page
      .getByRole("button", { name: "Save project", exact: true })
      .click();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByLabel("Floor finish").selectOption("epoxy");
    await page.getByLabel("Wall color", { exact: true }).fill("#334455");
    await page.getByLabel("Graphics preset").selectOption("Medium");
    await page.getByRole("button", { name: "Save now", exact: true }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export save" }).click();
    const download = await downloadPromise;
    await download.saveAs("artifacts/save-export.json");
    await page.getByRole("button", { name: "Close dialog" }).click();
    await page.getByRole("button", { name: "Exploded view" }).click();
    await page.screenshot({ path: "artifacts/exploded.png" });
    await page.getByRole("button", { name: "Exploded view" }).click();
    await page.getByRole("button", { name: "Vehicle diagnostics" }).click();
    await page
      .getByRole("button", { name: "Start engine", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Save finished vehicle to collection" })
      .click();
    await page.getByRole("button", { name: "Enter test area" }).click();
    await page.keyboard.down("w");
    await page.waitForTimeout(1200);
    await page.keyboard.up("w");
    assert.notEqual(
      (await page.locator(".drive-hud strong").textContent()).trim(),
      "0km/h",
    );
    await page.getByRole("button", { name: "Return to workshop" }).click();
    await page
      .getByRole("button", { name: "Save project", exact: true })
      .click();
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("formworks.save.v1")),
    );
    assert.equal(saved.assembly.installed.length, 26);
    assert.equal(saved.preferences.garage.floor, "epoxy");
    assert.equal(saved.preferences.garage.wall, "#334455");
    await page.screenshot({ path: "artifacts/workshop.png" });
    await page.reload();
    await page
      .getByRole("button", { name: "Resume project", exact: true })
      .click();
    assert.match(await page.locator(".progress-block").innerText(), /100/);
    // Removing a parent with attached dependencies must be rejected in the UI.
    await rows
      .filter({ has: page.getByText("Glazing & roof", { exact: true }) })
      .click();
    await page
      .getByRole("button", { name: "Select Screwdriver", exact: true })
      .click();
    await page.getByRole("button", { name: "Detach component" }).click();
    await page
      .getByRole("status")
      .filter({ hasText: "Remove Mirrors & trim first." })
      .waitFor();
    await rows
      .filter({ has: page.getByText("Mirrors & trim", { exact: true }) })
      .click();
    await page.getByRole("button", { name: "Detach component" }).click();
    assert.match(await page.locator(".progress-block").innerText(), /96/);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    assert.match(await page.locator(".progress-block").innerText(), /100/);
    // Confirm camera is interactive by comparing the actual WebGL canvas pixels.
    const canvas = page.locator("canvas");
    const before = await canvas.screenshot();
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width / 2 + 100,
      box.y + box.height / 2 + 50,
      { steps: 8 },
    );
    await page.mouse.up();
    await page.waitForTimeout(400);
    const after = await canvas.screenshot();
    assert.notDeepEqual(before, after);
    await page
      .getByRole("button", { name: "Save project", exact: true })
      .click();
    const cameraAfterOrbit = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("formworks.save.v1")).preferences
          .camera,
    );
    assert.notEqual(cameraAfterOrbit.alpha, saved.preferences.camera.alpha);
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Formworks home" }).click();
    await page.getByRole("button", { name: "Enter the workshop" }).click();
    await page.getByRole("button", { name: "Start a new build" }).click();
    assert.match(await page.locator(".progress-block").innerText(), /1 of 26/);
    await page.getByRole("button", { name: "My collection" }).click();
    await page.getByRole("button", { name: "Open finished build" }).click();
    assert.match(await page.locator(".progress-block").innerText(), /100/);
    assert.equal(
      await page.getByLabel("Assembly mode").inputValue(),
      "Inspection",
    );
    assert.equal(
      await page.getByRole("button", { name: "Detach component" }).count(),
      0,
    );
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page
      .locator("input[type=file]")
      .setInputFiles("artifacts/save-export.json");
    await page
      .getByRole("status")
      .filter({ hasText: "Backup restored." })
      .waitFor();
    await page.getByRole("button", { name: "Close dialog" }).click();
    console.log(
      "Desktop: assembly, validation, undo/redo, garage, diagnostics, driving, export and save/reload passed.",
    );
    assert.deepEqual(errors, []);
  }
  const mobile = await browser.newContext({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  const touch = await mobile.newPage();
  await record(touch);
  await touch.goto(base);
  await touch.locator("canvas").waitFor();
  await touch.getByRole("button", { name: "Enter the workshop" }).tap();
  await touch.getByRole("button", { name: "Start a new build" }).tap();
  await touch.getByRole("button", { name: "Assembly", exact: true }).tap();
  await touch.getByRole("button", { name: "Guide to mount" }).tap();
  await touch.getByRole("button", { name: "Snap", exact: true }).tap();
  await touch.getByRole("button", { name: "Tighten next fastener" }).tap();
  await touch.getByRole("button", { name: "Close assembly" }).tap();
  await touch.screenshot({ path: "artifacts/mobile-landscape.png" });
  assert.equal(
    await touch.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await touch.getByRole("button", { name: "Save project", exact: true }).tap();
  const touchBefore = await touch.evaluate(
    () =>
      JSON.parse(localStorage.getItem("formworks.save.v1")).preferences.camera,
  );
  const cdp = await mobile.newCDPSession(touch);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 350, y: 170 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: 430, y: 190 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: 330, y: 170, id: 1 },
      { x: 430, y: 170, id: 2 },
    ],
  });
  // The first move establishes Babylon's pinch baseline; subsequent moves zoom.
  for (let step = 1; step <= 8; step++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: 330 - step * 5, y: 170, id: 1 },
        { x: 430 + step * 5, y: 170, id: 2 },
      ],
    });
    await touch.waitForTimeout(50);
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await touch.waitForTimeout(400);
  await touch.getByRole("button", { name: "Save project", exact: true }).tap();
  const touchAfter = await touch.evaluate(
    () =>
      JSON.parse(localStorage.getItem("formworks.save.v1")).preferences.camera,
  );
  assert.notEqual(touchAfter.alpha, touchBefore.alpha);
  assert.ok(
    touchAfter.radius < touchBefore.radius * 0.85,
    "Pinching outward must visibly zoom in",
  );
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: 300, y: 180, id: 1 },
      { x: 420, y: 180, id: 2 },
    ],
  });
  for (let step = 1; step <= 8; step++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: 300 + step * 4, y: 180 + step * 2, id: 1 },
        { x: 420 + step * 4, y: 180 + step * 2, id: 2 },
      ],
    });
    await touch.waitForTimeout(40);
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await touch.getByRole("button", { name: "Save project", exact: true }).tap();
  const panAfter = await touch.evaluate(
    () =>
      JSON.parse(localStorage.getItem("formworks.save.v1")).preferences.camera,
  );
  assert.ok(
    Math.hypot(...panAfter.target.map((v, i) => v - touchAfter.target[i])) >
      0.1,
    "Two-finger panning must move the camera target",
  );
  await touch.setViewportSize({ width: 390, height: 844 });
  await touch.screenshot({ path: "artifacts/mobile-portrait.png" });
  assert.equal(
    await touch.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  console.log(
    "Mobile emulation: landscape/portrait layout, touch assembly, orbit, pinch zoom and two-finger pan verified.",
  );
  assert.deepEqual(errors, []);
  console.log("No browser console errors or uncaught exceptions.");
} finally {
  await browser.close();
}
