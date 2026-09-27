---
title: Control several outputs
group: Installations
summary: "One push-button and one four-output actuator; a single telegram switches several outputs."
covers: "DPT 1.001 · several listening addresses per object"
order: 1
---

# Control several outputs

A four-key push-button and a four-output switching actuator each use one individual address. Key 1 turns L1 and L2 on; Key 2 turns them off. Key 3 and Key 4 do the same for L1 through L4. Channels 1 and 2 listen to both group addresses, while channels 3 and 4 listen only to 1/1/2. One telegram can control several outputs. Key 1 and Key 2 share an address on the same device, so the local object state also follows their commands.

```knx
scenario: lighting-control
```
