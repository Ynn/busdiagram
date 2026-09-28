---
title: USB interface tool
group: Systems and mechanisms
summary: "Group writes and reads from a commissioning computer connected through a USB interface."
covers: "GroupValueRead · R and U flags"
order: 9.5
---

# USB interface panel: group reads and writes

A USB interface at 1.1.255 connects a commissioning computer to line 1.1. The panel below the diagram sends `GroupValueWrite` or `GroupValueRead` to the selected group address.

- Write `1/1/1 = On`: the telegram starts at 1.1.255 and crosses line coupler 1.2.0, whose filter table contains 1/1/1.
- Read `1/4/1`: the actuator's status object has the R flag and uses 1/4/1 as its sending address, so it replies with `GroupValueResponse`.
- Read `1/1/1`: no object associated with 1/1/1 has the R flag, so the read remains unanswered.

```knx
scenario: usb-interface
```
