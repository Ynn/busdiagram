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

With `contactInputs: true`, each channel of a device is drawn as a key that reports its edges, and the behavior measures presses with `ctx.schedule`; `contactKey(channel, objects)` can choose the key's icon and the object shown by its LED. A port with `direction: "both"` sends and listens, so the designer enables its W and T flags.

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
