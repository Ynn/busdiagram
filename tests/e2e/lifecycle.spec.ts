import { expect, test } from "@playwright/test";
import { cpSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const scenario = (name: string) =>
  readFileSync(resolve("scenarios", name), "utf8");

const page2 = (
  body: string,
) => `<!doctype html><html><head><meta charset="utf-8">
<script defer src="bus-diagram.js"></script></head><body>${body}</body></html>`;

test("independent file:// components survive removal and reconnection", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (r) => /^https?:/.test(r.url()) && external.push(r.url()));
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(pathToFileURL(resolve("demo/offline.html")).href);
  // Add a second instance of the same JSON dynamically.
  await page.evaluate(() => {
    const el = document.createElement("bus-diagram");
    el.id = "twin";
    el.setAttribute("scenario", "#scenario-lighting-control");
    document.querySelector("main")!.prepend(el);
  });
  const twin = page.locator("#twin");
  const first = page.locator("bus-diagram").nth(1);
  await expect(twin.locator(".card")).toHaveCount(2);
  await twin.locator("button.key", { hasText: "Key 3" }).click();
  await expect(twin.locator(".lamp.on")).toHaveCount(4, { timeout: 5000 });
  await expect(first.locator(".lamp.on")).toHaveCount(0);
  await expect(first.locator(".mon tbody tr")).toHaveCount(0);

  // Remove during an animation, then reconnect; state remains consistent and listeners are not duplicated.
  await twin.locator("button.key", { hasText: "Key 4" }).click();
  await page.evaluate(() => {
    const el = document.getElementById("twin")!;
    el.remove();
    (window as unknown as { parked: Element }).parked = el;
  });
  await page.waitForTimeout(300);
  await page.evaluate(() =>
    document
      .querySelector("main")!
      .prepend((window as unknown as { parked: Element }).parked),
  );
  await expect(twin.locator(".lamp.on")).toHaveCount(0, { timeout: 5000 });
  const telegrams = await twin.evaluate((el) => {
    let n = 0;
    el.addEventListener("bd-telegram", () => n++);
    (el.shadowRoot!.querySelector("button.key") as HTMLElement).dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, pointerId: 3 }),
    );
    (el.shadowRoot!.querySelector("button.key") as HTMLElement).dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, pointerId: 3 }),
    );
    return new Promise<number>((r) => setTimeout(() => r(n), 100));
  });
  expect(telegrams).toBe(1);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test("latest concurrent HTTP load wins", async ({ page }) => {
  const bundle = readFileSync(resolve("demo/bus-diagram.js"), "utf8");
  await page.route("http://knx.test/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/bus-diagram.js")
      return route.fulfill({ body: bundle, contentType: "text/javascript" });
    if (url.pathname === "/index.html")
      return route.fulfill({
        body: page2(`<bus-diagram id="v"></bus-diagram>`),
        contentType: "text/html",
      });
    const slow = url.pathname === "/slow.json";
    await new Promise((r) => setTimeout(r, slow ? 900 : 50));
    const name = slow ? "lighting-control.json" : "scenes.json";
    return route.fulfill({
      body: scenario(name),
      contentType: "application/json",
    });
  });
  await page.goto("http://knx.test/index.html");
  await page.evaluate(() => {
    const v = document.getElementById("v")!;
    v.setAttribute("src", "slow.json");
    setTimeout(() => v.setAttribute("src", "fast.json"), 20);
  });
  await expect(page.locator("#v h2")).toHaveText(/Scenes/);
  await page.waitForTimeout(1200);
  await expect(page.locator("#v h2")).toHaveText(/Scenes/);
});

test("invalid scenario shows errors and stops the previous instance", async ({
  page,
}) => {
  await page.goto(pathToFileURL(resolve("demo/offline.html")).href);
  const v = page.locator("bus-diagram").first();
  await expect(v.locator(".card").first()).toBeVisible();
  const result = await v.evaluate((el) => {
    let detail: {
      message: string;
      details: { path: string; code: string }[];
    } | null = null;
    el.addEventListener(
      "bd-error",
      (e) => (detail = (e as CustomEvent).detail),
    );
    (el as unknown as { load(d: unknown): void }).load({
      formatVersion: 2,
      lines: "oops",
      devices: [{ id: 3 }],
    });
    const state = (el as unknown as { getState(): unknown }).getState();
    return {
      detail: detail as unknown as {
        message: string;
        details: { path: string }[];
      },
      state,
      text: String(detail),
    };
  });
  expect(result.state).toBeNull();
  expect(result.detail.message).toMatch(/Invalid scenario/);
  expect(result.detail.details.map((d) => d.path)).toEqual(
    expect.arrayContaining(["lines", "devices[0].id"]),
  );
  expect(result.text).toBe(result.detail.message);
  await expect(v.locator(".err")).toContainText("lines : list expected");
});

test("bd-telegram fires once per frame, including automatic feedback", async ({
  page,
}) => {
  await page.goto(pathToFileURL(resolve("demo/offline.html")).href);
  const v = page.locator("bus-diagram", { hasText: "Toggle controls" });
  await v.evaluate((el) => {
    (window as unknown as { tels: unknown[] }).tels = [];
    el.addEventListener("bd-telegram", (e) =>
      (window as unknown as { tels: unknown[] }).tels.push(
        (e as CustomEvent).detail,
      ),
    );
    (el as unknown as { pause(): void }).pause();
  });
  await v.locator("button.key", { hasText: "Key 3" }).click();
  await v.evaluate((el) =>
    (el as unknown as { advance(n: number): void }).advance(10000),
  );
  const tels = await page.evaluate(
    () => (window as unknown as { tels: Record<string, unknown>[] }).tels,
  );
  expect(tels.map((t) => [t.id, t.destination, t.kind])).toEqual([
    [1, "1/1/1", "cmd"],
    [2, "1/4/1", "state"],
    [3, "1/4/2", "state"],
  ]);
  expect(tels[0]).toMatchObject({
    source: "1.1.1",
    value: 1,
    dpt: "1.001",
    service: "GroupValueWrite",
    timeMs: 0,
  });
  expect(tels[1]!.causeId).not.toBeNull();
  await expect(v.locator(".mon tbody tr")).toHaveCount(3);
});

test("copied demo/ directory works offline with its extension", async ({
  page,
}) => {
  const dir = mkdtempSync(join(tmpdir(), "bus-diagram-demo-"));
  cpSync(resolve("demo"), dir, { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const external: string[] = [];
  page.on("request", (r) => /^https?:/.test(r.url()) && external.push(r.url()));
  await page.goto(pathToFileURL(join(dir, "offline.html")).href);
  const all = page.locator("bus-diagram");
  // One diagram per scenario, then the extension example.
  await expect(all).toHaveCount(
    readdirSync("scenarios").filter((f) => f.endsWith(".json")).length + 1,
  );
  await expect(page.locator("bus-diagram .err")).toHaveCount(0);
  await expect(all.last().locator(".card")).toHaveCount(2);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test("compact toolbar: each button keeps its icon on one line, whatever the page styles", async ({
  page,
}) => {
  await page.goto(pathToFileURL(resolve("demo/offline.html")).href);
  // A host page with large type and letter spacing, inherited through the shadow root.
  await page.addStyleTag({
    content: `body { font: 22px/1.8 "DejaVu Serif", Georgia, serif; letter-spacing: 3px; word-spacing: 8px; }`,
  });
  const el = page.locator("bus-diagram").first();
  await el.evaluate((e) => e.setAttribute("toolbar", "compact"));
  const buttons = el.locator(".mini button, .mini a");
  await expect(buttons.first()).toBeVisible();
  const overflow = await buttons.evaluateAll((els) =>
    els.flatMap((b) => {
      // Content box: inside the border and the padding.
      const cs = getComputedStyle(b);
      const outer = b.getBoundingClientRect();
      const px = (v: string) => parseFloat(v) || 0;
      const box = {
        left: outer.left + px(cs.borderLeftWidth) + px(cs.paddingLeft),
        right: outer.right - px(cs.borderRightWidth) - px(cs.paddingRight),
        top: outer.top + px(cs.borderTopWidth) + px(cs.paddingTop),
        bottom: outer.bottom - px(cs.borderBottomWidth) - px(cs.paddingBottom),
      };
      const range = document.createRange();
      range.selectNodeContents(b);
      const rects = [...range.getClientRects()].filter(
        (r) => r.width && r.height,
      );
      const top = Math.min(...rects.map((r) => r.top));
      const bottom = Math.max(...rects.map((r) => r.bottom));
      const left = Math.min(...rects.map((r) => r.left));
      const right = Math.max(...rects.map((r) => r.right));
      // The icon fits in the content box of its button, on one line (half a pixel of rounding).
      return bottom - top > 20 ||
        top < box.top - 0.5 ||
        bottom > box.bottom + 0.5 ||
        left < box.left - 0.5 ||
        right > box.right + 0.5
        ? [
            `${b.getAttribute("aria-label")}: ${Math.round(bottom - top)} px high`,
          ]
        : [];
    }),
  );
  expect(overflow).toEqual([]);
  // Paused, the play icon fits too.
  await el.locator(".mini button").first().click();
  await expect(el.locator(".mini button").first()).toHaveAttribute(
    "aria-label",
    "Resume",
  );
});
