---
title: Bus voltage failure
group: Systems and mechanisms
summary: "Cut and restore the bus voltage of a line; lock an output and delay its switching."
covers: "Bus failure and recovery · lock · switching delays"
order: 9.6
---

# Bus voltage failure, lock, and delays

The push-button interface is on line 1.1, the switch actuator on line 1.2. Each line has its own power supply.

- Switch L1 on with input 1, then click **PSU 640 mA** on line 1.2. The actuator switches L1 off, as set for a bus voltage failure (`busFailure: "off"`). The line turns grey: its devices neither receive nor send, and the line coupler no longer forwards telegrams to it.
- Click the label again. L1 returns to its state before the failure (`busRecovery: "previous"`) and the actuator sends its status.
- Cut the voltage of line 1.1 instead: input 1 sends its current value again 2 seconds after the voltage returns (`busRecovery: "update"`).
- Input 2 locks L1, as for cleaning: L1 switches off and ignores commands until the lock ends; the last command received is then applied.
- Input 3 switches L2 with a 2-second switch-on delay and a 5-second switch-off delay.

```knx
scenario: bus-voltage
```
