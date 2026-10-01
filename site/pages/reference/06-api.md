---
title: JavaScript API
order: 6
---

# JavaScript API

Load `bus-diagram.js` to expose `window.BusDiagram`.

## Global functions

| Function | Purpose |
| --- | --- |
| `version` | Version of the library, for example `"{{version}}"`; see [versions](../guide/versions.html). |
| `create(target, scenario?, options?)` | Create or reuse a `<bus-diagram>` at a selector or element; return the component. |
| `registerBehavior(id, definition)` | Register an extension behavior; duplicate IDs are rejected. |
| `registerEquipment(id, definition)` | Register an equipment model. |
| `registerEquipmentView(id, { size, render })` | Register an equipment drawing. |
| `buildScenario(json, registry?, t?)` | Validate and normalize JSON; raise `ScenarioError` with `{ path, code, message }` details on failure. |
| `toV2(scenario)` | Convert a normalized scenario to format-2 JSON. |
| `createSimulator(json, options?)` | Create a simulation without a DOM component. |
| `registerMessages(language, messages)` | Add or extend a locale catalog; see [languages](../guide/languages.html). |
| `availableLanguages()` | List available locale codes. |
| `translator(language)` | Get a translation function for validation and engine messages. |
| `html`, `svg`, `nothing` | Lit helpers for extension views. |
| `OPTION_DOCS`, `DEFAULT_OPTIONS` | Display-option metadata and defaults. |

## `<bus-diagram>` element

### Attributes and properties

| Name | Purpose |
| --- | --- |
| `scenario` attribute | Select a JSON `<script>` block by `#id`. |
| `src` attribute | Load a JSON file URL over HTTP. |
| `options` property | JavaScript display options, overriding attributes. |
| `view` property | Effective display options. |
| `simulation` property | Underlying simulation for advanced use. |

### Methods

| Method | Purpose |
| --- | --- |
| `load(json)` | Validate and replace the scenario, or display its errors. |
| `reset()` | Restore initial state and time zero. |
| `play()`, `pause()` | Resume or pause simulated time. |
| `advance(ms)` | Advance by a nonnegative number of simulated milliseconds, even while paused. |
| `stepToNextEvent()` | Advance to the next explanatory event; return `{ timeMs, events }` or `null`. |
| `setSpeed(n)` | Set a positive simulation speed. |
| `getState()` | Return a serializable copy of current state. |
| `on(name, handler)` | Subscribe to `telegram`, `ready`, or `error`; return an unsubscribe function. |
| `groupWrite(address, value, interface?)` | Write a group value through the scenario's USB interface. |
| `groupRead(address, interface?)` | Read a group value through the USB interface. |
| `roomAction(roomId, action, value)` | Set a room's window state or outside temperature. |
| `setClock(value)` | Set the simulated clock to a local date and time (`YYYY-MM-DDTHH:MM[:SS]`). |
| `setBusVoltage(segment, on)` | Cut (`false`) or restore (`true`) the bus voltage of a line segment: `L1.1`, or `L1.1b` behind its extension. |

### `getState()` example

```json
{
  "timeMs": 11639,
  "paused": false,
  "faulted": false,
  "objects": {
    "pushButton/feedback": {
      "value": 50.19607843137255,
      "updatedAtMs": 11939,
      "flags": { "W": true, "T": false, "R": false, "U": true }
    }
  },
  "channels": {
    "shutter/s1": {
      "output": { "type": "motor", "direction": "stop" },
      "state": { "estimatedPositionPct": 50.19607843137255, "phase": "idle" }
    }
  },
  "equipment": {
    "shutter/s1": {
      "type": "shutter",
      "state": { "positionPct": 33.46, "drive": "stop", "moving": false, "limit": null }
    }
  },
  "rooms": {
    "living": { "temperatureC": 20.8, "outsideTemperatureC": 5, "windowOpen": false }
  },
  "telegramsInFlight": 0,
  "unpoweredSegments": [],
  "diagnostics": []
}
```

The `objects` map uses `deviceId/objectId` identifiers. `channels` and `equipment` use `deviceId/channelId`; `rooms` uses room IDs. `unpoweredSegments` lists the segments whose bus voltage is cut. Unknown values are `null`.
