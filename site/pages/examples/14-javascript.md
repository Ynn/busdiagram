---
title: Create a diagram with JavaScript
group: Integration
summary: "Create a diagram in an element from a script."
covers: "BusDiagram.create"
order: 14
---

# Create a diagram with JavaScript

`BusDiagram.create(target, scenario, options)` creates a diagram in the selected element.

```html live
<div id="js-root"></div>
<script>
  const scenario = {
    formatVersion: 2,
    title: "Created with JavaScript",
    lines: [{ address: "1.1" }],
    devices: [
      {
        id: "pushButton",
        name: "Push-button interface",
        address: "1.1.1",
        kind: "buttonInterface",
        behavior: "buttonInterface/v1",
        objects: [
          {
            id: "b1",
            name: "Key 1",
            ga: "1/1/1",
            dpt: "1.001",
            port: "switch",
            channel: "key1",
            flags: { W: true, T: true },
          },
        ],
        channels: [
          {
            id: "key1",
            label: "Input 1",
            keyLabel: "Key 1",
            parameters: { function: "switch", ledShown: true },
          },
        ],
      },
      {
        id: "switchActuator",
        name: "Switching actuator",
        address: "1.1.2",
        kind: "switchActuator",
        behavior: "switchActuator/v1",
        objects: [
          {
            id: "c1",
            name: "Channel 1",
            ga: "1/1/1",
            dpt: "1.001",
            port: "switch",
            channel: "s1",
            flags: { W: true, T: false },
          },
        ],
        channels: [{ id: "s1", label: "L1", equipment: { type: "lamp" } }],
      },
    ],
  };
  BusDiagram.create("#js-root", scenario, {
    toolbar: "compact",
    monitor: false,
  });
</script>
```

The second argument may also be the URL of a file (`"../scenarios/lighting-control.json"`, page served in HTTP) or the selector of a JSON block (`"#scenario-json"`).
