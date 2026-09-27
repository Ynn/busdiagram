import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEMO = pathToFileURL(resolve("demo/offline.html")).href;

const viz = (page: Page, title: string) =>
  page.locator("bus-diagram", {
    has: page.locator("h2", { hasText: title }),
  });

/** Deterministic driver: pauses the simulation and advances simulated time. */
const pause = (v: Locator) =>
  v.evaluate((el) => (el as unknown as { pause(): void }).pause());
const advance = (v: Locator, ms: number) =>
  v.evaluate(
    (el, dt) => (el as unknown as { advance(n: number): void }).advance(dt),
    ms,
  );
const simTime = (v: Locator) =>
  v.evaluate(
    (el) =>
      (el as unknown as { getState(): { timeMs: number } }).getState().timeMs,
  );
const pills = (v: Locator) =>
  v.evaluate((el) =>
    [...el.shadowRoot!.querySelectorAll<HTMLElement>(".pill")].map(
      (p) => `${p.style.left},${p.style.top}`,
    ),
  );

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  (page as unknown as { errors: string[] }).errors = errors;
});

test.afterEach(async ({ page }) => {
  expect((page as unknown as { errors: string[] }).errors).toEqual([]);
});

test("offline demo delivers a telegram before switching outputs on", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (r) => /^https?:/.test(r.url()) && external.push(r.url()));
  await page.goto(DEMO);
  const v = viz(page, "Control multiple outputs");
  await expect(v.locator(".card")).toHaveCount(2);
  await expect(v.locator("button.key")).toHaveCount(4);
  await expect(v.locator(".lamp")).toHaveCount(4);

  await v.locator("button.key", { hasText: "Key 3" }).click();
  // During transit, a marker is visible on the bus and no lamp has switched on yet.
  await expect(v.locator(".pill").first()).toBeVisible();
  await expect(v.locator(".lamp.on")).toHaveCount(0);
  await expect(v.locator(".lamp.on")).toHaveCount(4, { timeout: 5000 });
  await expect(v.locator(".mon tbody tr")).toHaveCount(1);
  await expect(v.locator(".mon tbody tr")).toContainText("1/1/2");
  expect(external).toEqual([]);
});

test("all scenarios and extension example load without error", async ({
  page,
}) => {
  await page.goto(DEMO);
  const all = page.locator("bus-diagram");
  await expect(all).toHaveCount(21);
  for (let i = 0; i < 21; i++) {
    await expect(all.nth(i).locator(".card").first()).toBeVisible();
    await expect(all.nth(i).locator(".err")).toHaveCount(0);
  }
});

test("telegram marker moves along its route; output waits for delivery, also with reduced motion", async ({
  page,
}) => {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    await page.emulateMedia({ reducedMotion });
    await page.goto(DEMO);
    const v = viz(page, "Control multiple outputs");
    await pause(v);
    await v.locator("button.key", { hasText: "Key 1" }).click();
    const seen: string[][] = [];
    for (const dt of [200, 500, 300, 300]) {
      await advance(v, dt); // 200: down to the bus; 700: on the bus; 1000 and 1300: up to the object and delivery
      seen.push(await pills(v));
    }
    expect(seen[0]!.length).toBeGreaterThan(0);
    expect(seen[1]!.length).toBeGreaterThan(0);
    expect(new Set(seen.slice(0, 3).flat()).size).toBe(
      seen.slice(0, 3).flat().length,
    );
    // At 1000 ms the telegram moves toward the object; the output has not responded yet.
    await advance(v, 0);
    expect(await simTime(v)).toBe(1300);
    await expect(v.locator(".lamp.on")).toHaveCount(2);
    await advance(v, 3000);
    await expect(v.locator(".pill")).toHaveCount(0);
  }
});

test("output stays off until the visible telegram arrives", async ({
  page,
}) => {
  await page.goto(DEMO);
  const v = viz(page, "Control multiple outputs");
  await pause(v);
  await v.locator("button.key", { hasText: "Key 1" }).click();
  await advance(v, 1299);
  await expect(v.locator(".lamp.on")).toHaveCount(0);
  expect((await pills(v)).length).toBeGreaterThan(0);
  await advance(v, 1);
  await expect(v.locator(".lamp.on")).toHaveCount(2);
});

test("short and long presses work with pointer and keyboard, including cancellation", async ({
  page,
}) => {
  await page.goto(DEMO);
  const v = viz(page, "Control roller shutters");
  const key2 = v.locator("button.key", { hasText: "Key 2" });
  const rows = v.locator(".mon tbody tr");

  await key2.click(); // short press
  await expect(rows).toHaveCount(1);
  await expect(rows.nth(0)).toContainText("2/2/1");

  const box = (await key2.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(800); // 500 ms real-time threshold
  await page.mouse.up();
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(1)).toContainText("2/1/1"); // one gesture: no short press after the long press

  await key2.focus();
  await page.keyboard.press("Enter");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(2)).toContainText("2/2/1");
  await page.keyboard.press("Shift+Enter");
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(3)).toContainText("2/1/1");
  // Ignore key repeat
  await page.keyboard.down("Enter");
  await page.keyboard.down("Enter");
  await page.keyboard.up("Enter");
  await expect(rows).toHaveCount(5);

  // pointercancel cancels a pending gesture without inventing a short press
  await key2.dispatchEvent("pointerdown", { pointerId: 7, bubbles: true });
  await key2.dispatchEvent("pointercancel", { pointerId: 7, bubbles: true });
  await page.waitForTimeout(700);
  await expect(rows).toHaveCount(5);
});

test("hidden tab suspends time without catch-up", async ({ page }) => {
  await page.goto(DEMO);
  const v = viz(page, "Timer, clock");
  await v.locator("button.key", { hasText: "Key 1" }).click();
  await page.waitForTimeout(300);
  const setHidden = (hidden: boolean) =>
    page.evaluate((h) => {
      Object.defineProperty(document, "hidden", {
        value: h,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    }, hidden);
  await setHidden(true);
  const before = await simTime(v);
  await page.waitForTimeout(1500);
  expect(await simTime(v)).toBeLessThanOrEqual(before + 120);
  await setHidden(false);
  await page.waitForTimeout(400);
  const after = await simTime(v);
  expect(after).toBeGreaterThan(before);
  expect(after).toBeLessThan(before + 1000);
});

test("miscalibrated shutter shows estimated and actual positions and motor command", async ({
  page,
}) => {
  await page.goto(DEMO);
  const v = viz(page, "estimated versus actual travel");
  await expect(v.locator(".est")).toContainText("Estimated");
  await expect(v.locator(".est")).toContainText("Motor");
  await pause(v);
  const field = v.locator(".numin input");
  await field.fill("50");
  await field.press("Enter");
  await advance(v, 1600 + 5000);
  await expect(v.locator(".est b.mv")).toHaveText("▼");
  await advance(v, 10000);
  await expect(v.locator(".est")).toContainText("50 %");
  await expect(v.locator(".shutter .foot")).toContainText("33%");
  await v.locator(".card", { hasText: "Shutter actuator" }).click();
  const info = v.locator(".info");
  await expect(info).toContainText("Estimated position");
  await expect(info).toContainText("50.196 %");
  await expect(info).toContainText("Actual position");
  await expect(info).toContainText("33.46");
  await expect(info).toContainText("Motor command");
  // Position feedback (the estimate) is visible in the monitor: 0x80.
  await advance(v, 1000);
  await expect(v.locator(".mon tbody tr").last()).toContainText("0x80");
});

test("disabled T and W flags show the route, unchanged output, and cause", async ({
  page,
}) => {
  await page.goto(DEMO);
  const v = viz(page, "W and T flags");
  await pause(v);
  await v.locator("button.key", { hasText: "Key 2" }).click();
  await advance(v, 3000);
  await expect(v.locator(".mon tbody tr")).toHaveCount(0);
  await expect(v.locator(".lamp.on")).toHaveCount(0);

  await v.locator("button.key", { hasText: "Key 1" }).click();
  await advance(v, 1000);
  expect((await pills(v)).length).toBeGreaterThan(0);
  await advance(v, 3000);
  await expect(v.locator(".lamp", { hasText: "L1" })).toHaveClass(/on/);
  await expect(v.locator(".lamp", { hasText: "L2" })).not.toHaveClass(/on/);
  await v.locator(".mon tbody tr").first().click();
  await expect(v.locator(".panel").last()).toContainText("ignored (W)");
  await v.locator(".card", { hasText: "Six-output switch" }).click();
  await expect(v.locator(".info")).toContainText("unused");
  await expect(v.locator(".info .flags")).toHaveCount(4);
});

test("classic script loads delayed switch and alternate view", async ({
  page,
}) => {
  await page.goto(DEMO);
  const v = viz(page, "delayed switch");
  await expect(v.locator(".err")).toHaveCount(0);
  await pause(v);
  await v.locator("button.key", { hasText: "Key 1" }).click();
  await advance(v, 3299);
  await expect(v.locator(".lamp.on")).toHaveCount(0);
  await advance(v, 1);
  await expect(v.locator(".lamp.on")).toHaveCount(1);
  await expect(v.locator('[title="LED strip on"]')).toHaveCount(1);
  await v.locator("button.key", { hasText: "Key 2" }).click();
  await advance(v, 3300);
  await expect(v.locator(".lamp.on")).toHaveCount(0);
  await expect(v.locator('[title="LED strip off"]')).toHaveCount(1);

  await v.evaluate((el) => {
    const component = el as HTMLElement & { load(data: unknown): void };
    component.lang = "fr";
    component.load(
      JSON.parse(
        document.querySelector(component.getAttribute("scenario")!)!
          .textContent!,
      ),
    );
  });
  await pause(v);
  await v.locator("button.key", { hasText: "Key 1" }).click();
  await advance(v, 1300);
  const notes = await v.evaluate((el) =>
    (
      el as unknown as { simulation: { journal: { message?: string }[] } }
    ).simulation.journal
      .filter((entry) => entry.message)
      .map((entry) => entry.message),
  );
  expect(notes).toContainEqual(expect.stringContaining("allumage prévu"));
});

test("priority override shows forced output and resumes stored toggle command", async ({
  page,
}) => {
  await page.goto(DEMO);
  const v = viz(page, "Force an output");
  await pause(v);
  const lamp = v.locator(".lamp", { hasText: "L4" });
  await v.locator("button.key", { hasText: "Key 4" }).click();
  await advance(v, 3000);
  await expect(lamp).toHaveClass(/on/);
  await v.locator("button.key", { hasText: "Key 3" }).click(); // short press forces off
  await advance(v, 3000);
  await expect(lamp).not.toHaveClass(/on/);
  await expect(lamp).toContainText("forced off");
  await v.locator("button.key", { hasText: "Key 4" }).click();
  await advance(v, 3000);
  await expect(lamp).not.toHaveClass(/on/);
  await expect(v.locator(".mon tbody tr").last()).toContainText("1/1/4");
  await v.locator("button.key", { hasText: "Key 3" }).focus();
  await page.keyboard.press("Shift+Enter"); // long press ends the override
  await advance(v, 3000);
  await expect(lamp).toHaveClass(/on/);
  await expect(lamp).not.toContainText("forced");
});

test("step mode explains transmission and each delivery stage in the banner", async ({
  page,
}) => {
  await page.goto(DEMO);
  const v = viz(page, "KNX topology");
  await v.locator("button", { hasText: "Step by step" }).click();
  await page.waitForTimeout(100);
  const t0 = await simTime(v);
  await v.locator("button.key", { hasText: "Key 3" }).click();
  const banner = v.locator(".banner");
  await expect(banner).toContainText("1.1.10 sends 1/1/1 = 1");
  expect(await simTime(v)).toBe(t0);
  await banner.locator("button", { hasText: "Next" }).click();
  await expect(banner).toContainText(/Living room\s*: relay closed/);
  expect(await simTime(v)).toBe(t0 + 1300);
  await banner.locator("button", { hasText: "Next" }).click();
  await expect(banner).toContainText("sends 1/4/1");
  await banner.locator("button", { hasText: "Next" }).click();
  await expect(banner).toContainText("Line coupler 1.1.0");
  await expect(banner).toContainText("filtered");
});

for (const width of [1280, 768]) {
  test(`reference screenshots at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(DEMO);
    const all = page.locator("bus-diagram");
    await expect(all).toHaveCount(21);
    // Heating changes autonomously with temperature; freeze every diagram at t = 0 before screenshots.
    await page.evaluate(() =>
      document.querySelectorAll("bus-diagram").forEach((el) => {
        const v = el as unknown as { pause(): void; reset(): void };
        v.pause();
        v.reset();
        v.pause();
      }),
    );
    for (let i = 0; i < 21; i++) {
      const stage = all.nth(i).locator(".stage-wrap");
      await stage.scrollIntoViewIfNeeded();
      await expect(stage).toHaveScreenshot(`scenario-${i}-${width}.png`, {
        maxDiffPixelRatio: 0.001,
      });
    }
    if (width === 768) {
      // The large diagram scrolls instead of shrinking until it is unreadable.
      const topo = viz(page, "KNX topology");
      const sc = await topo.evaluate((el) => {
        const s = el.shadowRoot!.querySelector(".scroller")!;
        return { scroll: s.scrollWidth, client: s.clientWidth };
      });
      expect(sc.scroll).toBeGreaterThan(sc.client);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(768);
    }
  });
}

test("simulated clock badge shows the time and can be set", async ({
  page,
}) => {
  await page.goto(DEMO);
  const v = viz(page, "Time schedule");
  await pause(v);
  const clock = v.locator(".clock");
  await expect(clock).toContainText(/\d\d:\d\d:\d\d/);
  await clock.getByRole("button", { name: "Set time" }).click();
  await clock.locator("input").fill("2026-10-01T06:59:30");
  await clock.getByRole("button", { name: "Set", exact: true }).click();
  await expect(clock).toContainText("06:59:30");
  await advance(v, 1000);
  await expect(clock).toContainText("07:00:30");
  await advance(v, 4000);
  // 07:00 on a weekday: the time switch turns the corridor light on.
  await expect(v.locator(".lamp.on")).toHaveCount(1);
});

test("diagram area enters and leaves full screen", async ({ page }) => {
  await page.goto(DEMO);
  const v = viz(page, "USB interface panel");
  const isFull = () =>
    v.evaluate((el) => el.shadowRoot!.fullscreenElement?.className ?? null);
  await v.getByRole("button", { name: "Full screen" }).click();
  await expect.poll(isFull).toBe("stage-wrap");
  const box = await v
    .locator(".stage-size")
    .evaluate((e) => e.getBoundingClientRect().width);
  expect(box).toBeGreaterThan(900);
  await v.getByRole("button", { name: "Exit full screen" }).click();
  await expect.poll(isFull).toBeNull();
});

test("group monitor opens in a larger dialog and closes with the button or Escape", async ({
  page,
}) => {
  await page.goto(DEMO);
  const v = viz(page, "USB interface panel");
  const usb = v.locator(".usb");
  await usb.locator("select").first().selectOption("1/1/1");
  await usb.getByRole("button", { name: "Write" }).click();
  await expect(v.locator(".mon tbody tr").first()).toBeVisible({
    timeout: 8000,
  });
  const dialog = v.locator("dialog.enlarged");
  await expect(dialog).toHaveCount(0);
  await v.getByRole("button", { name: "Enlarge the monitor" }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".mon tbody tr").first()).toContainText("1/1/1");
  const size = await dialog.evaluate((d) => d.getBoundingClientRect().width);
  expect(size).toBeGreaterThan(700);
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toHaveCount(0);
  await v.getByRole("button", { name: "Enlarge the monitor" }).click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("USB interface panel writes and reads through USB; only the R-flag object responds", async ({
  page,
}) => {
  await page.goto(DEMO);
  const v = viz(page, "USB interface panel");
  const usb = v.locator(".usb");
  await expect(usb).toContainText("1.1.255");
  await usb.locator("select").first().selectOption("1/1/1");
  await usb.getByRole("button", { name: "Write" }).click();
  await expect(v.locator(".lamp.on")).toHaveCount(1, { timeout: 8000 });
  await usb.locator("select").first().selectOption("1/4/1");
  await usb.getByRole("button", { name: "Read" }).click();
  await expect(usb.locator(".usb-out")).toContainText("Response from 1.2.1", {
    timeout: 8000,
  });
  await usb.locator("select").first().selectOption("1/1/1");
  await usb.getByRole("button", { name: "Read" }).click();
  await expect(usb.locator(".usb-out")).toContainText("No response for 1/1/1", {
    timeout: 10000,
  });
});

test("DALI gateway dims on long press, stops on release, and reports ballast faults", async ({
  page,
}) => {
  await page.goto(DEMO);
  const v = viz(page, "KNX/DALI gateway");
  const key = v.locator("button.key", { hasText: "Key 1" });
  await key.scrollIntoViewIfNeeded();
  const box = (await key.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(2200);
  await page.mouse.up();
  const foot = v.locator(".dali").first().locator(".dali-foot span");
  await expect(foot).not.toHaveText("0 %", { timeout: 8000 });
  await page.waitForTimeout(3000);
  const level = Number((await foot.innerText()).replace(/\D/g, ""));
  expect(level).toBeGreaterThan(10);
  expect(level).toBeLessThan(100);
  // Ballast A5 fault: on the next poll, the gateway sends 1 on 1/7/2 and 1/7/0.
  await v.locator(".dali-ecg", { hasText: "A5" }).click();
  await expect(v.locator(".mon")).toContainText("1/7/2", { timeout: 8000 });
  await expect(v.locator(".mon")).toContainText("1/7/0");
});

test("heating room panel opens a window and activates frost protection through contact 1.019", async ({
  page,
}) => {
  await page.goto(DEMO);
  const v = viz(page, "Room-by-room heating");
  const room = v.locator(".room", { hasText: "Living room" });
  await room.scrollIntoViewIfNeeded();
  await expect(room).toContainText("Comfort · 21.0 °C");
  await room.getByRole("button", { name: "Open window" }).click();
  await expect(room).toContainText("Protection · 7.0 °C", { timeout: 8000 });
  await expect(v.locator(".mon")).toContainText("3/3/1");
  // The thermostat display follows the mode.
  await expect(v.locator(".screen").first()).toContainText("7.0");
  await room.getByRole("button", { name: "Close window" }).click();
  await expect(room).toContainText("Comfort · 21.0 °C", { timeout: 8000 });
});
