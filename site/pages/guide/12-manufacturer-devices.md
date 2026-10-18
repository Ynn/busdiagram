---
title: Write a manufacturer's device
group: For developers
order: 12.5
---

# Write a manufacturer's device

A manufacturer's device is simulated as ETS sees the real one: it has the application program of the manufacturer's catalog, ETS downloads it, and the simulation runs what its memory then holds. BusDiagram delivers no such device. It delivers the toolkit to write them, and the designer imports them from a **package of devices** (`.bdpkg`, see [extensions](extensions.html#deliver-manufacturers-devices-in-a-package)).

This guide writes one, step by step, with the products of an imaginary manufacturer, **Example Electric** (manufacturer code FEh), that the tests of BusDiagram use: `tests/knx/fixtures/sample-devices`. Its **SA 2** is a switch actuator with two outputs on a BCU1 (mask 0012h), program `M-00FE_A-0001-10`. Its product database is written by hand, so the folder holds no manufacturer's data.

A device has four parts:

| Part | What it is | Where it comes from |
| --- | --- | --- |
| Product database | What ETS shows and what the parameters and tables occupy in memory | Generated from the manufacturer's catalog |
| Model | The identity of the product, its channels, its group objects | Written from the database and the product manual |
| Firmware | What the device does with its memory and its objects | Written from the product manual |
| Package | The models compiled as a script, the databases, examples | Built by the author of the package |

The catalog and the manual belong to the manufacturer: keep the packages you make from them, and their sources, out of public repositories unless the manufacturer allows it.

## What you need

- The **product catalog** of the manufacturer (`.knxprod`), as ETS imports it, and the product's manual.
- **ETS**, to compare the pages, download the device and check what it does (see [link to ETS](ets.html)).
- A checkout of **BusDiagram** beside the folder of the package, with Node.js: the tests of the package run against its sources.

## Choose the program and its mask

In the catalog, a product runs an application program (`ApplicationProgram`), named `M-<manufacturer>_A-<number>-<version>-<hash>`. The toolkit runs the programs of three families of masks (its `MaskVersion`):

| Mask | Family | How ETS downloads it |
| --- | --- | --- |
| 0010h–0012h | BCU1 | Memory writes, each verified by a read |
| 0700h–0705h | BIM M112 (System 7) | Load state machines, with the application identifier checked first |
| 07B0h | System B | Load state machines; the device places relative segments itself |

KNX Secure programs are not simulated. A program shared by a range (several products, a parameter for the type of module) is generated for one product at a time, with the values that this product fixes.

## Generate the product database

From the checkout of BusDiagram, with the identifier of the program in the catalog:

```sh
npm run product -- <catalog.knxprod> M-00FE_A-0001-10-0000 ../my-package/src/sa-2/database.json
```

A program shared by a range takes, as a last argument, the values the product fixes, by parameter reference: `'{"P-57_R-57":"8"}'`. Only their branches are kept.

The database keeps what ETS shows and what the memory holds, without the application code:

- the segments of memory, with the octets of their default image that the device needs;
- the parameter types, the parameters and their place in memory (`memory`: segment, offset, bit offset), their references (`parameterRefs`, with their display order);
- the parameter dialog (`dynamic`): pages, branches, separators, in the order of ETS;
- the group objects and their references, the tables (addresses, associations, objects);
- the calculations with which ETS sets hidden parameters, and the texts in every language of the catalog;
- for a program converted from ETS3 (`preEts4Style`), the rule ETS follows for its pages: each parameter on the page that its display order gives.

The designer draws the ETS pages from it, and computes the memory a complete download writes.

## Find where the parameters are

The firmware reads its parameters in the memory, where ETS writes them. A parameter of the database says where:

```json
{
  "id": "P-1",
  "text": "Contact",
  "type": "PT-Contact",
  "value": "0",
  "memory": { "segment": "AS-0100", "offset": 100, "bitOffset": 0 }
}
```

Segment `AS-0100` starts at 100h: the parameter is at 100h + 100 = 164h, its bit offset counted from the most significant bit, over the size of its type (1 bit for `PT-Contact`). For SA 2:

| Parameter | Address | Bits | Values |
| --- | --- | --- | --- |
| Contact of output A | 164h | offset 0, 1 bit | 0 normally open, 1 normally closed |
| State at bus voltage recovery of A | 164h | offset 6, 2 bits | 0 unchanged, 1 off, 2 on |
| Contact of output B | 165h | offset 0, 1 bit | as A |
| State at bus voltage recovery of B | 165h | offset 6, 2 bits | as A |

Its group objects are numbered as in ETS: object 0 for output A, object 1 for output B, both switching (DPT 1.001).

## Write the model

`defineProduct` turns the product into a participant of the simulation:

```ts
import { defineProduct } from "bus-diagram";
import type { ProductObject } from "bus-diagram";
import { sa2Firmware, OUTPUTS } from "./firmware";

export const sa2Model = defineProduct({
  id: "example/sa-2",
  behavior: "example.sa2/v1",
  kind: "switchActuator",
  manufacturer: "Example Electric",
  manufacturerId: 0xfe,
  // What the delivered device holds: its manufacturer code at 104h, which ETS checks.
  delivered: [[0x104, [0xfe]]],
  name: "SA 2",
  description: "Example Electric SA 2: switch actuator, 2 outputs.",
  programs: ["M-00FE_A-0001-10"],
  masks: [0x0012],
  // Where its parameters are: the pages of the designer set these octets.
  parameterMemory: [[0x100 + 100, 2]],
  channels: OUTPUTS.map((c) => ({ id: c, label: c.toUpperCase() })),
  output: "switch",
  // The group objects of its application (a function of the memory when they depend
  // on parameters).
  objects: (): ProductObject[] =>
    OUTPUTS.map((ch, n) => ({ number: n, channel: ch, dpt: "1.001" })),
  firmware: sa2Firmware,
});
```

| Field | What it says |
| --- | --- |
| `id`, `behavior` | The product in its range, and the behavior a scenario names it by (`"example.sa2/v1"`) |
| `kind` | How the diagram draws it: `switchActuator`, `shutterActuator`, `buttonInterface`… |
| `manufacturerId`, `delivered` | What ETS reads before loading: the manufacturer code, and what the delivered device holds |
| `programs`, `masks` | The programs it runs (without their hash) and the masks of its coupler |
| `parameterMemory` | The octets of its parameters (`[address, length]`) |
| `channels`, `output`, `contactInputs` | Its hardware: outputs that drive loads (`switch`, `motor`, `dimmer`…), or contact inputs for wired push-buttons |
| `objects(memory)` | The group objects its application has with this memory |
| `firmware` | Its application (next section) |

A BIM M112 (070xh) also says where its application has its group object table (`objectTable`), the application identifier it is delivered with (`applicationId`, which ETS compares), and the properties its program writes (`properties`). The second product of the folder, **BE 1**, a push-button interface on a BIM M112, shows them.

The label of a channel names it in the tree of the designer's pages: a channel labelled `A`, `C1` or `Output 1` gets its loads with the ETS pages whose titles name it.

## Write the firmware

The firmware is made of the hooks of a behavior (`createState`, `onInit`, `onObjectWrite`…, see [extensions](extensions.html#register-a-behavior)). It reads its parameters from the memory of the device whenever it uses them, rather than once: a download from ETS changes that memory, then the device restarts and its `onInit` hook runs again.

```ts
import { bits, objectId } from "bus-diagram";
import type { BehaviorContext, Firmware } from "bus-diagram";

export const OUTPUTS = ["a", "b"] as const;
interface State {
  on: Record<string, boolean>;
}

// The parameters of an output, in its octet (164h for A, 165h for B).
const parametersOf = (ctx: BehaviorContext<State>, n: number) => ({
  normallyClosed: bits(ctx, 0x164 + n, 0, 1) === 1,
  recovery: bits(ctx, 0x164 + n, 6, 2),
});

// The relay of an output: a normally closed contact lets the current through when the
// relay is released.
const relay = (ctx: BehaviorContext<State>, n: number) => {
  const ch = OUTPUTS[n]!;
  ctx.setOutput(ch, {
    type: "switch",
    on: ctx.state.on[ch] !== parametersOf(ctx, n).normallyClosed,
  });
};

export const sa2Firmware: Firmware<State> = {
  createState: () => ({ on: { a: false, b: false } }),
  // At the start, and after a download: the state at bus voltage recovery.
  onInit(ctx) {
    OUTPUTS.forEach((ch, n) => {
      const { recovery } = parametersOf(ctx, n);
      if (recovery === 1 || recovery === 2) ctx.state.on[ch] = recovery === 2;
      relay(ctx, n);
    });
  },
  // A telegram on the object of an output.
  onObjectWrite(ctx, e) {
    const n = OUTPUTS.findIndex((_, i) => e.objectId === objectId(i));
    if (n < 0) return;
    ctx.state.on[OUTPUTS[n]!] = e.newValue !== 0;
    relay(ctx, n);
  },
  channelState: (s, ch) => ({ on: s.on[ch] ?? false }),
};
```

The helpers of the toolkit:

| Helper | What it does |
| --- | --- |
| `bits(ctx, address, bitOffset, count)` | Bits of the memory, most significant first |
| `readUnsigned(memoryOf(ctx), address, octets, littleEndian)` | A value of several octets, in the byte order of the program |
| `objectId(n)`, `numberOf(id)` | The identifier of group object `n` in the scenario (`"o0"`), and back |
| `send(ctx, n, value)` | Write object `n` and transmit it; nothing when the application has not enabled it |
| `valueOf(ctx, n)` | The value of object `n`, or null |

A firmware runs only what its memory holds: a device that holds another program, or a download that stopped half-way, runs nothing, and the journal says which program it got.

## Say what is not simulated

A product does more than its firmware simulates. `limits` says it, so that the designer marks the parameters that turn these functions on and lists them on a page **Simulation limits**:

```ts
limits: [
  {
    text: "Delay before switching on is not simulated.",
    parameters: ["P-9"],
  },
  {
    text: "Feedback object: only on change, not cyclically.",
    partial: true,
    parameters: ["P-10"],
    values: ["1"],
  },
],
```

`parameters` names parameters of the database (whatever their reference), and `values` the values that turn the function on (by default, any but the program's default).

## Texts and languages

The texts of the database (pages, parameters, group objects) come with their translations from the catalog. Those of the model (description, labels of channels, limits) are written in English, and translated by messages the model brings:

```ts
export const sa2 = {
  ...sa2Model,
  messages: {
    fr: {
      "Example Electric SA 2: switch actuator, 2 outputs.":
        "Example Electric SA 2 : actionneur de commutation, 2 sorties.",
    },
  },
};
```

## Build the package

The script of the package registers the models with the library of the page, `window.BusDiagram`. Compile it as a classic script (IIFE) where `bus-diagram` is that global, for example with Vite:

```js
// vite.config.js of the package
export default {
  build: {
    lib: { entry: "src/devices.ts", name: "Devices", formats: ["iife"] },
    rollupOptions: {
      external: ["bus-diagram"],
      output: { globals: { "bus-diagram": "BusDiagram" } },
    },
  },
};
```

Its first module checks the contract with BusDiagram, before the models are defined:

```ts
import * as BusDiagram from "bus-diagram";
import { sa2 } from "./sa-2/model";

// A BusDiagram of an older contract cannot run these devices.
if (!((BusDiagram.PACKAGE_API ?? 0) >= 1))
  throw new Error("these devices need BusDiagram 0.8 or later");

BusDiagram.registerParticipant(sa2);
```

The package is a zip of this script, of the databases and of a manifest:

```json
{
  "format": "bdpkg/1",
  "name": "example-devices",
  "version": "1.0.0",
  "busdiagram": "0.8.0",
  "api": 1,
  "products": [
    {
      "behavior": "example.sa2/v1",
      "manufacturer": "Example Electric",
      "name": "SA 2",
      "database": "databases/example.sa2-v1.json"
    }
  ],
  "scenarios": []
}
```

The [extensions guide](extensions.html#deliver-manufacturers-devices-in-a-package) lists every file of a package: a script by product, so that an exported page embeds only the products its scenario uses, and examples offered with the templates.

## Test it

The tests of a package run against the sources of the BusDiagram checkout beside it. In Vitest, `bus-diagram` is its DOM-free entry point, and its sources are reached by an alias:

```ts
// vitest.config.ts of the package
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

const busdiagram = resolve(import.meta.dirname, "../busdiagram");
export default defineConfig({
  resolve: {
    alias: [
      { find: /^bus-diagram$/, replacement: resolve(busdiagram, "src/core.ts") },
      { find: /^@busdiagram\/(.*)$/, replacement: `${busdiagram}/$1` },
    ],
  },
  test: { environment: "node", setupFiles: ["tests/setup.ts"] },
});
```

A setup registers the models and installs the databases, as the import of the package does; a test then inserts the product as the designer does, sets its ETS parameters, and runs the simulation:

```ts
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
```

Worth testing for every product:

- each parameter that the firmware reads, at its value by default and at the others;
- the group objects that the memory enables, with several configurations;
- the memory read back from a download (`readBack`, in `src/knxprod/readback.ts`): the parameters found write the same octets again;
- a download recorded from ETS, kept as a fixture, run again.

## Check it with ETS

1. Build the package, and import it in the designer (**Import devices…** of the Catalog panel; importing it again replaces it).
2. Insert the product, and compare its pages with those of ETS for the same product, taken from the manufacturer's catalog: same pages, same parameters, same order.
3. Turn on **Simulate commissioning**, link the diagram to ETS, program the individual address, then download the application (see [link to ETS](ets.html#downloading-an-application-from-ets)).
4. Change parameters in ETS, download again, and check what the device does in the diagram; the designer then writes what the memory holds into the project.
