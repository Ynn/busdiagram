---
title: Flags W and T
group: Systems and mechanisms
summary: "Ignored writes and blocked transmissions on a six-output actuator."
covers: "W and T flags · object inspection"
order: 8
---

# Flags W and T

Key 1 sends a telegram to L1 and L2. Both objects receive it, but L2 has its **W** flag disabled and ignores the write, so its output does not change. Key 2 has its **T** flag disabled: its local value changes without transmitting a telegram. Select the actuator to inspect all six declared channels, including its three unused outputs.

```knx
scenario: object-flags
```
