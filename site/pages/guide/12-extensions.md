---
title: Extensions
group: For developers
order: 12
---

# Extensions

An extension can add a behavior, an equipment model, or a view without changing the library bundle. Load its script after `bus-diagram.js`, then refer to the registered identifier in a scenario. See the [complete example](../examples/extension.html).

## Register a behavior

The sample [`site/samples/extensions/delayed-switch.ts`](../examples/extension.html) defines a delayed switch:

```ts
{{include:site/samples/extensions/delayed-switch.ts#behavior}}

registerBehavior("delayedSwitch/v1", delayedSwitch);
```

A behavior may implement these entry points:

| Entry point | Called when |
| --- | --- |
| `onInit(ctx)` | A device is created; initialize outputs without transmitting. |
| `onInput(ctx, input)` | A local `press`, `short`, `long`, `release`, or `value` action occurs; for a behavior with `contactInputs`, the edges `down` and `up` of a channel's key. |
| `onObjectWrite(ctx, event)` | An incoming write is accepted by an object with flag W, even if the value has not changed. |
| `onRead(ctx, objectId)` | A read request reaches an object that answers it (C and R); bring a value that changes between two sends up to date with `ctx.setObject`, without sending. |
| `onTimer(ctx, key, payload)` | An event scheduled with `ctx.schedule` is due. |
| `onTick(ctx, dtMs)` | Simulation time advances; called every 20 ms when implemented. |
| `onRoomChange(ctx, room)` | The device's room temperature or window state changes. |
| `onClockChange(ctx)` | The [simulated clock](time.html#simulated-clock) is set to another time; reschedule clock-based deadlines. |
| `onBusFailure(ctx)` | The bus voltage of the device's segment fails; set the outputs, then the device stops (its timers are cancelled). |
| `onBusRecovery(ctx)` | The bus voltage returns; the device restarts with its state. |
| `channelState(state, channel)` | Channel state is requested by the inspector or `getState()`. |
| `deviceState(state)` | Device state is requested, such as a thermostat display. |

The context `ctx` exposes `t` for translated messages, `timeMs`, `device`, `state`, `getObject`, `setObject`, `transmit`, `setOutput`, `getOutput`, `readEquipment`, `readPower`, `readRoom`, `setOutsideTemperature`, `clock`, `schedule`, `cancel`, and `note`. `setObject` changes a local value without transmitting. `transmit` checks flag T and the sending address. `readEquipment(channel, index)` returns the state of a load of a channel: the first one by default, or another one when several loads are wired to the output (`ctx.device.channels[i].loads` lists their types). `readPower` returns the power drawn through a channel, in W: the sum of its loads that model it. `clock()` returns the simulated clock (`nowMs`, `speed`) or `null` without one; divide a clock delay by `speed` to schedule it in simulation time. `note` adds an explanation to the event log.

Equipment models can define `heatOutput(state, parameters)` to heat or cool a room and `checkParameters(parameters, t)` to validate related parameters. A view can define `interact(state, action, parameters, equipment)` to respond to a user action. Use simulation time and `ctx.schedule` for delayed behavior; browser timers such as `setTimeout` do not follow simulation time.

With `contactInputs: true`, each channel of a device is drawn as a key that reports its edges, and the behavior measures presses with `ctx.schedule`; `contactKey(channel, objects)` can choose the key's icon and the object shown by its LED. A port with `direction: "both"` sends and listens, so the designer enables its W and T flags. `channelObjects: { parameter, values }` lists, for each value of a channel parameter, the ports (and DPTs) of the objects that the channel has: the designer creates and removes them when the parameter changes, as a product's parameter dialog does for a function.

A behavior can check its own configuration when a scenario is loaded:

| Rule | Role |
| --- | --- |
| `validate(device, t)` | Returns blocking errors `{ path, code, message }`; the path is relative to the device (`channels[2].scenes.17`) and the scenario is refused. |
| `normalize(device)` | Returns data derived from the configuration: `tableGroupAddresses`, group addresses of the device that the coupler filter tables keep without an object. |
| `warnings(device, t)` | Returns configuration warnings `{ code, channelId?, message }`: the simulation runs, and the warnings are shown above the diagram. |

`presentation(device)` tells the diagram and the designer how to draw a device of the behavior, from its `kind`, objects and channels: `screen` (objects facing a screen at the head of the plate), `supervisor` (values written under the object names), `busInterface` (panel that writes and reads any group address), `remoteSystem` (the `system` field of its state shown next to its address), `receiver` (group-address column on the left; by default for a device with channels and no keys), and `metered` (channels whose loads show their measured power).

The device passed to these rules is the normalized device, with the parameters of its channels and of their loads (`channels[i].equipmentConfigs`). With `representsAnyDpt: true`, the objects of the behavior may carry a standard DPT that is shown but not simulated, as for a visualization.

A port declares what its objects mean; a port name means nothing by itself:

| Port field | Effect |
| --- | --- |
| `defaultFlags: { R, U }` | Flags R and U of its objects when the scenario does not write them; false otherwise. A status object usually has `R: true`, a display `U: true`. |
| `telegram: "state"` | Its telegrams are state reports, styled as such in the monitor; `"command"` by default. |
| `drivesLoad: true` | The diagram links its objects to the loads of their channel, as the command of an output. |
| `initialUnknown: true` | Its objects start with an unknown value until a telegram gives one, as a display. |
| `description` | Role of the port, shown in the reference and the schema. |

An exception in a behavior pauses only that diagram and reports an `extension-error`. An exception in a view replaces that view with an error frame and reports `view-error` in `getState()`.

### Definition checks

`registerBehavior` validates ports, supported DPTs, output types, and parameter defaults. Parameter schemas use a flat subset of JSON Schema: scalar `integer`, `number`, `boolean`, `string`, and `null` properties, with bounds, `enum`, `enumTitles`, `default`, and `description`. Nested objects and arrays are unsupported. A registered definition is copied and frozen.

### Labels for guided editing

Optional metadata makes an extension usable in the [guided designer](designer.html):

| Field | Effect |
| --- | --- |
| Parameter `title` | Label shown instead of the property name. |
| Parameter `unit: "ms"` or `"%"` | Display seconds for millisecond values or show a percent sign. |
| Parameter `expert: true` | Place the control under advanced settings. |
| Parameter `enumTitles` | Labels for `enum` values, in the same order. |
| Parameter `nullTitle` | Label for `null`; otherwise the designer shows “none”. |
| Port `title` | Name shown for the communication object. |
| Port `direction: "in"` or `"out"` | Choose the default W or T flag. |
| Equipment `title` | Name of the connected load. |

### Pages of parameters

The designer shows the parameters of a device as pages, like a parameter dialog: pages of the device, then a group of pages for each channel. `parameterLayout` declares them; without it, the designer makes one page of device parameters and one page of channel settings. Every parameter or port that no page names is still shown, on an automatic page.

```js
parameterLayout: {
  device: [
    { id: "general", title: "General", items: [
      { parameter: "delayMs" },
      { groupObject: "alarm" },
      { when: { groupObject: "alarm" }, items: [{ parameter: "alarmDelayMs" }] }
    ] }
  ],
  channel: [
    { id: "function", title: "Function", items: [
      { groupObject: "switch" },
      { parameter: "mode" },
      { when: { parameter: "mode", is: ["timed"] }, items: [{ parameter: "durationMs" }] },
      { heading: "Status" },
      { groupObject: "status" },
      { note: "The status follows the relay." }
    ] }
  ]
}
```

| Item | Row |
| --- | --- |
| `{ parameter }` | A parameter of the device (device pages) or of the channel (channel pages). |
| `{ initialState }` | An initial state of the channel (channel pages). |
| `{ groupObject }` | The box that enables the group object of a port; group addresses are linked in the Group objects tab, never on a parameter page. |
| `{ heading }`, `{ note }` | A heading, or an information box. |
| `{ scenes: true }` | The scenes of a channel. |
| `{ when, items }` | Items shown only when a parameter has (`is`) or does not have (`not`) one of the given values, its default value counting when it is absent, or when the group object of a port is enabled (`{ groupObject }`). |

`registerBehavior` checks the names used by the pages. Titles, headings, and notes are translated like parameter titles.

Use `ctx.t` for messages in the diagram's selected language. Supply extension translations with `BusDiagram.registerMessages(language, messages)`; see [Languages](languages.html#messages-in-an-extension).

## Register a view

```js
BusDiagram.registerEquipmentView("ledStrip", {
  size: { width: 84, height: 30 },
  render: ({ state, label, box }) => BusDiagram.html`
    <div style="position:absolute;left:${box.x}px;top:${box.y}px">${state.on ? "●" : "○"} ${label}</div>`,
});
```

A scenario can select this view with `"equipment": { "type": "lamp", "view": "ledStrip" }`. The underlying lamp model and its `{ on }` state remain the same.

## Load scripts

```html
<script defer src="bus-diagram.js"></script>
<script defer src="extensions/delayed-switch.js"></script>
```

Components wait for these scripts to load. Extensions share registered definitions through `BusDiagram`; they should not rely on global variables from another extension. The designer and standalone export wrap each extension in its own function scope. When loading raw files with `<script src>`, compile each extension as an IIFE to avoid global name collisions. `npm run build` compiles `site/samples/extensions/*.ts` into classic scripts.

## Deliver a participant with the library

A participant delivered with BusDiagram lives in its own folder, `src/participants/<name>/`, and uses the same contract as an extension. Its files:

| File | Content |
| --- | --- |
| `behavior.ts` | The behavior definition: parameters, ports and their meaning, state, reactions, presentation. |
| `layout.ts` | Its pages of parameters (`parameterLayout`). |
| `rules.ts` | Its `validate`, `normalize`, and `warnings` rules, if any. |
| `messages.fr.ts` | Translations of its texts (parameters, pages, log messages); one file per language. |
| `model.ts` | Its model entry: behaviors and catalogs, `{ behaviors, messages }`. |
| `designer.ts` | Its designer entry: catalog category, templates, displayed type, designer catalogs. |
| `designer.fr.ts` | Translations of its designer texts. |

Two lists compose the delivered participants: `src/standard-model.ts` (model entries, installed by the registry) and `site/designer/standard-designer.ts` (designer entries). Adding a participant means adding its folder and one line to each list; the engine, the diagram, and the designer know participants only through these declarations. Code shared on purpose by several participants is in `src/participants/shared/`. A delivered equipment follows the same layout in `src/equipment/<name>/`: `equipment.ts` (physical model), `size.ts` (size of its views, read by the layout), `view.ts`, `messages.fr.ts`, and `model.ts`, whose entry also gives the sizes of its views (`viewSizes`).

The tests check this organization: a participant depends neither on the registry nor on another participant, its model entry never reaches the designer, shared modules name no behavior, and its texts are in its own catalogs.

## Deliver manufacturers' devices in a package

BusDiagram delivers no manufacturer's device: their product databases come from the manufacturers' catalogs. It delivers what is needed to write them, and the designer imports them from a **package of devices** (`.bdpkg`), with the button **Import devices…** of the Catalog panel. Such devices, modeled on a manufacturer's, are programmed by ETS with their application program.

A device is built with the toolkit of `src/bcu`, exported by the library (`BusDiagram.defineProduct`…), which does what the system part of every device does, whatever its application:

- A **mask profile** per family of masks (BCU1 for 0010h–0012h, BIM M112 for 0700h–0705h with its load state machines, System B for 07B0h with the relative segments it allocates itself) gives the memory of the device, where its individual address and programming mode are, how ETS loads it, and how its tables are read: group addresses, associations, group objects. ETS reaches it through the device management of the simulation.
- `defineProduct(spec)` turns a product into a participant: its identity (manufacturer, name, order number, application programs, masks), what the delivered device holds (`delivered`: its manufacturer code and hardware configuration at given addresses; `applicationId` for a System 7), where its parameters are (`parameterMemory`) and, for a System 7, its group object table (`objectTable`) and the properties its program writes (`properties`), its channels, the group objects its application has with a given memory (`objects(memory)`), and its firmware, which reads its parameters in the memory (`bits`) and sends its objects by number (`send`, `valueOf`).
- `limits` says what the firmware does not simulate, or only in part (`partial`), and the parameters of the program that turn it on (`parameters`, `values`). The designer marks these parameters on the ETS pages and lists the limits on a page **Simulation limits** of the device, those that the values of the project turn on first.

Its **product database** holds what ETS shows and what its parameters and tables occupy: parameter types, parameters and their place in memory, the parameter dialog, the group objects, the tables. It is generated from a catalog that the author holds, without the application code: `npm run product -- <catalog.knxprod> <program> <file.json>`. The designer shows the pages of ETS from it and computes the memory a complete download writes; the simulation reads the application of the device from its memory: the objects its firmware enables there, linked as the tables say.

A package is a zip:

| File | Content |
| --- | --- |
| `manifest.json` | `format` (`"bdpkg/1"`), `name`, `version`, `busdiagram` (the version of BusDiagram it needs at least, for the readers that know no contract), `api` (the contract with BusDiagram it needs, `PACKAGE_API`: when present, it decides), `common` (optional: the script the scripts of the products need first), `products` (`behavior`, `manufacturer`, `name`, `database`: the file of its product database, `script`: optional, the script that registers this product alone) and `scenarios` (`id`, `file`, `title` by language, `translations`: a dictionary file by language) |
| `devices.js` | Extension script that registers the devices: `BusDiagram.registerParticipant(model)` for each, compiled as an IIFE with `bus-diagram` as the global `BusDiagram` |
| `scripts/*.js` | Optional: the common script and one script by product, compiled as `devices.js`. With them, a page exported from the designer embeds the code of the products its scenario uses, not that of the whole package |
| `databases/*.json` | The product databases |
| `scenarios/*.json` | Examples, offered with the templates once the package is imported |

The designer checks the package, runs its script as an extension (refused without effect if it fails: a former version of the package stays as it was), and keeps the package in the browser: it is loaded again at start, appears with the extensions and is removed with them; an export embeds its script, and says so with the names of the packages it embeds. A scenario that uses a device of a package not imported is refused with the name of what is missing. The tests of BusDiagram use the products of an imaginary manufacturer (`tests/knx/fixtures/sample-devices`), whose databases are written by hand: they show what a package author writes.
