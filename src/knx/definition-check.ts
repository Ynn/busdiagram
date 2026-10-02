// Control of extension definitions to record: parameter diagrams are
// a flat subset of JSON Schema (scalar values). An incorrect definition is
// refused with the list of his problems; an accepted definition is copied and frozen.
import type {
  BehaviorDefinition,
  EquipmentDefinition,
  JsonObject,
  ParamSchema,
} from "./contracts";
import { isSupportedDpt } from "./dpt";
import { validateParams } from "./params";
import { hostTranslator } from "../i18n";

const TYPES = ["integer", "number", "boolean", "string", "null"];
const PROP_KEYS = [
  "title",
  "unit",
  "expert",
  "type",
  "description",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "enum",
  "enumTitles",
  "nullTitle",
  "default",
];
const NUMERIC = ["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum"];

export function checkParamSchema(
  schema: unknown,
  where: string,
  out: string[],
) {
  const t = hostTranslator();
  if (schema === undefined) return;
  const s = schema as ParamSchema;
  if (
    !s ||
    typeof s !== "object" ||
    s.type !== "object" ||
    !s.properties ||
    typeof s.properties !== "object"
  ) {
    out.push(t`${where}: { type: "object", properties: { … } } expected`);
    return;
  }
  for (const k of Object.keys(s))
    if (
      ![
        "type",
        "description",
        "properties",
        "required",
        "additionalProperties",
      ].includes(k)
    )
      out.push(
        t`${where}.${k}: unsupported keyword (subset: type, properties, required, additionalProperties)`,
      );
  if (s.additionalProperties !== undefined && s.additionalProperties !== false)
    out.push(t`${where}.additionalProperties: only false is supported`);
  (s.required ?? []).forEach((r) => {
    if (!Object.hasOwn(s.properties, r))
      out.push(t`${where}.required: “${r}” is not a declared property`);
  });
  for (const [name, p] of Object.entries(s.properties)) {
    const at = `${where}.properties.${name}`;
    if (!p || typeof p !== "object") {
      out.push(t`${at}: object expected`);
      continue;
    }
    for (const k of Object.keys(p))
      if (!PROP_KEYS.includes(k))
        out.push(t`${at}.${k}: unsupported keyword (scalar values only)`);
    const types = Array.isArray(p.type) ? p.type : [p.type];
    if (!types.length || types.some((t) => !TYPES.includes(t as string)))
      out.push(
        t`${at}.type: ${TYPES.join(", ")} (or a list of these types) expected`,
      );
    NUMERIC.forEach((k) => {
      const v = (p as unknown as Record<string, unknown>)[k];
      if (v !== undefined && (typeof v !== "number" || !Number.isFinite(v)))
        out.push(t`${at}.${k}: finite number expected`);
    });
    if (p.enum !== undefined && (!Array.isArray(p.enum) || !p.enum.length))
      out.push(t`${at}.enum: non-empty list expected`);
    if (
      p.enumTitles !== undefined &&
      (!Array.isArray(p.enum) ||
        !Array.isArray(p.enumTitles) ||
        p.enumTitles.length !== p.enum.length ||
        p.enumTitles.some((x) => typeof x !== "string"))
    )
      out.push(t`${at}.enumTitles: one label (text) per “enum” value expected`);
    if (p.default !== undefined) {
      // The default value must respect the constraints it accompanies.
      const problems: { path: string; message: string; code: string }[] = [];
      validateParams(
        { type: "object", properties: { [name]: p } },
        { [name]: p.default },
        at,
        problems,
      );
      problems.forEach((x) => out.push(t`${at}.default: ${x.message}`));
    }
  }
}

function deepFreezeClone<T>(v: T): T {
  if (v === undefined) return v;
  const c = structuredClone(v);
  const freeze = (x: unknown) => {
    if (x && typeof x === "object") {
      Object.values(x).forEach(freeze);
      Object.freeze(x);
    }
  };
  freeze(c);
  return c;
}

export function checkBehavior<S>(
  id: string,
  d: BehaviorDefinition<S>,
): BehaviorDefinition<S> {
  const t = hostTranslator();
  const out: string[] = [];
  if (!d || typeof d !== "object")
    throw new TypeError(t`Behavior “${id}”: definition expected`);
  if (typeof d.createState !== "function")
    out.push(t`createState: function required`);
  if (!d.ports || typeof d.ports !== "object")
    out.push(t`ports: object required (possibly empty)`);
  else
    for (const [name, port] of Object.entries(d.ports)) {
      if (!port || typeof port !== "object") {
        out.push(t`ports.${name}: object expected`);
        continue;
      }
      if (
        port.dpts !== "any" &&
        (!Array.isArray(port.dpts) || port.dpts.some((x) => !isSupportedDpt(x)))
      )
        out.push(
          t`ports.${name}.dpts: "any" or list of supported DPTs expected`,
        );
      if (
        port.channel !== undefined &&
        !["required", "optional", "none"].includes(port.channel)
      )
        out.push(
          t`ports.${name}.channel: "required", "optional" or "none" expected`,
        );
      if (
        port.direction !== undefined &&
        !["in", "out", "both"].includes(port.direction)
      )
        out.push(t`ports.${name}.direction: "in", "out" or "both" expected`);
    }
  if (d.output !== undefined && !["switch", "motor", "dim"].includes(d.output))
    out.push(t`output: "switch", "motor" or "dim" expected`);
  [
    "onInit",
    "onInput",
    "onObjectWrite",
    "onTick",
    "onTimer",
    "onRoomChange",
    "channelState",
    "deviceState",
    "onBusFailure",
    "onBusRecovery",
    "contactKey",
  ].forEach((h) => {
    const f = (d as unknown as Record<string, unknown>)[h];
    if (f !== undefined && typeof f !== "function")
      out.push(t`${h}: function expected`);
  });
  checkParamSchema(d.parameters, "parameters", out);
  checkParamSchema(d.channelParameters, "channelParameters", out);
  checkParamSchema(d.channelInitialState, "channelInitialState", out);
  if (d.parameterLayout !== undefined)
    checkLayout(d as BehaviorDefinition<unknown>, out);
  if (d.channelObjects !== undefined) {
    const spec = d.channelObjects as unknown as {
      parameter?: unknown;
      values?: Record<string, { port?: unknown; dpt?: unknown }[]>;
    };
    if (
      typeof spec.parameter !== "string" ||
      !d.channelParameters?.properties[spec.parameter]
    )
      out.push(t`channelObjects.parameter: channel parameter expected`);
    if (!spec.values || typeof spec.values !== "object")
      out.push(t`channelObjects.values: object expected`);
    else
      for (const [v, list] of Object.entries(spec.values)) {
        if (!Array.isArray(list)) {
          out.push(t`channelObjects.values.${v}: list expected`);
          continue;
        }
        for (const x of list) {
          const port =
            typeof x?.port === "string" ? d.ports?.[x.port] : undefined;
          if (!port || port.channel !== "required")
            out.push(
              t`channelObjects.values.${v}: unknown channel port “${String(x?.port)}”`,
            );
          else if (
            typeof x.dpt !== "string" ||
            (port.dpts !== "any" && !port.dpts.includes(x.dpt))
          )
            out.push(
              t`channelObjects.values.${v}: DPT “${String(x.dpt)}” not accepted by port “${String(x.port)}”`,
            );
        }
      }
  }
  if (out.length)
    throw new TypeError(
      t`Invalid behavior “${id}”:` + `\n• ${out.join("\n• ")}`,
    );
  return Object.freeze({
    ...d,
    ports: deepFreezeClone(d.ports),
    parameters: deepFreezeClone(d.parameters),
    channelParameters: deepFreezeClone(d.channelParameters),
    channelInitialState: deepFreezeClone(d.channelInitialState),
    parameterLayout: deepFreezeClone(d.parameterLayout),
    channelObjects: deepFreezeClone(d.channelObjects),
  });
}

/** Pages of parameters: their shape, and the parameters, states, and ports they name. */
function checkLayout(d: BehaviorDefinition<unknown>, out: string[]) {
  const t = hostTranslator();
  const layout = d.parameterLayout as unknown;
  if (!layout || typeof layout !== "object") {
    out.push(t`parameterLayout: object expected`);
    return;
  }
  (["device", "channel"] as const).forEach((scope) => {
    const pages = (layout as Record<string, unknown>)[scope];
    if (pages === undefined) return;
    const at = `parameterLayout.${scope}`;
    if (!Array.isArray(pages)) return void out.push(t`${at}: list expected`);
    const params = Object.keys(
      (scope === "device" ? d.parameters : d.channelParameters)?.properties ??
        {},
    );
    const state = Object.keys(d.channelInitialState?.properties ?? {});
    const ports = Object.keys(d.ports ?? {});
    const ids = new Set<string>();
    const items = (list: unknown, path: string) => {
      if (!Array.isArray(list)) return void out.push(t`${path}: list expected`);
      list.forEach((raw, i) => {
        const p = `${path}[${i}]`;
        const item = raw as Record<string, unknown>;
        if (!item || typeof item !== "object")
          return void out.push(t`${p}: object expected`);
        const name = (k: string, known: string[]) => {
          if (typeof item[k] !== "string" || !known.includes(item[k]))
            out.push(t`${p}.${k}: unknown “${String(item[k])}”`);
        };
        if ("parameter" in item) name("parameter", params);
        else if ("initialState" in item) {
          if (scope === "device")
            out.push(t`${p}.initialState: only on channel pages`);
          name("initialState", state);
        } else if ("groupObject" in item) name("groupObject", ports);
        else if ("heading" in item || "note" in item) {
          const v = item.heading ?? item.note;
          if (typeof v !== "string") out.push(t`${p}: text expected`);
        } else if ("scenes" in item) {
          if (item.scenes !== true) out.push(t`${p}.scenes: true expected`);
        } else if ("when" in item) {
          const w = item.when as Record<string, unknown> | undefined;
          if (!w || typeof w !== "object")
            out.push(t`${p}.when: object expected`);
          else if ("groupObject" in w) {
            if (
              typeof w.groupObject !== "string" ||
              !ports.includes(w.groupObject)
            )
              out.push(
                t`${p}.when.groupObject: unknown “${String(w.groupObject)}”`,
              );
          } else {
            if (
              typeof w.parameter !== "string" ||
              !params.includes(w.parameter)
            )
              out.push(
                t`${p}.when.parameter: unknown “${String(w.parameter)}”`,
              );
            (["is", "not"] as const).forEach((k) => {
              if (w[k] !== undefined && !Array.isArray(w[k]))
                out.push(t`${p}.when.${k}: list of values expected`);
            });
            if (w.is === undefined && w.not === undefined)
              out.push(t`${p}.when: “is” or “not” expected`);
          }
          items(item.items, `${p}.items`);
        } else out.push(t`${p}: unknown kind of item`);
      });
    };
    pages.forEach((raw, i) => {
      const page = raw as Record<string, unknown>;
      const p = `${at}[${i}]`;
      if (!page || typeof page !== "object")
        return void out.push(t`${p}: object expected`);
      if (typeof page.id !== "string" || !/^[A-Za-z0-9_-]+$/.test(page.id))
        out.push(t`${p}.id: letters, digits, “-”, or “_” expected`);
      else if (ids.has(page.id)) out.push(t`${p}.id: duplicate “${page.id}”`);
      else ids.add(page.id);
      if (typeof page.title !== "string")
        out.push(t`${p}.title: text expected`);
      items(page.items, `${p}.items`);
    });
  });
}

export function checkEquipment<S extends Record<string, unknown>>(
  id: string,
  d: EquipmentDefinition<S & JsonObject>,
) {
  const t = hostTranslator();
  const out: string[] = [];
  if (!d || typeof d !== "object")
    throw new TypeError(t`Equipment “${id}”: definition expected`);
  if (typeof d.create !== "function") out.push(t`create: function required`);
  if (typeof d.applyCommand !== "function")
    out.push(t`applyCommand: function required`);
  if (d.advance !== undefined && typeof d.advance !== "function")
    out.push(t`advance: function expected`);
  if (d.interact !== undefined && typeof d.interact !== "function")
    out.push(t`interact: function expected`);
  if (
    d.checkParameters !== undefined &&
    typeof d.checkParameters !== "function"
  )
    out.push(t`checkParameters: function expected`);
  if (d.heatOutput !== undefined && typeof d.heatOutput !== "function")
    out.push(t`heatOutput: function expected`);
  if (!["switch", "motor", "dim"].includes(d.accepts))
    out.push(t`accepts: "switch", "motor" or "dim" expected`);
  checkParamSchema(d.parameters, "parameters", out);
  checkParamSchema(d.initialState, "initialState", out);
  if (out.length)
    throw new TypeError(
      t`Invalid equipment “${id}”:` + `\n• ${out.join("\n• ")}`,
    );
  return Object.freeze({
    ...d,
    parameters: deepFreezeClone(d.parameters),
    initialState: deepFreezeClone(d.initialState),
  });
}
