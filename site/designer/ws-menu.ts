// Context menus of tree nodes and list rows (right-click, context-menu key, Shift+F10).
import { html, nothing } from "lit";
import type { TemplateResult } from "lit";
import * as E from "./edit";
import { t } from "./lang";
import {
  devOf,
  nameOf,
  parts,
  rangeName,
  reveal,
  select,
  showIn,
  startRename,
} from "./ws-state";
import type { Host, MenuItem, Panel } from "./ws-state";

// ── Context menus ────────────────────────────────────────────────────────────

/** Escape closes the open menu wherever the focus is. */
let menuEscape: ((e: KeyboardEvent) => void) | null = null;

export function closeMenu(host: Host) {
  host.ws.menu = null;
  if (menuEscape) document.removeEventListener("keydown", menuEscape, true);
  menuEscape = null;
  host.requestUpdate();
}

export function openMenu(
  host: Host,
  e: MouseEvent | KeyboardEvent,
  items: MenuItem[],
) {
  e.preventDefault();
  e.stopPropagation();
  let x: number;
  let y: number;
  if (e instanceof MouseEvent && e.type === "contextmenu") {
    x = e.clientX;
    y = e.clientY;
  } else {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    x = r.left + 24;
    y = r.bottom;
  }
  host.ws.menu = { x, y, items };
  if (menuEscape) document.removeEventListener("keydown", menuEscape, true);
  menuEscape = (k: KeyboardEvent) => {
    if (k.key !== "Escape") return;
    k.preventDefault();
    closeMenu(host);
  };
  document.addEventListener("keydown", menuEscape, true);
  host.requestUpdate();
  setTimeout(() =>
    document
      .querySelector<HTMLElement>(".w-menu button:not([disabled])")
      ?.focus(),
  );
}

/** Show the list of an element on a tab (Associations, Parameters…) in its panel. */
function openTab(host: Host, key: string, kind: string, tab: string) {
  reveal(host, key);
  const content = ["ga", "main", "mid"].includes(kind)
    ? "addresses"
    : "topology";
  const p = host.ws.panels.find((x) => x.content === content);
  if (p) {
    p.sel = key;
    p.tabs[kind] = tab;
  }
  host.requestUpdate();
}

/** Open the Associations tab of an object or address and focus its “Link with…” list. */
function linkWith(host: Host, key: string, kind: "obj" | "ga") {
  openTab(host, key, kind, "associations");
  setTimeout(() =>
    document.querySelector<HTMLSelectElement>(".w-link-with")?.focus(),
  );
}

/**
 * Commands of a tree node or list row. The same element
 * has the same commands wherever it appears; a list row also offers to open it.
 */
export function menuFor(
  host: Host,
  p: Panel,
  key: string,
  /** "tree", or "list:<panel content>" for a row of a list. */
  where = "tree",
): MenuItem[] {
  const doc = host.doc!;
  const [kind, rest] = [key.split(":")[0]!, key.slice(key.indexOf(":") + 1)];
  const items: MenuItem[] = [];
  if (where.startsWith("list") && !key.startsWith("entry:"))
    items.push({
      label: t`Open`,
      run: () => {
        if (
          ["topo", "area", "line", "seg", "gar", "main", "mid"].includes(kind)
        )
          select(host, p, key);
        else reveal(host, key);
      },
    });
  const rename = () =>
    nameOf(doc, key)
      ? [{ label: t`Rename`, run: () => startRename(host, key, where) }]
      : [];
  const addDevices = (line: string) => () => {
    host.ws.catalogLine = line;
    showIn(host, p, "catalog");
    host.requestUpdate();
  };
  switch (kind) {
    case "topo":
      items.push({
        label: t`Add area`,
        run: () => host.run(t`New area`, (d) => void E.addArea(d)),
      });
      break;
    case "area": {
      const a = Number(rest);
      items.push(
        ...rename(),
        {
          label: t`Add line`,
          run: () => host.run(t`New line`, (d) => void E.addLine(d, a)),
        },
        {
          label: t`Delete area`,
          run: () =>
            host.run(t`Deleting area ${a}`, (d) => void E.removeArea(d, a)),
          disabled:
            E.areasOf(doc).length > 1
              ? undefined
              : t`An installation keeps at least one area.`,
        },
      );
      break;
    }
    case "line":
    case "seg": {
      const line = rest.split("/")[0]!;
      const l = doc.lines.find((x) => String(x.address) === line);
      items.push({ label: t`Add devices…`, run: addDevices(line) });
      if (kind === "line") items.push(...rename());
      if (l)
        items.push(
          l.extension
            ? {
                label: t`Remove the line extension`,
                run: () =>
                  host.run(t`Line extension`, (d) =>
                    E.setLineExtension(d, line, null),
                  ),
              }
            : {
                label: t`Add a line repeater`,
                run: () =>
                  host.run(t`Line extension`, (d) =>
                    E.setLineExtension(d, line, "repeater"),
                  ),
              },
          {
            label: t`Delete line`,
            run: () =>
              host.run(
                t`Deleting line ${line}`,
                (d) => void E.removeLine(d, line),
              ),
            disabled:
              doc.lines.length > 1
                ? undefined
                : t`An installation keeps at least one line.`,
          },
        );
      break;
    }
    case "dev": {
      const dv = devOf(doc, rest);
      items.push(
        {
          label: t`Group objects`,
          run: () => openTab(host, key, "dev", "objects"),
        },
        {
          label: t`Parameters`,
          run: () => openTab(host, key, "dev", "parameters"),
        },
        ...rename(),
        {
          label: t`Order group objects by number`,
          run: () =>
            host.run(t`Order group objects by number`, (d) => {
              const dv = d.devices.find((x) => x.id === rest);
              if (dv) E.sortObjects(dv);
            }),
          disabled:
            dv && !E.objectsSorted(dv)
              ? undefined
              : t`The group objects are already in the order of their numbers.`,
        },
        {
          label: t`Delete device`,
          run: () => host.run(t`Delete device`, (d) => E.removeDevice(d, rest)),
        },
      );
      break;
    }
    case "obj": {
      const [devId, objectId] = rest.split("/") as [string, string];
      const o = devOf(doc, devId)?.objects.find((x) => x.id === objectId);
      const gas = o ? E.gasOf(o) : [];
      const ref = [{ dev: devId, obj: objectId }];
      items.push(
        {
          label: t`Associations`,
          run: () => openTab(host, key, "obj", "associations"),
        },
        {
          label: t`Properties`,
          run: () => openTab(host, key, "obj", "properties"),
        },
        { label: t`Link with…`, run: () => linkWith(host, key, "obj") },
        ...rename(),
        {
          label: t`Unlink all group addresses`,
          run: () =>
            host.run(t`Remove an address`, (d) =>
              gas.forEach((ga) => E.setGaMembers(d, ga, [], ref)),
            ),
          disabled: gas.length ? undefined : t`No linked group address.`,
        },
        {
          label: t`Delete object`,
          run: () =>
            host.run(t`Deleting the object`, (d) =>
              E.removeObject(d, devId, objectId),
            ),
        },
      );
      break;
    }
    case "gar":
      items.push({
        label: t`Add main group`,
        run: () =>
          host.run(
            t`New main group`,
            (d) => void E.addMainGroup(d, t`New main group`),
          ),
      });
      break;
    case "main": {
      const m = Number(rest);
      const used = doc.groupAddresses.some((g) => parts(g.address)[0] === m);
      items.push(
        {
          label: t`Add middle group`,
          run: () =>
            host.run(
              t`New middle group`,
              (d) => void E.addMiddleGroup(d, m, t`New middle group`),
            ),
        },
        ...rename(),
        {
          label: t`Delete main group`,
          run: () =>
            host.run(t`Group name`, (d) => E.setGroupRangeName(d, rest, "")),
          disabled: used
            ? t`Delete its group addresses first.`
            : rangeName(doc, rest)
              ? undefined
              : t`This group only exists through its addresses.`,
        },
      );
      break;
    }
    case "mid": {
      const [m, mm] = parts(rest);
      const used = doc.groupAddresses.some((g) =>
        g.address.startsWith(`${rest}/`),
      );
      items.push(
        {
          label: t`Add group address`,
          run: () =>
            host.run(
              t`New group address`,
              (d) => void E.newGaIn(d, m!, mm!, t`New group address`),
            ),
        },
        ...rename(),
        {
          label: t`Delete middle group`,
          run: () =>
            host.run(t`Group name`, (d) => E.setGroupRangeName(d, rest, "")),
          disabled: used
            ? t`Delete its group addresses first.`
            : rangeName(doc, rest)
              ? undefined
              : t`This group only exists through its addresses.`,
        },
      );
      break;
    }
    case "ga":
      items.push(
        {
          label: t`Associations`,
          run: () => openTab(host, key, "ga", "associations"),
        },
        {
          label: t`Properties`,
          run: () => openTab(host, key, "ga", "properties"),
        },
        { label: t`Link with…`, run: () => linkWith(host, key, "ga") },
        ...rename(),
        {
          label: t`Delete group address`,
          run: () =>
            host.run(t`Delete address`, (d) => void E.removeGa(d, rest)),
        },
      );
      break;
    case "entry":
      // A catalog entry: add it on one of the lines.
      items.push(
        ...doc.lines.slice(0, 12).map((l) => ({
          label: t`Add on line ${String(l.address)}`,
          run: () => host.insertDevice(String(l.address), rest),
        })),
      );
      break;
  }
  if (!items.length)
    items.push({
      label: t`No command for this element`,
      run: () => {},
      disabled: t`No command for this element`,
    });
  return items;
}

export function menuView(host: Host): TemplateResult | typeof nothing {
  const m = host.ws.menu;
  if (!m) return nothing;
  const close = () => closeMenu(host);
  return html`<div
      class="w-menu-back"
      @click=${close}
      @contextmenu=${(e: Event) => {
        e.preventDefault();
        close();
      }}
    ></div>
    <div
      class="w-menu"
      role="menu"
      style="left:${Math.min(m.x, window.innerWidth - 240)}px;top:${Math.min(m.y, window.innerHeight - 40 * m.items.length - 10)}px"
      @keydown=${(e: KeyboardEvent) => {
        const items = [
          ...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(
            "button:not([disabled])",
          ),
        ];
        const i = items.indexOf(document.activeElement as HTMLElement);
        if (e.key === "ArrowDown") items[(i + 1) % items.length]?.focus();
        else if (e.key === "ArrowUp")
          items[(i - 1 + items.length) % items.length]?.focus();
        else return;
        e.preventDefault();
      }}
    >
      ${m.items.map(
        (it) =>
          html`<button
            role="menuitem"
            ?disabled=${!!it.disabled}
            title=${it.disabled ?? ""}
            @click=${() => {
              close();
              it.run();
            }}
          >
            ${it.label}
          </button>`,
      )}
    </div>`;
}
