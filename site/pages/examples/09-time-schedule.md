---
title: Time schedule
group: Systems and mechanisms
summary: "A simulated clock drives a clock master, a weekly time switch, and a night time window in a logic module."
covers: "DPT 10.001 · DPT 11.001 · time switch · time window"
order: 9.47
---

# Time schedule

The scenario declares a [simulated clock](../guide/time.html#simulated-clock) that starts on Monday at 21:57 and runs 60 times faster than simulated time. Its date and time appear in a bar at the top left of the diagram area.

- **Clock master:** sends the time of day (DPT 10.001 on 6/0/1) and the date (DPT 11.001 on 6/0/2) every clock minute. The time display receives both.
- **Weekly time switch:** its program switches the corridor light on at 07:00 and off at 22:00 on weekdays, and at 08:30 and 23:00 at weekends. Watch the corridor light go off at 22:00.
- **Night logic:** the logic module forwards the garden presence detector to the garden light only between 22:00 and 06:00, using the time received from the clock master. Press **Motion** before 22:00, then after.

Use **Set time** on the clock badge to jump, for example, to 06:59 on a weekday and see the corridor light come on.

```knx
scenario: time-schedule
```
