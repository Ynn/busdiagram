// Conversion of the standardized model to a JSON in minimum and readable format 2:
// the optional values equal to the defects are not written. Serves to migrate a v1 scenario.
import type { JsonObject, ParamSchema } from "./contracts";
import type { Registry } from "./registry";
import { captureRegistry } from "./registry";
import type { PowerSupply, Scenario } from "./scenario";
import {
  defaultIcon,
  defaultInitial,
  defaultRead,
  defaultUpdate,
} from "./scenario";
import type { ScenarioV2 } from "./scenario-v2.generated";

function withoutDefaults(
  values: JsonObject,
  schema: ParamSchema | undefined,
): JsonObject | undefined {
  const out: JsonObject = {};
  for (const [k, v] of Object.entries(values)) {
    // A required parameter is always written, even equal to its default: the validator requires it.
    const required = schema?.required?.includes(k) ?? false;
    const d =
      schema && Object.hasOwn(schema.properties, k)
        ? schema.properties[k]!.default
        : undefined;
    if (!required && d !== undefined && JSON.stringify(d) === JSON.stringify(v))
      continue;
    out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

const compact = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

function topologyV2(s: Scenario) {
  const T = s.topology;
  const out = compact({
    backbone: T.forced.backbone || undefined,
    mainLines: T.forced.mainLines || undefined,
    ip: T.ip ?? undefined,
    areas: T.areas.some((a) => a.name)
      ? T.areas.filter((a) => a.name).map((a) => ({ ...a }))
      : undefined,
    couplers: T.couplers.size
      ? [...T.couplers].map(([address, c]) =>
          compact({
            address,
            name: c.name || undefined,
            down: c.down !== "filter" ? c.down : undefined,
            up: c.up !== "filter" ? c.up : undefined,
          }),
        )
      : undefined,
  });
  return Object.keys(out).length ? out : undefined;
}

const psuV2 = (p: PowerSupply | null) =>
  p
    ? compact({
        name: p.name || undefined,
        currentMa: p.currentMa ?? undefined,
      })
    : undefined;

export function toV2(
  s: Scenario,
  registry: Registry = captureRegistry(),
): ScenarioV2 {
  const out = {
    formatVersion: 2 as const,
    title: s.title || undefined,
    description: s.description || undefined,
    lines: s.lines.map((l) =>
      compact({
        address: l.address,
        name: l.name || undefined,
        powerSupply: psuV2(l.powerSupply),
        extension: l.extension
          ? compact({
              address: l.extension.address,
              mode: l.extension.mode,
              switchable: l.extension.switchable || undefined,
              powerSupply: psuV2(l.extension.powerSupply),
            })
          : undefined,
      }),
    ),
    topology: topologyV2(s),
    rooms: s.rooms.length
      ? s.rooms.map((r) =>
          compact({
            id: r.id,
            name: r.name !== r.id ? r.name : undefined,
            temperatureC: r.temperatureC !== 20 ? r.temperatureC : undefined,
            outsideTemperatureC:
              r.outsideTemperatureC !== 5 ? r.outsideTemperatureC : undefined,
            windowOpen: r.windowOpen || undefined,
            timeConstantMs:
              r.timeConstantMs !== 300_000 ? r.timeConstantMs : undefined,
          }),
        )
      : undefined,
    clock: s.clock
      ? compact({
          start: s.clock.start,
          speed: s.clock.speed !== 1 ? s.clock.speed : undefined,
        })
      : undefined,
    groupAddresses: [...s.groupAddresses.values()].map((g) =>
      compact({
        address: g.address,
        name: g.name || undefined,
        dpt: g.dpt || undefined,
      }),
    ),
    groupRanges: s.groupRanges.size
      ? [...s.groupRanges].map(([address, name]) => ({ address, name }))
      : undefined,
    devices: s.devices.map((d) => {
      const def = registry.behaviors.get(d.behavior);
      const byId = new Map(d.objects.map((o) => [o.id, o]));
      const defaultMedium = d.kind === "supervisor" ? "IP" : "TP";
      return compact({
        id: d.id,
        name: d.name,
        address: d.address || undefined,
        kind: d.kind,
        behavior: d.behavior,
        parameters: withoutDefaults(d.parameters, def?.parameters),
        medium: d.medium !== defaultMedium ? d.medium : undefined,
        downstream: d.downstream || undefined,
        inFilterTables: d.inFilterTables ? undefined : false,
        room: d.room ?? undefined,
        description: d.description || undefined,
        objects: d.objects.map((o) =>
          compact({
            id: o.id,
            name: o.name,
            ga: o.gas.length === 1 ? o.gas[0] : [...o.gas],
            dpt: o.dpt,
            port: o.port,
            channel: o.channel ?? undefined,
            value:
              o.initial !== defaultInitial(o.port, o.dpt)
                ? o.initial
                : undefined,
            flags: compact({
              W: o.flags.W,
              T: o.flags.T,
              R: o.flags.R !== defaultRead(o.port) ? o.flags.R : undefined,
              U: o.flags.U !== defaultUpdate(o.port) ? o.flags.U : undefined,
            }),
          }),
        ),
        // Keys of contact inputs come from the channels: they are not written.
        buttons: d.buttons.some((b) => !b.contact)
          ? d.buttons.map((b) =>
              compact({
                id: b.id,
                label: b.label,
                icon:
                  b.icon !==
                  defaultIcon(
                    b.press,
                    b.long,
                    byId.get(b.press?.object ?? "")?.dpt,
                    byId.get(b.long?.object ?? "")?.dpt,
                  )
                    ? b.icon
                    : undefined,
                press: b.press ?? undefined,
                short: b.short ?? undefined,
                long: b.long ?? undefined,
                release: b.release ?? undefined,
                led: b.led ?? undefined,
              }),
            )
          : undefined,
        inputs: d.inputs.length
          ? d.inputs.map((n) => ({
              id: n.id,
              type: n.type,
              label: n.label,
              object: n.object,
              min: n.min,
              max: n.max,
              step: n.step,
            }))
          : undefined,
        channels: d.channels.length
          ? d.channels.map((c) => {
              // One load as an object, several as a list, none as null.
              const loads = c.equipmentConfigs.map((eq) => {
                const edef = registry.equipment.get(eq.type);
                return compact({
                  type: eq.type,
                  name: eq.name ?? undefined,
                  view: eq.view !== eq.type ? eq.view : undefined,
                  room: eq.room ?? undefined,
                  parameters: withoutDefaults(eq.parameters, edef?.parameters),
                  initialState: withoutDefaults(
                    eq.initialState,
                    edef?.initialState,
                  ),
                });
              });
              return compact({
                id: c.id,
                label: c.label !== c.id ? c.label : undefined,
                parameters: withoutDefaults(
                  c.parameters,
                  def?.channelParameters,
                ),
                initialState: withoutDefaults(
                  c.initialState,
                  def?.channelInitialState,
                ),
                equipment: loads.length > 1 ? loads : (loads[0] ?? null),
                scenes: c.scenes.size
                  ? Object.fromEntries(
                      [...c.scenes].map(([k, v]) => [String(k), v]),
                    )
                  : undefined,
              });
            })
          : undefined,
      });
    }),
    options: { speed: s.options.speed, filterTables: s.options.filterTables },
  };
  return compact(out) as unknown as ScenarioV2;
}
