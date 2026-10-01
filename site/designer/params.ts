// Parameters of a device, as the Parameters tab of ETS: the general page, one page per
// key or output, and the objects shared by all outputs, with their port rows.
import { html, nothing } from "lit";
import type { TemplateResult } from "lit";
import { live } from "lit/directives/live.js";
import type { BehaviorDefinition, BehaviorPort } from "../../src/knx/contracts";
import type { Registry } from "../../src/knx/registry";
import type { Chan, Dev, Doc, Gesture } from "./edit";
import * as E from "./edit";
import { t } from "./lang";
import type { GuidedEditor } from "./guided";

export const tt = (text: string | undefined) =>
  text ? (t.s ? t.s(text) : text) : "";

/** A page of device parameters, listed in the menu on the left. */
export interface Page {
  key: string;
  label: string;
  sum?: string;
  body: () => TemplateResult;
}

/** General page of a device: identity, place on the bus, device settings. */
export function generalPage(ed: GuidedEditor, doc: Doc, d: Dev) {
  const def = ed.registry.behaviors.get(d.behavior);
  const lv = E.levelsOf(doc);
  const visu = d.kind === "supervisor";
  const places: [string, string][] = [
    ...(visu && lv.ip
      ? [["IP", t`IP network (KNXnet/IP routing)`] as [string, string]]
      : []),
    ...(lv.backbone ? [["0.0", t`backbone 0.0`] as [string, string]] : []),
    ...E.areasOf(doc).flatMap((a) => [
      ...(lv.mainLines.includes(a)
        ? [[`${a}.0`, t`main line ${a}.0`] as [string, string]]
        : []),
      ...doc.lines
        .filter((l) => String(l.address).startsWith(`${a}.`))
        .map(
          (l) =>
            [String(l.address), t`line ${String(l.address)}`] as [
              string,
              string,
            ],
        ),
    ]),
  ];
  const place = E.lineOf(d) ?? "";
  const ext = doc.lines.find((l) => String(l.address) === place)?.extension as
    { address?: string } | undefined;
  return html`<section class="g-sec">
      <h3>${d.name ?? d.id} <code>${d.address ?? "IP"}</code></h3>
      <p class="g-hint">
        ${ed.typeLabel(d)}${def?.description ? html` — ${tt(def.description)}` : nothing}
        ${def ? nothing : html`<br /><b>${t`Behavior not loaded in the designer: data kept, limited forms.`}</b>`}
      </p>
      <div class="g-row">
        ${ed.text(t`Name`, d.name ?? "", (v) => ed.run(t`Name`, (x) => E.setDeviceField(x, d.id, "name", v)))}
        ${ed.select(visu ? t`Connection` : t`Line`, places, place, (v) =>
          ed.run(t`Connection`, (x) => E.connectDevice(x, d.id, v)),
        )}
        ${
          place !== "IP" && d.address !== undefined
            ? html`${ed.text(
                t`Individual address`,
                d.address,
                (v) =>
                  ed.run(t`Individual address`, (x) =>
                    E.setDeviceAddress(x, d.id, v),
                  ),
                false,
                "narrow",
              )}`
            : nothing
        }
        ${
          E.roomsOf(doc).length && !def?.output
            ? ed.select(
                t`Room`,
                [
                  ["", t`none`],
                  ...E.roomsOf(doc).map(
                    (r) => [r.id, r.name ?? r.id] as [string, string],
                  ),
                ],
                d.room ?? "",
                (v) => ed.run(t`Room`, (x) => E.setDeviceRoom(x, d.id, v)),
              )
            : nothing
        }
      </div>
      ${
        ext && place !== "IP"
          ? html`<label class="g-check">
              <input
                type="checkbox"
                .checked=${live(d.downstream === true)}
                @change=${(e: Event) =>
                  ed.run(t`Segment`, (x) =>
                    E.setDownstream(
                      x,
                      d.id,
                      (e.target as HTMLInputElement).checked,
                    ),
                  )}
              />
              ${t`On the segment behind the line extension (${String(ext.address ?? "")})`}
            </label>`
          : nothing
      }
      ${ed.text(
        t`Help text (shown in the diagram inspector)`,
        d.description ?? "",
        (v) =>
          ed.run(t`Help text`, (x) =>
            E.setDeviceField(x, d.id, "description", v),
          ),
        true,
      )}
    </section>
    ${visu ? visualisation(ed, d, place) : nothing}
    ${
      def?.parameters
        ? html`<section class="g-sec">
            <h3>${t`Device settings`}</h3>
            ${ed.params(def.parameters, d.parameters ?? {}, (k, v) =>
              ed.run(t`Setting`, (x) => E.setParam(x, d.id, null, k, v)),
            )}
          </section>`
        : nothing
    }
    <section class="g-sec g-danger">
      ${ed.dangerButton(
        `dev:${d.id}`,
        t`Delete device`,
        t`Delete “${d.name ?? d.id}”? Its group addresses remain declared.`,
        () => {
          if (ed.run(t`Deletion`, (x) => E.removeDevice(x, d.id))) ed.go(null);
        },
      )}
    </section>`;
}

/** Supervisor: how it sees the bus and whether the project declares its addresses through a dummy device. */
export function visualisation(ed: GuidedEditor, d: Dev, place: string) {
  const known = d.inFilterTables !== false;
  return html`<section class="g-sec">
    <h3>${t`What reaches the supervisor`}</h3>
    <p class="g-hint">
      ${
        place === "IP"
          ? t`On the IP network, the supervisor receives what the KNXnet/IP routers let through: their filter table decides.`
          : t`Connected to a line through an interface, the supervisor receives what travels on that line: the couplers decide what gets there.`
      }
    </p>
    <label class="g-check">
      <input
        type="checkbox"
        .checked=${live(known)}
        @change=${(e: Event) =>
          ed.run(t`Declaration in the project`, (x) =>
            E.setInFilterTables(
              x,
              d.id,
              (e.target as HTMLInputElement).checked,
            ),
          )}
      />
      ${t`Declared in the project (dummy device with its addresses)`}
    </label>
    <p class="g-hint">
      ${
        known
          ? t`The project knows its addresses: the filter tables let them through to it.`
          : t`This supervisor is not declared in the project: couplers block the addresses only it uses. Remedies: declare it (dummy device), or set the couplers to “route everything”.`
      }
    </p>
  </section>`;
}

export function keyPages(ed: GuidedEditor, doc: Doc, d: Dev): Page[] {
  const kinds = E.actionKinds();
  const gestureLabel: Record<Gesture, string> = {
    press: t`Press`,
    short: t`Short press`,
    long: t`Long press`,
  };
  const summary = (k: E.KeyView) =>
    (
      Object.entries(k.gestures) as [
        Gesture,
        NonNullable<E.KeyView["gestures"][Gesture]>,
      ][]
    )
      .map(([g, a]) => {
        const v =
          kinds[a.kind].values.find(([x]) => x === a.value)?.[1] ??
          String(a.value);
        return `${k.mode === "press" ? "" : `${gestureLabel[g]} : `}${v} → ${a.ga ?? "—"}`;
      })
      .join(" · ") + (k.led ? ` · ${t`LED`}` : "");
  return E.keysOf(d).map((k): Page => ({
    key: `key:${k.id}`,
    label: k.label,
    sum: summary(k),
    body: () => html`
      <div class="g-row">
        ${ed.text(t`Label`, k.label, (v) => ed.run(t`Label`, (x) => E.setKeyLabel(x, d.id, k.id, v)))}
        ${ed.select(
          t`Gesture`,
          [
            ["press", t`single press`],
            ["shortlong", t`short press + long press`],
          ],
          k.mode,
          (v) =>
            ed.run(t`Gesture`, (x) =>
              E.setKeyMode(x, d.id, k.id, v as "press" | "shortlong"),
            ),
        )}
      </div>
      ${(
        Object.entries(k.gestures) as [
          Gesture,
          NonNullable<E.KeyView["gestures"][Gesture]>,
        ][]
      ).map(([g, a]) => {
        const kind = kinds[a.kind];
        return html`<fieldset class="g-gesture" data-obj=${a.objectId}>
          <legend>${gestureLabel[g]}</legend>
          <div class="g-row">
            ${ed.select(
              t`Function`,
              Object.entries(kinds).map(([id, x]) => [id, x.label]),
              a.kind,
              (v) => {
                const nk = kinds[v as E.ActionKind];
                ed.run(t`Function`, (x) =>
                  E.setGestureAction(
                    x,
                    d.id,
                    k.id,
                    g,
                    v as E.ActionKind,
                    nk.values[0]![0],
                  ),
                );
              },
            )}
            ${ed.select(
              t`Value sent`,
              kind.values.map(([v, l]) => [String(v), l]),
              String(a.value),
              (v) =>
                ed.run(t`Value sent`, (x) =>
                  E.setGestureAction(
                    x,
                    d.id,
                    k.id,
                    g,
                    a.kind,
                    v === "toggle" ? "toggle" : Number(v),
                  ),
                ),
            )}
            ${ed.gaPicker(
              doc,
              t`Sending address`,
              a.ga,
              kind.dpt,
              false,
              `${d.name ?? d.id} ${k.label}`,
              (ga, x) => E.setGestureGa(x, d.id, k.id, g, ga!),
            )}
          </div>
        </fieldset>`;
      })}
      <div class="g-row">
        <label class="g-check"
          ><input
            type="checkbox"
            .checked=${live(k.led)}
            @change=${(e: Event) => ed.run(t`LED`, (x) => E.setKeyLed(x, d.id, k.id, (e.target as HTMLInputElement).checked))}
          />${t`LED`}</label
        >
        ${ed.gaPicker(
          doc,
          t`Status feedback listened to (LED)`,
          k.feedback,
          "1.001",
          true,
          t`Status ${k.label}`,
          (ga, x) => E.setKeyFeedback(x, d.id, k.id, ga),
        )}
      </div>
      <div class="g-row g-end">
        ${ed.dangerButton(
          `key:${d.id}:${k.id}`,
          t`Delete key`,
          t`Delete key ${k.label}?`,
          () => ed.run(t`Deletion`, (x) => E.removeKey(x, d.id, k.id)),
          true,
        )}
      </div>
    `,
  }));
}

export function displayPage(ed: GuidedEditor, doc: Doc, d: Dev): Page {
  return {
    key: "display",
    label: t`Displayed values`,
    body: () =>
      html`<div class="g-chips">
        ${d.objects
          .filter((o) => o.port === "display")
          .map(
            (o) =>
              html`<span class="g-chip"
                >${E.gasOf(o).join(", ") || "—"} · ${o.name ?? o.id}
                <button
                  title=${t`Remove`}
                  @click=${() => ed.run(t`Removal`, (x) => E.removeObject(x, d.id, o.id))}
                >
                  ×
                </button></span
              >`,
          )}
        ${ed.gaAdder(doc, null, [], "", (ga, x) => E.addDisplay(x, d.id, ga), t`Display an address`)}
      </div>`,
  };
}

export function equipmentChoices(
  ed: GuidedEditor,
  def: BehaviorDefinition<unknown>,
) {
  return [...ed.registry.equipment]
    .filter(([, e]) => e.accepts === def.output)
    .map(([id, e]) => [id, e.title ? tt(e.title) : id] as [string, string]);
}

export function addOutput(
  ed: GuidedEditor,
  d: Dev,
  def: BehaviorDefinition<unknown>,
) {
  const equipments = equipmentChoices(ed, def);
  ed.run(t`Output`, (x) => {
    const e =
      d.channels?.[d.channels.length - 1]?.equipment?.type ??
      equipments[0]?.[0];
    E.addChannel(
      x,
      d.id,
      e ? { type: e, ...defaultEquipmentParams(ed.registry, e) } : null,
    );
  });
}

export function outputPages(
  ed: GuidedEditor,
  doc: Doc,
  d: Dev,
  def: BehaviorDefinition<unknown>,
): Page[] {
  const equipments = equipmentChoices(ed, def);
  const chPorts = Object.entries(def.ports).filter(
    ([, p]) => p.channel === "required",
  );
  const eqTitle = (type: string | undefined) =>
    type
      ? (equipments.find(([id]) => id === type)?.[1] ?? type)
      : t`free output`;
  return (d.channels ?? []).map((c): Page => {
    const eq = c.equipment?.type ?? "";
    const edef = eq ? ed.registry.equipment.get(eq) : undefined;
    const portGas = (port: string) =>
      d.objects
        .filter((o) => o.port === port && o.channel === c.id)
        .flatMap(E.gasOf);
    const sum = chPorts
      .map(([port, p]) => [tt(p.title) || port, portGas(port)] as const)
      .filter(([, g]) => g.length)
      .map(([title, g]) => `${title} ${g.join(", ")}`)
      .join(" · ");
    return {
      key: `ch:${c.id}`,
      label: c.label ?? c.id,
      sum: `${eqTitle(eq)} · ${sum || t`no address`}`,
      body: () => {
        const more = [
          ...(def.ports.scene
            ? [
                ed.text(
                  t`Scenes (number=value, e.g. 1=1, 2=0)`,
                  E.switchChannels(d).find((x) => x.id === c.id)?.scenes ?? "",
                  (v) =>
                    ed.run(t`Scenes`, (x) =>
                      E.setChannelScenes(x, d.id, c.id, v),
                    ),
                ),
              ]
            : []),
          ...ed.paramFields(
            def.channelParameters,
            c.parameters ?? {},
            (k, v) =>
              ed.run(t`Setting`, (x) => E.setParam(x, d.id, c.id, k, v)),
            true,
          ),
          ...ed.paramFields(
            edef?.parameters,
            c.equipment?.parameters ?? {},
            (k, v) =>
              ed.run(t`Setting`, (x) =>
                E.setParam(x, d.id, c.id, k, v, "equipment"),
              ),
            true,
          ),
        ];
        const basic = [
          ...ed.paramFields(
            def.channelParameters,
            c.parameters ?? {},
            (k, v) =>
              ed.run(t`Setting`, (x) => E.setParam(x, d.id, c.id, k, v)),
            false,
          ),
          ...ed.paramFields(
            edef?.parameters,
            c.equipment?.parameters ?? {},
            (k, v) =>
              ed.run(t`Setting`, (x) =>
                E.setParam(x, d.id, c.id, k, v, "equipment"),
              ),
            false,
          ),
        ];
        return html`
          <div class="g-row">
            ${ed.text(t`Label`, c.label ?? c.id, (v) => ed.run(t`Label`, (x) => E.setChannelLabel(x, d.id, c.id, v)))}
            ${ed.select(
              t`Connected load`,
              [["", t`none (unused output)`], ...equipments],
              eq,
              (v) =>
                ed.run(t`Connected load`, (x) =>
                  E.setChannelLoad(
                    x,
                    d.id,
                    c.id,
                    v
                      ? {
                          type: v,
                          ...(ed.registry.equipment.get(v)?.heatOutput
                            ? { room: E.roomsOf(x)[0]?.id ?? E.addRoom(x) }
                            : {}),
                          ...defaultEquipmentParams(ed.registry, v, c),
                        }
                      : null,
                  ),
                ),
            )}
            ${
              edef?.heatOutput
                ? ed.select(
                    t`Heated room`,
                    E.roomsOf(doc).map(
                      (r) => [r.id, r.name ?? r.id] as [string, string],
                    ),
                    c.equipment?.room ?? "",
                    (v) =>
                      ed.run(t`Heated room`, (x) =>
                        E.setEquipmentRoom(x, d.id, c.id, v),
                      ),
                  )
                : nothing
            }
          </div>
          <div class="g-ports">
            ${chPorts.map(([port, p]) =>
              portRows(ed, doc, d, port, p, c.id, c.label ?? c.id),
            )}
          </div>
          ${basic.length ? html`<div class="g-row">${basic}</div>` : nothing}
          ${
            more.length
              ? html`<details class="g-more">
                  <summary>${t`More options`}</summary>
                  <div class="g-row">${more}</div>
                </details>`
              : nothing
          }
          ${copyPanel(ed, doc, d, c)}
          <div class="g-row g-end">
            ${
              ed.copy?.dev === d.id && ed.copy.ch === c.id
                ? nothing
                : html`<button
                    class="g-btn small"
                    ?disabled=${!E.copyTargets(doc, d.id, c.id).length}
                    @click=${() => {
                      ed.copy = {
                        dev: d.id,
                        ch: c.id,
                        targets: new Set(),
                        what: {
                          parameters: true,
                          load: false,
                          scenes: false,
                        },
                      };
                      ed.requestUpdate();
                    }}
                  >
                    ${t`Copy settings to…`}
                  </button>`
            }
            ${ed.dangerButton(
              `ch:${d.id}:${c.id}`,
              t`Delete output`,
              t`Delete output ${c.label ?? c.id} and its objects?`,
              () => ed.run(t`Deletion`, (x) => E.removeChannel(x, d.id, c.id)),
              true,
            )}
          </div>
        `;
      },
    };
  });
}

/** Ports without channel or "all channels" (e.g. common scene at all exits). */
export function portsPage(
  ed: GuidedEditor,
  doc: Doc,
  d: Dev,
  def: BehaviorDefinition<unknown>,
): Page | null {
  // Thermostat, contact, and sensor: no outputs, push-button keys, or display.
  const generic = !def.output && !def.ports.input && !def.ports.display;
  const ports = Object.entries(def.ports).filter(
    ([name, p]) =>
      (generic && p.channel !== "required") ||
      p.channel === "optional" ||
      (p.channel !== "required" &&
        !def.acceptsInputs &&
        !["display"].includes(name) &&
        def.output),
  );
  if (!ports.length) return null;
  return {
    key: "ports",
    label: generic ? t`Objects by function` : t`Objects shared by all outputs`,
    body: () =>
      html`<div class="g-ports">
        ${ports.map(([port, p]) =>
          portRows(ed, doc, d, port, p, undefined, d.name ?? d.id),
        )}
      </div>`,
  };
}

/**
 * Copy settings from one output to other outputs of the same behavior: categories
 * selected, balance before applying; objects and addresses of targets never changed.
 */
export function copyPanel(ed: GuidedEditor, doc: Doc, d: Dev, c: Chan) {
  const cp = ed.copy;
  if (!cp || cp.dev !== d.id || cp.ch !== c.id) return nothing;
  // Double-worded ("not used"): the output identifier distinguishes them.
  const raw = E.copyTargets(doc, d.id, c.id);
  const targets = raw.map((x) =>
    raw.filter((y) => y.dev === x.dev && y.label === x.label).length > 1
      ? { ...x, label: `${x.label} (${x.ch})` }
      : x,
  );
  const def = ed.registry.behaviors.get(d.behavior);
  const cats: [keyof E.CopyWhat, string, boolean][] = [
    ["parameters", t`Output settings`, true],
    ["load", t`Connected load (type, room, settings)`, !!def?.output],
    ["scenes", t`Scenes`, !!def?.ports.scene],
  ];
  const chosen = targets.filter((x) => cp.targets.has(`${x.dev}/${x.ch}`));
  const what = cats.filter(([k, , ok]) => ok && cp.what[k]);
  const byDev = new Map<string, typeof targets>();
  targets.forEach((x) =>
    byDev.set(x.deviceName, [...(byDev.get(x.deviceName) ?? []), x]),
  );
  return html`<fieldset class="g-gesture g-copy">
    <legend>${t`Copy settings of ${c.label ?? c.id}`}</legend>
    <div class="g-row">
      ${cats
        .filter(([, , ok]) => ok)
        .map(
          ([k, label]) =>
            html`<label class="g-check"
              ><input
                type="checkbox"
                .checked=${live(cp.what[k])}
                @change=${(e: Event) => {
                  cp.what[k] = (e.target as HTMLInputElement).checked;
                  ed.requestUpdate();
                }}
              />${label}</label
            >`,
        )}
    </div>
    <p class="g-hint">
      ${t`To (same device type) — objects and group addresses of the chosen outputs are not changed:`}
    </p>
    ${[...byDev].map(
      ([name, list]) =>
        html`<div class="g-row">
          <small class="g-cdev">${name}</small>
          ${list.map((x) => {
            const key = `${x.dev}/${x.ch}`;
            return html`<label class="g-check"
              ><input
                type="checkbox"
                .checked=${live(cp.targets.has(key))}
                @change=${(e: Event) => {
                  if ((e.target as HTMLInputElement).checked)
                    cp.targets.add(key);
                  else cp.targets.delete(key);
                  ed.requestUpdate();
                }}
              />${x.label}</label
            >`;
          })}
        </div>`,
    )}
    <p class="g-plan-line">
      ${
        chosen.length && what.length
          ? t`Summary: ${what.map(([, l]) => l.toLowerCase()).join(", ")} of ${c.label ?? c.id} → ${chosen.map((x) => x.label).join(", ")}.`
          : t`Choose at least one output and one category.`
      }
    </p>
    <div class="g-row g-end">
      <button
        class="g-btn"
        @click=${() => ((ed.copy = null), ed.requestUpdate())}
      >
        ${t`Undo`}
      </button>
      <button
        class="g-btn solid"
        ?disabled=${!chosen.length || !what.length}
        @click=${() => {
          const label = t`Settings of ${c.label ?? c.id} copied to ${chosen.length} output(s)`;
          const whatSel: E.CopyWhat = {
            parameters: cp.what.parameters,
            load: cp.what.load && !!def?.output,
            scenes: cp.what.scenes && !!def?.ports.scene,
          };
          if (
            ed.run(label, (x) =>
              E.copyChannelSettings(
                x,
                d.id,
                c.id,
                chosen.map((y) => ({ dev: y.dev, ch: y.ch })),
                whatSel,
              ),
            )
          ) {
            ed.copy = null;
            ed.notice = label;
          }
          ed.requestUpdate();
        }}
      >
        ${t`Copy`}
      </button>
    </div>
  </fieldset>`;
}

/**
 * One line per port: a port that receives can listen to multiple addresses, a port that emits
 * has only one sending address.
 */
/**
 * Association rows for a port, with or without a channel: one per object. Multiple
 * objects on the same port remain distinct; each keeps its addresses and flags.
 */
export function portRows(
  ed: GuidedEditor,
  doc: Doc,
  d: Dev,
  port: string,
  p: BehaviorPort,
  ch: string | undefined,
  owner: string,
) {
  const objs = d.objects.filter(
    (o) =>
      o.port === port && (ch === undefined ? !o.channel : o.channel === ch),
  );
  const title = tt(p.title) || port;
  const fallback = p.dpts === "any" ? "1.001" : p.dpts[0]!;
  const row = (o: E.Obj | undefined) => {
    const dpt = o?.dpt ?? fallback;
    const opts = {
      dpt,
      W: p.direction !== "out",
      T: p.direction === "out",
      name: ch === undefined ? title : `${title} ${owner}`,
    };
    return portRow(
      ed,
      doc,
      objs.length > 1 ? `${title} · ${o!.name ?? o!.id}` : title,
      p.direction,
      o ? E.gasOf(o) : [],
      dpt,
      `${title} ${owner}`,
      // An active object stays when its last address is removed, as in ETS.
      (x, list) =>
        E.setPortGas(x, d.id, port, ch, list, {
          ...opts,
          objectId: o?.id,
          keepEmpty: !!o,
        }),
      o?.id,
      (x, on) =>
        E.setPortGas(x, d.id, port, ch, [], {
          ...opts,
          objectId: o?.id,
          keepEmpty: on,
        }),
    );
  };
  return objs.length ? objs.map(row) : [row(undefined)];
}

export function portRow(
  ed: GuidedEditor,
  doc: Doc,
  title: string,
  direction: "in" | "out" | undefined,
  gas: string[],
  dpt: string,
  newName: string,
  set: (doc: Doc, list: string[]) => void,
  objectId?: string,
  activate?: (doc: Doc, on: boolean) => void,
) {
  const out = direction === "out";
  const compatible = ed.compatible(doc, dpt);
  return html`<div
    class="g-port ${activate && !objectId ? "off" : ""}"
    data-obj=${objectId ?? ""}
  >
    ${
      activate
        ? html`<input
            type="checkbox"
            class="g-active"
            title=${t`Active: the group object exists and can be linked`}
            aria-label=${t`${title}: active`}
            .checked=${!!objectId}
            @change=${(e: Event) => {
              const on = (e.target as HTMLInputElement).checked;
              ed.run(on ? t`Activate ${title}` : t`Deactivate ${title}`, (x) =>
                activate(x, on),
              );
            }}
          />`
        : nothing
    }
    <span class="g-plabel"
      >${title}<small>${out ? t`sends` : t`listens`}</small></span
    >
    ${
      out
        ? html`<div class="g-selgo">
            <select
              aria-label=${title}
              data-v=${gas[0] ?? ""}
              @change=${(e: Event) => {
                const v = (e.target as HTMLSelectElement).value;
                ed.run(title, (x) =>
                  set(
                    x,
                    v === "__new" ? [E.newGa(x, dpt, newName)] : v ? [v] : [],
                  ),
                );
              }}
            >
              <option value="">${t`— none —`}</option>
              ${gas[0] && !compatible.some((g) => g.address === gas[0]) ? html`<option value=${gas[0]}>${gas[0]}</option>` : nothing}
              ${compatible.map((g) => html`<option value=${g.address} ?selected=${g.address === gas[0]}>${g.address} · ${g.name ?? ""}</option>`)}
              <option value="__new">+ ${t`new address`}</option>
            </select>
            ${
              gas[0]
                ? html`<button
                    class="g-go"
                    title=${t`Show address ${gas[0]}`}
                    aria-label=${t`Show address ${gas[0]}`}
                    @click=${() => ed.go(`ga:${gas[0]}`)}
                  >
                    ›
                  </button>`
                : nothing
            }
          </div>`
        : html`<div class="g-chips">
            ${gas.map(
              (g) =>
                html`<span class="g-chip"
                  ><button
                    class="g-chip-go"
                    title=${t`Show address ${g}`}
                    @click=${() => ed.go(`ga:${g}`)}
                  >
                    ${g}
                  </button>
                  <small
                    >${doc.groupAddresses.find((x) => x.address === g)?.name ?? ""}</small
                  >
                  <button
                    title=${t`Remove`}
                    aria-label=${t`Remove ${g}`}
                    @click=${() =>
                      ed.run(title, (x) =>
                        set(
                          x,
                          gas.filter((y) => y !== g),
                        ),
                      )}
                  >
                    ×
                  </button></span
                >`,
            )}
            ${ed.gaAdder(doc, dpt, gas, newName, (ga, x) => set(x, [...gas, ga]), title)}
          </div>`
    }
  </div>`;
}

/** Required parameters of a new equipment, with usable default values. */
export function defaultEquipmentParams(
  registry: Registry,
  type: string,
  c?: Chan,
) {
  const def = registry.equipment.get(type);
  const params: Record<string, unknown> = {};
  (def?.parameters?.required ?? []).forEach((k) => {
    const p = def!.parameters!.properties[k]!;
    const fromChannel = c?.parameters?.estimatedTravelTimeMs;
    params[k] =
      p.default ??
      (k === "actualTravelTimeMs" && typeof fromChannel === "number"
        ? fromChannel
        : p.unit === "ms"
          ? 20000
          : (p.minimum ?? 1));
  });
  return Object.keys(params).length ? { parameters: params } : {};
}
