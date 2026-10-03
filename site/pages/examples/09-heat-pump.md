---
title: Heat pump and hot water
group: Systems and mechanisms
summary: "Switch a heat pump from a room thermostat; heat a hot water cylinder with its own thermostat."
covers: "Heat pump · minimum off time · hot water cylinder · metered outputs"
order: 9.67
---

# Heat pump and hot water

The room thermostat controls the living room with two-point control: its heating switch enables the heat pump through the switching actuator. The actuator meters both outputs.

- At start the room is at 17 °C: the heat pump runs and draws 1500 W; with a coefficient of performance of 3.5, it delivers about 5 kW of heat.
- Raise the setpoint on the visualization, then lower it: when the thermostat switches the heat pump off and on again quickly, the compressor waits for its minimum off time before it starts.
- Press **Hot water**: the element of the cylinder heats the water up to 60 °C, the setpoint of its own thermostat, then draws nothing even though the actuator still supplies it. Click the cylinder to draw off hot water: once the water is 5 K below the setpoint, the element heats again.

```knx
scenario: heat-pump
```
