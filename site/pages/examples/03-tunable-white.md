---
title: Tunable white
group: Installations
summary: "A dimming actuator adjusts the level and the colour temperature of a tunable white light."
covers: "DPT 5.001 · DPT 7.600"
order: 3.7
---

# Tunable white

A tunable white light has two settings: its level (DPT 5.001) and its colour temperature in kelvin (DPT 7.600). Keys 1 to 3 send 2700 K (warm), 4000 K (neutral), and 6500 K (cold) on 1/6/1; the numeric fields of the visualization panel send any level or colour temperature.

The actuator limits the colour temperature to the range of its channel, here 2700–6500 K, and reports the applied value on 1/6/2. Enter 7000 K to see the limitation in the event log. The lamp shows the level and the colour temperature.

```knx
scenario: tunable-white
```
