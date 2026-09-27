---
title: Scenes
group: Installations
summary: "One scene address recalls a preset on each actuator channel."
covers: "DPT 17.001 · channel presets"
order: 4
---

# Scenes

A one-byte group address (DPT 17.001) carries the scene number minus one. Each actuator channel stores its own preset. Scene 1 (Arrival) turns on L1 and L2 and opens the shutter; scene 2 (Departure) switches off the lights and closes the shutter.

```knx
scenario: scenes
```
