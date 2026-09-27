---
title: Shutter control
group: Installations
summary: "Long press moves the shutter, short press stops it or steps the slats; an IP supervisor shows the position."
covers: "DPT 1.008 · DPT 1.007 · position feedback"
order: 3
---

# Shutter control

A long press sends up/down on 2/1/1; a short press sends stop/step on 2/2/1. Key 1 controls both directions from one key. Key 4 lowers the shutter and turns on L1 with one telegram, because compatible objects using DPT 1.008 and 1.001 share an address. A supervisor on the IP network observes the position feedback through the KNXnet/IP router at 1.1.0.

```knx
scenario: shutter-control
```
