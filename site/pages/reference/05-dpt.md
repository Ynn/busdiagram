---
title: DPT
order: 5
---

# Supported DPTs

A telegram does **not** transmit its DPT. Each receiving object interprets the payload using its own DPT. Object state stores the decoded value: for DPT 5.001, an entered value of 50% encodes as byte `0x80` and decodes to about 50.196%. The diagram rounds it while the inspector shows more precision.

{{dpts}}

Values of 1, 2, or 4 bits occupy the low bits of the APCI byte. Longer values follow it as 1 to 4 additional payload bytes, as shown in the Size column; the frame length grows accordingly.

Other standard DPTs can be used on the objects of passive and display devices, which show them without simulating them: see [passive devices](../guide/devices.html#passive-device-and-visualization-panel-passive-v1).

In JSON, a time of day (10.001) is a number of seconds counted from 00:00 on the day given by the week day: 0 means no day, 86400 × n + seconds means day n (1 = Monday, 7 = Sunday). A date (11.001) is written as the number `YYYYMMDD`.

A scene control (18.001) is written as the bus byte: 0–63 recalls scenes 1–64, and adding 128 (the learn bit) stores the scene instead; bit 6 is reserved.
