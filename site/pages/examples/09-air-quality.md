---
title: Air quality
group: Systems and mechanisms
summary: "A CO₂ sensor controls a ventilation fan in three steps and sets CO₂ and humidity alarms."
covers: "DPT 9.007 · DPT 9.008 · DPT 5.001 · DPT 1.005"
order: 9.45
---

# Air quality: CO₂ and humidity

A room sensor measures temperature (DPT 9.001), relative humidity (DPT 9.007), and CO₂ concentration (DPT 9.008). Enter values in its fields:

- **Ventilation:** the step controller compares the CO₂ concentration with three thresholds (800, 1000, and 1200 ppm, with a 50 ppm hysteresis band) and sends the control value of the current step (0, 33, 66, or 100 %) on 4/2/1. A dimming actuator drives the fan at that speed.
- **Alarms:** above 1500 ppm, the CO₂ alarm is set on 4/2/2; above 70 % relative humidity, the humidity alarm is set on 4/2/3. Both reset below their threshold minus a hysteresis and appear on the alarm display.

The sensor profile is neutral: it gathers functions commonly offered by KNX CO₂ sensors, such as measurement values, alarm thresholds, and a step controller with a minimum time per step. There is no air model: the values are entered by the reader.

```knx
scenario: air-quality
```
