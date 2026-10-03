---
title: Intrusion and fire alarms
group: Systems and mechanisms
summary: "Store intrusion and fire alarms until they are reset; make a light blink or force it on."
covers: "Alarm module · trigger, stored alarm, reset · intrusion and fire on an actuator"
order: 9.65
---

# Intrusion and fire alarms

The alarm module stores the alarms of a zone. The push-button interface stands for the door contact (input 1), the smoke detector (input 2), and the reset keys (inputs 3 and 4).

- Hold **Door**: the intrusion alarm is triggered and stored. The hall light blinks and ignores **Hall light**; the sounder, switched by the stored intrusion alarm, sounds for at most 3 minutes; the office light is not concerned.
- Release **Door**: the alarm stays stored. Press **Reset intrusion**: the alarm ends, and the hall light takes the last command received during the alarm.
- Hold **Smoke**: the fire alarm forces both lights on, steady, even while the intrusion alarm makes the hall light blink: fire has priority. **Reset fire** is refused while **Smoke** is held: the journal explains why.

```knx
scenario: alarms
```
