---
title: Heating per room
group: Systems and mechanisms
summary: "PI and two-point room control, PWM valve actuation, window contact, and operating modes."
covers: "DPT 9.001 · DPT 5.001 · DPT 20.102"
order: 9.3
---

# Room-by-room heating

This example heats two rooms in different ways:

- **Living room:** a PI thermostat sends a DPT 5.001 control value on 3/0/1 to a heating actuator. The actuator applies PWM to a thermoelectric valve. Temperature travels as DPT 9.001 on 3/4/1; open a telegram's details to inspect its two-byte value.
- **Bedroom:** two-point control sends a one-bit command on 3/0/2 to a switching actuator.

Try these interactions:

- Open the living-room window in the **Rooms** panel. The contact sends 1 on 3/3/1; the thermostat enters frost protection at 7 °C and closes the valve. The room then cools.
- In the USB interface panel, write 3 (economy mode) to the central-mode address 3/2/0. Both setpoints fall by 4 K. Press the living-room thermostat's **Presence** key to restore comfort mode.
- Set the living-room thermostat to 22.5 °C and watch its current setpoint on 3/4/2.
- Lower the outside temperature and observe the valve opening further to maintain the setpoint.

```knx
scenario: room-heating
```
