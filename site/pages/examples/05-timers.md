---
title: Timers
group: Installations
summary: "Timed outputs, a clock, and a presence detector handled by the actuator."
covers: "Staircase timer · retrigger · presence"
order: 5
---

# Timers

The actuator handles the delay: one on telegram starts the timer, and the output switches off locally. Use status feedback in the bus monitor to measure the duration. Each new detection restarts L3's delay: the presence detector sends 1 at each passage and leaves the switch-off to the actuator. A weekly time switch switches channel A on at 08:00 and off at 08:05; the simulated clock starts at 07:59:30 and runs ten times faster. The [time schedule example](time-schedule.html) adds a clock master that sends the time.

```knx
scenario: timers
```
