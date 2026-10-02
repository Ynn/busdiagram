// Composition of the views of the delivered equipment, by view identifier.
import type { EquipmentViewDefinition } from "./equipment";
import { lampView } from "../equipment/lamp/view";
import { shutterView, venetianBlindView } from "../equipment/shutter/view";
import { dimmableView } from "../equipment/dimmable-lamp/view";
import { daliGroupView } from "../equipment/dali-group/view";
import { radiatorView } from "../equipment/radiator/view";
import { fanView } from "../equipment/fan/view";
import { applianceView } from "../equipment/appliance/view";

// The order of registration is that of the former list.
export const STANDARD_VIEWS: Readonly<Record<string, EquipmentViewDefinition>> =
  {
    fan: fanView,
    appliance: applianceView,
    lamp: lampView,
    radiator: radiatorView,
    dimmableLamp: dimmableView,
    daliGroup: daliGroupView,
    shutter: shutterView,
    venetianBlind: venetianBlindView,
  };
