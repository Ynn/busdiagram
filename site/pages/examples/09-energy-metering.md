---
title: Energy metering
group: Systems and mechanisms
summary: "A switching actuator with metering reports power and energy per output, and sheds a load above a power limit."
covers: "DPT 14.056 · DPT 13.010 · load shedding"
order: 9.46
---

# Energy metering and load shedding

The switching actuator measures the power drawn by each output and reports it on 5/2/x (DPT 14.056, W), the energy counted per output on 5/3/x (DPT 13.010, Wh), and its total power on 5/4/0.

- Switch on the oven (2500 W) and the water heater (1500 W): the total power exceeds the 3500 W limit.
- The actuator sets its power limit object on 5/4/1 and switches off the water heater, which is marked for load shedding. Its command is stored meanwhile.
- After 20 seconds, the heater is switched on again if its command still requests it; it is shed again if the limit is still exceeded.

The power of each load comes from its rated power in the diagram. Energy is counted 60 times faster than real time (`energyTimeScale`), so that the counters move visibly during a demonstration.

```knx
scenario: energy-metering
```
