---
title: Events
order: 7
---

# Events

`<bus-diagram>` emits DOM events with `bubbles` and `composed` enabled. `diagram.on("telegram", handler)` is a convenient subscription method.

## `bd-telegram`

Emitted once when each telegram is sent, including automatic status feedback.

| `detail` field | Meaning |
| --- | --- |
| `id` | Telegram number. |
| `timeMs` | Simulated send time. |
| `source` | Sender's individual address. |
| `destination` | Destination group address. |
| `value` | Decoded value. |
| `raw` | Encoded payload bits or bytes. |
| `dpt` | Sender object's DPT. |
| `service` | Group service, such as `GroupValueWrite`. |
| `kind` | `"cmd"` for a command or `"state"` for status feedback. |
| `causeId` | ID of the input or internal event that caused the telegram. |

## `bd-select`

Emitted when a device card is selected. `detail.deviceId` identifies the device; the designer uses this event to open its form.

## `bd-ready`

Emitted after a scenario loads successfully. It has no `detail` payload.

## `bd-error`

Emitted when a scenario cannot be loaded. `detail.message` is the displayed message; `detail.details` is an array of `{ path, code, message }` entries. `String(event.detail)` returns the message.
