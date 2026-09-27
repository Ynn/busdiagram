---
title: Timers
group: Installations
summary: "Timed outputs, a clock, and a presence detector handled by the actuator."
covers: "Staircase timer · retrigger · presence"
order: 5
---

# Timers

The actuator handles the delay: one on telegram starts the timer, and the output switches off locally. Use status feedback in the bus monitor to measure the duration. Each new detection restarts L3's delay. The clock of this example is a push-button that simulates its scheduled times; the [time schedule example](time-schedule.html) uses a simulated clock, a clock master, and a weekly time switch.

```knx
scenario: timers
```
