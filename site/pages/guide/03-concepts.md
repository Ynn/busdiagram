---
title: Concepts
group: Getting started
order: 3
---

# Concepts

A diagram separates user actions, KNX communication, actuator outputs, and connected equipment.

```text
button press → device behavior → communication object → bus telegram
                                                  ↓
                                  receiving object (W flag)
                                                  ↓
                         behavior → output → lamp or shutter
```

## Device

A KNX device has an individual address such as `1.1.10`. It contains communication objects and may also have buttons, inputs, and channels. Its `behavior` defines its logic and how it is drawn, for example `buttonInterface/v1`, `switchActuator/v1`, `shutterActuator/v1`, `daliGateway/v1`, `roomThermostat/v1`, or a registered [extension](extensions.html). The `kind` field is a free description of the device; only a behavior that documents a value gives it an effect, such as `"supervisor"` for a display.

## Communication object

Each object has a value, a DPT that determines how to interpret it, one or more group addresses, and flags:

| Flag | Enabled | Disabled |
| --- | --- | --- |
| `C` communication | The object communicates, according to its other flags (enabled by default). | The object neither sends nor handles any message. |
| `W` write | A received write updates the value and invokes the behavior. | The telegram remains visible, but the value and behavior do not change. |
| `T` transmit | The object can send its value. | The value may change locally, but no telegram is sent. |
| `R` read | The object responds to a read on any of its addresses, on its sending address. | No response is sent. |
| `U` update | A received response updates the object. | Responses are ignored. |
| `I` read on initialisation | When the device starts again after a bus voltage failure, the object reads its value on its sending address. | No read at start. |

When a device sends, its other objects on the same address take the value at once, as the KNX Application Layer specifies; their `W` flag only decides whether the device reacts, so that a status object does not act as a command.

`R`, `U`, `C`, and `I` are optional in JSON; see the defaults of `R` and `U` in the [USB interface guide](usb-interface.html#r-and-u-flags). Each object also has a transmission priority, `"priority": "low"` (default), `"normal"`, or `"urgent"`, written in the control field of its frames. The object's **port** (`switch`, `status`, `move`, and so on) gives it a role in its behavior; see the [port reference](../reference/ports.html).

## Group address and telegram

A group telegram has a source individual address, a destination group address, a service, and—on a write or response—payload data. The DPT is not transmitted: each device interprets the payload using its own object DPT. Every device on the line can receive the telegram, but only objects associated with its destination address process it.

| Service | Sent by | Processed by |
| --- | --- | --- |
| `GroupValueWrite` | A behavior with the T flag, or the USB interface panel. | Associated objects with the W flag. |
| `GroupValueRead` | The USB interface panel. | Associated objects with the R flag; each responds on its sending address. |
| `GroupValueResponse` | An object answering a read. | Associated objects with the U flag. |

## Channel and connected equipment

A channel is an actuator output, such as a relay or motor drive. Its behavior sends commands such as `on/off` or `up/down/stop`. Connected equipment, such as a lamp or shutter, responds to those commands and has its own physical state. It does not know about group addresses or DPTs.

An output can supply several loads wired in parallel, as a lighting circuit supplies several luminaires: `equipment` is then a list, and every load receives the commands of the output. A metering actuator measures the sum of their powers. A shutter output drives a single motor.

```json
"channels": [{
  "id": "s1",
  "label": "L1",
  "equipment": [
    { "type": "lamp", "name": "Ceiling", "parameters": { "powerW": 75 } },
    { "type": "lamp", "name": "Wall" },
    { "type": "appliance", "name": "Socket", "parameters": { "powerW": 1000 } }
  ]
}]
```

The separation makes it possible to show a [miscalibrated shutter](shutters.html): the actuator estimates position using its configured travel time while the connected shutter moves at its actual speed.

## Internal association

When an object transmits, other objects in the **same device** that share the address may also receive the telegram if their W flag permits it. A status object can therefore control another output of the same actuator. This convention of the model is not implemented identically by every manufacturer.
