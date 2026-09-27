// DOM-free entry point: engine, registries, and codecs for tests and extensions.
import { version as packageVersion } from "../package.json";
import type { SimulationOptions } from "./knx/sim";
import { Simulation } from "./knx/sim";
import { buildScenario } from "./knx/scenario";
import { captureRegistry } from "./knx/registry";
import { translator } from "./i18n";

/** Library version (Semantic Versioning), from package.json. */
export const version: string = packageVersion;

export * from "./knx/contracts";
export { Simulation, LONG_MS, TICK_MS, describeCommand } from "./knx/sim";
export type {
  Telegram,
  Reception,
  StepStop,
  SimulationOptions,
} from "./knx/sim";
export { buildScenario, ScenarioError, gaName } from "./knx/scenario";
export type {
  Scenario,
  Device,
  KnxObject,
  Channel,
  Button,
  NumberInput,
  Problem,
} from "./knx/scenario";
export {
  registerBehavior,
  registerEquipment,
  captureRegistry,
  behaviorIds,
  equipmentIds,
} from "./knx/registry";
export type { Registry } from "./knx/registry";
export { Network, buildTopology, TIMING, RC0 } from "./knx/network";
export type { Topology, TransportPlan } from "./knx/network";
export {
  SUPPORTED_DPTS,
  canonical,
  checkValue,
  decode,
  dptInfo,
  dptName,
  encode,
  formatValue,
} from "./knx/dpt";
export { buildFrame, hex } from "./knx/format";
export { configWarnings } from "./knx/consistency";
export type { ConfigWarning } from "./knx/consistency";
export { validateParams } from "./knx/params";
export { toV2 } from "./knx/export";
export { registerMessages, translator, availableLanguages } from "./i18n";
export type { Translate } from "./i18n";
/** Type of JSON v2, generated from schema/scenario-v2.schema.json. */
export type { ScenarioV2 } from "./knx/scenario-v2.generated";

/**
 * Validates a scenario and creates an independent simulation.
 * At this moment are captured: one instance does not share any state with another.
 */
export function createSimulator(
  data: unknown,
  options: SimulationOptions = {},
): Simulation {
  const registry = options.registry ?? captureRegistry();
  return new Simulation(
    buildScenario(data, registry, translator(options.lang ?? "en")),
    {
      ...options,
      registry,
    },
  );
}
