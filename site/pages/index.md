---
title: Home
---

<div class="hero">
<div>

# BusDiagram

<p class="lead">A tool for designing instructional diagrams of KNX TP and KNXnet/IP installations: topology, devices, communication objects, group addresses, and connected loads.</p>

Describe an installation in JSON; the diagram is laid out from its addresses and can be embedded in a web page or presentation. Diagrams can be operated to follow telegrams through the topology. The library is a single JavaScript file and runs offline without a server.

</div>
<div>

```knx
scenario: lighting-control
attrs: fit="contain" toolbar="compact" monitor="false" description="false"
style: height:330px
tabs: none
```

</div>
</div>

## Get started

1. Load the library once, preferably in `<head>`. Either:
   - from the jsDelivr CDN, with nothing to download: use the tag of the example below, which pins version {{version}} (see [versions](guide/versions.html)). The page then needs a network connection;
   - or from a copy next to your page, which also works offline and from disk: download [bus-diagram.js](assets/bus-diagram.js?v={{version}}) and use `<script src="bus-diagram.js"></script>`.
2. Put the installation JSON inside a `<bus-diagram>` element. The [designer](designer/index.html) can generate the JSON for you.

```html
{{cdn-tag}}

<bus-diagram>
  <script type="application/json">
    {
      "formatVersion": 2,
      "title": "My first installation",
      "lines": [{ "address": "1.1" }],
      "devices": [
        {
          "id": "pushButton",
          "name": "Push-button interface",
          "address": "1.1.1",
          "kind": "buttonInterface",
          "behavior": "buttonInterface/v1",
          "objects": [
            {
              "id": "b1",
              "name": "Key 1",
              "ga": "1/1/1",
              "dpt": "1.001",
              "port": "switch",
              "channel": "key1",
              "flags": { "W": true, "T": true }
            }
          ],
          "channels": [
            { "id": "key1", "label": "Input 1", "keyLabel": "Key 1", "parameters": { "function": "switch", "ledShown": true } }
          ]
        },
        {
          "id": "switchActuator",
          "name": "Switch actuator",
          "address": "1.1.2",
          "kind": "switchActuator",
          "behavior": "switchActuator/v1",
          "objects": [
            {
              "id": "c1",
              "name": "Channel 1",
              "ga": "1/1/1",
              "dpt": "1.001",
              "port": "switch",
              "channel": "s1",
              "flags": { "W": true, "T": false }
            }
          ],
          "channels": [
            { "id": "s1", "label": "L1", "equipment": { "type": "lamp" } }
          ]
        }
      ]
    }
  </script>
</bus-diagram>
```

This example connects a push-button interface (one key that toggles), a switch actuator, and a lamp to line 1.1. The [first diagram](guide/first-diagram.html) guide explains each field.

<div class="cards">
<a href="guide/installation.html"><b>Guide</b><span>Install the library, describe an installation, and embed the diagram in a page or slide.</span></a>
<a href="examples/index.html"><b>Examples</b><span>Diagrams of typical installations and integration examples with copyable code.</span></a>
<a href="reference/index.html"><b>Reference</b><span>Options, JSON fields, ports, DPTs, methods, events, and error codes.</span></a>
<a href="designer/index.html"><b>Designer</b><span>Guided forms, a JSON editor, validation, preview, and export.</span></a>
</div>

## What a diagram shows

- **Topology:** lines, main lines, backbone, repeaters, segment couplers, and KNXnet/IP routers, laid out from the individual addresses.
- **Devices:** push-buttons, actuators, gateways, thermostats, weather stations, logic modules, and supervisors with their communication objects, group addresses, and flags.
- **Connected loads:** lamps, tunable white lights, shutters and venetian blinds, fans, electrical appliances, hot water cylinders, heat pumps, alarm sounders, DALI groups, and radiators attached to actuator channels.

## What can be simulated

The simulation is limited to what is needed to explain the diagram. See [model and limits](guide/limits.html).

- **Local controls:** button presses, short and long presses, and setpoint entry.
- **Communication objects:** value changes and the effect of the C, R, W, T, and U flags.
- **Telegrams:** writes, reads, and responses; bus propagation, coupler filtering and routing, and reception by linked objects.
- **Actuators and loads:** switch outputs, lamps, shutters, and status feedback.
- **Commissioning tools:** group monitor, byte-level TP1 telegram view, and a [USB interface tool](guide/usb-interface.html) for group reads and writes.

**Step mode** pauses at each event and explains what happened.
