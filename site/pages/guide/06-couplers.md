---
title: Couplers and repeaters
group: Write a scenario
order: 6.6
---

# Couplers and repeaters

Couplers connect the levels of the topology and decide which group telegrams cross them. BusDiagram derives most couplers from the addresses declared in the scenario; line extensions are declared explicitly.

## Types of coupler

| Device | Address | Connects | Group telegrams |
| --- | --- | --- | --- |
| Line coupler | `A.L.0` | Line `A.L` and main line `A.0` | Filtered by its filter table, or routed or blocked as configured. |
| Area coupler | `A.0.0` | Main line `A.0` and the backbone `0.0` | Same principle at area level. |
| KNXnet/IP router | `A.L.0` or `A.0.0` | A line or an area and the IP network | Replaces a line or area coupler; same filter-table principle. |
| Line repeater | on the line, for example `A.L.64` | Main segment of a line and a second segment | Repeated without filtering. |
| Segment coupler | on the line, for example `A.L.64` | Main segment of a line and a second segment | Filtered: traffic local to one segment does not reach the other. |

Line and area couplers appear automatically when the installation has several lines or areas; see [topology](topology.html). KNXnet/IP routers are selected with `topology.ip`.

## Filter tables and routing counter

A coupler's filter table lists the line-crossing group addresses: those associated with objects on both of its sides. It is derived from the associations declared in the scenario, as the commissioning software does from a project: an address linking a device in line 1.1 and a device in line 15.15 enters the tables of 1.1.0, 1.0.0, 15.0.0, and 15.15.0. The same table applies in both directions. A telegram whose destination is in the table crosses the coupler; the others are filtered.

A device that sends or receives an address without an object in the project, such as a visualisation or a tool connected through a bus interface, is not counted: its telegrams on that address are filtered at the first coupler. Current commissioning software no longer lets filter tables be edited by hand; the recommended practice is to model the bus interface and assign it the group addresses it uses, or to add a dummy device with those addresses in its line. In a scenario, list the addresses of a USB interface in its `groupAddresses` parameter, and set `"inFilterTables": false` on a supervisor to show one that was not modeled.

Each direction can be set independently in `topology.couplers`: `down` for primary to secondary, `up` for the reverse, each with `"filter"` (default), `"route"`, or `"block"`:

```json
"topology": {
  "couplers": [{ "address": "1.1.0", "up": "route" }]
}
```

Every telegram starts with a routing counter of 6. Each coupler, repeater, or router that forwards it decrements the counter; a telegram that arrives with a counter of 0 is not forwarded. The value 7, which disables the counter in some service cases, is not modeled.

In the diagram, **Filter tables** in the toolbar shows the table of each coupler, and the telegram details list every coupler crossed with its decision and routing counter.

## Line repeaters and segment couplers

A line can be extended by a second segment, connected to its main segment:

```json
"lines": [
  { "address": "2.1", "extension": { "address": "2.1.64", "mode": "repeater" } }
]
```

- `address` is an individual address on the same line, used by the extension itself. Repeaters conventionally use `.64`, `.128`, or `.192`.
- `mode` is `"repeater"` (default) or `"segmentCoupler"`.
- `switchable: true` adds a control to the diagram toolbar that switches the extension between repeater and segment coupler, to compare both behaviors with the same traffic.

A device is placed on the second segment with `"downstream": true`; the other devices of the line stay on the main segment. Device order within each segment follows the order in `devices`.

In the [designer](designer.html), each line has a **Line extension** field (none, line repeater, or segment coupler) and an address field. The form of a device on that line then offers **On the segment behind the line extension**.

## Rules and model limits

In a twisted-pair installation, up to three line repeaters can extend a line, each connected directly to the main segment. Repeaters are never connected in series, so a line has at most four segments. BusDiagram models one extension per line, always connected to the main segment: repeaters cannot be chained, and a line has at most two segments in a diagram.

Individual-address telegrams, which segment couplers also filter in real installations, are outside the model; see [model and limits](limits.html).

```knx
scenario: full-topology
attrs: monitor="false"
tabs: json
```
