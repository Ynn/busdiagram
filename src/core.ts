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
export {
  Simulation,
  LONG_MS,
  TICK_MS,
  couplerTarget,
  describeCommand,
} from "./knx/sim";
export type {
  Telegram,
  Reception,
  StepStop,
  SimulationOptions,
  ExternalTelegram,
  TapEvent,
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
  registerParticipant,
  captureRegistry,
  behaviorIds,
  equipmentIds,
} from "./knx/registry";
export type { Registry } from "./knx/registry";
// Toolkit for the manufacturers' products, delivered in packages (.bdpkg): bus coupling
// units (mask profiles, tables), products and the helpers of their firmware.
export * from "./bcu";
export {
  defineProduct,
  objectId,
  send,
  valueOf,
  numberOf,
  memoryOf,
  bits,
  programKey,
  productOfProgram,
} from "./bcu/product";
export type {
  Firmware,
  ProductObject,
  ProductSpec,
  Product,
} from "./bcu/product";
export { parseProgram } from "./knx/week-program";
// Values of the time of day (DPT 10.001) and of the date (11.001) of a clock time.
export { dateValue, knxDay, timeOfDayValue } from "./participants/shared/clock";
export type { ProgramEntry } from "./knx/week-program";
export {
  Network,
  buildTopology,
  TIMING,
  RC0,
  busFrameMs,
  busTiming,
} from "./knx/network";
export type {
  CouplerPlan,
  CouplerReason,
  TimingProfile,
  Topology,
  TransportPlan,
} from "./knx/network";
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
export {
  CemiError,
  decodeCemi,
  encodeCemi,
  L_DATA_CON,
  L_DATA_IND,
  L_DATA_REQ,
} from "./knx/cemi";
export type { CemiGroupFrame } from "./knx/cemi";
export { EtsLink } from "./bridge/ets-link";
export { etsDpt, etsGroupAddressXml } from "./knx/ets-export";
export type { LinkStatus, EtsLinkOptions } from "./bridge/ets-link";
export { configWarnings } from "./knx/consistency";
export type { ConfigWarning } from "./knx/consistency";
export { validateParams } from "./knx/params";
export { toV2 } from "./knx/export";
export {
  downloadAll,
  downloadApplication,
  downloadStates,
  installationAsProject,
  programIndividualAddress,
  scanLine,
  unloadApplication,
} from "./knx/commissioning";
export type {
  CommissioningResult,
  DownloadState,
  ScanRow,
} from "./knx/commissioning";
export { FACTORY_ADDRESS, FACTORY_COUPLER_ADDRESS } from "./knx/installation";
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
