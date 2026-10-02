---
title: First diagram
group: Getting started
order: 2
---

# First diagram

This example has one push-button interface with four keys and one four-output switching actuator. Key 1 and Key 2 turn L1 and L2 on and off; Key 3 and Key 4 do the same for L1 through L4.

```knx
scenario: lighting-control
```

## 1. Embed the scenario

```html
<script src="bus-diagram.js"></script>

<bus-diagram>
  <script type="application/json">
    { "formatVersion": 2, "lines": [{ "address": "1.1" }], "devices": [] }
  </script>
</bus-diagram>
```

Place the installation JSON inside a `<script type="application/json">` element within `<bus-diagram>`. The browser does not execute or display that script; the component reads it as data.

## 2. Declare the line and group addresses

```json
{
  "formatVersion": 2,
  "title": "Control multiple outputs",
  "lines": [{ "address": "1.1", "name": "Example line" }],
  "groupAddresses": [
    { "address": "1/1/1", "name": "L1–L2 lighting", "dpt": "1.001" },
    { "address": "1/1/2", "name": "L1–L4 lighting", "dpt": "1.001" }
  ],
  "devices": []
}
```

`lines` declares twisted-pair lines. Each device's individual address belongs to a declared line. `groupAddresses` supplies names and DPTs shown in the bus monitor. The complete example adds devices to this skeleton.

## 3. Add the push-button interface

```json
{
  "id": "pushButton",
  "name": "Push-button interface",
  "address": "1.1.1",
  "kind": "buttonInterface",
  "behavior": "buttonInterface/v1",
  "objects": [
    { "id": "key1", "name": "Key 1", "ga": "1/1/1", "dpt": "1.001", "port": "switch", "channel": "in1", "flags": { "W": true, "T": true } },
    { "id": "key2", "name": "Key 2", "ga": "1/1/1", "dpt": "1.001", "port": "switch", "channel": "in2", "flags": { "W": true, "T": true } }
  ],
  "channels": [
    { "id": "in1", "label": "Input 1", "keyLabel": "Key 1", "parameters": { "function": "switch", "onPress": "on" } },
    { "id": "in2", "label": "Input 2", "keyLabel": "Key 2", "parameters": { "function": "switch", "onPress": "off" } }
  ]
}
```

The device has one individual address regardless of its number of inputs. Each input is wired to a key and drawn as a key on the diagram, which shows `keyLabel`, the text written on the push-button (the input keeps its `label`); its `function` decides what a press does, here switching on or off. Each communication object has a group address (`ga`), a DPT, a behavior port, the input it belongs to (`channel`), and flags; the object transmits when its T flag is set.

## 4. Add the switching actuator

```json
{
  "id": "switchActuator",
  "name": "Four-output switching actuator",
  "address": "1.1.2",
  "kind": "switchActuator",
  "behavior": "switchActuator/v1",
  "objects": [
    { "id": "c1", "name": "Channel 1", "ga": ["1/1/1", "1/1/2"], "dpt": "1.001", "port": "switch", "channel": "s1", "flags": { "W": true, "T": false } }
  ],
  "channels": [{ "id": "s1", "label": "L1", "equipment": { "type": "lamp" } }]
}
```

The first address in `ga` is the object's sending address; it also listens to subsequent addresses. Channel `s1` is an actuator output, and its connected equipment is the lamp shown in the diagram. The complete scenario declares the remaining objects and channels.

## 5. Operate the diagram

The diagram is drawn from these declarations. To follow its behavior, press Key 1. A telegram travels from the push-button interface to the actuator on 1/1/1. Channels 1 and 2 accept it, turning on L1 and L2. The bus monitor shows the telegram; select its row to inspect the frame. Open the [designer](../designer/index.html) to modify the scenario.
