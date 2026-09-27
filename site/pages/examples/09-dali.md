---
title: DALI gateway
group: Systems and mechanisms
summary: "A KNX/DALI gateway translates telegrams into commands for two DALI groups and reports ballast faults."
covers: "DPT 3.007 · DALI groups · fault polling"
order: 9.2
---

# KNX/DALI gateway

A four-key push-button controls two DALI groups. A short press switches a group on or off; a long press sends DPT 3.007 relative dimming commands until release. The gateway translates KNX telegrams into DALI commands such as `RECALL MAX LEVEL`, `DAPC`, `UP`, `DOWN`, and `OFF`. Use step mode to follow this sequence.

- Hold Key 1 to brighten the office group (ballasts A0–A3). Status telegrams on 1/5/1 report the resulting level.
- Click a luminaire to simulate a ballast fault. On its next poll, the gateway reports a group fault on 1/7/x and a general fault on 1/7/0.
- Use the USB interface panel to write the broadcast address 1/1/0 or read status and fault addresses.

```knx
scenario: dali-gateway
```
