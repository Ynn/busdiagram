---
title: Dimming and DALI
group: Write a scenario
order: 6.2
---

# Dimming and DALI

This chapter covers KNX dimming actuators and a KNX/DALI gateway. It focuses on group control and the telegrams exchanged with their communication objects.

## Dimming actuator ports

A `dimmerActuator/v1` channel accepts three kinds of control:

| Port | DPT | Purpose |
| --- | --- | --- |
| `switch` | 1.001 | Turn on at the configured level, or turn off. |
| `dim` | 3.007 | Relative dimming; direction, step size, or stop. |
| `value` | 5.001 | Absolute brightness from 0 to 100%. |
| `status` | 1.001 | Actual on/off status after a transition. |
| `valueStatus` | 5.001 | Actual brightness after a transition. |
| `scene` | 17.001 | Recall a channel brightness preset. |

Channel parameters include `onLevel` (`"fixed"` or `"last"`), `onLevelPct`, `dimTimeMs`, `switchFadeMs`, `valueFadeMs`, `minLevelPct`, `maxLevelPct`, `dimSwitchesOn`, and `dimSwitchesOff` for relative dimming, and `valueSwitchesOn` and `valueSwitchesOff` for brightness values. With `valueSwitchesOn: false`, a value received while the channel is off is ignored; with `valueSwitchesOff: false`, a value of 0 dims to the minimum level instead of switching off. Both options exist in dimming actuator manuals; by default both are allowed. See the [behavior reference](../reference/behaviors.html).

```json
{
  "id": "dimmer",
  "address": "1.1.3",
  "kind": "dimmerActuator",
  "behavior": "dimmerActuator/v1",
  "objects": [
    { "id": "switch", "ga": "1/1/1", "dpt": "1.001", "port": "switch", "channel": "s1", "flags": { "W": true, "T": false } },
    { "id": "dim", "ga": "1/2/1", "dpt": "3.007", "port": "dim", "channel": "s1", "flags": { "W": true, "T": false } }
  ],
  "channels": [{ "id": "s1", "label": "Ceiling light", "equipment": { "type": "dimmableLamp" } }]
}
```

## Tunable white

A dimming actuator channel with a `colourTemperature` object (DPT 7.600, K) also controls the colour temperature of a tunable white light. Requests are limited to the channel range (`minColourK`, 2700 K, to `maxColourK`, 6500 K, by default), and `colourTemperatureStatus` reports the applied value. The initial value is `initialState.colourTemperatureK` (4000 K). A `dimmableLamp` load shows the colour of its light. See the [tunable white example](../examples/tunable-white.html).

## Push-button dimming

An input of a push-button interface with the dimming function uses a short press for switching, a long press for continuous dimming, and release to stop. On a pair of keys, one input dims brighter and the other darker:

```json
{
  "id": "key1",
  "label": "Key 1 brighter",
  "parameters": { "function": "dim", "dimMode": "brighter", "dimStep": 1 }
}
```

The long press sends DPT 3.007 value 9: increasing brightness with the largest step (100 %). The actuator dims at its configured rate until a stop value arrives; telegram travel time can therefore affect the final level.

## KNX/DALI gateway

A DALI line has up to 64 individually addressed control gear units, 16 groups, and broadcast commands. In this model, each `daliGateway/v1` channel represents a DALI group (up to 16 per gateway). Its `daliGroup` equipment contains the modeled ballasts and their short addresses:

```json
"channels": [{
  "id": "g1",
  "label": "Office",
  "equipment": { "type": "daliGroup", "parameters": { "ballasts": 4, "firstAddress": 0 } }
}]
```

The gateway adds these ports to the dimming controls:

| Port | DPT | Purpose |
| --- | --- | --- |
| `error` | 1.005 | Fault in a group. |
| `broadcastSwitch` | 1.001 | Switch all groups. |
| `broadcastValue` | 5.001 | Set the value of all groups. |
| `generalError` | 1.005 | Fault anywhere on the DALI line. |

Each KNX command produces a DALI action shown in the event log and step mode:

| KNX command | Modeled DALI action |
| --- | --- |
| Switch on | `RECALL MAX LEVEL` or `DAPC` at the configured on level. |
| Switch off | `OFF`. |
| DPT 5.001 value | `DAPC` arc-power level. |
| DPT 3.007 dim | `UP` or `DOWN`, followed by stop. |
| DPT 17.001 scene | KNX scene 1–16 maps to DALI `GO TO SCENE 0`–`15`. |

The gateway accepts up to 16 group channels. Configure KNX scene presets 1–16 only; they map directly to DALI command numbers 0–15. Other KNX scene values have no configured DALI preset and leave the output unchanged.

The gateway polls ballasts every `pollMs` (2 seconds by default). Click a luminaire to simulate a ballast fault; the lamp goes dark and the gateway sets its group `error` and `generalError` objects. Click again to repair it. Status and fault objects can answer reads from the [USB interface panel](usb-interface.html).

```knx
scenario: dali-gateway
tabs: json
```

## Model limits

DALI commissioning, short-address assignment, and group membership are provided by the scenario rather than simulated. The model supports at most 16 ballasts per modeled group and requires disjoint short-address ranges across groups on the same gateway; physical DALI gear can belong to several groups, but that shared state is outside this model. The model supports group and broadcast control, but not individual ballast objects, color control, emergency lighting, or energy metering. The diagram shows DALI arc-power values as explanatory data; simulated light level follows the configured percentage.
