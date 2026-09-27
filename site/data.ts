// Reference data extracted from code to generate documentation (options, schema,
// behaviors, equipment, and DPTs). Built without a DOM by scripts/build-site.mjs.
import type { ParamSchema } from "../src/knx/contracts";
import { SUPPORTED_DPTS, dptInfo, encode, formatValue } from "../src/knx/dpt";
import { captureRegistry } from "../src/knx/registry";
import { buildAuthorSchema } from "../src/knx/schema";
import { ScenarioError, buildScenario } from "../src/knx/scenario";
import { toV2 } from "../src/knx/export";
import { OPTION_DOCS } from "../src/ui/options";
import { translator } from "../src/i18n";

const registry = captureRegistry();
const english = translator("en").s!;

function localizeSchema<T>(value: T): T {
  if (Array.isArray(value)) return value.map(localizeSchema) as T;
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, field]) => [
        key,
        typeof field === "string" && (key === "title" || key === "description")
          ? english(field)
          : localizeSchema(field),
      ]),
    ) as T;
  return value;
}

const params = (s: ParamSchema | undefined) =>
  Object.entries(s?.properties ?? {}).map(([name, p]) => ({
    name,
    type: Array.isArray(p.type) ? p.type.join(" | ") : p.type,
    required: !!s?.required?.includes(name),
    default: p.default === undefined ? null : JSON.stringify(p.default),
    constraints: [
      p.minimum !== undefined ? `≥ ${p.minimum}` : "",
      p.exclusiveMinimum !== undefined ? `> ${p.exclusiveMinimum}` : "",
      p.maximum !== undefined ? `≤ ${p.maximum}` : "",
      p.enum
        ? p.enum
            .map(
              (x, i) =>
                JSON.stringify(x) +
                (p.enumTitles?.[i] ? ` (${p.enumTitles[i]})` : ""),
            )
            .join(", ")
        : "",
    ]
      .filter(Boolean)
      .join(" ; "),
    description: english(p.description ?? ""),
  }));

export const data = {
  options: OPTION_DOCS,
  schema: localizeSchema(buildAuthorSchema(registry)),
  behaviors: [...registry.behaviors].map(([id, d]) => ({
    id,
    description: english(d.description ?? ""),
    output: d.output ?? null,
    acceptsInputs: !!d.acceptsInputs,
    ports: Object.entries(d.ports).map(([name, p]) => ({
      name,
      dpts: p.dpts === "any" ? "any" : p.dpts.join(", "),
      channel: p.channel ?? "none",
      direction: p.direction ?? null,
      description: english(p.description ?? ""),
    })),
    parameters: params(d.parameters),
    channelParameters: params(d.channelParameters),
    channelInitialState: params(d.channelInitialState),
  })),
  equipment: [...registry.equipment].map(([id, d]) => ({
    id,
    description: english(d.description ?? ""),
    accepts: d.accepts,
    parameters: params(d.parameters),
    initialState: params(d.initialState),
  })),
  dpts: SUPPORTED_DPTS.map((id) => {
    const d = dptInfo(id)!;
    const samples =
      d.bits === 1
        ? [0, 1]
        : id === "5.001"
          ? [0, 50, 100]
          : id === "2.001"
            ? [0, 2, 3]
            : id === "9.001"
              ? [21, -5.5, 45.2]
              : id === "9.002"
                ? [-2, 0.5]
                : id === "9.004"
                  ? [350, 42000]
                  : id === "9.005"
                    ? [3.5, 14.2]
                    : id === "9.007"
                      ? [45, 72.5]
                      : id === "9.008"
                        ? [650, 1400]
                        : id === "7.600"
                          ? [2700, 6500]
                          : id === "10.001"
                            ? [
                                1 * 86400 + 7 * 3600 + 55 * 60,
                                22 * 3600 + 30 * 60,
                              ]
                            : id === "11.001"
                              ? [20260928, 19991231]
                              : id === "13.010"
                                ? [0, 12500]
                                : id === "14.056"
                                  ? [60, 1250.5]
                                  : id === "20.102"
                                    ? [1, 3, 4]
                                    : [d.min, d.max];
    return {
      id,
      name: english(d.name),
      bits: d.bits,
      range: `${d.min} … ${d.max}`,
      samples: samples.map((v) => ({
        value: v,
        raw: encode(id, v),
        text: formatValue(id, v),
      })),
    };
  }),
};

/** Convert a scenario of any supported format to JSON format 2. */
export const convert = (json: unknown) =>
  toV2(buildScenario(json, registry), registry);

/** Validate a scenario; problems carry the JSON path, a code, and an English message. */
export function validate(json: unknown): {
  path: string;
  code: string;
  message: string;
}[] {
  try {
    buildScenario(json, registry);
    return [];
  } catch (e) {
    if (e instanceof ScenarioError)
      return e.details.map((p) => ({
        path: p.path,
        code: p.code,
        message: p.message,
      }));
    return [{ path: "", code: "exception", message: String(e) }];
  }
}
