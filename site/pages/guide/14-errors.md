---
title: Diagnosing an error
group: Simulation model
order: 14
---

# Diagnose errors

An invalid scenario does not start. The component lists every validation error with its JSON path.

```text
Invalid scenario:
• devices[1].objects[0].dpt: DPT 5.001 is incompatible with port "switch" (expected 1.001)
• devices[1].channels[0].parameters.estimatedTravelTimeMs: required parameter
• devices[0].behavior: unknown behavior "delayedSwitch/v1" (is its extension loaded?)
```

## Read a path

`devices[1].objects[0].dpt` points to the second device, its first object, and that object's `dpt` field. The [designer](../designer/index.html) highlights the field and can move the cursor to it.

## Common causes

| Symptom | Check |
| --- | --- |
| Invalid JSON at line N | Missing comma or closing quote. |
| Undeclared line | Add its address to `lines` or correct the device address. |
| Unknown object ID | A button or indicator refers to another device's object, or contains a typo. |
| Port requires a channel | Add `"channel": "s1"` and declare channel `s1`. |
| Incompatible DPT | Use a DPT accepted by the [port](../reference/ports.html). |
| Mixed group payload sizes | Do not associate one-bit and one-byte objects with the same address. |
| Unknown field | Check the format-2 field name. |
| Unknown behavior | Check its ID and load its extension script before the component. |

See the [error-code reference](../reference/errors.html) for all codes.

## Errors during simulation

An extension exception or an event cascade pauses the affected diagram and shows an error banner. **Reset** restores the initial state.

```js
diagram.addEventListener("bd-error", (event) => {
  console.log(event.detail.message);
  console.table(event.detail.details); // Array of { path, code, message }.
});
```
