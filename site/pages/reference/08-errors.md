---
title: Error codes
order: 8
---

# Error codes

Each validation problem has a JSON `path`, a `code`, and a localized `message`.

## Scenario validation

| Code | Meaning |
| --- | --- |
| `type` | Wrong value type. |
| `required` | Missing required field or parameter. |
| `unknown-field` | Unknown format-2 field or behavior parameter. |
| `enum` | Value outside the allowed choices. |
| `range` | Number outside its allowed range. |
| `version` | Unsupported `formatVersion` (only 2 is supported). |
| `id` | Invalid identifier syntax. |
| `address` | Malformed or out-of-range individual, line, or group address. |
| `duplicate` | Duplicate identifier or address. |
| `reference` | Reference to a missing line, channel, object, coupler, or topology level. |
| `port` | Port not accepted by a behavior, an invalid channel association, or a second object on a port that takes only one. |
| `dpt` | Unsupported DPT or DPT incompatible with a port. |
| `association` | Incompatible payload sizes on one group address. |
| `toggle` | `"toggle"` used with an object that is not one bit. |
| `conflict` | Mutually incompatible actions or topology settings. |
| `incompatible` | Button, input, or equipment incompatible with its behavior. |
| `unknown-behavior` | Behavior ID has not been registered. |
| `unknown-equipment` | Equipment type has not been registered. |
| `unknown-room` | Referenced room is not declared in `rooms`. |
| `format` | A text value does not have the expected format, such as `clock.start`. |

## During simulation

| Code | Meaning |
| --- | --- |
| `extension-error` | An extension threw an exception; the simulation pauses. |
| `cascade` | Too many events occurred at the same simulated time. |
| `incompatible-command` | Equipment cannot apply a behavior's output command. |
| `no-ga` | A send was requested for an object without a group address and was ignored. |
| `view-error` | An equipment view failed; a warning frame replaces it while simulation continues. |

## Configuration warnings

These warnings do not stop the simulation. They are shown above the diagram, and in `getState().diagnostics`, when a parameter that compensates a property of the load disagrees with that property. A scenario can keep such a mismatch on purpose to illustrate a commissioning error.

| Code | Meaning |
| --- | --- |
| `config-valve` | The heating actuator output (`valveType`) and the connected radiator or fan coil valve (`normallyOpen`) disagree; the valve opens when no heat is requested. |
| `config-valve-mode` | A control value is linked to a heating actuator output whose function (`valveMode`) ignores it: a cooling value on a heating valve, a heating value on a cooling valve, or a heating/cooling object on an output that is not change-over. |
| `config-emitter` | The emitter does not suit the function of its valve: a radiator on a cooling valve, a fan coil coil of the other kind, or an emitter that only heats or only cools on a change-over valve. |
| `config-wiring` | The shutter actuator output inversion (`invertOutput`) and the motor wiring of the shutter (`wiringReversed`) disagree; the shutter moves opposite to the commands. |
| `config-contact` | The window contact type (`contactType`) and the input inversion (`invert`) disagree, or the contact of a push-button wired to a push-button interface (`keyContact`) and the contact its input expects when actuated (`actuatedContact`) disagree; open and closed, or presses and releases, are seen the wrong way round. |
| `config-value-range` | A value of a push-button interface input (`shortValue`, `longValue`) is outside the range of its object’s DPT; the value sent is limited to that range. |
| `config-no-power-supply` | A TP line, or the segment behind its extension, declares no bus power supply (`powerSupply`). Each TP segment needs its own supply with its choke; the simulation still runs. |
| `config-segment-size` | More than 64 connections on one TP1 segment (a line, a main line, the backbone, or the segment behind an extension): devices, and couplers, routers, or line extensions, which have a TP1 connection on each of their segments. The KNX TP1 specification allows 64 devices per segment, or 256 with TP1-256 devices; otherwise use a line repeater or a segment coupler. |
| `config-datatype` | A group address links DPTs of the same size but different meaning, such as a scene number (17.001) and a percentage (5.001), or 5.001 and 5.004. One-bit DPTs are not compared. A scene number (17.001) and a scene control (18.001) agree on recalls; the warning then notes that a 17.001 object reads a storing telegram as a recall. |
| `config-program` | A weekly program entry of a time switch cannot be read (days, time, value), or its value does not suit the DPT of the output objects; the entry is ignored. |
| `config-polarity` | A group address links DPT 1.009 (1 = closed) and DPT 1.019 (1 = open), whose values have opposite meanings. |
