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
| `onInput(ctx, input)` | A local `press`, `short`, `long`, or `value` action occurs. |
| `onObjectWrite(ctx, event)` | An incoming write is accepted by an object with flag W, even if the value has not changed. |
| `onTimer(ctx, key, payload)` | An event scheduled with `ctx.schedule` is due. |
| `onTick(ctx, dtMs)` | Simulation time advances; called every 20 ms when implemented. |
| `onRoomChange(ctx, room)` | The device's room temperature or window state changes. |
| `channelState(state, channel)` | Channel state is requested by the inspector or `getState()`. |
| `deviceState(state)` | Device state is requested, such as a thermostat display. |

The context `ctx` exposes `t` for translated messages, `timeMs`, `device`, `state`, `getObject`, `setObject`, `transmit`, `setOutput`, `readEquipment`, `readRoom`, `schedule`, `cancel`, and `note`. `setObject` changes a local value without transmitting. `transmit` checks flag T and the sending address. `note` adds an explanation to the event log.

Equipment models can define `heatOutput(state, parameters)` to heat or cool a room and `checkParameters(parameters, t)` to validate related parameters. A view can define `interact(state, action, parameters, equipment)` to respond to a user action. Use simulation time and `ctx.schedule` for delayed behavior; browser timers such as `setTimeout` do not follow simulation time.

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
