import type { Translate } from "../i18n";
import { hostTranslator } from "../i18n";
// Reusable views of controlled equipment receive only read-only state.
// No GAs, no access to the engine.
import type { TemplateResult } from "lit";
import type { EquipmentSize, JsonObject } from "../knx/contracts";
import { STANDARD_VIEWS } from "./standard-views";

export interface EquipmentViewProps {
  state: Readonly<JsonObject>;
  label: string;
  /** Placement points (logical coordinates of the scene). */
  box: { x: number; y: number; width: number; height: number };
  /** Optional annotation from the interface, such as remaining timer time. */
  note?: string;
  /** Translation into the language of the component (view-specific labels). */
  t?: Translate;
  /** Equipment parameters (e.g. number of ballasts in a DALI group). */
  parameters?: Readonly<JsonObject>;
  /** Physical action on the equipment (simulated pane...), if the equipment supports it. */
  act?: (action: string, payload?: number) => void;
}

export interface EquipmentViewDefinition {
  size: EquipmentSize;
  render(props: EquipmentViewProps): TemplateResult;
}

const views = new Map<string, EquipmentViewDefinition>();

export function registerEquipmentView(
  id: string,
  definition: EquipmentViewDefinition,
): void {
  if (typeof id !== "string" || !id)
    throw new TypeError(hostTranslator()`view identifier required`);
  if (views.has(id))
    throw new Error(
      hostTranslator()`Equipment view “${id}” already registered`,
    );
  if (typeof definition?.render !== "function" || !definition.size)
    throw new TypeError(
      hostTranslator()`View “${id}”: size and render are required`,
    );
  const { width, height, anchorY } = definition.size;
  const ok = (n: unknown) =>
    typeof n === "number" && Number.isFinite(n) && n > 0;
  if (
    !ok(width) ||
    !ok(height) ||
    (anchorY !== undefined &&
      !(typeof anchorY === "number" && Number.isFinite(anchorY)))
  )
    throw new TypeError(
      hostTranslator()`View “${id}”: size.width and size.height must be finite positive numbers`,
    );
  views.set(id, Object.freeze({ ...definition }));
}

export const equipmentView = (id: string) => views.get(id);

/** Copy of the view register (cancellation of an extension load refused). */
export const saveViews = (): ReadonlyMap<string, EquipmentViewDefinition> =>
  new Map(views);
export function restoreViews(s: ReadonlyMap<string, EquipmentViewDefinition>) {
  views.clear();
  s.forEach((v, k) => views.set(k, v));
}

// Views of the delivered equipment, registered once.
for (const [id, view] of Object.entries(STANDARD_VIEWS))
  registerEquipmentView(id, view);
