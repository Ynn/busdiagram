import { expect, test } from "@playwright/test";
import type { BrowserContext, Locator, Page } from "@playwright/test";
import { createHash } from "node:crypto";
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

// Pasted code loads the library from the CDN at the version of the build; serve the local
// bundle instead, so the integrity hash in the code is checked against the built file.
const { version } = JSON.parse(readFileSync("package.json", "utf8")) as {
  version: string;
};
const CDN_URL = `https://cdn.jsdelivr.net/npm/bus-diagram@${version}/dist/bus-diagram.js`;
const BUNDLE = readFileSync(join(DOCS, "assets/bus-diagram.js"));
const INTEGRITY = `sha384-${createHash("sha384").update(BUNDLE).digest("base64")}`;
const serveCdn = (context: BrowserContext) =>
  context.route(CDN_URL, (route) =>
    route.fulfill({
      body: BUNDLE,
      contentType: "text/javascript",
      headers: { "access-control-allow-origin": "*" },
    }),
  );

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

test("French documentation: language, navigation, search, and language switch", async ({
  page,
}) => {
  const { errors } = watch(page);
  await page.goto(url("fr/guide/installation.html"));
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.locator(".side h4").first()).toHaveText("Premiers pas");
  await expect(page.locator(".crumb")).toHaveText("Guide");
  await expect(page.locator("main p.stale")).toHaveCount(0);
  // A translated page links to its French neighbour; an untranslated one would be marked.
  const shutters = page.locator(".side a", { hasText: /^Volets/ });
  await expect(shutters).toHaveAttribute(
    "href",
    "../../fr/guide/shutters.html",
  );
  const untranslated = page.locator(".side a:has(small.en)");
  for (const link of await untranslated.all())
    await expect(link).toHaveAttribute(
      "href",
      /^\.\.\/\.\.\/(guide|examples|reference)\//,
    );
  // Search finds the French pages.
  await page.locator(".search input").fill("premier");
  await expect(page.locator(".search .results a").first()).toContainText(
    "Premier schéma",
  );
  await page.locator(".search input").fill("station météo");
  await expect(page.locator(".search .results a").first()).toHaveAttribute(
    "href",
    /^\.\.\/\.\.\/fr\//,
  );
  // Switch to the English page and back, keeping the section: anchors are shared.
  await page.goto(
    url("fr/guide/devices.html#weather-station-weatherstation-v1"),
  );
  await expect(
    page.locator("#weather-station-weatherstation-v1"),
  ).toContainText("Station météo");
  await page.locator("header .lang").click();
  await expect(page).toHaveURL(
    /\/guide\/devices\.html#weather-station-weatherstation-v1$/,
  );
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.locator("#weather-station-weatherstation-v1"),
  ).toContainText("Weather station");
  await page.locator("header .lang").click();
  await expect(page).toHaveURL(
    /\/fr\/guide\/devices\.html#weather-station-weatherstation-v1$/,
  );
  // The diagrams of the French pages are in French.
  await page.goto(url("fr/examples/lighting-control.html"));
  await expect(
    page.locator("bus-diagram .card", {
      hasText: "Interface de boutons-poussoirs",
    }),
  ).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("the icon of a diagram opens its scenario in the designer", async ({
  page,
}) => {
  const { errors } = watch(page);
  await page.goto(url("examples/status-feedback.html"));
  const icon = page.locator(".demo bus-diagram a.ico").first();
  await expect(icon).toHaveAttribute(
    "href",
    /^\.\.\/designer\/index\.html#d=[\w-]+&lang=en$/,
  );
  await expect(icon).toHaveAttribute("target", "_blank");
  await page.goto(await icon.evaluate((a) => (a as HTMLAnchorElement).href));
  await expect(page.locator("#preview h2")).toHaveText(
    /Toggle controls and status feedback/,
  );
  await expect(page.locator("#status")).toHaveText(/Valid scenario/);
  // The preview of the designer has no icon.
  await expect(page.locator("#preview a.ico")).toHaveCount(0);
  // From a French page, the designer opens in French, with the French texts.
  await page.goto(url("fr/examples/status-feedback.html"));
  const fr = page.locator(".demo bus-diagram a.ico").first();
  await expect(fr).toHaveAttribute("href", /&lang=fr$/);
  await expect(fr).toHaveAttribute("title", "Ouvrir dans le designer");
  await page.goto(await fr.evaluate((a) => (a as HTMLAnchorElement).href));
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.locator("#preview h2")).toHaveText(
    /Commandes en bascule et retours d'état/,
  );
  expect(errors).toEqual([]);
});

test("telegram details: frame, bits, TP1 signal, and checksum stay in step", async ({
  page,
}) => {
  const { errors } = watch(page);
  await page.goto(url("examples/topology.html"));
  const diagram = page.locator(".demo bus-diagram").first();
  await diagram.evaluate((d) => {
    const el = d as unknown as {
      simulation: { groupWrite(id: string, ga: string, v: number): unknown };
      advance(ms: number): void;
    };
    el.simulation.groupWrite("p1", "2/1/1", 1);
    el.advance(16000);
  });
  // A click on the routing octet of the card opens the details on that octet.
  await diagram.locator(".frame button.oct").nth(5).click();
  const dlg = diagram.locator("dialog.tdetail");
  await expect(dlg).toBeVisible();
  await expect(dlg.locator(".strip button.sel")).toHaveText(/E1/);
  await expect(dlg.locator("table.subs")).toContainText("Routing counter");
  // Another segment: the routing counter, the routing octet, and the check octet change.
  const check = await dlg.locator(".strip button").last().textContent();
  await dlg.locator(".segs button", { hasText: "main line 1.0" }).click();
  await expect(dlg.locator(".strip button.sel")).toHaveText(/D1/);
  await expect(dlg.locator(".strip button").last()).not.toHaveText(check!);
  // The other views keep the selection.
  await dlg.locator(".views button", { hasText: "Bits" }).click();
  await expect(dlg.locator("table.bitgrid tr.sel .hex")).toHaveText("D1");
  await dlg.locator(".views button", { hasText: "TP1 signal" }).click();
  await expect(dlg.locator(".signal g.char.sel")).toHaveCount(1);
  await expect(dlg.locator(".signal .ack")).toHaveCount(1);
  // The selected octet, written b7 first and sent b0 first: pointing at a bit shows it in both.
  await expect(dlg.locator(".lsb .cells").first().locator(".cellb")).toHaveCount(8);
  // S, b0…b7, P, Stop, then the 2 bit times that separate it from the next character.
  await expect(dlg.locator(".lsb .cells").last().locator(".cellb")).toHaveCount(13);
  await expect(dlg.locator(".signal g.sep")).toHaveCount(8);
  await expect(dlg.locator("footer")).toContainText(
    "9 octets, sent as 9 TP1 characters of 11 bits, + 8 separations of 2 bit times = 115 bit times = 11.98 ms",
  );
  await dlg.locator(".lsb .cells").last().locator(".cellb").nth(1).hover();
  await expect(dlg.locator(".lsb .cellb.hl")).toHaveCount(2);
  await expect(dlg.locator(".lsb .cells").first().locator(".cellb").last()).toHaveClass(/hl/);
  await expect(dlg.locator(".signal g.bit.hl")).toHaveCount(1);
  await dlg.locator(".signal g.char").first().click();
  await expect(dlg.locator(".strip button.sel")).toHaveText(/BC/);
  await dlg.locator(".views button", { hasText: "Checksum" }).click();
  await dlg.locator(".ck-grid th button", { hasText: "5" }).click();
  await expect(dlg.locator(".ck-explain .focus")).toContainText("Column 5");
  // The parity bit of each character, one per row, check octet included.
  await expect(dlg.locator(".ck-grid td.bit.par")).toHaveCount(9);
  await dlg.locator(".ck-grid th.par button").click();
  await expect(dlg.locator(".ck-explain .focus")).toContainText("Column P");
  await dlg.locator("header .close").click();
  await expect(dlg).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("documentation has valid internal links and anchors", () => {
  const pages = htmlPages();
  expect(pages.length).toBeGreaterThan(40);
  const broken: string[] = [];
  for (const p of pages) {
    const html = readFileSync(join(DOCS, p), "utf8");
    for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const link = m[1]!;
      if (/^(https?:|mailto:|data:|javascript:)/.test(link)) continue;
      // A query string (?v=version) only defeats browser caches: check the file itself.
      const [withQuery, anchor] = link.split("#");
      const file = withQuery!.split("?")[0];
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
  const index = (file: string) =>
    JSON.parse(
      readFileSync(join(DOCS, "assets", file), "utf8")
        .replace(/^window\.BUSDIAGRAM_SEARCH(_FR)?=/, "")
        .replace(/;\s*$/, ""),
    ) as { u: string; h: [string, string][] }[];
  const search = index("search-index.js");
  const searchFr = index("search-index-fr.js");
  expect(searchFr.every((entry) => entry.u.startsWith("fr/"))).toBe(true);
  for (const entry of [...search, ...searchFr]) {
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
  expect(search).toHaveLength(67);
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

test("contact keys report press and release; a power supply cuts its line", async ({
  page,
}) => {
  const w = watch(page);
  await page.goto(url("examples/push-button-interface.html"));
  const d = page.locator("bus-diagram").first();
  // Input 2 dims on one key: held past the long-press time, then released.
  const key = d.locator("button.key", { hasText: "Input 2" });
  await key.dispatchEvent("pointerdown", { pointerId: 1, button: 0 });
  await page.waitForTimeout(1200);
  await key.dispatchEvent("pointerup", { pointerId: 1, button: 0 });
  const values = d.locator(".mon tbody tr");
  await expect(values.first()).toContainText("1/2/2", { timeout: 5000 });
  await expect(values.nth(1)).toContainText("1/2/2");

  await page.goto(url("examples/bus-voltage.html"));
  const d2 = page.locator("bus-diagram").first();
  await d2.locator("button.psu", { hasText: "640" }).click({ force: true });
  await expect(d2.locator("button.psu.off")).toHaveCount(1);
  await expect(d2.locator(".card.unpowered")).toHaveCount(1);
  await d2.locator("button.psu.off").click({ force: true });
  await expect(d2.locator(".card.unpowered")).toHaveCount(0);
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
      const i = v.state.doc.toString().lastIndexOf('"port": "switch"') + 9;
      v.dispatch({ selection: { anchor: i, head: i + 6 } });
      v.focus();
    });
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Control+Space");
    const items = page.locator(".cm-tooltip-autocomplete li");
    await expect(items).toHaveText([
      "energy",
      "fireAlarm",
      "forced",
      "intrusionAlarm",
      "lock",
      "logic",
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
    // The library is pinned to the designer's version, with its integrity hash.
    expect(snippet).toContain(
      `<script src="${CDN_URL}" integrity="${INTEGRITY}" crossorigin="anonymous"></script>`,
    );
    // The code works as pasted into a page.
    const host = info.outputPath("colle.html");
    writeFileSync(
      host,
      `<!doctype html><meta charset="utf-8"><body>${snippet}</body>`,
    );
    await serveCdn(context);
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

  // Workspace: panel 0 shows the topology, panel 1 the group addresses.
  const topoPanel = (page: Page) =>
    page.locator("bd-guided .w-panel[data-content=topology]");
  const gaPanel = (page: Page) =>
    page.locator("bd-guided .w-panel[data-content=addresses]");
  /** Select a device in the topology tree and show one of its tabs. */
  const openDevice = async (page: Page, name: string, tab = "Parameters") => {
    await topoPanel(page)
      .locator(".w-node[data-key^='dev:']", { hasText: name })
      .first()
      .click();
    await topoPanel(page).getByRole("tab", { name: tab }).click();
  };
  /** Back to the topology overview (root of the tree). */
  const toTopology = (page: Page) =>
    topoPanel(page).locator(".w-node[data-key=topo]").click();
  /** Select a group address in the Group addresses panel and show one of its tabs. */
  const openGa = async (page: Page, address: string, tab = "Properties") => {
    await gaPanel(page).locator(`.w-node[data-key='ga:${address}']`).click();
    await gaPanel(page).getByRole("tab", { name: tab }).click();
  };
  const selectedNode = (page: Page) => topoPanel(page).locator(".w-node.sel");

  const emptyDoc = (
    page: Page,
    title: string,
    groupAddresses: { address: string; name: string; dpt: string }[] = [],
  ) =>
    page.evaluate(
      ({ title, groupAddresses }) => {
        localStorage.clear();
        const empty = {
          formatVersion: 2,
          title,
          lines: [{ address: "1.1" }],
          groupAddresses,
          devices: [],
        };
        (
          window as unknown as { designer: { setText(t: string): void } }
        ).designer.setText(JSON.stringify(empty));
      },
      { title, groupAddresses },
    );

  test("guided editor builds an undoable group command without editing JSON", async ({
    page,
  }) => {
    const w = watch(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(url("designer/index.html"));
    await emptyDoc(page, "Essai", [
      { address: "1/1/1", name: "Lighting", dpt: "1.001" },
    ]);
    await page.click("#tab-guided");
    await page.selectOption("select.g-add >> nth=0", {
      label: "Push-button interface",
    });
    // The new device is selected in the topology; the overview adds the next one.
    // The type names the device; its number of inputs is a setting.
    await expect(selectedNode(page)).toContainText("Push-button interface");
    await toTopology(page);
    await page.selectOption("select.g-add >> nth=0", {
      label: "6-output switch actuator",
    });
    await expect(selectedNode(page)).toContainText("Switch actuator");
    await topoPanel(page).getByRole("tab", { name: "Parameters" }).click();

    // Each output is a page of the parameter menu; Input 1 and the six outputs share 1/1/1.
    const outputs = topoPanel(page).locator(".w-pitem", {
      hasText: /^\s*Output /,
    });
    await expect(outputs).toHaveCount(6);
    // The page tree names the loads of an output; addresses only appear on group objects.
    await expect(outputs.first()).toHaveAttribute("title", "Lamp");
    // the parameters show the objects; links are made from the group address.
    const [keys, actuator] = JSON.parse(await designerText(page)).devices as {
      id: string;
      objects: { id: string }[];
    }[];
    await openGa(page, "1/1/1", "Associations");
    // Templates create objects without addresses: the links are made here.
    await gaPanel(page)
      .locator(".w-link-with")
      .selectOption(`${keys!.id}/${keys!.objects[0]!.id}`);
    for (const o of actuator!.objects)
      await gaPanel(page)
        .locator(".w-link-with")
        .selectOption(`${actuator!.id}/${o.id}`);
    await expect(page.locator("#status")).toHaveText(/Valid scenario/);
    const doc = JSON.parse(await designerText(page)) as {
      devices: { objects: { ga: string | string[] }[] }[];
    };
    expect(doc.devices[1]!.objects.map((o) => [o.ga].flat())).toEqual(
      Array(6).fill(["1/1/1"]),
    );

    await page.locator("#preview button.key", { hasText: "Input 1" }).click();
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
    await openDevice(page, "Switching actuator");
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
    await openGa(page, "1/1/1");
    const dpt = gaPanel(page)
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
    await toTopology(page);
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
    await expect(selectedNode(page)).toHaveAttribute("data-key", /^dev:/);
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
      .selectOption({ label: "Push-button interface" });
    await expect(selectedNode(page)).toHaveAttribute("data-key", /^dev:/);
    expect(await designerText(page)).toContain('"1.0.1"');
    await toTopology(page);

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
    await expect(selectedNode(page)).toContainText("Supervisor");
    await topoPanel(page).getByRole("tab", { name: "Parameters" }).click();
    await page
      .getByLabel("Declared in the project (dummy device with its addresses)")
      .uncheck();
    await expect(page.locator("bd-guided")).toContainText(
      "This supervisor is not declared in the project",
    );
    expect(await designerText(page)).toContain('"inFilterTables": false');

    // Router settings: transfer everything up.
    await toTopology(page);
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
    await topoPanel(page).getByRole("tab", { name: "Parameters" }).click();
    await topoPanel(page)
      .locator(".w-pitem", { hasText: /^\s*Output / })
      .first()
      .click();
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

  test("a language brought by an extension appears in the selector at once", async ({
    page,
  }, info) => {
    const w = watch(page);
    await page.goto(url("designer/index.html"));
    const file = info.outputPath("german.js");
    writeFileSync(
      file,
      'BusDiagram.registerMessages("de", { "Audit language": "Prüfsprache" });\n',
    );
    await expect(page.locator("#lang option")).toHaveText([
      "English",
      "Français",
    ]);
    await page.setInputFiles("#ext-file", file);
    await expect(page.locator("#toast")).toContainText("german.js loaded");
    await expect(page.locator("#lang option")).toHaveText([
      "English",
      "Français",
      "Deutsch",
    ]);
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
    await topoPanel(page).getByRole("tab", { name: "Parameters" }).click();
    // Settings of an extension without declared pages: one page of parameters.
    await topoPanel(page)
      .locator(".w-pitem", { hasText: /^\s*Parameters\s*$/ })
      .click();
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
    writeFileSync(host, `<!doctype html><meta charset="utf-8">${code}`);
    await serveCdn(fresh);
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
    await topoPanel(page).getByRole("tab", { name: "Parameters" }).click();
    // Settings of an extension without declared pages: one page of parameters.
    await topoPanel(page)
      .locator(".w-pitem", { hasText: /^\s*Parameters\s*$/ })
      .click();
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
    // From 1/1/1, open the object of channel 1: it is selected in the topology panel.
    await openGa(page, "1/1/1");
    await gaPanel(page).locator(".g-item", { hasText: "Channel 1" }).click();
    await expect(selectedNode(page)).toHaveAttribute(
      "data-key",
      /^obj:switchActuator\//,
    );
    await expect(
      topoPanel(page).getByRole("tab", { name: "Associations" }),
    ).toHaveAttribute("aria-selected", "true");

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
    await openDevice(page, "Six-output switching actuator");
    await topoPanel(page).locator(".w-pitem", { hasText: "L1" }).click();
    await topoPanel(page).locator(".w-pitem.sub", { hasText: "Timer" }).click();
    const timer = guided
      .locator("label.g-field", { hasText: "Timer" })
      .first()
      .locator("input");
    await timer.fill("15");
    await timer.press("Tab");
    await topoPanel(page)
      .locator(".w-pitem.sub", { hasText: "Function" })
      .click();
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
      "buttonInterface4",
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
      lines: [{ address: "1.1", powerSupply: { currentMa: 640 } }],
      devices: [
        {
          id: "pushButton",
          kind: "buttonInterface",
          behavior: "buttonInterface/v1",
          address: "1.1.1",
          objects: [
            {
              id: "b",
              ga: "1/1/1",
              dpt: "1.001",
              port: "switch",
              channel: "b",
              flags: { W: true, T: true },
            },
          ],
          channels: [
            { id: "b", parameters: { function: "switch", onPress: "on" } },
          ],
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
  for (const id of ["buttonInterface/v1", "weatherStation/v1", "logicGate/v1"])
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

test("documentation pins the built version on the CDN with its integrity hash", () => {
  for (const page of [
    "index.html",
    "guide/installation.html",
    "guide/versions.html",
  ]) {
    const html = readFileSync(join(DOCS, page), "utf8");
    expect(html).toContain(CDN_URL);
    expect(html).toContain(INTEGRITY);
    expect(html).not.toMatch(/\{\{(version|cdn-url|cdn-tag)\}\}/);
  }
});

test("guided designer renames a communication object", async ({ page }) => {
  const w = watch(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url("designer/index.html#template=lighting-control"));
  await page.click("#tab-guided");
  await page.locator(".g-item", { hasText: "Push-button" }).first().click();
  // Double-click the name, type, and confirm with Enter.
  const guided = page.locator("bd-guided");
  await guided.getByRole("tab", { name: "Group objects" }).first().click();
  await guided.locator("tr[data-obj=key1] .w-name").dblclick();
  const name = guided.getByRole("textbox", { name: "New name" });
  await name.fill("Ceiling light on");
  await name.press("Enter");
  const text = () =>
    page.evaluate(() =>
      (window as unknown as { designer: { text(): string } }).designer.text(),
    );
  await expect.poll(text).toContain('"name": "Ceiling light on"');
  expect(w.errors).toEqual([]);
});

test("typing a parameter's default value removes its reset button", async ({
  page,
}) => {
  const w = watch(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url("designer/index.html#template=lighting-control"));
  await page.click("#tab-guided");
  await page
    .locator(".g-item", { hasText: "Four-output switching actuator" })
    .first()
    .click();
  const guided = page.locator("bd-guided");
  await guided.getByRole("tab", { name: "Parameters" }).first().click();
  const group = guided.locator('.w-pgroup[data-page="ch:s1"]');
  if ((await group.locator(".w-ptog").getAttribute("aria-expanded")) !== "true")
    await group.locator(".w-ptog").click();
  await guided.locator('[data-page="ch:s1:delays"]').first().click();
  const field = guided.locator(".g-field", { hasText: "Switch-on delay" });
  const input = field.locator("input");
  await input.fill("2");
  await input.press("Enter");
  await expect(field.locator(".g-reset")).toHaveCount(1);
  // Typing the default value (0) again: stored as absent, no reset button.
  await input.fill("0");
  await input.press("Enter");
  await expect(field.locator(".g-reset")).toHaveCount(0);
  expect(w.errors).toEqual([]);
});

// HTML drag and drop between two elements of a scrolling pane. Playwright's dragTo may
// scroll during the gesture, which cancels a native drag: both elements must be visible.
async function drag(page: Page, source: Locator, target: Locator) {
  await target.scrollIntoViewIfNeeded();
  await source.scrollIntoViewIfNeeded();
  const s = (await source.boundingBox())!;
  const t = (await target.boundingBox())!;
  await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
  await page.mouse.down();
  await page.mouse.move(s.x + s.width / 2 + 20, s.y + s.height / 2 + 20, {
    steps: 5,
  });
  await page.mouse.move(t.x + t.width / 2, t.y + Math.min(20, t.height / 2), {
    steps: 10,
  });
  await page.mouse.up();
}

test.describe("designer workspace", () => {
  const json = (page: Page) =>
    page.evaluate(() =>
      JSON.parse(
        (window as unknown as { designer: { text(): string } }).designer.text(),
      ),
    );
  const top = (page: Page) => page.locator("bd-guided .w-panel").nth(0);
  const bottom = (page: Page) => page.locator("bd-guided .w-panel").nth(1);
  const node = (panel: Locator, key: string) =>
    panel.locator(`.w-node[data-key='${key}']`);
  /** Devices are collapsed in the tree: open one to show its group objects. */
  const expand = (panel: Locator, key: string) =>
    node(panel, key).locator(".w-tog").click();
  const gasOf = async (page: Page, dev: string, obj: string) =>
    [
      (await json(page)).devices
        .find((d: { id: string }) => d.id === dev)
        .objects.find((o: { id: string }) => o.id === obj).ga,
    ].flat();

  test("group ranges, new addresses, catalog, and sending address", async ({
    page,
  }) => {
    const w = watch(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(url("designer/index.html#template=status-feedback"));
    await page.click("#tab-guided");

    // Group addresses panel: name a main group, add an address in a middle group.
    await node(bottom(page), "main:1").click();
    const name = bottom(page).getByLabel("Name of main group 1");
    await name.fill("Lighting");
    await name.press("Tab");
    await expect
      .poll(async () => (await json(page)).groupRanges)
      .toEqual([{ address: "1", name: "Lighting" }]);
    await node(bottom(page), "mid:1/1").click();
    await bottom(page)
      .getByRole("button", { name: "+ Add group address" })
      .click();
    await expect(node(bottom(page), "ga:1/1/3")).toHaveClass(/sel/);

    // Catalog: select an entry and add it on line 1.1.
    await bottom(page).locator(".w-select").selectOption("catalog");
    await bottom(page).locator("tr", { hasText: "Temperature sensor" }).click();
    await bottom(page)
      .getByRole("button", { name: "Add", exact: true })
      .click();
    await expect
      .poll(async () =>
        (await json(page)).devices
          .filter(
            (d: { behavior: string }) => d.behavior === "temperatureSensor/v1",
          )
          .map((d: { address: string }) => d.address),
      )
      .toEqual([expect.stringMatching(/^1\.1\./)]);

    // Associations of a group object: make its second address the sending one.
    await expand(top(page), "dev:pushButton");
    await node(top(page), "obj:pushButton/key3").click();
    const assoc = top(page).locator(".w-table tbody tr");
    await expect(assoc.first()).toContainText("1/1/1");
    await assoc
      .filter({ hasText: "1/4/1" })
      .getByRole("button", { name: "Set as sending" })
      .click();
    expect(await gasOf(page, "pushButton", "key3")).toEqual(["1/4/1", "1/1/1"]);
    expect(w.errors).toEqual([]);
  });

  test("drag and drop links addresses and objects, adds and moves devices", async ({
    page,
  }) => {
    const w = watch(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(url("designer/index.html#template=status-feedback"));
    await page.click("#tab-guided");

    // Group address → group object (tree to tree): added after the sending address.
    await expand(top(page), "dev:pushButton");
    await drag(
      page,
      node(bottom(page), "ga:1/4/2"),
      node(top(page), "obj:pushButton/key1"),
    );
    await expect
      .poll(() => gasOf(page, "pushButton", "key1"))
      .toEqual(["1/1/1", "1/4/2"]);

    // Group object (row of the Group objects tab) → group address.
    await node(top(page), "dev:pushButton").click();
    await drag(
      page,
      top(page).locator("tr[data-obj=key2]"),
      node(bottom(page), "ga:1/4/1"),
    );
    await expect
      .poll(() => gasOf(page, "pushButton", "key2"))
      .toEqual(["1/1/2", "1/4/1"]);

    // Group object → middle group: a new address is created there and linked.
    await drag(
      page,
      top(page).locator("tr[data-obj=key1]"),
      node(bottom(page), "mid:1/1"),
    );
    await expect
      .poll(async () => (await gasOf(page, "pushButton", "key1")).length)
      .toBe(3);

    // Catalog entry → line of the topology tree.
    await bottom(page).locator(".w-select").selectOption("catalog");
    await drag(
      page,
      bottom(page).locator("tr", { hasText: "Temperature sensor" }),
      node(top(page), "line:1.1"),
    );
    await expect
      .poll(async () =>
        (await json(page)).devices.some(
          (d: { behavior: string }) => d.behavior === "temperatureSensor/v1",
        ),
      )
      .toBe(true);
    expect(w.errors).toEqual([]);
  });

  test("push-button interface: the function sets the objects, which link by drag and drop", async ({
    page,
  }) => {
    const w = watch(page);
    await page.setViewportSize({ width: 1500, height: 950 });
    await page.goto(url("designer/index.html"));
    // A document built in the designer: addresses without DPT, an input set to blind.
    const doc = readFileSync(
      resolve("tests/knx/fixtures/button-interface-designer.json"),
      "utf8",
    );
    await page.evaluate((t) => {
      localStorage.clear();
      (
        window as unknown as { designer: { setText(t: string): void } }
      ).designer.setText(t);
    }, doc);
    await page.click("#tab-guided");
    await node(top(page), "dev:buttonInterface").click();
    const guided = page.locator("bd-guided");
    await guided.getByRole("tab", { name: "Parameters" }).first().click();
    const group = guided.locator('.w-pgroup[data-page="ch:in2"]');
    if (
      (await group.locator(".w-ptog").getAttribute("aria-expanded")) !== "true"
    )
      await group.locator(".w-ptog").click();
    await guided.locator('[data-page="ch:in2:function"]').first().click();
    const fn = guided
      .locator(".g-field", { hasText: /^\s*Function/ })
      .locator("select")
      .first();
    const ports = async () =>
      (await json(page)).devices[0].objects
        .filter((o: { channel?: string }) => o.channel === "in2")
        .map((o: { port: string }) => o.port)
        .sort();
    await fn.selectOption({ label: "Switching" });
    await expect.poll(ports).toEqual(["switch"]);
    await fn.selectOption({ label: "Blind" });
    await expect.poll(ports).toEqual(["move", "stopStep"]);
    // No box to enable the objects of the function; no page of leftover settings.
    await expect(
      guided.locator(".w-ppage", { hasText: "Enable group object" }),
    ).toHaveCount(0);
    await expect(
      guided.locator(".w-pitem", { hasText: "Other settings" }),
    ).toHaveCount(0);
    await expect(
      guided
        .locator(".g-field", { hasText: "Operation (blind)" })
        .locator("option"),
    ).toHaveText([
      "One key: up and down in turn",
      "Two keys: this key raises",
      "Two keys: this key lowers",
    ]);

    // The up/down object links to an address without DPT by drag and drop.
    await guided.getByRole("tab", { name: "Group objects" }).first().click();
    for (const k of ["main:1", "mid:1/0"]) {
      const n = node(bottom(page), k);
      if ((await n.getAttribute("aria-expanded")) === "false")
        await n.locator("button.w-tog").click();
    }
    const move = (await json(page)).devices[0].objects.find(
      (o: { channel?: string; port: string }) =>
        o.channel === "in2" && o.port === "move",
    ).id as string;
    await drag(
      page,
      top(page).locator(`tr[data-obj=${move}]`),
      node(bottom(page), "ga:1/0/1"),
    );
    await expect
      .poll(() => gasOf(page, "buttonInterface", move))
      .toEqual(["1/0/1"]);

    // A long press on the key of input 2 sends the movement on 1/0/1.
    const key = page.locator("#preview button.key").nth(1);
    await key.dispatchEvent("pointerdown", { pointerId: 1, button: 0 });
    await page.waitForTimeout(800);
    await key.dispatchEvent("pointerup", { pointerId: 1, button: 0 });
    await expect(page.locator("#preview .mon tbody tr").first()).toContainText(
      "1/0/1",
      { timeout: 5000 },
    );
    expect(w.errors).toEqual([]);
  });

  test("push-button interface: key page, LED on demand, Simulation tab", async ({
    page,
  }) => {
    const w = watch(page);
    await page.setViewportSize({ width: 1500, height: 950 });
    await page.goto(url("designer/index.html"));
    const doc = readFileSync(
      resolve("tests/knx/fixtures/button-interface-designer.json"),
      "utf8",
    );
    await page.evaluate((t) => {
      localStorage.clear();
      (
        window as unknown as { designer: { setText(t: string): void } }
      ).designer.setText(t);
    }, doc);
    await page.click("#tab-guided");
    // No LED on a key unless it is asked for.
    await expect(page.locator("#preview button.key .led")).toHaveCount(0);
    await node(top(page), "dev:buttonInterface").click();
    const guided = page.locator("bd-guided");
    await guided.getByRole("tab", { name: "Parameters" }).first().click();
    const group = guided.locator('.w-pgroup[data-page="ch:in1"]');
    if (
      (await group.locator(".w-ptog").getAttribute("aria-expanded")) !== "true"
    )
      await group.locator(".w-ptog").click();
    // The label is on the Key page, not on the Function page.
    await guided.locator('[data-page="ch:in1:function"]').first().click();
    await expect(
      guided.locator(".w-ppage .g-field", { hasText: "Label" }),
    ).toHaveCount(0);
    // The wired push-button is an installation page, set apart in the tree.
    await expect(
      guided.locator('.w-pitem.inst[data-page="ch:in1:#key"]'),
    ).toHaveText(/Wired push-button/);
    await expect(
      guided.locator(".w-pdiv", { hasText: "Installation" }),
    ).toHaveCount(1);
    await guided.locator('[data-page="ch:in1:#key"]').first().click();
    const text = guided
      .locator(".w-ppage .g-field", { hasText: "Text on the key" })
      .locator("input");
    await text.fill("Ceiling");
    await text.press("Enter");
    await expect(page.locator("#preview button.key").first()).toContainText(
      "Ceiling",
    );
    // The input keeps its name in the parameters.
    await expect(
      guided.locator(".w-pitem", { hasText: "Input 1" }).first(),
    ).toBeVisible();
    await expect(
      guided.locator(".w-pitem", { hasText: "Ceiling" }),
    ).toHaveCount(0);
    // The LED page turns the LED on.
    await guided.locator('[data-page="ch:in1:led"]').first().click();
    await guided
      .locator(".g-check", { hasText: "LED on the key" })
      .locator("input")
      .check();
    await expect(page.locator("#preview button.key .led")).toHaveCount(1);
    // Simulation tab: the diagram alone.
    await page.click("#tab-sim");
    await expect(page.locator("#pane-guided")).toBeHidden();
    await expect(page.locator("#preview")).toBeVisible();
    const box = (await page.locator("#preview").boundingBox())!;
    expect(box.width).toBeGreaterThan(1300);
    await page.click("#tab-guided");
    await expect(page.locator("#pane-guided")).toBeVisible();
    // With the preview hidden beside the editor, the Simulation tab still shows it.
    await page.click("#toggle-preview");
    await expect(page.locator("#preview")).toBeHidden();
    await page.click("#tab-sim");
    await expect(page.locator("#preview")).toBeVisible();
    expect(
      (await page.locator("#preview").boundingBox())!.width,
    ).toBeGreaterThan(1300);
    await expect(page.locator("#preview .card").first()).toBeVisible();
    await page.click("#tab-json");
    await expect(page.locator("#preview")).toBeHidden();
    await page.click("#toggle-preview");
    expect(w.errors).toEqual([]);
  });

  test("an incompatible size is refused; a device moves to another line", async ({
    page,
  }) => {
    const w = watch(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(url("designer/index.html#template=dimming"));
    await page.click("#tab-guided");
    const before = await json(page);
    await expand(top(page), "dev:pushButton");
    // 1/3/1 carries a percentage (1 byte): it cannot link to a switching object (1 bit).
    await drag(
      page,
      node(bottom(page), "ga:1/3/1"),
      node(top(page), "obj:pushButton/on"),
    );
    expect(await json(page)).toEqual(before);

    await page.selectOption("#templates", "full-topology");
    await drag(page, node(top(page), "dev:p2"), node(top(page), "line:2.1"));
    await expect(page.locator(".g-notice")).toContainText("moved from 1.2.10");
    expect(w.errors).toEqual([]);
  });

  test("parameter pages, an object activated without address, context menus, and segments", async ({
    page,
  }) => {
    const w = watch(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(url("designer/index.html#template=status-feedback"));
    await page.click("#tab-guided");

    // Parameters: the menu on the left opens the page of output L2.
    await node(top(page), "dev:switchActuator").click();
    await top(page).getByRole("tab", { name: "Parameters" }).click();
    await top(page).locator(".w-pitem", { hasText: "L2" }).click();
    await expect(top(page).locator(".w-ppage h3")).toContainText("Output L2");
    await top(page).locator(".w-pitem.sub", { hasText: "Forcing" }).click();

    // Activating the forcing object creates it without address; it is then dragged onto a middle group.
    await top(page)
      .getByRole("checkbox", { name: "Enable group object “Forcing”" })
      .check();
    await expand(top(page), "dev:switchActuator");
    const forced = top(page).locator(
      ".w-node[data-key^='obj:switchActuator/f']",
    );
    await expect(forced).toHaveCount(1);
    const id = (await forced.getAttribute("data-key"))!.split("/")[1]!;
    expect(await gasOf(page, "switchActuator", id)).toEqual([]);
    await expect(page.locator("#status")).toHaveText(/Valid scenario/);
    await drag(page, forced, node(bottom(page), "mid:1/1"));
    await expect
      .poll(async () => (await gasOf(page, "switchActuator", id)).length)
      .toBe(1);

    // Context menu of a line: a line repeater shows two segments in the tree.
    await node(top(page), "line:1.1").click({ button: "right" });
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await node(top(page), "line:1.1").click({ button: "right" });
    await menu.getByRole("menuitem", { name: "Add a line repeater" }).click();
    await expect(node(top(page), "seg:1.1/1")).toBeVisible();
    await expect(node(top(page), "seg:1.1/2")).toBeVisible();
    await node(top(page), "line:1.1").click({ button: "right" });
    await menu
      .getByRole("menuitem", { name: "Remove the line extension" })
      .click();
    await expect(node(top(page), "seg:1.1/1")).toHaveCount(0);
    expect(w.errors).toEqual([]);
  });

  test("several loads on one output; context menus of the parameter pages", async ({
    page,
  }) => {
    const w = watch(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(url("designer/index.html#template=status-feedback"));
    await page.click("#tab-guided");
    await node(top(page), "dev:switchActuator").click();
    await top(page).getByRole("tab", { name: "Parameters" }).click();
    const loadsOf = async (ch: string) => {
      const d = (await json(page)).devices.find(
        (x: { id: string }) => x.id === "switchActuator",
      );
      const e = d.channels.find((c: { id: string }) => c.id === ch)?.equipment;
      return e == null ? [] : [e].flat().map((l: { type: string }) => l.type);
    };

    // Output L1 › Connected loads: two more loads, wired in parallel.
    await top(page)
      .locator(".w-pgroup .w-pitem", { hasText: "Output L1" })
      .click();
    await top(page)
      .locator(".w-pitem.sub", { hasText: "Connected loads" })
      .click();
    const add = top(page).getByRole("combobox", {
      name: "Connect a load to L1",
    });
    await add.selectOption({ label: "Lamp" });
    await add.selectOption({ label: "Appliance" });
    await expect
      .poll(() => loadsOf("s1"))
      .toEqual(["lamp", "lamp", "appliance"]);
    await expect(page.locator("#preview")).toContainText("L1 · 3");

    // Context menu of a load: move it, then disconnect it.
    await top(page)
      .locator(".w-load[data-load='2'] legend")
      .click({ button: "right" });
    await page.getByRole("menuitem", { name: "Move up" }).click();
    await expect
      .poll(() => loadsOf("s1"))
      .toEqual(["lamp", "appliance", "lamp"]);
    await top(page)
      .locator(".w-load[data-load='1'] legend")
      .click({ button: "right" });
    await page.getByRole("menuitem", { name: "Disconnect" }).click();
    await expect.poll(() => loadsOf("s1")).toEqual(["lamp", "lamp"]);

    // Context menu of an output in the page tree: delete it.
    await top(page)
      .locator(".w-pgroup .w-pitem", { hasText: "Output L4" })
      .click({ button: "right" });
    await page.getByRole("menuitem", { name: "Delete output" }).click();
    await expect
      .poll(async () =>
        (await json(page)).devices
          .find((x: { id: string }) => x.id === "switchActuator")
          .channels.map((c: { label: string }) => c.label),
      )
      .toEqual(["L1", "L2", "L3"]);
    await expect(page.locator("#status")).toHaveText(/Valid scenario/);
    expect(w.errors).toEqual([]);
  });

  test("sortable and resizable tables; number of outputs; no address on parameter pages", async ({
    page,
  }) => {
    const w = watch(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(url("designer/index.html#template=status-feedback"));
    await page.click("#tab-guided");
    await node(top(page), "dev:switchActuator").click();
    await top(page).getByRole("tab", { name: "Group objects" }).click();
    const table = top(page).locator("table[data-table=objects]");
    const firstCells = (col: number) =>
      table.locator(`tbody tr td:nth-child(${col})`).allTextContents();

    // The Channel column gives the output of each object.
    await expect(table.locator("thead")).toContainText("Channel");
    expect((await firstCells(3)).map((x) => x.trim())).toContain("L2");
    // Sort by name, descending on a second click.
    await table.locator("th .w-sort", { hasText: "Name" }).click();
    const asc = (await firstCells(2)).map((x) => x.trim());
    expect(asc).toEqual([...asc].sort((a, b) => a.localeCompare(b)));
    await table.locator("th .w-sort", { hasText: "Name" }).click();
    expect((await firstCells(2)).map((x) => x.trim())).toEqual(
      [...asc].reverse(),
    );
    // Widen the Name column by dragging the edge of its header.
    const th = table.locator("th", { hasText: "Name" });
    const before = (await th.boundingBox())!.width;
    const grip = (await th.locator(".w-colgrip").boundingBox())!;
    await page.mouse.move(grip.x + 3, grip.y + 5);
    await page.mouse.down();
    await page.mouse.move(grip.x + 83, grip.y + 5, { steps: 5 });
    await page.mouse.up();
    expect((await th.boundingBox())!.width).toBeGreaterThan(before + 60);
    // The same with the keyboard: arrows widen the column, Home returns to automatic widths.
    const typeTh = table.locator("th", { hasText: "DPT" });
    const dptWidth = (await typeTh.boundingBox())!.width;
    await typeTh.locator(".w-colgrip").focus();
    await page.keyboard.press("Shift+ArrowRight");
    expect((await typeTh.boundingBox())!.width).toBeGreaterThan(dptWidth + 30);
    await page.keyboard.press("Home");
    await expect(table).not.toHaveClass(/fixed/);

    // Parameters: no group address on any page; the number of outputs is a setting.
    await top(page).getByRole("tab", { name: "Parameters" }).click();
    for (const item of await top(page).locator(".w-pmenu .w-pitem").all()) {
      await item.click();
      await expect(top(page).locator(".w-ppage")).not.toContainText(
        /\d+\/\d+\/\d+/,
      );
    }
    await top(page).locator(".w-pitem", { hasText: "Configuration" }).click();
    const count = top(page).getByRole("spinbutton", {
      name: "Number of outputs",
    });
    await count.fill("6");
    await count.press("Tab");
    await expect
      .poll(
        async () =>
          (await json(page)).devices.find(
            (x: { id: string }) => x.id === "switchActuator",
          ).channels.length,
      )
      .toBe(6);
    await expect(top(page).locator(".w-pgroup")).toHaveCount(6);
    expect(w.errors).toEqual([]);
  });

  test("drop anywhere on the list of an address, renaming, flags, and tree filter", async ({
    page,
  }) => {
    const w = watch(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(url("designer/index.html#template=status-feedback"));
    await page.click("#tab-guided");

    // Devices are collapsed: their group objects appear once opened.
    await expect(
      top(page).locator(".w-node[data-key^='obj:pushButton/']"),
    ).toHaveCount(0);
    await expand(top(page), "dev:pushButton");
    await expect(
      top(page).locator(".w-node[data-key^='obj:pushButton/']"),
    ).not.toHaveCount(0);

    // An object dropped on the empty part of the address list is linked to that address.
    await node(bottom(page), "ga:1/4/2").click();
    await node(top(page), "dev:pushButton").click();
    await drag(
      page,
      top(page).locator("tr[data-obj=key2]"),
      bottom(page).locator(".w-list .w-empty, .w-list .w-bar").last(),
    );
    await expect
      .poll(() => gasOf(page, "pushButton", "key2"))
      .toContain("1/4/2");

    // Flags of a linked object can be changed from the address.
    const row = bottom(page).locator("tbody tr", { hasText: "Key 2" });
    await row.getByRole("checkbox", { name: /R$/ }).check();
    await expect
      .poll(async () =>
        (await json(page)).devices
          .find((d: { id: string }) => d.id === "pushButton")
          .objects.find((o: { id: string }) => o.id === "key2"),
      )
      .toMatchObject({ flags: { R: true } });

    // Renaming: F2 or double-click in the tree, Rename in the context menu of a row.
    await node(bottom(page), "ga:1/4/2").locator(".w-label").dblclick();
    let field = bottom(page).getByRole("textbox", { name: "New name" });
    await field.fill("Kitchen status");
    await field.press("Enter");
    await expect(node(bottom(page), "ga:1/4/2")).toContainText(
      "Kitchen status",
    );
    await node(bottom(page), "mid:1/4").click();
    await bottom(page)
      .locator("tbody tr", { hasText: "1/4/1" })
      .click({ button: "right" });
    await page.getByRole("menuitem", { name: "Rename" }).click();
    field = bottom(page).getByRole("textbox", { name: "New name" });
    await field.fill("Hall status");
    await field.press("Enter");
    await expect
      .poll(
        async () =>
          (await json(page)).groupAddresses.find(
            (g: { address: string }) => g.address === "1/4/1",
          ).name,
      )
      .toBe("Hall status");

    // The filter keeps the matching nodes and their ancestors.
    await bottom(page).getByRole("searchbox").fill("Kitchen");
    await expect(bottom(page).locator(".w-node[data-key^='ga:']")).toHaveCount(
      1,
    );
    expect(w.errors).toEqual([]);
  });
});
