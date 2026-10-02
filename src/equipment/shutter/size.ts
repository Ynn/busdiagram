// Size of the views of the shutter: read by the layout without the views.
import type { EquipmentSize } from "../../knx/contracts";

/** Size of the view of the shutter in the diagram. */
export const shutterSize: EquipmentSize = {
  width: 92,
  height: 142,
  anchorY: 58,
};
/** Size of the view of a venetian blind (slats drawn below the shutter). */
export const venetianBlindSize: EquipmentSize = {
  width: 92,
  height: 178,
  anchorY: 58,
};
