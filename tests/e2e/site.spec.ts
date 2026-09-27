import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DOCS = resolve("docs");
const url = (p: string) => {
  const [file, hash] = p.split("#");
  return (
    pathToFileURL(join(DOCS, file!)).href +
    (hash !== undefined ? `#${hash}` : "")
  );
};

function htmlPages(dir = DOCS): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return f === "assets" ? [] : htmlPages(p);
    return f.endsWith(".html") ? [relative(DOCS, p)] : [];
  });
}

const watch = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`${page.url()} : ${e.message}`));
  page.on(
    "console",
    (m) => m.type() === "error" && errors.push(`${page.url()} : ${m.text()}`),
  );
  const external: string[] = [];
  page.on("request", (r) => /^https?:/.test(r.url()) && external.push(r.url()));
  return { errors, external };
};

test("documentation has valid internal links and anchors", () => {
  const pages = htmlPages();
  expect(pages.length).toBeGreaterThan(40);
  const broken: string[] = [];
  for (const p of pages) {
    const html = readFileSync(join(DOCS, p), "utf8");
    for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const link = m[1]!;
      if (/^(https?:|mailto:|data:|javascript:)/.test(link)) continue;
      const [file, anchor] = link.split("#");
      const target = file
        ? resolve(dirname(join(DOCS, p)), file)
        : join(DOCS, p);
      if (!existsSync(target)) {
        broken.push(`${p} → ${link}`);
        continue;
      }
      if (
        anchor &&
        target.endsWith(".html") &&
        !/^(d|json|template)=/.test(anchor)
      ) {
        const t = readFileSync(target, "utf8");
        if (!t.includes(`id="${anchor}"`))
          broken.push(`${p} → ${link} (anchor)`);
      }
    }
  }
  const search = JSON.parse(
    readFileSync(join(DOCS, "assets/search-index.js"), "utf8")
      .replace(/^window\.BUSDIAGRAM_SEARCH=/, "")
      .replace(/;\s*$/, ""),
  ) as { u: string; h: [string, string][] }[];
  for (const entry of search) {
    const route = entry.u.endsWith("/")
      ? `${entry.u}index.html`
      : entry.u || "index.html";
    const target = join(DOCS, route);
    if (!existsSync(target)) {
      broken.push(`search → ${entry.u}`);
      continue;
    }
    const html = readFileSync(target, "utf8");
    for (const [, id] of entry.h)
      if (!html.includes(`id="${id}"`))
        broken.push(`search → ${entry.u}#${id}`);
  }
  expect(search).toHaveLength(63);
  expect(broken).toEqual([]);
});

test("offline search opens a generated heading", async ({ page }) => {
  const w = watch(page);
  await page.goto(url("index.html"));
  await page
    .getByRole("searchbox", { name: "Search documentation" })
    .fill("thermal model");
  const result = page.locator(
    '.search .results a[href$="guide/hvac.html#rooms-and-thermal-model"]',
  );
  await expect(result).toBeVisible();
  await result.click();
  await expect(page.locator("#rooms-and-thermal-model")).toBeVisible();
  expect(w.errors).toEqual([]);
  expect(w.external).toEqual([]);
});

test("documentation pages open offline without errors and load their diagrams", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const w = watch(page);
  for (const p of htmlPages().filter(
    (x) => !x.startsWith("designer") && x !== "player.html",
  )) {
    await page.goto(url(p));
    await page.waitForTimeout(150);
    const bad = await page.evaluate(
      () =>
        [...document.querySelectorAll("bus-diagram")].filter(
          (el) =>
            !el.shadowRoot?.querySelector(".card") ||
            el.shadowRoot.querySelector(".err"),
        ).length,
    );
    expect(bad, p).toBe(0);
  }
  expect(w.errors).toEqual([]);
  expect(w.external).toEqual([]);
});

test("JavaScript examples cover create, event log, and programmatic control", async ({
  page,
}) => {
  const w = watch(page);
  await page.goto(url("examples/javascript.html"));
  await expect(page.locator("#js-root bus-diagram .card")).toHaveCount(2);

  await page.goto(url("examples/events.html"));
  await page.locator("#telegram-sim button.key").click();
  await expect(page.locator("#telegram-log li")).toHaveCount(2, {
    timeout: 5000,
  });
  await expect(page.locator("#telegram-log li").nth(1)).toContainText(
    "status feedback",
  );

  await page.goto(url("examples/programmatic-control.html"));
  await page.click("#c-pause");
  await page.locator("#ctrl button.key").click();
  for (let i = 0; i < 6; i++) await page.click("#c-adv");
  await page.click("#c-state");
  await expect(page.locator("#ctrl-out")).toContainText("t = 1500 ms");
  await expect(page.locator("#ctrl-out")).toContainText("L1: on");
  expect(w.errors).toEqual([]);
});

test("reveal.js slideshow accepts keyboard input without changing slides", async ({
  page,
}) => {
  const w = watch(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(url("examples/slideshow-demo.html#/1"));
  const slide = page.locator("section.present bus-diagram");
  await expect(slide.locator(".card")).toHaveCount(2);
  const key = slide.locator("button.key", { hasText: "Key 3" });
  await key.focus();
  await page.keyboard.press("Space");
  await expect(slide.locator(".lamp.on")).toHaveCount(4, { timeout: 5000 });
  expect(
    await page.evaluate(
      () =>
        (
          window as unknown as { Reveal: { getIndices(): { h: number } } }
        ).Reveal.getIndices().h,
    ),
  ).toBe(1);
  // The whole diagram fits in the slide (fit="contain").
  const box = await slide.boundingBox();
  const stage = await slide.locator(".stage-size").boundingBox();
  expect(stage!.width).toBeLessThanOrEqual(box!.width + 1);
  expect(w.errors).toEqual([]);
});

test.describe("designer", () => {
  test("template, insertion, localized error, and contextual completion", async ({
    page,
  }) => {
    const w = watch(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(url("designer/index.html#template=status-feedback"));
    await expect(page.locator("#preview h2")).toHaveText(
      /Toggle controls and status feedback/,
    );
    await expect(page.locator("#status")).toHaveText(/Valid scenario/);

    await page.click("#tab-json");
    await page.selectOption("#insert", "shutterActuator");
    await expect(page.locator("#preview .shutter")).toHaveCount(1);
    await expect(page.locator("#status")).toHaveText(/Valid scenario/);

    await page.evaluate(() => {
      const d = (
        window as unknown as {
          designer: { text(): string; setText(t: string): void };
        }
      ).designer;
      d.setText(d.text().replace('"channel": "s2"', '"channel": "s9"'));
    });
    await expect(page.locator("#status")).toHaveText(/1 error/);
    await expect(page.locator("#problems li")).toContainText("channel “s9”");
    await page.locator("#problems li").click();
    await expect(page.locator(".cm-lintRange-error")).toHaveCount(1);
    const sel = await page.evaluate(() => {
      const v = (
        window as unknown as {
          designer: {
            editor: {
              state: {
                sliceDoc(a: number, b: number): string;
                selection: { main: { from: number; to: number } };
              };
            };
          };
        }
      ).designer.editor;
      return v.state.sliceDoc(
        v.state.selection.main.from,
        v.state.selection.main.to,
      );
    });
    expect(sel).toBe('"s9"');
    await page.keyboard.press("Control+z");

    // Available ports depend on behavior: switching actuator.
    await page.evaluate(() => {
      const v = (
        window as unknown as {
          designer: {
            editor: {
              state: { doc: { toString(): string } };
              dispatch(t: unknown): void;
              focus(): void;
            };
          };
        }
      ).designer.editor;
      const i = v.state.doc.toString().indexOf('"port": "switch"') + 9;
      v.dispatch({ selection: { anchor: i, head: i + 6 } });
      v.focus();
    });
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Control+Space");
    const items = page.locator(".cm-tooltip-autocomplete li");
    await expect(items).toHaveText([
      "energy",
      "forced",
      "power",
      "powerLimit",
      "scene",
      "status",
      "switch",
      "totalPower",
    ]);
    expect(w.errors).toEqual([]);
  });

  test("exports: offline standalone page and viewer link", async ({
    page,
    context,
  }, info) => {
    const w = watch(page);
    await page.goto(url("designer/index.html#template=lighting-control"));
    await expect(page.locator("#status")).toHaveText(/Valid scenario/);
    await page.check("#opt-slide");
    await page.locator(".menu summary").click();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.click("#export-page"),
    ]);
    const file = info.outputPath("page.html");
    await download.saveAs(file);
    expect(readFileSync(file, "utf8")).not.toMatch(/<script src=/);
    const standalone = await context.newPage();
    const w2 = watch(standalone);
    await standalone.goto(pathToFileURL(file).href);
    await standalone.locator("button.key", { hasText: "Key 3" }).click();
    await expect(standalone.locator(".lamp.on")).toHaveCount(4, {
      timeout: 5000,
    });
    expect(w2.errors).toEqual([]);
    expect(w2.external).toEqual([]);

    await page.locator(".menu summary").click();
    await page.click("#export-link");
    // The link is compressed asynchronously.
    await expect(page.locator("#code-text")).toHaveValue(/player\.html#d=/);
    const link = await page.locator("#code-text").inputValue();
    const player = await context.newPage();
    await player.goto(link);
    await expect(player.locator("bus-diagram .card")).toHaveCount(2);
    expect(await player.locator("bus-diagram").getAttribute("data-fit")).toBe(
      "contain",
    );

    await page.click("#code-close");
    await page.locator(".menu summary").click();
    await page.click("#export-snippet");
    const snippet = await page.locator("#code-text").inputValue();
    expect(snippet).toContain(
      '<bus-diagram fit="contain" style="height:540px">',
    );
    // The code works as pasted into a page.
    const host = info.outputPath("colle.html");
    writeFileSync(
      host,
      `<!doctype html><meta charset="utf-8"><body>${snippet.replace('src="bus-diagram.js"', `src="${pathToFileURL(join(DOCS, "assets/bus-diagram.js")).href}"`)}</body>`,
    );
    const pasted = await context.newPage();
    await pasted.goto(pathToFileURL(host).href);
    await expect(pasted.locator("bus-diagram .card")).toHaveCount(2);
    expect(w.errors).toEqual([]);
  });
});

test.describe("guided designer", () => {
  const designerText = (page: Page) =>
    page.evaluate(() =>
      (window as unknown as { designer: { text(): string } }).designer.text(),
    );

  const emptyDoc = (page: Page, title: string) =>
    page.evaluate((title) => {
      localStorage.clear();
      const empty = {
        formatVersion: 2,
        title,
        lines: [{ address: "1.1" }],
        groupAddresses: [],
        devices: [],
      };
      (
        window as unknown as { designer: { setText(t: string): void } }
      ).designer.setText(JSON.stringify(empty));
    }, title);

  test("guided editor builds an undoable group command without editing JSON", async ({
    page,
  }) => {
    const w = watch(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(url("designer/index.html"));
    await emptyDoc(page, "Essai");
    await page.click("#tab-guided");
    await page.selectOption("select.g-add >> nth=0", {
      label: "4-key push button",
    });
    // The new device editor opens; breadcrumbs lead back to the scenario.
    await expect(page.locator(".g-crumb b")).toHaveText("4-key push button");
    await page.click(".g-back");
    await page.selectOption("select.g-add >> nth=0", {
      label: "6-output switch actuator",
    });
    await expect(page.locator(".g-crumb b")).toHaveText(
      "6-output switch actuator",
    );

    // Collapsed outputs fit on one line; all six listen to the Key 1 address.
    const cards = page.locator("bd-guided .g-card");
    await expect(cards).toHaveCount(6);
    await expect(cards.first().locator(":scope > summary")).toContainText(
      "Lamp · no address",
    );
    for (let i = 0; i < 6; i++) {
      await cards.nth(i).locator(":scope > summary").click();
      await cards
        .nth(i)
        .locator(".g-port", { hasText: "Command" })
        .locator("select.g-plus")
        .selectOption("1/1/1");
      await expect(cards.nth(i).locator(":scope > summary")).toContainText(
        "Command 1/1/1",
      );
    }
    await expect(page.locator("#status")).toHaveText(/Valid scenario/);
    const doc = JSON.parse(await designerText(page)) as {
      devices: { objects: { ga: string | string[] }[] }[];
    };
    expect(doc.devices[1]!.objects.map((o) => [o.ga].flat())).toEqual(
      Array(6).fill(["1/1/1"]),
    );

    await page.locator("#preview button.key", { hasText: "Key 1" }).click();
    await expect(page.locator("#preview .lamp.on")).toHaveCount(6, {
      timeout: 10000,
    });

    // Each guided edit is one undo step.
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    const undone = JSON.parse(await designerText(page)) as typeof doc;
    expect([undone.devices[1]!.objects[5]!.ga].flat()).toEqual([]);
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    expect(
      [
        (JSON.parse(await designerText(page)) as typeof doc).devices[1]!
          .objects[5]!.ga,
      ].flat(),
    ).toEqual(["1/1/1"]);
    expect(w.errors).toEqual([]);
  });

  test("guided editor shows refusals, filters invalid choices, and deletes lines", async ({
    page,
  }) => {
    const w = watch(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(url("designer/index.html#template=status-feedback"));
    await page.click("#tab-guided");
    const before = await designerText(page);

    // A refusal shows a banner and field path while leaving the JSON unchanged.
    await page.locator(".g-item", { hasText: "Switching actuator" }).click();
    const address = page
      .locator("label.g-field", { hasText: "Individual address" })
      .locator("input");
    await address.fill("1.1.1");
    await address.press("Enter");
    await expect(page.locator(".g-alert")).toContainText(
      "address 1.1.1 is already used",
    );
    await expect(address).toHaveValue("1.1.2");
    expect(await designerText(page)).toBe(before);
    // A successful edit clears the banner.
    await page
      .locator("label.g-field", { hasText: "Name" })
      .first()
      .locator("input")
      .fill("Switch sample");
    await page.keyboard.press("Tab");
    await expect(page.locator(".g-alert")).toHaveCount(0);

    // DPT choices include only sizes compatible with linked objects.
    await page.click(".g-back");
    await page.locator(".g-item", { hasText: "1/1/1" }).click();
    const dpt = page
      .locator("label.g-field", { hasText: "DPT" })
      .locator("select");
    await expect(dpt.locator('option[value="5.001"]')).toHaveJSProperty(
      "disabled",
      true,
    );
    await expect(dpt.locator('option[value="1.008"]')).toHaveJSProperty(
      "disabled",
      false,
    );
    await expect(page.locator("bd-guided")).toContainText(
      "Only 1 bit DPTs are offered",
    );

    // One line: removal impossible, and says why.
    await page.click(".g-back");
    await expect(
      page.getByRole("button", { name: "Delete line" }),
    ).toBeDisabled();

    // With multiple lines, deletion requires in-place confirmation and can be canceled.
    await page.selectOption("#templates", "full-topology");
    const line12 = page.locator(".g-line", { hasText: "Line 1.2" });
    await expect(line12).toHaveCount(1);
    await line12.getByRole("button", { name: "Delete line" }).click();
    await expect(line12).toContainText("Delete the line and its device?");
    await line12.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.locator(".g-line", { hasText: "Line 1.2" })).toHaveCount(
      0,
    );
    expect(await designerText(page)).not.toContain('"1.2.10"');
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(page.locator(".g-line", { hasText: "Line 1.2" })).toHaveCount(
      1,
    );

    // In guided mode, clicking an error opens the device card.
    await page.evaluate(() => {
      const d = (
        window as unknown as {
          designer: { text(): string; setText(t: string): void };
        }
      ).designer;
      d.setText(d.text().replace(/"channel": "[^"]+"/, '"channel": "zz"'));
    });
    await expect(page.locator("#problems li").first()).toContainText("zz");
    await page.locator("#problems li").first().click();
    await expect(page.locator(".g-crumb b")).not.toHaveText("");
    await expect(page.locator(".g-back")).toBeVisible();
    expect(w.errors).toEqual([]);
  });

  test("topology shows areas, backbone, main lines, IP routers, and supervisor", async ({
    page,
  }) => {
    const w = watch(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(url("designer/index.html"));
    await emptyDoc(page, "Topologie");
    await page.click("#tab-guided");
    const preview = page.locator("#preview");

    // Add a line on demand with a device connected to it.
    await page.getByLabel("Main lines Z.0 and line couplers").check();
    await expect(preview.locator(".coupler", { hasText: "1.1.0" })).toHaveCount(
      1,
    );
    await page
      .locator(".g-line", { hasText: "Main line" })
      .locator("select.g-add")
      .selectOption({ label: "2-key push button" });
    await expect(page.locator(".g-crumb b")).not.toHaveText("");
    expect(await designerText(page)).toContain('"1.0.1"');
    await page.click(".g-back");

    // With one area then a second area, the backbone box becomes required.
    await page.getByLabel("Backbone 0.0 and area couplers").check();
    await expect(preview.locator(".coupler", { hasText: "1.0.0" })).toHaveCount(
      1,
    );
    await page.getByRole("button", { name: "+ New area" }).click();
    await expect(page.locator(".g-zone")).toHaveCount(2);
    await expect(preview.locator(".coupler", { hasText: "2.0.0" })).toHaveCount(
      1,
    );

    // KNXnet/IP routers act as area couplers for the IP network supervisor.
    await page
      .locator("label.g-field", { hasText: "IP network" })
      .locator("select")
      .selectOption("areaCouplers");
    await expect(
      preview.locator(".coupler", { hasText: "KNX/IP router" }),
    ).toHaveCount(2);
    await page
      .getByRole("button", { name: "+ Supervisor on the IP network" })
      .click();
    await expect(page.locator(".g-crumb b")).toHaveText("Supervisor");
    await page
      .getByLabel("Declared in the project (dummy device with its addresses)")
      .uncheck();
    await expect(page.locator("bd-guided")).toContainText(
      "This supervisor is not declared in the project",
    );
    expect(await designerText(page)).toContain('"inFilterTables": false');

    // Router settings: transfer everything up.
    await page.click(".g-back");
    await page
      .locator("summary", { hasText: "Couplers and filter tables" })
      .click();
    const router = page.locator(".g-coupler", { hasText: "1.0.0" });
    await router
      .locator("label.g-field", { hasText: "Upwards" })
      .locator("select")
      .selectOption("route");
    expect(await designerText(page)).toContain('"up": "route"');
    await expect(page.locator("#status")).toHaveText(/Valid scenario/);
    expect(w.errors).toEqual([]);
  });

  test("loaded extension appears in generic form and standalone export", async ({
    page,
    context,
  }, info) => {
    const w = watch(page);
    await page.goto(url("designer/index.html"));
    await emptyDoc(page, "Extension");
    await page.click("#tab-guided");
    await page.setInputFiles(
      "#ext-file",
      join(DOCS, "assets/extensions/delayed-switch.js"),
    );
    await expect(page.locator("#toast")).toContainText(
      "delayed-switch.js loaded",
    );
    await page.selectOption("select.g-add >> nth=0", {
      value: "ext:delayedSwitch/v1",
    });
    await page.locator("bd-guided .g-card > summary").first().click();
    await expect(page.locator("bd-guided")).toContainText("Turn-on delay");
    await expect(page.locator("#status")).toHaveText(/Valid scenario/);

    await page.locator(".menu summary").click();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.click("#export-page"),
    ]);
    const file = info.outputPath("extension.html");
    await download.saveAs(file);
    expect(readFileSync(file, "utf8")).toContain("delayedSwitch/v1");
    const standalone = await context.newPage();
    const w2 = watch(standalone);
    await standalone.goto(pathToFileURL(file).href);
    await expect(standalone.locator("bus-diagram .card")).toHaveCount(1);
    expect(w2.errors).toEqual([]);

    // The extension persists and reloads with the designer.
    await page.reload();
    await expect(
      page.locator("select.g-add option[value='ext:delayedSwitch/v1']"),
    ).toHaveCount(1);
    expect(w.errors).toEqual([]);
  });

  test("rejected extension leaves no trace; replacement survives reload", async ({
    page,
  }, info) => {
    await page.goto(url("designer/index.html"));
    await emptyDoc(page, "Extensions");
    await page.click("#tab-guided");
    // the script records a definition and then fails; nothing should be left.
    const partial = info.outputPath("partial-load.js");
    writeFileSync(
      partial,
      'BusDiagram.registerBehavior("partialLoad/v1", { ports: {}, createState: () => ({}) });\nthrow new Error("partial-load");\n',
    );
    await page.setInputFiles("#ext-file", partial);
    await expect(page.locator("#toast")).toContainText("rejected");
    await expect(
      page.locator("select.g-add option[value='ext:partialLoad/v1']"),
    ).toHaveCount(0);

    // load V1 then V2 with the same identifier; V2 survives reload.
    const file = info.outputPath("versioned-extension.js");
    const version = (n: number) =>
      writeFileSync(
        file,
        `BusDiagram.registerBehavior("versionedExtension/v1", { description: "version ${n}", ports: {}, createState: () => ({}) });\n`,
      );
    version(1);
    await page.setInputFiles("#ext-file", file);
    await expect(
      page.locator("select.g-add option[value='ext:versionedExtension/v1']"),
    ).toContainText("version 1");
    await page.reload();
    version(2);
    await page.setInputFiles("#ext-file", file);
    await expect(page.locator("#toast")).toContainText(
      "versioned-extension.js loaded",
    );
    await expect(
      page.locator("select.g-add option[value='ext:versionedExtension/v1']"),
    ).toContainText("version 2");
    await page.reload();
    await expect(
      page.locator("select.g-add option[value='ext:versionedExtension/v1']"),
    ).toContainText("version 2");
    // A failed V3 does not replace the V2.
    writeFileSync(file, 'throw new Error("v3 broken");\n');
    await page.setInputFiles("#ext-file", file);
    await expect(page.locator("#toast")).toContainText("rejected");
    await expect(
      page.locator("select.g-add option[value='ext:versionedExtension/v1']"),
    ).toContainText("version 2");
    // Explicit removal from the manager.
    await page.click("#load-ext");
    await page
      .locator("#ext-dialog .ext-row", { hasText: "versioned-extension.js" })
      .getByRole("button", { name: "Remove" })
      .click();
    await page.click("#ext-close");
    await expect(
      page.locator("select.g-add option[value='ext:versionedExtension/v1']"),
    ).toHaveCount(0);
  });

  test("required parameter is requested before insertion and null is preserved", async ({
    page,
    context,
  }, info) => {
    await page.goto(url("designer/index.html"));
    await emptyDoc(page, "Requis");
    await page.click("#tab-guided");
    const ext = info.outputPath("required-parameter.js");
    writeFileSync(
      ext,
      `BusDiagram.registerBehavior("requiredParameter/v1", {
  ports: {},
  createState: () => ({}),
  parameters: {
    type: "object",
    properties: {
      n: { title: "Number", type: "integer", minimum: 1 },
      k: { title: "Option", type: ["integer", "null"], default: 5 }
    },
    required: ["n"]
  }
});\n`,
    );
    await page.setInputFiles("#ext-file", ext);
    await expect(page.locator("#toast")).toContainText("loaded");
    await page.selectOption("select.g-add >> nth=0", {
      value: "ext:requiredParameter/v1",
    });
    const draft = page.locator(".g-draft");
    await expect(draft).toContainText("requiredParameter/v1");
    // Without value: explicit refusal, nothing is added.
    await draft.getByRole("button", { name: "Add device" }).click();
    await expect(page.locator(".g-alert")).toContainText("required");
    await page.locator(".g-alert .g-x").click();
    await draft
      .locator("label.g-field", { hasText: "Number" })
      .locator("input")
      .fill("3");
    await draft
      .locator("label.g-field", { hasText: "Number" })
      .locator("input")
      .press("Tab");
    await draft.getByRole("button", { name: "Add device" }).click();
    await expect(page.locator(".g-draft")).toHaveCount(0);
    await expect(page.locator("#status")).toHaveText(/Valid scenario/);
    // empty nullable field written null; display remains empty, not default 5.
    const opt = page
      .locator("bd-guided label.g-field", { hasText: "Option" })
      .locator("input");
    await opt.fill("");
    await opt.press("Tab");
    await page.click("#tab-json");
    await expect(page.locator(".cm-content")).toContainText('"k": null');
    await page.click("#tab-guided");
    await expect(opt).toHaveValue("");

    // Reopen the standalone export in a fresh context.
    await page.locator(".menu summary").click();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.click("#export-page"),
    ]);
    const file = info.outputPath("required.html");
    await download.saveAs(file);
    const fresh = await context.browser()!.newContext();
    const standalone = await fresh.newPage();
    const w2 = watch(standalone);
    await standalone.goto(pathToFileURL(file).href);
    await expect(standalone.locator("bus-diagram .card")).toHaveCount(1);
    expect(w2.errors).toEqual([]);
    await fresh.close();
  });

  test("two extensions sharing an internal variable work in preview and exports", async ({
    page,
    context,
  }, info) => {
    await page.goto(url("designer/index.html"));
    await emptyDoc(page, "Extension scope");
    const files = ["alpha", "beta"].map((n) => {
      const f = info.outputPath(`${n}.js`);
      writeFileSync(
        f,
        `const definition = { ports: {}, createState: () => ({}) };\nBusDiagram.registerBehavior("${n}/v1", definition);\n`,
      );
      return f;
    });
    for (const f of files) {
      await page.setInputFiles("#ext-file", f);
      await expect(page.locator("#toast")).toContainText("loaded");
    }
    const doc = {
      formatVersion: 2,
      title: "Extension scope",
      lines: [{ address: "1.1" }],
      devices: [
        {
          id: "a",
          kind: "generic",
          address: "1.1.1",
          behavior: "alpha/v1",
          objects: [],
        },
        {
          id: "b",
          kind: "generic",
          address: "1.1.2",
          behavior: "beta/v1",
          objects: [],
        },
      ],
    };
    await page.evaluate(
      (d) =>
        (
          window as unknown as { designer: { setText(t: string): void } }
        ).designer.setText(JSON.stringify(d)),
      doc,
    );
    await expect(page.locator("#status")).toHaveText(/Valid scenario/);
    // Reopen the standalone page in a fresh browser.
    await page.locator(".menu summary").click();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.click("#export-page"),
    ]);
    const file = info.outputPath("r01.html");
    await download.saveAs(file);
    const fresh = await context.browser()!.newContext();
    const standalone = await fresh.newPage();
    const w2 = watch(standalone);
    await standalone.goto(pathToFileURL(file).href);
    await expect(standalone.locator("bus-diagram .card")).toHaveCount(2);
    expect(w2.errors).toEqual([]);
    // Pasted code: raw extension files would conflict, so each is wrapped when embedded.
    await page.locator(".menu summary").click();
    await page.click("#export-snippet");
    await expect(page.locator("#code-text")).toHaveValue(/beta\/v1/);
    const code = await page.locator("#code-text").inputValue();
    expect(code).not.toContain('<script src="alpha.js">');
    expect(code).toContain('registerBehavior("beta/v1"');
    const host = info.outputPath("host.html");
    writeFileSync(
      host,
      `<!doctype html><meta charset="utf-8">${code.replace('<script src="bus-diagram.js"></script>', `<script src="${pathToFileURL(join(DOCS, "assets/bus-diagram.js")).href}"></script>`)}`,
    );
    const hostPage = await fresh.newPage();
    const w3 = watch(hostPage);
    await hostPage.goto(pathToFileURL(host).href);
    await expect(hostPage.locator("bus-diagram .card")).toHaveCount(2);
    expect(w3.errors).toEqual([]);
    await fresh.close();
  });

  test("replacement is rejected when a dependent extension would fail", async ({
    page,
  }, info) => {
    await page.goto(url("designer/index.html"));
    await emptyDoc(page, "Extension dependency");
    await page.click("#tab-guided");
    const base = info.outputPath("base.js");
    const dependent = info.outputPath("dependent.js");
    writeFileSync(
      base,
      'BusDiagram.registerBehavior("base/v1", { ports: {}, createState: () => ({}) });\n',
    );
    writeFileSync(
      dependent,
      'if (!BusDiagram.captureRegistry().behaviors.has("base/v1")) throw new Error("base/v1 required");\nBusDiagram.registerBehavior("dependent/v1", { ports: {}, createState: () => ({}) });\n',
    );
    await page.setInputFiles("#ext-file", base);
    await expect(page.locator("#toast")).toContainText("base.js loaded");
    await page.setInputFiles("#ext-file", dependent);
    await expect(page.locator("#toast")).toContainText("dependent.js loaded");
    // Incompatible replacement: refusal naming the dependent, previous condition retained.
    writeFileSync(
      base,
      'BusDiagram.registerBehavior("base/v2", { ports: {}, createState: () => ({}) });\n',
    );
    await page.setInputFiles("#ext-file", base);
    await expect(page.locator("#toast")).toContainText(
      "dependent.js would fail",
    );
    await expect(
      page.locator("select.g-add option[value='ext:base/v1']"),
    ).toHaveCount(1);
    await expect(
      page.locator("select.g-add option[value='ext:dependent/v1']"),
    ).toHaveCount(1);
    // Removal from base: same control.
    await page.click("#load-ext");
    await page
      .locator("#ext-dialog .ext-row", { hasText: "base.js" })
      .getByRole("button", { name: "Remove" })
      .click();
    await expect(page.locator("#toast")).toContainText(
      "dependent.js would fail",
    );
    await page.click("#ext-close");
    await page.reload();
    await expect(
      page.locator("select.g-add option[value='ext:dependent/v1']"),
    ).toHaveCount(1);
    await expect(
      page.locator("select.g-add option[value='ext:base/v1']"),
    ).toHaveCount(1);
  });

  test("required initial state is requested; nullable boolean and text are preserved", async ({
    page,
  }, info) => {
    await page.goto(url("designer/index.html"));
    await emptyDoc(page, "Required initial state");
    await page.click("#tab-guided");
    const ext = info.outputPath("state-required.js");
    writeFileSync(
      ext,
      `BusDiagram.registerBehavior("stateRequired/v1", {
  ports: {},
  output: "switch",
  createState: () => ({}),
  channelInitialState: { type: "object", properties: { seed: { title: "Seed", type: "integer" } }, required: ["seed"] },
  parameters: { type: "object", properties: {
    flag: { title: "Flag", type: ["boolean", "null"], default: false },
    note: { title: "Note", type: ["string", "null"], nullTitle: "no note" }
  } }
});\n`,
    );
    await page.setInputFiles("#ext-file", ext);
    await expect(page.locator("#toast")).toContainText("loaded");
    await page.selectOption("select.g-add >> nth=0", {
      value: "ext:stateRequired/v1",
    });
    const draft = page.locator(".g-draft");
    await expect(draft).toContainText("Output initial state");
    const seed = draft
      .locator("label.g-field", { hasText: "Seed" })
      .locator("input");
    await seed.fill("7");
    await seed.press("Tab");
    await draft.getByRole("button", { name: "Add device" }).click();
    await expect(page.locator(".g-draft")).toHaveCount(0);
    await expect(page.locator("#status")).toHaveText(/Valid scenario/);
    // Nullable boolean offers three choices; null is written explicitly.
    const flag = page
      .locator("bd-guided label.g-field", { hasText: "Flag" })
      .locator("select");
    await flag.selectOption("null");
    // Nullable text distinguishes empty string from null.
    const noteField = page.locator("bd-guided label.g-field", {
      hasText: "Note",
    });
    await noteField.locator("input").fill("");
    await noteField.locator("input").fill("x");
    await noteField.locator("input").press("Tab");
    await noteField.getByRole("button", { name: "no note" }).click();
    await page.click("#tab-json");
    const json = page.locator(".cm-content");
    await expect(json).toContainText('"seed": 7');
    await expect(json).toContainText('"flag": null');
    await expect(json).toContainText('"note": null');
    await page.click("#tab-guided");
    await expect(flag).toHaveValue("null");
    await expect(noteField.locator("input")).toHaveAttribute(
      "placeholder",
      "no note",
    );
  });

  test("guided navigation, undoable group links, and output-setting copy", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(url("designer/index.html#template=object-flags"));
    await page.click("#tab-guided");
    const guided = page.locator("bd-guided");
    // from 1/1/1, open the object of channel 1: unfolded map, highlighted line.
    await guided.locator(".g-item", { hasText: "1/1/1" }).first().click();
    await guided.locator(".g-item", { hasText: "Channel 1" }).click();
    await expect(guided.locator(".g-flash")).toHaveCount(1);
    await expect(guided.locator(".g-flash")).toContainText("Command");
    await guided.getByRole("button", { name: "← Back" }).click();
    await expect(guided.locator(".g-crumb b")).toHaveText("1/1/1");

    // add 1/1/1 to channel 3 and remove it from channel 2, in one operation.
    await guided.getByRole("button", { name: "Edit linked objects…" }).click();
    await guided
      .locator(".g-mrow", { hasText: "Channel 3" })
      .locator("input")
      .check();
    await guided
      .locator(".g-mrow", { hasText: "Channel 2" })
      .locator("input")
      .uncheck();
    await expect(guided.locator(".g-plan li")).toHaveCount(2);
    await expect(guided.locator(".g-plan")).toContainText(
      "it still sends on 1/1/3",
    );
    await expect(guided.locator(".g-plan")).toContainText(
      "will have no group address",
    );
    await guided.getByRole("button", { name: "Apply" }).click();
    await expect(guided.locator(".g-notice")).toContainText(
      "1 added, 1 removed",
    );
    const json = () =>
      page.evaluate(() =>
        JSON.parse(
          (
            window as unknown as { designer: { text(): string } }
          ).designer.text(),
        ),
      );
    let doc = await json();
    let switchActuator = doc.devices.find(
      (d: { id: string }) => d.id === "switchActuator",
    );
    expect(
      switchActuator.objects.find((o: { id: string }) => o.id === "c3").ga,
    ).toEqual(["1/1/3", "1/1/1"]);
    expect(
      switchActuator.objects.find((o: { id: string }) => o.id === "c2").ga,
    ).toEqual([]);
    // One undo step reverses the entire operation.
    await guided
      .locator(".g-notice")
      .getByRole("button", { name: "Undo" })
      .click();
    doc = await json();
    switchActuator = doc.devices.find(
      (d: { id: string }) => d.id === "switchActuator",
    );
    expect(
      switchActuator.objects.find((o: { id: string }) => o.id === "c3").ga,
    ).toBe("1/1/3");
    expect(
      switchActuator.objects.find((o: { id: string }) => o.id === "c2").ga,
    ).toBe("1/1/1");

    // copy the L1 timer to L2 and L3 without changing addresses.
    await guided.getByRole("button", { name: "Installation" }).click();
    await guided
      .locator(".g-item", { hasText: "Six-output switching actuator" })
      .first()
      .click();
    // The L1 card stays open after targeted navigation.
    const l1 = guided
      .locator("details.g-card", {
        has: page.locator("summary", { hasText: "L1" }),
      })
      .first();
    if (!(await l1.evaluate((e) => (e as HTMLDetailsElement).open)))
      await l1.locator("summary").click();
    const timer = guided
      .locator("label.g-field", { hasText: "Timer" })
      .first()
      .locator("input");
    await timer.fill("15");
    await timer.press("Tab");
    await guided.getByRole("button", { name: "Copy settings to…" }).click();
    const panel = guided.locator(".g-copy");
    await panel.getByLabel("L2").check();
    await panel.getByLabel("L3").check();
    await expect(panel.locator(".g-plan-line")).toContainText("L1 → L2, L3");
    await panel.getByRole("button", { name: "Copy", exact: true }).click();
    await expect(guided.locator(".g-notice")).toContainText(
      "copied to 2 output(s)",
    );
    doc = await json();
    switchActuator = doc.devices.find(
      (d: { id: string }) => d.id === "switchActuator",
    );
    const ch = (id: string) =>
      switchActuator.channels.find((c: { id: string }) => c.id === id);
    expect(ch("s2").parameters).toEqual({ timerMs: 15000 });
    expect(ch("s3").parameters).toEqual({ timerMs: 15000 });
    expect(
      switchActuator.objects.find((o: { id: string }) => o.id === "c3").ga,
    ).toBe("1/1/3");
  });

  test("language selection works in designer, preview, player, and component", async ({
    page,
    context,
  }, info) => {
    const w = watch(page);
    await page.goto(url("designer/index.html#template=lighting-control"));
    await page.evaluate(() => localStorage.clear());
    await page.selectOption("#lang", "en");
    await expect(page.locator("#tab-guided")).toHaveText("Guided");
    await expect(page.locator("#status")).toHaveText(/Valid scenario/);
    await expect(page.locator("#preview")).toContainText("Group monitor", {
      ignoreCase: true,
    });
    // Unchanged author content; translated validation messages.
    await expect(page.locator("#preview h2")).toHaveText(
      /Control multiple outputs/,
    );
    await page.evaluate(() => {
      const d = (
        window as unknown as {
          designer: { text(): string; setText(t: string): void };
        }
      ).designer;
      d.setText(d.text().replace('"channel": "s2"', '"channel": "s9"'));
    });
    await expect(page.locator("#problems li")).toContainText("channel “s9”");

    await page.keyboard.press("Control+z");
    await page.click("#tab-json");
    await page.locator(".cm-content").click();
    await page.keyboard.press("Control+z");
    await expect(page.locator("#status")).toHaveText(/Valid scenario/);
    await page.locator(".menu summary").click();
    await page.click("#export-link");
    await expect(page.locator("#code-text")).toHaveValue(/player\.html#d=/);
    const player = await context.newPage();
    await player.goto(await page.locator("#code-text").inputValue());
    await expect(player.locator("bus-diagram")).toContainText("Group monitor", {
      ignoreCase: true,
    });
    expect(await player.evaluate(() => document.documentElement.lang)).toBe(
      "en",
    );

    // Component alone: the language follows the nearest lang attribute.
    const host = info.outputPath("lang.html");
    writeFileSync(
      host,
      `<!doctype html><meta charset="utf-8"><script src="${pathToFileURL(join(DOCS, "assets/bus-diagram.js")).href}"></script>
<div lang="en"><bus-diagram id="en"><script type="application/json">{"formatVersion":2,"lines":[{"address":"1.1"}],"groupAddresses":[],"devices":[{"id":"x","address":"1.1.1","behavior":"nope/v1"}]}</script></bus-diagram></div>
<div lang="fr"><bus-diagram id="fr"><script type="application/json">{"formatVersion":2,"lines":[{"address":"1.1"}],"groupAddresses":[],"devices":[{"id":"x","address":"1.1.1","behavior":"nope/v1"}]}</script></bus-diagram></div>`,
    );
    const pasted = await context.newPage();
    await pasted.goto(pathToFileURL(host).href);
    await expect(pasted.locator("#en")).toContainText("unknown behavior", {
      ignoreCase: true,
    });
    await expect(pasted.locator("#fr")).toContainText("comportement inconnu", {
      ignoreCase: true,
    });
    expect(w.errors).toEqual([]);
  });
});

test("malformed drafts reject insertion without losing content", async ({
  page,
}) => {
  const w = watch(page);
  await page.goto(url("designer/index.html"));
  await expect(page.locator("#status")).toHaveText(/Valid scenario/);
  await page.click("#tab-json");
  for (const text of [
    "null",
    "[]",
    '{"formatVersion":2,"lines":[{"address":"1.1"}],"devices":{}}',
    '{"formatVersion":2,"lines":[{"address":"1.1"}],"devices":[],"groupAddresses":{}}',
  ]) {
    await page.evaluate(
      (t) =>
        (
          window as unknown as { designer: { setText(t: string): void } }
        ).designer.setText(t),
      text,
    );
    for (const id of [
      "pushButton4",
      "switchActuator6",
      "shutterActuator",
      "sup",
      "ga",
      "line",
    ]) {
      await page.selectOption("#insert", id);
      expect(
        await page.evaluate(() =>
          (
            window as unknown as { designer: { text(): string } }
          ).designer.text(),
        ),
      ).toBe(text);
    }
    await expect(page.locator("#toast")).toContainText(
      "Insertion: change rejected",
    );
  }
  expect(w.errors).toEqual([]);
});

test("failing extension view is isolated and diagnosed", async ({ page }) => {
  const w = watch(page);
  await page.goto(url("examples/lighting-control.html"));
  const res = await page.evaluate(async () => {
    const K = (
      window as unknown as {
        BusDiagram: Record<string, (...a: unknown[]) => unknown>;
      }
    ).BusDiagram;
    K.registerEquipmentView!("throwingView", {
      size: { width: 80, height: 30 },
      render: () => {
        throw new Error("intentional view failure");
      },
    });
    let sizeError = "";
    try {
      K.registerEquipmentView!("badSize", {
        size: { width: -1, height: 30 },
        render: () => null,
      });
    } catch (e) {
      sizeError = (e as Error).message;
    }
    const zone = document.createElement("div");
    document.body.prepend(zone);
    const el = K.create!(zone, {
      formatVersion: 2,
      lines: [{ address: "1.1" }],
      devices: [
        {
          id: "pushButton",
          kind: "pushButton",
          behavior: "pushButton/v1",
          address: "1.1.1",
          objects: [
            {
              id: "b",
              ga: "1/1/1",
              dpt: "1.001",
              port: "input",
              flags: { W: true, T: true },
            },
          ],
          buttons: [{ id: "b", press: { object: "b", value: 1 } }],
        },
        {
          id: "switchActuator",
          kind: "switchActuator",
          behavior: "switchActuator/v1",
          address: "1.1.2",
          objects: [
            {
              id: "c",
              ga: "1/1/1",
              dpt: "1.001",
              port: "switch",
              channel: "s1",
              flags: { W: true, T: false },
            },
          ],
          channels: [
            { id: "s1", equipment: { type: "lamp", view: "throwingView" } },
          ],
        },
      ],
    }) as HTMLElement & {
      getState(): {
        faulted: boolean;
        diagnostics: { code: string; message: string }[];
      };
    };
    await new Promise((r) => setTimeout(r, 300));
    return {
      sizeError,
      state: el.getState(),
      fault: el.shadowRoot!.querySelector(".viewfault")?.textContent ?? "",
    };
  });
  expect(res.sizeError).toMatch(/finite positive numbers/);
  expect(res.fault).toContain("throwingView");
  expect(res.state.faulted).toBe(false);
  expect(res.state.diagnostics.map((d) => d.code)).toEqual(["view-error"]);
  // Other diagrams on the page keep working.
  const other = page.locator("bus-diagram").nth(1);
  await other.locator("button.key", { hasText: "Key 1" }).click();
  await expect(other.locator(".lamp.on")).toHaveCount(2, { timeout: 5000 });
  expect(w.errors).toEqual([]);
});

test("static site works under an HTTP subpath", async ({ page }) => {
  const { createServer } = await import("node:http");
  const { extname } = await import("node:path");
  const types: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
  };
  const base = "/bus-diagram/";
  const server = createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? "/").split(/[?#]/)[0]!);
    if (!url.startsWith(base)) return void res.writeHead(404).end();
    let file = join(DOCS, url.slice(base.length));
    if (url.endsWith("/")) file = join(file, "index.html");
    if (!existsSync(file) || statSync(file).isDirectory())
      return void res.writeHead(404).end();
    res.writeHead(200, {
      "content-type": types[extname(file)] ?? "application/octet-stream",
    });
    res.end(readFileSync(file));
  });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  const port = (server.address() as { port: number }).port;
  const origin = `http://127.0.0.1:${port}${base}`;
  const failed: string[] = [];
  page.on(
    "response",
    (r) => r.status() >= 400 && failed.push(`${r.status()} ${r.url()}`),
  );
  page.on("requestfinished", async (r) => {
    const res = await r.response();
    if (res && res.status() >= 400) failed.push(`${res.status()} ${r.url()}`);
  });
  const w = watch(page);
  try {
    expect(existsSync(join(DOCS, ".nojekyll"))).toBe(true);
    for (const p of htmlPages()) {
      await page.goto(origin + p.split("\\").join("/"));
      await page.waitForLoadState("load");
    }
    // Subpath root, designer, and player loaded through ?src= (relative fetch).
    await page.goto(origin);
    await expect(page.locator("h1").first()).toBeVisible();
    await page.goto(origin + "designer/");
    await expect(page.locator("#status")).toHaveText(/Valid scenario/);
    await page.goto(origin + "player.html?src=scenarios/lighting-control.json");
    await expect(page.locator("bus-diagram .card")).toHaveCount(2);
    expect([...new Set(failed)]).toEqual([]);
    expect(w.errors).toEqual([]);
  } finally {
    server.close();
  }
});

test("generation aids: llms.txt, published schema, and #json= links", async ({
  page,
}) => {
  const reference = readFileSync(join(DOCS, "llms.txt"), "utf8");
  for (const id of ["pushButton/v1", "weatherStation/v1", "logicGate/v1"])
    expect(reference).toContain(`\`${id}\``);
  expect(existsSync(join(DOCS, "schema/scenario-v2.schema.json"))).toBe(true);
  const scenario = JSON.parse(
    readFileSync(join(DOCS, "scenarios/dimming.json"), "utf8"),
  );
  const fragment = `json=${encodeURIComponent(JSON.stringify(scenario))}`;
  const w = watch(page);
  await page.goto(url(`player.html#${fragment}`));
  await expect(page.locator("bus-diagram h2")).toHaveText(scenario.title);
  await page.goto(url(`designer/index.html#${fragment}`));
  await expect(page.locator("#preview h2")).toHaveText(scenario.title);
  await expect(page.locator("#status")).toHaveText(/Valid scenario/);
  expect(w.errors).toEqual([]);
});

test("prompt generator builds a request, checks an answer, and prepares a correction", async ({
  page,
}) => {
  const w = watch(page);
  await page.goto(url("guide/prompt-generator.html"));
  await page.fill("#pg-description", "One line 1.1 with a dimmer.");
  await page.selectOption("#pg-example", "dimming");
  const request = await page.inputValue("#pg-prompt");
  expect(request).toContain("One line 1.1 with a dimmer.");
  expect(request).toContain("`weatherStation/v1`");
  expect(request).toContain("## Example scenario: Dimming actuator");
  const scenario = JSON.parse(
    readFileSync(join(DOCS, "scenarios/dimming.json"), "utf8"),
  );
  scenario.devices[1].objects[0].dpt = "5.001";
  await page.fill(
    "#pg-answer",
    "```json\n" + JSON.stringify(scenario) + "\n```",
  );
  await page.click("#pg-check");
  await expect(page.locator("#pg-result")).toContainText("problem(s) found");
  expect(await page.inputValue("#pg-correction")).toContain(
    "devices[1].objects[0].dpt",
  );
  scenario.devices[1].objects[0].dpt = "1.001";
  await page.fill("#pg-answer", JSON.stringify(scenario));
  await page.click("#pg-check");
  await expect(page.locator("#pg-result")).toContainText("Valid scenario.");
  await expect(page.locator("#pg-open")).toHaveAttribute(
    "href",
    /designer\/index\.html#json=/,
  );
  expect(w.errors).toEqual([]);
});
