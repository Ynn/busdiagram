---
title: Topology and supervision
group: Write a scenario
order: 6.5
---

# Topology and supervision

The model represents twisted-pair lines, couplers, KNXnet/IP routers, and group-address filtering. Filter tables, routing settings, line repeaters, and segment couplers are described in [couplers and repeaters](couplers.html).

## Topology levels

| Level | Device addresses | Coupler to the next level |
| --- | --- | --- |
| Line `A.L` | `A.L.1` through `A.L.255` | Line coupler `A.L.0` |
| Area main line `A.0` | `A.0.1` through `A.0.255` | Area coupler `A.0.0` |
| Backbone `0.0` | `0.0.1` through `0.0.255` | — |

Declare lines in `lines` using area and line numbers 1–15. A main line appears when an area has more than one line; a backbone appears when the installation has more than one area. To show either level with a smaller installation, set:

```json
"topology": { "mainLines": true, "backbone": true }
```

Devices may then connect to a main line (`1.0.5`) or the backbone (`0.0.3`). Give areas names with `"areas": [{ "address": 1, "name": "Building A" }]`.

## Power supplies

Each twisted-pair line, and each segment behind a line repeater or segment coupler, needs its own KNX power supply with a choke. `powerSupply` shows it on the diagram, next to the line name:

```json
"lines": [
  { "address": "1.1", "powerSupply": { "name": "PSU 1.1", "currentMa": 640 },
    "extension": { "address": "1.1.64", "powerSupply": { "currentMa": 320 } } }
]
```

`currentMa` is the rated current (common values are 160, 320, 640, and 1280 mA); both fields are optional. The modeled supply has no individual address and no communication objects (some supplies with diagnostics are KNX devices in their own right). BusDiagram does not compute the bus load: the consumption of each device is not modeled. The designer sets the supply of each line in its **Topology** section.

A TP backbone and TP main lines are lines too, each with its own power supply. They are given in `topology.powerSupplies`, by the address of the line: `0.0` for the backbone, `1.0` for the main line of area 1:

```json
"topology": {
  "powerSupplies": { "0.0": { "currentMa": 640 }, "1.0": { "currentMa": 640 }, "2.0": {} }
}
```

Scenarios written for 0.7, which had no such field, now get this warning for their TP main lines and backbone: add their supplies to `topology.powerSupplies` (or in the designer); the simulation itself is unchanged.

A key that names no TP backbone or main line of the installation is refused (an IP network that acts as the backbone or main lines needs none). Without its power supply, a backbone or main line gets the same configuration warning as a line. On the diagram, its supply is drawn by its name, and a click cuts its bus voltage: the couplers on it then forward nothing across it. When an edit in the designer makes a backbone or a main line appear (a second area, a second line in an area), it gets a 640 mA supply, as a new line does; the **Topology** section sets them.

## KNXnet/IP routers

A KNXnet/IP router replaces a coupler and uses its individual address:

| `topology.ip` | Replaces | Router addresses | IP network level |
| --- | --- | --- | --- |
| `"areaCouplers"` | Area couplers | `A.0.0` | Backbone |
| `"lineCouplers"` | Line couplers | `A.L.0` | Main lines and backbone |

The model routes through the IP network and applies each router's filter table as it would for a twisted-pair coupler. A device with `"medium": "IP"`, such as a supervisor, connects to that network.

```knx
scenario: full-topology
attrs: monitor="false"
tabs: json
```

For a single-router installation, the legacy `"ipRouter": { "address": "1.1.0" }` form is also accepted when that address belongs to a coupler.

## What a supervisor sees

An IP supervisor receives the telegrams that couplers route toward the IP network. A supervisor on a twisted-pair line (`"medium": "TP"`) sees traffic on its own line. Coupler filter tables are derived from declared group-address associations. If a supervisor is omitted from those tables, its desired group traffic can be filtered out; `"inFilterTables": false` reproduces that situation.

A coupler can alternatively route or block all group telegrams in one direction:

```json
"topology": {
  "ip": "lineCouplers",
  "couplers": [{ "address": "1.1.0", "up": "route" }]
}
```

`down` controls traffic from the primary to the secondary side; `up` controls the reverse direction. Each accepts `"filter"` (default), `"route"`, or `"block"`. Use **Filter tables** in the diagram toolbar to inspect each coupler.

## Configure topology in the designer

The designer's **Topology** section edits areas, lines, IP routing, backbone, and main lines without hand-writing JSON. Its coupler panel exposes directional routing and filter tables. A supervisor card controls its medium and filter-table inclusion. See the [designer guide](designer.html).
