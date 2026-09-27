---
title: Weather protection
group: Systems and mechanisms
summary: "A weather station raises the shutter on wind; a logic module applies sun protection in automatic mode."
covers: "DPT 9.004 · DPT 9.005 · DPT 1.005 · logic AND"
order: 9.4
---

# Weather protection and logic module

A weather station, a logic module, and a shutter actuator share the facade line. Enter values in the station's fields:

- **Shutter keys:** a long press on Key 1 or Key 2 moves the shutter; a short press stops it or steps the slats.
- **Wind alarm:** a wind speed of 10 m/s or more sets the alarm on 2/6/1 (DPT 1.005). The actuator raises the shutter and ignores other commands. The alarm resets below 8 m/s (threshold minus a 2 m/s hysteresis); the shutter then stays where it is.
- **Sun protection:** a brightness of 40,000 lx or more sets the request on 2/6/2. The logic module combines it with the automatic mode from Key 3 (DPT 1.003) using AND, and sends the result as an up/down command on 2/1/1.
- **Logic module:** with automatic mode off, the request stays inside the logic module. Press Key 3 to enable it and follow the resulting telegram.

Wind speed (DPT 9.005) and brightness (DPT 9.004) are two-byte floating-point values; open a telegram to inspect their encoding.

```knx
scenario: weather-protection
```
