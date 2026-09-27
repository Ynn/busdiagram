---
title: Venetian blind
group: Installations
summary: "Long press moves the blind after the slats have turned; short press turns the slats; slat angle setpoint and feedback."
covers: "DPT 1.008 · DPT 1.007 · DPT 5.001 slats"
order: 3.2
---

# Venetian blind

A venetian blind uses one motor for two things: it first turns the slats, then moves the blind. Going down, the slats close before the blind starts to descend; going up, they open before it rises.

- A long press on Key 1 or Key 2 moves the blind (DPT 1.008 on 2/1/1).
- A short press at rest turns the slats by one step (DPT 1.007 on 2/1/2); during a movement it stops the blind.
- The numeric fields send a position (2/1/3) and a slat angle (2/1/4), both in DPT 5.001: 0 % is open or at the top, 100 % is closed or at the bottom.

The actuator has no sensor: it estimates the position and the slat angle from its configured travel and slat rotation times, and reports them on 2/1/5 and 2/1/6 after each stop. Select the actuator to compare the estimate with the actual blind.

```knx
scenario: venetian-blind
```
