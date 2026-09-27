---
title: Priority control
group: Installations
summary: "A priority command overrides normal switching until it is released."
covers: "DPT 2.001 · forced on/off"
order: 6
---

# Priority control

A short press on Key 3 forces L4 off with DPT 2.001 value 2; a long press releases the override with value 0. Key 4 continues to send toggle telegrams while the override is active. The actuator stores those commands, but L4 stays off until the override ends. It then applies the last received command according to its `afterForcing` setting.

```knx
scenario: priority-control
```
