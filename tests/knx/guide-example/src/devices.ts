import * as BusDiagram from "bus-diagram";
import { sa2 } from "./sa-2/model";

// A BusDiagram of an older contract cannot run these devices.
if (!((BusDiagram.PACKAGE_API ?? 0) >= 1))
  throw new Error("these devices need BusDiagram 0.8 or later");

BusDiagram.registerParticipant(sa2);
