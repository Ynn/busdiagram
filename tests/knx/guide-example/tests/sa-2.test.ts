import { createSimulator, registerParticipant } from "bus-diagram";
import type { ProductDatabase } from "@busdiagram/src/knxprod/database";
import { captureRegistry } from "@busdiagram/src/knx/registry";
import { installPackage } from "@busdiagram/site/designer/packages";
import {
  addProductDevice,
  setEtsParameter,
} from "@busdiagram/site/designer/ets-device";
import { programOfProduct } from "@busdiagram/site/designer/manufacturers";
import { expect, it } from "vitest";
import { sa2 } from "../src/sa-2/model";
import database from "../src/sa-2/database.json";

// The database of this example, written by hand, is known: a package read from
// elsewhere is checked by the designer when it is imported.
const sa2Database = database as unknown as ProductDatabase;

registerParticipant(sa2);
installPackage({
  manifest: {
    format: "bdpkg/1",
    name: "example-devices",
    version: "test",
    products: [],
  },
  script: "",
  databases: new Map([["example.sa2/v1", sa2Database]]),
  scenarios: [],
});

it("a normally closed output is on while its object is off", () => {
  const doc: Parameters<typeof addProductDevice>[0] = {
    formatVersion: 2,
    lines: [{ address: "1.1", powerSupply: { currentMa: 640 } }],
    devices: [],
    groupAddresses: [],
  };
  const id = addProductDevice(doc, "example.sa2/v1", captureRegistry(), "1.1");
  const app = programOfProduct("example.sa2/v1")!;
  setEtsParameter(doc, id, app, captureRegistry(), "P-1_R-1", "1");
  const sim = createSimulator(doc);
  sim.advance(100);
  expect(sim.output(id, "a")).toMatchObject({ on: true });
});
