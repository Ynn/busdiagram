---
title: Extension
group: Integration
summary: "Add a behavior and an equipment view without changing the library."
covers: "registerBehavior · registerEquipmentView"
order: 17
scripts: assets/extensions/delayed-switch.js, assets/extensions/led-lamp-view.js
---

# Extension: delayed switching

Two scripts register a `delayedSwitch/v1` behavior and a `ledStrip` view without changing the library. Key 1 sends 1: L1 switches on after 2 seconds and L2, shown as an LED strip, after 1 second. Key 2 sends 0 to switch them off immediately and cancel pending switch-on events.

```knx
file: site/samples/extensions/delayed-switch.json
```

## Load the scripts

```html
<script src="bus-diagram.js"></script>
<script src="extensions/delayed-switch.js"></script>
<script src="extensions/led-lamp-view.js"></script>
```

## Source

The TypeScript source at `site/samples/extensions/delayed-switch.ts` is compiled into a classic script by `npm run build`. See the [extension guide](../guide/extensions.html) for the behavior API.
