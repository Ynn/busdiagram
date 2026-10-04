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
| `I` read on initialisation | When the device starts (at the start of the simulation, and again after a bus voltage failure), the object reads its value on its sending address. Like any request to send, this read needs C and T. | No read at start. |

When a device sends, its other objects on the same address take the value at once, as the KNX Application Layer specifies; their `W` flag only decides whether the device reacts, so that a status object does not act as a command.

`R`, `U`, `C`, and `I` are optional in JSON; see the defaults of `R` and `U` in the [USB interface guide](usb-interface.html#r-and-u-flags). Each object also has a transmission priority, `"priority": "low"` (default), `"normal"`, or `"urgent"`, written in the control field of its frames. The object's **port** (`switch`, `status`, `move`, and so on) gives it a role in its behavior; see the [port reference](../reference/ports.html).

## Group address and telegram

A group telegram has a source individual address, a destination group address, a service, and—on a write or response—payload data. The DPT is not transmitted: each device interprets the payload using its own object DPT. Every device on the line can receive the telegram, but only objects associated with its destination address process it.

| Service | Sent by | Processed by |
| --- | --- | --- |
| `GroupValueWrite` | A behavior with the T flag, or the USB interface panel. | Associated objects with the W flag. |
| `GroupValueRead` | The USB interface panel. | Each device answers once: its first associated object with the R flag and a known value responds, on its own sending address. |
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

When an object transmits, the other objects of the **same device** associated with that address are informed as well, exactly as for a telegram received from the bus: an object takes the value only with its W flag (U for a response). A status object linked to the command address of another output of the same actuator therefore switches that output when W is set on the command object, and changes nothing otherwise. Likewise, two toggle inputs of one push-button interface on the same address stay in step only with W: without it, each input keeps its own value, and after a press on one, the first press on the other sends the same value again.

## Inside a telegram

Select a telegram in the group monitor: its card gives the source, the destination, the service, the value, the cause, and the octets of its TP1 frame, colored by field. Click an octet, or **Details**, to open the frame in four views that stay in step: selecting an octet in one selects it in the others.

- **Frame:** the fields (control, source, destination, routing octet, TPCI/APCI, data, check octet) and, for the selected octet, what each of its bits means. A one-bit value such as DPT 1.001 travels in the APCI octet itself.
- **Bits:** every octet bit by bit, its sub-fields underlined.
- **TP1 signal:** each octet as the serial character sent on the bus (start bit, eight data bits least significant first, even parity, stop bit, then 2 bit times at rest before the next character), its logical bits, and a schematic bus voltage: a logical 0 is a short voltage drop, a logical 1 leaves the bus at rest. Below, the selected octet appears twice: as it is written, most significant bit first (b7 … b0), and as it is sent, b0 first; point at a bit to find it in both. A time ruler gives the duration; the acknowledgement that follows is drawn for illustration only.
- **Checksum:** two checks cross. The parity bit P, sent after the eight data bits of each character, makes the number of 1 even in its row; the check octet, the last character, makes the number of 1 odd in each data column, bits 7 to 0 (not in the column of the parity bits). Click a column to follow its calculation, beside the equivalent XOR of the octets followed by an inversion.

When the telegram crosses couplers, choose the segment: each coupler lowers the routing counter, so the routing octet and the check octet change from one line to the next.

To see who is linked to a group address, click it in a device, or click the destination in the telegram card: every object linked to it is outlined. Its badge reads T when the object sends on that address (C and T set, and it is its sending address), W when a write on it updates the object (C and W set), and a dash when neither. Each address of a cell can be chosen, with the mouse or the keyboard; Escape clears the selection.
