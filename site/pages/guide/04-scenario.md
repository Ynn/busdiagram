---
title: Structure of a scenario
group: Write a scenario
order: 4
---

# Structure of a scenario

A scenario is a JSON document using format version 2. The [JSON reference](../reference/json.html) lists every field; this page explains how the fields fit together.

```json
{
  "formatVersion": 2,
  "title": "Example installation",
  "lines": [{ "address": "1.1" }],
  "groupAddresses": [],
  "devices": [],
  "options": { "speed": 1, "filterTables": false }
}
```

Only `formatVersion`, `lines`, and `devices` are required. The optional fields are `title` and `description` (shown above the diagram), `groupAddresses` (names and DPTs for the monitor), `topology` (IP routing and coupler settings), `rooms` (heated rooms), `clock` (simulated date and time, see [time](time.html#simulated-clock)), and `options` (initial simulation speed and filter table display). For editor completion, set `$schema` to the published schema, `https://ynn.github.io/busdiagram/schema/scenario-v2.schema.json`, or to `schema/scenario-v2.schema.json` in a local copy.

## Topology

The diagram layout is derived from the addresses; you do not need to enter drawing coordinates.

| Declaration | Diagram |
| --- | --- |
| One line, such as `1.1` | That line and its devices. |
| Several lines in one area (`1.1`, `1.2`) | The main line and line couplers `1.1.0` and `1.2.0`. |
| Several areas (`1.1`, `2.1`) | A backbone and area couplers `1.0.0` and `2.0.0`. |
| `topology` | KNXnet/IP routing and coupler settings; see [topology](topology.html). |
| An `extension` on a line | A downstream segment with a repeater or segment coupler. |

```knx
scenario: full-topology
attrs: monitor="false"
tabs: json
```

Couplers derive their filter tables from group associations: an address crosses a coupler when needed on the other side. The routing counter starts at 6 and decreases as the telegram passes each coupler.

## Rooms

`rooms` describes heated rooms, including initial and outside temperatures and window state. Assign a thermostat, window contact, or temperature sensor with its `room` field; assign a radiator through `"equipment": { "type": "radiator", "room": "living" }`. See [heating](hvac.html).

## Device order and propagation

The order of devices in `devices` follows their order on the cable. It affects propagation time: adjacent devices are 250 ms apart in the simulation. See [time and pacing](time.html).

## IDs and references

Each device has a unique `id`. Each object, button, input, and channel has an `id` unique within its device. Buttons and inputs refer to objects by ID; objects refer to channels through `channel`. An unknown reference produces a [validation error](errors.html) with its JSON path.

## Group addresses

Group addresses use three levels: main group 0–31, middle group 0–7, and subgroup 0–255. `0/0/0` is the broadcast destination and is refused, as it is in commissioning software.

An object can listen on multiple addresses: `"ga": ["1/1/1", "1/4/1"]`. The first is its sending address; the rest are receive-only. `"ga": []` leaves an object unassociated and is allowed unless a control needs it to transmit.

Objects associated with the same group address must have compatible payload sizes. For example, a one-byte DPT 5.001 object cannot share an address with a one-bit DPT 1.001 object.
