---
title: Miscalibrated shutter
group: Systems and mechanisms
summary: "The actuator estimates the shutter position from its configured travel time; compare it with the actual position."
covers: "Estimated versus actual position"
order: 7
---

# Miscalibrated shutter

The actuator is configured for a 20-second travel time, but the real shutter needs 30 seconds. For a 50% target, the actuator drives the motor for 10 seconds and reports an estimated position of 50%; the real shutter has moved only about 33%. Select the actuator to compare both positions. Then try the [correct 30-second setting](#correct-setting).

```knx
scenario: shutter-calibration
```

## Correct setting

```knx
scenario: shutter-calibrated
```
