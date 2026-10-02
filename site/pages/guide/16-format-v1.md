---
title: Format 1 and conversion
group: For developers
order: 16
---

# Format 1 and conversion

Older scenarios use format 1: they omit `formatVersion`, use `role` instead of `port`, and express some durations in seconds. BusDiagram still accepts them, except for their keys (`buttons`): they used the former push-button behavior, which has been removed, and a file with keys is refused with the error `removed`. Remove the keys, convert the file, then add a push-button interface (`buttonInterface/v1`).

| Format 1 | Format 2 |
| --- | --- |
| `kind` alone | `kind` plus a behavior ID, such as `buttonInterface/v1` or `switchActuator/v1`. |
| `role: sensor / display / switch / status` | `port: input / display / switch / status`. |
| `role: move / stop / position / scene / forced` | `port: move / stopStep / positionStatus / scene / forced`. |
| `travel: 12` seconds | `estimatedTravelTimeMs: 12000` and `actualTravelTimeMs: 12000`. |
| `timer: 10` seconds | `timerMs: 10000`. |
| `load: lamp / shutter / none` | `equipment: { "type": "lamp" }`, `{ "type": "shutter" }`, or `null`. |
| Missing flags | Defaults based on object role. |

A format-1 `role: "position"` is position **feedback**, not a command setpoint.

Open a scenario in the designer and choose **Convert to format 2**, or call `BusDiagram.toV2(BusDiagram.buildScenario(json))` in JavaScript. The converter omits optional values equal to their defaults. Format 2 adds explicit flags, position commands, numeric inputs, disconnected channels, equipment configuration, extension behaviors, and stricter validation.
