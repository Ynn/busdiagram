---
title: Dimming
group: Installations
summary: "A dimming actuator driven by switching, relative dimming, and an absolute level."
covers: "DPT 1.001 · DPT 3.007 · DPT 5.001"
order: 3.5
---

# Dimming actuator

A two-key push-button controls one dimmable lamp through three group addresses, each with its own DPT:

- A short press on Key 1 or Key 2 sends on or off (DPT 1.001) on 1/1/1.
- Holding a key sends a relative dimming step (DPT 3.007) on 1/2/1; releasing it sends the stop value 0.
- The numeric field sends an absolute level (DPT 5.001) on 1/3/1.

The actuator reports its switching state on 1/4/1 and its level on 1/5/1 after each transition. The push-button receives the level status and shows it on its object.

The three command objects are independent inputs. A level of 100 % on 1/3/1 switches the lamp on and sets the switching status 1/4/1 to 1, but the switching command object on 1/1/1 keeps its last received value, 0. Dimming actuator manuals describe the same separation: the switching object receives commands (flags C, W, T), and the switching status object reports "on" whenever the brightness is not zero (flags C, R, T). The state of the lamp is therefore read or monitored on 1/4/1; the command object has no R flag, so a read of 1/1/1 receives no response from the actuator. See [R and U flags](../guide/usb-interface.html#r-and-u-flags).

```knx
scenario: dimming
```
