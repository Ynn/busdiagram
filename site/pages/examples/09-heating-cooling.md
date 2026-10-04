---
title: Heating and cooling
group: Systems and mechanisms
summary: "Automatic and object change-over of a room thermostat, a change-over valve, and fan coils."
covers: "DPT 1.100 · DPT 5.001 · fan coil · 2-pipe and 4-pipe"
order: 9.35
---

# Heating and cooling

Three rooms in summer: 27 °C inside, 30 °C outside. Each thermostat has a heating setpoint of 21 °C and a cooling setpoint of 24 °C; the dead zone lies between them.

- **Office, automatic change-over.** Above 24 °C the thermostat cools: its cooling value (3/0/2) opens the change-over valve of the actuator, which feeds the 2-pipe fan coil with cold water, and the status 3/4/3 (DPT 1.100) reads 0. Lower the outside temperature in the **Rooms** panel: the room falls through the dead zone, then below 21 °C the thermostat heats, and the same fan coil now carries hot water.
- **Meeting room, change-over by object.** The thermostat starts in heating mode: however warm the room, it requests nothing, and the room keeps warming up. Press **Season** (☀❄): it writes 0 (cooling) on 3/1/0, DPT 1.100, as a central summer/winter switch would, and the cooling value opens the valve of the cooling coil, while the radiator valve stays closed. In a building, this object comes from a central change-over, or from the plant that supplies hot or cold water.
- **Classroom, 2-pipe system with a single control value.** The same key reaches the classroom thermostat and the actuator. The thermostat sends one value for heating or cooling (3/0/5); the change-over output takes hot or cold water from the season object 3/1/0, so the same value heats or cools.

The heating and cooling values of each thermostat go to separate objects of the actuator. On a change-over valve, the actuator follows the value that is not zero, so the 0 sent on the other value when the thermostat changes over does not close the valve.

```knx
scenario: heating-cooling
```
